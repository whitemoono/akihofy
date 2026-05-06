"""
缓存管理模块
"""
import json
import hashlib
from typing import Optional, Any, Callable
from datetime import datetime, timedelta
from functools import wraps
import asyncio


class SimpleCache:
    """简单内存缓存"""

    def __init__(self, default_ttl: int = 300):
        self.cache = {}
        self.default_ttl = default_ttl

    def get(self, key: str) -> Optional[Any]:
        """获取缓存"""
        if key in self.cache:
            value, expiry = self.cache[key]
            if datetime.now() < expiry:
                return value
            else:
                del self.cache[key]
        return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """设置缓存"""
        ttl = ttl or self.default_ttl
        expiry = datetime.now() + timedelta(seconds=ttl)
        self.cache[key] = (value, expiry)

    def delete(self, key: str):
        """删除缓存"""
        if key in self.cache:
            del self.cache[key]

    def clear(self):
        """清空缓存"""
        self.cache.clear()

    def make_key(self, *args, **kwargs) -> str:
        """生成缓存键"""
        content = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True)
        return hashlib.md5(content.encode()).hexdigest()


class LLMCache:
    """LLM 响应缓存"""

    def __init__(self, cache: SimpleCache):
        self.cache = cache

    def make_key(self, messages: list, model: str) -> str:
        """生成 LLM 请求的缓存键"""
        # 只用消息内容生成 hash
        content = json.dumps({
            "messages": [{"role": m["role"], "content": m["content"]} for m in messages],
            "model": model
        }, sort_keys=True)
        return f"llm:{hashlib.sha256(content.encode()).hexdigest()}"

    def get(self, messages: list, model: str) -> Optional[str]:
        """获取缓存的 LLM 响应"""
        key = self.make_key(messages, model)
        return self.cache.get(key)

    def set(self, messages: list, model: str, response: str, ttl: int = 3600):
        """缓存 LLM 响应"""
        key = self.make_key(messages, model)
        self.cache.set(key, response, ttl)


def cached(ttl: int = 300):
    """缓存装饰器"""
    _cache = SimpleCache(ttl)

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            key = _cache.make_key(args, kwargs)

            # 尝试从缓存获取
            cached_result = _cache.get(key)
            if cached_result is not None:
                return cached_result

            # 执行函数
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)

            # 缓存结果
            _cache.set(key, result, ttl)

            return result

        return wrapper

    return decorator
