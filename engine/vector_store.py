"""
向量存储模块 - ChromaDB 封装

提供记忆的向量存储和语义检索功能
"""
import chromadb
from chromadb.config import Settings
from typing import List, Dict, Any, Optional
import os


class VectorStore:
    """
    ChromaDB 向量存储

    功能:
    - 持久化存储向量
    - 语义相似度搜索
    - 按元数据过滤
    """

    def __init__(
        self,
        persist_directory: str = "./data/chroma",
        collection_name: str = "memories"
    ):
        # 确保目录存在
        os.makedirs(persist_directory, exist_ok=True)

        # 初始化持久化客户端
        self.client = chromadb.PersistentClient(path=persist_directory)

        # 获取或创建集合
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={
                "hnsw:space": "cosine",  # 余弦距离
                "hnsw:construction_ef": 100,
                "hnsw:search_ef": 100
            }
        )

    def add_memory(
        self,
        memory_id: str,
        content: str,
        embedding: List[float],
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        添加记忆到向量库

        Args:
            memory_id: 记忆唯一 ID
            content: 记忆文本内容
            embedding: 向量
            metadata: 元数据
        """
        self.collection.add(
            ids=[memory_id],
            embeddings=[embedding],
            documents=[content],
            metadatas=[metadata or {}]
        )

    def add_memories(
        self,
        memories: List[Dict[str, Any]]
    ) -> None:
        """
        批量添加记忆

        Args:
            memories: 记忆列表，每项包含:
                - id: 记忆 ID
                - content: 内容
                - embedding: 向量
                - metadata: 元数据
        """
        if not memories:
            return

        self.collection.add(
            ids=[m["id"] for m in memories],
            embeddings=[m["embedding"] for m in memories],
            documents=[m["content"] for m in memories],
            metadatas=[m.get("metadata", {}) for m in memories]
        )

    def search(
        self,
        query_embedding: List[float],
        n_results: int = 5,
        filter_dict: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        向量相似度搜索

        Args:
            query_embedding: 查询向量
            n_results: 返回数量
            filter_dict: 元数据过滤条件

        Returns:
            匹配的记录列表，按相似度降序
        """
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=filter_dict,
            include=["documents", "metadatas", "distances"]
        )

        return self._format_results(results)

    def get(self, memory_id: str) -> Optional[Dict[str, Any]]:
        """
        获取单个记忆

        Args:
            memory_id: 记忆 ID

        Returns:
            记忆内容，不存在返回 None
        """
        results = self.collection.get(
            ids=[memory_id],
            include=["documents", "metadatas"]
        )

        if results["ids"]:
            return {
                "id": results["ids"][0],
                "content": results["documents"][0],
                "metadata": results["metadatas"][0] if results["metadatas"] else {}
            }
        return None

    def get_by_metadata(
        self,
        filter_dict: Dict[str, Any],
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        按元数据查询记忆

        Args:
            filter_dict: 元数据过滤条件
            limit: 返回数量限制

        Returns:
            记忆列表
        """
        results = self.collection.get(
            where=filter_dict,
            limit=limit,
            include=["documents", "metadatas"]
        )

        memories = []
        for i, id_ in enumerate(results["ids"]):
            memories.append({
                "id": id_,
                "content": results["documents"][i] if i < len(results["documents"]) else "",
                "metadata": results["metadatas"][i] if i < len(results["metadatas"]) and results["metadatas"] else {}
            })
        return memories

    def update_memory(
        self,
        memory_id: str,
        content: Optional[str] = None,
        embedding: Optional[List[float]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        更新记忆

        Args:
            memory_id: 记忆 ID
            content: 新内容
            embedding: 新向量
            metadata: 新元数据
        """
        update_kwargs = {"ids": [memory_id]}

        if content is not None:
            update_kwargs["documents"] = [content]
        if embedding is not None:
            update_kwargs["embeddings"] = [embedding]
        if metadata is not None:
            update_kwargs["metadatas"] = [metadata]

        if len(update_kwargs) > 1:
            self.collection.update(**update_kwargs)

    def delete(self, memory_id: str) -> None:
        """
        删除记忆

        Args:
            memory_id: 记忆 ID
        """
        self.collection.delete(ids=[memory_id])

    def delete_by_filter(self, filter_dict: Dict[str, Any]) -> None:
        """
        按条件删除记忆

        Args:
            filter_dict: 元数据过滤条件
        """
        self.collection.delete(where=filter_dict)

    def count(self) -> int:
        """获取记忆总数"""
        return self.collection.count()

    def clear(self) -> None:
        """清空所有记忆（谨慎使用）"""
        self.collection.delete(where={})

    def _format_results(self, results: dict) -> List[Dict[str, Any]]:
        """格式化搜索结果"""
        formatted = []

        if not results["ids"] or not results["ids"][0]:
            return formatted

        for i, (id_, doc, meta, dist) in enumerate(zip(
            results["ids"][0],
            results["documents"][0] if results["documents"] else [],
            results["metadatas"][0] if results["metadatas"] and results["metadatas"][0] else [],
            results["distances"][0] if results["distances"] else []
        )):
            # 将距离转换为相似度（余弦距离：0=相同，2=相反）
            similarity = 1 - (dist / 2) if dist is not None else 0.0

            formatted.append({
                "id": id_,
                "content": doc,
                "metadata": meta,
                "distance": dist,
                "similarity": similarity
            })

        return formatted


# 全局单例
_vector_store: Optional[VectorStore] = None


def get_vector_store(
    persist_directory: str = "./data/chroma",
    collection_name: str = "memories"
) -> VectorStore:
    """获取向量存储单例"""
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStore(persist_directory, collection_name)
    return _vector_store
