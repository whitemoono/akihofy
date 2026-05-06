"""AKIHO API Server

FastAPI 后端服务，提供 REST API 和 WebSocket 接口
"""
import os
import json
import uuid
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, AsyncIterator
from datetime import datetime
import asyncio
import json

from engine.core import get_engine
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

@app.on_event("startup")
async def startup_event():
    """启动时初始化引擎"""
    engine = get_engine()
    await engine.start()


@app.on_event("shutdown")
async def shutdown_event():
    """关闭时停止引擎"""
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

    payload = {
        "model": request.model,
        "input": "这是一段测试文本，用于验证向量模型是否正常工作。"
    }

    try:
        start_time = time.time()
        async with httpx.AsyncClient(timeout=30.0) as client:
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
        engine.memory.store_conversation("", engine._character_name)

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


# ============== 意图接口 ==============

@app.get("/api/intent")
async def get_intent():
    """获取当前意图状态"""
    engine = get_engine()
    emotion_state = engine.emotion.get_state()
    arousal = emotion_state.get("arousal", 0.5)
    pleasure = emotion_state.get("pleasure", 0.5)
    category = emotion_state.get("category", "neutral")

    # Derive intent_type from emotion state
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

    # Build active intents based on emotion
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
    """获取当前欲望状态"""
    engine = get_engine()
    body_state = engine.body.get_status()
    emotion_state = engine.emotion.get_state()
    energy = body_state.get("energy", 50)
    arousal = emotion_state.get("arousal", 0.5)

    # Derive desires from body and emotion state
    active_desires = []

    # Curiosity is always ~0.7
    active_desires.append({
        "id": "curious",
        "name": "好奇心",
        "intensity": 0.7 + arousal * 0.2,
        "urgency": 0.6 + arousal * 0.2
    })

    # Social need based on energy
    if energy > 50:
        active_desires.append({
            "id": "social",
            "name": "社交",
            "intensity": 0.8,
            "urgency": 0.9
        })
    elif energy > 30:
        active_desires.append({
            "id": "social",
            "name": "社交",
            "intensity": 0.5,
            "urgency": 0.5
        })
    else:
        active_desires.append({
            "id": "social",
            "name": "社交",
            "intensity": 0.3,
            "urgency": 0.2
        })

    # Rest desire inversely proportional to energy
    if energy <= 30:
        active_desires.append({
            "id": "rest",
            "name": "休息",
            "intensity": 0.8,
            "urgency": 0.9
        })
    else:
        active_desires.append({
            "id": "rest",
            "name": "休息",
            "intensity": 0.4 - (energy - 30) / 100,
            "urgency": 0.3
        })

    # Create desire based on energy
    if energy > 50:
        active_desires.append({
            "id": "create",
            "name": "创造",
            "intensity": 0.5 + arousal * 0.3,
            "urgency": 0.4
        })

    # Explore desire based on arousal
    active_desires.append({
        "id": "explore",
        "name": "探索",
        "intensity": 0.6 + arousal * 0.3,
        "urgency": 0.5
    })

    # Determine primary desire
    primary_desire = "social"
    if energy <= 30:
        primary_desire = "rest"
    elif arousal > 0.7:
        primary_desire = "explore"

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
    """获取认知偏差状态"""
    engine = get_engine()
    emotion_state = engine.emotion.get_state()
    dominance = emotion_state.get("dominance", 0.5)
    memory_count = engine.memory.get_count()

    # Derive self_awareness from dominance (P.A.D model)
    self_awareness = dominance * 0.8 + 0.2

    # Build active biases based on state
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

    # Calculate bias strength from tendencies
    bias_strength = sum(bias_tendencies.values()) / len(bias_tendencies)

    return {
        "code": 0,
        "data": {
            "active_biases": active_biases,
            "bias_strength": bias_strength,
            "bias_tendencies": bias_tendencies,
            "self_awareness": self_awareness,
            "mitigation": "aware" if self_awareness > 0.6 else "none"
        }
    }


# ============== 叙事接口 ==============

@app.get("/api/narrative")
async def get_narrative():
    """获取叙事状态"""
    engine = get_engine()
    growth_profile = engine.growth.get_profile()
    experience = growth_profile.get("experience_count", 0)
    recent_memories = engine.memory.get_recent(24, 3)

    # Calculate chapter count based on experience
    chapter_count = min(10, max(1, experience // 10 + 1))
    current_chapter_idx = min(chapter_count - 1, max(0, experience // 10))
    current_chapter_id = f"ch_{str(current_chapter_idx + 1).zfill(3)}"

    # Chapter titles based on phase
    phase = growth_profile.get("phase", "儿童期")
    if phase in ["婴儿期", "幼儿期"]:
        chapter_titles = ["初遇", "适应", "成长", "探索"]
    elif phase in ["儿童期", "青春期"]:
        chapter_titles = ["初遇", "日常", "深化", "挑战", "突破", "蜕变"]
    else:
        chapter_titles = ["序章", "觉醒", "日常", "深化", "升华", "智慧", "永恒"]

    themes = ["成长", "陪伴"]
    if emotion_state := engine.emotion.get_state():
        if emotion_state.get("category") == "positive":
            themes.append("喜悦")
        elif emotion_state.get("category") == "negative":
            themes.append("沉淀")

    # Build chapters
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
            "status": status
        })

    # Calculate turning points (major milestones)
    turning_point_count = experience // 25

    # Build key moments from recent memories
    key_moments = []
    for m in recent_memories:
        if content := m.get("content", ""):
            key_moments.append({
                "description": content[:50],
                "timestamp": m.get("timestamp", ""),
                "type": m.get("event_type", "conversation")
            })

    return {
        "code": 0,
        "data": {
            "chapter_count": chapter_count,
            "current_chapter": current_chapter_id,
            "current_theme": "daily_life",
            "themes": themes,
            "turning_point_count": turning_point_count,
            "chapters": chapters,
            "key_moments": key_moments
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
async def get_history_sessions(user_id: str = "default"):
    """获取会话历史列表"""
    engine = get_engine()
    db = engine._db
    sessions = []

    if db:
        try:
            rows = await db.fetch_all(
                "SELECT id, user_id, title, created_at, updated_at, message_count "
                "FROM chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 50",
                user_id
            )
            sessions = [dict(r) for r in rows]
        except Exception:
            sessions = []

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

    return {"code": 0, "data": {"sessions": sessions}}


@app.get("/api/history/sessions/{session_id}")
async def get_session_detail(session_id: int):
    """获取会话详情"""
    engine = get_engine()
    db = engine._db

    if db:
        try:
            messages = await db.fetch_all(
                "SELECT id, role, content, emotion, created_at FROM chat_messages "
                "WHERE session_id = $1 ORDER BY created_at",
                session_id
            )
            return {"code": 0, "data": {"messages": [dict(m) for m in messages]}}
        except Exception:
            pass

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


@app.get("/api/history/folders")
async def get_folders():
    """获取文件夹列表"""
    return {
        "code": 0,
        "data": {
            "folders": [
                {"id": 1, "name": "技术讨论", "count": 5},
                {"id": 2, "name": "日常闲聊", "count": 12},
                {"id": 3, "name": "学习笔记", "count": 3},
            ]
        }
    }


# ============== 记忆接口 ==============

@app.get("/api/memories")
async def get_memories(type: Optional[str] = None):
    """获取记忆列表"""
    engine = get_engine()

    # Get recent memories from engine
    recent = engine.memory.get_recent(hours=720, limit=50)

    # Categorize by type (simplified - all are episodic for now)
    episodic = [m for m in recent if m.get("event_type") == "conversation"]
    semantic = [m for m in recent if m.get("event_type") == "knowledge"]
    working = engine.memory.get_working_memory()

    # Stats
    stats = {
        "total": engine.memory.get_count(),
        "episodic": len(episodic),
        "semantic": len(semantic),
        "working": len(working),
        "lastConsolidated": "2026-05-06T00:00:00"
    }

    if type == "episodic":
        memories = episodic
    elif type == "semantic":
        memories = semantic
    elif type == "working":
        memories = working
    else:
        memories = episodic + semantic + working

    return {
        "code": 0,
        "data": {
            "memories": {
                "episodic": episodic[:20],
                "semantic": semantic[:20],
                "working": working[:10]
            },
            "stats": stats
        }
    }


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
