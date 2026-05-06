"""
人格成长管理模块
"""
from typing import Dict, Any, List
from dataclasses import dataclass, field
from enum import Enum


class GrowthPhase(Enum):
    """成长阶段"""
    INFANT = "infant"       # 婴儿期
    TODDLER = "toddler"     # 幼儿期
    CHILD = "child"         # 儿童期
    ADOLESCENT = "adolescent"  # 青春期
    ADULT = "adult"         # 成熟期
    SAGE = "sage"           # 智慧期


@dataclass
class Characteristic:
    """性格特征"""
    name: str
    base_value: float
    current_value: float
    growth_rate: float = 0.01
    volatility: float = 0.05


@dataclass
class PersonalityProfile:
    """人格档案"""
    phase: GrowthPhase
    characteristics: List[Characteristic]
    experience_count: int = 0
    milestone_count: int = 0


class GrowthManager:
    """
    成长管理器

    管理人格特征的动态演化
    """

    PHASE_ORDER = [
        GrowthPhase.INFANT,
        GrowthPhase.TODDLER,
        GrowthPhase.CHILD,
        GrowthPhase.ADOLESCENT,
        GrowthPhase.ADULT,
        GrowthPhase.SAGE,
    ]

    DEFAULT_CHARACTERISTICS = [
        ("好奇心", 0.5),
        ("开放性", 0.5),
        ("友善", 0.5),
        ("自信", 0.4),
        ("耐心", 0.4),
        ("创造力", 0.4),
        ("独立性", 0.3),
        ("责任感", 0.3),
    ]

    def __init__(self):
        self.phase = GrowthPhase.INFANT
        self.characteristics: Dict[str, Characteristic] = {}
        self.experience_count = 0
        self.milestone_count = 0

        # 初始化特征
        for name, base in self.DEFAULT_CHARACTERISTICS:
            self.characteristics[name] = Characteristic(
                name=name,
                base_value=base,
                current_value=base,
                growth_rate=0.005,
                volatility=0.02
            )

    def get_profile(self) -> Dict[str, Any]:
        """获取人格档案"""
        return {
            "phase": self.phase.value,
            "characteristics": {
                name: char.current_value
                for name, char in self.characteristics.items()
            },
            "experience_count": self.experience_count,
            "milestone_count": self.milestone_count
        }

    def process_experience(self, experience_type: str, intensity: float = 0.5):
        """
        处理经验并更新特征

        Args:
            experience_type: 经验类型
            intensity: 强度 0.0 ~ 1.0
        """
        self.experience_count += 1

        # 特征影响映射
        effects = {
            "positive_interaction": [("友善", 0.1), ("自信", 0.05)],
            "negative_interaction": [("耐心", 0.05), ("自信", -0.05)],
            "learning": [("好奇心", 0.1), ("开放性", 0.05)],
            "creation": [("创造力", 0.1), ("独立性", 0.05)],
            "social_bond": [("友善", 0.1), ("责任感", 0.05)],
            "achievement": [("自信", 0.15), ("责任感", 0.1)],
            "failure": [("耐心", 0.1), ("开放性", 0.05)],
            "reflection": [("独立性", 0.05), ("好奇心", 0.05)],
        }

        changes = effects.get(experience_type, [])
        for char_name, delta in changes:
            if char_name in self.characteristics:
                char = self.characteristics[char_name]
                char.current_value += delta * intensity
                char.current_value = max(0.0, min(1.0, char.current_value))

        # 检查里程碑
        self._check_milestones()

    def evolve(self, delta: float = 1.0):
        """
        随时间演化特征

        Args:
            delta: 时间增量
        """
        for char in self.characteristics.values():
            # 基础演化
            char.current_value += char.growth_rate * delta * 0.1

            # 波动
            import random
            noise = (random.random() - 0.5) * char.volatility
            char.current_value += noise

            # 限制范围
            char.current_value = max(0.0, min(1.0, char.current_value))

    def _check_milestones(self):
        """检查里程碑"""
        milestones = [
            (100, GrowthPhase.INFANT, GrowthPhase.TODDLER),
            (500, GrowthPhase.TODDLER, GrowthPhase.CHILD),
            (1000, GrowthPhase.CHILD, GrowthPhase.ADOLESCENT),
            (5000, GrowthPhase.ADOLESCENT, GrowthPhase.ADULT),
        ]

        for exp_threshold, current, next_phase in milestones:
            if self.experience_count >= exp_threshold and self.phase == current:
                self.phase = next_phase
                self.milestone_count += 1
                self._apply_phase_bonus(next_phase)

    def _apply_phase_bonus(self, phase: GrowthPhase):
        """应用阶段奖励"""
        bonuses = {
            GrowthPhase.TODDLER: [("好奇心", 0.2), ("独立性", 0.1)],
            GrowthPhase.CHILD: [("友善", 0.15), ("开放性", 0.1)],
            GrowthPhase.ADOLESCENT: [("独立性", 0.2), ("自信", 0.15)],
            GrowthPhase.ADULT: [("责任感", 0.2), ("耐心", 0.15)],
            GrowthPhase.SAGE: [("智慧", 0.3), ("创造力", 0.2)],
        }

        for name, delta in bonuses.get(phase, []):
            if name in self.characteristics:
                self.characteristics[name].current_value = min(
                    1.0,
                    self.characteristics[name].current_value + delta
                )
