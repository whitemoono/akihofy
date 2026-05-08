"""WeChat Platform Adapter

使用 Clawbot 中间件实现的微信平台适配器。

注意: 此适配器需要 Clawbot 服务配合使用，
      具体接口规范待 Clawbot 确认后完善。
"""
import asyncio
import logging
from typing import Optional, Dict, Any

from ..base import PlatformAdapter, PlatformMessage, MessageType
from ..registry import register_platform

logger = logging.getLogger(__name__)


@register_platform(
    name="wechat",
    config_key="platforms.wechat",
    description="微信平台 (通过 Clawbot)",
)
class WeChatAdapter(PlatformAdapter):
    """
    微信平台适配器。

    通过 Clawbot 中间件接入微信平台：
    - Clawbot 接收微信消息
    - Clawbot 通过 HTTP Webhook 转发到 AKIHO
    - AKIHO 通过 Clawbot API 发送回复

    警告: 此适配器为草稿版本，接口规范待 Clawbot 确认。
    """

    def __init__(self, config: Dict[str, Any]):
        """
        初始化微信适配器。

        Args:
            config: 平台配置，包含:
                - clawbot_url: Clawbot 服务地址 (如 "http://localhost:8080")
                - secret: Clawbot 认证密钥
                - api_key: (可选) API 密钥
        """
        super().__init__(config)

        self.clawbot_url = config.get("clawbot_url", "http://localhost:8080").rstrip("/")
        self.secret = config.get("secret", "")
        self.api_key = config.get("api_key", "")

        # 验证必填配置
        if not self.clawbot_url:
            logger.warning("微信 clawbot_url 未配置，适配器将无法连接")

    @property
    def platform_name(self) -> str:
        return "wechat"

    async def start(self) -> None:
        """
        启动微信适配器。

        注意: 微信适配器是被动接收模式，
        不需要主动启动轮询或 Webhook 服务器。
        Webhook 由 API Server 的 /api/platforms/wechat/webhook 端点处理。
        """
        if not self.clawbot_url:
            raise RuntimeError("微信 clawbot_url 未配置")

        logger.info(f"初始化微信适配器，Clawbot URL: {self.clawbot_url}")

        # 验证 Clawbot 连接
        if await self._check_connection():
            logger.info("微信适配器初始化成功")
            self._connected = True
        else:
            logger.warning("微信适配器初始化失败，Clawbot 可能不可达")

    async def stop(self) -> None:
        """停止微信适配器"""
        logger.info("停止微信适配器...")
        self._connected = False

    async def _check_connection(self) -> bool:
        """
        检查 Clawbot 连接。

        Returns:
            连接是否正常
        """
        # TODO: 实现连接检查
        # 可能的接口: GET {clawbot_url}/health
        return True

    async def send_message(
        self,
        chat_id: str,
        content: str,
        reply_to_message_id: Optional[str] = None,
        **kwargs
    ) -> bool:
        """
        通过 Clawbot 发送消息。

        Args:
            chat_id: 会话 ID (通常是用户的 OpenID)
            content: 消息内容
            reply_to_message_id: 回复的消息 ID

        Returns:
            发送是否成功
        """
        try:
            # TODO: 实现通过 Clawbot 发送消息
            # 可能的接口: POST {clawbot_url}/send
            # 请求体: {
            #     "openid": chat_id,
            #     "content": content,
            #     "reply_to": reply_to_message_id,
            #     "secret": self.secret
            # }

            logger.debug(f"通过 Clawbot 发送消息到 {chat_id}: {content[:50]}...")
            return True

        except Exception as e:
            logger.error(f"通过 Clawbot 发送消息失败: {e}")
            return False

    async def send_direct_message(
        self,
        user_id: str,
        content: str,
        **kwargs
    ) -> bool:
        """
        发送私信给用户。

        Args:
            user_id: 用户 ID (OpenID)
            content: 消息内容

        Returns:
            发送是否成功
        """
        return await self.send_message(chat_id=user_id, content=content, **kwargs)

    async def handle_webhook(self, payload: Dict[str, Any]) -> None:
        """
        处理来自 Clawbot 的 Webhook 消息。

        当 API Server 收到 Clawbot 转发的事件时调用此方法。

        Args:
            payload: Webhook 负载，包含:
                - event: 事件类型 ("message", "event", etc.)
                - openid: 用户 OpenID
                - content: 消息内容
                - msg_id: 消息 ID
                - timestamp: 时间戳
                - msg_type: 消息类型 (text, image, etc.)
        """
        event = payload.get("event", "message")

        if event == "message":
            await self._handle_text_message(payload)
        elif event == "subscribe":
            await self._handle_subscribe(payload)
        elif event == "unsubscribe":
            await self._handle_unsubscribe(payload)
        else:
            logger.debug(f"收到未知事件类型: {event}")

    async def _handle_text_message(self, payload: Dict[str, Any]) -> None:
        """处理文本消息"""
        msg_type = payload.get("msg_type", "text")
        message_type = self._parse_message_type(msg_type)

        platform_msg = PlatformMessage(
            platform="wechat",
            user_id=payload.get("openid", ""),
            chat_id=payload.get("openid", ""),  # 私聊时 chat_id 等于 openid
            message_id=payload.get("msg_id"),
            content=payload.get("content", ""),
            message_type=message_type,
            metadata={
                "msg_type": msg_type,
                "timestamp": payload.get("timestamp"),
                "raw": payload,
            }
        )

        await self._dispatch_message(platform_msg)

    async def _handle_subscribe(self, payload: Dict[str, Any]) -> None:
        """处理关注事件"""
        logger.info(f"用户关注事件: {payload.get('openid')}")
        # 可以发送欢迎消息
        welcome_msg = "你好！很高兴你关注了我！有什么想聊的吗？"
        await self.send_direct_message(
            user_id=payload.get("openid", ""),
            content=welcome_msg,
        )

    async def _handle_unsubscribe(self, payload: Dict[str, Any]) -> None:
        """处理取消关注事件"""
        logger.info(f"用户取消关注: {payload.get('openid')}")

    def _parse_message_type(self, msg_type: str) -> MessageType:
        """解析消息类型"""
        type_mapping = {
            "text": MessageType.TEXT,
            "image": MessageType.IMAGE,
            "voice": MessageType.AUDIO,
            "video": MessageType.VIDEO,
            "shortvideo": MessageType.VIDEO,
            "location": MessageType.LOCATION,
            "link": MessageType.DOCUMENT,
        }
        return type_mapping.get(msg_type, MessageType.UNKNOWN)

    async def handle_message(self, message: PlatformMessage) -> None:
        """
        处理收到的消息（实现抽象方法）。

        WeChat 适配器主要通过 Webhook 接收消息，
        此方法用于兼容平台管理器调用。
        """
        await self._dispatch_message(message)

    def get_status(self) -> Dict[str, Any]:
        """获取适配器状态"""
        status = super().get_status()
        status.update({
            "clawbot_url": self.clawbot_url,
        })
        return status
