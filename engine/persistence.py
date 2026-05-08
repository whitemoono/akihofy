"""
持久化层接口

为 PostgreSQL + Redis 持久化做准备。
Phase 1.2 仅提供接口定义，具体实现 (PostgresStateStore, RedisStateStore)
在 Phase 1.2 P2 完成后接入。
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
import json
import asyncio
from datetime import datetime


class StateStore(ABC):
    """状态持久化抽象接口"""

    @abstractmethod
    async def save_state(self, key: str, state: dict, ttl: Optional[int] = None) -> bool:
        """
        保存状态

        Args:
            key: 状态键名
            state: 状态字典
            ttl: 可选，存活时间（秒）

        Returns:
            是否保存成功
        """
        pass

    @abstractmethod
    async def load_state(self, key: str) -> Optional[dict]:
        """
        加载状态

        Args:
            key: 状态键名

        Returns:
            状态字典，不存在则返回 None
        """
        pass

    @abstractmethod
    async def delete_state(self, key: str) -> bool:
        """删除状态"""
        pass

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """检查状态是否存在"""
        pass


class MemoryStateStore(StateStore):
    """内存状态存储 — 仅用于开发/测试"""

    def __init__(self):
        self._store: Dict[str, tuple[dict, Optional[float]]] = {}  # key -> (state, expiry_ts)

    async def save_state(self, key: str, state: dict, ttl: Optional[int] = None) -> bool:
        import time
        expiry = time.time() + ttl if ttl else None
        self._store[key] = (state, expiry)
        return True

    async def load_state(self, key: str) -> Optional[dict]:
        import time
        if key not in self._store:
            return None
        state, expiry = self._store[key]
        if expiry and time.time() > expiry:
            del self._store[key]
            return None
        return state

    async def delete_state(self, key: str) -> bool:
        if key in self._store:
            del self._store[key]
            return True
        return False

    async def exists(self, key: str) -> bool:
        state = await self.load_state(key)
        return state is not None


class PostgresStateStore(StateStore):
    """
    PostgreSQL 持久化实现 — Phase 1.2 P2 完成后接入。

    使用异步驱动 (asyncpg) 避免阻塞事件循环。
    """

    def __init__(self, dsn: str, table: str = "akiho_state"):
        self.dsn = dsn
        self.table = table
        self._pool: Optional[Any] = None

    async def _ensure_pool(self):
        if self._pool is None:
            import asyncpg
            self._pool = await asyncpg.create_pool(self.dsn)

    async def save_state(self, key: str, state: dict, ttl: Optional[int] = None) -> bool:
        await self._ensure_pool()
        async with self._pool.acquire() as conn:
            await conn.execute(
                f"""
                INSERT INTO {self.table} (key, state, expires_at)
                VALUES ($1, $2, NOW() + INTERVAL '1 second' * $3)
                ON CONFLICT (key) DO UPDATE SET
                    state = EXCLUDED.state,
                    expires_at = NOW() + INTERVAL '1 second' * $3,
                    updated_at = NOW()
                """,
                key, json.dumps(state), ttl or 0,
            )
        return True

    async def load_state(self, key: str) -> Optional[dict]:
        await self._ensure_pool()
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"SELECT state FROM {self.table} WHERE key = $1 AND (expires_at IS NULL OR expires_at > NOW())",
                key,
            )
            if row:
                return json.loads(row["state"])
        return None

    async def delete_state(self, key: str) -> bool:
        await self._ensure_pool()
        async with self._pool.acquire() as conn:
            result = await conn.execute(
                f"DELETE FROM {self.table} WHERE key = $1", key
            )
        return "DELETE 1" in result

    async def exists(self, key: str) -> bool:
        await self._ensure_pool()
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                f"SELECT 1 FROM {self.table} WHERE key = $1 AND (expires_at IS NULL OR expires_at > NOW())",
                key,
            )
        return row is not None

    async def close(self):
        if self._pool:
            await self._pool.close()


class RedisStateStore(StateStore):
    """
    Redis 缓存实现 — Phase 1.2 P2 完成后接入。

    使用 aioredis / redis-py (async mode) 避免阻塞。
    """

    def __init__(self, url: str = "redis://localhost:6379/0"):
        self.url = url
        self._client: Optional[Any] = None

    async def _ensure_client(self):
        if self._client is None:
            import redis.asyncio as redis
            self._client = redis.from_url(self.url, decode_responses=True)

    async def save_state(self, key: str, state: dict, ttl: Optional[int] = None) -> bool:
        await self._ensure_client()
        data = json.dumps(state)
        if ttl:
            await self._client.setex(key, ttl, data)
        else:
            await self._client.set(key, data)
        return True

    async def load_state(self, key: str) -> Optional[dict]:
        await self._ensure_client()
        data = await self._client.get(key)
        if data:
            return json.loads(data)
        return None

    async def delete_state(self, key: str) -> bool:
        await self._ensure_client()
        result = await self._client.delete(key)
        return result > 0

    async def exists(self, key: str) -> bool:
        await self._ensure_client()
        return await self._client.exists(key) > 0

    async def close(self):
        if self._client:
            await self._client.close()


# ═══════════════════════════════════════════════════════════════
# 消息持久化
# ═══════════════════════════════════════════════════════════════


class MessageStore:
    """
    消息持久化存储 — 将对话消息保存到 PostgreSQL

    使用与 docker/init.sql 中定义的表结构兼容。
    """

    def __init__(self, dsn: str):
        self.dsn = dsn
        self._pool: Optional[Any] = None

    async def _ensure_pool(self):
        if self._pool is None:
            import asyncpg
            self._pool = await asyncpg.create_pool(self.dsn)

    async def connect(self):
        """初始化连接池"""
        await self._ensure_pool()

    async def close(self):
        """关闭连接池"""
        if self._pool:
            await self._pool.close()
            self._pool = None

    async def save_message(
        self,
        session_id: int,
        role: str,
        content: str,
        emotion_state: Optional[dict] = None,
        platform: str = "web"
    ) -> Optional[int]:
        """
        保存消息到数据库

        Args:
            session_id: 会话 ID
            role: 角色 (user/assistant)
            content: 消息内容
            emotion_state: 情绪状态 (JSON)
            platform: 来源平台 (web/telegram/wechat)

        Returns:
            消息 ID
        """
        await self._ensure_pool()
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO chat_messages (session_id, role, content, emotion_state, platform, created_at)
                VALUES ($1, $2, $3, $4, $5, NOW())
                RETURNING id
                """,
                session_id, role, content,
                json.dumps(emotion_state) if emotion_state else None,
                platform
            )
            if row:
                # 更新会话统计
                await conn.execute(
                    "UPDATE chat_sessions SET message_count = message_count + 1, updated_at = NOW() WHERE id = $1",
                    session_id
                )
                return row["id"]
        return None

    async def get_session_messages(
        self,
        session_id: int,
        limit: int = 100,
        offset: int = 0
    ) -> List[dict]:
        """
        获取会话消息

        Args:
            session_id: 会话 ID
            limit: 返回数量限制
            offset: 偏移量

        Returns:
            消息列表
        """
        await self._ensure_pool()
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, role, content, emotion_state, platform, created_at
                FROM chat_messages
                WHERE session_id = $1
                ORDER BY created_at ASC
                LIMIT $2 OFFSET $3
                """,
                session_id, limit, offset
            )
            return [dict(row) for row in rows]

    async def create_session(
        self,
        user_id: str = "default",
        title: Optional[str] = None
    ) -> int:
        """
        创建新会话

        Args:
            user_id: 用户 ID
            title: 会话标题

        Returns:
            会话 ID
        """
        await self._ensure_pool()
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO chat_sessions (user_id, title, created_at, updated_at, message_count)
                VALUES ($1, $2, NOW(), NOW(), 0)
                RETURNING id
                """,
                user_id, title or f"会话 {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            )
            return row["id"]

    async def get_session(self, session_id: int) -> Optional[dict]:
        """获取会话信息"""
        await self._ensure_pool()
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM chat_sessions WHERE id = $1",
                session_id
            )
            return dict(row) if row else None

    async def get_user_sessions(
        self,
        user_id: str = "default",
        limit: int = 50
    ) -> List[dict]:
        """获取用户的所有会话"""
        await self._ensure_pool()
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, user_id, title, created_at, updated_at, message_count
                FROM chat_sessions
                WHERE user_id = $1
                ORDER BY updated_at DESC
                LIMIT $2
                """,
                user_id, limit
            )
            return [dict(row) for row in rows]

    async def delete_session(self, session_id: int) -> bool:
        """删除会话及其所有消息"""
        await self._ensure_pool()
        async with self._pool.acquire() as conn:
            result = await conn.execute(
                "DELETE FROM chat_sessions WHERE id = $1",
                session_id
            )
            return "DELETE 1" in result

    async def search_messages(
        self,
        user_id: str,
        query: str,
        limit: int = 20
    ) -> List[dict]:
        """搜索消息内容"""
        await self._ensure_pool()
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT m.*, s.title as session_title
                FROM chat_messages m
                JOIN chat_sessions s ON m.session_id = s.id
                WHERE s.user_id = $1 AND m.content ILIKE $2
                ORDER BY m.created_at DESC
                LIMIT $3
                """,
                user_id, f"%{query}%", limit
            )
            return [dict(row) for row in rows]


# ═══════════════════════════════════════════════════════════════
# 工厂函数
# ═══════════════════════════════════════════════════════════════

_message_store: Optional[MessageStore] = None


def get_message_store() -> Optional[MessageStore]:
    """获取消息存储实例"""
    return _message_store


def init_message_store(dsn: str) -> MessageStore:
    """初始化消息存储"""
    global _message_store
    _message_store = MessageStore(dsn)
    return _message_store
