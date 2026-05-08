"""Telegram Platform Adapter

使用 aiogram 3.x 实现的 Telegram 平台适配器。
"""
import asyncio
import logging
from typing import Optional, Dict, Any

from aiogram import Bot, Dispatcher, Router, F
from aiogram.filters import Command, CommandStart
from aiogram.types import Message, Update, CallbackQuery
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties

from ..base import PlatformAdapter, PlatformMessage, MessageType
from ..registry import register_platform

logger = logging.getLogger(__name__)


@register_platform(
    name="telegram",
    config_key="platforms.telegram",
    description="Telegram 平台",
)
class TelegramAdapter(PlatformAdapter):
    """
    Telegram 平台适配器。

    支持功能:
    - 文本消息收发
    - 命令处理 (/start, /help, /status)
    - 回复消息
    - 用户白名单
    - Long Polling / Webhook 模式
    """

    def __init__(self, config: Dict[str, Any]):
        """
        初始化 Telegram 适配器。

        Args:
            config: 平台配置，包含:
                - bot_token: Telegram Bot Token (必填)
                - allowed_users: 允许的用户 ID 列表 (可选)
                - use_webhook: 是否使用 Webhook 模式 (默认 False)
                - webhook_url: Webhook URL (use_webhook=True 时必填)
                - secret_token: Telegram Secret Token (Webhook 模式可选)
        """
        super().__init__(config)

        self.bot_token = config.get("bot_token", "")
        self.allowed_users = config.get("allowed_users", [])
        self.use_webhook = config.get("use_webhook", False)
        self.webhook_url = config.get("webhook_url", "")
        self.secret_token = config.get("secret_token", "")

        # 验证必填配置
        if not self.bot_token:
            logger.warning("Telegram bot_token 未配置，适配器将无法连接")

        # aiogram 组件
        self.bot: Optional[Bot] = None
        self.dp: Optional[Dispatcher] = None
        self.router = Router()
        self._polling_task: Optional[asyncio.Task] = None

    @property
    def platform_name(self) -> str:
        return "telegram"

    async def start(self) -> None:
        """启动 Telegram Bot"""
        if not self.bot_token:
            raise RuntimeError("Telegram bot_token 未配置")

        logger.info("启动 Telegram Bot...")

        # 创建 Bot 实例
        self.bot = Bot(
            token=self.bot_token,
            default=DefaultBotProperties(parse_mode=ParseMode.HTML),
        )

        # 创建 Dispatcher
        self.dp = Dispatcher()
        self.dp.include_router(self.router)

        # 设置消息处理器
        self._setup_handlers()

        if self.use_webhook:
            # Webhook 模式
            await self._start_webhook()
        else:
            # Long Polling 模式
            await self._start_polling()

        self._connected = True
        logger.info("Telegram Bot 启动成功")

    async def _start_polling(self) -> None:
        """启动 Long Polling"""
        logger.info("使用 Long Polling 模式")
        self.dp["bot"] = self.bot

    async def _start_webhook(self) -> None:
        """启动 Webhook 模式"""
        if not self.webhook_url:
            raise RuntimeError("Webhook 模式下必须配置 webhook_url")

        logger.info(f"使用 Webhook 模式，URL: {self.webhook_url}")
        await self.bot.set_webhook(
            url=self.webhook_url,
            secret_token=self.secret_token,
        )

    async def stop(self) -> None:
        """停止 Telegram Bot"""
        logger.info("停止 Telegram Bot...")

        # 停止 Long Polling 任务
        if self._polling_task:
            self._polling_task.cancel()
            try:
                await self._polling_task
            except asyncio.CancelledError:
                pass
            self._polling_task = None

        # 清理 Webhook
        if self.use_webhook and self.bot:
            try:
                await self.bot.delete_webhook()
            except Exception as e:
                logger.warning(f"删除 Webhook 失败: {e}")

        # 关闭 Bot 会话
        if self.bot:
            await self.bot.session.close()
            self.bot = None

        self.dp = None
        self._connected = False
        logger.info("Telegram Bot 已停止")

    async def process_update(self, update: Dict[str, Any]) -> None:
        """
        处理 Webhook 更新。

        当使用 Webhook 模式时，由 API Server 调用此方法。

        Args:
            update: Telegram 传来的更新数据
        """
        if not self.dp:
            logger.error("Dispatcher 未初始化")
            return

        telegram_update = Update.model_validate(update)
        await self.dp.feed_update(self.bot, telegram_update)

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

        Returns:
            发送是否成功
        """
        if not self.bot:
            logger.error("Bot 未初始化")
            return False

        try:
            await self.bot.send_message(
                chat_id=int(chat_id),
                text=content,
                reply_to_message_id=int(reply_to_message_id) if reply_to_message_id else None,
            )
            return True
        except Exception as e:
            logger.error(f"发送消息失败: {e}")
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
            user_id: 用户 ID
            content: 消息内容

        Returns:
            发送是否成功
        """
        return await self.send_message(chat_id=user_id, content=content, **kwargs)

    def _setup_handlers(self) -> None:
        """设置消息处理器"""
        # 命令处理器
        self.router.message.register(self._handle_start, CommandStart())
        self.router.message.register(self._handle_help, Command("help"))
        self.router.message.register(self._handle_status, Command("status"))

        # 回调查询处理器
        self.router.callback_query.register(self._handle_callback)

        # 普通消息处理器
        self.router.message.register(self._handle_text, F.text)

    def _is_user_allowed(self, user_id: int) -> bool:
        """检查用户是否在白名单中"""
        if not self.allowed_users:
            return True  # 没有白名单则允许所有人
        return str(user_id) in [str(uid) for uid in self.allowed_users]

    async def _handle_start(self, message: Message) -> None:
        """处理 /start 命令"""
        welcome_text = (
            "👋 你好！我是 AKIHO！\n\n"
            "很高兴认识你！有什么想聊的吗？"
        )
        await message.answer(welcome_text)

    async def _handle_help(self, message: Message) -> None:
        """处理 /help 命令"""
        help_text = (
            "📖 AKIHO 帮助\n\n"
            "可用命令：\n"
            "/start - 开始对话\n"
            "/help - 显示帮助\n"
            "/status - 查看状态\n\n"
            "你也可以直接发送消息与我聊天~"
        )
        await message.answer(help_text)

    async def _handle_status(self, message: Message) -> None:
        """处理 /status 命令"""
        status = self.get_status()
        status_text = (
            f"📊 状态信息\n\n"
            f"平台: Telegram\n"
            f"状态: {status.get('status', 'unknown')}\n"
            f"连接: {'✅ 已连接' if status.get('connected') else '❌ 未连接'}"
        )
        await message.answer(status_text)

    async def _handle_callback(self, callback: CallbackQuery) -> None:
        """处理回调查询"""
        await callback.answer()
        await callback.message.answer(f"收到回调: {callback.data}")

    async def _handle_text(self, message: Message) -> None:
        """处理文本消息"""
        user_id = message.from_user.id

        # 检查白名单
        if not self._is_user_allowed(user_id):
            logger.warning(f"用户 {user_id} 不在白名单中")
            await message.answer("抱歉，你没有权限与我对话。")
            return

        # 构建统一消息格式
        platform_msg = PlatformMessage(
            platform="telegram",
            user_id=str(user_id),
            chat_id=str(message.chat.id),
            message_id=str(message.message_id),
            content=message.text or "",
            message_type=MessageType.TEXT,
            metadata={
                "username": message.from_user.username,
                "first_name": message.from_user.first_name,
                "last_name": message.from_user.last_name,
                "chat_type": message.chat.type,
            }
        )

        # 分发消息
        await self._dispatch_message(platform_msg)

    async def handle_message(self, message: PlatformMessage) -> None:
        """
        处理收到的消息（实现抽象方法）。

        Telegram 适配器主要通过 _handle_text 接收消息，
        此方法用于兼容平台管理器调用。
        """
        await self._dispatch_message(message)

    def get_status(self) -> Dict[str, Any]:
        """获取适配器状态"""
        status = super().get_status()
        status.update({
            "mode": "webhook" if self.use_webhook else "polling",
            "allowed_users_count": len(self.allowed_users),
        })
        return status
