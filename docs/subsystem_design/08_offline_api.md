# 离线处理层详细设计

> **对应设计文档章节**: 十（离线处理层）
> **优先级**: P3

---

## 一、设计目标

构建后台任务处理系统，支持：
- 定时任务调度
- 异步任务队列
- 任务优先级管理
- 后台处理

---

## 二、任务调度器

### 2.1 任务类型

```rust
#[derive(Debug, Clone)]
pub enum TaskType {
    Periodic {
        interval: Duration,
    },
    Scheduled {
        at: DateTime,
    },
    Delayed {
        delay: Duration,
    },
    Background,
}

pub struct Task {
    pub id: String,
    pub name: String,
    pub task_type: TaskType,
    pub priority: TaskPriority,
    pub handler: TaskHandler,
    pub retry_policy: RetryPolicy,
    pub created_at: DateTime,
}

impl Task {
    pub fn new(name: String, task_type: TaskType) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            task_type,
            priority: TaskPriority::Normal,
            handler: TaskHandler::default(),
            retry_policy: RetryPolicy::default(),
            created_at: Utc::now(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum TaskPriority {
    Low,
    Normal,
    High,
    Critical,
}
```

### 2.2 调度器实现

```rust
pub struct TaskScheduler {
    tasks: HashMap<String, Task>,
    periodic_tasks: Vec<String>,
    scheduled_tasks: BinaryHeap<ScheduledTask>,
    queue: PriorityQueue<Task>,
}

impl TaskScheduler {
    pub fn new() -> Self {
        Self {
            tasks: HashMap::new(),
            periodic_tasks: Vec::new(),
            scheduled_tasks: BinaryHeap::new(),
            queue: PriorityQueue::new(),
        }
    }

    pub fn schedule_periodic<F>(&mut self, name: String, interval: Duration, handler: F)
    where F: Fn() + Send + Sync + 'static {
        let mut task = Task::new(name.clone(), TaskType::Periodic { interval });
        task.handler = Arc::new(handler);
        self.tasks.insert(name.clone(), task);
        self.periodic_tasks.push(name);
    }

    pub fn schedule_once(&mut self, task: Task) {
        if let TaskType::Scheduled { at } = task.task_type {
            self.scheduled_tasks.push(ScheduledTask {
                task_id: task.id.clone(),
                scheduled_at: at,
            });
        }
        self.tasks.insert(task.id.clone(), task);
    }

    pub fn enqueue(&mut self, task: Task) {
        self.queue.push(task, task.priority);
    }

    pub fn get_next_ready(&mut self) -> Option<Task> {
        // 检查定时任务
        if let Some(scheduled) = self.scheduled_tasks.peek() {
            if scheduled.scheduled_at <= Utc::now() {
                let scheduled = self.scheduled_tasks.pop().unwrap();
                return self.tasks.remove(&scheduled.task_id);
            }
        }

        // 检查队列
        self.queue.pop().map(|(task, _)| task)
    }
}
```

---

## 二、API 优化策略

### 2.1 缓存策略

```python
# engine/cache.py
import redis
import json
from functools import wraps

class LLMCache:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.ttl = 3600  # 1小时

    def _make_key(self, messages: list, model: str) -> str:
        content = json.dumps(messages, sort_keys=True)
        return f"llm:cache:{hash(content)}:{model}"

    async def get(self, messages: list, model: str) -> Optional[str]:
        key = self._make_key(messages, model)
        cached = self.redis.get(key)
        if cached:
            return cached.decode()
        return None

    async def set(self, messages: list, model: str, response: str):
        key = self._make_key(messages, model)
        self.redis.setex(key, self.ttl, response)

class ResponseCache:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def _make_key(self, user_id: str, intent: str) -> str:
        return f"response:{user_id}:{intent}"

    async def get(self, user_id: str, intent: str) -> Optional[dict]:
        key = self._make_key(user_id, intent)
        data = self.redis.get(key)
        if data:
            return json.loads(data)
        return None

    async def set(self, user_id: str, intent: str, response: dict, ttl: int = 300):
        key = self._make_key(user_id, intent)
        self.redis.setex(key, ttl, json.dumps(response))
```

### 2.2 Token 优化

```python
class TokenOptimizer:
    def __init__(self):
        self.common_phrases = {
            "早上好": "早",
            "今天天气": "天气",
        }

    def compress(self, text: str) -> str:
        for full, short in self.common_phrases.items():
            text = text.replace(full, short)
        return text

    def estimate_tokens(self, text: str) -> int:
        # 粗略估算：中文每个字约1.3个token
        return int(len(text) * 1.3)

    def truncate(self, text: str, max_tokens: int) -> str:
        max_chars = int(max_tokens / 1.3)
        if len(text) <= max_chars:
            return text
        return text[:max_chars] + "..."
```

---

## 三、子系统索引

```markdown
# 子系统设计文档索引

## 核心文档

| 文档 | 章节 | 优先级 | 描述 |
|------|------|--------|------|
| [00_architecture.md](./00_architecture.md) | 一、十五、十六 | P0 | 架构总览、文件结构、实现优先级 |
| [01_emotion_system.md](./01_emotion_system.md) | 六 | P0 | 情绪系统（PAD模型） |
| [02_growth_system.md](./02_growth_system.md) | 二 | P1 | 人格成长系统 |
| [03_relationship.md](./03_relationship.md) | 四、九 | P2 | 关系动态系统 |
| [04_body_system.md](./04_body_system.md) | 五 | P1 | 生理系统 |
| [05_cognition_system.md](./05_cognition_system.md) | 七 | P1 | 认知系统 |
| [06_behavior_system.md](./06_behavior_system.md) | 八 | P0 | 行为决策系统 |
| [07_offline_api.md](./07_offline_api.md) | 十、十二 | P2/P0 | 离线处理、API优化 |

## 快速导航

### P0 - 必须实现
- 架构设计 → `00_architecture.md`
- 情绪系统 → `01_emotion_system.md`
- 行为系统 → `06_behavior_system.md`

### P1 - 应该实现
- 人格成长 → `02_growth_system.md`
- 生理系统 → `04_body_system.md`
- 认知系统 → `05_cognition_system.md`

### P2 - 可以实现
- 关系动态 → `03_relationship.md`
- 离线处理 → `07_offline_api.md`

## 文档结构

```
subsystem_design/
├── 00_architecture.md      # 架构总览（必读）
├── 01_emotion_system.md   # 情绪系统
├── 02_growth_system.md    # 人格成长
├── 03_relationship.md     # 关系动态
├── 04_body_system.md      # 生理系统
├── 05_cognition_system.md # 认知系统
├── 06_behavior_system.md  # 行为决策
├── 07_offline_api.md      # 离线处理与API优化
└── README.md              # 本索引
```
