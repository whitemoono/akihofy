"""
生成器基类定义

所有生成器必须实现相同的接口，确保可替换性
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, Any
from enum import Enum
import time


class GeneratorType(Enum):
    """生成器类型枚举"""
    RULE = "rule"
    LOCAL = "local"
    API = "api"


@dataclass
class GenerationContext:
    """生成上下文 - 包含生成所需的所有信息"""

    # 用户输入
    user_message: str

    # 角色状态
    character_name: str = "AKIHO"
    character_personality: str = ""
    current_mood: str = "neutral"
    mood_intensity: float = 0.5  # 0.0 - 1.0

    # 关系状态
    intimacy: float = 0.5  # 0.0 - 1.0
    trust: float = 0.5  # 0.0 - 1.0
    relationship: str = "stranger"  # stranger, acquaintance, friend, close, intimate

    # 生理状态
    energy: float = 0.8  # 0.0 - 1.0
    fatigue: float = 0.2  # 0.0 - 1.0

    # 对话历史 (最近 N 条)
    recent_messages: list[dict] = field(default_factory=list)

    # 记忆片段 (相关记忆)
    relevant_memories: list[str] = field(default_factory=list)

    # 生成选项
    temperature: float = 0.8
    max_length: int = 1024

    # 元数据
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class GenerationResult:
    """生成结果"""

    # 生成的回复文本
    text: str

    # 生成器类型
    generator_type: GeneratorType

    # 响应时间 (毫秒)
    response_time_ms: float

    # 是否成功
    success: bool = True

    # 错误信息
    error: Optional[str] = None

    # 附加数据
    extra: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def error_result(cls, generator_type: GeneratorType, error: str) -> "GenerationResult":
        """创建错误结果"""
        return cls(
            text="",
            generator_type=generator_type,
            response_time_ms=0,
            success=False,
            error=error,
        )


class BaseGenerator(ABC):
    """生成器抽象基类"""

    # 生成器标识
    name: str = "base"
    type: GeneratorType = GeneratorType.RULE

    def __init__(self, **kwargs):
        """子类可以重写此方法接受配置"""
        pass

    @abstractmethod
    def generate(self, context: GenerationContext) -> GenerationResult:
        """
        生成回复

        Args:
            context: 生成上下文

        Returns:
            GenerationResult: 生成结果
        """
        pass

    def generate_sync(self, context: GenerationContext) -> GenerationResult:
        """同步生成入口"""
        start_time = time.time()
        try:
            result = self.generate(context)
            result.response_time_ms = (time.time() - start_time) * 1000
            return result
        except Exception as e:
            return GenerationResult.error_result(self.type, str(e))

    @property
    def is_available(self) -> bool:
        """检查生成器是否可用（实际检查网络连接）"""
        return True

    @property
    def is_configured(self) -> bool:
        """检查生成器是否已配置（只检查配置，不实际检查网络）"""
        return True

    @property
    def description(self) -> str:
        """生成器描述"""
        return f"{self.name} ({self.type.value})"
