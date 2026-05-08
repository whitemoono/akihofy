"""Platform Adapter Base Classes

定义统一的平台适配器接口和消息格式。
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, Callable, Awaitable


class MessageType(str, Enum):
    """消息类型枚举"""
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    STICKER = "sticker"
    DOCUMENT = "document"
    LOCATION = "location"
    CONTACT = "contact"
    UNKNOWN = "unknown"


@dataclass
class PlatformMessage:
    """
    统一的平台消息格式。

    所有平台的消息都会被转换为这个统一格式，
    然后交给核心引擎处理。

    Attributes:
        platform: 平台名称 ("telegram", "wechat")
        user_id: 用户在平台上的唯一 ID
        chat_id: 会话 ID
        message_id: 消息 ID (用于回复)
        content: 消息内容
        timestamp: 消息时间
        message_type: 消息类型
        metadata: 额外元数据
    """
    platform: str
    user_id: str
    chat_id: str
    message_id: Optional[str] = None
    content: str = ""
    timestamp: datetime = field(default_factory=datetime.now)
    message_type: MessageType = MessageType.TEXT
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "platform": self.platform,
            "user_id": self.user_id,
            "chat_id": self.chat_id,
            "message_id": self.message_id,
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
            "message_type": self.message_type.value,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PlatformMessage":
        """从字典创建实例"""
        timestamp = data.get("timestamp")
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp)
        elif timestamp is None:
            timestamp = datetime.now()

        message_type = data.get("message_type", "text")
        if isinstance(message_type, str):
            message_type = MessageType(message_type)

        return cls(
            platform=data.get("platform", "unknown"),
            user_id=data.get("user_id", ""),
            chat_id=data.get("chat_id", ""),
            message_id=data.get("message_id"),
            content=data.get("content", ""),
            timestamp=timestamp,
            message_type=message_type,
            metadata=data.get("metadata", {}),
        )


class PlatformAdapter(ABC):
    """
    平台适配器抽象基类。

    所有平台适配器必须实现以下方法：
    - start: 启动适配器
    - stop: 停止适配器
    - send_message: 发送消息到指定会话
    - send_direct_message: 发送私信
    - handle_message: 处理收到的消息
    """

    def __init__(self, config: Dict[str, Any]):
        """
        初始化平台适配器。

        Args:
            config: 平台配置字典
        """
        self.config = config
        self._enabled = config.get("enabled", False)
        self._connected = False
        self._message_handler: Optional[Callable[[PlatformMessage], Awaitable[None]]] = None

    @property
    @abstractmethod
    def platform_name(self) -> str:
        """平台名称"""
        pass

    @property
    def is_enabled(self) -> bool:
        """是否启用"""
        return self._enabled

    @property
    def is_connected(self) -> bool:
        """是否已连接"""
        return self._connected

    @abstractmethod
    async def start(self) -> None:
        """
        启动适配器。

        启动后适配器应开始监听消息。
        """
        pass

    @abstractmethod
    async def stop(self) -> None:
        """
        停止适配器。

        停止后适配器应释放所有资源。
        """
        pass

    @abstractmethod
    async def send_message(
        self,
        chat_id: str,
        content: str,
        reply_to_message_id: Optional[str] = None,
        **kwargs
    ) -> bool:
        """
        发送消息到指定会话。

        Args:
            chat_id: 会话 ID
            content: 消息内容
            reply_to_message_id: 回复的消息 ID
            **kwargs: 额外的发送参数

        Returns:
            发送是否成功
        """
        pass

    @abstractmethod
    async def send_direct_message(
        self,
        user_id: str,
        content: str,
        **kwargs
    ) -> bool:
        """
        发送私信给用户。

        Args:
            user_id: 用户 ID
            content: 消息内容
            **kwargs: 额外的发送参数

        Returns:
            发送是否成功
        """
        pass

    @abstractmethod
    async def handle_message(self, message: PlatformMessage) -> None:
        """
        处理收到的消息。

        当适配器收到消息时调用此方法。
        默认会将消息分发给 _message_handler。

        Args:
            message: 统一格式的消息对象
        """
        await self._dispatch_message(message)

    def set_message_handler(
        self,
        handler: Callable[[PlatformMessage], Awaitable[None]]
    ) -> None:
        """
        设置消息处理器。

        当适配器收到消息时应调用此处理器。

        Args:
            handler: 异步消息处理函数
        """
        self._message_handler = handler

    async def _dispatch_message(self, message: PlatformMessage) -> None:
        """
        分发消息到处理器。

        Args:
            message: 收到的消息
        """
        if self._message_handler:
            await self._message_handler(message)

    def get_status(self) -> Dict[str, Any]:
        """
        获取适配器状态。

        Returns:
            状态字典
        """
        return {
            "platform": self.platform_name,
            "enabled": self._enabled,
            "connected": self._connected,
            "status": self._get_status_text(),
        }

    def _get_status_text(self) -> str:
        """获取状态描述文本"""
        if not self._enabled:
            return "disabled"
        if self._connected:
            return "running"
        return "stopped"
