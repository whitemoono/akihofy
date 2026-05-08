import os
import json
from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache


def load_config_json() -> dict:
    """从 config.json 加载配置"""
    config_path = Path(__file__).parent / "config.json"
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


class Settings(BaseSettings):
    # 应用配置
    app_name: str = "AKIHO"
    debug: bool = True
    api_version: str = "v1"

    # 服务器配置
    host: str = "0.0.0.0"
    port: int = 8000

    # LLM 配置
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    deepseek_api_key: str = os.getenv("DEEPSEEK_API_KEY", "")
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")

    # LLM 模型配置
    default_model: str = "gpt-4-turbo-preview"
    chat_model: str = "gpt-4-turbo-preview"
    embedding_model: str = "text-embedding-3-small"

    # 数据库配置
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/akiho"
    )
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # ChromaDB 配置
    chroma_host: str = "localhost"
    chroma_port: int = 8000

    # 安全配置
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    access_token_expire_minutes: int = 60 * 24  # 24小时

    # 日志配置
    log_level: str = "INFO"
    log_file: str = "logs/akiho.log"

    # 功能开关
    enable_websocket: bool = True
    enable_cors: bool = True
    enable_rate_limit: bool = True

    # 缓存配置
    cache_ttl: int = 300  # 5分钟
    prompt_cache_ttl: int = 3600  # 1小时

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "allow"

    def get_embedding_config(self) -> dict:
        """从 config.json 获取 embedding 配置"""
        config = load_config_json()
        return config.get("embedding", {})


@lru_cache()
def get_settings() -> Settings:
    return Settings()
