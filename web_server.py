"""
AKIHO Web 静态文件服务器

同时托管前端页面和音频文件
"""

import os
import uuid
import asyncio
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
import uvicorn

# ========================================
# 配置
# ========================================

WEB_DIR = Path("web")
PARTICLE_IMAGES_DIR = WEB_DIR / "assets" / "particle-images"
PORT = 8000

# 确保上传目录存在
PARTICLE_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

# ========================================
# FastAPI 应用
# ========================================

app = FastAPI(title="AKIHO Web", version="1.0.0")

# 托管静态文件
if WEB_DIR.exists():
    app.mount("/assets/models", StaticFiles(directory=str(WEB_DIR / "assets" / "models")), name="models")
    app.mount("/assets/audio", StaticFiles(directory=str(WEB_DIR / "assets" / "audio")), name="audio")
    app.mount("/assets/particle-images", StaticFiles(directory=str(PARTICLE_IMAGES_DIR)), name="particle-images")

# ========================================
# 页面路由
# ========================================

@app.get("/", response_class=HTMLResponse)
async def index():
    """主页面"""
    html_path = WEB_DIR / "index.html"
    if html_path.exists():
        return FileResponse(html_path)
    return HTMLResponse(content="<h1>AKIHO Web Interface</h1><p>index.html not found</p>")

@app.get("/favicon.ico")
async def favicon():
    """网站图标"""
    return HTMLResponse(content="")

# ========================================
# 文件上传 API
# ========================================

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@app.post("/api/upload/particle-image")
async def upload_particle_image(file: UploadFile = File(...)):
    """上传粒子效果图片"""
    # 验证文件类型
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型: {file.content_type}。支持的类型: PNG, JPEG, GIF, WebP"
        )

    # 读取文件内容
    content = await file.read()

    # 验证文件大小
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"文件过大。最大支持 {MAX_FILE_SIZE // (1024 * 1024)}MB"
        )

    # 生成唯一文件名
    ext = os.path.splitext(file.filename)[1] or ".png"
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = PARTICLE_IMAGES_DIR / unique_filename

    # 保存文件
    with open(file_path, "wb") as f:
        f.write(content)

    # 返回访问 URL
    url = f"/assets/particle-images/{unique_filename}"

    return JSONResponse({
        "code": 0,
        "message": "上传成功",
        "url": url,
        "filename": unique_filename
    })

# ========================================
# 启动
# ========================================

def main():
    print("=" * 50)
    print("AKIHO Web Server")
    print("=" * 50)
    print(f"Web directory: {WEB_DIR.absolute()}")
    print(f"URL: http://localhost:{PORT}")
    print("=" * 50)

    uvicorn.run(app, host="0.0.0.0", port=PORT)

if __name__ == "__main__":
    main()
