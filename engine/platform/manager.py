"""Platform Manager

平台管理器，统一管理所有平台适配器。
"""
import asyncio
import json
from pathlib import Path
from typing import Dict, Optional, List, Any
import logging

from .base import PlatformAdapter, PlatformMessage
from .registry import get_registry

logger = logging.getLogger(__name__)


class PlatformManager:
    """
    平台管理器。

    统一管理所有平台适配器，提供：
    - 生命周期管理 (启动/停止)
    - 消息路由
    - 状态查询
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        初始化平台管理器。

        Args:
            config: 全局配置字典
        """
        self._config = config or {}
        self._platforms: Dict[str, PlatformAdapter] = {}
        self._registry = get_registry()
        self._initialized = False
        self._message_handler: Optional[callable] = None

    def set_message_handler(self, handler: callable) -> None:
        """
        设置消息处理器。

        Args:
            handler: 处理 PlatformMessage 的异步函数
        """
        self._message_handler = handler
        for platform in self._platforms.values():
            platform.set_message_handler(handler)

    def _load_platform_config(self, platform_name: str) -> Dict[str, Any]:
        """从配置中加载指定平台的配置"""
        # 尝试从 platforms.${name} 路径加载
        config = self._config.get("platforms", {}).get(platform_name, {})

        # 如果配置为空且平台未启用，返回默认禁用配置
        if not config:
            return {"enabled": False}

        return config

    async def initialize(self) -> None:
        """
        初始化所有已启用的平台。

        从全局配置中读取 platforms 配置，
        实例化并注册所有已启用的平台适配器。
        """
        if self._initialized:
            logger.warning("PlatformManager 已初始化，跳过")
            return

        logger.info("初始化平台管理器...")

        # 遍历所有已注册的平台
        for platform_name in self._registry.list_platforms():
            info = self._registry.get_platform_info(platform_name)
            if not info:
                continue

            # 加载平台配置
            config = self._load_platform_config(platform_name)

            # 如果未启用则跳过
            if not config.get("enabled", False):
                logger.debug(f"平台 {platform_name} 未启用，跳过")
                continue

            # 实例化适配器
            try:
                adapter = info.adapter_class(config)
                self._platforms[platform_name] = adapter
                self._registry.register_adapter(platform_name, adapter)

                # 设置消息处理器
                if self._message_handler:
                    adapter.set_message_handler(self._message_handler)

                logger.info(f"平台 {platform_name} 配置加载完成")
            except Exception as e:
                logger.error(f"初始化平台 {platform_name} 失败: {e}")

        self._initialized = True
        logger.info(f"平台管理器初始化完成，已加载 {len(self._platforms)} 个平台")

    async def start(self) -> None:
        """启动所有已注册的平台"""
        logger.info("启动所有平台...")

        for name, adapter in self._platforms.items():
            if adapter.is_enabled and not adapter.is_connected:
                try:
                    await adapter.start()
                    logger.info(f"平台 {name} 启动成功")
                except Exception as e:
                    logger.error(f"启动平台 {name} 失败: {e}")

    async def shutdown(self) -> None:
        """关闭所有平台"""
        logger.info("关闭所有平台...")

        for name, adapter in self._platforms.items():
            if adapter.is_connected:
                try:
                    await adapter.stop()
                    logger.info(f"平台 {name} 已关闭")
                except Exception as e:
                    logger.error(f"关闭平台 {name} 失败: {e}")

        self._platforms.clear()
        self._initialized = False

    async def start_platform(self, name: str) -> bool:
        """
        启动指定平台。

        Args:
            name: 平台名称

        Returns:
            是否启动成功
        """
        adapter = self._platforms.get(name)
        if not adapter:
            logger.error(f"平台 {name} 未注册")
            return False

        if not adapter.is_enabled:
            logger.error(f"平台 {name} 未启用")
            return False

        try:
            await adapter.start()
            logger.info(f"平台 {name} 启动成功")
            return True
        except Exception as e:
            logger.error(f"启动平台 {name} 失败: {e}")
            return False

    async def stop_platform(self, name: str) -> bool:
        """
        停止指定平台。

        Args:
            name: 平台名称

        Returns:
            是否停止成功
        """
        adapter = self._platforms.get(name)
        if not adapter:
            logger.error(f"平台 {name} 未注册")
            return False

        try:
            await adapter.stop()
            logger.info(f"平台 {name} 已停止")
            return True
        except Exception as e:
            logger.error(f"停止平台 {name} 失败: {e}")
            return False

    async def send_message(
        self,
        platform: str,
        chat_id: str,
        content: str,
        reply_to_message_id: Optional[str] = None,
    ) -> bool:
        """
        通过指定平台发送消息。

        Args:
            platform: 平台名称
            chat_id: 会话 ID
            content: 消息内容
            reply_to_message_id: 回复的消息 ID

        Returns:
            发送是否成功
        """
        adapter = self._platforms.get(platform)
        if not adapter:
            logger.error(f"平台 {platform} 未注册")
            return False

        if not adapter.is_connected:
            logger.error(f"平台 {platform} 未连接")
            return False

        try:
            return await adapter.send_message(
                chat_id=chat_id,
                content=content,
                reply_to_message_id=reply_to_message_id,
            )
        except Exception as e:
            logger.error(f"通过平台 {platform} 发送消息失败: {e}")
            return False

    async def send_to_user(
        self,
        platform: str,
        user_id: str,
        content: str,
    ) -> bool:
        """
        通过指定平台发送私信给用户。

        Args:
            platform: 平台名称
            user_id: 用户 ID
            content: 消息内容

        Returns:
            发送是否成功
        """
        adapter = self._platforms.get(platform)
        if not adapter:
            logger.error(f"平台 {platform} 未注册")
            return False

        if not adapter.is_connected:
            logger.error(f"平台 {platform} 未连接")
            return False

        try:
            return await adapter.send_direct_message(
                user_id=user_id,
                content=content,
            )
        except Exception as e:
            logger.error(f"通过平台 {platform} 发送私信失败: {e}")
            return False

    def get_status(self) -> Dict[str, Any]:
        """
        获取所有平台状态。

        Returns:
            状态字典
        """
        platforms = []
        for name in self._registry.list_platforms():
            info = self._registry.get_platform_info(name)
            adapter = self._platforms.get(name)

            status = {
                "name": name,
                "description": info.description if info else "",
                "enabled": False,
                "connected": False,
                "status": "not_loaded",
            }

            if adapter:
                status.update(adapter.get_status())

            platforms.append(status)

        return {
            "initialized": self._initialized,
            "platform_count": len(self._platforms),
            "active_count": len([p for p in self._platforms.values() if p.is_connected]),
            "platforms": platforms,
        }

    def get_platform(self, name: str) -> Optional[PlatformAdapter]:
        """
        获取平台适配器。

        Args:
            name: 平台名称

        Returns:
            平台适配器实例
        """
        return self._platforms.get(name)

    def register_platform_adapter(
        self,
        name: str,
        adapter: PlatformAdapter,
    ) -> None:
        """
        注册平台适配器 (手动注册，不从配置加载)。

        Args:
            name: 平台名称
            adapter: 适配器实例
        """
        self._platforms[name] = adapter
        self._registry.register_adapter(name, adapter)

        if self._message_handler:
            adapter.set_message_handler(self._message_handler)


# 全局平台管理器实例
_global_manager: Optional[PlatformManager] = None


def get_platform_manager() -> PlatformManager:
    """获取全局平台管理器"""
    global _global_manager
    if _global_manager is None:
        _global_manager = PlatformManager()
    return _global_manager


def init_platform_manager(config: Dict[str, Any]) -> PlatformManager:
    """初始化全局平台管理器"""
    global _global_manager
    _global_manager = PlatformManager(config)
    return _global_manager
