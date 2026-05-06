"""
AKIHO 引擎 - 可插拔生成器系统

核心设计：
- 统一接口：所有生成器实现相同的方法
- 热切换：运行时可以切换生成器
- 可扩展：易于添加新的生成器
"""

from .base import BaseGenerator, GenerationContext, GenerationResult
from .rule import RuleBasedGenerator
from .local import LocalGenerator
from .api import APIGenerator

__all__ = [
    "BaseGenerator",
    "GenerationContext",
    "GenerationResult",
    "RuleBasedGenerator",
    "LocalGenerator",
    "APIGenerator",
    "GENERATOR_REGISTRY",
]

# 生成器注册表
GENERATOR_REGISTRY = {
    "rule": RuleBasedGenerator,
    "local": LocalGenerator,
    "api": APIGenerator,
}


def create_generator(generator_type: str = "rule", **kwargs) -> BaseGenerator:
    """创建生成器实例"""
    generator_class = GENERATOR_REGISTRY.get(generator_type)
    if generator_class is None:
        raise ValueError(f"Unknown generator type: {generator_type}")
    return generator_class(**kwargs)
