"""
情绪管理模块
"""
from typing import Dict, Any, Optional
from dataclasses import dataclass
import re


@dataclass
class EmotionState:
    """情绪状态"""
    pleasure: float = 0.0      # 愉悦度 -1.0 ~ +1.0
    arousal: float = 0.0       # 唤醒度 -1.0 ~ +1.0
    dominance: float = 0.0     # 支配度 -1.0 ~ +1.0

    @property
    def intensity(self) -> float:
        """情绪强度"""
        return (self.pleasure ** 2 + self.arousal ** 2) ** 0.5

    def to_dict(self) -> Dict[str, float]:
        return {
            "pleasure": self.pleasure,
            "arousal": self.arousal,
            "dominance": self.dominance,
            "intensity": self.intensity
        }


class EmotionManager:
    """
    情绪管理器

    基于 PAD (Pleasure-Arousal-Dominance) 模型的情绪系统
    """

    # PAD 情绪映射表
    EMOTION_MAP = {
        # 正面情绪
        "joy": {"pleasure": 0.81, "arousal": 0.46, "dominance": 0.45},
        "serenity": {"pleasure": 0.57, "arousal": -0.33, "dominance": 0.25},
        "surprise": {"pleasure": 0.40, "arousal": 0.67, "dominance": -0.13},

        # 负面情绪
        "anger": {"pleasure": -0.51, "arousal": 0.59, "dominance": 0.25},
        "fear": {"pleasure": -0.64, "arousal": 0.60, "dominance": -0.43},
        "sadness": {"pleasure": -0.30, "arousal": -0.20, "dominance": -0.50},
        "disgust": {"pleasure": -0.60, "arousal": 0.35, "dominance": 0.30},
        "anxiety": {"pleasure": -0.40, "arousal": 0.62, "dominance": -0.42},
        "boredom": {"pleasure": -0.32, "arousal": -0.62, "dominance": -0.12},

        # 中性情绪
        "submission": {"pleasure": -0.36, "arousal": -0.19, "dominance": -0.57},
    }

    # 情绪关键词
    POSITIVE_KEYWORDS = ["好", "喜欢", "开心", "高兴", "棒", "赞", "爱", "哈哈", "真好", "谢谢", "happy", "good", "great", "love"]
    NEGATIVE_KEYWORDS = ["不", "讨厌", "难过", "生气", "怕", "烦", "累", "累", "sad", "angry", "hate", "bad"]
    QUESTION_KEYWORDS = ["吗", "呢", "怎么", "什么", "为什么", "how", "what", "why"]

    def __init__(self):
        self.state = EmotionState()
        self.inertia = 0.7  # 情绪惯性
        self.decay_rate = 0.05  # 衰减率
        self.history = []

    @property
    def pleasure(self) -> float:
        return self.state.pleasure

    @property
    def arousal(self) -> float:
        return self.state.arousal

    @property
    def dominance(self) -> float:
        return self.state.dominance

    @property
    def category(self) -> str:
        """获取当前情绪类别"""
        return self._classify_emotion()

    def get_state(self) -> Dict[str, Any]:
        return {
            **self.state.to_dict(),
            "category": self.category
        }

    def update(self, delta: float = 0.1):
        """更新情绪状态（衰减）"""
        # 向中性衰减
        decay = self.decay_rate * delta
        self.state.pleasure *= (1 - decay)
        self.state.arousal *= (1 - decay * 0.5)
        self.state.dominance *= (1 - decay * 0.3)

    def update_from_body(self, energy: float, fatigue: float, dominant_need: Optional[str] = None):
        """根据生理状态更新情绪"""
        # 低能量降低愉悦度
        if energy < 0.3:
            self.state.pleasure -= 0.05
        elif energy > 0.8:
            self.state.pleasure += 0.02

        # 疲劳增加负面情绪
        if fatigue > 0.6:
            self.state.pleasure -= fatigue * 0.1
            self.state.arousal -= fatigue * 0.05

        self._clamp_state()

    def process_text_input(self, text: str):
        """处理文本输入引起的情绪变化"""
        text_lower = text.lower()

        # 检测正面情绪词
        positive_count = sum(1 for kw in self.POSITIVE_KEYWORDS if kw in text_lower)
        if positive_count > 0:
            self.state.pleasure = min(1.0, self.state.pleasure + positive_count * 0.1)
            self.state.arousal = min(1.0, self.state.arousal + positive_count * 0.05)

        # 检测负面情绪词
        negative_count = sum(1 for kw in self.NEGATIVE_KEYWORDS if kw in text_lower)
        if negative_count > 0:
            self.state.pleasure = max(-1.0, self.state.pleasure - negative_count * 0.1)
            self.state.arousal = min(1.0, self.state.arousal + negative_count * 0.05)

        # 问句通常引起好奇/注意
        question_count = sum(1 for kw in self.QUESTION_KEYWORDS if kw in text_lower)
        if question_count > 0:
            self.state.arousal = min(1.0, self.state.arousal + question_count * 0.08)

        # 检测表情符号
        positive_emoji = len(re.findall(r'[:;=][-]?[)D]|\(:', text))
        negative_emoji = len(re.findall(r'[:;=][-]?[(|/]', text))

        if positive_emoji > 0:
            self.state.pleasure = min(1.0, self.state.pleasure + positive_emoji * 0.1)
        if negative_emoji > 0:
            self.state.pleasure = max(-1.0, self.state.pleasure - negative_emoji * 0.1)

        # 应用惯性
        self._apply_inertia()

        # 限制范围
        self._clamp_state()

    def process_stimulus(self, stimulus_type: str, intensity: float = 0.5):
        """
        处理情绪刺激

        Args:
            stimulus_type: 刺激类型 (positive, negative, neutral, achieved, failed, attention, lonely)
            intensity: 强度 0.0 ~ 1.0
        """
        mapping = {
            "positive": {"pleasure": 0.3, "arousal": 0.2, "dominance": 0.1},
            "negative": {"pleasure": -0.3, "arousal": 0.3, "dominance": -0.2},
            "neutral": {"pleasure": 0.0, "arousal": 0.0, "dominance": 0.0},
            "achieved": {"pleasure": 0.4, "arousal": 0.2, "dominance": 0.3},
            "failed": {"pleasure": -0.3, "arousal": 0.2, "dominance": -0.3},
            "attention": {"pleasure": 0.2, "arousal": 0.3, "dominance": 0.1},
            "lonely": {"pleasure": -0.2, "arousal": -0.1, "dominance": -0.2},
        }

        effect = mapping.get(stimulus_type, {"pleasure": 0, "arousal": 0, "dominance": 0})

        self.state.pleasure += effect["pleasure"] * intensity
        self.state.arousal += effect["arousal"] * intensity
        self.state.dominance += effect["dominance"] * intensity

        self._apply_inertia()
        self._clamp_state()

    def _apply_inertia(self):
        """应用情绪惯性 — 情绪强度越高，越抗拒变化（模拟真实情绪粘滞性）"""
        if not hasattr(self, '_last_state'):
            self._last_state = (self.state.pleasure, self.state.arousal, self.state.dominance)
            return

        last_p, last_a, last_d = self._last_state
        intensity = self.state.intensity

        # 惯性系数：弱情绪(0.1)→0.22，强情绪(1.0)→0.72
        inertia = 0.15 + intensity * self.inertia * 0.8
        inertia = min(inertia, 0.85)

        # 向上一状态回拉，模拟情绪粘滞
        self.state.pleasure = self.state.pleasure * (1 - inertia) + last_p * inertia
        self.state.arousal = self.state.arousal * (1 - inertia) + last_a * inertia
        self.state.dominance = self.state.dominance * (1 - inertia) + last_d * inertia

        self._last_state = (self.state.pleasure, self.state.arousal, self.state.dominance)

    def _clamp_state(self):
        """限制状态在有效范围内"""
        self.state.pleasure = max(-1.0, min(1.0, self.state.pleasure))
        self.state.arousal = max(-1.0, min(1.0, self.state.arousal))
        self.state.dominance = max(-1.0, min(1.0, self.state.dominance))

    def _classify_emotion(self) -> str:
        """根据 PAD 值分类情绪"""
        p, a = self.state.pleasure, self.state.arousal

        if p > 0.3 and abs(a) < 0.3:
            return "positive"
        elif p < -0.3 and a > 0.3:
            return "negative"
        elif abs(p) < 0.2 and a < -0.3:
            return "apathetic"
        elif abs(p) < 0.2 and abs(a) < 0.2:
            return "neutral"
        else:
            return "mixed"
