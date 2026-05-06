"""
AKIHO 核心引擎

整合情绪、记忆、行为、LLM 等子系统
使用 Rust PyO3 绑定加速核心仿真计算
"""
import asyncio
import math
from typing import Optional, Dict, Any, List
from datetime import datetime

from engine.emotion import EmotionManager
from engine.memory import MemoryManager
from engine.behavior import BehaviorManager
from engine.llm import LLMManager, GenerationContext, get_llm_manager
from engine.persistence import StateStore, MemoryStateStore
from config import load_config_json

# 尝试导入 Rust PyO3 绑定
try:
    from akiho_core import PyAkihoCore
    HAS_RUST_CORE = True
except ImportError:
    HAS_RUST_CORE = False


# ═══════════════════════════════════════════════════════════════
# Rust 桥接适配器
# ═══════════════════════════════════════════════════════════════

class _BodyBridge:
    """将 Rust PyBodySystem 适配为 Python BodyManager 兼容 API"""

    def __init__(self, rust_core):
        self._rust = rust_core.body
        self._activity_ticks = 0

    @property
    def energy(self) -> float:
        return self._rust.energy()

    @property
    def fatigue(self) -> float:
        return self._rust.fatigue()

    @property
    def hunger(self) -> float:
        return self._rust.hunger()

    @property
    def comfort(self) -> float:
        return self._rust.comfort()

    def get_status(self) -> Dict[str, Any]:
        c, s, e, cr = self._rust.get_pools()
        return {
            "energy": self._rust.energy(),
            "fatigue": self._rust.fatigue(),
            "mental_fatigue": 1.0 - c,
            "emotional_fatigue": 1.0 - e,
            "social_fatigue": 1.0 - s,
            "dominant_need": self.dominant_need(),
            "needs": {
                "cognitive": {"intensity": 1.0 - c, "urgency": max(0.0, 0.5 - c) * 2.0},
                "social": {"intensity": 1.0 - s, "urgency": max(0.0, 0.5 - s) * 2.0},
                "emotional": {"intensity": 1.0 - e, "urgency": max(0.0, 0.5 - e) * 2.0},
                "creative": {"intensity": 1.0 - cr, "urgency": max(0.0, 0.5 - cr) * 2.0},
            },
        }

    def update(self, delta: float, is_active: bool = True):
        if is_active:
            self._activity_ticks += 1
            if self._activity_ticks % 30 == 0:
                self._rust.perform_activity("chat")
        self._rust.tick(delta)

    def dominant_need(self) -> Optional[str]:
        pools = list(self._rust.get_pools())
        names = ["cognitive", "social", "emotional", "creative"]
        min_idx = pools.index(min(pools))
        return names[min_idx] if pools[min_idx] < 0.5 else None

    def apply_social_fatigue(self, amount: float):
        self._rust.perform_activity("deep_conversation")

    def restore_energy(self, amount: float):
        pass


class _GrowthBridge:
    """将 Rust PyGrowthEngine 适配为 Python GrowthManager 兼容 API"""

    def __init__(self, rust_core):
        self._rust = rust_core.growth
        self._milestone_count = 0
        self._last_phase = self._rust.phase()

    def get_profile(self) -> Dict[str, Any]:
        chars = self._rust.get_characteristics()
        return {
            "phase": self._rust.phase(),
            "characteristics": dict(chars) if isinstance(chars, dict) else chars,
            "experience_count": self._rust.experience_count(),
            "milestone_count": self._milestone_count,
        }

    def process_experience(self, experience_type: str, intensity: float = 0.5):
        self._rust.process_experience(experience_type, intensity)
        new_phase = self._rust.phase()
        if new_phase != self._last_phase:
            self._milestone_count += 1
            self._last_phase = new_phase

    def evolve(self, delta: float = 1.0):
        self._rust.tick(delta)


class _RelationshipBridge:
    """将 Rust PyRelationshipManager 适配为 Python 兼容 API"""

    STAGE_MAP = {
        "陌生人": "stranger",
        "认识的人": "acquaintance",
        "熟悉的": "friend",
        "朋友": "friend",
        "密友": "close",
        "亲密": "intimate",
    }

    def __init__(self, rust_core):
        self._rust = rust_core.relationship
        self._interaction_counts: Dict[str, int] = {}

    def record_interaction(self, user_id: str, positivity: float = 0.7):
        self._rust.record_interaction(user_id, positivity)
        self._interaction_counts[user_id] = self._interaction_counts.get(user_id, 0) + 1

    def get_state(self, user_id: str) -> Dict[str, Any]:
        intimacy = self._rust.get_intimacy(user_id)
        trust = self._rust.get_trust(user_id)
        stage_cn = self._rust.get_stage(user_id)
        return {
            "intimacy": intimacy,
            "trust": trust,
            "interaction_count": self._interaction_counts.get(user_id, 0),
            "relationship": self.STAGE_MAP.get(stage_cn, "stranger"),
        }


class _CognitionBridge:
    """将 Rust PyCognitionEngine 适配为 Python 兼容认知 API"""

    def __init__(self, rust_core):
        self._rust = rust_core.cognition

    def focus_on(self, topic: str):
        self._rust.focus_on(topic)

    def current_focus(self) -> List[str]:
        return self._rust.current_focus()

    def refresh_attention(self):
        self._rust.refresh_attention()

    def select_reasoning(self, task: str) -> List[str]:
        return self._rust.select_reasoning(task)

    def get_attention_state(self) -> Dict[str, Any]:
        return {
            "focus": self._rust.current_focus(),
            "sustained_attention": 1.0,  # 未来可从 Rust 获取
        }

    def tick(self, delta: float):
        self._rust.tick(delta)


class _CognitionAdapter:
    """
    Python 认知适配层，委托 Rust CognitionEngine 处理注意力/推理。

    提供与 Python 现有逻辑兼容的接口。
    """

    def __init__(self, bridge: _CognitionBridge):
        self._bridge = bridge

    def focus_on(self, topic: str):
        self._bridge.focus_on(topic)

    def current_focus(self) -> List[str]:
        return self._bridge.current_focus()

    def get_attention_state(self) -> Dict[str, Any]:
        return self._bridge.get_attention_state()

    def select_reasoning(self, task: str) -> List[str]:
        return self._bridge.select_reasoning(task)

    def refresh(self):
        self._bridge.refresh_attention()

    def tick(self, delta: float):
        self._bridge.tick(delta)


class _EmotionBridge:
    """将 Rust PyEmotionEngine 适配为 Python 兼容情绪 API"""

    def __init__(self, rust_core):
        self._rust = rust_core.emotion

    @property
    def pleasure(self) -> float:
        p, _, _ = self._rust.get_pad()
        return p

    @property
    def arousal(self) -> float:
        _, a, _ = self._rust.get_pad()
        return a

    @property
    def dominance(self) -> float:
        _, _, d = self._rust.get_pad()
        return d

    @property
    def category(self) -> str:
        return self._rust.get_category()

    @property
    def state(self) -> "EmotionState":
        p, a, d = self._rust.get_pad()
        return EmotionState(pleasure=p, arousal=a, dominance=d)

    def get_state(self) -> Dict[str, Any]:
        p, a, d = self._rust.get_pad()
        return {
            "pleasure": p,
            "arousal": a,
            "dominance": d,
            "category": self._rust.get_category(),
        }

    def update(self, delta: float = 0.1):
        self._rust.update(delta)

    def process_stimulus(self, stimulus_type: str, intensity: float = 0.5):
        self._rust.process(stimulus_type, intensity)

    def apply_body_impact(self, energy: float, fatigue: float):
        self._rust.apply_body_impact(energy, fatigue)


class EmotionState:
    """情绪状态（用于兼容 Python 层）"""
    __slots__ = ("pleasure", "arousal", "dominance")

    def __init__(self, pleasure: float = 0.0, arousal: float = 0.0, dominance: float = 0.0):
        self.pleasure = pleasure
        self.arousal = arousal
        self.dominance = dominance

    @property
    def intensity(self) -> float:
        return (self.pleasure ** 2 + self.arousal ** 2) ** 0.5


class _PythonEmotionAdapter:
    """
    保留 Python 文本处理能力，委托 PAD 状态管理到 Rust。

    - process_text_input(): 关键词分析 → Rust stimulus
    - update_from_body(): 身体影响 → Rust apply_body_impact
    - PAD 读取 → 通过 self._bridge 从 Rust 获取
    """

    POSITIVE_KEYWORDS = ["好", "喜欢", "开心", "高兴", "棒", "赞", "爱", "哈哈", "真好", "谢谢", "happy", "good", "great", "love"]
    NEGATIVE_KEYWORDS = ["不", "讨厌", "难过", "生气", "怕", "烦", "累", "sad", "angry", "hate", "bad"]
    QUESTION_KEYWORDS = ["吗", "呢", "怎么", "什么", "为什么", "how", "what", "why"]

    def __init__(self, bridge: _EmotionBridge):
        self._bridge = bridge

    @property
    def pleasure(self) -> float:
        return self._bridge.pleasure

    @property
    def arousal(self) -> float:
        return self._bridge.arousal

    @property
    def dominance(self) -> float:
        return self._bridge.dominance

    @property
    def category(self) -> str:
        return self._bridge.category

    @property
    def state(self) -> EmotionState:
        return self._bridge.state

    def get_state(self) -> Dict[str, Any]:
        return self._bridge.get_state()

    def update(self, delta: float = 0.1):
        self._bridge.update(delta)

    def update_from_body(self, energy: float, fatigue: float, dominant_need: Optional[str] = None):
        self._bridge.apply_body_impact(energy, fatigue)

    def process_text_input(self, text: str):
        text_lower = text.lower()

        positive_count = sum(1 for kw in self.POSITIVE_KEYWORDS if kw in text_lower)
        if positive_count > 0:
            self._bridge.process_stimulus("positive", positive_count * 0.2)

        negative_count = sum(1 for kw in self.NEGATIVE_KEYWORDS if kw in text_lower)
        if negative_count > 0:
            self._bridge.process_stimulus("negative", negative_count * 0.2)

        question_count = sum(1 for kw in self.QUESTION_KEYWORDS if kw in text_lower)
        if question_count > 0:
            self._bridge.process_stimulus("attention", question_count * 0.15)

    def process_stimulus(self, stimulus_type: str, intensity: float = 0.5):
        self._bridge.process_stimulus(stimulus_type, intensity)


class _MemoryBridge:
    """
    统一 Python MemoryManager 和 Rust MemoryStore 的记忆查询接口。

    - Python MemoryManager: 向量语义搜索 + ChromaDB（主力）
    - Rust MemoryStore: 快速 HashMap 索引（辅助）

    当 Rust 可用时，search() 会并行查询两层并合并结果。
    """

    def __init__(self, python_manager: MemoryManager, rust_store):
        self._py = python_manager
        self._rust = rust_store  # PyMemoryStore (PyO3 bindings), available when HAS_RUST_CORE

    async def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        语义搜索记忆：优先使用 Python 向量搜索，Rust 提供关键词补充。
        """
        try:
            py_results = await self._py.search(query, limit=limit)
            return py_results
        except Exception:
            if self._rust:
                keyword_results = self._rust.search(query, limit)
                return [{"content": r, "source": "rust_keyword"} for r in keyword_results]
            return []

    def get_recent(self, hours: int = 24, limit: int = 10) -> List[Dict[str, Any]]:
        return self._py.get_recent(hours=hours, limit=limit)

    def get_count(self) -> int:
        if self._rust:
            return self._rust.count()
        return self._py.get_count()

    async def store_conversation(self, content: str, user_id: str, emotion: Optional[str] = None):
        await self._py.store_conversation(content, user_id, emotion)
        if self._rust:
            self._rust.store_episodic(content)

    def get_working_memory(self) -> List[Dict[str, Any]]:
        return self._py.get_working_memory()


class _BehaviorBridge:
    """将 Rust PyBehaviorEngine 适配为 Python 兼容行为 API"""

    def __init__(self, rust_core):
        self._rust = rust_core.behavior

    def tick(self, delta: float):
        self._rust.tick(delta)

    def decide_next_behavior(self, energy: float, pleasure: float, fatigue: float) -> Optional[str]:
        return self._rust.decide_next_behavior(energy, pleasure, fatigue)

    def start_behavior(self, behavior_id: str) -> bool:
        return self._rust.start_behavior(behavior_id)

    def get_active(self) -> List[Dict[str, Any]]:
        if self._rust is None:
            return []
        return []  # 简化：Rust 层状态暂不映射回 Python


class _BehaviorAdapter:
    """
    Python 行为适配层，委托 Rust BehaviorEngine 提供决策支持。

    - 关键词触发 → Python BehaviorManager (保持现有逻辑)
    - 自主决策 → Rust BehaviorEngine (新能力)
    """

    def __init__(self, bridge: _BehaviorBridge, python_manager: BehaviorManager):
        self._bridge = bridge
        self._py = python_manager

    def tick(self, state: Dict[str, Any], delta: float):
        self._bridge.tick(delta)
        self._py.update(state, delta)

    def update(self, state: Dict[str, Any], delta: float):
        """兼容 BehaviorManager.update(state, delta) 签名"""
        self.tick(state, delta)

    def trigger(self, behavior_id: str) -> bool:
        return self._py.trigger(behavior_id)

    def trigger_from_input(self, text: str, state: Dict[str, Any]) -> Optional[str]:
        return self._py.trigger_from_input(text, state)

    def get_available(self) -> List[Dict[str, Any]]:
        return self._py.get_available()

    def get_active(self) -> List[Dict[str, Any]]:
        py_active = self._py.get_active()
        if py_active:
            return py_active
        return self._bridge.get_active()

    def _py_placeholder_state(self) -> Dict[str, Any]:
        """为 Python BehaviorManager 提供占位状态"""
        return {"energy": 0.5, "fatigue": 0.0, "emotion": {"pleasure": 0.0}}


# ═══════════════════════════════════════════════════════════════
# 主引擎
# ═══════════════════════════════════════════════════════════════

class AkihoEngine:
    """
    AKIHO 核心引擎

    整合所有子系统的主引擎类。
    仿真计算层由 Rust akiho-core 加速，文本处理与向量存储保留在 Python 层。
    """

    def __init__(self):
        # Rust 核心引擎（优先初始化，用于判断特性开关）
        if HAS_RUST_CORE:
            self._rust = PyAkihoCore()
            self._body = _BodyBridge(self._rust)
            self._growth = _GrowthBridge(self._rust)
            self._relationships = _RelationshipBridge(self._rust)
            # 情绪: Rust PAD 状态 + Python 文本处理
            self._emotion_bridge = _EmotionBridge(self._rust)
            self.emotion = _PythonEmotionAdapter(self._emotion_bridge)
            # 认知: Rust 注意力/推理引擎
            self._cognition = _CognitionAdapter(_CognitionBridge(self._rust))
        else:
            self._rust = None
            self._body = _LegacyBodyManager()
            self._growth = _LegacyGrowthManager()
            self._relationships = _LegacyRelationshipTracker()
            self.emotion = EmotionManager()
            self._cognition = None

        # Python 子系统（文本处理 / 向量存储）
        # 统一层：Python MemoryManager + Rust MemoryStore
        if HAS_RUST_CORE:
            self._memory_py = MemoryManager()
            self.memory = _MemoryBridge(self._memory_py, self._rust.memory)
        else:
            self._memory_py = None
            self.memory = MemoryManager()
        # 行为系统: Rust BehaviorEngine (自主决策) + Python BehaviorManager (关键词触发)
        if HAS_RUST_CORE:
            self._behavior_bridge = _BehaviorBridge(self._rust)
            self.behavior = _BehaviorAdapter(self._behavior_bridge, BehaviorManager())
        else:
            self.behavior = BehaviorManager()

        # LLM
        self.llm: Optional[LLMManager] = None

        # 持久化层（默认为内存存储，Phase 1.2 P2 后可替换为 PostgreSQL/Redis）
        self._persistence: Optional[StateStore] = None
        self._persistence_key = "akiho_state"
        self._persistence_ttl: Optional[int] = 3600  # 1 小时 TTL

        # 状态
        self._running = False
        self._tick_interval = 0.1  # 100ms
        self._character_name = "AKIHO"

    # ── 兼容属性（body / growth 暴露旧 API） ──

    @property
    def body(self):
        return self._body

    @property
    def growth(self):
        return self._growth

    @property
    def cognition(self):
        return self._cognition

    # ── 生命周期 ──

    async def initialize(self):
        """初始化引擎"""
        self.llm = get_llm_manager()

    async def start(self):
        """启动引擎"""
        await self.initialize()
        self._running = True
        asyncio.create_task(self._tick_loop())

    async def stop(self):
        """停止引擎"""
        self._running = False

    async def _tick_loop(self):
        """主循环"""
        while self._running:
            try:
                await self.tick(self._tick_interval)
                await asyncio.sleep(self._tick_interval)
            except Exception as e:
                print(f"Engine tick error: {e}")

    async def tick(self, delta: float = 0.1):
        """
        执行一次更新

        Args:
            delta: 时间增量（秒）
        """
        # 更新生理系统（Rust 或 fallback）
        self._body.update(delta)

        # 更新情绪系统（Python 文本处理 + Rust PAD 状态管理）
        self.emotion.update_from_body(
            energy=self._body.energy,
            fatigue=self._body.fatigue,
            dominant_need=self._body.dominant_need() if not HAS_RUST_CORE else None,
        )
        # PAD 衰减（由 adapter 委托到 Rust 或 Python）
        self.emotion.update(delta)

        # 更新行为系统
        state = self._get_current_state()
        self.behavior.update(state, delta)

        # 演化人格（Rust 或 fallback）
        self._growth.evolve(delta)

        # Rust 特有：认知 & 自主性引擎更新
        if self._cognition:
            self._cognition.tick(delta)
        if self._rust:
            self._rust.autonomous.tick(delta)

    def _get_current_state(self) -> Dict[str, Any]:
        """获取当前系统状态"""
        return {
            "energy": self._body.energy,
            "fatigue": self._body.fatigue,
            "emotion": self.emotion.get_state(),
            "attention": 1.0,
            "timestamp": datetime.now().timestamp(),
        }

    # ── 关系管理 ──

    def _get_relationship(self, user_id: str) -> Dict[str, Any]:
        """获取或创建用户关系状态"""
        return self._relationships.get_state(user_id)

    def _update_relationship(self, user_id: str):
        """根据互动次数更新关系状态"""
        self._relationships.record_interaction(user_id, 0.7)

    # ── LLM 上下文 ──

    def _get_generation_context(
        self, message: str, user_id: str, history: List[Dict]
    ) -> GenerationContext:
        """构建 LLM 生成上下文"""
        rel = self._get_relationship(user_id)
        return GenerationContext(
            user_message=message,
            character_name=self._character_name,
            current_mood=self.emotion.category,
            mood_intensity=self.emotion.state.intensity,
            intimacy=rel["intimacy"],
            trust=rel["trust"],
            relationship=rel["relationship"],
            energy=self._body.energy,
            fatigue=self._body.fatigue,
            recent_messages=history[-5:] if history else [],
            relevant_memories=[
                m["content"] for m in self.memory.get_recent(24, 3)
            ],
        )

    # ── 输入处理 ──

    async def process_input(self, text: str, user_id: str = "default") -> Dict[str, Any]:
        """
        处理用户输入

        Args:
            text: 输入文本
            user_id: 用户ID

        Returns:
            处理结果
        """
        self.memory.store_conversation(text, user_id)
        self.emotion.process_text_input(text)
        self._update_relationship(user_id)

        state = self._get_current_state()
        self.behavior.trigger_from_input(text, state)

        # Rust: 记录经验事件
        if self._rust:
            self._rust.growth.process_experience("positive_interaction", 0.5)

        return {
            "emotion": self.emotion.get_state(),
            "memory_count": self.memory.get_count(),
            "active_behaviors": self.behavior.get_active(),
        }

    # ── 回复生成 ──

    async def generate_response(
        self,
        message: str,
        user_id: str = "default",
        history: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        """
        生成回复

        Args:
            message: 用户消息
            user_id: 用户ID
            history: 对话历史

        Returns:
            包含回复和状态的字典
        """
        await self.process_input(message, user_id)

        context = self._get_generation_context(message, user_id, history or [])

        if self.llm:
            result = await self.llm.generate(context)
            response_text = result.text if result.success else self._fallback_response()
        else:
            response_text = self._fallback_response()

        self.memory.store_conversation(response_text, self._character_name)

        return {
            "response": response_text,
            "emotion": self.emotion.get_state(),
            "status": self._get_current_state(),
        }

    def _fallback_response(self) -> str:
        """当 LLM 不可用时的回复"""
        emotion = self.emotion.category
        responses = {
            "positive": "看到你这么开心，我也很高兴呢~",
            "negative": "发生什么了吗？我在这里陪你聊聊。",
            "neutral": "嗯，我在听呢。继续说吧~",
            "mixed": "我理解你的感受有点复杂...",
            "apathetic": "...今天有点累吗？要不要休息一下？",
        }
        return responses.get(emotion, "嗯，好的。")

    # ── 状态查询 ──

    def get_status(self) -> Dict[str, Any]:
        """获取完整状态"""
        status = {
            "emotion": self.emotion.get_state(),
            "body": self._body.get_status(),
            "memory": {
                "total": self.memory.get_count(),
                "recent": self.memory.get_recent(5),
            },
            "behavior": {
                "active": self.behavior.get_active(),
                "available": self.behavior.get_available(),
            },
            "growth": self._growth.get_profile(),
        }

        # Rust 特有子系统状态
        if self._rust:
            try:
                drives = self._rust.autonomous.get_drive_tensions()
                status["drives"] = dict(drives) if not isinstance(drives, dict) else drives
                status["dominant_drive"] = self._rust.autonomous.dominant_drive()
            except Exception:
                pass

        # 认知系统状态
        if self._cognition:
            status["cognition"] = self._cognition.get_attention_state()

        return status

    def get_display_data(self) -> Dict[str, Any]:
        """获取用于显示的数据（兼容前端 WebSocket / API）"""
        config = load_config_json()
        llm_config = config.get("llm", {})
        api_key = llm_config.get("api_key", "")
        provider = llm_config.get("provider", "deepseek")
        model = llm_config.get("model", "")
        api_available = bool(api_key)

        rel = self._get_relationship("default")

        return {
            "code": 0,
            "data": {
                # 情绪系统 (PAD模型)
                "emotion": {
                    "pleasure": self.emotion.pleasure,
                    "arousal": self.emotion.arousal,
                    "dominance": self.emotion.dominance,
                    "category": self.emotion.category,
                    "intensity": self.emotion.state.intensity,
                    "name": self._get_emotion_name(self.emotion.category),
                },
                # 生理系统
                "physiological": {
                    "energy": self._body.energy,
                    "fatigue": self._body.fatigue,
                    "hunger": self._body.hunger,
                    "comfort": self._body.comfort,
                },
                # 关系系统
                "relationship": {
                    "intimacy": rel["intimacy"],
                    "trust": rel["trust"],
                    "interaction_count": rel["interaction_count"],
                    "relationship": rel["relationship"],
                },
                # 能量和疲劳（兼容前端）
                "energy": self._body.energy,
                "fatigue": self._body.fatigue,
                "pleasure": self.emotion.pleasure,
                "arousal": self.emotion.arousal,
                "dominance": self.emotion.dominance,
                "category": self.emotion.category,
                # 生成器信息
                "generator_type": "api" if api_available else "rule",
                "generators": {
                    "api": {
                        "available": api_available,
                        "provider": provider,
                        "model": model,
                        "error": None if api_available else "API密钥未配置",
                    },
                    "rule": {"available": True},
                    "local": {"available": False},
                },
                # 记忆统计
                "memory": {
                    "total": self.memory.get_count(),
                    "recent": self.memory.get_recent(5),
                },
                # 行为状态
                "behavior": {
                    "active": self.behavior.get_active(),
                    "available": self.behavior.get_available(),
                },
                # 成长系统
                "growth": self._growth.get_profile(),
                # 认知系统
                "cognition": self._cognition.get_attention_state() if self._cognition else {},
                # 时间戳
                "timestamp": datetime.now().isoformat(),
            },
        }

    def _get_emotion_name(self, category: str) -> str:
        """获取情绪名称"""
        names = {
            "positive": "开心",
            "negative": "难过",
            "neutral": "平静",
            "mixed": "复杂",
            "apathetic": "淡漠",
        }
        return names.get(category, "未知")

    # ── 持久化 ──

    def set_persistence(self, store: StateStore, key: str = "akiho_state", ttl: Optional[int] = 3600):
        """
        设置持久化存储。

        Args:
            store: StateStore 实现（MemoryStateStore / PostgresStateStore / RedisStateStore）
            key: 状态键名
            ttl: 状态存活时间（秒），None 表示永久
        """
        self._persistence = store
        self._persistence_key = key
        self._persistence_ttl = ttl

    async def save_state(self):
        """保存当前状态到持久化层"""
        if self._persistence:
            try:
                status = self.get_status()
                await self._persistence.save_state(
                    self._persistence_key, status, self._persistence_ttl
                )
            except Exception as e:
                print(f"Failed to save state: {e}")

    async def load_state(self) -> bool:
        """
        从持久化层恢复状态。

        Returns:
            是否成功加载了状态
        """
        if not self._persistence:
            return False
        try:
            state = await self._persistence.load_state(self._persistence_key)
            if state:
                self._restore_state(state)
                return True
        except Exception as e:
            print(f"Failed to load state: {e}")
        return False

    def _restore_state(self, state: dict):
        """
        将持久化状态恢复到各子系统。

        当前仅恢复 Rust 引擎状态；其他子系统的恢复
        在 Phase 1.2 P2 完善。
        """
        if not HAS_RUST_CORE:
            return
        # Rust 引擎状态恢复（未来扩展）


# ═══════════════════════════════════════════════════════════════
# Fallback：Rust 不可用时的纯 Python 实现
# ═══════════════════════════════════════════════════════════════

class _LegacyBodyManager:
    """Rust 不可用时回退的纯 Python 生理管理器"""

    def __init__(self):
        self.energy = 1.0
        self.max_energy = 1.0
        self._drain_rate = 0.005
        self._recovery_rate = 0.02
        self.mental_fatigue = 0.0
        self.emotional_fatigue = 0.0
        self.social_fatigue = 0.0

    @property
    def fatigue(self) -> float:
        return (self.mental_fatigue + self.emotional_fatigue + self.social_fatigue) / 3.0

    @property
    def hunger(self) -> float:
        return 0.0

    @property
    def comfort(self) -> float:
        return self.energy

    def get_status(self) -> Dict[str, Any]:
        return {
            "energy": self.energy,
            "fatigue": self.fatigue,
            "mental_fatigue": self.mental_fatigue,
            "social_fatigue": self.social_fatigue,
            "dominant_need": self.dominant_need(),
            "needs": {},
        }

    def update(self, delta: float, is_active: bool = True):
        if is_active:
            self.energy = max(0.0, self.energy - self._drain_rate * delta)
            self.mental_fatigue = min(1.0, self.mental_fatigue + 0.001 * delta)
            self.emotional_fatigue = min(1.0, self.emotional_fatigue + 0.0005 * delta)
        else:
            self.energy = min(self.max_energy, self.energy + self._recovery_rate * delta)
            recovery = 0.01 * delta
            self.mental_fatigue = max(0.0, self.mental_fatigue - recovery)
            self.emotional_fatigue = max(0.0, self.emotional_fatigue - recovery * 0.8)

    def dominant_need(self) -> Optional[str]:
        if self.energy < 0.3:
            return "rest"
        return None

    def apply_social_fatigue(self, amount: float):
        self.social_fatigue = min(1.0, self.social_fatigue + amount)

    def restore_energy(self, amount: float):
        self.energy = min(self.max_energy, self.energy + amount)


class _LegacyGrowthManager:
    """Rust 不可用时回退的纯 Python 成长管理器"""

    def __init__(self):
        self.phase = "婴儿期"
        self._characteristics = {
            "好奇心": 0.5, "开放性": 0.5, "友善": 0.5, "自信": 0.4,
            "耐心": 0.4, "创造力": 0.4, "独立性": 0.3, "责任感": 0.3,
        }
        self.experience_count = 0
        self.milestone_count = 0

    def get_profile(self) -> Dict[str, Any]:
        return {
            "phase": self.phase,
            "characteristics": dict(self._characteristics),
            "experience_count": self.experience_count,
            "milestone_count": self.milestone_count,
        }

    def process_experience(self, experience_type: str, intensity: float = 0.5):
        self.experience_count += 1

    def evolve(self, delta: float = 1.0):
        # 确定性演化：基于经验积累逐渐提升特征值
        experience_factor = min(self.experience_count * 0.001, 0.005)
        for name in self._characteristics:
            self._characteristics[name] += experience_factor * delta
            self._characteristics[name] = max(0.0, min(1.0, self._characteristics[name]))


class _LegacyRelationshipTracker:
    """Rust 不可用时回退的纯 Python 关系追踪器"""

    def __init__(self):
        self._relations: Dict[str, Dict[str, Any]] = {}

    def record_interaction(self, user_id: str, positivity: float = 0.7):
        rel = self.get_state(user_id)
        rel["interaction_count"] += 1
        n = rel["interaction_count"]
        rel["intimacy"] = min(1.0, 0.1 + math.log2(1 + n) * 0.18)
        rel["trust"] = min(1.0, rel["intimacy"] * 0.9)
        if rel["intimacy"] >= 0.8:
            rel["relationship"] = "intimate"
        elif rel["intimacy"] >= 0.6:
            rel["relationship"] = "close"
        elif rel["intimacy"] >= 0.4:
            rel["relationship"] = "friend"
        elif rel["intimacy"] >= 0.2:
            rel["relationship"] = "acquaintance"

    def get_state(self, user_id: str) -> Dict[str, Any]:
        if user_id not in self._relations:
            self._relations[user_id] = {
                "intimacy": 0.1,
                "trust": 0.1,
                "interaction_count": 0,
                "relationship": "stranger",
            }
        return self._relations[user_id]


# ═══════════════════════════════════════════════════════════════
# 全局引擎实例
# ═══════════════════════════════════════════════════════════════

_engine: Optional[AkihoEngine] = None


def get_engine() -> AkihoEngine:
    """获取引擎实例"""
    global _engine
    if _engine is None:
        _engine = AkihoEngine()
    return _engine


async def init_engine():
    """初始化引擎"""
    engine = get_engine()
    await engine.start()
    return engine
