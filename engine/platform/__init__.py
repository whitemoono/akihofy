"""AKIHO Platform Module

统一的平台适配器架构，支持多平台消息收发。

平台列表:
- Telegram: 通过 aiogram 实现
- WeChat: 通过 Clawbot 中间件实现 (待确认)
"""
from .base import PlatformAdapter, PlatformMessage, MessageType
from .registry import PlatformRegistry, get_registry, register_platform
from .manager import PlatformManager, get_platform_manager, init_platform_manager

__all__ = [
    # 基类和数据模型
    "PlatformAdapter",
    "PlatformMessage",
    "MessageType",
    # 注册表
    "PlatformRegistry",
    "get_registry",
    "register_platform",
    # 平台管理器
    "PlatformManager",
    "get_platform_manager",
    "init_platform_manager",
]
