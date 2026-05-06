"""
AKIHO TTS 服务 - 基于 Edge TTS

使用微软 Edge 浏览器的语音合成引擎，提供高质量的中文语音合成
"""

import os
import uuid
from pathlib import Path
from typing import Optional

try:
    import edge_tts
    EDGE_TTS_AVAILABLE = True
except ImportError:
    EDGE_TTS_AVAILABLE = False
    print("Warning: edge-tts not installed. Run: pip install edge-tts")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import uvicorn

# ========================================
# 配置
# ========================================

AUDIO_DIR = Path("web/assets/audio")
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# 支持的语音列表
VOICES = {
    "yixia": "zh-CN-XiaoyiNeural",
    "xiaobai": "zh-CN-XiaobaiNeural",
    "yunjian": "zh-CN-YunjianNeural",
    "yunxi": "zh-CN-YunxiNeural",
    "xiaoxiao": "zh-CN-XiaoxiaoNeural",
    "yuyang": "zh-CN-YuyangNeural",
}

DEFAULT_VOICE = "zh-CN-XiaobaiNeural"
DEFAULT_RATE = "+0%"
DEFAULT_PITCH = "+0Hz"

# ========================================
# FastAPI 应用
# ========================================

app = FastAPI(title="AKIHO TTS Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========================================
# 请求模型
# ========================================

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = DEFAULT_VOICE
    rate: Optional[str] = DEFAULT_RATE
    pitch: Optional[str] = DEFAULT_PITCH
    output_format: Optional[str] = "audio-24khz-48kbitrate-mono-mp3"

class VoiceListItem(BaseModel):
    id: str
    name: str
    gender: str
    locale: str

# ========================================
# 路由
# ========================================

@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "AKIHO TTS",
        "version": "1.0.0",
        "edge_tts_available": EDGE_TTS_AVAILABLE
    }

@app.get("/voices")
async def list_voices():
    voices = []
    for key, voice_id in VOICES.items():
        gender = "Female" if "Neural" in voice_id else "Male"
        voices.append(VoiceListItem(
            id=key,
            name=voice_id,
            gender=gender,
            locale="zh-CN"
        ))
    return {"code": 0, "message": "success", "data": {"voices": voices}}

@app.post("/tts")
async def text_to_speech(request: TTSRequest):
    if not EDGE_TTS_AVAILABLE:
        raise HTTPException(status_code=503, detail="edge-tts not installed")

    if not request.text or len(request.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="text cannot be empty")

    if len(request.text) > 500:
        raise HTTPException(status_code=400, detail="text too long (max 500 characters)")

    voice = request.voice if request.voice in VOICES.values() else DEFAULT_VOICE
    filename = f"{uuid.uuid4().hex}.mp3"
    filepath = AUDIO_DIR / filename

    try:
        communicate = edge_tts.Communicate(
            request.text,
            voice,
            rate=request.rate,
            pitch=request.pitch
        )
        await communicate.save(str(filepath))

        file_size = filepath.stat().st_size
        duration = len(request.text) / 4.5

        return JSONResponse({
            "code": 0,
            "message": "success",
            "data": {
                "audio_url": f"http://localhost:8000/assets/audio/{filename}",
                "filename": filename,
                "duration": round(duration, 2),
                "size": file_size,
                "voice": voice
            }
        })

    except Exception as e:
        if filepath.exists():
            filepath.unlink()
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")

@app.get("/audio/{filename}")
async def get_audio(filename: str):
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    filepath = AUDIO_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    return FileResponse(filepath, media_type="audio/mpeg", filename=filename)

@app.delete("/audio/{filename}")
async def delete_audio(filename: str):
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    filepath = AUDIO_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    filepath.unlink()
    return {"code": 0, "message": "success"}

@app.post("/cleanup")
async def cleanup_old_files(max_age_hours: int = 24):
    import time

    current_time = time.time()
    max_age_seconds = max_age_hours * 3600
    deleted_count = 0

    for file in AUDIO_DIR.glob("*.mp3"):
        if current_time - file.stat().st_mtime > max_age_seconds:
            file.unlink()
            deleted_count += 1

    return {"code": 0, "message": "success", "data": {"deleted_count": deleted_count}}

# ========================================
# 启动
# ========================================

def main():
    print("=" * 50)
    print("AKIHO TTS Service")
    print("=" * 50)
    print(f"Audio directory: {AUDIO_DIR.absolute()}")
    print(f"Edge TTS available: {EDGE_TTS_AVAILABLE}")
    print()
    print("Available voices:")
    for key, voice_id in VOICES.items():
        print(f"  {key}: {voice_id}")
    print()
    print("Starting server on http://localhost:8001")
    print("=" * 50)

    uvicorn.run(app, host="0.0.0.0", port=8001)

if __name__ == "__main__":
    main()
