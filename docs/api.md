# AKIHO API 文档

## 概述

AKIHO 提供 RESTful API 接口，支持对话、念头生成、记忆管理和状态查询。

## 基础信息

- **Base URL**: `http://localhost:8000/api/v1`
- **Content-Type**: `application/json`
- **认证方式**: `X-API-Key` Header

## 通用响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码，0=成功 |
| message | string | 消息 |
| data | object | 数据 |

---

## 对话接口

### 发送消息

```
POST /chat
```

**请求体**

```json
{
  "message": "你好呀",
  "user_id": "user_001"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | string | 是 | 用户消息 |
| user_id | string | 是 | 用户标识 |

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "reply": "哼，谁要你好呀...",
    "mood": "happy",
    "energy": 0.85,
    "thought": "这个人...好像挺真诚的",
    "intent": {
      "intent_type": "connect",
      "intensity": 0.6,
      "commitment": 0.7
    },
    "autonomy_level": 0.75,
    "commitment_strength": 0.8
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| reply | string | AKIHO 的回复 |
| mood | string | 当前情绪状态 |
| energy | float | 能量值 0-1 |
| thought | string | 伴随的念头 |
| intent | object | 当前意图状态（新增） |
| autonomy_level | float | 自主性水平（新增） |
| commitment_strength | float | 承诺强度（新增） |

---

## 念头接口

### 获取当前念头

```
GET /thought
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "thought": "外面的雨声好吵...",
    "type": "reflection",
    "intensity": 0.6,
    "intent_type": "curious",
    "desire_source": "curiosity"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| thought | string | 念头内容 |
| type | string | 类型：reflection/memory/desire |
| intensity | float | 强度 0-1 |
| intent_type | string | 关联的意图类型（新增） |
| desire_source | string | 欲望来源（新增） |

---

## 意图接口（新增）

### 获取当前意图状态

```
GET /intent
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "current_intent": {
      "id": "intent_001",
      "intent_type": "want",
      "target": "和他聊天",
      "intensity": 0.75,
      "commitment_strength": 0.8,
      "created_at": "2026-05-06T03:00:00Z"
    },
    "active_intents": [
      {
        "id": "intent_001",
        "intent_type": "want",
        "target": "和他聊天",
        "intensity": 0.75
      }
    ],
    "intent_history": []
  }
}
```

### 获取活跃欲望列表

```
GET /desires
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "active_desires": [
      {
        "name": "社交",
        "intensity": 0.7,
        "threshold": 0.5,
        "urgency": 0.8
      },
      {
        "name": "休息",
        "intensity": 0.4,
        "threshold": 0.5,
        "urgency": 0.3
      }
    ],
    "dominant_desire": "社交"
  }
}
```

---

## 叙事接口（新增）

### 获取人生叙事摘要

```
GET /narrative
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "chapter_count": 5,
    "current_chapter": "关于信任的篇章",
    "themes": ["成长", "信任", "孤独"],
    "turning_point_count": 3,
    "life_summary": "我已经走过了5个人生篇章。贯穿我生命的主题是：成长、信任、孤独。",
    "recent_story": "今天我学会了相信自己的判断..."
  }
}
```

### 获取认知偏差状态

```
GET /cognitive-bias
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "active_biases": [
      {
        "type": "confirmation",
        "intensity": 0.7,
        "triggered_by": "关于他的话题"
      }
    ],
    "bias_tendencies": {
      "confirmation": 0.6,
      "optimism": 0.5,
      "anchoring": 0.4
    }
  }
}
```

---

## 记忆接口

### 查询记忆

```
GET /memory
```

**Query 参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| query | string | 搜索关键词 |
| limit | int | 返回数量，默认10 |

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "memories": [
      {
        "id": "mem_001",
        "content": "那天我们聊到了深夜...",
        "timestamp": "2026-04-29T22:30:00",
        "emotion": "warm"
      }
    ]
  }
}
```

### 添加记忆

```
POST /memory
```

**请求体**

```json
{
  "content": "今天他夸我了",
  "emotion": "happy",
  "importance": 0.8
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | string | 是 | 记忆内容 |
| emotion | string | 否 | 关联情绪 |
| importance | float | 否 | 重要程度 0-1 |

---

## 状态接口

### 获取状态

```
GET /status
```

**响应**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "mood": "content",
    "energy": 0.75,
    "intimacy": 0.65,
    "privacy_openness": 0.3,
    "consecutive_days": 15,
    "last_interaction": "2026-04-30T23:00:00",
    "autonomy_level": 0.8,
    "commitment_strength": 0.65,
    "dominant_desire": "social"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| mood | string | 当前情绪 |
| energy | float | 能量值 0-1 |
| intimacy | float | 亲密度 0-1 |
| privacy_openness | float | 隐私开放度 0-1 |
| consecutive_days | int | 连续互动天数 |
| last_interaction | string | 最后互动时间 |
| autonomy_level | float | 自主性水平 0-1（新增） |
| commitment_strength | float | 当前承诺强度 0-1（新增） |
| dominant_desire | string | 主导欲望类型（新增） |

---

## 自主系统接口

### 获取驱动系统状态

```
GET /api/drives
```

**响应**

```json
{
  "code": 0,
  "data": {
    "tensions": {
      "好奇心": 0.65,
      "归属需求": 0.45,
      "能力需求": 0.35,
      "自主需求": 0.40,
      "意义需求": 0.25
    },
    "dominant": "好奇心",
    "triggered": [
      {"name": "好奇心", "tension": 0.65, "threshold": 0.5}
    ],
    "total_tension": 0.42,
    "count": 5
  }
}
```

### 获取思考状态

```
GET /api/thinking
```

**响应**

```json
{
  "code": 0,
  "data": {
    "action": "idle",
    "query": null,
    "topic": null,
    "active_intents": [],
    "intent_count": 0
  }
}
```

### 获取认知偏差状态

```
GET /api/cognitive-bias
```

**响应**

```json
{
  "code": 0,
  "data": {
    "active_biases": [
      {"id": "xxx", "type": "confirmation", "name": "确认偏差", "intensity": 0.4}
    ],
    "bias_strength": 0.35,
    "bias_tendencies": {
      "confirmation": 0.3,
      "recency": 0.5,
      "optimism": 0.3,
      "anchoring": 0.2
    },
    "self_awareness": 0.6,
    "reasoning_confidence": 0.5,
    "thinking_strategy": "快速思考",
    "known_blindspots": [],
    "attention": {
      "current_focus": [],
      "sustained_attention": 1.0,
      "attention_span": 5
    },
    "reasoning": {
      "active_reasoning": ["归纳推理"],
      "quality": 0.5
    },
    "mitigation": "aware"
  }
}
```

### 获取日志

```
GET /api/logs?log_type=all&limit=100
```

**响应**

```json
{
  "code": 0,
  "data": {
    "logs": [
      {
        "id": "xxx",
        "timestamp": "2026-05-07T10:30:00",
        "type": "system",
        "level": "info",
        "message": "系统启动完成",
        "details": {}
      }
    ],
    "stats": {
      "system": {"total": 100, "error": 0, "warning": 5},
      "behavior": {"total": 50},
      "emotion": {"total": 200},
      "conversation": {"total": 500}
    },
    "type": "all"
  }
}
```

### 获取会话历史

```
GET /api/history/sessions?folder=技术讨论&pinned=false&limit=50
```

**响应**

```json
{
  "code": 0,
  "data": {
    "sessions": [
      {
        "id": 1,
        "user_id": "default",
        "title": "关于 AI 的讨论",
        "preview": "讨论了 AI 发展...",
        "created_at": "2026-05-01T10:00:00",
        "updated_at": "2026-05-01T10:30:00",
        "message_count": 12,
        "tags": ["技术", "AI"],
        "pinned": false,
        "archived": false,
        "folder": "技术讨论"
      }
    ],
    "total": 20,
    "limit": 50,
    "offset": 0
  }
}
```

---

## 错误码

| 码 | 说明 |
|----|------|
| 0 | 成功 |
| 1001 | 缺少必填参数 |
| 1002 | 参数格式错误 |
| 2001 | LLM 服务不可用 |
| 2002 | LLM 响应超时 |
| 3001 | 记忆存储错误 |
| 4001 | AKIHO 正在休息 |
| 4002 | 触及隐私边界 |

---

## SDK 示例

### Python

```python
import requests

AKIHO_API = "http://localhost:8000/api/v1"

def chat(message, user_id="user_001"):
    resp = requests.post(f"{AKIHO_API}/chat", json={
        "message": message,
        "user_id": user_id
    })
    return resp.json()["data"]

# 使用
reply = chat("你好呀")
print(reply["reply"])
```

### JavaScript

```javascript
const AKIHO_API = "http://localhost:8000/api/v1";

async function chat(message, userId = "user_001") {
  const resp = await fetch(`${AKIHO_API}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, user_id: userId })
  });
  return (await resp.json()).data;
}

// 使用
const reply = await chat("你好呀");
console.log(reply.reply);
```
