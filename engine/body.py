"""
生理系统管理模块
"""
from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum


class NeedType(Enum):
    """需求类型"""
    PHYSIOLOGICAL = "physiological"  # 生理需求
    SAFETY = "safety"               # 安全需求
    BELONGING = "belonging"         # 归属需求
    ESTEEM = "esteem"              # 尊重需求
    COGNITIVE = "cognitive"         # 认知需求
    REST = "rest"                  # 休息需求


@dataclass
class Need:
    """需求"""
    need_type: NeedType
    intensity: float = 0.0  # 强度 0.0 ~ 1.0
    urgency: float = 0.0     # 紧迫性
    threshold: float = 0.5   # 触发阈值


class BodyManager:
    """
    生理管理器

    管理能量、疲劳和需求
    """

    def __init__(self):
        # 能量系统
        self.energy = 1.0
        self.max_energy = 1.0
        self.recovery_rate = 0.02
        self.drain_rate = 0.005

        # 疲劳系统
        self.mental_fatigue = 0.0
        self.emotional_fatigue = 0.0
        self.social_fatigue = 0.0

        # 需求系统
        self.needs: Dict[NeedType, Need] = {
            nt: Need(need_type=nt) for nt in NeedType
        }

    def get_status(self) -> Dict[str, Any]:
        """获取状态"""
        return {
            "energy": self.energy,
            "fatigue": self.total_fatigue,
            "mental_fatigue": self.mental_fatigue,
            "social_fatigue": self.social_fatigue,
            "dominant_need": self.dominant_need(),
            "needs": {
                nt.value: {"intensity": n.intensity, "urgency": n.urgency}
                for nt, n in self.needs.items()
            }
        }

    @property
    def fatigue(self) -> float:
        """总疲劳度"""
        return self.total_fatigue

    @property
    def total_fatigue(self) -> float:
        """计算总疲劳度"""
        return (self.mental_fatigue + self.emotional_fatigue + self.social_fatigue) / 3.0

    def update(self, delta: float, is_active: bool = True):
        """
        更新生理状态

        Args:
            delta: 时间增量（秒）
            is_active: 是否活跃
        """
        if is_active:
            # 消耗能量
            self.energy = max(0.0, self.energy - self.drain_rate * delta)

            # 增加疲劳
            self.mental_fatigue = min(1.0, self.mental_fatigue + 0.001 * delta)
            self.emotional_fatigue = min(1.0, self.emotional_fatigue + 0.0005 * delta)
        else:
            # 恢复能量
            self.energy = min(self.max_energy, self.energy + self.recovery_rate * delta)

            # 恢复疲劳
            recovery = 0.01 * delta
            self.mental_fatigue = max(0.0, self.mental_fatigue - recovery)
            self.emotional_fatigue = max(0.0, self.emotional_fatigue - recovery * 0.8)

        # 更新需求
        self._update_needs(delta)

    def dominant_need(self) -> Optional[str]:
        """获取最紧迫的需求"""
        dominant = max(self.needs.values(), key=lambda n: n.urgency, default=None)
        return dominant.need_type.value if dominant else None

    def apply_social_fatigue(self, amount: float):
        """应用社交疲劳"""
        self.social_fatigue = min(1.0, self.social_fatigue + amount)

    def restore_energy(self, amount: float):
        """恢复能量"""
        self.energy = min(self.max_energy, self.energy + amount)

    def _update_needs(self, delta: float):
        """更新需求强度"""
        # 社交需求：随时间增加
        if self.social_fatigue > 0.5:
            self.needs[NeedType.BELONGING].intensity += 0.001 * delta

        # 认知需求：无新信息时增加
        self.needs[NeedType.COGNITIVE].intensity += 0.0005 * delta

        # 休息需求：疲劳时增加
        if self.total_fatigue > 0.5:
            self.needs[NeedType.REST].intensity = self.total_fatigue

        # 限制并更新紧迫性
        for need in self.needs.values():
            need.intensity = max(0.0, min(1.0, need.intensity))

            # 计算紧迫性
            if need.intensity >= need.threshold:
                need.urgency = (need.intensity - need.threshold) * 2.0
            else:
                need.urgency = 0.0

            need.urgency = max(0.0, min(1.0, need.urgency))

    def satisfy_need(self, need_type: NeedType, amount: float):
        """满足需求"""
        if need_type in self.needs:
            self.needs[need_type].intensity = max(0.0, self.needs[need_type].intensity - amount)
            self.needs[need_type].urgency = 0.0
