"""
AKIHO 独立监控面板入口

运行此文件可直接打开监控面板
"""

import subprocess
import webbrowser
import time
import threading
from pathlib import Path

def main():
    print("=" * 50)
    print("AKIHO 监控面板")
    print("=" * 50)
    print()

    # 启动 API 服务器
    print("[1/2] 启动 API 服务器...")
    api_process = subprocess.Popen(
        ["python", "api_server.py"],
        cwd=Path(__file__).parent,
    )

    # 等待服务器启动
    print("      等待服务器启动...")
    time.sleep(2)

    # 打开浏览器
    print("[2/2] 打开监控面板...")
    webbrowser.open("http://localhost:8000/monitor")

    print()
    print("=" * 50)
    print("监控面板已打开: http://localhost:8000/monitor")
    print("按 Ctrl+C 停止服务器")
    print("=" * 50)

    # 等待用户终止
    try:
        api_process.wait()
    except KeyboardInterrupt:
        print("\n正在停止服务器...")
        api_process.terminate()
        api_process.wait()
        print("服务器已停止")

if __name__ == "__main__":
    main()
