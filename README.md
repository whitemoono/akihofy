# AKIHO - AI Companion Core Engine

基于 Python + Rust 的 AI 角色引擎，支持情绪、记忆、行为决策等核心能力。

## 特性

- 情绪系统 - 基于 PAD 模型的实时情绪引擎
- 记忆系统 - 情景记忆 + 语义记忆 + 向量检索
- 行为决策 - 马斯洛需求驱动的行为选择
- 人格成长 - 动态演化的性格特征
- 高性能 - Python 胶水层 + Rust 核心引擎

## 技术栈

- **核心引擎**: Python + Rust (akiho-core)
- **Web 框架**: FastAPI
- **LLM**: OpenAI / DeepSeek / Claude
- **数据库**: PostgreSQL + Redis
- **容器化**: Docker + Docker Compose

## 快速开始

### Docker 部署（推荐）

```bash
# 1. 复制环境变量
cp .env.example .env

# 2. 编辑 .env，填入 API keys
# DEEPSEEK_API_KEY=your_key_here

# 3. 启动所有服务
docker-compose up -d

# 4. 访问
# 前端: http://localhost:5173
# API: http://localhost:8000
```

详细说明见 [DOCKER.md](DOCKER.md)

### 手动部署

```bash
# 安装依赖
pip install -r requirements.txt

# 配置
cp .env.example .env
# 编辑 .env

# 启动服务
uvicorn api_server:app --reload
```

## 项目结构

```
AKIHO/
├── engine/           # Python 引擎核心
├── akiho-core/      # Rust 核心库
├── api_server.py    # FastAPI 服务
├── web/             # 前端 React
├── docs/            # 设计文档
└── docker/          # Docker 配置
```

## 文档

- [架构设计](docs/subsystem_design/00_architecture.md)
- [Docker 部署指南](DOCKER.md)
- [子系统索引](docs/subsystem_design/README.md)

## API

启动服务后访问 http://localhost:8000/docs 查看交互式 API 文档。

### 主要接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/api/chat` | POST | 聊天接口 |
| `/api/emotion` | GET | 获取情绪状态 |
| `/api/memory` | GET | 获取记忆 |
| `/api/status` | GET | 获取完整状态 |
| `/ws/status` | WS | 实时状态推送 |
| `/ws/chat` | WS | WebSocket 聊天 |

## License

MIT
