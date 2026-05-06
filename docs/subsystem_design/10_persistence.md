# 持久化架构详细设计

> **对应设计文档章节**: 十六（持久化架构）
> **优先级**: P1
> **核心命题**: AKIHO 的所有状态——记忆、情绪历史、关系、人格——不能因为进程重启就消失。持久化不是"附加功能"，是"她是不是一个连续存在的生命"的基础。

---

## 一、设计目标

- **状态不丢失**：进程重启、服务器迁移、Docker 重建后 AKIHO 仍然是"同一个她"
- **分层存储**：热数据走 Redis，温数据走 PostgreSQL，冷数据走 ChromaDB + S3
- **人格可迁移**：导出完整人格快照 → 在新环境恢复 → 无缝继续
- **写入不阻塞**：主循环（100ms tick）不能等数据库写入
- **向量语义搜索**：记忆检索从子串匹配升级为 embedding 语义相似度

---

## 二、存储分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                      存储分层                                │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ L0: 内存层 (Memory)                                  │ │
│  │ 延迟: 0ms | 容量: ~GB | 生命周期: 进程               │ │
│  │ 用途: 当前情绪状态、活跃行为、工作记忆、资源池实时值   │ │
│  └───────────────────────────────────────────────────────┘ │
│                         │ 定时同步                          │
│                         ▼                                   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ L1: 热缓存层 (Redis)                                 │ │
│  │ 延迟: <1ms | 容量: ~GB | 生命周期: 持久               │ │
│  │ 用途: 会话状态、LLM 缓存、实时排行榜、发布/订阅       │ │
│  └───────────────────────────────────────────────────────┘ │
│                         │ 批量写入                          │
│                         ▼                                   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ L2: 关系存储层 (PostgreSQL)                           │ │
│  │ 延迟: ~5ms | 容量: TB级 | 生命周期: 永久              │ │
│  │ 用途: 对话记录、关系数据、情绪快照、成长日志、推文记录 │ │
│  └───────────────────────────────────────────────────────┘ │
│                         │ 异步索引                          │
│                         ▼                                   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ L3: 向量存储层 (ChromaDB)                             │ │
│  │ 延迟: ~20ms | 容量: 百万级向量 | 生命周期: 永久       │ │
│  │ 用途: 记忆语义搜索、相似对话检索、话题聚类            │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ L4: 文件存储层 (S3 / MinIO / 本地文件系统)            │ │
│  │ 延迟: ~100ms | 容量: 无限 | 生命周期: 永久            │ │
│  │ 用途: 人格导出包、日志归档、Prompt 模板版本、媒体文件  │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、PostgreSQL 数据模型

### 3.1 核心表结构

```sql
-- ============================================================
-- 用户表
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id     VARCHAR(255) UNIQUE NOT NULL,   -- 外部系统标识
    display_name    VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT now(),
    last_active_at  TIMESTAMPTZ,
    total_interactions INT DEFAULT 0
);

-- ============================================================
-- 对话记录表（核心表，写入频率最高）
-- ============================================================
CREATE TABLE conversations (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID REFERENCES users(id),
    role            VARCHAR(20) NOT NULL,            -- 'user' | 'assistant'
    content         TEXT NOT NULL,
    emotion_snapshot JSONB,                          -- 发言时的情绪状态
    body_snapshot   JSONB,                           -- 发言时的生理状态
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conversations_user_time
    ON conversations(user_id, created_at DESC);

CREATE INDEX idx_conversations_content_gin
    ON conversations USING gin(to_tsvector('simple', content));

-- ============================================================
-- 情绪快照表（定时采样，每 5 分钟）
-- ============================================================
CREATE TABLE emotion_snapshots (
    id              BIGSERIAL PRIMARY KEY,
    pleasure        REAL NOT NULL,
    arousal         REAL NOT NULL,
    dominance       REAL NOT NULL,
    intensity       REAL NOT NULL,
    category        VARCHAR(30),
    trigger_event   TEXT,                            -- 触发情绪变化的事件
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_emotion_snapshots_time
    ON emotion_snapshots(created_at DESC);

-- ============================================================
-- 关系状态表
-- ============================================================
CREATE TABLE relationships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) UNIQUE,
    intimacy        REAL DEFAULT 0.1,
    trust           REAL DEFAULT 0.1,
    interaction_count INT DEFAULT 0,
    phase           VARCHAR(30) DEFAULT 'stranger',  -- stranger/acquaintance/friend/close/intimate
    impression_tags TEXT[],                           -- ["有趣的", "技术宅"]
    interaction_style JSONB,                          -- {tone, topics_of_interest, ...}
    emotional_color  JSONB,                           -- {like, familiarity, comfort, curiosity}
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 人格成长日志表
-- ============================================================
CREATE TABLE growth_logs (
    id              BIGSERIAL PRIMARY KEY,
    phase           VARCHAR(30) NOT NULL,             -- infant/toddler/child/adolescent/adult/sage
    experience_count INT NOT NULL,
    characteristics JSONB NOT NULL,                   -- {好奇心: 0.5, 开放性: 0.5, ...}
    milestone       VARCHAR(255),                     -- 触发跃迁的里程碑事件
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 推文记忆表（Twitter 集成用）
-- ============================================================
CREATE TABLE tweet_memories (
    id              BIGSERIAL PRIMARY KEY,
    tweet_id        VARCHAR(50) UNIQUE,
    author_username VARCHAR(100),
    content         TEXT NOT NULL,
    akiho_action    VARCHAR(30),                      -- 'seen' | 'liked' | 'retweeted' | 'replied' | 'quoted'
    akiho_response  TEXT,                             -- AKIHO 的回复/引用内容（如果有）
    emotional_impact JSONB,                           -- {p_delta, a_delta, d_delta, category}
    attention_score REAL,
    is_remembered   BOOLEAN DEFAULT false,            -- 是否值得记住
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 事件日志表（通用审计/调试）
-- ============================================================
CREATE TABLE event_log (
    id              BIGSERIAL PRIMARY KEY,
    event_type      VARCHAR(50) NOT NULL,             -- 'user_message' | 'emotion_change' | 'milestone' | 'error' | ...
    payload         JSONB,
    severity        VARCHAR(20) DEFAULT 'info',       -- debug/info/warn/error
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_event_log_type_time
    ON event_log(event_type, created_at DESC);
```

### 3.2 写入策略

```python
class PersistenceWriter:
    """
    持久化写入管理器

    不同数据采用不同的写入策略：
    - 实时写入: 关系数据（每次互动后）
    - 批量写入: 对话记录（每 10 条或每 5 分钟）
    - 定时快照: 情绪状态（每 5 分钟）
    - 事件触发: 里程碑、错误
    """

    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool
        self.conversation_buffer: list[dict] = []
        self.buffer_max_size = 10
        self.buffer_max_age_seconds = 300
        self.last_flush = time.time()

    async def write_conversation(self, user_id: str, role: str, content: str, state: dict):
        """缓冲对话记录，批量写入"""
        self.conversation_buffer.append({
            "user_id": user_id,
            "role": role,
            "content": content,
            "emotion_snapshot": json.dumps(state.get("emotion", {})),
            "body_snapshot": json.dumps(state.get("body", {})),
        })

        if len(self.conversation_buffer) >= self.buffer_max_size:
            await self._flush_conversations()

    async def write_relationship(self, user_id: str, rel: dict):
        """实时写入关系数据（每次互动后）"""
        await self.db.execute("""
            INSERT INTO relationships (user_id, intimacy, trust, interaction_count, phase)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id) DO UPDATE SET
                intimacy = EXCLUDED.intimacy,
                trust = EXCLUDED.trust,
                interaction_count = EXCLUDED.interaction_count,
                phase = EXCLUDED.phase,
                updated_at = now()
        """, user_id, rel["intimacy"], rel["trust"], rel["interaction_count"], rel["relationship"])

    async def snapshot_emotion(self, emotion_state: dict, trigger: str = None):
        """定时情绪快照"""
        await self.db.execute("""
            INSERT INTO emotion_snapshots (pleasure, arousal, dominance, intensity, category, trigger_event)
            VALUES ($1, $2, $3, $4, $5, $6)
        """,
            emotion_state["pleasure"],
            emotion_state["arousal"],
            emotion_state["dominance"],
            emotion_state["intensity"],
            emotion_state["category"],
            trigger,
        )

    async def _flush_conversations(self):
        """批量写入对话缓冲"""
        if not self.conversation_buffer:
            return

        # PostgreSQL COPY 协议批量插入
        async with self.db.acquire() as conn:
            await conn.copy_records_to_table(
                'conversations',
                columns=['user_id', 'role', 'content', 'emotion_snapshot', 'body_snapshot'],
                records=[(b["user_id"], b["role"], b["content"], b["emotion_snapshot"], b["body_snapshot"])
                         for b in self.conversation_buffer]
            )

        self.conversation_buffer.clear()
        self.last_flush = time.time()

    async def periodic_flush(self):
        """定时刷新——在主循环中调用"""
        if (time.time() - self.last_flush > self.buffer_max_age_seconds
                and self.conversation_buffer):
            await self._flush_conversations()
```

---

## 四、Redis 缓存层

### 4.1 缓存映射

```python
class RedisCacheLayer:
    """
    Redis 缓存层

    存储热数据——需要毫秒级访问的实时状态
    """

    # 键命名约定: akiho:{domain}:{entity}:{id}
    KEY_PATTERNS = {
        "session_state":    "akiho:state:session",           # 当前会话实时状态 (Hash)
        "user_session":     "akiho:state:user:{user_id}",     # 用户会话上下文 (Hash)
        "llm_cache":        "akiho:cache:llm:{hash}",         # LLM 响应缓存 (String, TTL 1h)
        "emotion_current":  "akiho:emotion:current",          # 当前情绪 PAD 值 (Hash)
        "body_current":     "akiho:body:current",             # 当前资源池值 (Hash)
        "active_behaviors": "akiho:behavior:active",           # 活跃行为列表 (Set)
        "rate_limits":      "akiho:ratelimit:{endpoint}",      # API 限速计数器
        "twitter_timeline": "akiho:twitter:timeline:{user_id}",# 已处理的推文 ID (Sorted Set, TTL 24h)
    }

    def __init__(self, redis_client: redis.AsyncRedis):
        self.redis = redis_client

    async def save_llm_cache(self, prompt_hash: str, response: str, ttl: int = 3600):
        """LLM 响应缓存——相同输入直接命中"""
        key = self.KEY_PATTERNS["llm_cache"].format(hash=prompt_hash)
        await self.redis.setex(key, ttl, response)

    async def get_llm_cache(self, prompt_hash: str) -> Optional[str]:
        key = self.KEY_PATTERNS["llm_cache"].format(hash=prompt_hash)
        return await self.redis.get(key)

    async def update_emotion(self, pad: tuple[float, float, float], category: str):
        """实时更新情绪状态（高频写入——每 tick）"""
        key = self.KEY_PATTERNS["emotion_current"]
        await self.redis.hset(key, mapping={
            "pleasure": pad[0],
            "arousal": pad[1],
            "dominance": pad[2],
            "category": category,
            "updated_at": datetime.now().isoformat(),
        })

    async def get_emotion(self) -> dict:
        key = self.KEY_PATTERNS["emotion_current"]
        return await self.redis.hgetall(key)

    async def check_rate_limit(self, endpoint: str, max_per_window: int, window_seconds: int) -> bool:
        """滑动窗口限速"""
        key = self.KEY_PATTERNS["rate_limits"].format(endpoint=endpoint)
        now = time.time()
        window_start = now - window_seconds

        async with self.redis.pipeline() as pipe:
            pipe.zremrangebyscore(key, 0, window_start)  # 清理过期记录
            pipe.zcard(key)                                # 当前窗口内计数
            pipe.zadd(key, {str(now): now})                # 添加当前请求
            pipe.expire(key, window_seconds + 60)          # 设置过期
            _, count, _, _ = await pipe.execute()

        return count < max_per_window
```

### 4.2 缓存失效策略

| 数据类型 | TTL | 失效策略 | 说明 |
|----------|-----|----------|------|
| LLM 响应缓存 | 1 小时 | TTL 自动过期 | 随上下文变化自然失效 |
| 会话状态 | 无 TTL | 主动更新 | 只在进程存活时有效 |
| Twitter timeline | 24 小时 | TTL + LRU | 去重已处理的推文 |
| 限速计数器 | 窗口时长 | 滑动窗口自动过期 | 按 endpoint 分别计数 |

---

## 五、Embedding Provider 抽象层

> **核心原则**：Embedding 模型的选择是运行时配置，而非编译时写死。AKIHO 不绑定任何特定厂商。

### 5.1 架构

```
                         ┌──────────────────────────┐
                         │     EmbeddingService      │
                         │     encode(text) -> Vec   │
                         │     encode_batch() -> Vecs│
                         └────────────┬─────────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           ▼                          ▼                          ▼
  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
  │ OpenAICompatible   │  │ Ollama             │  │ LocalBGE           │
  │ (覆盖 90% 场景)     │  │ (本地离线)          │  │ (本地离线)          │
  │                    │  │                    │  │                    │
  │ POST /v1/embeddings│  │ POST /api/embeddings│  │ 进程内推理          │
  │ 统一 API 格式       │  │ Ollama 自有格式     │  │ SentenceTransformer│
  └────────────────────┘  └────────────────────┘  └────────────────────┘
           │
           │  同一套代码，base_url 不同而已
           │
  ┌────────┼──────────┬──────────────┬─────────────────┐
  ▼        ▼          ▼              ▼                 ▼
OpenAI   千问       智谱          任意中转站         DeepSeek
官方    (兼容模式)  (兼容模式)    (OneAPI/NewAPI)   (兼容模式)
```

### 5.2 Rust trait 定义

```rust
// akiho-core/src/embedding/mod.rs

#[async_trait]
pub trait EmbeddingProvider: Send + Sync {
    /// 模型名称（如 "text-embedding-3-small"）
    fn model_name(&self) -> &str;

    /// 输出向量维度
    fn dimension(&self) -> usize;

    /// 批量编码——一次请求处理多条，减少网络往返
    async fn encode_batch(&self, texts: &[String]) -> Result<Vec<Vec<f32>>>;

    /// 单条编码（默认实现，调 encode_batch）
    async fn encode(&self, text: &str) -> Result<Vec<f32>> {
        let results = self.encode_batch(&[text.to_string()]).await?;
        results.into_iter().next()
            .ok_or_else(|| anyhow::anyhow!("empty batch result"))
    }
}
```

### 5.3 Provider 实现

#### 5.3.1 OpenAICompatibleProvider — 覆盖 OpenAI / 千问 / 智谱 / 中转站

市场上绝大部分 embedding API 都兼容 OpenAI 的 `POST /v1/embeddings` 格式，**只需改 `base_url` 和 `model` 即可切换**。

```rust
pub struct OpenAICompatibleProvider {
    client: reqwest::Client,
    base_url: String,
    api_key: String,
    model: String,
    dimension: usize,
    custom_headers: HashMap<String, String>,  // 中转站可能需要额外 Header
}

impl OpenAICompatibleProvider {
    pub fn new(cfg: &OpenAiCompatibleConfig) -> Result<Self> {
        let mut headers = reqwest::header::HeaderMap::new();
        let mut client_builder = reqwest::Client::builder()
            .timeout(Duration::from_secs(30));

        // 默认 Header
        let mut custom_headers = cfg.custom_headers.clone();

        // 千问兼容模式需要额外的 Header
        if cfg.base_url.contains("dashscope") {
            custom_headers.insert(
                "X-DashScope-WorkSpace".into(),
                cfg.workspace_id.clone().unwrap_or_default(),
            );
        }

        Ok(Self {
            client: client_builder.build()?,
            base_url: cfg.base_url.trim_end_matches('/').to_string(),
            api_key: cfg.api_key.clone(),
            model: cfg.model.clone(),
            dimension: cfg.dimension,
            custom_headers,
        })
    }
}

#[async_trait]
impl EmbeddingProvider for OpenAICompatibleProvider {
    fn model_name(&self) -> &str { &self.model }
    fn dimension(&self) -> usize { self.dimension }

    async fn encode_batch(&self, texts: &[String]) -> Result<Vec<Vec<f32>>> {
        let url = format!("{}/v1/embeddings", self.base_url);

        let mut req = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&json!({
                "model": self.model,
                "input": texts,
            }));

        for (k, v) in &self.custom_headers {
            req = req.header(k.as_str(), v.as_str());
        }

        let resp: Value = req.send().await?.json().await?;

        // OpenAI 格式: { data: [{ embedding: [f32] }] }
        let mut embeddings: Vec<Vec<f32>> = Vec::with_capacity(texts.len());
        if let Some(data) = resp["data"].as_array() {
            for item in data {
                if let Some(embedding) = item["embedding"].as_array() {
                    embeddings.push(
                        embedding.iter().map(|v| v.as_f64().unwrap_or(0.0) as f32).collect()
                    );
                }
            }
        }

        // 必须按输入顺序返回
        ensure!(embeddings.len() == texts.len(),
            "embedding count mismatch: expected {}, got {}", texts.len(), embeddings.len());

        Ok(embeddings)
    }
}
```

#### 5.3.2 OllamaProvider — 本地离线

```rust
pub struct OllamaProvider {
    client: reqwest::Client,
    base_url: String,   // http://localhost:11434
    model: String,       // nomic-embed-text / bge-m3
}

#[async_trait]
impl EmbeddingProvider for OllamaProvider {
    fn model_name(&self) -> &str { &self.model }
    fn dimension(&self) -> usize { 768 }  // nomic-embed-text

    async fn encode_batch(&self, texts: &[String]) -> Result<Vec<Vec<f32>>> {
        // Ollama 不支持批量，并发单条请求
        let futures: Vec<_> = texts.iter().map(|t| self.encode_single(t)).collect();
        futures::future::try_join_all(futures).await
    }
}

impl OllamaProvider {
    async fn encode_single(&self, text: &str) -> Result<Vec<f32>> {
        let resp: Value = self.client
            .post(format!("{}/api/embeddings", self.base_url))
            .json(&json!({ "model": self.model, "prompt": text }))
            .send().await?
            .json().await?;

        Ok(resp["embedding"].as_array()
            .ok_or_else(|| anyhow::anyhow!("missing embedding in Ollama response"))?
            .iter().map(|v| v.as_f64().unwrap_or(0.0) as f32).collect())
    }
}
```

#### 5.3.3 LocalBGEProvider — 进程内本地模型（无网络依赖）

```rust
use ort::{Session, Value as OrtValue};  // ONNX Runtime

pub struct LocalBGEProvider {
    session: Session,            // ONNX 模型会话
    tokenizer: Tokenizer,        // HuggingFace tokenizer
    dimension: usize,            // bge-small: 512, bge-large: 1024
}

#[async_trait]
impl EmbeddingProvider for LocalBGEProvider {
    fn model_name(&self) -> &str { "bge-small-zh-v1.5" }
    fn dimension(&self) -> usize { self.dimension }

    async fn encode_batch(&self, texts: &[String]) -> Result<Vec<Vec<f32>>> {
        // 进程内 ONNX 推理，不发起任何网络请求
        let inputs = self.tokenizer.encode_batch(texts)?;
        let outputs = self.session.run(inputs)?;
        Ok(self.pool_embeddings(outputs))
    }
}
```

### 5.4 厂商速查表

只需改 `base_url` + `model`，代码零改动：

| 厂商 | provider 类型 | base_url | model 示例 | 向量维度 |
|------|-------------|----------|-----------|---------|
| **OpenAI 官方** | openai_compatible | `https://api.openai.com` | `text-embedding-3-small` | 1536 |
| | | | `text-embedding-3-large` | 3072 |
| **千问 (DashScope)** | openai_compatible | `https://dashscope.aliyuncs.com/compatible-mode` | `text-embedding-v4` | 1536 |
| | | | `text-embedding-v3` | 1024 |
| **智谱 GLM** | openai_compatible | `https://open.bigmodel.cn/api/paas/v4` | `embedding-3` | 2048 |
| | | | `embedding-2` | 1024 |
| **DeepSeek** | openai_compatible | `https://api.deepseek.com` | `deepseek-chat` | 4096 |
| **SiliconFlow** | openai_compatible | `https://api.siliconflow.cn` | `BAAI/bge-large-zh-v1.5` | 1024 |
| **任意中转站** | openai_compatible | `https://your-proxy.example.com` | 取决于上游 | 取决于上游 |
| **Ollama 本地** | ollama | `http://localhost:11434` | `nomic-embed-text` | 768 |
| | | | `bge-m3` | 1024 |
| **本地进程内** | local_bge | —（无网络） | `bge-small-zh-v1.5` | 512 |

### 5.5 配置驱动

```toml
# config.toml
[embedding]
provider = "openai_compatible"     # "openai_compatible" | "ollama" | "local_bge"
model = "text-embedding-v4"
dimension = 1536
batch_size = 32                    # 单次 API 调用最多塞多少条

[embedding.openai_compatible]
base_url = "https://dashscope.aliyuncs.com/compatible-mode"
api_key = "$DASHSCOPE_API_KEY"
# custom_headers = { "X-Custom" = "..." }

[embedding.ollama]
base_url = "http://localhost:11434"
model = "nomic-embed-text"

[embedding.local_bge]
model_path = "./models/bge-small-zh-v1.5"
use_gpu = false
```

```rust
// 工厂方法 —— 按配置构建 provider
impl EmbeddingService {
    pub fn from_config(cfg: &EmbeddingConfig) -> Result<Self> {
        let provider: Box<dyn EmbeddingProvider> = match cfg.provider.as_str() {
            "openai_compatible" => {
                let oc_cfg = cfg.openai_compatible.as_ref()
                    .ok_or_else(|| anyhow!("missing [embedding.openai_compatible] config"))?;
                Box::new(OpenAICompatibleProvider::new(oc_cfg)?)
            }
            "ollama" => {
                let ol_cfg = cfg.ollama.as_ref()
                    .ok_or_else(|| anyhow!("missing [embedding.ollama] config"))?;
                Box::new(OllamaProvider::new(ol_cfg)?)
            }
            "local_bge" => {
                let bge_cfg = cfg.local_bge.as_ref()
                    .ok_or_else(|| anyhow!("missing [embedding.local_bge] config"))?;
                Box::new(LocalBGEProvider::new(bge_cfg)?)
            }
            other => anyhow::bail!("unsupported embedding provider: {}", other),
        };

        Ok(Self {
            provider,
            batch_size: cfg.batch_size,
        })
    }
}
```

### 5.6 数据归属

**无论用哪个 provider，向量数据始终存在本机 ChromaDB（`./data/chroma/`）。**

API Provider 的职责仅限于：接收文本 → 返回向量 → 忘记文本。它不存你的记忆数据。

```
用户机器                              外部服务（可选）
┌─────────────────────────┐          ┌──────────────────┐
│  记忆文本                │          │  OpenAI / 千问     │
│  "上次聊了猫的视频..."    │ ──发送──▶ │  仅用于 embedding  │
│                         │          │  不持久化存储      │
│  ChromaDB ◀──返回向量─── │ ◀────── │                  │
│  ./data/chroma/         │          └──────────────────┘
│  (向量永久存这里)         │
└─────────────────────────┘
```

| Provider | 文本离开本机？ | 网络依赖 | 适用场景 |
|----------|--------------|---------|---------|
| `local_bge` | 否 | 无 | 完全离线、隐私优先 |
| `ollama` | 否 | 无（仅 localhost） | 本机 GPU 加速、离线 |
| `openai_compatible` | 是 | 需要 | 最佳质量、零运维 |

---

## 六、ChromaDB 向量存储

### 6.1 向量索引（Provider 驱动）

```python
import chromadb
from chromadb.utils import embedding_functions

class VectorMemoryStore:
    """
    向量记忆存储

    使用可配置的 EmbeddingProvider（Rust 侧），
    ChromaDB 负责索引和相似度搜索。
    """

    def __init__(
        self,
        embedding_service,          # Rust EmbeddingService（PyO3 绑定）
        persist_directory: str = "./data/chroma",
    ):
        self.embedding = embedding_service
        self.client = chromadb.PersistentClient(path=persist_directory)

        # ChromaDB 使用自定义 embedding function，调用 Rust 侧 provider
        self.embedding_fn = embedding_functions.OpenAIEmbeddingFunction(
            api_key="placeholder",        # 不被使用——实际调用走 Rust 侧
            api_base="http://localhost",  # 同上
            model_name="placeholder",
        )

        self.conversation_memories = self.client.get_or_create_collection(
            name="conversation_memories",
            metadata={"description": "对话情景记忆"}
        )

        self.tweet_memories = self.client.get_or_create_collection(
            name="tweet_memories",
            metadata={"description": "Twitter 推文记忆"}
        )

        self.knowledge_fragments = self.client.get_or_create_collection(
            name="knowledge_fragments",
            metadata={"description": "语义知识片段"}
        )

    async def index_conversation(
        self,
        memory_id: str,
        content: str,
        metadata: dict,
    ):
        """将对话记忆向量化并索引入库"""
        # 调用 Rust 侧 provider 生成 embedding
        embedding = await self.embedding.encode(content)

        self.conversation_memories.add(
            ids=[memory_id],
            embeddings=[embedding],
            documents=[content],
            metadatas=[metadata],
        )

    async def semantic_search(
        self,
        query: str,
        collection: str = "conversation_memories",
        top_k: int = 5,
        filter_metadata: dict = None,
    ) -> list[dict]:
        """语义搜索——基于 embedding 相似度"""
        query_embedding = await self.embedding.encode(query)

        col = getattr(self, collection)
        results = col.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=filter_metadata,
        )

        memories = []
        for i, doc_id in enumerate(results['ids'][0]):
            memories.append({
                "id": doc_id,
                "content": results['documents'][0][i],
                "metadata": results['metadatas'][0][i] if results['metadatas'] else {},
                "distance": results['distances'][0][i] if results['distances'] else None,
            })

        return memories

    async def delete_memory(self, memory_id: str):
        """删除一条记忆（遗忘机制触发）"""
        self.conversation_memories.delete(ids=[memory_id])
```

### 6.2 与现有子串搜索的兼容

```python
class HybridMemorySearch:
    """
    混合检索：向量语义 + 关键词精确 + 时间衰减

    向量搜索负责"意思相近"，
    关键词搜索负责"精确匹配"，
    两者互补而非替代。
    """

    def __init__(self, vector_store: VectorMemoryStore):
        self.vector = vector_store
        self.keyword_weight = 0.3   # 关键词权重
        self.semantic_weight = 0.5  # 语义权重
        self.recency_weight = 0.2   # 时间权重

    async def search(self, query: str, top_k: int = 5) -> list[dict]:
        # 1. 向量语义搜索
        semantic_results = await self.vector.semantic_search(query, top_k=top_k * 2)

        # 2. 关键词精确匹配（保留现有子串匹配作为补充）
        keyword_results = self._keyword_match(query, top_k=top_k * 2)

        # 3. 融合排序
        fused = self._fusion_rank(semantic_results, keyword_results, top_k)
        return fused

    def _fusion_rank(self, semantic: list, keyword: list, top_k: int) -> list:
        """融合语义和关键词结果"""
        scores: dict[str, float] = {}

        for i, mem in enumerate(semantic):
            scores[mem["id"]] = (1.0 - i / len(semantic)) * self.semantic_weight

        for i, mem in enumerate(keyword):
            kw_score = (1.0 - i / len(keyword)) * self.keyword_weight
            scores[mem["id"]] = scores.get(mem["id"], 0) + kw_score

        # 按融合分数排序
        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return [{"id": mem_id, "score": score} for mem_id, score in ranked[:top_k]]
```

---

## 七、人格迁移与备份

### 6.1 人格导出包

```python
@dataclass
class PersonalityExport:
    """
    AKIHO 完整人格导出包

    包含恢复"同一个她"所需的全部数据。
    格式：单个 JSON 文件 + 向量数据库备份。
    """
    version: str = "1.0"
    exported_at: str = ""
    
    # 核心状态
    emotion_state: dict = field(default_factory=dict)     # 当前 PAD 值 + 分类
    body_state: dict = field(default_factory=dict)        # 资源池当前值
    
    # 长期积累
    characteristics: dict = field(default_factory=dict)    # 8 维性格特征值
    growth_phase: str = "infant"                           # 成长阶段
    experience_count: int = 0
    
    # 关系数据
    relationships: list[dict] = field(default_factory=list) # per-user 关系
    
    # 元数据
    total_conversations: int = 0
    total_tweets: int = 0
    engine_uptime_hours: float = 0.0


class PersonalityMigration:
    """人格迁移管理器"""

    async def export_personality(self, db_pool, redis) -> PersonalityExport:
        """导出完整人格"""
        export = PersonalityExport(
            exported_at=datetime.now().isoformat(),
        )

        # 1. 从 PostgreSQL 导出
        async with db_pool.acquire() as conn:
            # 人格特征
            row = await conn.fetchrow(
                "SELECT phase, experience_count, characteristics FROM growth_logs ORDER BY id DESC LIMIT 1"
            )
            if row:
                export.growth_phase = row["phase"]
                export.experience_count = row["experience_count"]
                export.characteristics = row["characteristics"]

            # 关系数据
            rows = await conn.fetch("SELECT * FROM relationships")
            export.relationships = [dict(r) for r in rows]

            # 统计
            export.total_conversations = await conn.fetchval("SELECT count(*) FROM conversations")

        # 2. 从 Redis 导出实时状态
        export.emotion_state = await redis.hgetall("akiho:emotion:current")
        export.body_state = await redis.hgetall("akiho:body:current")

        return export

    async def import_personality(self, export: PersonalityExport, db_pool, redis):
        """导入人格——在新环境中恢复"""
        async with db_pool.acquire() as conn:
            # 恢复成长日志
            await conn.execute("""
                INSERT INTO growth_logs (phase, experience_count, characteristics, milestone)
                VALUES ($1, $2, $3, '人格迁移恢复')
            """, export.growth_phase, export.experience_count, json.dumps(export.characteristics))

            # 恢复关系
            for rel in export.relationships:
                await conn.execute("""
                    INSERT INTO relationships (user_id, intimacy, trust, interaction_count, phase)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (user_id) DO UPDATE SET ...
                """, ...)

        # 恢复实时状态
        await redis.hset("akiho:emotion:current", mapping=export.emotion_state)
        await redis.hset("akiho:body:current", mapping=export.body_state)

    def save_to_file(self, export: PersonalityExport, path: str):
        """保存导出包到文件"""
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(asdict(export), f, ensure_ascii=False, indent=2, default=str)

    def load_from_file(self, path: str) -> PersonalityExport:
        """从文件加载导出包"""
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return PersonalityExport(**data)
```

---

## 八、数据生命周期

### 7.1 数据保留策略

| 数据类型 | 保留周期 | 清理策略 | 原因 |
|----------|----------|----------|------|
| 对话记录 | 永久 | 手动归档 | 这是 AKIHO 的"人生经历" |
| 情绪快照 | 90 天 | 自动清理 | 趋势数据，细节过期后价值低 |
| LLM 缓存 | 1 小时 | TTL 自动 | 上下文变化后命中率低 |
| 推文记忆 | 30 天 | 保留重要（is_remembered=true），清理其余 | 控制存储成本 |
| 事件日志 | 30 天 | 按天分区，自动 DROP | 调试用，非核心数据 |
| 人格导出包 | 永久 | 用户管理 | 等价于"她的记忆备份" |

### 7.2 定时清理任务

```python
class DataRetentionManager:
    """数据生命周期管理——定时清理过期数据"""

    async def cleanup_emotion_snapshots(self, db_pool, retention_days: int = 90):
        async with db_pool.acquire() as conn:
            await conn.execute("""
                DELETE FROM emotion_snapshots
                WHERE created_at < now() - interval '1 day' * $1
            """, retention_days)

    async def cleanup_tweet_memories(self, db_pool, retention_days: int = 30):
        async with db_pool.acquire() as conn:
            # 保留"记住了的"推文，清理其余
            await conn.execute("""
                DELETE FROM tweet_memories
                WHERE is_remembered = false
                  AND created_at < now() - interval '1 day' * $1
            """, retention_days)

    async def cleanup_event_log(self, db_pool, retention_days: int = 30):
        async with db_pool.acquire() as conn:
            await conn.execute("""
                DELETE FROM event_log
                WHERE created_at < now() - interval '1 day' * $1
            """, retention_days)

    async def run_daily_maintenance(self, db_pool):
        """每日维护任务——通过 APScheduler 或 cron 触发"""
        await self.cleanup_emotion_snapshots(db_pool)
        await self.cleanup_tweet_memories(db_pool)
        await self.cleanup_event_log(db_pool)
```

---

## 九、故障恢复

### 8.1 启动恢复流程

```
引擎启动
    │
    ├─→ 1. 检查 PostgreSQL 连接
    │      ├─ 可用 → 加载持久化数据
    │      └─ 不可用 → 使用内存默认值 + WARN 日志
    │
    ├─→ 2. 检查 Redis 连接
    │      ├─ 可用 → 加载上次会话状态
    │      └─ 不可用 → 从 PostgreSQL 重建（较慢但可用）
    │
    ├─→ 3. 检查 ChromaDB 连接
    │      ├─ 可用 → 启用语义搜索
    │      └─ 不可用 → 降级为子串匹配搜索
    │
    ├─→ 4. 加载最近的成长记录 → 恢复成长阶段
    ├─→ 5. 加载关系数据 → 恢复 per-user 关系
    └─→ 6. 开始正常运行
```

### 8.2 优雅降级

```python
class GracefulDegradation:
    """
    优雅降级策略

    原则：即使所有外部存储都不可用，AKIHO 仍然可以运行——
    只是没有记忆和持久化，像一个"暂时失忆"的状态。
    """

    def __init__(self):
        self.degradation_level = 0  # 0 = 全功能, 1 = 部分降级, 2 = 内存模式

    async def check_health(self) -> dict:
        status = {"postgresql": False, "redis": False, "chromadb": False}

        try:
            await self._check_postgres()
            status["postgresql"] = True
        except Exception:
            self.degradation_level = max(self.degradation_level, 2)

        try:
            await self._check_redis()
            status["redis"] = True
        except Exception:
            self.degradation_level = max(self.degradation_level, 1)

        try:
            await self._check_chromadb()
            status["chromadb"] = True
        except Exception:
            self.degradation_level = max(self.degradation_level, 1)

        return status

    def get_capabilities(self) -> set[str]:
        """根据降级级别返回可用能力"""
        caps = {"basic_response", "emotion_system"}
        if self.degradation_level < 2:
            caps.add("conversation_memory")
        if self.degradation_level < 1:
            caps.add("semantic_search")
            caps.add("llm_cache")
        caps.add("personality_consistency")  # 人格特征可在内存中维护
        return caps
```

---

## 十、实现优先级

| 优先级 | 内容 | 依赖 |
|--------|------|------|
| **P0** | PostgreSQL 对话记录 + 关系表 | asyncpg |
| **P0** | 批量写入 + 定时刷新 | — |
| **P1** | Embedding Provider 抽象层（OpenAICompatible / Ollama / LocalBGE） | reqwest, ort |
| **P1** | Redis 会话缓存 + LLM 缓存 | redis-py |
| **P1** | ChromaDB 向量索引 | chromadb |
| **P1** | 启动恢复流程 | P0 |
| **P2** | 人格导出/导入 | P0 + P1 |
| **P2** | 数据保留清理任务 | P0 |
| **P3** | S3/MinIO 文件备份 | boto3 |

---

*文档版本: 1.0.0*
*最后更新: 2026-05-05*
*对应引擎模块: engine/persistence/ (待创建)*
