"""
API 生成器 - 使用云服务（DeepSeek、硅基流动等）

支持多种云端 LLM API
"""

import os
import httpx
from typing import Optional, Literal
from .base import BaseGenerator, GenerationContext, GenerationResult, GeneratorType


class APIGenerator(BaseGenerator):
    """API 生成器 - 调用云端 LLM 服务"""

    name = "api"
    type = GeneratorType.API

    # 支持的提供商配置
    PROVIDERS = {
        "deepseek": {
            "base_url": "https://api.deepseek.com",
            "model": "deepseek-chat",
            "env_key": "DEEPSEEK_API_KEY",
        },
        "siliconflow": {
            "base_url": "https://api.siliconflow.cn/v1",
            "model": "Qwen/Qwen2.5-14B-Instruct",
            "env_key": "SILICONFLOW_API_KEY",
        },
        "openai": {
            "base_url": "https://api.openai.com/v1",
            "model": "gpt-4o-mini",
            "env_key": "OPENAI_API_KEY",
        },
        "anthropic": {
            "base_url": "https://api.anthropic.com/v1",
            "model": "claude-3-haiku",
            "env_key": "ANTHROPIC_API_KEY",
        },
    }

    def __init__(
        self,
        provider: str = "deepseek",
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout: float = 60.0,
        **kwargs,
    ):
        """
        初始化 API 生成器

        Args:
            provider: 提供商名称 (deepseek/siliconflow/openai/anthropic)
            api_key: API 密钥（如果为 None，从环境变量读取）
            base_url: 自定义 API 地址
            model: 模型名称
            timeout: 请求超时时间
        """
        self.provider = provider.lower()
        provider_config = self.PROVIDERS.get(self.provider, self.PROVIDERS["deepseek"])

        self.base_url = base_url or provider_config["base_url"]
        self.model = model or provider_config["model"]

        # 获取 API Key
        if api_key:
            self.api_key = api_key
        else:
            self.api_key = os.getenv(provider_config["env_key"], "")

        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """获取或创建 HTTP 客户端"""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self.timeout)
        return self._client

    def _build_messages(self, context: GenerationContext) -> list[dict]:
        """构建消息列表"""
        messages = []

        # 系统消息
        system_prompt = self._build_system_prompt(context)
        messages.append({"role": "system", "content": system_prompt})

        # 对话历史
        for msg in context.recent_messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ("user", "assistant"):
                messages.append({"role": role, "content": content})

        # 当前用户消息
        messages.append({"role": "user", "content": context.user_message})

        return messages

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

    async def _call_api(self, messages: list[dict]) -> str:
        """调用 API"""
        client = await self._get_client()

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        # DeepSeek 格式
        if self.provider == "deepseek":
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": 0.8,
                "max_tokens": 200,
            }
            url = f"{self.base_url}/chat/completions"
        # OpenAI 兼容格式
        else:
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": 0.8,
                "max_tokens": 200,
            }
            url = f"{self.base_url}/chat/completions"

        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

            # 解析响应
            if "choices" in data and len(data["choices"]) > 0:
                return data["choices"][0]["message"]["content"].strip()
            elif "content" in data:
                return data["content"].strip()

            raise ValueError("Invalid API response format")

        except httpx.TimeoutException:
            raise TimeoutError(f"API 请求超时（{self.timeout}s）")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise PermissionError("API Key 无效")
            elif e.response.status_code == 429:
                raise RuntimeError("API 请求过于频繁，请稍后再试")
            else:
                raise ConnectionError(f"API 连接失败: {e.response.status_code}")
        except Exception as e:
            raise RuntimeError(f"API 调用失败: {str(e)}")

    async def generate_async(self, context: GenerationContext) -> GenerationResult:
        """异步生成回复"""
        try:
            messages = self._build_messages(context)
            response = await self._call_api(messages)

            return GenerationResult(
                text=response,
                generator_type=self.type,
                response_time_ms=0,
                success=True,
                extra={
                    "provider": self.provider,
                    "model": self.model,
                },
            )
        except Exception as e:
            return GenerationResult.error_result(self.type, str(e))

    def generate(self, context: GenerationContext) -> GenerationResult:
        """同步生成"""
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
        """检查 API Key 和连接是否可用"""
        if not self.api_key:
            return False
        try:
            import httpx
            response = httpx.get(
                f"{self.base_url}/models",
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=5.0,
            )
            return response.status_code == 200
        except Exception:
            return False

    @property
    def is_configured(self) -> bool:
        """检查 API 是否已配置（不实际检查网络）"""
        return bool(self.api_key)

    @property
    def description(self) -> str:
        return f"API ({self.provider}/{self.model})"

    async def close(self):
        """关闭客户端"""
        if self._client:
            await self._client.aclose()
            self._client = None
