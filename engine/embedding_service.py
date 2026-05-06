"""
嵌入服务 - 支持多 Provider 的文本向量编码
"""
from typing import List, Optional
import os
import httpx
from config import get_settings


class EmbeddingService:
    """
    统一嵌入服务

    支持 providers:
    - siliconflow (BAAI/bge-m3)
    - openai (text-embedding-3-small)
    - deepseek
    - dashscope (阿里云百炼 tongyi-embedding-vision-plus-2026-03-06)
    """

    def __init__(
        self,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        dimension: Optional[int] = None
    ):
        settings = get_settings()
        emb = settings.get_embedding_config()

        self.provider = provider or emb.get("provider", "dashscope")

        # Read API key from environment variable as fallback
        env_key_map = {
            "siliconflow": "SILICONFLOW_API_KEY",
            "openai": "OPENAI_API_KEY",
            "deepseek": "DEEPSEEK_API_KEY",
            "dashscope": "DASHSCOPE_API_KEY",
        }
        env_key = env_key_map.get(self.provider.lower(), "DASHSCOPE_API_KEY")
        self.api_key = os.getenv(env_key) or emb.get("api_key", "")

        self.base_url = emb.get("base_url", "https://dashscope.aliyuncs.com/compatible-mode/v1")
        self.model = model or emb.get("model", "tongyi-embedding-vision-plus-2026-03-06")
        self.dimension = dimension or emb.get("dimension", 1024)

    async def encode(self, texts: List[str]) -> List[List[float]]:
        """
        将文本列表编码为向量列表

        Args:
            texts: 文本列表

        Returns:
            向量列表，每个向量长度为 dimension
        """
        if not texts:
            return []

        provider = self.provider.lower()
        if provider == "siliconflow":
            return await self._encode_siliconflow(texts)
        elif provider == "openai":
            return await self._encode_openai(texts)
        elif provider == "deepseek":
            return await self._encode_deepseek(texts)
        elif provider == "dashscope":
            return await self._encode_dashscope(texts)
        else:
            raise ValueError(f"Unknown provider: {self.provider}")

    async def encode_single(self, text: str) -> List[float]:
        """
        编码单个文本

        Args:
            text: 文本

        Returns:
            向量
        """
        embeddings = await self.encode([text])
        return embeddings[0] if embeddings else []

    async def _encode_siliconflow(self, texts: List[str]) -> List[List[float]]:
        """SiliconFlow API"""
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/embeddings",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "input": texts,
                    "dimensions": self.dimension
                }
            )
            response.raise_for_status()
            data = response.json()
            return [item["embedding"] for item in data["data"]]

    async def _encode_openai(self, texts: List[str]) -> List[List[float]]:
        """OpenAI API"""
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model or "text-embedding-3-small",
                    "input": texts
                }
            )
            response.raise_for_status()
            data = response.json()
            return [item["embedding"] for item in data["data"]]

    async def _encode_deepseek(self, texts: List[str]) -> List[List[float]]:
        """DeepSeek API"""
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/embeddings",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model or "deepseek-embedding",
                    "input": texts
                }
            )
            response.raise_for_status()
            data = response.json()
            return [item["embedding"] for item in data["data"]]

    async def _encode_dashscope(self, texts: List[str]) -> List[List[float]]:
        """
        阿里云百炼 DashScope API
        模型: tongyi-embedding-vision-plus-2026-03-06
        文档: https://help.aliyun.com/zh/dashscope/developer-reference/text-embedding-quick-start
        """
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/embeddings",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "input": {"texts": texts},
                    "dimension": self.dimension
                }
            )
            response.raise_for_status()
            data = response.json()
            # 百炼返回格式: {"output": {"embeddings": [...]}}
            embeddings = data.get("output", {}).get("embeddings", [])
            return [item["embedding"] for item in embeddings]


# 全局单例
_embedding_service: Optional[EmbeddingService] = None


def get_embedding_service() -> EmbeddingService:
    """获取嵌入服务单例"""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
