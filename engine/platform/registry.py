"""Platform Registry

平台注册表，用于管理所有已启用的平台适配器。
"""
from typing import Dict, Optional, List, Type

from .base import PlatformAdapter, PlatformMessage


class PlatformInfo:
    """平台信息"""

    def __init__(
        self,
        name: str,
        adapter_class: Type[PlatformAdapter],
        config_key: str,
        description: str = "",
        enabled_by_default: bool = False,
    ):
        self.name = name
        self.adapter_class = adapter_class
        self.config_key = config_key
        self.description = description
        self.enabled_by_default = enabled_by_default


class PlatformRegistry:
    """
    平台注册表。

    管理所有可用的平台适配器类。
    """

    def __init__(self):
        self._platforms: Dict[str, PlatformInfo] = {}
        self._adapters: Dict[str, PlatformAdapter] = {}

    def register(
        self,
        name: str,
        adapter_class: Type[PlatformAdapter],
        config_key: str,
        description: str = "",
        enabled_by_default: bool = False,
    ) -> None:
        """
        注册一个平台适配器类。

        Args:
            name: 平台名称
            adapter_class: 适配器类
            config_key: 配置键 (如 "platforms.telegram")
            description: 平台描述
            enabled_by_default: 是否默认启用
        """
        self._platforms[name] = PlatformInfo(
            name=name,
            adapter_class=adapter_class,
            config_key=config_key,
            description=description,
            enabled_by_default=enabled_by_default,
        )

    def get_platform_info(self, name: str) -> Optional[PlatformInfo]:
        """
        获取平台信息。

        Args:
            name: 平台名称

        Returns:
            平台信息，如果不存在返回 None
        """
        return self._platforms.get(name)

    def list_platforms(self) -> List[str]:
        """
        列出所有已注册的平台名称。

        Returns:
            平台名称列表
        """
        return list(self._platforms.keys())

    def register_adapter(self, name: str, adapter: PlatformAdapter) -> None:
        """
        注册一个已实例化的适配器。

        Args:
            name: 平台名称
            adapter: 适配器实例
        """
        self._adapters[name] = adapter

    def get_adapter(self, name: str) -> Optional[PlatformAdapter]:
        """
        获取已注册的适配器实例。

        Args:
            name: 平台名称

        Returns:
            适配器实例，如果不存在返回 None
        """
        return self._adapters.get(name)

    def unregister_adapter(self, name: str) -> None:
        """
        注销适配器。

        Args:
            name: 平台名称
        """
        if name in self._adapters:
            del self._adapters[name]

    def list_active_adapters(self) -> List[str]:
        """
        列出所有活跃的适配器。

        Returns:
            活跃适配器名称列表
        """
        return [
            name for name, adapter in self._adapters.items()
            if adapter.is_connected
        ]

    def get_all_status(self) -> Dict[str, Dict]:
        """
        获取所有适配器的状态。

        Returns:
            状态字典 {平台名: 状态}
        """
        return {
            name: adapter.get_status()
            for name, adapter in self._adapters.items()
        }


# 全局注册表实例
_global_registry: Optional[PlatformRegistry] = None


def get_registry() -> PlatformRegistry:
    """获取全局平台注册表"""
    global _global_registry
    if _global_registry is None:
        _global_registry = PlatformRegistry()
    return _global_registry


def register_platform(
    name: str,
    config_key: str,
    description: str = "",
    enabled_by_default: bool = False,
):
    """
    平台注册装饰器。

    用法:
        @register_platform("telegram", "platforms.telegram", "Telegram 平台")
        class TelegramAdapter(PlatformAdapter):
            ...

    Args:
        name: 平台名称
        config_key: 配置键 (如 "platforms.telegram")
        description: 平台描述
        enabled_by_default: 是否默认启用
    """

    def decorator(cls: Type[PlatformAdapter]):
        registry = get_registry()
        registry.register(
            name=name,
            adapter_class=cls,
            config_key=config_key,
            description=description,
            enabled_by_default=enabled_by_default,
        )
        return cls

    return decorator
