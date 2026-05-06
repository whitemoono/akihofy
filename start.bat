@echo off
chcp 65001 >nul
echo ==========================================
echo   AKIHO 启动脚本
echo ==========================================
echo.

:: 检查 Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Python，请先安装 Python 3.10+
    pause
    exit /b 1
)

:: 检查依赖
echo [1/3] 检查依赖...
pip show fastapi >nul 2>&1
if errorlevel 1 (
    echo        安装依赖中...
    pip install -r requirements.txt
)

pip show edge-tts >nul 2>&1
if errorlevel 1 (
    echo        安装 edge-tts...
    pip install edge-tts
)

echo.
echo [2/3] 检查配置文件...
if not exist ".env" (
    echo        提示: 未找到 .env 文件，将使用默认配置
)

echo.
echo ==========================================
echo   启动服务
echo ==========================================
echo.
echo   前端页面: http://localhost:8000
echo   TTS 服务: http://localhost:8001
echo.
echo   提示: 需要分别启动 main.py（对话引擎）才能使用完整功能
echo.
echo ==========================================
echo.

:: 启动前端服务器
echo [3/3] 启动前端服务器...
start "AKIHO Web" python web_server.py

:: 启动 TTS 服务
start "AKIHO TTS" python ts_server.py

echo.
echo 服务已启动！
echo 按任意键打开浏览器...
pause >nul

start http://localhost:8000
