"""
本地模型生成器 - 使用 LM Studio 或 Ollama

支持本地运行的 LLM 模型，如 qwen、llama 等
"""

import httpx
from typing import Optional
from .base import BaseGenerator, GenerationContext, GenerationResult, GeneratorType


class LocalGenerator(BaseGenerator):
    """本地模型生成器 - 通过 LM Studio API 调用"""

    name = "local"
    type = GeneratorType.LOCAL

    def __init__(
        self,
        base_url: str = "http://localhost:12332/v1",
        model: str = "qwen3.5-9b-q4",
        api_key: str = "sk-lm-wlNew74X:9bOEyA1aWZt1CX57qdrd",
        timeout: float = 120.0,
        **kwargs,
    ):
        """
        初始化本地模型生成器

        Args:
            base_url: LM Studio 服务地址 (默认 http://localhost:1234/v1)
            model: 模型名称
            timeout: 请求超时时间（秒）
        """
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.api_key = api_key
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """获取或创建 HTTP 客户端"""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
        return self._client

    def _build_system_prompt(self, context: GenerationContext) -> str:
        """构建系统提示词"""
        mood_descriptions = {
            "happy": "开心",
            "sad": "有点低落",
            "angry": "不太高兴",
            "excited": "兴奋",
            "tired": "困困的",
            "shy": "害羞",
            "neutral": "平静",
        }

        mood_desc = mood_descriptions.get(context.current_mood, "平静")

        # 能量描述
        if context.energy > 0.8:
            energy_desc = "精神好"
        elif context.energy > 0.5:
            energy_desc = "还行"
        elif context.energy > 0.2:
            energy_desc = "有点累"
        else:
            energy_desc = "好困"

        # 关系描述
        relation_descriptions = {
            "stranger": "刚认识",
            "acquaintance": "认识不久",
            "friend": "朋友",
            "close": "很好的朋友",
            "intimate": "很亲近的人",
        }
        relation_desc = relation_descriptions.get(context.relationship, "朋友")

        # 记忆
        memories = ""
        if context.relevant_memories:
            memories = "我们之前聊过：\n" + "\n".join(
                f"- {m}" for m in context.relevant_memories[:2]
            )

        prompt = f"""你是{context.character_name}，可以叫我秋穗。

你现在的心情是{mood_desc}，{energy_desc}。
和用户的关系是{relation_desc}。

{memories}

风格要求：
- 像朋友聊天一样自然，别太正式
- 动作描写要随意，比如（笑）、（歪头）、（叹气）就行，别搞那么多细节
- 说话简短点，别一上来就写一大段
- 语气轻松，偶尔可以用语气词
- 可以有点小情绪，但别太戏剧化
- 避免：双手交叠、眼神注视、微微点头、身体微微前倾 这种很书的描写

直接说话，像正常朋友聊天那样回复："""

        return prompt

    async def _call_lmstudio(self, messages: list) -> str:
        """调用 LM Studio API (OpenAI 兼容格式)"""
        client = await self._get_client()

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.8,
            "max_tokens": 1024,
            "stream": False,
        }

        try:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        except httpx.TimeoutException:
            raise TimeoutError(f"LM Studio 请求超时（{self.timeout}s）")
        except httpx.HTTPStatusError as e:
            raise ConnectionError(f"LM Studio 连接失败: {e.response.status_code}")
        except Exception as e:
            raise RuntimeError(f"LM Studio 调用失败: {str(e)}")

    def _build_messages(self, context: GenerationContext) -> list:
        """构建消息列表 (ChatML 格式)"""
        system_prompt = self._build_system_prompt(context)

        messages = [
            {"role": "system", "content": system_prompt}
        ]

        # 添加对话历史
        for msg in context.recent_messages[-5:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "user":
                messages.append({"role": "user", "content": content})
            else:
                messages.append({"role": "assistant", "content": content})

        # 添加当前消息
        messages.append({"role": "user", "content": context.user_message})

        return messages

    async def generate_async(self, context: GenerationContext) -> GenerationResult:
        """异步生成回复"""
        import time
        start_time = time.time()

        try:
            messages = self._build_messages(context)
            response = await self._call_lmstudio(messages)
            elapsed_ms = (time.time() - start_time) * 1000

            return GenerationResult(
                text=response,
                generator_type=self.type,
                response_time_ms=elapsed_ms,
                success=True,
                extra={
                    "model": self.model,
                    "provider": "lmstudio",
                },
            )
        except Exception as e:
            return GenerationResult.error_result(self.type, str(e))

    def generate(self, context: GenerationContext) -> GenerationResult:
        """同步生成（会在新事件循环中运行异步代码）"""
        import asyncio

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(
                        asyncio.run,
                        self.generate_async(context)
                    )
                    return future.result()
            else:
                return asyncio.run(self.generate_async(context))
        except RuntimeError:
            return asyncio.run(self.generate_async(context))

    @property
    def is_available(self) -> bool:
        """检查 LM Studio 是否可用"""
        try:
            import httpx
            # LM Studio 的健康检查端点（带认证）
            base = self.base_url.rsplit('/v1', 1)[0]
            response = httpx.get(
                f"{base}/health",
                timeout=5.0,
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            return response.status_code == 200
        except Exception:
            # 如果健康检查失败，尝试检查模型列表
            try:
                base = self.base_url.rsplit('/v1', 1)[0]
                response = httpx.get(
                    f"{base}/api/v0/models",
                    timeout=5.0,
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                return response.status_code == 200
            except Exception:
                return False

    @property
    def is_configured(self) -> bool:
        """检查 LM Studio 是否已配置（不实际检查网络）"""
        return bool(self.api_key and self.base_url)

    @property
    def description(self) -> str:
        return f"本地模型 ({self.model})"

    async def close(self):
        """关闭客户端"""
        if self._client:
            await self._client.aclose()
            self._client = None
