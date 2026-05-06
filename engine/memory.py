"""
记忆管理模块 - 向量增强版

支持:
- 情景记忆 (Episodic Memory)
- 语义记忆 (Semantic Memory)
- 工作记忆 (Working Memory)
- 向量语义检索
- 记忆巩固与遗忘
"""
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import uuid
import asyncio

from .vector_store import VectorStore, get_vector_store
from .embedding_service import EmbeddingService, get_embedding_service


@dataclass
class Memory:
    """
    记忆单元

    包含情景记忆和语义记忆的共同字段
    """
    id: str
    content: str
    memory_type: str  # episodic, semantic, working
    event_type: str
    timestamp: datetime
    emotional_tags: List[str] = field(default_factory=list)
    participants: List[str] = field(default_factory=list)
    importance: float = 0.5
    retrieval_count: int = 0
    consolidation_level: int = 0  # 0=new, 1=labile, 2=consolidating, 3=stable
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "content": self.content,
            "memory_type": self.memory_type,
            "event_type": self.event_type,
            "timestamp": self.timestamp.isoformat(),
            "emotional_tags": self.emotional_tags,
            "participants": self.participants,
            "importance": self.importance,
            "retrieval_count": self.retrieval_count,
            "consolidation_level": self.consolidation_level,
            "metadata": self.metadata
        }


class MemoryManager:
    """
    记忆管理器 - 支持向量检索

    功能:
    - 记忆存储（同步内存 + 异步向量库）
    - 语义搜索（向量检索）
    - 关键词搜索（回退）
    - 工作记忆管理
    - 记忆巩固与遗忘
    """

    EVENT_TYPES = ["conversation", "activity", "observation", "thought", "emotional", "goal"]
    MEMORY_TYPES = ["episodic", "semantic", "working"]

    def __init__(
        self,
        vector_store: Optional[VectorStore] = None,
        embedding_service: Optional[EmbeddingService] = None
    ):
        """
        初始化记忆管理器

        Args:
            vector_store: 向量存储实例
            embedding_service: 嵌入服务实例
        """
        self.vector_store = vector_store or get_vector_store()
        self.embedding_service = embedding_service or get_embedding_service()

        # 内存存储（快速访问）
        self.memories: Dict[str, Memory] = {}
        self.working_memory: List[str] = []  # 当前关注的记忆 ID
        self.max_working = 7  # Miller's Law

        # 同步锁
        self._sync_lock = asyncio.Lock()

    async def store_conversation(
        self,
        content: str,
        user_id: str,
        emotion: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        存储对话记忆

        Args:
            content: 对话内容
            user_id: 用户 ID
            emotion: 情感标签
            metadata: 额外元数据

        Returns:
            记忆 ID
        """
        memory = Memory(
            id=str(uuid.uuid4()),
            content=content,
            memory_type="episodic",
            event_type="conversation",
            timestamp=datetime.now(),
            participants=[user_id],
            metadata=metadata or {}
        )

        if emotion:
            memory.emotional_tags.append(emotion)

        # 保存到内存
        self.memories[memory.id] = memory
        self._update_working_memory(memory.id)

        # 异步保存到向量库
        asyncio.create_task(self._sync_to_vector(memory))

        return memory.id

    async def store_thought(
        self,
        content: str,
        emotion: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        存储思考记忆

        Args:
            content: 思考内容
            emotion: 情感标签
            metadata: 额外元数据

        Returns:
            记忆 ID
        """
        memory = Memory(
            id=str(uuid.uuid4()),
            content=content,
            memory_type="episodic",
            event_type="thought",
            timestamp=datetime.now(),
            metadata=metadata or {}
        )

        if emotion:
            memory.emotional_tags.append(emotion)

        self.memories[memory.id] = memory

        # 异步保存到向量库
        asyncio.create_task(self._sync_to_vector(memory))

        return memory.id

    async def store_semantic(
        self,
        concept: str,
        definition: str,
        category: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        存储语义记忆（概念、事实）

        Args:
            concept: 概念名称
            definition: 定义/描述
            category: 类别
            metadata: 额外元数据

        Returns:
            记忆 ID
        """
        content = f"{concept}: {definition}"

        memory = Memory(
            id=str(uuid.uuid4()),
            content=content,
            memory_type="semantic",
            event_type="observation",
            timestamp=datetime.now(),
            metadata={
                "concept": concept,
                "category": category,
                **(metadata or {})
            }
        )

        self.memories[memory.id] = memory

        # 异步保存到向量库
        asyncio.create_task(self._sync_to_vector(memory))

        return memory.id

    async def store_event(
        self,
        content: str,
        event_type: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        存储事件记忆

        Args:
            content: 事件内容
            event_type: 事件类型
            metadata: 额外元数据

        Returns:
            记忆 ID
        """
        memory = Memory(
            id=str(uuid.uuid4()),
            content=content,
            memory_type="episodic",
            event_type=event_type,
            timestamp=datetime.now(),
            metadata=metadata or {}
        )

        self.memories[memory.id] = memory

        # 异步保存到向量库
        asyncio.create_task(self._sync_to_vector(memory))

        return memory.id

    async def search(
        self,
        query: str,
        limit: int = 5,
        memory_type: Optional[str] = None,
        time_range: Optional[tuple] = None
    ) -> List[Dict[str, Any]]:
        """
        语义搜索记忆

        使用向量检索，fallback 到关键词匹配

        Args:
            query: 查询文本
            limit: 返回数量
            memory_type: 记忆类型过滤
            time_range: 时间范围 (start, end)

        Returns:
            匹配的记忆列表
        """
        # 构建过滤条件
        filter_dict = {}
        if memory_type:
            filter_dict["memory_type"] = memory_type

        try:
            # 生成查询向量
            query_embedding = await self.embedding_service.encode_single(query)

            # 向量检索
            vector_results = self.vector_store.search(
                query_embedding=query_embedding,
                n_results=limit * 2,  # 多取一些，过滤后可能不够
                filter_dict=filter_dict if filter_dict else None
            )

            # 合并内存数据
            results = []
            seen_ids = set()

            for vr in vector_results:
                memory_id = vr["id"]

                # 时间范围过滤
                if time_range:
                    memory = self.memories.get(memory_id)
                    if memory:
                        start, end = time_range
                        if not (start <= memory.timestamp <= end):
                            continue

                memory = self.memories.get(memory_id)
                if memory and memory_id not in seen_ids:
                    seen_ids.add(memory_id)
                    memory.retrieval_count += 1

                    results.append({
                        "id": memory.id,
                        "content": memory.content,
                        "timestamp": memory.timestamp.isoformat(),
                        "event_type": memory.event_type,
                        "memory_type": memory.memory_type,
                        "emotional_tags": memory.emotional_tags,
                        "similarity": vr["similarity"],
                        "importance": memory.importance,
                        "retrieval_count": memory.retrieval_count
                    })

                    if len(results) >= limit:
                        break

            return results

        except Exception as e:
            # 向量检索失败，fallback 到关键词
            return self._keyword_search(query, limit, memory_type)

    def _keyword_search(
        self,
        query: str,
        limit: int = 5,
        memory_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """关键词搜索（fallback）"""
        query_lower = query.lower()
        results = []

        for memory in self.memories.values():
            # 类型过滤
            if memory_type and memory.memory_type != memory_type:
                continue

            # 关键词匹配
            if query_lower in memory.content.lower():
                memory.retrieval_count += 1

                # 计算相关性分数
                relevance = self._calculate_relevance(memory, query)

                results.append({
                    "id": memory.id,
                    "content": memory.content,
                    "timestamp": memory.timestamp.isoformat(),
                    "event_type": memory.event_type,
                    "memory_type": memory.memory_type,
                    "similarity": relevance,
                    "importance": memory.importance,
                    "retrieval_count": memory.retrieval_count
                })

        # 按相关性排序
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:limit]

    def get_recent(
        self,
        hours: int = 24,
        limit: int = 10,
        memory_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        获取最近的记忆

        Args:
            hours: 最近多少小时
            limit: 返回数量
            memory_type: 记忆类型过滤

        Returns:
            最近的记忆列表
        """
        cutoff = datetime.now() - timedelta(hours=hours)
        recent = []

        for memory in self.memories.values():
            if memory.timestamp >= cutoff:
                if memory_type and memory.memory_type != memory_type:
                    continue

                recent.append({
                    "id": memory.id,
                    "content": memory.content,
                    "timestamp": memory.timestamp.isoformat(),
                    "event_type": memory.event_type,
                    "memory_type": memory.memory_type,
                    "emotional_tags": memory.emotional_tags,
                    "importance": memory.importance
                })

        # 按时间排序
        recent.sort(key=lambda x: x["timestamp"], reverse=True)
        return recent[:limit]

    def get_related(
        self,
        memory_id: str,
        limit: int = 3
    ) -> List[Dict[str, Any]]:
        """
        获取相关记忆（基于标签和参与者）

        Args:
            memory_id: 源记忆 ID
            limit: 返回数量

        Returns:
            相关记忆列表
        """
        if memory_id not in self.memories:
            return []

        source = self.memories[memory_id]
        related = []

        for memory in self.memories.values():
            if memory.id == memory_id:
                continue

            # 计算共享标签和参与者
            shared_tags = set(source.emotional_tags) & set(memory.emotional_tags)
            shared_participants = set(source.participants) & set(memory.participants)

            if shared_tags or shared_participants:
                related.append({
                    "id": memory.id,
                    "content": memory.content,
                    "timestamp": memory.timestamp.isoformat(),
                    "shared_tags": list(shared_tags),
                    "shared_participants": list(shared_participants),
                    "similarity": len(shared_tags) * 0.3 + len(shared_participants) * 0.5
                })

        # 按相似度排序
        related.sort(key=lambda x: x["similarity"], reverse=True)
        return related[:limit]

    def get(self, memory_id: str) -> Optional[Memory]:
        """获取单个记忆"""
        memory = self.memories.get(memory_id)
        if memory:
            memory.retrieval_count += 1
        return memory

    def get_working_memory(self) -> List[Dict[str, Any]]:
        """获取工作记忆"""
        result = []
        for memory_id in reversed(self.working_memory):
            memory = self.memories.get(memory_id)
            if memory:
                result.append({
                    "id": memory.id,
                    "content": memory.content[:100],
                    "timestamp": memory.timestamp.isoformat()
                })
        return result

    def get_count(self) -> int:
        """获取记忆总数"""
        return len(self.memories)

    def get_stats(self) -> Dict[str, Any]:
        """获取记忆统计"""
        by_type = {}
        by_event = {}

        for memory in self.memories.values():
            by_type[memory.memory_type] = by_type.get(memory.memory_type, 0) + 1
            by_event[memory.event_type] = by_event.get(memory.event_type, 0) + 1

        return {
            "total": len(self.memories),
            "by_type": by_type,
            "by_event": by_event,
            "vector_count": self.vector_store.count(),
            "working_memory_size": len(self.working_memory)
        }

    def _calculate_relevance(self, memory: Memory, query: str) -> float:
        """计算相关性分数（用于关键词搜索）"""
        score = 0.0
        query_lower = query.lower()

        # 内容匹配
        if query_lower in memory.content.lower():
            score += 0.5

        # 标签匹配
        for tag in memory.emotional_tags:
            if query_lower in tag.lower():
                score += 0.2

        # 检索次数加成
        score += min(memory.retrieval_count * 0.05, 0.3)

        # 时间衰减
        hours_old = (datetime.now() - memory.timestamp).total_seconds() / 3600
        time_factor = max(0.1, 1.0 - hours_old / (24 * 7))
        score *= time_factor

        return min(score, 1.0)

    def _update_working_memory(self, memory_id: str) -> None:
        """更新工作记忆"""
        if memory_id in self.working_memory:
            self.working_memory.remove(memory_id)

        self.working_memory.append(memory_id)

        if len(self.working_memory) > self.max_working:
            self.working_memory.pop(0)

    async def _sync_to_vector(self, memory: Memory) -> None:
        """同步记忆到向量库"""
        async with self._sync_lock:
            try:
                embedding = await self.embedding_service.encode_single(memory.content)

                self.vector_store.add_memory(
                    memory_id=memory.id,
                    content=memory.content,
                    embedding=embedding,
                    metadata={
                        "memory_type": memory.memory_type,
                        "event_type": memory.event_type,
                        "timestamp": memory.timestamp.isoformat(),
                        "participants": ",".join(memory.participants),
                        "emotional_tags": ",".join(memory.emotional_tags),
                        "importance": str(memory.importance)
                    }
                )
            except Exception as e:
                # 向量同步失败不影响主流程
                import loguru
                loguru.logger.warning(f"Failed to sync memory {memory.id} to vector: {e}")

    async def consolidate(self) -> None:
        """
        记忆巩固 — 强化重要记忆，清理不重要记忆
        """
        now = datetime.now()
        to_strengthen = []
        to_delete = []

        for memory in self.memories.values():
            # 巩固条件检查
            hours_old = (now - memory.timestamp).total_seconds() / 3600

            # 重要记忆强化
            if memory.importance > 0.6 and memory.retrieval_count > 0:
                memory.importance = min(1.0, memory.importance + 0.05)
                memory.consolidation_level = min(3, memory.consolidation_level + 1)

            # 计算保留分数
            retention_score = (
                memory.importance * 0.5 +
                min(memory.retrieval_count, 10) * 0.04 +
                max(0, 1.0 - hours_old / (24 * 30)) * 0.35
            )

            # 低于阈值且是新记忆则删除
            if retention_score < 0.15 and memory.consolidation_level < 2:
                to_delete.append(memory.id)

        # 删除低价值记忆
        for memory_id in to_delete:
            del self.memories[memory_id]
            self.vector_store.delete(memory_id)

    async def forget(self, dry_run: bool = False) -> List[str]:
        """
        遗忘 — 移除不重要的旧记忆

        Args:
            dry_run: 是否只返回不返回实际删除

        Returns:
            被遗忘的记忆 ID 列表
        """
        now = datetime.now()
        to_delete = []

        for memory in self.memories.values():
            hours_old = (now - memory.timestamp).total_seconds() / 3600

            retention_score = (
                memory.importance * 0.5 +
                min(memory.retrieval_count, 10) * 0.04 +
                max(0, 1.0 - hours_old / (24 * 30)) * 0.35
            )

            if retention_score < 0.15:
                to_delete.append(memory.id)

        if not dry_run:
            for memory_id in to_delete:
                if memory_id in self.working_memory:
                    self.working_memory.remove(memory_id)
                del self.memories[memory_id]
                self.vector_store.delete(memory_id)

        return to_delete

    def clear(self) -> None:
        """清空所有记忆"""
        self.memories.clear()
        self.working_memory.clear()
        self.vector_store.clear()


# 全局单例
_memory_manager: Optional[MemoryManager] = None


def get_memory_manager() -> MemoryManager:
    """获取记忆管理器单例"""
    global _memory_manager
    if _memory_manager is None:
        _memory_manager = MemoryManager()
    return _memory_manager
