"""持久化模块单元测试"""
import pytest
from engine.persistence import MemoryStateStore


class TestMemoryStateStore:
    @pytest.mark.asyncio
    async def test_save_and_load(self, memory_store):
        await memory_store.save_state("test_key", {"value": 42})
        state = await memory_store.load_state("test_key")
        assert state == {"value": 42}

    @pytest.mark.asyncio
    async def test_load_nonexistent(self, memory_store):
        state = await memory_store.load_state("nonexistent")
        assert state is None

    @pytest.mark.asyncio
    async def test_delete(self, memory_store):
        await memory_store.save_state("test_key", {"value": 42})
        result = await memory_store.delete_state("test_key")
        assert result is True
        assert await memory_store.load_state("test_key") is None

    @pytest.mark.asyncio
    async def test_delete_nonexistent(self, memory_store):
        result = await memory_store.delete_state("nonexistent")
        assert result is False

    @pytest.mark.asyncio
    async def test_exists(self, memory_store):
        await memory_store.save_state("test_key", {"value": 42})
        assert await memory_store.exists("test_key") is True
        assert await memory_store.exists("nonexistent") is False

    @pytest.mark.asyncio
    async def test_ttl_expiry(self, memory_store):
        await memory_store.save_state("test_key", {"value": 42}, ttl=-1)
        state = await memory_store.load_state("test_key")
        assert state is None

    @pytest.mark.asyncio
    async def test_ttl_not_expired(self, memory_store):
        await memory_store.save_state("test_key", {"value": 42}, ttl=3600)
        state = await memory_store.load_state("test_key")
        assert state == {"value": 42}

    @pytest.mark.asyncio
    async def test_overwrite(self, memory_store):
        await memory_store.save_state("test_key", {"value": 1})
        await memory_store.save_state("test_key", {"value": 2})
        state = await memory_store.load_state("test_key")
        assert state == {"value": 2}

    @pytest.mark.asyncio
    async def test_complex_state(self, memory_store):
        complex_state = {
            "string": "hello",
            "number": 42,
            "list": [1, 2, 3],
            "nested": {"a": {"b": "c"}},
            "bool": True,
            "null": None,
        }
        await memory_store.save_state("complex", complex_state)
        loaded = await memory_store.load_state("complex")
        assert loaded == complex_state
