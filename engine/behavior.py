"""
行为决策管理模块
"""
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum


class BehaviorCategory(Enum):
    """行为类别（对应马斯洛需求层次）"""
    PHYSIOLOGICAL = 1  # 生理需求
    SAFETY = 2         # 安全需求
    BELONGING = 3      # 归属需求
    ESTEEM = 4         # 尊重需求
    SELF_ACTUALIZATION = 5  # 自我实现


@dataclass
class Behavior:
    """行为定义"""
    id: str
    name: str
    category: BehaviorCategory
    priority: float  # 基础优先级 0.0 ~ 1.0
    activation_threshold: float  # 激活阈值
    duration: float  # 持续时间（秒）
    cooldown: float  # 冷却时间（秒）
    requirements: Dict[str, float] = field(default_factory=dict)  # 前置条件

    def check_requirements(self, state: Dict[str, Any]) -> bool:
        """检查是否满足前置条件"""
        for key, value in self.requirements.items():
            if key == "min_energy" and state.get("energy", 1.0) < value:
                return False
            if key == "min_mood" and state.get("emotion", {}).get("pleasure", 0) < value:
                return False
            if key == "max_fatigue" and state.get("fatigue", 0) > value:
                return False
        return True


@dataclass
class ActiveBehavior:
    """正在执行的行为"""
    behavior: Behavior
    started_at: float
    progress: float = 0.0


class BehaviorManager:
    """
    行为管理器

    基于马斯洛需求层次的行为决策系统
    """

    DEFAULT_BEHAVIORS = [
        Behavior(
            id="rest",
            name="休息",
            category=BehaviorCategory.PHYSIOLOGICAL,
            priority=0.9,
            activation_threshold=0.3,
            duration=300,
            cooldown=600,
            requirements={"min_energy": 0.0}
        ),
        Behavior(
            id="socialize",
            name="社交互动",
            category=BehaviorCategory.BELONGING,
            priority=0.7,
            activation_threshold=0.4,
            duration=600,
            cooldown=300,
            requirements={"min_energy": 0.3}
        ),
        Behavior(
            id="learn",
            name="学习",
            category=BehaviorCategory.SELF_ACTUALIZATION,
            priority=0.5,
            activation_threshold=0.0,
            duration=900,
            cooldown=1800,
            requirements={"min_energy": 0.6}
        ),
        Behavior(
            id="create",
            name="创作",
            category=BehaviorCategory.SELF_ACTUALIZATION,
            priority=0.55,
            activation_threshold=0.0,
            duration=1200,
            cooldown=3600,
            requirements={"min_energy": 0.5}
        ),
        Behavior(
            id="reflect",
            name="自我反思",
            category=BehaviorCategory.SELF_ACTUALIZATION,
            priority=0.4,
            activation_threshold=0.0,
            duration=300,
            cooldown=3600,
            requirements={}
        ),
        Behavior(
            id="seek_attention",
            name="寻求关注",
            category=BehaviorCategory.ESTEEM,
            priority=0.6,
            activation_threshold=0.3,
            duration=180,
            cooldown=600,
            requirements={}
        ),
    ]

    def __init__(self):
        self.behaviors: Dict[str, Behavior] = {b.id: b for b in self.DEFAULT_BEHAVIORS}
        self.active_behaviors: List[ActiveBehavior] = []
        self.cooldowns: Dict[str, float] = {}
        self.history: List[Dict[str, Any]] = []

    def get_available(self) -> List[Dict[str, Any]]:
        """获取可用的行为列表"""
        available = []

        for behavior in self.behaviors.values():
            if self._is_available(behavior):
                available.append({
                    "id": behavior.id,
                    "name": behavior.name,
                    "category": behavior.category.name,
                    "priority": behavior.priority
                })

        return sorted(available, key=lambda x: x["priority"], reverse=True)

    def get_active(self) -> List[Dict[str, Any]]:
        """获取当前活跃的行为"""
        return [
            {
                "id": ab.behavior.id,
                "name": ab.behavior.name,
                "progress": ab.progress
            }
            for ab in self.active_behaviors
        ]

    def trigger(self, behavior_id: str) -> bool:
        """
        触发一个行为

        Args:
            behavior_id: 行为ID

        Returns:
            是否成功触发
        """
        behavior = self.behaviors.get(behavior_id)
        if not behavior:
            return False

        if not self._is_available(behavior):
            return False

        # 移除同类别的低优先级行为
        self.active_behaviors = [
            ab for ab in self.active_behaviors
            if ab.behavior.category != behavior.category or ab.behavior.priority >= behavior.priority
        ]

        # 启动新行为
        import time
        self.active_behaviors.append(ActiveBehavior(
            behavior=behavior,
            started_at=time.time(),
            progress=0.0
        ))

        # 设置冷却
        self.cooldowns[behavior_id] = time.time()

        return True

    def trigger_from_input(self, text: str, state: Dict[str, Any]) -> Optional[str]:
        """
        根据输入触发相关行为

        Args:
            text: 输入文本
            state: 当前状态

        Returns:
            触发的行为ID
        """
        text_lower = text.lower()

        # 基于输入关键词触发行为
        if any(kw in text_lower for kw in ["教我", "学习", "什么", "怎么"]):
            if state.get("energy", 0) > 0.6:
                if self.trigger("learn"):
                    return "learn"

        if any(kw in text_lower for kw in ["创作", "写", "画"]):
            if state.get("energy", 0) > 0.5:
                if self.trigger("create"):
                    return "create"

        if any(kw in text_lower for kw in ["聊聊", "说话", "聊天"]):
            if self.trigger("socialize"):
                return "socialize"

        return None

    def update(self, state: Dict[str, Any], delta: float):
        """更新行为状态"""
        import time

        # 更新活跃行为的进度
        for active in self.active_behaviors:
            elapsed = time.time() - active.started_at
            active.progress = min(1.0, elapsed / active.behavior.duration)

        # 移除已完成的行为
        completed = [ab for ab in self.active_behaviors if ab.progress >= 1.0]
        self.active_behaviors = [ab for ab in self.active_behaviors if ab.progress < 1.0]

        # 记录完成历史
        for ab in completed:
            self.history.append({
                "behavior_id": ab.behavior.id,
                "completed_at": time.time(),
                "success": True
            })

        # 清理过期的冷却
        current_time = time.time()
        self.cooldowns = {
            bid: start for bid, start in self.cooldowns.items()
            if current_time - start < self.behaviors[bid].cooldown
        }

        # 检查是否需要自动触发行为
        self._check_auto_trigger(state)

    def _is_available(self, behavior: Behavior) -> bool:
        """检查行为是否可用"""
        import time

        # 检查冷却
        if behavior.id in self.cooldowns:
            elapsed = time.time() - self.cooldowns[behavior.id]
            if elapsed < behavior.cooldown:
                return False

        return True

    def _check_auto_trigger(self, state: Dict[str, Any]):
        """检查是否需要自动触发行为"""
        # 如果没有活跃行为且能量低，触发休息
        if not self.active_behaviors and state.get("energy", 1.0) < 0.3:
            self.trigger("rest")

        # 如果疲劳度高，触发休息
        if state.get("fatigue", 0) > 0.7:
            if not any(ab.behavior.id == "rest" for ab in self.active_behaviors):
                self.trigger("rest")
