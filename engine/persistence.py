"""
持久化层接口

为 PostgreSQL + Redis 持久化做准备。
Phase 1.2 仅提供接口定义，具体实现 (PostgresStateStore, RedisStateStore)
在 Phase 1.2 P2 完成后接入。
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
import json
import asyncio


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
