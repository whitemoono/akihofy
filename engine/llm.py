"""
LLM 封装模块

整合多种 LLM 提供商，支持 DeepSeek、OpenAI、Anthropic 等
"""
from typing import Optional, List, Dict, Any, Literal, AsyncIterator
from abc import ABC, abstractmethod
import os
import time
from dataclasses import dataclass, field


@dataclass
class GenerationContext:
    """生成上下文"""
    user_message: str
    character_name: str = "AKIHO"
    current_mood: str = "neutral"
    mood_intensity: float = 0.5
    intimacy: float = 0.5
    trust: float = 0.5
    relationship: str = "stranger"
    energy: float = 0.8
    fatigue: float = 0.2
    recent_messages: List[Dict[str, str]] = field(default_factory=list)
    relevant_memories: List[str] = field(default_factory=list)
    temperature: float = 0.8
    max_length: int = 1024


@dataclass
class GenerationResult:
    """生成结果"""
    text: str
    generator_type: str
    response_time_ms: float
    success: bool = True
    error: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def error_result(cls, generator_type: str, error: str) -> "GenerationResult":
        return cls(
            text="",
            generator_type=generator_type,
            response_time_ms=0,
            success=False,
            error=error,
        )


class LLMProvider(ABC):
    """LLM 提供商基类"""

    @abstractmethod
    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        **kwargs
    ) -> str:
        pass

    @abstractmethod
    async def embed(self, text: str, model: Optional[str] = None) -> List[float]:
        pass


class OpenAIProvider(LLMProvider):
    """OpenAI 提供商"""

    def __init__(self, api_key: Optional[str] = None):
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        **kwargs
    ) -> str:
        response = await self.client.chat.completions.create(
            model=model or "gpt-4-turbo-preview",
            messages=messages,
            **kwargs
        )
        return response.choices[0].message.content

    async def embed(self, text: str, model: Optional[str] = None) -> List[float]:
        response = await self.client.embeddings.create(
            model=model or "text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding


class DeepSeekProvider(LLMProvider):
    """DeepSeek 提供商"""

    PROVIDERS_CONFIG = {
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
    }

    def __init__(
        self,
        provider: str = "deepseek",
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout: float = 60.0,
    ):
        import openai
        import httpx

        self.provider = provider.lower()
        provider_config = self.PROVIDERS_CONFIG.get(self.provider, self.PROVIDERS_CONFIG["deepseek"])

        self.base_url = base_url or provider_config["base_url"]
        self.model = model or provider_config["model"]

        if api_key:
            self.api_key = api_key
        else:
            self.api_key = os.getenv(provider_config["env_key"], "")

        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self):
        import httpx
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self.timeout)
        return self._client

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        **kwargs
    ) -> str:
        import httpx

        client = await self._get_client()
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model or self.model,
            "messages": messages,
            "temperature": kwargs.get("temperature", 0.8),
            "max_tokens": kwargs.get("max_tokens", 1024),
        }

        try:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            data = response.json()

            if "choices" in data and len(data["choices"]) > 0:
                return data["choices"][0]["message"]["content"].strip()

            raise ValueError("Invalid API response format")

        except httpx.TimeoutException:
            raise TimeoutError(f"API request timeout ({self.timeout}s)")
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise PermissionError("Invalid API Key")
            elif e.response.status_code == 429:
                raise RuntimeError("Rate limit exceeded, please retry later")
            else:
                raise ConnectionError(f"API connection failed: {e.response.status_code}")
        except Exception as e:
            raise RuntimeError(f"API call failed: {str(e)}")

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        **kwargs
    ) -> AsyncIterator[str]:
        """流式聊天"""
        import httpx

        client = await self._get_client()
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model or self.model,
            "messages": messages,
            "temperature": kwargs.get("temperature", 0.8),
            "max_tokens": kwargs.get("max_tokens", 1024),
            "stream": True,
        }

        async with client.stream("POST", f"{self.base_url}/chat/completions", json=payload, headers=headers, timeout=self.timeout) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        break
                    try:
                        data = json.loads(data_str)
                        if "choices" in data and len(data["choices"]) > 0:
                            delta = data["choices"][0].get("delta", {})
                            if "content" in delta:
                                yield delta["content"]
                    except json.JSONDecodeError:
                        pass

    async def embed(self, text: str, model: Optional[str] = None) -> List[float]:
        import httpx

        client = await self._get_client()
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model or self.model,
            "input": text,
        }

        response = await client.post(
            f"{self.base_url}/embeddings",
            json=payload,
            headers=headers
        )
        response.raise_for_status()
        data = response.json()

        return data["data"][0]["embedding"]


class AnthropicProvider(LLMProvider):
    """Anthropic (Claude) 提供商"""

    def __init__(self, api_key: Optional[str] = None):
        from anthropic import AsyncAnthropic
        self.client = AsyncAnthropic(api_key=api_key or os.getenv("ANTHROPIC_API_KEY"))

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        **kwargs
    ) -> str:
        response = await self.client.messages.create(
            model=model or "claude-3-haiku-20240307",
            max_tokens=kwargs.get("max_tokens", 1024),
            messages=messages,
            system=kwargs.get("system", "")
        )
        return response.content[0].text

    async def embed(self, text: str, model: Optional[str] = None) -> List[float]:
        raise NotImplementedError("Anthropic does not provide embedding API")


class LLMManager:
    """LLM 管理器"""

    PROVIDERS = {
        "openai": OpenAIProvider,
        "deepseek": DeepSeekProvider,
        "anthropic": AnthropicProvider,
    }

    def __init__(self, default_provider: str = "deepseek"):
        self.default_provider = default_provider
        self._providers: Dict[str, LLMProvider] = {}

    def get_provider(self, name: Optional[str] = None) -> LLMProvider:
        provider_name = name or self.default_provider

        if provider_name not in self._providers:
            provider_class = self.PROVIDERS.get(provider_name)
            if not provider_class:
                raise ValueError(f"Unknown provider: {provider_name}")
            self._providers[provider_name] = provider_class()

        return self._providers[provider_name]

    async def chat(
        self,
        messages: List[Dict[str, str]],
        provider: Optional[str] = None,
        **kwargs
    ) -> str:
        provider = self.get_provider(provider)
        return await provider.chat(messages, **kwargs)

    async def embed(self, text: str, provider: Optional[str] = None) -> List[float]:
        provider = self.get_provider(provider)
        return await provider.embed(text)

    def build_system_prompt(self, context: GenerationContext) -> str:
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

        if context.energy > 0.8:
            energy_desc = "精神好"
        elif context.energy > 0.5:
            energy_desc = "还行"
        elif context.energy > 0.2:
            energy_desc = "有点累"
        else:
            energy_desc = "好困"

        relation_descriptions = {
            "stranger": "刚认识",
            "acquaintance": "认识不久",
            "friend": "朋友",
            "close": "很好的朋友",
            "intimate": "很亲近的人",
        }
        relation_desc = relation_descriptions.get(context.relationship, "朋友")

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

    async def generate(self, context: GenerationContext) -> GenerationResult:
        """生成回复"""
        start_time = time.time()

        try:
            messages = [{"role": "system", "content": self.build_system_prompt(context)}]

            for msg in context.recent_messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role in ("user", "assistant"):
                    messages.append({"role": role, "content": content})

            messages.append({"role": "user", "content": context.user_message})

            response = await self.chat(
                messages,
                temperature=context.temperature,
                max_tokens=context.max_length
            )

            response_time = (time.time() - start_time) * 1000

            return GenerationResult(
                text=response,
                generator_type=self.default_provider,
                response_time_ms=response_time,
                success=True,
                extra={"model": self.default_provider},
            )

        except Exception as e:
            return GenerationResult.error_result(self.default_provider, str(e))


# 全局 LLM 管理器
_llm_manager: Optional[LLMManager] = None


def get_llm_manager() -> LLMManager:
    """获取 LLM 管理器"""
    global _llm_manager
    if _llm_manager is None:
        _llm_manager = LLMManager()
    return _llm_manager
