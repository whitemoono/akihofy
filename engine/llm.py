"""
LLM 统一封装模块

整合多种 LLM 提供商，通过统一的接口和配置格式支持所有 OpenAI 兼容 API。
支持 provider_type: openai-compatible, anthropic, ollama
"""
from typing import Optional, List, Dict, Any, AsyncIterator, Callable
from abc import ABC, abstractmethod
import os
import time
import json
from dataclasses import dataclass, field
import asyncio
import httpx


# =============================================================================
# 数据模型
# =============================================================================

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


@dataclass
class LLMConfig:
    """LLM 统一配置格式"""
    # 通用配置
    name: str = "默认配置"
    provider_type: str = "openai-compatible"  # openai-compatible, anthropic, ollama
    base_url: str = ""
    model: str = ""
    api_key: str = ""
    timeout: float = 60.0

    # 生成参数
    temperature: float = 0.8
    max_tokens: int = 1024
    top_p: float = 0.9
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    stop: List[str] = field(default_factory=list)

    # 可用模型列表
    available_models: List[str] = field(default_factory=list)

    @classmethod
    def from_preset(cls, preset: Dict[str, Any]) -> "LLMConfig":
        """从 preset 字典创建配置"""
        return cls(
            name=preset.get("name", "默认配置"),
            provider_type=preset.get("provider_type", "openai-compatible"),
            base_url=preset.get("base_url", ""),
            model=preset.get("model_id", preset.get("model", "")),
            api_key=preset.get("api_key", ""),
            timeout=preset.get("timeout", 60.0),
            temperature=preset.get("temperature", 0.8),
            max_tokens=preset.get("max_tokens", 1024),
            top_p=preset.get("top_p", 0.9),
            frequency_penalty=preset.get("frequency_penalty", 0.0),
            presence_penalty=preset.get("presence_penalty", 0.0),
            stop=preset.get("stop", []),
            available_models=preset.get("available_models", []),
        )

    def to_preset(self) -> Dict[str, Any]:
        """转换为 preset 字典格式"""
        return {
            "name": self.name,
            "provider_type": self.provider_type,
            "base_url": self.base_url,
            "model_id": self.model,
            "api_key": self.api_key,
            "timeout": self.timeout,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "top_p": self.top_p,
            "frequency_penalty": self.frequency_penalty,
            "presence_penalty": self.presence_penalty,
            "stop": self.stop,
            "available_models": self.available_models,
        }


# =============================================================================
# Provider 类型定义
# =============================================================================

class ChatRequestBuilder(ABC):
    """聊天请求构建器基类"""

    @abstractmethod
    def build_headers(self, config: LLMConfig) -> Dict[str, str]:
        """构建请求头"""
        pass

    @abstractmethod
    def build_payload(
        self,
        config: LLMConfig,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> Dict[str, Any]:
        """构建请求体"""
        pass

    @abstractmethod
    def parse_response(self, data: Dict[str, Any]) -> str:
        """解析响应"""
        pass

    @abstractmethod
    def parse_stream_chunk(self, line: str) -> Optional[str]:
        """解析流式响应的一行"""
        pass


class OpenAICompatibleBuilder(ChatRequestBuilder):
    """OpenAI 兼容格式构建器"""

    def build_headers(self, config: LLMConfig) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
        }
        if config.api_key:
            headers["Authorization"] = f"Bearer {config.api_key}"
        return headers

    def build_payload(
        self,
        config: LLMConfig,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> Dict[str, Any]:
        # 处理 model: 如果 kwargs 中有 model 且不为 None，使用它；否则用 config.model
        model = kwargs.get("model")
        if model is None:
            model = config.model

        payload = {
            "model": model,
            "messages": messages,
            "temperature": kwargs.get("temperature", config.temperature),
            "max_tokens": kwargs.get("max_tokens", config.max_tokens),
        }
        if config.top_p != 0.9:
            payload["top_p"] = config.top_p
        if config.frequency_penalty != 0.0:
            payload["frequency_penalty"] = config.frequency_penalty
        if config.presence_penalty != 0.0:
            payload["presence_penalty"] = config.presence_penalty
        if config.stop:
            payload["stop"] = config.stop
        return payload

    def parse_response(self, data: Dict[str, Any]) -> str:
        if "choices" in data and len(data["choices"]) > 0:
            return data["choices"][0]["message"]["content"].strip()
        raise ValueError("Invalid OpenAI-compatible response format")

    def parse_stream_chunk(self, line: str) -> Optional[str]:
        if not line.startswith("data: "):
            return None
        data_str = line[6:]
        if data_str == "[DONE]":
            return None
        try:
            data = json.loads(data_str)
            if "choices" in data and len(data["choices"]) > 0:
                delta = data["choices"][0].get("delta", {})
                if "content" in delta:
                    return delta["content"]
        except json.JSONDecodeError:
            pass
        return None


class AnthropicBuilder(ChatRequestBuilder):
    """Anthropic (Claude) 格式构建器"""

    def build_headers(self, config: LLMConfig) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "x-api-key": config.api_key,
            "anthropic-version": "2023-06-01",
        }
        return headers

    def build_payload(
        self,
        config: LLMConfig,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> Dict[str, Any]:
        # 分离 system 消息
        system_msg = ""
        chat_messages = []
        for msg in messages:
            if msg.get("role") == "system":
                system_msg = msg.get("content", "")
            else:
                chat_messages.append(msg)

        payload = {
            "model": kwargs.get("model", config.model),
            "messages": chat_messages,
            "max_tokens": kwargs.get("max_tokens", config.max_tokens),
            "temperature": kwargs.get("temperature", config.temperature),
        }
        if system_msg:
            payload["system"] = system_msg
        return payload

    def parse_response(self, data: Dict[str, Any]) -> str:
        if "content" in data and len(data["content"]) > 0:
            return data["content"][0]["text"].strip()
        raise ValueError("Invalid Anthropic response format")

    def parse_stream_chunk(self, line: str) -> Optional[str]:
        if not line.startswith("data: "):
            return None
        data_str = line[6:]
        if data_str == "[DONE]":
            return None
        try:
            data = json.loads(data_str)
            if data.get("type") == "content_block_delta":
                if data.get("delta", {}).get("type") == "text_delta":
                    return data["delta"].get("text", "")
        except json.JSONDecodeError:
            pass
        return None


class OllamaBuilder(ChatRequestBuilder):
    """Ollama 本地部署格式构建器"""

    def build_headers(self, config: LLMConfig) -> Dict[str, str]:
        return {"Content-Type": "application/json"}

    def build_payload(
        self,
        config: LLMConfig,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> Dict[str, Any]:
        # Ollama 使用不同的消息格式
        ollama_messages = []
        for msg in messages:
            role = msg.get("role", "user")
            if role == "assistant":
                role = "assistant"
            elif role == "system":
                role = "system"
            else:
                role = "user"
            ollama_messages.append({
                "role": role,
                "content": msg.get("content", ""),
            })

        payload = {
            "model": kwargs.get("model", config.model),
            "messages": ollama_messages,
            "stream": False,
        }
        return payload

    def parse_response(self, data: Dict[str, Any]) -> str:
        if "message" in data:
            return data["message"].get("content", "").strip()
        raise ValueError("Invalid Ollama response format")

    def parse_stream_chunk(self, line: str) -> Optional[str]:
        if not line.startswith("data: "):
            return None
        data_str = line[6:]
        try:
            data = json.loads(data_str)
            if "message" in data:
                return data["message"].get("content", "")
        except json.JSONDecodeError:
            pass
        return None


# 请求构建器注册表
REQUEST_BUILDERS: Dict[str, ChatRequestBuilder] = {
    "openai-compatible": OpenAICompatibleBuilder(),
    "anthropic": AnthropicBuilder(),
    "ollama": OllamaBuilder(),
}


# =============================================================================
# 统一 Provider
# =============================================================================

class UnifiedProvider:
    """
    统一 LLM Provider

    通过 provider_type 区分不同协议格式，支持：
    - openai-compatible: OpenAI、DeepSeek、硅基流动等
    - anthropic: Claude 系列
    - ollama: 本地部署
    """

    # 默认配置
    DEFAULT_CONFIGS = {
        "deepseek": {
            "provider_type": "openai-compatible",
            "base_url": "https://api.deepseek.com/v1",
            "model": "deepseek-chat",
            "env_key": "DEEPSEEK_API_KEY",
        },
        "siliconflow": {
            "provider_type": "openai-compatible",
            "base_url": "https://api.siliconflow.cn/v1",
            "model": "Qwen/Qwen2.5-14B-Instruct",
            "env_key": "SILICONFLOW_API_KEY",
        },
        "openai": {
            "provider_type": "openai-compatible",
            "base_url": "https://api.openai.com/v1",
            "model": "gpt-4o-mini",
            "env_key": "OPENAI_API_KEY",
        },
        "anthropic": {
            "provider_type": "anthropic",
            "base_url": "https://api.anthropic.com/v1",
            "model": "claude-3-haiku-20240307",
            "env_key": "ANTHROPIC_API_KEY",
        },
        "ollama": {
            "provider_type": "ollama",
            "base_url": "http://localhost:11434/api",
            "model": "llama2",
            "env_key": "",
        },
        "mimo": {
            "provider_type": "openai-compatible",
            "base_url": "https://api.siliconflow.cn/v1",
            "model": "Xiaomi/MiMo-7B-RL",
            "env_key": "MIMO_API_KEY",
        },
    }

    def __init__(self, config: LLMConfig):
        """
        初始化统一 Provider

        Args:
            config: LLM 配置
        """
        self.config = config
        self._client: Optional[httpx.AsyncClient] = None

        # 获取请求构建器
        self._builder = REQUEST_BUILDERS.get(
            config.provider_type,
            REQUEST_BUILDERS["openai-compatible"]
        )

        # 设置端点
        self._set_endpoints()

    def _set_endpoints(self):
        """根据 provider_type 设置 API 端点"""
        provider_type = self.config.provider_type

        if provider_type == "openai-compatible":
            self._chat_endpoint = "/chat/completions"
            self._embed_endpoint = "/embeddings"
        elif provider_type == "anthropic":
            self._chat_endpoint = "/messages"
            self._embed_endpoint = None  # Anthropic 不提供 embedding API
        elif provider_type == "ollama":
            self._chat_endpoint = "/chat"
            self._embed_endpoint = "/embeddings"

    async def _get_client(self) -> httpx.AsyncClient:
        """获取或创建 HTTP 客户端"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=self.config.timeout)
        return self._client

    async def close(self):
        """关闭客户端"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        发送聊天请求

        Args:
            messages: 消息列表
            model: 模型名称（覆盖配置）
            **kwargs: 其他参数 (temperature, max_tokens, etc.)

        Returns:
            生成的文本
        """
        client = await self._get_client()
        headers = self._builder.build_headers(self.config)
        payload = self._builder.build_payload(self.config, messages, model=model, **kwargs)

        try:
            response = await client.post(
                f"{self.config.base_url}{self._chat_endpoint}",
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            data = response.json()
            return self._builder.parse_response(data)

        except httpx.TimeoutException:
            raise TimeoutError(f"API request timeout ({self.config.timeout}s)")
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
        client = await self._get_client()
        headers = self._builder.build_headers(self.config)
        payload = self._builder.build_payload(
            self.config, messages, model=model, stream=True, **kwargs
        )

        async with client.stream(
            "POST",
            f"{self.config.base_url}{self._chat_endpoint}",
            json=payload,
            headers=headers,
            timeout=self.config.timeout
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                chunk = self._builder.parse_stream_chunk(line)
                if chunk:
                    yield chunk

    async def embed(self, text: str, model: Optional[str] = None) -> List[float]:
        """
        获取文本嵌入向量

        Args:
            text: 文本
            model: 模型名称

        Returns:
            嵌入向量
        """
        if not self._embed_endpoint:
            raise NotImplementedError(
                f"Provider type '{self.config.provider_type}' does not support embeddings"
            )

        client = await self._get_client()
        headers = self._builder.build_headers(self.config)

        payload = {
            "model": model or self.config.model,
            "input": text,
        }

        response = await client.post(
            f"{self.config.base_url}{self._embed_endpoint}",
            json=payload,
            headers=headers
        )
        response.raise_for_status()
        data = response.json()

        # 兼容不同格式
        if "data" in data and len(data["data"]) > 0:
            return data["data"][0]["embedding"]
        elif "embedding" in data:
            return data["embedding"]
        raise ValueError("Invalid embedding response format")

    @property
    def is_configured(self) -> bool:
        """检查是否已配置"""
        return bool(self.config.api_key or self.config.provider_type == "ollama")

    @property
    def description(self) -> str:
        """获取描述"""
        return f"{self.config.provider_type} ({self.config.model})"


# =============================================================================
# LLM 管理器
# =============================================================================

class LLMManager:
    """LLM 管理器 - 管理多个 Provider 和配置"""

    # 默认配置映射
    DEFAULT_CONFIGS = {
        "deepseek": {
            "provider_type": "openai-compatible",
            "base_url": "https://api.deepseek.com/v1",
            "model": "deepseek-chat",
            "env_key": "DEEPSEEK_API_KEY",
        },
        "siliconflow": {
            "provider_type": "openai-compatible",
            "base_url": "https://api.siliconflow.cn/v1",
            "model": "Qwen/Qwen2.5-14B-Instruct",
            "env_key": "SILICONFLOW_API_KEY",
        },
        "openai": {
            "provider_type": "openai-compatible",
            "base_url": "https://api.openai.com/v1",
            "model": "gpt-4o-mini",
            "env_key": "OPENAI_API_KEY",
        },
        "anthropic": {
            "provider_type": "anthropic",
            "base_url": "https://api.anthropic.com/v1",
            "model": "claude-3-haiku-20240307",
            "env_key": "ANTHROPIC_API_KEY",
        },
        "ollama": {
            "provider_type": "ollama",
            "base_url": "http://localhost:11434/api",
            "model": "llama2",
            "env_key": "",
        },
    }

    def __init__(
        self,
        default_provider: str = "deepseek",
        config: Optional[Dict[str, Any]] = None
    ):
        self.default_provider = default_provider
        self._providers: Dict[str, UnifiedProvider] = {}
        self._config = config or {}
        self._current_config: Optional[LLMConfig] = None

    def _get_active_preset(self) -> Dict[str, Any]:
        """获取当前激活的 preset"""
        llm = self._config.get("llm", {})
        presets = llm.get("presets", [])
        active_id = llm.get("active_preset_id", "")

        for preset in presets:
            if preset.get("id") == active_id:
                return preset

        return presets[0] if presets else {}

    def get_config(self) -> LLMConfig:
        """获取当前激活的配置"""
        if self._current_config is None:
            preset = self._get_active_preset()
            self._current_config = LLMConfig.from_preset(preset)
        return self._current_config

    def update_config(self, preset: Dict[str, Any]):
        """更新配置（用于切换 preset）"""
        self._current_config = LLMConfig.from_preset(preset)
        # 清除旧 provider
        self._providers.clear()

    def get_provider(self, name: Optional[str] = None) -> UnifiedProvider:
        """
        获取 Provider 实例

        Args:
            name: Provider 名称（可选，默认使用当前配置）

        Returns:
            UnifiedProvider 实例
        """
        provider_key = name or "current"

        if provider_key not in self._providers:
            # 确定配置
            if provider_key == "current":
                config = self.get_config()
            else:
                # 尝试从 presets 中查找
                config = self._get_preset_config(provider_key)
                if config is None:
                    # 使用默认配置
                    default_info = self.DEFAULT_CONFIGS.get(provider_key, {})
                    config = LLMConfig(
                        provider_type=default_info.get("provider_type", "openai-compatible"),
                        base_url=default_info.get("base_url", ""),
                        model=default_info.get("model", ""),
                        api_key=os.getenv(default_info.get("env_key", ""), ""),
                    )

            self._providers[provider_key] = UnifiedProvider(config)

        return self._providers[provider_key]

    def _get_preset_config(self, preset_id: str) -> Optional[LLMConfig]:
        """从 presets 中获取配置"""
        llm = self._config.get("llm", {})
        presets = llm.get("presets", [])

        for preset in presets:
            if preset.get("id") == preset_id:
                return LLMConfig.from_preset(preset)

        return None

    async def chat(
        self,
        messages: List[Dict[str, str]],
        provider: Optional[str] = None,
        **kwargs
    ) -> str:
        """发送聊天请求"""
        prov = self.get_provider(provider)
        return await prov.chat(messages, **kwargs)

    async def embed(self, text: str, provider: Optional[str] = None) -> List[float]:
        """获取嵌入向量"""
        prov = self.get_provider(provider)
        return await prov.embed(text)

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

            config = self.get_config()
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
                extra={
                    "provider": self.default_provider,
                    "model": config.model,
                    "provider_type": config.provider_type,
                },
            )

        except Exception as e:
            return GenerationResult.error_result(self.default_provider, str(e))

    async def reload_config(self, config: Dict[str, Any]):
        """重新加载配置"""
        self._config = config
        self._current_config = None
        self._providers.clear()


# =============================================================================
# 全局实例
# =============================================================================

_llm_manager: Optional[LLMManager] = None


def get_llm_manager() -> LLMManager:
    """获取 LLM 管理器"""
    global _llm_manager
    if _llm_manager is None:
        from config import load_config_json
        config = load_config_json()
        provider = config.get("llm", {}).get("provider", "deepseek")
        _llm_manager = LLMManager(default_provider=provider, config=config)
    return _llm_manager


def reset_llm_manager():
    """重置 LLM 管理器（用于测试或配置更改后）"""
    global _llm_manager
    if _llm_manager:
        # 关闭所有 provider
        for prov in _llm_manager._providers.values():
            asyncio.create_task(prov.close())
    _llm_manager = None
