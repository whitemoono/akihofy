#!/bin/bash

# AKIHO 启动脚本 (Linux/macOS)

echo "=========================================="
echo "  AKIHO 启动脚本"
echo "=========================================="
echo ""

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "[错误] 未找到 Python，请先安装 Python 3.10+"
    exit 1
fi

# 检查依赖
echo "[1/3] 检查依赖..."
if ! pip show fastapi &> /dev/null; then
    echo "      安装依赖中..."
    pip install -r requirements.txt
fi

if ! pip show edge-tts &> /dev/null; then
    echo "      安装 edge-tts..."
    pip install edge-tts
fi

echo ""
echo "[2/3] 检查配置文件..."
if [ ! -f ".env" ]; then
    echo "      提示: 未找到 .env 文件，将使用默认配置"
fi

echo ""
echo "=========================================="
echo "  启动服务"
echo "=========================================="
echo ""
echo "  前端页面: http://localhost:8000"
echo "  TTS 服务: http://localhost:8001"
echo ""
echo "  提示: 需要分别启动 main.py（对话引擎）才能使用完整功能"
echo ""
echo "=========================================="
echo ""

# 启动前端服务器
echo "[3/3] 启动前端服务器..."
python3 web_server.py &

# 启动 TTS 服务
python3 ts_server.py &

echo ""
echo "服务已启动！"
echo "正在打开浏览器..."

# 打开浏览器
if [[ "$OSTYPE" == "darwin"* ]]; then
    sleep 2
    open http://localhost:8000
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sleep 2
    xdg-open http://localhost:8000
fi
