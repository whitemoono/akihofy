# AKIHO Engine - 可热切换生成器系统

## 快速开始

### 1. 启动监控面板

```bash
python monitor.py
```

这将自动启动 API 服务器并打开监控面板。

### 2. 手动启动 API 服务器

```bash
python api_server.py
```

然后访问：
- API 地址: http://localhost:8000
- 监控面板: http://localhost:8000/monitor
- WebSocket: ws://localhost:8000/ws

### 3. 直接运行测试

```bash
cd engine
python -c "
from generators import RuleBasedGenerator, GenerationContext

gen = RuleBasedGenerator()
ctx = GenerationContext(
    user_message='你好呀',
    current_mood='happy',
    intimacy=0.6,
    relationship='friend'
)
result = gen.generate(ctx)
print(f'回复: {result.text}')
print(f'生成器: {result.generator_type.value}')
"
```

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    AKIHO Engine                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                    API Server                       │  │
│  │  - REST API (状态、对话、生成器管理)                │  │
│  │  - WebSocket (实时状态推送)                        │  │
│  │  - Monitor UI (内置 HTML 监控面板)                  │  │
│  └─────────────────────────────────────────────────────┘  │
│                            ↓                               │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                   Engine Core                       │  │
│  │  - 状态管理 (情绪、关系、生理)                      │  │
│  │  - 行为日志                                         │  │
│  │  - 生成器热切换                                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                            ↓                               │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                 Generator Layer                      │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │  │
│  │  │   Rule   │ │  Local   │ │   API    │           │  │
│  │  │ (规则引擎)│ │ (Ollama) │ │ (DeepSeek│           │  │
│  │  └──────────┘ └──────────┘ └──────────┘           │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## API 接口

### 状态接口

```bash
# 获取完整状态
GET /api/state

# 获取简化状态
GET /api/state/simple
```

### 生成器管理

```bash
# 切换生成器
POST /api/generator/switch
Body: {"generator": "rule"}

# 获取当前生成器信息
GET /api/generator/info

# 列出所有生成器
GET /api/generator/list
```

### 对话接口

```bash
# 发送消息
POST /api/chat
Body: {"message": "你好呀"}

# 对比测试
POST /api/compare
Body: {"message": "你好呀", "generators": ["rule", "local", "api"]}
```

### WebSocket

```javascript
const ws = new WebSocket('ws://localhost:8000/ws');
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'state') {
        console.log('状态更新:', data.data);
    }
};
```

## 生成器说明

### Rule (规则引擎)
- 零依赖，完全本地运行
- 基于关键词和模板生成
- 响应速度最快
- 适合快速测试

### Local (本地模型)
- 需要安装 Ollama
- 支持 qwen、llama 等模型
- 需要 4-8GB RAM

### API (云端)
- 需要 API Key
- 支持 DeepSeek、硅基流动等
- 效果最好，需要网络

## 下一步

1. 测试规则引擎效果
2. 安装 Ollama 并测试本地模型
3. 配置 API Key 测试云端效果
4. 根据效果选择适合的方案
