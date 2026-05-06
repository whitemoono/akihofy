"""记忆模块单元测试"""
import pytest
from datetime import datetime, timedelta
from engine.memory import MemoryManager, Memory


class TestMemory:
    def test_create_memory(self):
        m = Memory(id="test1", content="hello", memory_type="episodic", event_type="conversation", timestamp=datetime.now())
        assert m.id == "test1"
        assert m.content == "hello"
        assert m.retrieval_count == 0
        assert m.consolidation_level == 0

    def test_to_dict(self):
        m = Memory(id="test1", content="hello", memory_type="episodic", event_type="conversation", timestamp=datetime.now(), emotional_tags=["happy"])
        d = m.to_dict()
        assert d["id"] == "test1"
        assert d["content"] == "hello"
        assert "happy" in d["emotional_tags"]


class TestMemoryManager:
    def test_initial_count(self, memory_manager):
        assert memory_manager.get_count() == 0

    @pytest.mark.asyncio
    async def test_store_conversation(self, memory_manager):
        mid = await memory_manager.store_conversation("你好", "user1", emotion="happy")
        assert mid is not None
        assert memory_manager.get_count() == 1

    @pytest.mark.asyncio
    async def test_store_thought(self, memory_manager):
        mid = await memory_manager.store_thought("我在想...", emotion="neutral")
        assert mid is not None
        assert memory_manager.get_count() == 1

    @pytest.mark.asyncio
    async def test_store_semantic(self, memory_manager):
        mid = await memory_manager.store_semantic("Python", "编程语言", "technology")
        assert mid is not None
        mem = memory_manager.get(mid)
        assert mem.memory_type == "semantic"

    @pytest.mark.asyncio
    async def test_store_event(self, memory_manager):
        mid = await memory_manager.store_event("发生了某事", "observation")
        assert mid is not None
        assert memory_manager.get_count() == 1

    @pytest.mark.asyncio
    async def test_get_recent(self, memory_manager):
        await memory_manager.store_conversation("msg1", "user1")
        await memory_manager.store_conversation("msg2", "user1")
        recent = memory_manager.get_recent(hours=24, limit=10)
        assert len(recent) == 2

    @pytest.mark.asyncio
    async def test_get_recent_type_filter(self, memory_manager):
        await memory_manager.store_conversation("msg1", "user1")
        await memory_manager.store_semantic("概念", "定义", "类别")
        recent = memory_manager.get_recent(hours=24, limit=10, memory_type="semantic")
        assert len(recent) == 1
        assert recent[0]["memory_type"] == "semantic"

    @pytest.mark.asyncio
    async def test_get_related(self, memory_manager):
        mid1 = await memory_manager.store_conversation("hello", "user1", emotion="happy")
        mid2 = await memory_manager.store_conversation("world", "user1", emotion="happy")
        related = memory_manager.get_related(mid1, limit=5)
        assert len(related) >= 1

    @pytest.mark.asyncio
    async def test_get_related_nonexistent(self, memory_manager):
        related = memory_manager.get_related("nonexistent")
        assert related == []

    def test_get_nonexistent(self, memory_manager):
        assert memory_manager.get("nonexistent") is None

    @pytest.mark.asyncio
    async def test_retrieval_count_increments(self, memory_manager):
        mid = await memory_manager.store_conversation("test", "user1")
        memory_manager.get(mid)
        mem = memory_manager.get(mid)
        assert mem.retrieval_count >= 2

    def test_working_memory_limit(self, memory_manager):
        for i in range(10):
            memory_manager._update_working_memory(f"mem_{i}")
        assert len(memory_manager.working_memory) <= memory_manager.max_working

    @pytest.mark.asyncio
    async def test_get_working_memory(self, memory_manager):
        mid = await memory_manager.store_conversation("test", "user1")
        wm = memory_manager.get_working_memory()
        assert len(wm) >= 1

    def test_get_stats(self, memory_manager):
        stats = memory_manager.get_stats()
        assert stats["total"] == 0
        assert "by_type" in stats
        assert "by_event" in stats

    @pytest.mark.asyncio
    async def test_keyword_search(self, memory_manager):
        await memory_manager.store_conversation("今天天气真好", "user1")
        await memory_manager.store_conversation("我想学习Python", "user1")
        results = memory_manager._keyword_search("Python", limit=5)
        assert len(results) >= 1
        assert "Python" in results[0]["content"]

    @pytest.mark.asyncio
    async def test_keyword_search_type_filter(self, memory_manager):
        await memory_manager.store_conversation("episodic memory", "user1")
        await memory_manager.store_semantic("semantic", "definition", "cat")
        results = memory_manager._keyword_search("memory", limit=5, memory_type="semantic")
        assert len(results) == 0  # semantic 里没有 "memory" 关键词

    @pytest.mark.asyncio
    async def test_forget(self, memory_manager):
        await memory_manager.store_conversation("test", "user1")
        forgotten = await memory_manager.forget(dry_run=True)
        assert isinstance(forgotten, list)

    @pytest.mark.asyncio
    async def test_consolidate(self, memory_manager):
        mid = await memory_manager.store_conversation("important", "user1")
        mem = memory_manager.get(mid)
        mem.importance = 0.8
        mem.retrieval_count = 5
        await memory_manager.consolidate()
        assert mem.consolidation_level >= 1

    @pytest.mark.asyncio
    async def test_clear(self, memory_manager):
        await memory_manager.store_conversation("test", "user1")
        memory_manager.memories.clear()
        memory_manager.working_memory.clear()
        assert memory_manager.get_count() == 0
        assert len(memory_manager.working_memory) == 0
