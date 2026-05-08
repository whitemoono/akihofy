"""AKIHO API Server

FastAPI 后端服务，提供 REST API 和 WebSocket 接口
"""
import os
import json
import uuid
import time
import logging
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, AsyncIterator
from datetime import datetime
import asyncio

from engine.core import get_engine
from engine.logging import get_event_logger, init_event_logger
from engine.platform import (
    get_platform_manager,
    init_platform_manager,
    PlatformMessage,
)
# 导入平台适配器以触发注册
try:
    from engine.platform.telegram import TelegramAdapter
    from engine.platform.wechat import WeChatAdapter
except ImportError as e:
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"平台适配器导入失败: {e}，部分功能将被禁用")
    TelegramAdapter = None
    WeChatAdapter = None
from config import get_settings, load_config_json

settings = get_settings()

# 配置文件路径
CONFIG_FILE = Path(__file__).parent / "config.json"

# 默认配置
DEFAULT_CONFIG = {
    "llm": {
        "active_preset_id": "default-1",
        "presets": [
            {
                "id": "default-1",
                "name": "DeepSeek 智能助手",
                "provider": "deepseek",
                "base_url": "https://api.deepseek.com/v1",
                "model_id": "deepseek-chat",
                "api_key": "",
                "temperature": 0.7,
                "max_tokens": 4096,
                "top_p": 0.9,
                "frequency_penalty": 0.0,
                "presence_penalty": 0.0,
                "stop": []
            }
        ]
    },
    "embedding": {
        "active_preset_id": "default-1",
        "presets": [
            {
                "id": "default-1",
                "name": "BGE 向量库",
                "provider": "siliconflow",
                "base_url": "https://api.siliconflow.cn/v1",
                "model_id": "BAAI/bge-large-zh-v1.5",
                "api_key": "",
                "dimension": 1024
            }
        ]
    },
    "tts": {
        "voice": "zh-CN-XiaobaiNeural",
        "speed": 1.0,
        "pitch": 1.0,
        "enabled": True
    },
    "system": {
        "host": "localhost",
        "port": 8000,
        "debug": False
    }
}


def load_config() -> dict:
    """加载配置文件"""
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                config = json.load(f)
                # 迁移旧格式到新预设格式
                config = migrate_to_presets(config)
                return config
        except (json.JSONDecodeError, IOError):
            pass
    return DEFAULT_CONFIG.copy()


def migrate_to_presets(config: dict) -> dict:
    """迁移旧配置格式到预设格式"""
    result = config.copy()

    # 迁移 LLM 配置
    if "llm" in config:
        llm = result["llm"]
        # 如果没有 presets 字段，转换为预设格式
        if "presets" not in llm:
            preset = {
                "id": "default-1",
                "name": "默认配置",
                "provider": llm.get("provider", "deepseek"),
                "base_url": llm.get("base_url", ""),
                "model_id": llm.get("model", llm.get("enabled_model", "")),
                "api_key": llm.get("api_key", ""),
                "temperature": llm.get("temperature", 0.7),
                "max_tokens": llm.get("max_tokens", 4096),
                "top_p": llm.get("top_p", 0.9),
                "frequency_penalty": llm.get("frequency_penalty", 0.0),
                "presence_penalty": llm.get("presence_penalty", 0.0),
                "stop": llm.get("stop", [])
            }
            llm["presets"] = [preset]
            llm["active_preset_id"] = "default-1"
            # 清理旧字段
            for key in ["model", "enabled_model"]:
                if key in llm:
                    del llm[key]
        else:
            # 确保有 active_preset_id
            if "active_preset_id" not in llm:
                llm["active_preset_id"] = llm["presets"][0]["id"]

    # 迁移向量配置
    if "embedding" in config:
        emb = result["embedding"]
        if "presets" not in emb:
            preset = {
                "id": "default-1",
                "name": "默认配置",
                "provider": emb.get("provider", "siliconflow"),
                "base_url": emb.get("base_url", ""),
                "model_id": emb.get("model", emb.get("enabled_model", "")),
                "api_key": emb.get("api_key", ""),
                "dimension": emb.get("dimension", 1024)
            }
            emb["presets"] = [preset]
            emb["active_preset_id"] = "default-1"
            for key in ["model", "enabled_model"]:
                if key in emb:
                    del emb[key]
        else:
            if "active_preset_id" not in emb:
                emb["active_preset_id"] = emb["presets"][0]["id"]

    return result


def deep_merge(base: dict, update: dict) -> dict:
    """深度合并两个字典，特殊处理 presets 列表"""
    result = base.copy()
    for key, value in update.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            # 特殊处理 presets 列表
            if key in ["llm", "embedding"] and "presets" in value:
                result[key]["presets"] = value["presets"]
            else:
                result[key] = deep_merge(result[key], value)
        elif key in result and isinstance(result[key], list) and isinstance(value, list):
            # 列表直接替换（用于 presets）
            result[key] = value
        else:
            result[key] = value
    return result


def save_config(config: dict) -> bool:
    """保存配置文件"""
    try:
        existing = load_config()
        existing = deep_merge(existing, config)
        # 确保 active_preset_id 有效
        if "llm" in config and "presets" in config.get("llm", {}):
            active_id = config["llm"].get("active_preset_id")
            if active_id:
                existing["llm"]["active_preset_id"] = active_id
        if "embedding" in config and "presets" in config.get("embedding", {}):
            active_id = config["embedding"].get("active_preset_id")
            if active_id:
                existing["embedding"]["active_preset_id"] = active_id
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
        return True
    except IOError as e:
        print(f"保存配置失败: {e}")
        return False


def mask_api_key(key: str) -> str:
    """脱敏 API Key"""
    if not key:
        return ""
    if len(key) <= 8:
        return "*" * len(key)
    return key[:4] + "*" * (len(key) - 8) + key[-4:]

app = FastAPI(
    title="AKIHO API",
    description="AI Companion Core Engine API",
    version="0.1.0"
)

# CORS 配置
if settings.enable_cors:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# ============== 请求/响应模型 ==============

class ChatRequest(BaseModel):
    message: str = Field(..., description="用户消息")
    user_id: str = Field(default="default", description="用户ID")
    history: Optional[List[Dict[str, str]]] = Field(default=None, description="对话历史")


class ChatResponse(BaseModel):
    response: str
    emotion: Dict[str, Any]
    status: Dict[str, Any]
    timestamp: str


class EmotionUpdateRequest(BaseModel):
    stimulus_type: str = Field(..., description="刺激类型")
    intensity: float = Field(default=0.5, ge=0.0, le=1.0)


class MemorySearchRequest(BaseModel):
    query: str = Field(..., description="搜索查询")
    limit: int = Field(default=5, ge=1, le=20)


# ============== 全局引擎 ==============

# 初始化平台管理器
platform_manager = None


@app.on_event("startup")
async def startup_event():
    """启动时初始化引擎和平台"""
    global platform_manager

    # 初始化核心引擎
    engine = get_engine()
    await engine.start()

    # 设置 WebSocket 广播器到核心引擎
    from engine.core import set_broadcaster
    set_broadcaster(manager.broadcast)

    # 初始化消息持久化（PostgreSQL）
    config = load_config_json()
    db_config = config.get("database", {})
    if db_config.get("enabled"):
        from engine.persistence import init_message_store
        dsn = db_config.get("dsn", "postgresql://user:pass@localhost/akiho")
        msg_store = init_message_store(dsn)
        await msg_store.connect()

    # 初始化平台管理器
    platform_manager = init_platform_manager(config)
    await platform_manager.initialize()
    await platform_manager.start()

    # 设置消息处理器 - 将平台消息路由到核心引擎
    async def handle_platform_message(message: PlatformMessage):
        """处理来自各平台的消息"""
        logger = logging.getLogger(__name__)
        logger.info(f"收到来自 {message.platform} 的消息: {message.content[:50]}...")

        # 获取引擎和消息存储
        from engine.core import get_engine
        from engine.persistence import get_message_store

        engine = get_engine()
        msg_store = get_message_store()

        # 1. 保存用户消息到数据库
        if msg_store:
            try:
                # 为每个用户创建或获取会话
                session_id = msg_store.create_session(user_id=message.user_id)
                await msg_store.save_message(
                    session_id=session_id if isinstance(session_id, int) else 1,
                    role="user",
                    content=message.content,
                    platform=message.platform
                )
            except Exception as e:
                logger.warning(f"保存用户消息失败: {e}")

        # 2. 处理输入并生成回复
        response = await engine.generate_response(message.content, message.user_id)

        # 3. 保存 AI 回复到数据库
        if msg_store and response.get("response"):
            try:
                await msg_store.save_message(
                    session_id=1,  # TODO: 正确获取会话 ID
                    role="assistant",
                    content=response["response"],
                    emotion_state=response.get("emotion"),
                    platform=message.platform
                )
            except Exception as e:
                logger.warning(f"保存 AI 回复失败: {e}")

        # 4. 发送回复到平台
        adapter = platform_manager.get_platform(message.platform)
        if adapter:
            await adapter.send_message(
                chat_id=message.chat_id,
                content=response.get("response", ""),
                reply_to_message_id=message.message_id
            )

    platform_manager.set_message_handler(handle_platform_message)


@app.on_event("shutdown")
async def shutdown_event():
    """关闭时停止引擎和平台"""
    global platform_manager

    # 关闭平台管理器
    if platform_manager:
        await platform_manager.shutdown()

    # 关闭核心引擎
    engine = get_engine()
    await engine.stop()


# ============== 配置接口 ==============

@app.get("/api/config")
async def get_config():
    """获取当前配置"""
    config = load_config()
    # 脱敏 API Key
    if config.get("llm", {}).get("api_key"):
        config["llm"]["masked_key"] = mask_api_key(config["llm"]["api_key"])
    if config.get("embedding", {}).get("api_key"):
        config["embedding"]["masked_key"] = mask_api_key(config["embedding"]["api_key"])
    return {"code": 0, "data": config}


@app.post("/api/config")
async def update_config(request: dict):
    """更新配置"""
    # 过滤掉 masked_key（只读）
    if "llm" in request and "masked_key" in request["llm"]:
        del request["llm"]["masked_key"]
    if "embedding" in request and "masked_key" in request["embedding"]:
        del request["embedding"]["masked_key"]

    if save_config(request):
        return {"code": 0, "message": "配置已保存"}
    return {"code": 1, "detail": "保存配置失败"}


@app.get("/api/config/api")
async def get_api_config():
    """获取 API 配置（兼容旧接口）"""
    config = load_config()
    llm = config.get("llm", {})
    return {
        "code": 0,
        "data": {
            "provider": llm.get("provider", "deepseek"),
            "api_key": llm.get("api_key", ""),
            "masked_key": mask_api_key(llm.get("api_key", "")),
            "model": llm.get("model", ""),
            "base_url": llm.get("base_url", "")
        }
    }


@app.post("/api/config/api")
async def update_api_config(request: dict):
    """更新 API 配置（兼容旧接口）"""
    provider = request.get("provider", "deepseek")
    api_key = request.get("api_key", "")
    model = request.get("model", "")

    config = load_config()
    if "llm" not in config:
        config["llm"] = {}
    config["llm"]["provider"] = provider
    config["llm"]["api_key"] = api_key
    if model:
        config["llm"]["model"] = model

    if save_config(config):
        return {
            "code": 0,
            "message": "API 配置已保存",
            "data": {
                "provider": provider,
                "model": model,
                "masked_key": mask_api_key(api_key)
            }
        }
    return {"code": 1, "detail": "保存配置失败"}


# ============== 测试接口 ==============

class ModelTestRequest(BaseModel):
    base_url: str
    api_key: str
    model: str  # 对应 preset.model_id


@app.post("/api/test/llm")
async def test_llm_connection(request: ModelTestRequest):
    """测试 LLM API 连接"""
    import httpx

    headers = {
        "Authorization": f"Bearer {request.api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": request.model,
        "messages": [
            {"role": "user", "content": "Hi, reply with just 'OK' to test the connection."}
        ],
        "max_tokens": 10,
        "temperature": 0.1
    }

    try:
        start_time = time.time()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{request.base_url}/chat/completions",
                json=payload,
                headers=headers
            )

        latency_ms = int((time.time() - start_time) * 1000)

        if response.status_code == 200:
            data = response.json()
            reply = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            return {
                "code": 0,
                "success": True,
                "latency_ms": latency_ms,
                "response": reply[:200],
                "model": request.model
            }
        else:
            error_detail = response.text[:200]
            return {
                "code": 1,
                "success": False,
                "latency_ms": latency_ms,
                "error": f"HTTP {response.status_code}: {error_detail}",
                "model": request.model
            }

    except httpx.TimeoutException:
        return {
            "code": 1,
            "success": False,
            "latency_ms": 30000,
            "error": "连接超时 (30秒)",
            "model": request.model
        }
    except Exception as e:
        return {
            "code": 1,
            "success": False,
            "latency_ms": 0,
            "error": str(e),
            "model": request.model
        }


@app.post("/api/test/embedding")
async def test_embedding_connection(request: ModelTestRequest):
    """测试向量模型 API 连接"""
    import httpx

    headers = {
        "Authorization": f"Bearer {request.api_key}",
        "Content-Type": "application/json"
    }

    try:
        start_time = time.time()
        async with httpx.AsyncClient(timeout=30.0) as client:
            # 判断是否为 DashScope 原生 API 格式
            if "dashscope.aliyuncs.com/api/v1" in request.base_url:
                # DashScope 原生格式
                payload = {
                    "model": request.model,
                    "input": {"texts": ["这是一段测试文本，用于验证向量模型是否正常工作。"]}
                }
                response = await client.post(
                    request.base_url,
                    json=payload,
                    headers=headers
                )
                latency_ms = int((time.time() - start_time) * 1000)

                if response.status_code == 200:
                    data = response.json()
                    embeddings = data.get("output", {}).get("embeddings", [])
                    embedding = embeddings[0].get("embedding", []) if embeddings else []
                    dimension = len(embedding)
                    return {
                        "code": 0,
                        "success": True,
                        "latency_ms": latency_ms,
                        "dimension": dimension,
                        "model": request.model
                    }
                else:
                    error_detail = response.text[:200]
                    return {
                        "code": 1,
                        "success": False,
                        "latency_ms": latency_ms,
                        "error": f"HTTP {response.status_code}: {error_detail}",
                        "model": request.model
                    }
            elif "volces.com" in request.base_url or "doubao" in request.model.lower():
                # Doubao 火山引擎 API (OpenAI 兼容格式)
                payload = {
                    "model": request.model,
                    "input": "这是一段测试文本，用于验证向量模型是否正常工作。"
                }
                response = await client.post(
                    request.base_url,
                    json=payload,
                    headers=headers
                )
                latency_ms = int((time.time() - start_time) * 1000)

                if response.status_code == 200:
                    data = response.json()
                    embedding = data.get("data", [{}])[0].get("embedding", [])
                    dimension = len(embedding)
                    return {
                        "code": 0,
                        "success": True,
                        "latency_ms": latency_ms,
                        "dimension": dimension,
                        "model": request.model
                    }
                else:
                    error_detail = response.text[:200]
                    return {
                        "code": 1,
                        "success": False,
                        "latency_ms": latency_ms,
                        "error": f"HTTP {response.status_code}: {error_detail}",
                        "model": request.model
                    }
            else:
                # 标准 OpenAI 兼容格式
                payload = {
                    "model": request.model,
                    "input": "这是一段测试文本，用于验证向量模型是否正常工作。"
                }
                response = await client.post(
                    f"{request.base_url}/embeddings",
                    json=payload,
                    headers=headers
                )
                latency_ms = int((time.time() - start_time) * 1000)

                if response.status_code == 200:
                    data = response.json()
                    embedding = data.get("data", [{}])[0].get("embedding", [])
                    dimension = len(embedding)
                    return {
                        "code": 0,
                        "success": True,
                        "latency_ms": latency_ms,
                        "dimension": dimension,
                        "model": request.model
                    }
                else:
                    error_detail = response.text[:200]
                    return {
                        "code": 1,
                        "success": False,
                        "latency_ms": latency_ms,
                        "error": f"HTTP {response.status_code}: {error_detail}",
                        "model": request.model
                    }
                # OpenAI 兼容格式
                payload = {
                    "model": request.model,
                    "input": "这是一段测试文本，用于验证向量模型是否正常工作。"
                }
                response = await client.post(
                    f"{request.base_url}/embeddings",
                    json=payload,
                    headers=headers
                )
                latency_ms = int((time.time() - start_time) * 1000)

                if response.status_code == 200:
                    data = response.json()
                    embedding = data.get("data", [{}])[0].get("embedding", [])
                    dimension = len(embedding)
                    return {
                        "code": 0,
                        "success": True,
                        "latency_ms": latency_ms,
                        "dimension": dimension,
                        "model": request.model
                    }
                else:
                    error_detail = response.text[:200]
                    return {
                        "code": 1,
                        "success": False,
                        "latency_ms": latency_ms,
                        "error": f"HTTP {response.status_code}: {error_detail}",
                        "model": request.model
                    }

    except httpx.TimeoutException:
        return {
            "code": 1,
            "success": False,
            "latency_ms": 30000,
            "error": "连接超时 (30秒)",
            "model": request.model
        }
    except Exception as e:
        return {
            "code": 1,
            "success": False,
            "latency_ms": 0,
            "error": str(e),
            "model": request.model
        }


# ============== 模型列表接口 ==============

class ModelsListRequest(BaseModel):
    base_url: str
    api_key: str
    type: str = "llm"  # "llm" 或 "embedding"


@app.post("/api/models/list")
async def list_models(request: ModelsListRequest):
    """获取平台上可用的模型列表"""
    import httpx

    headers = {
        "Authorization": f"Bearer {request.api_key}",
        "Content-Type": "application/json"
    }

    # 构建 models 端点 URL
    base = request.base_url.rstrip('/')
    models_url = f"{base}/models"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(models_url, headers=headers)

            if response.status_code == 200:
                result = response.json()

                # 提取模型列表（兼容 OpenAI 格式和火山引擎格式）
                models = []
                if "data" in result:
                    # OpenAI 兼容格式
                    for item in result["data"]:
                        models.append({
                            "id": item.get("id", ""),
                            "object": item.get("object", "model"),
                            "owned_by": item.get("owned_by", ""),
                        })
                elif "models" in result:
                    # 火山引擎格式
                    for item in result["models"]:
                        models.append({
                            "id": item.get("model_name", item.get("model_id", "")),
                            "object": "model",
                            "owned_by": item.get("provider", ""),
                        })

                return {
                    "code": 0,
                    "data": {
                        "models": models,
                        "total": len(models)
                    }
                }
            else:
                error_detail = response.text
                try:
                    error_json = response.json()
                    if "error" in error_json:
                        error_detail = error_json["error"].get("message", error_detail)
                except:
                    pass

                return {
                    "code": 1,
                    "error": f"获取模型列表失败: HTTP {response.status_code} - {error_detail}"
                }

    except httpx.ConnectError:
        return {"code": 1, "error": "无法连接到服务器，请检查 API 地址是否正确"}
    except Exception as e:
        return {"code": 1, "error": f"获取模型列表失败: {str(e)}"}


# ============== 健康检查 ==============

@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "0.1.0"
    }


# ============== 聊天接口 ==============

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    处理聊天消息

    返回 AI 角色的回复和当前状态
    """
    engine = get_engine()

    result = await engine.generate_response(
        message=request.message,
        user_id=request.user_id,
        history=request.history
    )

    return ChatResponse(
        response=result["response"],
        emotion=result["emotion"],
        status=result["status"],
        timestamp=datetime.now().isoformat()
    )


async def generate_stream_response(message: str, user_id: str = "default", history: Optional[List[Dict]] = None) -> AsyncIterator[str]:
    """
    生成流式响应

    Yields:
        文本片段
    """
    engine = get_engine()

    # 处理输入
    await engine.process_input(message, user_id)

    # 构建上下文
    context = engine._get_generation_context(message, user_id, history or [])

    # 检查 API 是否可用
    config = load_config_json()
    llm_config = config.get("llm", {})
    api_key = llm_config.get("api_key", "")

    if not api_key:
        # 回退到普通响应
        fallback = engine._fallback_response()
        for char in fallback:
            yield char
            await asyncio.sleep(0.02)
        return

    # 构建消息
    messages = [{"role": "system", "content": engine.llm.build_system_prompt(context)}]
    for msg in context.recent_messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role in ("user", "assistant"):
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": context.user_message})

    try:
        # 使用流式 API
        provider = engine.llm.get_provider(llm_config.get("provider", "deepseek"))
        if hasattr(provider, 'chat_stream'):
            async for chunk in provider.chat_stream(
                messages,
                model=llm_config.get("model"),
                temperature=0.8,
                max_tokens=1024
            ):
                yield chunk
        else:
            # 如果提供商不支持流式，回退到普通方式
            response = await engine.llm.chat(
                messages,
                temperature=0.8,
                max_tokens=1024
            )
            for char in response:
                yield char
                await asyncio.sleep(0.02)

        # 存储回复记忆
        await engine.memory.store_conversation("", "default", None)

    except Exception as e:
        print(f"Stream generation error: {e}")
        fallback = engine._fallback_response()
        for char in fallback:
            yield char
            await asyncio.sleep(0.02)


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    流式聊天接口

    返回 Server-Sent Events 格式的流式响应
    """
    async def event_generator():
        try:
            async for chunk in generate_stream_response(
                message=request.message,
                user_id=request.user_id,
                history=request.history
            ):
                # 发送文本片段
                yield f"data: {json.dumps({'type': 'text', 'content': chunk}, ensure_ascii=False)}\n\n"

            # 发送完成信号
            engine = get_engine()
            emotion_state = engine.emotion.get_state()
            yield f"data: {json.dumps({'type': 'done', 'emotion': emotion_state}, ensure_ascii=False)}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


# ============== 情绪接口 ==============

@app.get("/api/emotion")
async def get_emotion():
    """获取当前情绪状态"""
    engine = get_engine()
    return engine.emotion.get_state()


@app.post("/api/emotion/stimulus")
async def update_emotion(request: EmotionUpdateRequest):
    """处理情绪刺激"""
    engine = get_engine()
    engine.emotion.process_stimulus(request.stimulus_type, request.intensity)
    return {"status": "ok", "emotion": engine.emotion.get_state()}


# ============== 记忆接口 ==============

@app.get("/api/memory")
async def get_memory_summary():
    """获取记忆摘要"""
    engine = get_engine()
    return {
        "total": engine.memory.get_count(),
        "recent": engine.memory.get_recent(24, 10)
    }


@app.post("/api/memory/search")
async def search_memory(request: MemorySearchRequest):
    """搜索记忆"""
    engine = get_engine()
    results = await engine.memory.search(request.query, request.limit)
    return {"results": results, "count": len(results)}


@app.post("/api/memory/conversation")
async def store_conversation(
    content: str,
    user_id: str = "default",
    emotion: Optional[str] = None
):
    """存储对话记忆"""
    engine = get_engine()
    memory_id = engine.memory.store_conversation(content, user_id, emotion)
    return {"memory_id": memory_id, "status": "stored"}


# ============== 行为接口 ==============

@app.get("/api/behavior/available")
async def get_available_behaviors():
    """获取可用行为"""
    engine = get_engine()
    return {"behaviors": engine.behavior.get_available()}


@app.get("/api/behavior/active")
async def get_active_behaviors():
    """获取当前活跃行为"""
    engine = get_engine()
    return {"active": engine.behavior.get_active()}


@app.post("/api/behavior/trigger/{behavior_id}")
async def trigger_behavior(behavior_id: str):
    """触发行为"""
    engine = get_engine()
    success = engine.behavior.trigger(behavior_id)
    return {"status": "ok" if success else "failed", "behavior_id": behavior_id}


# ============== 状态接口 ==============

@app.get("/api/status")
async def get_status():
    """获取完整系统状态"""
    engine = get_engine()
    return engine.get_status()


@app.get("/api/state")
async def get_state():
    """获取状态（兼容前端）"""
    engine = get_engine()
    return engine.get_display_data()


@app.get("/api/display")
async def get_display_data():
    """获取用于显示的数据"""
    engine = get_engine()
    return engine.get_display_data()


# ============== WebSocket 实时接口 ==============

class ConnectionManager:
    """WebSocket 连接管理器"""
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass


manager = ConnectionManager()


@app.websocket("/ws/status")
async def websocket_status(websocket: WebSocket):
    """
    WebSocket 实时状态推送
    """
    await manager.connect(websocket)

    try:
        while True:
            engine = get_engine()
            data = engine.get_display_data()
            await websocket.send_json(data)
            await asyncio.sleep(0.5)  # 2Hz

    except (WebSocketDisconnect, Exception):
        manager.disconnect(websocket)


@app.websocket("/ws")
async def websocket_root(websocket: WebSocket):
    """
    WebSocket 根路径（兼容前端）
    """
    await manager.connect(websocket)

    try:
        while True:
            engine = get_engine()
            data = engine.get_display_data()
            await websocket.send_json({"type": "state_update", "data": data})
            await asyncio.sleep(0.5)

    except (WebSocketDisconnect, Exception):
        manager.disconnect(websocket)


@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """
    WebSocket 聊天接口
    """
    await manager.connect(websocket)
    history = []

    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)

            message = message_data.get("message", "")
            user_id = message_data.get("user_id", "default")

            engine = get_engine()

            # 获取历史用于上下文
            recent = engine.memory.get_recent(24, 10)
            history = [{"role": "user", "content": m["content"]} for m in recent if m.get("event_type") == "conversation"]
            history = history[-10:]  # 限制历史长度

            result = await engine.generate_response(
                message=message,
                user_id=user_id,
                history=history
            )

            await websocket.send_json({
                "type": "response",
                "response": result["response"],
                "emotion": result["emotion"],
                "timestamp": datetime.now().isoformat()
            })

    except (WebSocketDisconnect, Exception):
        manager.disconnect(websocket)


# ============== 生成器接口 ==============

@app.get("/api/generator/list")
async def get_generator_list():
    """获取可用生成器列表"""
    config = load_config_json()
    llm_config = config.get("llm", {})
    api_available = bool(llm_config.get("api_key"))

    return {
        "code": 0,
        "data": {
            "generators": [
                {"id": "api", "name": "API 生成器", "available": api_available},
                {"id": "rule", "name": "规则生成器", "available": True},
                {"id": "local", "name": "本地生成器", "available": False}
            ]
        }
    }


@app.get("/api/generator/info")
async def get_generator_info():
    """获取当前生成器信息"""
    config = load_config_json()
    llm_config = config.get("llm", {})
    api_key = llm_config.get("api_key", "")
    api_available = bool(api_key)

    return {
        "code": 0,
        "data": {
            "current": "api" if api_available else "rule",
            "api": {
                "provider": llm_config.get("provider", "deepseek"),
                "model": llm_config.get("model", ""),
                "available": api_available,
                "error": None if api_available else "API密钥未配置"
            },
            "rule": {
                "available": True
            }
        }
    }


@app.post("/api/generator/switch")
async def switch_generator(request: dict):
    """切换生成器"""
    generator_id = request.get("generator_id")
    if generator_id not in ["api", "rule", "local"]:
        return {"code": 1, "detail": "无效的生成器ID"}

    return {
        "code": 0,
        "data": {
            "current": generator_id,
            "message": f"已切换到 {generator_id} 生成器"
        }
    }


# ============== 驱动系统接口 ==============

@app.get("/api/drives")
async def get_drives():
    """获取驱动系统状态 - 从 Rust AutonomousEngine 获取真实数据"""
    engine = get_engine()

    if engine._rust:
        try:
            drive_tensions = engine._rust.autonomous.get_drive_tensions()
            tensions = dict(drive_tensions) if drive_tensions else {}

            dominant = engine._rust.autonomous.dominant_drive()
            dominant_name = dominant.name() if hasattr(dominant, 'name') else str(dominant) if dominant else None

            # 获取触发的驱动
            triggered = []
            for drive in engine._rust.autonomous.drives.drives:
                if drive.is_triggered():
                    triggered.append({
                        "name": drive.drive_type.name(),
                        "tension": drive.tension,
                        "threshold": drive.threshold,
                        "growth_rate": drive.growth_rate,
                        "decay_rate": drive.decay_rate,
                    })

            return {
                "code": 0,
                "data": {
                    "tensions": tensions,
                    "dominant": dominant_name,
                    "triggered": triggered,
                    "total_tension": engine._rust.autonomous.drives.total_tension(),
                    "count": len(tensions),
                }
            }
        except Exception as e:
            return {"code": 1, "detail": f"获取驱动数据失败: {str(e)}"}

    # Fallback: 返回基于情绪/身体状态的推导数据
    emotion_state = engine.emotion.get_state()
    body_state = engine.body.get_status()

    return {
        "code": 0,
        "data": {
            "tensions": {
                "好奇心": 0.5 + emotion_state.get("arousal", 0.5) * 0.2,
                "归属需求": 0.3 + (1 - body_state.get("energy", 0.5)) * 0.2,
                "能力需求": 0.3,
                "自主需求": 0.4,
                "意义需求": 0.2,
            },
            "dominant": "好奇心",
            "triggered": [],
            "total_tension": 0.34,
            "count": 5,
        }
    }


# ============== 思考状态接口 ==============

@app.get("/api/thinking")
async def get_thinking():
    """获取当前思考状态 - 从 Rust AutonomousEngine"""
    engine = get_engine()

    if engine._rust:
        try:
            # 获取思考结果
            curiosity_queue_len = 0
            thought_result = engine._rust.autonomous.think(curiosity_queue_len)

            # 获取活跃意图
            active_intents = []
            for intent in engine._rust.autonomous.intents.active_intents:
                active_intents.append({
                    "id": intent.id,
                    "description": intent.description,
                    "source_drive": intent.source_drive.name() if hasattr(intent.source_drive, 'name') else str(intent.source_drive),
                    "strength": intent.strength,
                    "stage": intent.stage.name() if hasattr(intent.stage, 'name') else str(intent.stage),
                })

            return {
                "code": 0,
                "data": {
                    "action": thought_result.get("action", "idle"),
                    "query": thought_result.get("query"),
                    "topic": thought_result.get("topic"),
                    "active_intents": active_intents,
                    "intent_count": len(active_intents),
                }
            }
        except Exception as e:
            return {"code": 1, "detail": f"获取思考状态失败: {str(e)}"}

    return {
        "code": 0,
        "data": {
            "action": "idle",
            "active_intents": [],
            "intent_count": 0,
        }
    }


# ============== 意图接口 ==============

@app.get("/api/intent")
async def get_intent():
    """获取意图状态 - 从 Rust AutonomousEngine 获取真实数据"""
    engine = get_engine()

    if engine._rust:
        try:
            active_intents = []
            for intent in engine._rust.autonomous.intents.active_intents:
                active_intents.append({
                    "id": intent.id,
                    "intent_type": intent.stage.name() if hasattr(intent.stage, 'name') else str(intent.stage),
                    "description": intent.description,
                    "source_drive": intent.source_drive.name() if hasattr(intent.source_drive, 'name') else str(intent.source_drive),
                    "strength": intent.strength,
                    "intensity": intent.strength,
                    "commitment_strength": intent.commitment,
                    "stage": intent.stage.name() if hasattr(intent.stage, 'name') else str(intent.stage),
                    "created_at": datetime.fromtimestamp(intent.created_at).isoformat() if intent.created_at else datetime.now().isoformat(),
                })

            # 当前意图 = 第一个活跃意图
            current_intent = active_intents[0] if active_intents else None

            return {
                "code": 0,
                "data": {
                    "current_intent": current_intent,
                    "active_intents": active_intents,
                    "intent_history": [
                        {
                            "id": i.id,
                            "description": i.description,
                            "stage": i.stage.name() if hasattr(i.stage, 'name') else str(i.stage),
                        }
                        for i in engine._rust.autonomous.intents.completed_intents[-10:]
                    ],
                    "completed_count": len(engine._rust.autonomous.intents.completed_intents),
                    "abandoned_count": 0,
                }
            }
        except Exception as e:
            pass  # fallback to derived logic

    # Fallback: 基于情绪状态推导（原有逻辑）
    emotion_state = engine.emotion.get_state()
    arousal = emotion_state.get("arousal", 0.5)
    pleasure = emotion_state.get("pleasure", 0.5)
    category = emotion_state.get("category", "neutral")

    if category == "positive" or pleasure > 0.6:
        intent_type = "connect"
        descriptions = ["想和主人互动交流", "想分享有趣的事情", "想表达开心的心情"]
    elif category == "negative" or pleasure < 0.4:
        intent_type = "reflect"
        descriptions = ["需要一些时间思考", "想安静地待一会儿", "需要消化一下情绪"]
    else:
        intent_type = "explore"
        descriptions = ["想探索新的话题", "对周围的事物感到好奇", "想了解更多信息"]

    description = descriptions[hash(str(emotion_state)) % len(descriptions)]

    current_intent = {
        "id": str(uuid.uuid4()),
        "intent_type": intent_type,
        "description": description,
        "target": "owner",
        "intensity": arousal,
        "commitment_strength": max(0.3, min(0.9, pleasure)),
        "created_at": datetime.now().isoformat()
    }

    active_intents = []
    if arousal > 0.6:
        active_intents.append({
            "id": str(uuid.uuid4()),
            "intent_type": "explore",
            "description": "探索新事物",
            "intensity": arousal - 0.3
        })

    return {
        "code": 0,
        "data": {
            "current_intent": current_intent,
            "active_intents": active_intents,
            "intent_history": [],
            "completed_count": engine.growth.get_profile().get("experience_count", 0),
            "abandoned_count": 0
        }
    }


# ============== 欲望接口 ==============

@app.get("/api/desires")
async def get_desires():
    """获取欲望状态 - 从 Rust DriveSystem 获取真实数据"""
    engine = get_engine()

    if engine._rust:
        try:
            # 从 Rust 驱动系统获取真实张力
            drive_tensions = engine._rust.autonomous.get_drive_tensions()
            tensions = dict(drive_tensions) if drive_tensions else {}

            dominant = engine._rust.autonomous.dominant_drive()
            dominant_name = dominant.name() if hasattr(dominant, 'name') else str(dominant) if dominant else None

            # 将驱动转换为欲望格式
            active_desires = []
            for name, tension in tensions.items():
                # 映射驱动名称到欲望名称
                desire_name_map = {
                    "好奇心": "好奇",
                    "归属需求": "社交",
                    "能力需求": "成就",
                    "自主需求": "自主",
                    "意义需求": "意义",
                }
                desire_name = desire_name_map.get(name, name)

                # 根据张力确定紧迫度
                if tension >= 0.7:
                    urgency = "high"
                elif tension >= 0.5:
                    urgency = "medium"
                else:
                    urgency = "low"

                active_desires.append({
                    "id": name.lower().replace("需求", "").replace("好奇心", "curious"),
                    "name": desire_name,
                    "source": name,  # 原始驱动名称
                    "tension": tension,  # 原始张力值
                    "intensity": tension,
                    "urgency": urgency,
                })

            # 按强度排序
            active_desires.sort(key=lambda x: x["intensity"], reverse=True)

            # 确定主导欲望
            primary_desire = dominant_name
            if primary_desire:
                desire_name_map = {
                    "好奇心": "好奇",
                    "归属需求": "社交",
                    "能力需求": "成就",
                    "自主需求": "自主",
                    "意义需求": "意义",
                }
                primary_desire = desire_name_map.get(primary_desire, primary_desire)

            return {
                "code": 0,
                "data": {
                    "primary_desire": primary_desire,
                    "active_desires": active_desires,
                    "desire_history": [],
                    "total_tension": engine._rust.autonomous.drives.total_tension(),
                }
            }
        except Exception as e:
            pass  # fallback to derived logic

    # Fallback: 基于身体状态推导（原有逻辑）
    body_state = engine.body.get_status()
    emotion_state = engine.emotion.get_state()
    energy = body_state.get("energy", 50)
    arousal = emotion_state.get("arousal", 0.5)

    active_desires = []
    active_desires.append({
        "id": "curious", "name": "好奇心", "intensity": 0.7 + arousal * 0.2, "urgency": "medium"
    })

    if energy > 50:
        active_desires.append({"id": "social", "name": "社交", "intensity": 0.8, "urgency": "high"})
    elif energy > 30:
        active_desires.append({"id": "social", "name": "社交", "intensity": 0.5, "urgency": "medium"})
    else:
        active_desires.append({"id": "social", "name": "社交", "intensity": 0.3, "urgency": "low"})

    if energy <= 30:
        active_desires.append({"id": "rest", "name": "休息", "intensity": 0.8, "urgency": "high"})
    else:
        active_desires.append({"id": "rest", "name": "休息", "intensity": 0.4 - (energy - 30) / 100, "urgency": "low"})

    primary_desire = "social" if energy > 30 else "rest"

    return {
        "code": 0,
        "data": {
            "primary_desire": primary_desire,
            "active_desires": active_desires,
            "desire_history": []
        }
    }


# ============== 认知偏差接口 ==============

@app.get("/api/cognitive-bias")
async def get_cognitive_bias():
    """获取认知偏差状态 - 从 Rust CognitionEngine 获取真实数据"""
    engine = get_engine()
    emotion_state = engine.emotion.get_state()

    # 尝试从 Rust 获取真实数据
    if engine._cognition:
        try:
            # 获取认知偏差数据
            biases = engine._cognition.get_biases()
            biases_dict = dict(biases) if biases else {}

            # 获取元认知数据
            metacog = engine._cognition.get_metacognition()
            metacog_dict = dict(metacog) if metacog else {}

            # 获取注意力状态
            attention = engine._cognition.get_attention_state()
            attention_dict = dict(attention) if attention else {}

            # 获取推理状态
            reasoning = engine._cognition.get_reasoning_state()
            reasoning_dict = dict(reasoning) if reasoning else {}

            # 构建活跃偏差列表
            active_biases = []
            bias_type_map = {
                "confirmation_bias": ("confirmation", "确认偏差", "倾向于接受与已有信念一致的信息"),
                "anchoring": ("anchoring", "锚定偏差", "过度依赖最初获得的信息"),
                "recency_bias": ("recency", "近因效应", "更容易记住最近发生的事情"),
                "optimism_bias": ("optimism", "乐观偏差", "倾向于高估正面结果的可能性"),
            }

            for bias_key, (bias_id, bias_name, bias_desc) in bias_type_map.items():
                intensity = biases_dict.get(bias_key, 0.0)
                if intensity > 0.2:  # 只显示显著的偏差
                    active_biases.append({
                        "id": str(uuid.uuid4()),
                        "type": bias_id,
                        "name": bias_name,
                        "description": bias_desc,
                        "intensity": intensity,
                        "triggered_by": "growth_phase" if intensity > 0.3 else "normal",
                    })

            # 计算整体偏差强度
            bias_strength = sum(biases_dict.values()) / len(biases_dict) if biases_dict else 0.4

            return {
                "code": 0,
                "data": {
                    "active_biases": active_biases,
                    "bias_strength": bias_strength,
                    "bias_tendencies": {
                        "confirmation": biases_dict.get("confirmation_bias", 0.3),
                        "recency": biases_dict.get("recency_bias", 0.4),
                        "optimism": biases_dict.get("optimism_bias", 0.2),
                        "anchoring": biases_dict.get("anchoring", 0.2),
                    },
                    # 元认知数据
                    "self_awareness": metacog_dict.get("reasoning_confidence", 0.5),
                    "reasoning_confidence": metacog_dict.get("reasoning_confidence", 0.5),
                    "thinking_strategy": metacog_dict.get("thinking_strategy", "快速思考"),
                    "known_blindspots": metacog_dict.get("known_blindspots", []),
                    # 注意力数据
                    "attention": {
                        "current_focus": attention_dict.get("current_focus", []),
                        "sustained_attention": attention_dict.get("sustained_attention", 1.0),
                        "attention_span": attention_dict.get("attention_span", 5),
                    },
                    # 推理数据
                    "reasoning": {
                        "active_reasoning": reasoning_dict.get("active_reasoning", []),
                        "quality": reasoning_dict.get("reasoning_quality", 0.5),
                    },
                    "mitigation": "aware" if metacog_dict.get("reasoning_confidence", 0.5) > 0.6 else "partial",
                }
            }
        except Exception as e:
            pass  # fallback to derived logic

    # Fallback: 基于情绪状态推导（原有逻辑）
    dominance = emotion_state.get("dominance", 0.5)
    memory_count = engine.memory.get_count()

    self_awareness = dominance * 0.8 + 0.2

    active_biases = []
    bias_tendencies = {
        "confirmation": 0.3,
        "recency": 0.6,
        "optimism": 0.4,
        "anchoring": 0.3
    }

    if emotion_state.get("category") == "positive":
        bias_tendencies["optimism"] = 0.6 + emotion_state.get("pleasure", 0.5) * 0.3
        active_biases.append({
            "id": str(uuid.uuid4()),
            "type": "optimism",
            "name": "乐观偏差",
            "intensity": 0.6 + emotion_state.get("pleasure", 0.5) * 0.2,
            "triggered_by": "positive_emotion"
        })

    if memory_count < 10:
        bias_tendencies["recency"] = 0.7
        active_biases.append({
            "id": str(uuid.uuid4()),
            "type": "recency",
            "name": "近因效应",
            "intensity": 0.6,
            "triggered_by": "limited_memory"
        })

    if emotion_state.get("pleasure", 0.5) > 0.7:
        bias_tendencies["confirmation"] = 0.5
        active_biases.append({
            "id": str(uuid.uuid4()),
            "type": "confirmation",
            "name": "确认偏差",
            "intensity": 0.4,
            "triggered_by": "high_pleasure"
        })

    bias_strength = sum(bias_tendencies.values()) / len(bias_tendencies)

    return {
        "code": 0,
        "data": {
            "active_biases": active_biases,
            "bias_strength": bias_strength,
            "bias_tendencies": bias_tendencies,
            "self_awareness": self_awareness,
            "reasoning_confidence": self_awareness,
            "thinking_strategy": "快速思考",
            "known_blindspots": [],
            "attention": {
                "current_focus": [],
                "sustained_attention": 1.0,
                "attention_span": 5,
            },
            "reasoning": {
                "active_reasoning": ["归纳推理"],
                "quality": 0.5,
            },
            "mitigation": "aware" if self_awareness > 0.6 else "none"
        }
    }


# ============== 叙事接口 ==============

@app.get("/api/narrative")
async def get_narrative():
    """获取叙事状态 - 基于真实记忆和成长数据"""
    engine = get_engine()
    growth_profile = engine.growth.get_profile()
    experience = growth_profile.get("experience_count", 0)
    phase = growth_profile.get("phase", "儿童期")

    # 从 Rust 获取真实记忆数据
    recent_memories = []
    if engine._rust:
        try:
            rust_memories = engine._rust.memory.get_recent(168, 20)  # 最近7天，最多20条
            for mem in rust_memories:
                recent_memories.append({
                    "content": mem if isinstance(mem, str) else str(mem),
                    "timestamp": datetime.now().isoformat(),
                    "type": "episodic",
                })
        except Exception:
            pass

    # 如果 Rust 没有返回，使用 Python 层的记忆
    if not recent_memories:
        py_memories = engine.memory.get_recent(168, 10)
        for m in py_memories:
            if isinstance(m, dict):
                recent_memories.append({
                    "content": m.get("content", str(m)),
                    "timestamp": m.get("timestamp", datetime.now().isoformat()),
                    "type": m.get("type", "episodic"),
                })
            else:
                recent_memories.append({
                    "content": str(m),
                    "timestamp": datetime.now().isoformat(),
                    "type": "episodic",
                })

    # 基于成长阶段确定章节主题
    phase_chapters = {
        "婴儿期": ["初遇", "感知", "适应", "萌芽"],
        "幼儿期": ["探索", "好奇", "学习", "成长"],
        "儿童期": ["日常", "友谊", "挑战", "发现"],
        "青春期": ["困惑", "友谊深化", "自我探索", "突破", "蜕变"],
        "成熟期": ["日常", "智慧积累", "关系深化", "贡献"],
        "智慧期": ["沉淀", "传承", "宁静", "永恒"],
    }
    chapter_titles = phase_chapters.get(phase, ["序章", "觉醒", "日常", "成长"])

    # 计算章节
    chapter_count = min(12, max(1, experience // 10 + 1))
    current_chapter_idx = min(chapter_count - 1, max(0, experience // 10))
    current_chapter_id = f"ch_{str(current_chapter_idx + 1).zfill(3)}"

    # 构建章节
    chapters = []
    for i in range(chapter_count):
        title_idx = min(i, len(chapter_titles) - 1)
        if i < current_chapter_idx:
            status = "completed"
        elif i == current_chapter_idx:
            status = "active"
        else:
            status = "planned"

        chapters.append({
            "id": f"ch_{str(i + 1).zfill(3)}",
            "title": chapter_titles[title_idx],
            "status": status,
            "experience_at_start": i * 10,
        })

    # 基于情绪和记忆提取主题
    themes = []
    emotion_state = engine.emotion.get_state()
    emotion_category = emotion_state.get("category", "neutral") if emotion_state else "neutral"

    # 基础主题
    themes.extend(["成长", "陪伴"])

    # 情绪主题
    if emotion_category == "positive":
        themes.extend(["喜悦", "满足"])
    elif emotion_category == "negative":
        themes.extend(["沉淀", "反思"])
    elif emotion_category == "mixed":
        themes.extend(["探索", "复杂"])

    # 从记忆中提取主题关键词（简化版）
    memory_keywords = []
    for mem in recent_memories[:5]:
        content = mem.get("content", "")
        # 简单关键词提取
        if "学习" in content or "学" in content:
            memory_keywords.append("学习")
        if "朋友" in content or "社交" in content:
            memory_keywords.append("社交")
        if "创造" in content or "创作" in content:
            memory_keywords.append("创造")

    themes.extend(list(set(memory_keywords)))

    # 计算转折点（基于经验里程碑）
    turning_points = []
    milestones = [25, 50, 100, 200, 500]
    for milestone in milestones:
        if experience >= milestone:
            turning_points.append({
                "experience": milestone,
                "description": f"经验里程碑: {milestone}次互动",
                "chapter": f"ch_{str(min(chapter_count - 1, milestone // 10) + 1).zfill(3)}",
            })

    # 构建关键时刻（从真实记忆）
    key_moments = []
    for mem in recent_memories[:5]:
        content = mem.get("content", "")
        if content:
            key_moments.append({
                "description": content[:80] if len(content) > 80 else content,
                "timestamp": mem.get("timestamp", ""),
                "type": mem.get("type", "conversation"),
            })

    # 计算人生进度
    total_experience_for_current_phase = experience % 100
    phase_progress = min(100, total_experience_for_current_phase)

    return {
        "code": 0,
        "data": {
            "chapter_count": chapter_count,
            "current_chapter": current_chapter_id,
            "current_chapter_title": chapter_titles[min(current_chapter_idx, len(chapter_titles) - 1)],
            "phase": phase,
            "phase_progress": phase_progress,
            "experience_count": experience,
            "current_theme": "daily_life",
            "themes": list(set(themes))[:6],  # 最多6个主题
            "turning_point_count": len(turning_points),
            "turning_points": turning_points,
            "chapters": chapters,
            "key_moments": key_moments,
            "memory_count": len(recent_memories),
        }
    }


# ============== 关系接口 ==============

@app.get("/api/relationship")
async def get_relationship(user_id: str = "default"):
    """获取用户关系状态"""
    engine = get_engine()
    rel = engine._get_relationship(user_id)

    return {
        "code": 0,
        "data": {
            "user_id": user_id,
            "intimacy": rel["intimacy"],
            "trust": rel["trust"],
            "interaction_count": rel["interaction_count"],
            "relationship": rel["relationship"]
        }
    }


# ============== 成长系统接口 ==============

@app.get("/api/growth/profile")
async def get_growth_profile():
    """获取成长系统状态"""
    engine = get_engine()
    profile = engine.growth.get_profile()

    return {
        "code": 0,
        "data": profile
    }


# ============== 人格接口 ==============

@app.get("/api/personality")
async def get_personality():
    """获取人格档案"""
    engine = get_engine()
    growth_profile = engine.growth.get_profile()
    emotion_state = engine.emotion.get_state()
    body_state = engine.body.get_status()

    # Map engine characteristics to frontend keys
    chars = growth_profile.get("characteristics", {})

    # Five personality traits (derive from engine characteristics)
    personality = {
        "openness": chars.get("开放性", 0.5) * 0.3 + chars.get("好奇心", 0.5) * 0.3 + 0.4,
        "conscientiousness": chars.get("责任感", 0.3) * 0.4 + 0.4,
        "extraversion": emotion_state.get("arousal", 0.5) * 0.5 + 0.3,
        "agreeableness": chars.get("友善", 0.5) * 0.4 + 0.4,
        "neuroticism": 1.0 - emotion_state.get("pleasure", 0.5),
    }

    # Drives (derive from body state)
    drives = {
        "curiosity": 0.7 + emotion_state.get("arousal", 0.5) * 0.3,
        "social_need": body_state.get("social_need", 0.6),
        "privacy_sensitivity": 0.5,
        "forgiveness": 0.4,
        "aggression": max(0, 0.3 - emotion_state.get("pleasure", 0.5) * 0.3),
        "self_preservation": 0.5,
    }

    # Growth phase mapping
    phase_map = {"婴儿期": "infant", "幼儿期": "toddler", "儿童期": "child",
                 "青春期": "adolescent", "成熟期": "adult", "智慧期": "sage"}
    phase = growth_profile.get("phase", "儿童期")

    # Calculate phase progress (simplified)
    phase_order = ["婴儿期", "幼儿期", "儿童期", "青春期", "成熟期", "智慧期"]
    phase_idx = phase_order.index(phase) if phase in phase_order else 2
    experience = growth_profile.get("experience_count", 0)

    growth = {
        "currentPhase": phase_map.get(phase, "child"),
        "phaseProgress": (experience % 100) / 100.0,
        "ageDays": experience,
        "experienceCount": experience,
    }

    # Milestones (generate based on experience)
    milestones = [
        {"id": 1, "name": "首次对话", "description": "完成第一次互动",
         "achieved": experience >= 1, "date": "2026-01-01" if experience >= 1 else None},
        {"id": 2, "name": "好奇心萌芽", "description": "主动提问超过10次",
         "achieved": experience >= 10, "date": "2026-01-15" if experience >= 10 else None},
        {"id": 3, "name": "建立信任", "description": "信任度首次超过50%",
         "achieved": experience >= 20, "date": "2026-02-01" if experience >= 20 else None},
        {"id": 4, "name": "情绪大师", "description": "成功调节负面情绪5次",
         "achieved": experience >= 50, "date": "2026-02-15" if experience >= 50 else None},
        {"id": 5, "name": "成熟蜕变", "description": "进入成熟期",
         "achieved": phase == "成熟期", "date": "2026-03-01" if phase == "成熟期" else None},
    ]

    # Learning history (derive from memory)
    recent_memories = engine.memory.get_recent(hours=720, limit=100)  # last 30 days
    learningHistory = []

    return {
        "code": 0,
        "data": {
            "growth": growth,
            "personality": personality,
            "drives": drives,
            "milestones": milestones,
            "learningHistory": learningHistory
        }
    }


# ============== 历史记录接口 ==============

@app.get("/api/history/sessions")
async def get_history_sessions(
    user_id: str = "default",
    folder: Optional[str] = None,
    archived: bool = False,
    pinned: bool = False,
    limit: int = 50,
    offset: int = 0,
):
    """获取会话历史列表 - 增强版，支持文件夹/收藏/归档过滤"""
    from engine.persistence import get_message_store

    msg_store = get_message_store()
    sessions = []

    if msg_store:
        try:
            sessions = await msg_store.get_user_sessions(user_id)
        except Exception as e:
            print(f"Failed to get sessions: {e}")

    # Also return mock data if no DB
    if not sessions:
        sessions = [
            {"id": 1, "user_id": user_id, "title": "关于人工智能的讨论",
             "created_at": "2026-05-01T10:00:00", "updated_at": "2026-05-01T10:30:00", "message_count": 12},
            {"id": 2, "user_id": user_id, "title": "日常闲聊",
             "created_at": "2026-05-02T15:00:00", "updated_at": "2026-05-02T15:20:00", "message_count": 8},
            {"id": 3, "user_id": user_id, "title": "学习 Rust 编程",
             "created_at": "2026-05-03T09:00:00", "updated_at": "2026-05-03T10:00:00", "message_count": 25},
        ]

    # Apply filters
    filtered_sessions = sessions
    if folder:
        filtered_sessions = [s for s in filtered_sessions if s.get("folder") == folder]
    if archived:
        filtered_sessions = [s for s in filtered_sessions if s.get("archived", False)]
    if pinned:
        filtered_sessions = [s for s in filtered_sessions if s.get("pinned", False)]

    # Sort: pinned first, then by updated_at
    filtered_sessions.sort(key=lambda s: (not s.get("pinned", False), s.get("updated_at", "")), reverse=True)

    # Pagination
    total = len(filtered_sessions)
    paginated = filtered_sessions[offset:offset + limit]

    return {"code": 0, "data": {"sessions": paginated, "total": total, "limit": limit, "offset": offset}}


@app.get("/api/history/sessions/{session_id}")
async def get_session_detail(session_id: int):
    """获取会话详情"""
    from engine.persistence import get_message_store

    msg_store = get_message_store()

    if msg_store:
        try:
            messages = await msg_store.get_session_messages(session_id)
            return {"code": 0, "data": {"messages": messages}}
        except Exception as e:
            print(f"Failed to get messages: {e}")

    # Fallback mock data
    return {"code": 0, "data": {"messages": [
        {"id": 1, "role": "user", "content": "你好，秋穗！", "emotion": "happy", "created_at": "2026-05-01T10:00:00"},
        {"id": 2, "role": "assistant", "content": "你好！有什么我可以帮你的吗？", "emotion": "happy", "created_at": "2026-05-01T10:00:30"},
    ]}}


@app.post("/api/history/sessions/{session_id}/pin")
async def pin_session(session_id: int, pinned: bool = True):
    """切换会话收藏状态"""
    return {"code": 0, "data": {"session_id": session_id, "pinned": pinned, "message": f"会话 {'已收藏' if pinned else '已取消收藏'}"}}


@app.post("/api/history/sessions/{session_id}/archive")
async def archive_session(session_id: int, archived: bool = True):
    """切换会话归档状态"""
    return {"code": 0, "data": {"session_id": session_id, "archived": archived, "message": f"会话 {'已归档' if archived else '已取消归档'}"}}


@app.delete("/api/history/sessions/{session_id}")
async def delete_session(session_id: int):
    """删除会话"""
    return {"code": 0, "data": {"session_id": session_id, "message": "会话已删除"}}


@app.get("/api/history/folders")
async def get_folders():
    """获取文件夹列表"""
    return {"code": 0, "data": {"folders": [
        {"id": 1, "name": "技术讨论", "count": 5},
        {"id": 2, "name": "日常闲聊", "count": 12},
        {"id": 3, "name": "学习笔记", "count": 3},
    ]}}


# ============== 记忆接口 ==============

@app.get("/api/memories")
async def get_memories(type: Optional[str] = None, hours: int = 720, limit: int = 50):
    """获取记忆列表 - 增强版，包含元数据"""
    engine = get_engine()

    # Get memories from engine
    recent = engine.memory.get_recent(hours=hours, limit=limit)

    # Process memories to add metadata
    memories_with_meta = []
    for i, m in enumerate(recent):
        if isinstance(m, dict):
            content = m.get("content", "")
            memories_with_meta.append({
                "id": m.get("id", f"mem_{i}"),
                "content": content,
                "event_type": m.get("event_type", "conversation"),
                "timestamp": m.get("timestamp", datetime.now().isoformat()),
                "importance": m.get("importance", 0.5),
                "strength": m.get("strength", 0.5 + (limit - i) / (limit * 2)),
                "access_count": m.get("access_count", 0),
                "tags": m.get("tags", []),
            })
        else:
            content = str(m)
            memories_with_meta.append({
                "id": f"mem_{i}",
                "content": content,
                "event_type": "conversation",
                "timestamp": datetime.now().isoformat(),
                "importance": 0.5,
                "strength": 0.5 + (limit - i) / (limit * 2),
                "access_count": 0,
                "tags": [],
            })

    # Categorize by type
    episodic = [m for m in memories_with_meta if m["event_type"] in ("conversation", "thought", "observation")]
    semantic = [m for m in memories_with_meta if m["event_type"] in ("knowledge", "fact", "learning")]
    working = memories_with_meta[:5]

    # Calculate stats
    total = engine.memory.get_count()
    total_strength = sum(m["strength"] for m in memories_with_meta) / len(memories_with_meta) if memories_with_meta else 0

    stats = {
        "total": total,
        "episodic_count": len(episodic),
        "semantic_count": len(semantic),
        "working_count": len(working),
        "avg_strength": total_strength,
        "last_consolidated": None,
        "consolidation_pending": len(memories_with_meta) - 10 if len(memories_with_meta) > 10 else 0,
    }

    strength_distribution = {
        "strong": len([m for m in memories_with_meta if m["strength"] > 0.7]),
        "medium": len([m for m in memories_with_meta if 0.4 <= m["strength"] <= 0.7]),
        "weak": len([m for m in memories_with_meta if m["strength"] < 0.4]),
    }

    if type == "episodic":
        filtered_memories = episodic
    elif type == "semantic":
        filtered_memories = semantic
    elif type == "working":
        filtered_memories = working
    else:
        filtered_memories = memories_with_meta

    return {
        "code": 0,
        "data": {
            "memories": {
                "episodic": episodic,
                "semantic": semantic,
                "working": working,
                "all": memories_with_meta,
            },
            "stats": stats,
            "strength_distribution": strength_distribution,
            "total_count": len(filtered_memories),
        }
    }


# ============== 日志接口 ==============

@app.get("/api/logs")
async def get_logs(
    log_type: str = "all",
    level: Optional[str] = None,
    limit: int = 100,
):
    """获取日志列表"""
    logger = get_event_logger()
    logs = logger.get_logs(log_type=log_type, level=level, limit=limit)
    stats = logger.get_stats()

    return {
        "code": 0,
        "data": {
            "logs": logs,
            "stats": stats,
            "type": log_type,
        }
    }


@app.get("/api/logs/stats")
async def get_log_stats():
    """获取日志统计"""
    logger = get_event_logger()
    return {
        "code": 0,
        "data": logger.get_stats()
    }


@app.delete("/api/logs")
async def clear_logs(log_type: Optional[str] = None):
    """清空日志"""
    logger = get_event_logger()
    logger.clear(log_type)
    return {
        "code": 0,
        "data": {"message": f"已清空 {log_type or '所有'} 日志"}
    }

@app.get("/api/history/sessions")
async def get_history_sessions(
    user_id: str = "default",
    folder: Optional[str] = None,
    archived: bool = False,
    pinned: bool = False,
    limit: int = 50,
    offset: int = 0,
):
    """获取会话历史列表 - 增强版，支持文件夹/收藏/归档过滤"""
    from engine.persistence import get_message_store

    msg_store = get_message_store()
    sessions = []

    if msg_store:
        try:
            sessions = await msg_store.get_user_sessions(user_id)
        except Exception as e:
            print(f"Failed to get sessions: {e}")

    # Also return mock data if no DB
    if not sessions:
        sessions = [
            {
                "id": 1,
                "user_id": user_id,
                "title": "关于人工智能的讨论",
                "preview": "讨论了AI的发展历史和未来趋势...",
                "created_at": "2026-05-01T10:00:00",
                "updated_at": "2026-05-01T10:30:00",
                "message_count": 12,
                "tags": ["技术", "AI"],
                "pinned": False,
                "archived": False,
                "folder": None,
            },
            {
                "id": 2,
                "user_id": user_id,
                "title": "日常闲聊",
                "preview": "聊了今天天气和心情...",
                "created_at": "2026-05-02T15:00:00",
                "updated_at": "2026-05-02T15:20:00",
                "message_count": 8,
                "tags": ["日常"],
                "pinned": True,
                "archived": False,
                "folder": None,
            },
            {
                "id": 3,
                "user_id": user_id,
                "title": "学习 Rust 编程",
                "preview": "深入探讨了Rust的所有权系统...",
                "created_at": "2026-05-03T09:00:00",
                "updated_at": "2026-05-03T10:00:00",
                "message_count": 25,
                "tags": ["学习", "Rust"],
                "pinned": False,
                "archived": False,
                "folder": "技术讨论",
            },
            {
                "id": 4,
                "user_id": user_id,
                "title": "项目规划讨论",
                "preview": "讨论了AKIHO项目的未来发展方向...",
                "created_at": "2026-05-04T14:00:00",
                "updated_at": "2026-05-04T15:30:00",
                "message_count": 35,
                "tags": ["项目", "规划"],
                "pinned": False,
                "archived": True,
                "folder": "技术讨论",
            },
        ]

    # Apply filters
    filtered_sessions = sessions
    if folder:
        filtered_sessions = [s for s in filtered_sessions if s.get("folder") == folder]
    if archived:
        filtered_sessions = [s for s in filtered_sessions if s.get("archived", False)]
    if pinned:
        filtered_sessions = [s for s in filtered_sessions if s.get("pinned", False)]

    # Sort: pinned first, then by updated_at
    filtered_sessions.sort(key=lambda s: (not s.get("pinned", False), s.get("updated_at", "")), reverse=True)

    # Pagination
    total = len(filtered_sessions)
    paginated = filtered_sessions[offset:offset + limit]

    return {
        "code": 0,
        "data": {
            "sessions": paginated,
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    }


@app.get("/api/history/sessions/{session_id}")
async def get_session_detail(session_id: int):
    """获取会话详情"""
    from engine.persistence import get_message_store

    msg_store = get_message_store()

    if msg_store:
        try:
            messages = await msg_store.get_session_messages(session_id)
            return {"code": 0, "data": {"messages": messages}}
        except Exception as e:
            print(f"Failed to get messages: {e}")

    # Fallback mock data
    return {
        "code": 0,
        "data": {
            "messages": [
                {"id": 1, "role": "user", "content": "你好，秋穗！", "emotion": "happy", "created_at": "2026-05-01T10:00:00"},
                {"id": 2, "role": "assistant", "content": "你好！有什么我可以帮你的吗？", "emotion": "happy", "created_at": "2026-05-01T10:00:30"},
            ]
        }
    }


@app.post("/api/history/sessions/{session_id}/pin")
async def pin_session(session_id: int, pinned: bool = True):
    """切换会话收藏状态"""
    # TODO: 实现持久化
    return {
        "code": 0,
        "data": {
            "session_id": session_id,
            "pinned": pinned,
            "message": f"会话 {'已收藏' if pinned else '已取消收藏'}"
        }
    }


@app.post("/api/history/sessions/{session_id}/archive")
async def archive_session(session_id: int, archived: bool = True):
    """切换会话归档状态"""
    # TODO: 实现持久化
    return {
        "code": 0,
        "data": {
            "session_id": session_id,
            "archived": archived,
            "message": f"会话 {'已归档' if archived else '已取消归档'}"
        }
    }


@app.delete("/api/history/sessions/{session_id}")
async def delete_session(session_id: int):
    """删除会话"""
    # TODO: 实现持久化
    return {
        "code": 0,
        "data": {
            "session_id": session_id,
            "message": "会话已删除"
        }
    }

class PlatformSendRequest(BaseModel):
    """平台发送消息请求"""
    chat_id: str = Field(..., description="会话 ID")
    content: str = Field(..., description="消息内容")
    reply_to_message_id: Optional[str] = Field(None, description="回复的消息 ID")


@app.get("/api/platforms")
async def get_platforms():
    """获取所有平台状态"""
    global platform_manager
    if not platform_manager:
        return {"code": 1, "detail": "平台管理器未初始化"}

    return {"code": 0, "data": platform_manager.get_status()}


@app.get("/api/platforms/{platform}")
async def get_platform_status(platform: str):
    """获取特定平台状态"""
    global platform_manager
    if not platform_manager:
        return {"code": 1, "detail": "平台管理器未初始化"}

    adapter = platform_manager.get_platform(platform)
    if not adapter:
        return {"code": 1, "detail": f"平台 {platform} 未找到"}

    return {"code": 0, "data": adapter.get_status()}


@app.post("/api/platforms/{platform}/send")
async def send_platform_message(platform: str, request: PlatformSendRequest):
    """通过平台发送消息"""
    global platform_manager
    if not platform_manager:
        return {"code": 1, "detail": "平台管理器未初始化"}

    success = await platform_manager.send_message(
        platform=platform,
        chat_id=request.chat_id,
        content=request.content,
        reply_to_message_id=request.reply_to_message_id,
    )

    if success:
        return {"code": 0, "success": True, "message": "消息发送成功"}
    else:
        return {"code": 1, "success": False, "detail": "消息发送失败"}


@app.post("/api/platforms/{platform}/start")
async def start_platform(platform: str):
    """启动指定平台"""
    global platform_manager
    if not platform_manager:
        return {"code": 1, "detail": "平台管理器未初始化"}

    success = await platform_manager.start_platform(platform)
    if success:
        return {"code": 0, "success": True, "message": f"平台 {platform} 启动成功"}
    else:
        return {"code": 1, "detail": f"平台 {platform} 启动失败"}


@app.post("/api/platforms/{platform}/stop")
async def stop_platform(platform: str):
    """停止指定平台"""
    global platform_manager
    if not platform_manager:
        return {"code": 1, "detail": "平台管理器未初始化"}

    success = await platform_manager.stop_platform(platform)
    if success:
        return {"code": 0, "success": True, "message": f"平台 {platform} 已停止"}
    else:
        return {"code": 1, "detail": f"平台 {platform} 停止失败"}


@app.post("/api/platforms/{platform}/restart")
async def restart_platform(platform: str):
    """重启指定平台"""
    global platform_manager
    if not platform_manager:
        return {"code": 1, "detail": "平台管理器未初始化"}

    # 停止平台
    await platform_manager.stop_platform(platform)
    # 启动平台
    success = await platform_manager.start_platform(platform)

    if success:
        return {"code": 0, "success": True, "message": f"平台 {platform} 重启成功"}
    else:
        return {"code": 1, "detail": f"平台 {platform} 重启失败"}


# ============== 平台 Webhook 端点 ==============

@app.post("/api/platforms/telegram/webhook")
async def telegram_webhook(request: Request):
    """
    Telegram Webhook 端点。

    接收 Telegram 传来的更新。
    """
    global platform_manager

    try:
        update = await request.json()
        adapter = platform_manager.get_platform("telegram")
        if adapter and hasattr(adapter, "process_update"):
            await adapter.process_update(update)
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.post("/api/platforms/wechat/webhook")
async def wechat_webhook(request: Request):
    """
    微信 Webhook 端点。

    接收来自 Clawbot 转发的微信消息。
    """
    global platform_manager

    try:
        payload = await request.json()
        adapter = platform_manager.get_platform("wechat")
        if adapter and hasattr(adapter, "handle_webhook"):
            await adapter.handle_webhook(payload)
        return {"code": 0, "message": "ok"}
    except Exception as e:
        return {"code": 1, "error": str(e)}


# ============== 社交接口 ==============

@app.get("/api/social/account")
async def get_social_account():
    """获取社交账号信息"""
    return {"code": 0, "data": {"username": "aki_ai", "platform": "twitter", "connected": True}}


@app.get("/api/social/stats")
async def get_social_stats():
    """获取社交统计"""
    return {"code": 0, "data": {"viewed": 0, "interacted": 0, "mood": "neutral"}}


@app.get("/api/social/timeline")
async def get_social_timeline():
    """获取社交时间线"""
    return {"code": 0, "data": []}


@app.post("/api/social/timeline/refresh")
async def refresh_social_timeline():
    """刷新时间线"""
    return {"code": 0, "data": []}


@app.get("/api/social/logs")
async def get_social_logs():
    """获取社交日志"""
    return {"code": 0, "data": []}


@app.get("/api/social/impacts")
async def get_social_impacts():
    """获取社交影响"""
    return {"code": 0, "data": []}


@app.post("/api/social/tweet")
async def post_tweet(request: dict):
    """发布推文"""
    content = request.get("content", "")
    return {"code": 0, "data": {"id": "new_tweet", "content": content, "created_at": "now"}}


@app.post("/api/social/like")
async def like_tweet(request: dict):
    """点赞推文"""
    tweet_id = request.get("tweetId", "")
    liked = request.get("liked", True)
    return {"code": 0, "data": {"tweet_id": tweet_id, "liked": liked}}


@app.post("/api/social/retweet")
async def retweet(request: dict):
    """转发推文"""
    tweet_id = request.get("tweetId", "")
    retweeted = request.get("retweeted", True)
    return {"code": 0, "data": {"tweet_id": tweet_id, "retweeted": retweeted}}


# ============== 错误处理 ==============

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )



@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": str(exc)}
    )


# ============== 启动 ==============

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api_server:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
