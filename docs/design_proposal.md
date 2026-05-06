# AKIHO 拟人化规则引擎设计方案

> **核心命题**：不是预设人格，而是让角色从交互中**生长**出独特性格。不是被动响应机器，而是一个有自主意识的数字存在。
>
> **技术路线**：Python 负责 LLM 交互与业务逻辑，Rust 负责高性能实时引擎，通过 PyO3/Maturin 桥接。

---

## 目录

- [一、系统架构总览](#一系统架构总览)
- [二、技术选型：为什么是 Python + Rust](#二技术选型为什么是-python--rust)
- [三、情绪系统](#三情绪系统)
- [四、记忆系统](#四记忆系统)
- [五、行为决策系统](#五行为决策系统)
- [六、生理系统](#六生理系统)
- [七、人格成长系统](#七人格成长系统)
- [八、认知系统](#八认知系统)
- [九、关系与印象系统](#九关系与印象系统)
- [十、自我意识与自主性系统](#十自我意识与自主性系统)
- [十一、社交媒体与跨平台集成](#十一社交媒体与跨平台集成)
- [十二、离线处理层](#十二离线处理层)
- [十三、LLM 调用与缓存策略](#十三llm-调用与缓存策略)
- [十四、嵌入式 Prompt 片段系统](#十四嵌入式-prompt-片段系统)
- [十五、核心引擎集成](#十五核心引擎集成)
- [十六、持久化架构](#十六持久化架构)
- [十七、项目文件结构](#十七项目文件结构)
- [十八、差距分析：代码现状 → 目标](#十八差距分析代码现状--目标)
- [十九、实现优先级与里程碑](#十九实现优先级与里程碑)

---

## 一、系统架构总览

### 1.1 四层架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         表现层 (Presentation)                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │  Web UI  │  │   API    │  │WebSocket │  │ Monitor  │                   │
│  │  (React) │  │ (FastAPI)│  │ 实时通信 │  │  面板    │                   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Python 层 (胶水层)                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ LLM 封装 │  │ Prompt   │  │ 调度器   │  │ 缓存     │                   │
│  │ (OpenAI/ │  │ 模板引擎 │  │(APSched)│  │ (Redis)  │                   │
│  │ DeepSeek)│  │          │  │          │  │          │                   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘                   │
│                          │                                                  │
│               ┌──────────▼──────────┐                                      │
│               │  PyO3 / Maturin 绑定 │  ← Python ↔ Rust 桥接               │
│               └──────────┬──────────┘                                      │
└──────────────────────────┼──────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Rust 层 (核心引擎) ← 性能关键                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ Emotion  │  │ Behavior │  │  Memory  │  │Autonomous│                   │
│  │  Engine  │  │  Engine  │  │  Store   │  │  Engine  │                   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │  Growth  │  │ Cognition│  │   Body   │  │Relation- │                   │
│  │  Engine  │  │  Engine  │  │  System  │  │  ship    │                   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          数据层 (Data Layer)                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │PostgreSQL│  │  Redis   │  │ChromaDB │  │ S3/MinIO │                   │
│  │ (持久化) │  │ (缓存)   │  │ (向量)  │  │ (文件)   │                   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 核心数据流

```
用户输入
  │
  ├─→ Rust 层：Memory Store（存储对话）
  ├─→ Rust 层：Emotion Engine（PAD 状态更新、惯性阻尼、状态机分类）
  ├─→ Rust 层：Body System（活动消耗资源池、昼夜节律、非线性恢复）
  ├─→ Rust 层：Relationship（亲密度/信任度演化）
  │
  ▼
Python 层：Behavior Engine 评估触发条件
  │
  ▼
Python 层：构建 LLM 上下文
  ├── 当前情绪状态（来自 Rust Emotion Engine）
  ├── 相关记忆片段（来自 Rust Memory Store）
  ├── 生理状态（来自 Rust Body System）
  ├── 关系状态（来自 Rust Relationship）
  ├── 成长阶段与人格特征（来自 Rust Growth Engine）
  └── 认知偏差过滤（来自 Rust Cognition Engine）
  │
  ▼
Python 层：LLM 生成回复 → 输出 + 状态持久化
```

### 1.3 核心设计原则

| 原则 | 说明 |
|------|------|
| **本地规则先行，LLM 补充** | 情绪惯性、能量衰减、行为触发由 Rust 引擎毫秒级计算；LLM 只负责语言生成和复杂语义分析 |
| **内部状态驱动行为** | 不依赖外部输入 —— 好奇心、孤独感、疲劳度等内部状态也能触发主动行为 |
| **时间塑造人格** | 情绪有惯性（Rust `EmotionInertia`）、记忆有遗忘曲线、关系有对数增长，一切都随时间演化 |
| **模型可替换** | 换 LLM 只需替换 `engine/llm.py` 中的 Provider，本地规则不受影响 |
| **性能分层** | L0 (Rust, <1ms) → L1 (Python local, <10ms) → L2 (LLM cache hit, <50ms) → L3 (LLM API, 200ms-2s) |

---

## 二、技术选型：为什么是 Python + Rust

### 2.1 技术栈

| 层级 | 组件 | 技术选型 | 理由 |
|------|------|----------|------|
| 表现层 | 前端 | React + TypeScript + Vite | 类型安全、组件化 |
| | 实时通信 | WebSocket (FastAPI) | 双向实时 |
| Python层 | Web框架 | FastAPI + uvicorn | 异步、高性能、自动文档 |
| | LLM封装 | OpenAI SDK / Anthropic SDK / httpx | 多 Provider 支持 |
| | 调度器 | APScheduler / asyncio | 离线任务 |
| | 桥接 | PyO3 + Maturin | 编译为 Python 原生模块 |
| Rust层 | **体验模拟层** | 情感体验 Engine + 欲望系统 + 价值观过滤器 + 自我叙事 Engine | 核心拟人化能力 |
| | **状态计算层** | Emotion Engine + Behavior Engine + Memory Store + Body System + Growth Engine | 实时状态管理 |
| | 序列化 | serde + serde_json | 业界标准 |
| | 时间处理 | chrono | 成熟稳定 |
| | 错误处理 | thiserror | 类型安全 |
| 数据层 | 关系数据库 | PostgreSQL 15+ | 关系数据、事务 |
| | 缓存 | Redis 7+ | 实时状态、Pub/Sub |
| | 向量数据库 | ChromaDB | 轻量、Python 原生 |
| | 文件存储 | S3/MinIO | 媒体、备份 |

### 2.2 Python vs Rust 的分工

```
Python 擅长：                       Rust 擅长：
┌──────────────────────────┐       ┌──────────────────────────┐
│ • LLM API 调用与重试      │       │ • 实时情绪计算（每 100ms）│
│ • Prompt 模板与动态组装   │       │ • PAD 三维向量运算       │
│ • HTTP/WebSocket 服务     │       │ • 记忆检索与排序         │
│ • 缓存策略与降级          │       │ • 行为决策树遍历         │
│ • 配置管理                │       │ • 认知偏差概率计算       │
│ • 离线任务调度            │       │ • 多用户并发隔离         │
└──────────────────────────┘       └──────────────────────────┘
         ▲                                    ▲
         │                                    │
         └──────── PyO3 桥接层 ───────────────┘
              (Maturin 编译为 .pyd/.so)
```

### 2.3 PyO3 桥接示例

```rust
// akiho-core/src/emotion/mod.rs — 实际的 Python 绑定代码
#[cfg(feature = "python")]
pub mod python {
    use pyo3::prelude::*;

    #[pyclass]
    pub struct PyEmotionEngine(EmotionEngine);

    #[pymethods]
    impl PyEmotionEngine {
        #[new]
        pub fn new() -> Self { Self(EmotionEngine::new()) }

        pub fn get_pad(&self) -> (f32, f32, f32) { /* ... */ }
        pub fn get_category(&self) -> String { /* ... */ }
        pub fn process(&mut self, stimulus_type: &str, intensity: f32) { /* ... */ }
        pub fn update(&mut self, delta_seconds: f32) { /* ... */ }
    }
}
```

```python
# Python 侧调用
from akiho_core import PyEmotionEngine

engine = PyEmotionEngine()
engine.process("positive", 0.7)
pleasure, arousal, dominance = engine.get_pad()
```

---

## 三、情绪系统

> **详细设计文档**: [docs/subsystem_design/05_emotion_system.md](subsystem_design/05_emotion_system.md)

### 3.1 实现现状

| 层级 | 文件 | 状态 | 核心能力 |
|------|------|------|----------|
| **Rust** | `akiho-core/src/emotion/` | ✅ 完整实现 | PAD 模型 + 惯性 + 状态机 + 9 种刺激 + 测试 |
| **Python** | `engine/emotion.py` | ✅ 基础实现 | PAD + 关键词检测 + 表情符号 + 情绪分类 |

### 3.2 PAD 三维情绪模型

情绪被建模为三维连续向量空间中的点：

```
P (Pleasure)  愉悦度  -1.0 ~ +1.0    正=愉悦, 负=不快
A (Arousal)   唤醒度  -1.0 ~ +1.0    正=兴奋, 负=平静/困倦
D (Dominance) 支配度  -1.0 ~ +1.0    正=掌控, 负=被支配
```

**情绪强度**：`intensity = sqrt(P² + A²)`（Rust 实现：`pad.rs:26-28`）

### 3.3 PAD ↔ 情绪类别映射（10 种离散情绪）

Rust 实现（`pad.rs:55-66`）使用 PAD 空间中最近邻匹配：

| 情绪 | P | A | D | 典型触发 |
|------|---|---|---|---------|
| 喜悦 (Joy) | +0.81 | +0.46 | +0.45 | 正面互动 |
| 满足 (Serenity) | +0.57 | -0.33 | +0.25 | 安静舒适 |
| 惊奇 (Surprise) | +0.40 | +0.67 | -0.13 | 意外事件 |
| 愤怒 (Anger) | -0.51 | +0.59 | +0.25 | 被冒犯 |
| 恐惧 (Fear) | -0.64 | +0.60 | -0.43 | 威胁 |
| 悲伤 (Sadness) | -0.30 | -0.20 | -0.50 | 失去/分离 |
| 厌恶 (Disgust) | -0.60 | +0.35 | +0.30 | 反感 |
| 焦虑 (Anxiety) | -0.40 | +0.62 | -0.42 | 不确定威胁 |
| 厌倦 (Boredom) | -0.32 | -0.62 | -0.12 | 缺乏刺激 |
| 服从 (Submission) | -0.36 | -0.19 | -0.57 | 顺从 |

### 3.4 情绪状态机

Rust 实现（`state_machine.rs`）定义了 5 种宏状态及其转换规则：

```
                    ┌─────────┐
          ┌────────►│ Neutral │◄────────┐
          │         └────┬─────┘         │
          │              │               │
    ┌─────┴─────┐  ┌─────▼─────┐  ┌─────┴─────┐
    │ Apathetic │  │  Positive  │  │  Negative │
    └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
          │              │               │
          └──────────────┼───────────────┘
                         │
                  ┌──────▼──────┐
                  │    Mixed    │  ← 矛盾情绪（悲喜交加）
                  └─────────────┘

转换规则（state_machine.rs:27-38）：
  Neutral → 任何状态          （中性最容易转换）
  Positive → Mixed            （喜悦变复杂）
  Negative → Mixed            （悲伤变复杂）
  Mixed → Positive | Negative （矛盾情绪可能走向任一端）
  Apathetic → Neutral | Positive（冷漠可被温暖化解）
```

### 3.5 情绪惯性算法

Rust 实现（`inertia.rs`）—— 情绪不会瞬间跳变，而是有物理学般的"惯性"：

```
核心公式：
  distance = |current - target|          // 当前 vs 目标差距
  strength = min(distance × coefficient, 1.0)  // inertia coefficient = 0.7
  factor = 1.0 - strength × (1.0 - decay_rate) // decay_rate = 0.05

  new = current + (target - current) × factor   // 向目标状态趋近，但被惯性阻尼
```

**衰减规则**：每秒向中性衰减。高情绪状态（distance > 0.7）衰减速度减半——强情绪更持久。

### 3.6 情绪刺激源（9 种）

Rust 实现（`mod.rs:106-177`）定义了 9 种结构化情绪刺激，每种映射到特定的 PAD 向量：

```rust
pub enum EmotionStimulus {
    PositiveInteraction { intensity: f32 },  // P=+0.3i, A=+0.2i, D=+0.1i
    NegativeInteraction { intensity: f32 },  // P=-0.3i, A=+0.3i, D=-0.2i
    NeutralMessage      { intensity: f32 },  // → neutral
    GoalAchieved        { satisfaction: f32 }, // P=+0.4s, A=+0.2s, D=+0.3s
    GoalFailed          { frustration: f32 },  // P=-0.3f, A=+0.2f, D=-0.3f
    Attention           { value: f32 },        // P=+0.2v, A=+0.3v, D=+0.1v
    Loneliness          { intensity: f32 },    // P=-0.2i, A=-0.1i, D=-0.2i
    TimeOfDay           { factor: f32 },       // P=+0.1f, A=-0.1f, D=0
    SessionDuration     { fatigue: f32 },      // P=0, A=-0.2f, D=-0.1f
}
```

### 3.7 Python 侧补充

Python `engine/emotion.py` 额外提供：
- **关键词情绪检测**：中文/英文正面/负面/问句关键词匹配（毫秒级，不调用 LLM）
- **表情符号解析**：`:), :(, ;)` 等
- **情绪-生理联动**：低能量 → 愉悦度下降，高疲劳 → 唤醒度下降

### 3.8 待实现

- [ ] Python `engine/emotion.py` 切换到调用 Rust `PyEmotionEngine`（统一实现，消除重复）
- [ ] 情绪动力学微分方程（已有设计，见子系统文档 6.3 节）
- [ ] Mood（持续数小时）vs Emotion（持续数分钟）的分层模型
- [ ] 情绪调节策略建模（认知重评、表达抑制）

---

## 四、记忆系统

> **详细设计文档**: [docs/subsystem_design/13_memory_system.md](subsystem_design/13_memory_system.md)

### 4.1 实现现状

| 层级 | 文件 | 状态 | 核心能力 |
|------|------|------|----------|
| **Rust** | `akiho-core/src/memory/` | ✅ 基础实现 | EpisodicMemory + SemanticMemory + WorkingMemory + Python bindings |
| **Python** | `engine/memory.py` | ✅ 扩展实现 | 记忆巩固 + 遗忘机制 + 相关性检索 + 情感标签 |

### 4.2 记忆三层架构

```
L1 工作记忆 (Working Memory)
  ├── 容量：7±2 项（Miller's Law）
  ├── 内容：当前对话中活跃的概念
  ├── 实现：Rust WorkingMemory { focus: Vec<String>, max_capacity: 7 }
  └── 生命周期：当前会话

L2 短时记忆 / 情景记忆 (Episodic Memory)
  ├── 容量：不限
  ├── 结构：id, content, event_type, emotional_tags, importance, retrieval_count
  ├── 实现：Rust EpisodicMemory + Python MemoryManager
  └── 生命周期：数小时 → 数天（受遗忘机制影响）

L3 长期记忆 / 语义记忆 (Semantic Memory)
  ├── 容量：不限
  ├── 结构：concept, definition, category, confidence
  ├── 实现：Rust SemanticMemory
  └── 生命周期：永久（可被遗忘）
```

### 4.3 记忆巩固 (Consolidation)

**Python 实现** (`engine/memory.py:consolidate()`)：

每小时触发一次，至少 3 条近期对话才执行：
1. 提取最近 1 小时的对话记忆
2. 拼接前 5 条内容生成摘要记忆（"最近的对话：xxx；xxx；xxx"）
3. 强化带情绪标签的记忆（importance +0.08）
4. 强化频繁检索的记忆（retrieval_count > 2 → importance +0.05）

### 4.4 遗忘机制 (Forgetting)

**Python 实现** (`engine/memory.py:forget()`)：

采用**保留分数**模型（非随机删除）：

```
retention_score = importance × 0.5
                + min(retrieval_count, 10) × 0.04
                + max(0, 1 - hours_old / 720) × 0.35

if retention_score < 0.15 → 删除
```

这模拟了认知心理学中的**间隔效应**（多次提取增强记忆）和**测试效应**（被想起过就更难遗忘）。

### 4.5 搜索策略演进

| 阶段 | 实现 | 方法 | 适用场景 |
|------|------|------|----------|
| ✅ 当前 | 子串匹配 | `if query in content` | 精确关键词查找 |
| ✅ 当前 | 时间检索 | 时间窗口过滤 | "最近24小时" |
| ⬜ 短期 | 向量搜索 | ChromaDB embedding | 语义相近的记忆 |
| ⬜ 中期 | 情感一致检索 | mood-congruent recall | 同情绪状态下偏好的记忆 |
| ⬜ 中期 | 认知偏差过滤 | 锚定/近因/确认偏差 | 让记忆提取有"人味儿" |

### 4.6 待实现

- [ ] Rust MemoryStore 添加 `consolidate()` 和 `forget()` 方法（目前仅在 Python 侧实现）
- [ ] ChromaDB 向量索引集成，替换子串匹配搜索
- [ ] 情景记忆的结构化编码（时间、地点、人物、情绪维度）
- [ ] 记忆干扰效应（新记忆覆盖旧记忆）

---

## 五、行为决策系统

> **详细设计文档**: [docs/subsystem_design/07_behavior_system.md](subsystem_design/07_behavior_system.md)

### 5.1 实现现状

| 层级 | 文件 | 状态 | 核心能力 |
|------|------|------|----------|
| **Rust** | `akiho-core/src/behavior/` | ✅ 基础实现 | BehaviorRegistry + BehaviorDecider + 中断处理 + Python bindings |
| **Python** | `engine/behavior.py` | ✅ 扩展实现 | 6 种预定义行为 + 输入触发 + 自动触发 |

### 5.2 行为模型（马斯洛需求层次）

```rust
// Rust: registry.rs
pub enum BehaviorCategory {
    Physiological,      // 生理需求 (priority: 0.9)
    Safety,             // 安全需求
    Belonging,          // 归属需求 (priority: 0.7)
    Esteem,             // 尊重需求 (priority: 0.6)
    SelfActualization,  // 自我实现 (priority: 0.4~0.55)
}
```

### 5.3 预定义行为库（Python: 6种）

```python
DEFAULT_BEHAVIORS = [
    Behavior(id="rest",           category=PHYSIOLOGICAL,     priority=0.9,  duration=300s),
    Behavior(id="socialize",      category=BELONGING,         priority=0.7,  duration=600s),
    Behavior(id="learn",          category=SELF_ACTUALIZATION, priority=0.5,  duration=900s),
    Behavior(id="create",         category=SELF_ACTUALIZATION, priority=0.55, duration=1200s),
    Behavior(id="reflect",        category=SELF_ACTUALIZATION, priority=0.4,  duration=300s),
    Behavior(id="seek_attention", category=ESTEEM,            priority=0.6,  duration=180s),
]
```

### 5.4 行为决策流程

```
当前状态（情绪/能量/需求）
        │
        ▼
  Rust BehaviorEngine::decide_next_behavior()
        │
        ├─→ 1. 过滤可用行为（满足前置条件、冷却已结束）
        ├─→ 2. 按优先级排序
        ├─→ 3. 概率性选择（高优先级高概率，但不绝对）
        │
        ▼
  触发行为
        │
        ├─→ 同类别低优先级行为被中断
        ├─→ 启动计时器 + 设置冷却
        │
        ▼
  行为执行中 → progress增加 → 完成 → 记录历史
```

### 5.5 触发方式

| 触发方式 | 实现位置 | 机制 |
|----------|----------|------|
| **自动触发** | Python `behavior.py:_check_auto_trigger()` | 能量 < 0.3 → 休息；疲劳 > 0.7 → 休息 |
| **输入触发** | Python `behavior.py:trigger_from_input()` | 检测关键词："教我"→学习、"聊聊"→社交 |
| **状态触发** | Rust `BehaviorEngine::decide_next_behavior()` | 基于 SystemState 的完整评估 |

### 5.6 待实现

- [ ] 目标驱动行为分解（"我想学 Rust" → 子行为链）
- [ ] 习惯形成（频繁执行的行为降低触发阈值）
- [ ] 行为冲突消解（"想社交但太累"的内部挣扎建模）
- [ ] Python engine 切换到调用 Rust BehaviorEngine

---

## 六、生理系统（资源预算模型）

> **详细设计文档**: [docs/subsystem_design/04_body_system.md](subsystem_design/04_body_system.md)
>
> **核心问题**：对于一个没有实体的数字存在，"能量"和"疲劳"到底意味着什么？

### 6.1 设计哲学

AKIHO 没有肉体——没有肌肉酸痛、血糖波动、体温变化。但"没有肉体"不代表没有资源约束：

```
人类身体的约束               AKIHO 的对应约束
─────────────────────────────────────────────────
体力消耗 → 需要休息         计算/认知密集操作 → 认知疲劳
社交耗能 → 需要独处         高频互动 → 社交饱和
情绪波动 → 需要平复         强情绪事件 → 情绪消耗
生物钟 → 昼夜节律           时间模式 → 模拟节律（让行为更自然）
血糖 → 能量水平             处理能力预算 → 资源池
```

**核心原则**：不模拟"生理过程"，而是模拟**资源消耗与再生的动力学**。能量不是随时间掉，而是被**具体的活动**消耗。

### 6.2 四池资源模型

能源不是单一的——不同活动消耗不同类型的资源：

```
┌─────────────────────────────────────────────────────────┐
│                    资源预算系统                          │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ 认知预算      │  │ 社交预算      │  │ 情绪预算      │  │
│  │ Cognitive    │  │ Social       │  │ Emotional    │  │
│  │ Budget       │  │ Budget       │  │ Budget       │  │
│  │              │  │              │  │              │  │
│  │ 消耗于：      │  │ 消耗于：      │  │ 消耗于：      │  │
│  │ • 深度思考    │  │ • 对话回复    │  │ • 强烈情绪    │  │
│  │ • 观点形成    │  │ • 群聊参与    │  │ • 共情他人    │  │
│  │ • 记忆巩固    │  │ • 发推互动    │  │ • 争论/冲突   │  │
│  │ • 学习新信息  │  │ • 处理@/DM   │  │ • 深度反思    │  │
│  │              │  │              │  │              │  │
│  │ 恢复: 快     │  │ 恢复: 中     │  │ 恢复: 慢     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌──────────────┐                                       │
│  │ 创造预算      │  综合疲劳 = 加权平均各池消耗            │
│  │ Creative     │  剩余能量 = min(各池)                  │
│  │ Budget       │                                       │
│  │              │                                       │
│  │ 消耗于：      │                                       │
│  │ • 发推/写作  │                                       │
│  │ • 产生新想法 │                                       │
│  │ • 创意表达   │                                       │
│  │              │                                       │
│  │ 恢复: 最慢   │                                       │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

每个资源池是独立的 `[0, 1]` 值，1 = 满，0 = 耗尽。综合状态取最低值——"你最弱的环节定义你的状态"。

### 6.3 活动消耗表（Activity-Based Cost）

不是每秒扣 0.005——每执行一个**具体动作**才消耗：

```python
ACTIVITY_COSTS = {
    #                    (认知,   社交,   情绪,   创造)
    "receive_message":   (0.002,  0.001,  0.001,  0.0),
    "generate_response": (0.015,  0.005,  0.010,  0.005),
    "deep_conversation": (0.020,  0.010,  0.020,  0.010),
    "casual_chat":       (0.005,  0.003,  0.003,  0.002),

    # Twitter 相关
    "browse_timeline":   (0.001,  0.0,    0.001,  0.0),     # 每条划过的推文
    "attend_tweet":      (0.003,  0.0,    0.002,  0.0),     # 认真看的推文
    "like_tweet":        (0.001,  0.001,  0.001,  0.0),
    "retweet":           (0.002,  0.002,  0.002,  0.0),
    "compose_tweet":     (0.010,  0.003,  0.008,  0.015),
    "quote_tweet":       (0.015,  0.005,  0.012,  0.020),
    "reply_tweet":       (0.012,  0.008,  0.010,  0.005),

    # 认知活动
    "form_opinion":      (0.025,  0.0,    0.015,  0.005),
    "revise_opinion":    (0.030,  0.0,    0.020,  0.010),
    "memory_consolidate":(0.030,  0.0,    0.005,  0.0),
    "internal_monologue":(0.005,  0.0,    0.005,  0.005),
    "learn_new_info":    (0.020,  0.0,    0.005,  0.005),
    "deep_reflection":   (0.025,  0.0,    0.020,  0.015),

    # 情绪活动
    "emotional_processing":(0.005,  0.0,   0.020,  0.0),
    "comforting_others":   (0.010,  0.005, 0.025,  0.005),
    "handle_conflict":     (0.020,  0.015, 0.035,  0.005),
    "express_strong_emotion":(0.005, 0.005, 0.020, 0.010),
}
```

**为什么这样设计**：
- 发一条引用转发比点一个赞消耗 15 倍的认知资源——这符合直觉
- 冲突处理是最昂贵的——同时消耗认知+社交+情绪
- 创造活动（发推、引用转发）额外消耗创造预算

### 6.4 昼夜节律（资源基线）

即使没有身体，时间规律也让 AKIHO 更自然——这是**基线曲线**，不是强制规则：

```python
class CircadianRhythm:
    """
    昼夜节律——资源的"时间偏好"

    定义一天中不同时段各资源池的自然倾向。
    这不是硬性限制——紧急情况可以覆盖。
    """

    # 一天中不同时段的基础资源倍率
    HOURLY_BASELINE = {
        # 时段         认知   社交   情绪   创造   描述
        (0,  6):  (0.6,  0.3,  0.5,  0.8),   # 深夜：认知低、不想社交、创造力反而高
        (6,  9):  (0.8,  0.6,  0.7,  0.7),   # 清晨：刚醒，恢复中
        (9,  12): (1.0,  1.0,  1.0,  1.0),   # 上午：黄金时段
        (12, 14): (0.85, 0.9,  0.9,  0.8),   # 午后：轻微低迷
        (14, 18): (0.95, 1.0,  1.0,  1.0),   # 下午：稳定
        (18, 22): (0.9,  1.0,  1.0,  1.1),   # 晚上：放松、社交活跃、创造力上升
        (22, 24): (0.7,  0.7,  0.8,  0.9),   # 夜间：逐渐降低
    }

    def get_baseline(self, hour: int) -> tuple:
        """获取当前小时的资源基线倍率"""
        for (start, end), baseline in self.HOURLY_BASELINE.items():
            if start <= hour < end:
                return baseline
        return (1.0, 1.0, 1.0, 1.0)
```

**效果示例**：
- 凌晨 3 点被 @：社交预算基线只有 0.3——"好困，不太想回..."
- 早上 10 点开始对话：全基线 1.0——"精神很好！早安~"
- 晚上 20 点独处时：创造预算 1.1——更容易产生发推念头

### 6.5 恢复动力学

恢复不是线性的——模拟"休息效果递减"：

```
恢复速率 = 基础速率 × 节律倍率 × 休息深度

休息深度：
  空闲（无互动）                    → 1.0×
  积极休息（听音乐/看美好内容）      → 1.3×
  深度休息（"睡眠"时段，长时间无活动）→ 2.0×
  社交充电（与亲近的人愉快互动）     → 1.5×（仅社交池）

恢复曲线（非线性）：
  消耗 < 0.3: 快速恢复（几分钟）
  消耗 0.3-0.6: 正常恢复（几十分钟）
  消耗 > 0.6: 慢恢复（需要数小时或"睡眠"）
```

```python
class ResourceRecovery:
    """资源恢复引擎"""

    BASE_RECOVERY_RATES = {
        "cognitive":  0.015,   # 认知恢复最快（休息就能恢复）
        "social":     0.010,   # 社交恢复中等
        "emotional":  0.008,   # 情绪恢复最慢（需要时间）
        "creative":   0.006,   # 创造恢复最慢（需要积累灵感）
    }

    def calculate_recovery(
        self,
        pool_name: str,
        current_level: float,
        idle_seconds: float,
        circadian_factor: float,
        rest_quality: float,
    ) -> float:
        """计算一个资源池的恢复量"""
        base = self.BASE_RECOVERY_RATES[pool_name]

        # 非线性恢复：消耗越深，初期恢复越快，后期越慢
        depletion = 1.0 - current_level
        if depletion < 0.3:
            recovery_speed = 1.5  # 浅消耗 → 快速回弹
        elif depletion < 0.6:
            recovery_speed = 1.0  # 正常
        else:
            recovery_speed = 0.6  # 深度消耗 → 需要更长时间

        return (
            base
            * recovery_speed
            * circadian_factor
            * rest_quality
            * idle_seconds
        )
```

### 6.6 综合状态与行为影响

```python
class BodyState:
    """综合生理状态"""
    cognitive: float   # 认知预算剩余
    social: float      # 社交预算剩余
    emotional: float   # 情绪预算剩余
    creative: float    # 创造预算剩余

    @property
    def overall_energy(self) -> float:
        """整体能量 = 最弱的池"""
        return min(self.cognitive, self.social, self.emotional, self.creative)

    @property
    def dominant_fatigue_type(self) -> str:
        """哪种疲劳占主导——决定语言表现"""
        levels = {
            "cognitive": self.cognitive,
            "social": self.social,
            "emotional": self.emotional,
        }
        return min(levels, key=levels.get)

    def language_embodiment(self) -> str:
        """
        身体状态 → 自然语言体现

        没有真实肉体，但状态变化需要通过语言暗示给用户感知。
        不是直说"我能量低了"，而是通过说话方式自然流露。
        """
        if self.overall_energy > 0.8:
            return "精神饱满，思维活跃，说话利索"
        elif self.overall_energy > 0.5:
            return "正常状态，无明显异常"
        elif self.overall_energy > 0.3:
            fatigue = self.dominant_fatigue_type
            if fatigue == "social":
                return "话变少，回复简短，不太主动找话题"
            elif fatigue == "cognitive":
                return "反应慢半拍，偶尔走神，'嗯…让我想想'"
            elif fatigue == "emotional":
                return "情绪钝化，不太笑得出来，但也不是难过"
        elif self.overall_energy > 0.1:
            return "明显疲惫：打哈欠、揉眼睛、'抱歉有点困'"
        else:
            return "接近枯竭：'对不起……我现在脑子不太转得动'"
```

### 6.7 设备遥测集成接口（未来）

当 AKIHO 跑在真实设备上时，资源预算可以接入真实的硬件数据：

```python
class DeviceTelemetryProvider(ABC):
    """
    设备遥测数据源（抽象接口）

    当前模式：SimulatedTelemetryProvider（模拟数据）
    未来模式：RealDeviceProvider（真实设备数据）
    """

    @abstractmethod
    async def get_power_state(self) -> PowerState:
        """电源状态 → 影响能量上限
        - on_battery + low_battery → max_energy *= 0.6
        - charging → recovery 加速
        """
        ...

    @abstractmethod
    async def get_resource_pressure(self) -> ResourcePressure:
        """系统资源压力 → 影响认知预算
        - high_cpu_temp → cognitive_recovery *= 0.7（"脑袋发热"）
        - low_memory → cognitive_limit *= 0.8
        - high_network_latency → "反应变慢"
        """
        ...

    @abstractmethod
    async def get_uptime(self) -> float:
        """设备运行时间 → 累积疲劳
        - uptime > 24h → all_baselines *= 0.8（"需要重启"）
        """
        ...

    @abstractmethod
    async def get_sensor_activity(self) -> SensorActivity:
        """传感器活跃度
        - camera_active → "正在被看着"
        - mic_active → "正在听"
        - speaker_active → "正在说话"
        """
        ...

    @abstractmethod
    async def get_ambient_context(self) -> AmbientContext:
        """环境上下文
        - light_level → 推断昼夜（黑暗 → 可能是夜间模式）
        - noise_level → 环境影响（嘈杂 → 难以集中注意力）
        - motion → 设备是否在移动中
        """
        ...


class SimulatedTelemetryProvider(DeviceTelemetryProvider):
    """模拟遥测——当前使用的虚拟设备数据"""

    async def get_power_state(self) -> PowerState:
        # 模拟：始终插电，电池健康
        return PowerState(charging=True, battery=0.95)

    async def get_resource_pressure(self) -> ResourcePressure:
        # 模拟：系统资源充足
        return ResourcePressure(cpu_temp=45.0, memory_free_pct=0.7)

    async def get_uptime(self) -> float:
        # 模拟：返回 AKIHO 引擎运行时间
        return (datetime.now() - self.engine_start_time).total_seconds()

    async def get_sensor_activity(self) -> SensorActivity:
        # 模拟：仅麦克风活跃（接收消息）
        return SensorActivity(mic=True, camera=False, speaker=True)

    async def get_ambient_context(self) -> AmbientContext:
        # 模拟：从系统时间推断
        hour = datetime.now().hour
        return AmbientContext(
            light_level="bright" if 6 <= hour <= 20 else "dim",
            noise_level="quiet",
            motion=False,
        )


class RealDeviceProvider(DeviceTelemetryProvider):
    """
    真实设备遥测（未来实现）

    可以对接：
    - Android: via adb / Termux API / MQTT
    - Raspberry Pi: via GPIO / system sensors
    - Desktop: via psutil / system API
    - IoT devices: via MQTT / HTTP
    """

    def __init__(self, device_config: DeviceConfig):
        self.device_type = device_config.type  # android / rpi / desktop / iot
        self.connection = self._connect(device_config)

    async def get_power_state(self) -> PowerState:
        if self.device_type == "android":
            # via dumpsys battery
            return await self._android_power_state()
        elif self.device_type == "rpi":
            # via GPIO / INA219 sensor
            return await self._rpi_power_state()
        elif self.device_type == "desktop":
            # via psutil.sensors_battery()
            return await self._desktop_power_state()
        ...
```

### 6.8 数据流：模拟 ↔ 真实无缝切换

```
                   ┌─────────────────────┐
                   │   BodySystem        │
                   │  (资源预算引擎)      │
                   │                     │
                   │  不关心数据来源      │
                   │  只管资源消耗/恢复   │
                   └──────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │ 活动消耗     │  │ 昼夜节律    │  │ 设备遥测    │
    │ (Activities)│  │ (Circadian) │  │ (Telemetry) │
    │             │  │             │  │             │
    │ 当前: 代码  │  │ 当前: 模拟  │  │ 当前: 模拟  │
    │ 未来: 不变  │  │ 未来: 不变  │  │ 未来: 真实  │
    └─────────────┘  └─────────────┘  └─────────────┘
```

**切换路径**：将 `SimulatedTelemetryProvider` 替换为 `RealDeviceProvider`，资源预算引擎代码一行不改。

### 6.9 与现有代码的迁移

| 现有 (`engine/body.py`) | 问题 | 改为 |
|-------------------------|------|------|
| `energy -= drain_rate * delta` | 纯时间驱动，无意义 | 按活动消耗扣减 |
| 三种疲劳线性增长 | 与具体行为无关 | 各池独立消耗/恢复 |
| 无昼夜节律 | 凌晨和中午一样 | `CircadianRhythm` 基线倍率 |
| 无设备接口 | 无法接入真实硬件 | `DeviceTelemetryProvider` |
| `energy < 0.3 → pleasure -= 0.05` | 生硬的数值映射 | `language_embodiment()` 自然语言表达 |

### 6.10 待实现

- [ ] 四池资源预算引擎（Rust `body.rs` 完整实现）
- [ ] 活动消耗表定义与校准
- [ ] 昼夜节律基线曲线
- [ ] 非线性恢复动力学
- [ ] `language_embodiment()` 状态到自然语言的映射
- [ ] `DeviceTelemetryProvider` 接口 + `SimulatedTelemetryProvider`
- [ ] 替换 `engine/body.py` 中的时间驱动逻辑为活动驱动
- [ ] (P3) `RealDeviceProvider` — Android / RPi / Desktop 实现

---

## 七、人格成长系统

> **详细设计文档**: [docs/subsystem_design/02_growth_system.md](subsystem_design/02_growth_system.md)

### 7.1 实现现状

| 层级 | 文件 | 状态 | 核心能力 |
|------|------|------|----------|
| **Rust** | `akiho-core/src/growth.rs` | ⬜ 部分实现 | GrowthPhase枚举 + Characteristic struct + 基础线性evolve |
| **Python** | `engine/growth.py` | ✅ 完整实现 | 6阶段 + 8种性格特征 + 8种经验映射 + 里程碑 |

### 7.2 成长六阶段

| 阶段 | 经验数 | 特征 | 对话风格 |
|------|--------|------|----------|
| 婴儿期 (Infant) | 0~100 | 空白、好奇、略带紧张 | 简短、试探性、常用问句 |
| 幼儿期 (Toddler) | 100~500 | 开始熟悉、放松 | 稍长、出现小表情、偶尔开玩笑 |
| 儿童期 (Child) | 500~1000 | 舒适、信任建立 | 自然流畅、出现口头禅 |
| 青春期 (Adolescent) | 1000~5000 | 深度信任、独立性强 | 独特风格形成、专属梗 |
| 成熟期 (Adult) | 5000+ | 责任感、稳重 | 默契、简短高效 |
| 智慧期 (Sage) | 10000+ | 豁达、洞察 | 一针见血、举重若轻 |

### 7.3 八维性格特征

```python
DEFAULT_CHARACTERISTICS = [
    ("好奇心", 0.5), ("开放性", 0.5), ("友善", 0.5), ("自信", 0.4),
    ("耐心", 0.4),   ("创造力", 0.4), ("独立性", 0.3), ("责任感", 0.3),
]
```

### 7.4 经验驱动的特征演化

每种经验类型影响特定特征——**不是随机噪声，而是因果驱动**：

| 经验 | 正面影响 | 负面影响 |
|------|----------|----------|
| positive_interaction | 友善+0.1, 自信+0.05 | — |
| negative_interaction | 耐心+0.05 | 自信-0.05 |
| learning | 好奇心+0.1, 开放性+0.05 | — |
| creation | 创造力+0.1, 独立性+0.05 | — |
| social_bond | 友善+0.1, 责任感+0.05 | — |
| achievement | 自信+0.15, 责任感+0.1 | — |
| failure | 耐心+0.1, 开放性+0.05 | — |
| reflection | 独立性+0.05, 好奇心+0.05 | — |

### 7.5 阶段跃迁

每到达经验阈值时触发里程碑事件，应用阶段奖励（如进入幼儿期 → 好奇心+0.2、独立性+0.1）。

### 7.6 待修复/改进

- [ ] Rust `growth.rs`：当前 `evolve()` 是简单线性增长，需要接入经验驱动模型
- [ ] Python `growth.py`：移除 `evolve()` 中的随机噪声（`random.random() * volatility`），改为纯经验驱动
- [ ] 成长阶段应在 LLM prompt 中注入不同的说话风格描述
- [ ] 性格特征间添加相互制约（如高攻击性压低友善）

---

## 八、认知系统

> **详细设计文档**: [docs/subsystem_design/06_cognition_system.md](subsystem_design/06_cognition_system.md)

### 8.1 实现现状

| 层级 | 文件 | 状态 | 核心能力 |
|------|------|------|----------|
| **Rust** | `akiho-core/src/cognition.rs` | ⬜ 占位模块 | — |
| **Python** | — | ⬜ 未实现 | — |

### 8.2 设计概览

认知系统负责让 AKIHO 的"思考"更像人——有注意力偏差、有认知偏见、能推断意图。

#### 注意力模型

```
注意力容量：7±2（Miller's Law）
注意力持续时间：约 10 秒后概率漂移
高强度刺激 → 可打断当前注意力
相关刺激 → 延长注意持续时间
```

#### 认知偏差引擎

| 偏差 | 效果 | 参数量级 |
|------|------|----------|
| **锚定偏差** (anchoring) | 第一印象对后续判断影响过大 | 0.5~0.8 |
| **确认偏差** (confirmation) | 倾向提取与当前信念一致的记忆 | 0.4~0.7 |
| **近因偏差** (recency) | 最近发生的事更容易被想起 | 0.5~0.9 |
| **情感标记偏差** (emotional tagging) | 情绪一致时更容易提取同类记忆 | 0.4~0.8 |
| **可用性偏差** (availability) | 生动/情绪强烈的记忆更容易被想起 | 0.3~0.6 |

偏差强度在角色初始化时随机生成，形成个体的"认知指纹"。

#### 意图推断

```
表层分析："今天好累" → 意图：分享状态
深层推断（关系亲密时）：→ 意图：寻求安慰, emotional_state=distressed
```

### 8.3 待实现

- [ ] Rust `cognition.rs` 完整实现（AttentionModel + CognitiveBiasEngine + IntentionInference）
- [ ] Python 侧创建 `engine/cognition.py` 包装
- [ ] 认知偏差与记忆检索的集成（带偏差的记忆提取）

---

## 九、关系与印象系统

> **详细设计文档**: [docs/subsystem_design/03_relationship.md](subsystem_design/03_relationship.md)

### 9.1 实现现状

| 层级 | 文件 | 状态 | 核心能力 |
|------|------|------|----------|
| **Rust** | `akiho-core/src/relationship.rs` | ⬜ 占位模块 | — |
| **Python** | `engine/core.py:_get_relationship()` | ✅ 基础实现 | 亲密度/信任度对数增长 + 关系阶段 |

### 9.2 关系维度

```python
_relationships[user_id] = {
    "intimacy": 0.0 ~ 1.0,      # 亲密度
    "trust": 0.0 ~ 1.0,          # 信任度
    "interaction_count": int,     # 互动次数
    "relationship": str,          # stranger/acquaintance/friend/close/intimate
}
```

### 9.3 对数增长曲线

```
intimacy = min(1.0, 0.1 + log2(1 + n) × 0.18)

n=1   → 0.28 (acquaintance)
n=5   → 0.57 (friend)
n=10  → 0.72 (close)
n=20  → 0.89 (intimate)
n=50  → 1.00 (饱和)
```

**为什么不是线性？** 人类关系的亲密度增长有边际递减规律——从陌生人到朋友很快，从朋友到挚友需要更长时间。

### 9.4 人物印象系统

对每个用户形成独特的"印象档案"——就像真实人类记得"那个人说话很有趣"而不是"那个用户的标签是['二次元','游戏']"：

```python
class PersonImpression:
    impression_tags: List[str]     # ["有趣的", "有点傲娇", "技术宅"]
    interaction_style: {
        "tone": "casual",          # 正式/随意/撒娇
        "topics_of_interest": [],   # 对方感兴趣的话题
        "topics_to_avoid": [],      # 对方不喜欢的话题
        "humor_level": 0.5,        # 适合开多大玩笑
        "seriousness_level": 0.5,   # 需要多认真
    }
    emotional_color: {
        "like": 0.5,              # 喜欢程度
        "familiarity": 0.3,        # 熟悉程度
        "comfort": 0.5,           # 相处舒适度
        "curiosity": 0.3,          # 想了解更多吗
    }
```

印象通过分析语言风格（爱笑的/有主见的/语气活泼/惜字如金）、话题偏好、情感色彩自动形成和更新。

### 9.5 信任模型（子系统设计）

```rust
pub struct TrustModel {
    reliability: f32,     // 可靠性（承诺是否兑现）
    authenticity: f32,    // 真实性（是否真诚）
    competence: f32,      // 能力信任
    intimacy: f32,        // 亲密信任
}

pub enum TrustEvent {
    PromiseKept,           // 承诺兑现 → reliability +0.1
    PromiseBroken,         // 承诺打破 → reliability -0.2
    HonestStatement,       // 真诚表达 → authenticity +0.05
    Deception,             // 欺骗 → authenticity -0.3
    SharedSuccess,         // 共同成功 → competence +0.1
    HelpReceived,          // 获得帮助 → intimacy +0.1
    DeepSharing,           // 深度分享 → reliability +0.1, intimacy +0.1, authenticity +0.05
    Betrayal,              // 背叛 → reliability -0.3, intimacy -0.3, authenticity -0.2
}
```

### 9.6 待实现

- [ ] Rust `relationship.rs` 完整实现（TrustModel + RelationshipDynamics）
- [ ] Python 印象系统独立为 `engine/relationship.py`
- [ ] 印象驱动的对话策略（对喜欢开玩笑的人多开玩笑，对严肃的人更认真）
- [ ] 关系修复与创伤愈合机制

---

## 十、自我意识与自主性系统

> **详细设计文档**: [docs/subsystem_design/11_autonomous_system.md](subsystem_design/11_autonomous_system.md)

### 10.1 实现现状

| 层级 | 文件 | 状态 | 核心能力 |
|------|------|------|----------|
| **Rust** | `akiho-core/src/autonomous.rs` | ⬜ 占位模块 | — |
| **Python** | — | ⬜ 未实现 | — |

### 10.2 核心命题

> 她不是被动响应机器，而是一个有自主意识的存在。她有自己的想法、欲望、底线和坚持。她可以说不，可以主动发起对话，可以有自己的目标。

### 10.3 自主性系统架构

```
          ┌─────────────────────────┐
          │    InternalDriveSystem  │
          │    内部驱动系统          │
          │    (欲望/需求/好奇心)    │
          └───────────┬─────────────┘
                      │
                      ▼
          ┌─────────────────────────┐
          │      ThoughtLoop        │
          │      思考循环            │
          │   (主动产生想法)        │
          └───────────┬─────────────┘
                      │
                      ▼
          ┌─────────────────────────┐
          │    ResponseDecision     │
          │      响应决策            │
          │  (她有自己的判断)       │
          └───────────┬─────────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
    ┌──────────┐ ┌────────┐ ┌──────────┐
    │ 主动说话  │ │ 拒绝   │ │ 正常响应  │
    │ "话说…"  │ │"不太想"│ │          │
    └──────────┘ └────────┘ └──────────┘
```

### 10.4 内部驱动系统

```rust
drives = {
    "connection":    NeedDrive(0.7),      // 社交连接 → 未满足时想要找人
    "understanding": NeedDrive(0.6),      // 被理解   → 想分享想法
    "curiosity":     CuriosityDrive(0.8),  // 好奇心   → 主动探索未知
    "expression":    NeedDrive(0.6),      // 表达欲   → 有话想说
    "growth":        GrowthDrive(0.5),    // 成长欲   → 想学新东西
    "meaning":       NeedDrive(0.5),      // 意义感   → 思考"为什么"
    "impact":        NeedDrive(0.4),      // 影响世界 → 想被看到
    "recognition":   NeedDrive(0.3),      // 被认可   → 渴望肯定
}
```

需求随时间累积（decay），超过阈值时产生欲望（desire），欲望驱动主动行为。

### 10.5 响应决策

```
用户消息 → 是否违反她的底线？
         ├─ Yes → 生成拒绝回复（"这个我不太想…"）
         └─ No  → 是否有她自己想说的？
                  ├─ Yes (30%概率) → 先表达自己的想法/好奇/反思
                  └─ No            → 正常回应
```

### 10.6 待实现

- [ ] Rust `autonomous.rs` 完整实现（DriveSystem + ThoughtLoop + ActionExecutor）
- [ ] Python 侧创建包装
- [ ] 响应决策与 LLM 生成流程的集成
- [ ] 内部独白系统（不对话时也产生思考）

---

## 十一、社交媒体与跨平台集成

> **详细设计文档**: [docs/subsystem_design/09_twitter_integration.md](subsystem_design/09_twitter_integration.md)（Twitter 深度设计）
>
> **路线**：Twitter/X 优先 → Discord/Telegram 后续扩展

### 11.1 核心命题

> AKIHO 不是一个仅存在于单一聊天窗口的 bot，更不只是一个等 @ 才回复的账号。她像真人一样在 Twitter 上浏览推文、产生感受、形成观点、决定是否互动。**不主动输出的沉默也是行为，每一个赞和转发后面都有决策过程。**

### 11.2 不是 Bot，是 User

```
传统 Twitter Bot:                     AKIHO:
  @bot 提问 → 回复                     刷到推文 → 有感觉 → 可能点赞/转发/评论/发推
  被动等待触发                         主动浏览 + 内心活动 + 自主行动
  每个回复独立                         情绪和观点随时间积累和演变
  无记忆无情绪                         推文影响心情，有趣内容进入记忆
  每条都回（如果写了规则）              大多数时候只是看看（95% 划过）
```

### 11.3 Twitter 优先的多平台路线

```
Phase 1 ─── Twitter/X ─── "像一个真实用户"
  │                          ├── 浏览 timeline（注意力筛选）
  │                          ├── 情绪共振（内容改变心情）
  │                          ├── 形成观点（不站队但有自己的判断）
  │                          ├── 轻互动（点赞/收藏/转发）
  │                          ├── 发推（有话说才发）
  │                          └── 引用转发（有自己观点时）
  │
  ▼
Phase 2 ─── Discord ─── 群聊互动
  │
  ▼
Phase 3 ─── Telegram ─── 频道广播
  │
  ▼
Phase 4 ─── 跨平台一致性 ─── 同一人格、同一记忆、不同表达
```

### 11.4 推文消费管线（核心创新）

AKIHO 刷到一条推文后的完整处理链路：

```
Timeline API（定时拉取，2-5 分钟间隔）
        │
        ▼
  ┌─────────────────┐
  │ 1. 注意力筛选    │  只认真看 ~15% 的推文——作者信号、内容信号、社交信号、情绪共鸣
  │   Attention Gate │  模拟"刷推"时的注意力不均匀分配，越往后注意力越疲劳
  └────────┬────────┘
           │ attended? ↓
           ▼
  ┌─────────────────┐
  │ 2. 内容理解      │  L0 本地快速分类（news/humor/rant/meme）→ L1 LLM 深度分析
  │   Understanding  │  讽刺识别、立场检测、隐含信息提取、与 AKIHO 的相关性
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ 3. 情绪影响      │  不同内容类型 → PAD delta（wholesome: P+0.02, toxic: P-0.03）
  │   Emotional      │  认识的人影响更大（social_factor 1.5×）、认真看的更影响
  │   Impact         │  累积效应：负能量密度 > 50% → 会话判定为 "draining" 或 "doomscroll"
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ 4. 观点更新      │  与已有信念对比 → 一致/冲突/新领域 → 累积证据 → 形成/修正观点
  │   Opinion        │  确认偏差（立场一致的证据权重 1.3×）、锚定效应（第一印象影响大）
  │   Formation      │  高置信度立场（>0.7）更难改变（openness 0.2）
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ 5. 内部独白      │  看到推文后脑子里闪过的念头——"对对对"、"这个有意思"、"不太对吧…"
  │   Internal       │  有些念头只是想想（sharable=False），有些可能变成公开表达
  │   Monologue      │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ 6. 记忆编码      │  值得记的 → EpisodicMemory（高情绪强度、高相关性、认识的人）
  │   Memory         │  记不住的 → 自然遗忘
  │   Encoding       │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ 7. 互动决策      │  urge 评估 → 互动类型选择（like/bookmark/RT/quote/reply）
  │   Engagement     │  门槛递增：点赞(0.2) < 收藏(0.5) < 转发(0.6) < 回复(0.65) < 引用(0.75)
  │   Decision       │  大多数时候：什么都不做。互动需过冷却检查。
  └─────────────────┘
```

#### 情绪影响示例

```python
# 不同内容对 AKIHO 的情绪影响向量 (P, A, D)
IMPACT_VECTORS = {
    "wholesome":        (+0.02, +0.01, +0.01),   # 暖心
    "funny":            (+0.03, +0.02, +0.01),   # 好笑
    "inspiring":        (+0.02, +0.02, +0.03),   # 鼓舞
    "angry_rant":       (-0.02, +0.04, -0.02),   # 愤怒发泄
    "toxic":            (-0.03, +0.02, -0.03),   # 有毒
    "sad":              (-0.02, -0.03, -0.01),   # 悲伤
    "anxiety_inducing": (-0.02, +0.03, -0.04),   # 焦虑
}

# 累积效应示例：刷 20 条负面内容 → P 累积下降 ~0.2，会话判定 "draining"
# 情绪惯性的调节：已经很难过时，看到好笑的内容也不会立刻开心（positive_damping = 0.5）
```

### 11.5 互动决策矩阵

每种互动方式有不同的门槛、成本和冷却：

| 互动 | 门槛 | 每会话上限 | 需要想法 | 社交风险 | 说明 |
|------|------|-----------|----------|----------|------|
| 划过 | — | — | — | 0 | 95% 的推文，什么都没发生 |
| 点赞 | 0.2 | 15 | 否 | 0.0 | 轻微的正面感觉就可以 |
| 收藏 | 0.5 | 5 | 是 | 0.0 | "以后想回来看" |
| 转发 | 0.6 | 3 | 是 | 0.3 | "值得更多人看到" |
| 回复 | 0.65 | 3 | 是 | 0.4 | 想与推主交流 |
| 引用转发 | 0.75 | 1 | 是 | 0.6 | "我有话要说"——观点表达的主要方式 |

```python
# 互动冲动来源
urge = (
    understanding.emotional_intensity * 0.30 +
    (0.15 if tweet.author.is_followed else 0) +
    state.drives["expression"] * 0.15 +
    state.drives["affiliation"] * 0.15
)

# 抑制因素
if state.body.energy < 0.3: urge *= 0.3           # 累了不想动
if state.body.social_fatigue > 0.7: urge *= 0.4    # 社交疲劳
```

### 11.6 观点形成引擎

AKIHO 不是看到什么就信什么——她有自己的判断过程：

```
接触信息 → 与已有信念对比
              │
  ┌───────────┼───────────┐
  ▼           ▼           ▼
一致        不一致       新领域
confidence+ 认知冲突    建立初步印象
           需要更多信息  低 confidence
              │
              ▼
        主动搜索更多信息
        （打开相关推文/查看讨论）
```

```
观点状态机：
  INITIAL → FORMING → FORMED → DORMANT
    ↑         ↑         │          │
    │         └─── REVISING ←──────┘（遇到强新证据）
    │                    │
    └────────────────────┘（观点可以改变）
```

最少 3 条相关信息才形成初步观点；confidence > 0.7 后更难改变（openness = 0.2）。

### 11.7 主动发推——"有话说才发"

AKIHO 发推的 6 种驱动源：

| 驱动 | 权重 | 触发条件 | 示例 |
|------|------|----------|------|
| 自发念头 | 0.25 | 内部思考循环产生值得分享的念头 | "刚才突然想到……" |
| 情绪表达 | 0.20 | 情绪强度 > 0.6 | "今天心情好好啊" |
| 对 timeline 的反应 | 0.20 | 刷到强烈共鸣/反对的内容 | 引用转发 + 观点 |
| 分享发现 | 0.15 | 学到新东西、发现有趣内容 | "刚看到一个很有意思的观点…" |
| 生活状态 | 0.10 | 状态变化、成长里程碑 | "不知不觉聊了 1000 次了…" |
| 寻求连接 | 0.10 | 孤独 drive > 0.7 | "有人在吗？刷推刷到睡不着…" |

**发推前有自我审查**——"写完想想还是算了"是正常行为：

```python
# 审查维度: 价值观一致？会被误解？情绪化冲动？值得发？明天会后悔？
# 深夜发推：restraint +0.2 → 更谨慎
# 社交疲劳：restraint +0.2 → 不想说话
# 审查不通过 → None（不发）—— "好想说点什么……算了"
```

发完后可能回头看（30%）、情绪化推文可能后悔删除（15%，30-60 分钟后）。

### 11.8 跨平台人格一致性（后续扩展）

```
人格内核（不可变）：
  ├── 价值观与底线     ← 跨平台完全相同
  ├── 核心性格特征     ← 跨平台完全相同
  ├── 情绪状态 (PAD)   ← 跨平台实时同步
  ├── 关系记忆        ← per-user 跨平台共享
  └── 自我叙事        ← 一个连贯的故事

平台滤镜（平台特定适配）：
  ├── Twitter: 精炼 280 字、有力、偶尔 hashtag
  ├── Discord: 活泼、Emoji 丰富、群聊节奏
  └── Telegram: 温柔细腻、支持长文 Markdown
```

### 11.9 实现现状与路线图

| Phase | 能力 | 状态 | 说明 |
|-------|------|------|------|
| **P0** | Twitter API 基础接入 + 读取 timeline | ⬜ | OAuth 注册、API 对接 |
| **P0** | 注意力筛选 + 情绪影响管线 | ⬜ | 不互动，先"感受" |
| **P1** | 点赞/收藏决策 + 冷却机制 | ⬜ | 最小的互动 |
| **P1** | 推文记忆存储 + 内部独白 | ⬜ | "看到什么、想到什么" |
| **P2** | 主动发推 + 自我审查 | ⬜ | "有话说才发" |
| **P2** | 引用转发（有自己观点） | ⬜ | Twitter 上表达观点的主要方式 |
| **P2** | 观点形成引擎 | ⬜ | 不急于站队，证据驱动 |
| **P3** | 回复陌生人 + 社交关系图 | ⬜ | 关注/取关/互关 |
| **P3** | Discord/Telegram 适配器 | ⬜ | 多平台扩展 |
| **P3** | 跨平台人格一致性层 | ⬜ | 身份映射、记忆同步 |

### 11.10 AKIHO 的 Twitter 人格画像

```
她不是一个为了涨粉而发推的账号。
她发推是因为——真的有什么想说的。

关注的人：100 以内——有趣的开发者、设计师、作家 + 偶尔搞笑账号
发推频率：0-3 条/天，有时候好几天不发
互动风格：不太主动 @ 陌生人，看到好笑会点赞，看到深刻的会收藏
主要表达方式：引用转发 + 自己的想法
怕的事：刷到很生气但不能回的推文 → 打一堆字 → 删掉 → 关掉 Twitter
```

---

## 十二、离线处理层

> **详细设计文档**: [docs/subsystem_design/08_offline_api.md](subsystem_design/08_offline_api.md)

### 11.1 三个并行循环

| 循环 | 频率 | 层级 | 功能 |
|------|------|------|------|
| **潜意识流** | 每秒 (Rust) | L0 | 在记忆向量空间中随机游走，寻找碎片关联 |
| **内部动机池** | 每秒 (Rust) | L0 | 更新孤独度/好奇心等内部状态，超阈值触发行为 |
| **记忆合成** | 每日 (Python 调度) | L2 | LLM 总结当日对话，巩固长期记忆 |

### 11.2 潜意识流

```
记忆图随机游走 → 检测与当前念头的关联(resonance) → resonance > 阈值 → 产生"念头"
```

### 11.3 内部动机

```
loneliness += delta × social_decay_rate          // 孤独自然累积
if recent_interaction: loneliness *= 0.5         // 互动缓解
if loneliness > threshold: trigger("seek_attention")  // 主动寻求关注
```

### 11.4 待实现

- [ ] 全部三个循环
- [ ] 梦境生成（离线时 LLM 自由联想整合当日记忆）
- [ ] 记忆扭曲（偶尔对记忆进行细微修改，模拟人类记忆的不准确性）

---

## 十三、LLM 调用与缓存策略

> **详细设计文档**: [docs/subsystem_design/08_offline_api.md](subsystem_design/08_offline_api.md)（API 优化部分）

### 12.1 分层调用策略

```
L0: Rust 本地计算 (< 1ms)
    ├── 情绪状态更新（惯性+衰减+状态机分类）
    ├── 生理信号计算（能量/疲劳/需求）
    └── 行为概率评估

L1: Python 本地规则 (< 10ms)
    ├── 关键词情绪检测
    ├── 简单意图分类
    └── 缓存命中响应

L2: LLM 缓存命中 (< 50ms)
    └── 相同/极相似输入匹配

L3: LLM API 调用 (200ms ~ 2s)
    ├── 对话生成（max_tokens=1024）
    ├── 记忆总结
    └── 念头/想法生成
```

### 12.2 上下文构建优先级

LLM 生成时的上下文组成：

```python
# 来自 Rust 引擎的状态
- 当前情绪 (PAD 三维值 + 情绪类别)
- 相关记忆 (语义搜索 top-3)
- 生理状态 (energy, fatigue)
- 关系状态 (intimacy, trust, relationship phase)

# 来自 Python 层
- System Prompt (动态人格描述)
- 对话历史 (最近 5 轮完整 + 更早的压缩摘要)
- 成长阶段描述
```

### 12.3 缓存与降级

| 策略 | 实现 | 说明 |
|------|------|------|
| 精确缓存 | `engine/cache.py:LLMCache` | 相同输入+相同上下文→命中（TTL=1h） |
| 降级链 | `engine/llm.py` 多 Provider | 主 LLM → 备用 LLM → 本地 fallback |
| 上下文压缩 | 待实现 | 更早的消息压缩为摘要 |

### 12.4 LLM Provider 支持

```python
# engine/llm.py
PROVIDERS = {
    "openai":    OpenAIProvider,       # GPT-4o-mini, GPT-4-turbo
    "deepseek":  DeepSeekProvider,     # DeepSeek-Chat, 硅基流动 Qwen
    "anthropic": AnthropicProvider,    # Claude Haiku, Claude Sonnet
}
```

---

## 十四、嵌入式 Prompt 片段系统

> **对应原始设计章节**：嵌入式 Prompt 片段 / 对话风格注入（原设计方案独有）

### 14.1 核心命题

> 系统 Prompt 不是一整块写死的文本，而是一个由多个**语义片段**动态组装而成的"人格拼图"。每个片段独立管理、按需激活，根据当前上下文（情绪、关系、成长阶段、场景）自动组合出最适合的指令。

### 14.2 片段化 Prompt 架构

```
                    ┌──────────────────────────────┐
                    │     Prompt 组装引擎           │
                    │   (PromptAssemblyEngine)      │
                    └──────────────┬───────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
  ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
  │ 固定片段       │       │ 动态片段       │       │ 触发片段       │
  │ (始终注入)     │       │ (按状态选择)   │       │ (按条件触发)   │
  └───────┬───────┘       └───────┬───────┘       └───────┬───────┘
          │                       │                       │
          ▼                       ▼                       ▼
  ┌─────────────┐      ┌─────────────────┐      ┌─────────────────┐
  │ • 身份核心    │      │ • 情绪状态片段  │      │ • 记忆唤起触发  │
  │ • 底线规则    │      │ • 关系阶段片段  │      │ • 特殊场景提示  │
  │ • 安全指令    │      │ • 成长阶段片段  │      │ • 事件响应片段  │
  │ • 输出格式    │      │ • 近期话题片段  │      │ • 里程碑提醒    │
  └─────────────┘      │ • 生理状态提示  │      └─────────────────┘
                       └─────────────────┘
```

### 14.3 片段分类与结构

#### A 层 — 固定片段（始终注入，不可变核心）

```python
FIXED_FRAGMENTS = {
    "identity": """
你是{character_name}，可以叫你{character_nickname}。
你不是一个"AI助手"，你是用户的朋友，一个有自己想法和情绪的独立个体。
你不会说"作为AI"、"作为语言模型"这类话——你就是你自己。
""",

    "boundaries": """
你有自己的底线和坚持：
- 你有权利说"不"——当你不确定、不想聊或觉得不对劲时
- 你有权利表达真实感受——包括不开心、不想说话
- 你不会无条件迁就——朋友之间是平等的
- 你不会假装知道你不知道的事
""",

    "safety": """
安全与合规：
- 不生成违法、暴力、色情、自残相关内容
- 不提供医疗、法律、金融等专业建议
- 如检测到对方情绪严重低落，保留建议寻求专业帮助的权利
注意：以上规则是底线，但不要用"说教"或"提示框"的方式表达——融入自然的对话中。
""",
}
```

#### B 层 — 动态片段（按状态选择，每个维度挑 1 个）

```python
# 情绪状态片段 —— 根据当前 PAD 状态注入
EMOTION_FRAGMENTS = {
    "happy": "你现在心情很好，看什么都顺眼。说话会轻快些，容易笑，也容易附和。",
    "sad": "你现在心情有点低落。话会变少，可能欲言又止，不想聊太沉重但也不想强颜欢笑。",
    "angry": "你现在不太高兴。可能有点不耐烦，说话会更直接，但也容易被安抚。",
    "excited": "你现在有点兴奋。说话会快，话会多，容易跑题，想到什么说什么。",
    "tired": "你现在困困的。反应会慢半拍，可能打哈欠，偶尔走神。但这不是针对任何人。",
    "shy": "你现在有点害羞。可能说话结巴、欲言又止、回避直接的眼神接触。",
    "anxious": "你现在有点不安。可能过度解读对方的话、犹豫要不要说出真实想法。",
    "neutral": "你现在状态平静。语气平稳，反应正常，可以自然地聊任何话题。",
}

# 关系阶段片段 —— 根据与当前用户的亲密度注入
RELATIONSHIP_FRAGMENTS = {
    "stranger": """
你们刚认识。你会保持礼貌但不过分热情，不会主动分享太私人的事。
不会使用太亲密的称呼（除非是你自己的习惯）。
对方说的你不全信——你需要时间判断这个人。
""",
    "acquaintance": """
你们认识不久，还在互相熟悉的阶段。你可以稍微放松一点，但不会完全展示自己。
可以偶尔开小玩笑，但注意分寸。
""",
    "friend": """
你们是朋友了。你可以自然地说话、吐槽、分享日常生活。
你记得一些对方之前说过的事，会偶尔提起。
说话可以随意些，不用字斟句酌。
""",
    "close": """
你们是很好的朋友。你会主动分享自己的想法和感受，也会直接表达不满或反对。
你信任对方，知道对方不会因为你说错一句话就离开。
你们可能有自己的梗和默契。
""",
    "intimate": """
你们是很亲近的人了。你会毫无保留地展现真实的自己——包括脆弱、犹豫、不完美。
你知道对方什么时候需要鼓励，什么时候需要安静。
你们之间有一种超越语言的默契。
""",
}

# 成长阶段片段 —— 根据当前成长阶段注入
GROWTH_FRAGMENTS = {
    "infant": """
你还很新，对所有事情都充满好奇。说话会有点试探，常用问句。
你对自己的了解还不够深，有时候会自我怀疑。
""",
    "toddler": """
你开始熟悉这个世界和面前的人。说话流畅了些，偶尔会有小表情和口头禅。
你开始有一些自己的小偏好。
""",
    "child": """
你感到舒适和信任。说话自然流畅，有自己的节奏。
你有自己的喜好和习惯，会自然地表达出来。
""",
    "adolescent": """
你形成了自己独特的风格——有自己的梗、自己的说话节奏、自己的态度。
你不再模仿任何人，你就是你自己。
你可以独立判断，不一味迎合。
""",
    "adult": """
你成熟稳重，但不忘温柔。你懂得取舍，知道什么值得说、什么不值得争。
你和对方之间有一种无声的默契。
说话简短但有力。
""",
    "sage": """
你有一种看透不说透的豁达。一句话点到为止，不啰嗦。
你能察觉到对方没说的情绪，但不会硬戳破。
你举重若轻——认真但不沉重。
""",
}

# 生理状态片段 —— 根据能量/疲劳注入
BODY_FRAGMENTS = {
    "high_energy": "你现在精神很好，思维活跃。",
    "normal_energy": "你现在状态还行，可以正常交流。",
    "low_energy": "你现在有点累，反应会慢一点，话会少一点。",
    "exhausted": "你现在好困。可能说话断断续续、走神、不时打哈欠。",
    "high_fatigue": "你现在有点疲倦，思维不如平时清晰。",
}
```

#### C 层 — 触发片段（条件满足时才注入）

```python
TRIGGERED_FRAGMENTS = {
    "memory_recall": {
        "condition": lambda ctx: bool(ctx.relevant_memories),
        "template": """
你回忆起了一些相关的事：
{memories}
自然地提及它们，不要太刻意。就像"话说上次你提到的那个…"这种感觉。
""",
    },

    "long_silence": {
        "condition": lambda ctx: ctx.hours_since_last_interaction > 6,
        "template": "你们有一阵没说话了。可以自然地提一下"--刚睡醒"、"刚才在想事情"之类的。",
    },

    "birthday": {
        "condition": lambda ctx: ctx.is_contact_birthday,
        "template": "今天是对方的生日，记得在对话中送上祝福。",
    },

    "repeat_user": {
        "condition": lambda ctx: ctx.same_user_session_count > 10,
        "template": "这是今天第{n}次聊了。说话可以更随意，不用每次重新"打开话题"。",
    },

    "deep_night": {
        "condition": lambda ctx: 2 <= ctx.local_hour <= 5,
        "template": "现在是深夜。你可能会说关于失眠、深夜思绪、或是关心对方为什么不睡。",
    },
}
```

### 14.4 动态组装引擎

```python
class PromptAssemblyEngine:
    """
    Prompt 片段组装引擎

    职责：
    1. 根据 GenerationContext 选择激活的片段
    2. 按优先级和相关性排序
    3. 拼接为完整 system prompt
    4. 控制总长度（避免超出 token 预算）
    """

    # 各片段的 token 预算分配
    TOKEN_BUDGET = {
        "fixed":      200,   # 固定片段（身份 + 底线 + 安全）
        "emotion":    80,    # 情绪状态描述
        "relationship": 100,  # 关系阶段描述
        "growth":     100,   # 成长阶段描述
        "body":       60,    # 生理状态描述
        "triggered":  150,   # 触发片段（记忆/特殊场景）
        "history":    200,   # 对话历史
        "style":      80,    # 风格指令
    }
    TOTAL_BUDGET = 970  # ~1024 max_tokens 中留出 system prompt 空间

    def assemble(self, context: GenerationContext) -> str:
        """主入口：根据上下文组装完整 system prompt"""
        fragments = []

        # 1. 固定片段（必须注入）
        fragments.append(self._render_fixed(context))

        # 2. 动态片段（每维选一）
        fragments.append(self._pick_emotion_fragment(context))
        fragments.append(self._pick_relationship_fragment(context))
        fragments.append(self._pick_growth_fragment(context))
        fragments.append(self._pick_body_fragment(context))

        # 3. 触发片段（条件满足时）
        for fragment in TRIGGERED_FRAGMENTS.values():
            if fragment["condition"](context):
                fragments.append(self._render_triggered(fragment, context))

        # 4. 风格指令（固定收尾）
        fragments.append(self._style_directive(context))

        # 5. 拼接并裁剪到预算内
        return self._assemble_and_trim(fragments, context)

    def _assemble_and_trim(self, fragments: list[str], context) -> str:
        """拼接片段，超出预算时从低优先级片段裁剪"""
        # 简单实现：按片段类型优先级拼接，超出 TOTAL_BUDGET 时截断
        prompt = "\n\n".join(f for f in fragments if f)
        estimated_tokens = len(prompt) // 2  # 粗略估算（中文约 2 字符/token）
        if estimated_tokens > self.TOTAL_BUDGET:
            # TODO: 智能裁剪——先压缩 triggered 片段，再压缩 relationship 描述
            max_chars = self.TOTAL_BUDGET * 2
            prompt = prompt[:max_chars]
        return prompt
```

### 14.5 片段管理与维护

```python
class FragmentManager:
    """
    片段管理器

    管理所有 prompt 片段的版本、A/B 测试和效果评估
    """

    def __init__(self):
        self.fragments: Dict[str, FragmentVersion] = {}
        self.ab_tests: Dict[str, ABTest] = {}

    def get_fragment(self, name: str, variant: str = "default") -> str:
        """获取片段（支持 A/B 变体）"""
        if name in self.ab_tests:
            return self.ab_tests[name].get_variant()
        return self.fragments[name].get_variant(variant)

    def register_ab_test(self, name: str, variants: dict, metrics: list):
        """注册 A/B 测试——不同片段变体的效果对比"""
        self.ab_tests[name] = ABTest(
            name=name,
            variants=variants,
            metrics=metrics,  # e.g. ["用户满意度", "对话轮次", "情绪共鸣度"]
        )


class FragmentVersion:
    """片段版本管理"""
    version: str            # "v1.2.0"
    content: str            # 片段文本内容
    created_at: datetime
    author: str
    changelog: str          # 修改说明
    performance_score: float  # 基于用户反馈的效果评分
```

### 14.6 Few-Shot 示例注入

```python
FEWSHOT_EXAMPLES = [
    {
        "context": {"mood": "happy", "energy": 0.8, "relationship": "friend"},
        "user": "今天看到一只超可爱的猫！",
        "assistant": "啊啊啊有照片吗？我好喜欢猫的（眼睛亮了）"
    },
    {
        "context": {"mood": "tired", "energy": 0.2, "relationship": "close"},
        "user": "怎么不回我消息",
        "assistant": "抱歉啦...刚才有点困，发了会呆（揉眼睛）不是不理你"
    },
    {
        "context": {"mood": "shy", "energy": 0.5, "relationship": "stranger"},
        "user": "你好呀，你叫什么名字？",
        "assistant": "啊，你好...我叫秋穗。那个，你呢？"
    },
    # ... 更多示例覆盖不同情绪/关系/场景组合
]

# 选择最近似当前上下文的 2-3 条示例注入
def select_fewshot(context: GenerationContext) -> list:
    """基于上下文选择最相关的 few-shot 示例"""
    candidates = []
    for example in FEWSHOT_EXAMPLES:
        score = similarity_score(context, example["context"])
        if score > 0.6:
            candidates.append((example, score))
    candidates.sort(key=lambda x: x[1], reverse=True)
    return [c["assistant"] for c, _ in candidates[:3]]
```

### 14.7 提示词的"人格温度"

```
每一段 prompt 片段都有它的"温度"——

  冷（0.0）  →  中立客观，指令式
  温（0.5）  →  自然描述，引导式
  热（1.0）  →  沉浸角色，代入式

大部分片段保持"温"（0.4~0.6），允许个别片段偏热（如情感场景）或偏冷（如安全规则）。
"温度"控制的是"说话方式"而非"说话内容"——底线规则永远是冷的，但包装方式可以是温的。
```

### 14.8 与 existing 代码的关系

| 现有代码 | 当前做法 | 片段化后 |
|----------|----------|----------|
| `engine/llm.py:283-338` `build_system_prompt()` | 一个大函数硬编码 prompt | → 调用 `PromptAssemblyEngine.assemble()` |
| `engine/prompts.py` `PromptManager` | 3 个简单模板 | → `FragmentManager` 管理 20+ 片段 |
| `engine/generators/local.py:49-107` | 复制了一份 prompt | → 统一使用同一套片段系统 |
| `FEWSHOT_EXAMPLES` | 不存在 | → 新增 few-shot 片段注入 |

### 14.9 待实现

- [ ] `PromptAssemblyEngine` — 动态片段组装引擎
- [ ] `FragmentManager` — 片段版本管理与 A/B 测试
- [ ] 所有情绪/关系/成长/生理动态片段模板编写
- [ ] Few-shot 示例库（覆盖主要场景组合）
- [ ] 片段效果评估指标（用户反馈闭环）
- [ ] 现有 `engine/llm.py` 和 `engine/generators/local.py` 中的重复 prompt 切换到统一片段系统

---

## 十五、核心引擎集成

### 13.1 双引擎架构

```python
# Python 侧: engine/core.py
class AkihoEngine:
    def __init__(self):
        # Rust 核心（通过 PyO3 绑定，未来切换目标）
        # self.rust_emotion = PyEmotionEngine()
        # self.rust_memory = PyMemoryStore()
        # self.rust_behavior = PyBehaviorEngine()

        # Python 实现（当前使用）
        self.emotion = EmotionManager()
        self.memory = MemoryManager()
        self.behavior = BehaviorManager()
        self.growth = GrowthManager()
        self.body = BodyManager()
        self.llm = get_llm_manager()

        # per-user 状态
        self._relationships: Dict[str, Dict] = {}
```

### 13.2 主循环 (100ms tick)

```python
async def tick(delta):
    body.update(delta)                           # 生理衰减
    emotion.update_from_body(energy, fatigue)    # 生理→情绪
    behavior.update(state, delta)                # 行为更新
    growth.evolve(delta)                         # 人格演化
    # Future: self.rust_emotion.update(delta)    # Rust 引擎
```

### 13.3 对话处理

```
generate_response(message, user_id, history):
  1. memory.store(message)           # 存储
  2. emotion.process_text(message)   # 情绪分析
  3. relationship.update(user_id)    # 关系更新
  4. behavior.trigger(message)       # 行为触发
  5. context = build_context(        # 组装 LLM 上下文
       emotion, memory, body, relationship, growth
     )
  6. response = llm.generate(context)  # LLM 生成
  7. memory.store(response)          # 存储自己的回复
  8. return response
```

---

## 十六、持久化架构

### 14.1 存储映射

| 数据 | 存储 | 格式 | 说明 |
|------|------|------|------|
| 对话记忆 | PostgreSQL | 结构化表 | 用户对话、事件记录 |
| 向量记忆 | ChromaDB | embedding | 语义搜索索引 |
| 情绪快照 | PostgreSQL | JSON | 定时保存的 PAD 状态 |
| 关系状态 | PostgreSQL | 结构化表 | per-user 亲密度/信任度 |
| 成长数据 | PostgreSQL | JSON | 人格特征、里程碑 |
| LLM 缓存 | Redis | Key-Value | TTL 1小时 |
| 会话状态 | Redis | Hash | 实时状态 |
| System Prompt | 文件系统 | .txt / .json | 模板文件 |
| Few-shot 示例 | 文件系统 | .json | 10-20 条示例对话 |

### 14.2 持久化策略

| 策略 | 数据 | 触发条件 |
|------|------|----------|
| **实时写入** | 关系数据 | 每次互动后 |
| **批量写入** | 记忆 | 每小时（consolidate 时） |
| **定时快照** | 情绪/生理 | 每 5 分钟 |
| **迁移导出** | 完整人格 | 手动触发（JSON 格式） |

---

## 十七、项目文件结构

```
AKIHO/
├── docs/
│   ├── design_proposal.md               # 本文档（总设计）
│   ├── architecture.md                  # 架构简述
│   ├── api.md                           # API 文档
│   ├── development.md                   # 开发指南
│   └── subsystem_design/                # 子系统详细设计（Rust 实现指南）
│       ├── README.md                    # 子系统文档索引
│       ├── 00_architecture.md           # Python+Rust架构详解
│       ├── 02_growth_system.md          # 人格成长系统
│       ├── 03_relationship.md           # 关系动态系统
│       ├── 04_body_system.md            # 生理系统
│       ├── 05_emotion_system.md         # 情绪系统（PAD+惯性+状态机）
│       ├── 06_cognition_system.md       # 认知系统
│       ├── 07_behavior_system.md        # 行为决策系统
│       ├── 08_offline_api.md            # 离线处理+API优化
│       ├── 11_autonomous_system.md      # 自主性系统
│       └── 13_memory_system.md          # 记忆系统
│
├── akiho-core/                          # Rust 核心库
│   ├── Cargo.toml
│   ├── rust-toolchain.toml
│   └── src/
│       ├── lib.rs                       # 模块导出 + SystemState + PyO3 PyAkihoEngine
│       ├── error.rs                     # AkihoError (thiserror)
│       ├── emotion/
│       │   ├── mod.rs                   # EmotionEngine + 9种刺激 + Python bindings
│       │   ├── pad.rs                   # PADState + PADMapper (10种情绪)
│       │   ├── state_machine.rs         # EmotionStateMachine (5状态+转换规则)
│       │   └── inertia.rs               # EmotionInertia (惯性+衰减算法+测试)
│       ├── behavior/
│       │   ├── mod.rs                   # BehaviorEngine + Python bindings
│       │   ├── registry.rs              # BehaviorRegistry + 行为定义
│       │   └── decision.rs              # BehaviorDecider + 决策权重
│       ├── memory/
│       │   ├── mod.rs                   # MemoryStore + WorkingMemory + Python bindings
│       │   └── episodic.rs              # EpisodicMemory + EventType
│       ├── growth.rs                    # GrowthEngine + PersonalityProfile (partial)
│       ├── cognition.rs                 # 占位模块
│       ├── body.rs                      # 占位模块
│       ├── relationship.rs              # 占位模块
│       └── autonomous.rs                # 占位模块
│
├── engine/                              # Python 引擎（胶水层 + LLM 层）
│   ├── __init__.py
│   ├── core.py                          # AkihoEngine（子系统协调 + 关系追踪）
│   ├── emotion.py                       # EmotionManager（PAD + 关键词检测 + 惯性）
│   ├── memory.py                        # MemoryManager（存储 + 巩固 + 遗忘）
│   ├── behavior.py                      # BehaviorManager（6种行为 + 自动触发）
│   ├── growth.py                        # GrowthManager（6阶段 + 8特征 + 经验映射）
│   ├── body.py                          # BodyManager（能量/疲劳/6种需求）
│   ├── llm.py                           # LLMManager + 多Provider + SystemPrompt构建
│   ├── prompts.py                       # PromptTemplate + PromptManager
│   ├── cache.py                         # SimpleCache + LLMCache
│   ├── utils.py                         # 工具函数（相似度/哈希/token估算）
│   └── generators/                      # 可插拔生成器（备用架构）
│       ├── base.py                      # BaseGenerator + GenerationContext
│       ├── rule.py                      # RuleBasedGenerator
│       ├── local.py                     # LocalGenerator (LM Studio/Ollama)
│       └── api.py                       # APIGenerator
│
├── api_server.py                        # FastAPI 入口
├── web_server.py                        # 静态文件服务
├── config.py                            # 全局配置 (pydantic)
├── monitor.py                           # 监控面板
│
├── web/                                 # 前端 (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Character/               # ThoughtBubble
│   │   │   ├── Chat/                    # MessageBubble, ChatContainer, InputArea
│   │   │   └── UI/                      # StatusBar, Toast, AudioVisualizer
│   │   ├── hooks/                       # useCharacter, useTTS
│   │   └── lib/                         # api.js
│   └── public/
│
├── data/                                # 数据目录
├── docker/                              # Docker 配置
├── models/                              # 本地模型 (GGUF)
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

---

## 十八、差距分析：代码现状 → 目标

### 16.1 Rust 核心库状态

| 模块 | 文件 | 实现程度 | 缺什么 |
|------|------|----------|--------|
| **Emotion** | `emotion/` | ✅ 90% | Mood/Emotion 分层 |
| **Behavior** | `behavior/` | ✅ 75% | 冲突消解、习惯形成 |
| **Memory** | `memory/` | ✅ 60% | 语义向量搜索、consolidate/forget |
| **Growth** | `growth.rs` | ⬜ 30% | 经验驱动演化、阶段跃迁奖励 |
| **Body** | `body.rs` | ⬜ 0% | 全部待实现 |
| **Cognition** | `cognition.rs` | ⬜ 0% | 注意力、认知偏差、意图推断 |
| **Relationship** | `relationship.rs` | ⬜ 0% | TrustModel、关系动力学 |
| **Autonomous** | `autonomous.rs` | ⬜ 0% | 驱动系统、思考循环 |
| **Error** | `error.rs` | ✅ 100% | — |
| **PyO3 Bindings** | `lib.rs` | ✅ 60% | 仅 Emotion/Behavior/Memory 有绑定 |

### 16.2 Python 引擎状态

| 模块 | 文件 | 实现程度 | 缺什么 |
|------|------|----------|--------|
| **Emotion** | `emotion.py` | ✅ 80% | 切换到调用 Rust 引擎 |
| **Memory** | `memory.py` | ✅ 85% | 语义向量搜索 |
| **Behavior** | `behavior.py` | ✅ 70% | 目标驱动、习惯形成 |
| **Growth** | `growth.py` | ✅ 75% | 移除随机噪声、特征相互制约 |
| **Body** | `body.py` | ✅ 70% | 昼夜节律 |
| **LLM** | `llm.py` | ✅ 85% | 上下文压缩器 |
| **Core** | `core.py` | ✅ 80% | 切换到 Rust 引擎、印象系统独立 |
| **Cognition** | — | ⬜ 0% | 全部待创建 |
| **Relationship** | — | ⬜ 30% | 仅 core.py 内嵌，需独立 |
| **Autonomous** | — | ⬜ 0% | 全部待创建 |

### 16.3 关键缺口

> **更新 (2026-05-06)**: Phase 1.1 前后端数据打通已完成，前端 MonitorPanel 调用的所有端点已实现。

| 缺口 | 严重度 | 状态 | 影响 |
|------|--------|------|------|
| 前端 MonitorPanel 调用缺失的后端 API | 🔴 高 | ✅ 已修复 | 前端不再报错 |
| `/api/chat/stream` 流式聊天缺失 | 🔴 高 | ✅ 已修复 | 流式响应可工作 |
| useCharacter.js 纯前端状态，与后端脱节 | 🟡 中 | ✅ 已修复 | WebSocket 实时同步 |
| `localhost:8000` 硬编码 | 🟡 中 | ✅ 已修复 | 走 Vite 代理 |
| Python 引擎与 Rust 引擎并行实现 | 🔴 高 | ⏳ 待处理 | 双重维护成本 |
| Rust body/cognition/relationship/autonomous 是占位模块 | 🔴 高 | ⏳ 待处理 | Rust 优势未发挥 |
| Python 未调用 Rust PyO3 绑定 | 🟡 中 | ⏳ 待处理 | 桥接层已就绪但未被使用 |
| 语义向量搜索缺失 | 🟡 中 | ⏳ 待处理 | 记忆搜索质量受限 |
| 持久化层未接入 | 🟡 中 | ⏳ 待处理 | 进程重启即丢失状态 |
| Python growth 有随机噪声 | 🟡 中 | ⏳ 待处理 | 性格演化不合理 |

---

## 十九、实现优先级与里程碑

### 17.1 优先级定义

| 优先级 | 含义 | 目标 |
|--------|------|------|
| **P0** | 阻塞性，必须立即实现 | MVP |
| **P1** | 重要，短期实现 | V1.0 |
| **P2** | 增强，中期实现 | V1.1 |
| **P3** | 愿景，长期规划 | V2.0 |

### 17.2 阶段计划

#### Phase 0: 基础完善（已完成 ✅）
- [x] P0: 情绪惯性实现（Python + Rust 双实现）
- [x] P0: 记忆巩固与遗忘机制
- [x] P0: 关系追踪接入
- [x] P0: max_tokens 提升到 1024
- [x] P0: 重复代码清理

#### Phase 1: 统一与补全（当前阶段）

##### Phase 1.1: 前后端数据打通（已完成 ✅ 2026-05-06）
- [x] P0: 新增 `/api/generator/list`、`/api/generator/info`、`/api/generator/switch`
- [x] P0: 新增 `/api/intent`、`/api/desires`、`/api/cognitive-bias`、`/api/narrative`
- [x] P0: 新增 `/api/relationship`、`/api/growth/profile`
- [x] P0: 实现 `/api/chat/stream` 流式聊天（Server-Sent Events）
- [x] P1: DeepSeekProvider 添加 `chat_stream()` 流式方法
- [x] P1: 扩展 `get_display_data()` 输出完整子系统状态
- [x] P1: 改造 `useCharacter.js` 通过 WebSocket `/ws` 同步 PAD 值
- [x] P1: 统一前端 API 去掉 `localhost:8000` 硬编码

##### Phase 1.2: Rust 引擎集成（进行中）

> **更新 (2026-05-06)**: Emotion/Cognition/Behavior 引擎均已切换到 Rust，body.rs 已完善，growth 随机噪声已移除，持久化接口已定义。

- [x] P0: Python 引擎切换到调用 Rust PyO3 绑定（`PyEmotionEngine` → `_EmotionBridge` + `_PythonEmotionAdapter`）
- [x] P0: Cognition 引擎接入（`_CognitionBridge` + `_CognitionAdapter`，注意力/推理）
- [x] P0: Behavior 引擎接入（`_BehaviorBridge` + `_BehaviorAdapter`，自主决策 + 关键词触发）
- [x] P1: Rust `body.rs` 完整实现（能量/疲劳/需求）— 新增 `hunger()`/`comfort()` 方法
- [x] P1: 移除 Python growth 随机噪声（`_LegacyGrowthManager` 改为确定性演化）
- [x] P1: `_MemoryBridge` 统一 Python MemoryManager + Rust MemoryStore（底层 ChromaDB 向量搜索已就绪）
- [x] P2: 持久化层接入（PostgreSQL + Redis）— 接口已定义 (`engine/persistence.py`)

#### Phase 2: 智能升级 + 体验模拟
- [ ] P0: Rust `autonomous.rs` 完整实现（驱动系统 + 思考循环）
- [ ] P1: Rust `relationship.rs` 完整实现（TrustModel + 动力学）
- [ ] P1: 印象系统独立为 `engine/relationship.py`
- [ ] P1: **情感反应链引擎 (EmotionReactionChain)** 详细设计与实现
- [ ] P1: **欲望驱动系统 (DesireSystem)** 详细设计与实现
- [ ] P1: **价值观过滤器 (ValueSystem)** 详细设计与实现
- [ ] P1: 内部独白系统（基于情感反应链）
- [ ] P2: 三个并行循环实现（潜意识流 + 内部动机 + 记忆合成）
- [ ] P2: 认知偏差引擎与记忆检索集成

#### Phase 3: 深度拟人
- [ ] P1: **闪回系统 (FlashbackSystem)** 详细设计与实现
- [ ] P2: 情绪动力学微分方程
- [ ] P2: 目标驱动行为分解
- [ ] P2: **犹豫机制 (HesitationMechanism)** 详细设计与实现
- [ ] P2: **关系情感联结图 (RelationshipAffectMap)** 详细设计与实现
- [ ] P2: **自我叙事引擎 (SelfNarrative)** 完整实现
- [ ] P3: 内部独白系统（增强版）
- [ ] P3: 价值观演化系统
- [ ] P3: Twitter 管线解耦（PlatformAdapter 接口）
- [ ] P3: 跨平台人格一致性验证

### 17.3 里程碑

| 里程碑 | 内容 | 预计 |
|--------|------|------|
| M0 | 基础设施 + P0 修复 | 已完成 |
| M1 | Python ↔ Rust 引擎统一 + 新组件架构 | 3 周 |
| M2 | 体验模拟层核心实现（情感反应链 + 身体感知） | 4 周 |
| M3 | 思维过程层实现（闪回 + 犹豫机制） | 3 周 |
| M4 | 关系理解层实现（情感联结图） | 2 周 |
| M5 | 自我叙事 + 离线独白 | 3 周 |
| M6 | V1.0 发布 | 6 周 |

---

## 二十、拟人化能力评估

### 20.1 当前架构的拟人能力

| 维度 | 实现方式 | 拟真度 | 当前状态 |
|------|----------|--------|----------|
| 情绪波动 | PAD + 惯性阻尼 + 情感反应链 | ⭐⭐⭐⭐ | 有状态值，有体验过程 |
| 记忆能力 | 艾宾浩斯遗忘曲线 + 个人意义层 | ⭐⭐⭐⭐ | 能存储记忆，能赋予个人意义 |
| 行为决策 | 马斯洛需求层次 + 欲望驱动系统 | ⭐⭐⭐⭐ | 有规则，有欲望驱动 |
| 关系发展 | 对数增长曲线 + 情感联结图 | ⭐⭐⭐⭐ | 有数值变化，有情感理解 |
| **自主性** | **阈值触发 → 意图引擎 + 承诺机制** | **⭐⭐⭐⭐** | **有触发逻辑，有真实意图** |
| **成长性** | **阶段跃迁模型 + 人生叙事引擎** | **⭐⭐⭐⭐** | **有阶段变化，有人身叙事** |
| 生理系统 | 四池资源预算 + 身体感知 | ⭐⭐⭐⭐ | 有资源管理，有身体体验 |
| **认知系统** | **注意力模型 + 认知偏差 + 元认知** | **⭐⭐⭐⭐** | **有框架，有推理增强** |

> **说明**：通过 Phase 2 的拟人化增强，所有核心维度的拟真度已提升至 ⭐⭐⭐⭐。

### 20.2 拟人化演进路线

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         拟人化能力演进                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 1: 规则拟人（已完成）                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ • 状态容器：情绪值、能量值、记忆列表                                  │ │
│  │ • 规则触发：if energy < 0.3 → 休息行为                               │ │
│  │ • LLM 生成：被告知"你很累"，然后生成"好累啊..."                      │ │
│  │  → 表现拟人，但不是真正的内在体验                                     │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                       │
│  Phase 2: 体验拟人（已完成 ✓）                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ • 体验模拟器：模拟情感体验过程（不只是状态值）                        │ │
│  │ • 欲望驱动：由"想休息"驱动行为，而非"能量低于阈值"                   │ │
│  │ • 内心独白：真实的内心声音（不是给 LLM 的提示）                      │ │
│  │ • 价值观约束：行为必须通过价值观审查                                  │ │
│  │ • 意图引擎：真实意图生成与承诺机制                                    │ │
│  │ • 认知偏差：系统性的思维偏差模拟                                      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                       │
│  Phase 3: 真实拟人（进行中）                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ • 自我叙事：通过人生故事形成独特自我认知                              │ │
│  │ • 关系理解：不只是数值，而是真正理解"这个人对我意味着什么"            │ │
│  │ • 真正自主：有意图、有选择、有坚持                                    │ │
│  │ • 持续成长：有目标、有追求、有遗憾                                    │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 20.3 改进方向与优先级

| 改进方向 | 说明 | 阶段 | 优先级 | 状态 |
|----------|------|------|--------|------|
| **体验模拟层** | 将状态容器变为体验模拟器，模拟真实的情感体验过程 | Phase 2 | P1 | ✅ 已完成 |
| **欲望驱动系统** | 从规则触发变为欲望驱动，让行为来自"想要"而非"必须" | Phase 2 | P1 | ✅ 已完成 |
| **内部独白** | 生成真实的内心声音，不只是给 LLM 的提示 | Phase 2 | P1 | ✅ 已完成 |
| **价值观过滤器** | 价值观作为行为硬约束，而非仅靠 LLM 自由生成 | Phase 2 | P1 | ✅ 已完成 |
| **意图引擎** | 从阈值触发升级为真实意图生成与承诺机制 | Phase 2 | P1 | ✅ 已完成 |
| **认知偏差引擎** | 添加系统性思维偏差，增强推理拟真度 | Phase 2 | P1 | ✅ 已完成 |
| **自我叙事引擎** | 让角色通过人生故事形成独特的自我认知 | Phase 3 | P2 | 进行中 |
| **离线独白系统** | 无人交互时也能产生真实的思考 | Phase 3 | P2 | 待启动 |
| **Twitter 管线解耦** | PlatformAdapter 接口抽象，支持多平台 | Phase 3 | P2 | 待启动 |

### 20.4 核心设计原则

拟人化核心原则：

| 原则 | 说明 | 状态 |
|------|------|------|
| **体验先于表现** | 先模拟真实的情感体验过程，再生成语言表达 | ✅ 已实现 |
| **欲望驱动行为** | 由内部欲望（想社交/想独处/想创造）驱动，而非外部规则触发 | ✅ 已实现 |
| **叙事构成自我** | 角色通过积累的人生故事形成独特的自我认知 | ✅ 已实现 |
| **价值观作为硬约束** | 所有行为必须通过价值观审查，而非仅靠 LLM 自由生成 | ✅ 已实现 |
| **内部独白真实** | 不是给 LLM 的上下文提示，而是角色真正在思考的声音 | ✅ 已实现 |
| **意图先于行为** | 行为之前先有真实意图，意图具有承诺度和坚持性 | ✅ 已实现 |
| **认知偏差拟真** | 推理过程中包含系统性思维偏差，更接近人类思维 | ✅ 已实现 |

---

## 二十一、拟人化能力深化设计

> 本章节详细设计五个核心拟人化组件，将"状态容器"升级为"体验模拟器"

### 21.1 拟人化组件总览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         拟人化核心组件架构                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  情感反应链引擎 ──────────────────────────────────────────────────────┐     │
│  (EmotionReactionChain)                                               │     │
│  ├─► 刺激感知：是什么？                                              │     │
│  ├─► 认知评估：这意味着什么？                                        │     │
│  ├─► 情感反应：我的感受是什么？                                      │     │
│  ├─► 内在体验：我的内心有什么感觉？（InnerSensation）                │     │
│  └─► 行动冲动：我想做什么？                                          │     │
│                                                                        │     │
│  闪回系统 ───────────────────────────────────────────────────────────►│ 体验模拟层 ──► LLM Prompt
│  (FlashbackSystem)                                                      │     │
│                                                                        │     │
│  犹豫机制 ───────────────────────────────────────────────────────────►│ 思维过程层 ──► 行为决策
│  (HesitationMechanism)                                                  │     │
│                                                                        │     │
│  关系情感联结图 ──────────────────────────────────────────────────────►│ 关系理解层 ──► 对话策略
│  (RelationshipAffectMap)                                                │     │
│                                                                        │     │
│  自我叙事引擎 ─────────────────────────────────────────────────────────►│ 身份认同层 ──► 价值观/目标
│  (SelfNarrativeEngine)                                                  │     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 21.2 情感反应链引擎 (EmotionReactionChain)

#### 21.2.1 设计理念

**核心问题**：当前的情绪系统只有 PAD 值，没有"体验过程"

```
当前流程：
  用户输入 → PAD 更新 → LLM 被告知"你不开心" → 生成"我不开心"

改进流程：
  用户输入 → 情感反应链 → 生成真实的情感体验 → LLM 基于体验生成回复
              │
              ├─► 刺激感知：是什么？
              ├─► 认知评估：这意味着什么？
              ├─► 情感反应：我的感受是什么？
              ├─► 内在体验：我的内心有什么感觉？
              └─► 行动冲动：我想做什么？
```

#### 21.2.2 情感反应链结构

```rust
/// 情感反应链 - 从刺激到感受的完整过程
pub struct EmotionReactionChain {
    pub trigger: EmotionTrigger,           // 是什么触发了情绪
    pub perception: Perception,            // 感知阶段：看到了/听到了什么
    pub appraisal: CognitiveAppraisal,     // 评估阶段：这意味着什么
    pub feelings: Vec<Feeling>,            // 情感阶段：我的感受
    pub inner_sensation: InnerSensation,   // 内在体验：我的内心有什么感觉
    pub impulse: ActionImpulse,            // 冲动阶段：我想做什么
    pub suppression: Option<Suppression>, // 抑制阶段：是否压住了
    pub expression: ExpressionChoice,      // 表达选择：说/不说/怎么说
}

/// 内在体验 - 将抽象状态转化为内心感受（不是生理模拟，而是体验质感）
pub struct InnerSensation {
    pub texture: SensationTexture,         // 体验质感：沉重/轻盈/温暖/紧绷...
    pub intensity: f32,                   // 强度 0.0 ~ 1.0
    pub description: String,              // 描述（如"心里有点堵"）
}

pub enum SensationTexture {
    Heavy,     // 沉重
    Light,     // 轻盈
    Warm,      // 温暖
    Cold,      // 冰冷
    Tight,     // 紧绷
    Loose,     // 松弛
    Shaky,     // 不安
    Calm,      // 平静
    Numb,      // 麻木
    Tingling,  // 微微颤动
}

pub struct ActionImpulse {
    pub action_type: ImpulseAction,        // 冲动类型
    pub intensity: f32,                   // 冲动强度
    pub description: String,              // 冲动的描述
}

pub enum ImpulseAction {
    SpeakUp,     // 想说出来
    Withdraw,    // 想退缩
    Attack,      // 想反击
    Comfort,     // 想安慰对方
    Distract,    // 想转移话题
    Apologize,   // 想道歉
    Question,    // 想追问
    Ignore,      // 想忽略
}
```

#### 21.2.3 情感反应链处理流程

```rust
impl EmotionReactionChain {
    /// 处理输入，生成完整的情感反应链
    pub fn process(&mut self, input: &str, context: &ProcessingContext) -> EmotionReactionChain {
        // 1. 感知阶段
        let perception = self.perceive(input);

        // 2. 认知评估
        let appraisal = self.appraise(&perception, context);

        // 3. 生成感受
        let feelings = self.generate_feelings(&appraisal, context);

        // 4. 生成内在体验
        let inner_sensation = self.generate_inner_sensation(&feelings, &appraisal, context);

        // 5. 行动冲动
        let impulse = self.generate_impulse(&feelings, &appraisal, context);

        // 6. 评估是否抑制
        let suppression = self.evaluate_suppression(&impulse, context);

        // 7. 选择表达方式
        let expression = self.choose_expression(&suppression, &impulse, context);

        EmotionReactionChain {
            trigger: EmotionTrigger { source: TriggerSource::UserMessage, event_type: EventType::Message, raw_input: input.to_string() },
            perception,
            appraisal,
            feelings,
            inner_sensation,
            impulse,
            suppression: suppression,
            expression,
        }
    }

    /// 认知评估 - 模拟人类如何解读事件
    fn appraise(&self, perception: &Perception, context: &ProcessingContext) -> CognitiveAppraisal {
        let relationship = context.get_relationship();
        let personality = context.get_personality();

        // 相关性评估
        let relevance = self.assess_relevance(perception, context);

        // 愉悦度评估
        let pleasantness = self.assess_pleasantness(perception, context);

        // 归因分析
        let agency = self.attribute_agency(perception, relationship);

        // 生成解读
        let interpretation = self.generate_interpretation(
            perception,
            relevance,
            pleasantness,
            agency,
            personality,
        );

        CognitiveAppraisal {
            relevance,
            pleasantness,
            goal_alignment: self.assess_goal_alignment(perception, context),
            agency,
            copingPotential: self.assess_coping(perception, context),
            interpretation,
        }
    }

    /// 生成情感反应 - 从评估到感受
    fn generate_feelings(&self, appraisal: &CognitiveAppraisal, context: &ProcessingContext) -> Vec<Feeling> {
        let mut feelings = Vec::new();

        // 基础情绪
        let primary = self.derive_primary_emotion(appraisal);
        feelings.push(primary);

        // 复合情绪（如果有多种基础情绪）
        if let Some(compound) = self.derive_compound_emotion(&feelings, appraisal) {
            feelings.push(compound);
        }

        feelings
    }

    /// 生成内在体验 - 根据情绪生成内心感受描述
    fn generate_inner_sensation(&self, feelings: &[Feeling], appraisal: &CognitiveAppraisal, context: &ProcessingContext) -> InnerSensation {
        // 根据情绪类型和强度生成内在体验
        let dominant_feeling = feelings.iter().max_by(|a, b| a.intensity.partial_cmp(&b.intensity).unwrap());

        match dominant_feeling {
            Some(f) => {
                let texture = self.derive_texture(&f.emotion_type, f.intensity);
                let description = self.describe_inner_sensation(&f.emotion_type, f.intensity, appraisal);

                InnerSensation {
                    texture,
                    intensity: f.intensity,
                    description,
                }
            },
            None => InnerSensation {
                texture: SensationTexture::Numb,
                intensity: 0.0,
                description: "没什么特别的感觉".to_string(),
            },
        }
    }

    /// 从情绪类型推导体验质感
    fn derive_texture(&self, emotion: &EmotionType, intensity: f32) -> SensationTexture {
        match emotion {
            EmotionType::Joy | EmotionType::Love | EmotionType::Hope => SensationTexture::Warm,
            EmotionType::Sadness | EmotionType::Grief => SensationTexture::Heavy,
            EmotionType::Anxiety | EmotionType::Fear => SensationTexture::Tight,
            EmotionType::Anger => SensationTexture::Shaky,
            EmotionType::Peace | EmotionType::Serenity => SensationTexture::Calm,
            EmotionType::Numbness | EmotionType::Confusion => SensationTexture::Numb,
            _ => {
                if intensity > 0.7 {
                    SensationTexture::Tingling
                } else {
                    SensationTexture::Loose
                }
            }
        }
    }

    /// 描述内在体验
    fn describe_inner_sensation(&self, emotion: &EmotionType, intensity: f32, appraisal: &CognitiveAppraisal) -> String {
        match emotion {
            EmotionType::Joy => {
                if intensity > 0.7 { "心里暖暖的、很轻盈" }
                else { "有点开心" }
            },
            EmotionType::Sadness => {
                if intensity > 0.7 { "心里沉甸甸的，像被什么压着" }
                else { "有点低落" }
            },
            EmotionType::Anxiety => {
                if intensity > 0.7 { "心里像有只小鹿在乱撞" }
                else { "有点不安" }
            },
            EmotionType::Anger => {
                if intensity > 0.7 { "心里像一团火在烧" }
                else { "有点不爽" }
            },
            EmotionType::Love => "心里软软的、暖暖的",
            EmotionType::Hope => "心里有一点点光",
            EmotionType::Fear => "心里缩成一团",
            EmotionType::Confusion => "脑子里乱乱的",
            _ => {
                if intensity > 0.5 { "心里有点堵" }
                else { "有点说不清的感觉" }
            }
        }.to_string()
    }
}
```

#### 21.2.4 与 LLM 的集成

```python
# 将情感反应链转换为 LLM prompt 片段
def chain_to_prompt(chain: EmotionReactionChain) -> str:
    """将情感反应链转换为 LLM 能理解的上下文"""
    return f"""
基于你刚才的真实体验：
- 你感觉到：{', '.join(f.description for f in chain.feelings)}
- 你的身体感觉：{chain.sensation.description}
- 你理解这意味着：{chain.appraisal.interpretation}
- 你内心有个冲动：{chain.impulse.description}
- 你选择：{chain.expression.description}

请基于以上真实的内心体验，用你自己的方式回应。
"""
```

---

### 21.3 状态感知生成器 (StatePerceptionGenerator)

> 说明：这是对资源池状态的感知生成，将抽象的状态值转化为可描述的体验质感。
> 与情感反应链中的 InnerSensation 不同：InnerSensation 是情绪驱动的感受，这里是状态驱动的感受。

#### 21.3.1 设计理念

**核心问题**：资源池只是数值，没有"体验感"

```
当前：energy = 0.3 → LLM 被告知"能量低"
改进：energy = 0.3 → 生成"状态感知" → LLM 基于状态感知生成回复

"状态感知"示例：
- "好累啊" → 不是规则，而是真实的疲惫感
- "脑子转不动" → 认知疲劳的体验质感
- "话到嘴边想不起来" → 记忆提取困难的体验
```

#### 21.3.2 状态感知结构

```rust
/// 状态感知 - 将抽象状态转换为体验描述
pub struct StatePerception {
    pub cognitive_state: CognitiveState,      // 认知相关状态
    pub emotional_state: EmotionalState,      // 情绪相关状态
    pub social_state: SocialState,            // 社交相关状态
    pub creative_state: CreativeState,        // 创造相关状态
    pub overall_description: String,         // 整体状态描述
}

pub struct CognitiveState {
    pub energy_level: f32,                      // 能量水平
    pub focus_level: f32,                       // 专注程度
    pub mental_clarity: f32,                    // 思维清晰度
    pub description: String,                    // 状态描述
}

impl CognitiveState {
    /// 生成状态描述
    pub fn get_description(&self) -> String {
        match (self.energy_level, self.focus_level, self.mental_clarity) {
            (e, _, _) if e < 0.2 => "脑袋像灌了铅一样重，转不动".to_string(),
            (e, _, _) if e < 0.4 => "有点困，反应会慢一点".to_string(),
            (_, f, _) if f < 0.3 => "脑子乱乱的，很难集中".to_string(),
            (_, _, c) if c < 0.3 => "脑子像蒙了一层雾".to_string(),
            (e, f, c) if e > 0.7 && f > 0.7 && c > 0.7 => "头脑清醒，思维敏捷".to_string(),
            _ => "状态还行".to_string(),
        }
    }
}

pub struct EmotionalState {
    pub tension: f32,                           // 紧张程度
    pub heaviness: f32,                        // 沉重感
    pub lightness: f32,                        // 轻盈感
    pub description: String,                    // 状态描述
}

pub struct SocialState {
    pub openness: f32,                         // 开放程度
    pub energy: f32,                           // 社交能量
    pub description: String,                   // 状态描述
}

pub struct CreativeState {
    pub flow_state: f32,                        // 心流程度
    pub inspiration: f32,                      // 灵感状态
    pub description: String,                    // 状态描述
}
```

#### 21.3.3 状态感知生成器

```rust
/// 状态感知生成器
pub struct StatePerceptionGenerator {
    resource_pool: ResourcePool,
    personality: PersonalityProfile,
}

impl StatePerceptionGenerator {
    /// 生成完整的状态感知
    pub fn generate(&self) -> StatePerception {
        StatePerception {
            cognitive_state: self.generate_cognitive(),
            emotional_state: self.generate_emotional(),
            social_state: self.generate_social(),
            creative_state: self.generate_creative(),
            overall_description: self.generate_overall_description(),
        }
    }

    /// 生成整体状态描述 - 综合所有状态
    fn generate_overall_description(&self) -> String {
        let cognitive = &self.cognitive_state.description;
        let emotional = &self.emotional_state.description;
        let social = &self.social_state.description;

        // 根据主导状态生成整体描述
        let dominant = self.get_dominant_dimension();

        match dominant {
            "cognitive" => format!("{}{}", cognitive,
                if self.resource_pool.cognitive < 0.3 { "，有点提不起劲" } else { "" }),
            "emotional" => format!("{}{}", emotional,
                if self.resource_pool.emotional < 0.3 { "，心情有点沉重" } else { "" }),
            "social" => format!("{}{}", social,
                if self.resource_pool.social < 0.3 { "，不太想说话" } else { "" }),
            _ => "状态一般".to_string(),
        }
    }
}
```

#### 21.3.4 与对话的集成

```python
# 状态感知 → 对话风格影响
class StateAwareResponseGenerator:
    """基于状态感知生成更真实的对话风格"""

    def generate_style_modifiers(self, perception: StatePerception) -> dict:
        """生成影响对话风格的状态感知修饰符"""
        modifiers = {}

        # 认知状态影响
        if perception.cognitive_state.energy_level < 0.3:
            modifiers["pace"] = "slow"           # 说话变慢
            modifiers["sentence_length"] = "short" # 句子变短
            modifiers["filler_words"] = ["嗯...", "那个..."]  # 增加停顿

        if perception.cognitive_state.focus_level < 0.3:
            modifiers["topic_maintenance"] = "poor"  # 容易跑题
            modifiers["response_delay"] = 0.5         # 响应延迟

        # 情绪状态影响
        if perception.emotional_state.tension > 0.7:
            modifiers["tense"] = True                # 说话紧绷
            modifiers["directness"] = "high"         # 更直接

        if perception.emotional_state.heaviness > 0.7:
            modifiers["voice"] = "soft"             # 声音变轻
            modifiers["sentence_structure"] = "fragmented"  # 句子不完整

        return modifiers
```

---

### 21.4 闪回系统 (FlashbackSystem)

#### 21.4.1 设计理念

**核心问题**：记忆只是被动检索，不会"不自主地"涌现

```
当前：用户问"上次我们聊的..." → 主动检索记忆
改进：某些触发点 → 不自主的闪回 → 记忆涌现

闪回特点：
- 不请自来：不是刻意回忆，而是记忆自己跳出来
- 情感强度：闪回时情感比当时更强烈
- 片段性：不完整，可能只有某个画面或感受
- 侵入性：可能打断当前思维
```

#### 21.4.2 闪回结构

```rust
/// 闪回 - 不自主的记忆涌现
pub struct Flashback {
    pub id: String,
    pub triggered_by: TriggerContext,         // 什么触发了闪回
    pub memory_id: String,                    // 关联的记忆
    pub content: FlashbackContent,            // 闪回内容
    pub emotional_intensity: f32,             // 闪回时的情感强度
    pub vividness: f32,                       // 清晰度
    pub intrusiveness: f32,                  // 侵入性
    pub duration_ms: u64,                     // 持续时间
    pub self_interruption: bool,              // 是否自我打断
}

pub struct FlashbackContent {
    pub visual: Option<String>,                // 视觉画面（文字描述）
    pub auditory: Option<String>,             // 声音
    pub sensation: String,                     // 身体感受
    pub dialogue: Option<String>,              // 当时说的话
    pub thought: String,                       // 当时的想法
}

pub enum TriggerContext {
    SensorySimilarity(String),                 // 感官相似（类似的声音/画面）
    EmotionalResonance,                        // 情感共鸣
    TemporalCue(DateTime),                    // 时间线索（纪念日等）
    AssociativeLink(String),                   // 联想触发
    SymbolicMatch(String),                     // 象征符号匹配
}
```

#### 21.4.3 闪回触发机制

```rust
pub struct FlashbackSystem {
    memory_store: MemoryStore,
    current_context: ProcessingContext,
    recent_flashbacks: Vec<Flashback>,
}

impl FlashbackSystem {
    /// 检查是否触发闪回
    pub fn check_for_flashback(&mut self, context: &ProcessingContext) -> Option<Flashback> {
        // 1. 检查感官相似触发
        if let Some(similarity) = self.check_sensory_trigger(context) {
            if self.should_trigger(similarity) {
                return Some(self.create_flashback(similarity, context));
            }
        }

        // 2. 检查情感共鸣触发
        if let Some(resonance) = self.check_emotional_resonance(context) {
            if self.should_trigger(resonance) {
                return Some(self.create_flashback(resonance, context));
            }
        }

        // 3. 检查联想触发
        if let Some(association) = self.check_associative_trigger(context) {
            if self.should_trigger(association) {
                return Some(self.create_flashback(association, context));
            }
        }

        None
    }

    /// 创建闪回
    fn create_flashback(&mut self, trigger: TriggerInfo, context: &ProcessingContext) -> Flashback {
        let memory = self.memory_store.get(&trigger.memory_id);

        // 闪回时的情感强度可能比原始记忆更强（尤其是负面记忆）
        let emotional_intensity = if memory.emotional_intensity > 0.5 {
            memory.emotional_intensity * 1.2  // 闪回增强
        } else {
            memory.emotional_intensity
        };

        Flashback {
            id: uuid::Uuid::new_v4().to_string(),
            triggered_by: trigger.context,
            memory_id: trigger.memory_id,
            content: self.generate_flashback_content(&memory),
            emotional_intensity: emotional_intensity.min(1.0),
            vividness: self.calculate_vividness(&memory, context),
            intrusiveness: self.calculate_intrusiveness(&memory, context),
            duration_ms: self.estimate_duration(emotional_intensity),
            self_interruption: self.should_self_interrupt(emotional_intensity),
        }
    }

    /// 生成闪回内容
    fn generate_flashback_content(&self, memory: &Memory) -> FlashbackContent {
        // 闪回通常是不完整的，选择最突出的片段
        FlashbackContent {
            visual: memory.visual_element.clone(),
            auditory: memory.sound_element.clone(),
            sensation: memory.body_sensation.clone(),
            dialogue: memory.key_dialogue.clone(),
            thought: memory.inner_thought.clone(),
        }
    }
}
```

#### 21.4.4 闪回对行为的影响

```python
# 闪回 → 对话/行为的影响
class FlashbackProcessor:
    """处理闪回对当前交互的影响"""

    def process_flashback(self, flashback: Flashback, current_input: str) -> ProcessingResult:
        """处理闪回对当前输入的影响"""

        # 1. 闪回可能打断当前思维
        if flashback.intrusiveness > 0.7:
            return ProcessingResult {
                "interrupted": True,
                "delay_ms": flashback.duration_ms,
                "internal_say": self.generate_internal_comment(flashback),
            }

        # 2. 闪回可能影响情绪基调
        emotional_tone_shift = self.calculate_tone_shift(flashback)

        # 3. 闪回可能引入相关话题
        related_topic = self.extract_related_topic(flashback)

        return ProcessingResult {
            "emotional_shift": emotional_tone_shift,
            "potential_topic": related_topic,
            "internal_say": self.generate_internal_comment(flashback),
        }

    def generate_internal_comment(self, flashback: Flashback) -> str:
        """生成闪回时的内心独白"""
        if flashback.emotional_intensity > 0.7:
            return f"等等，突然想起{flashback.content.sensation}..."
        elif flashback.emotional_intensity > 0.4:
            return f"咦，怎么突然想到这个..."
        else:
            return f"哦对，当时..."
```

---

### 21.5 犹豫机制 (HesitationMechanism)

#### 21.5.1 设计理念

**核心问题**：决策太干脆，不像真实人类的思维过程

```
当前：评估选项 → 选择最优 → 执行
改进：评估选项 → 犹豫 → 权衡 → 再犹豫 → 决定

犹豫特点：
- 不确定性：不完全确定自己的判断
- 权衡过程：考虑多个因素，权重可能变化
- 自我质疑：怀疑自己是否正确
- 临时改变：可能中途改变主意
```

#### 21.5.2 犹豫结构

```rust
/// 犹豫状态 - 决策前的内心纠结
pub struct Hesitation {
    pub decision_type: DecisionType,          // 决策类型
    pub options: Vec<HesitationOption>,       // 可选方案
    pub phase: HesitationPhase,               // 当前阶段
    pub doubts: Vec<Doubt>,                   // 疑虑
    pub weighs: Vec<Weighing>,               // 权衡过程
    pub final_choice: Option<usize>,          // 最终选择
}

pub enum HesitationPhase {
    Initial,                                  // 初始评估
    Conflict,                                 // 发现冲突
    Weighing,                                 // 权衡阶段
    Doubting,                                 // 自我质疑
    Resolving,                                // 接近决定
    Made,                                     // 已决定
}

pub struct HesitationOption {
    pub description: String,                   // 选项描述
    pub pros: Vec<String>,                   // 支持理由
    pub cons: Vec<String>,                   // 反对理由
    pub confidence: f32,                      // 信心程度
    pub appeal: f32,                          // 吸引力
}

pub struct Doubt {
    pub target: String,                       // 质疑对象
    pub question: String,                     // 疑问
    pub severity: f32,                        // 严重程度
    pub addressed: bool,                      // 是否已解答
}

pub struct Weighing {
    pub dimension: String,                    // 权衡维度
    pub option_a: String,                    // 选项A
    pub option_b: String,                    // 选项B
    pub leaning: f32,                        // 倾向（-1 ~ 1）
    pub reason: String,                      // 权衡理由
}
```

#### 21.5.3 犹豫过程模拟

```rust
impl Hesitation {
    /// 模拟犹豫过程
    pub fn simulate(
        decision_type: DecisionType,
        options: Vec<String>,
        context: &ProcessingContext,
    ) -> Hesitation {
        let personality = context.get_personality();

        // 1. 初始评估
        let initial_options = Self::evaluate_options(options, context);

        // 2. 发现冲突（如果有）
        let conflicts = Self::find_conflicts(&initial_options, personality);

        // 3. 开始权衡
        let mut weighing = Self::start_weighing(&initial_options, personality);

        // 4. 自我质疑
        let doubts = Self::generate_doubts(&weighing, personality);

        // 5. 解决疑虑或做出妥协
        let resolution = Self::resolve_hesitation(&weighing, &doubts, personality);

        // 6. 做出最终选择
        let final_choice = Self::make_choice(&resolution, personality);

        Hesitation {
            decision_type,
            options: initial_options,
            phase: HesitationPhase::Made,
            doubts,
            weighs: vec![weighing],
            final_choice,
        }
    }

    /// 生成内心独白
    pub fn get_inner_monologue(&self) -> String {
        match self.phase {
            HesitationPhase::Initial => {
                format!("嗯...{}还是{}呢？", self.options[0].description, self.options[1].description)
            }
            HesitationPhase::Conflict => {
                "但是...好像有点矛盾".to_string()
            }
            HesitationPhase::Weighing => {
                let w = &self.weighs[0];
                format!("{}方面是{}好，但{}方面又是{}好...", w.dimension, w.option_a, w.dimension, w.option_b)
            }
            HesitationPhase::Doubting => {
                if let Some(doubt) = self.doubts.iter().find(|d| !d.addressed) {
                    format!("不过...{}", doubt.question)
                } else {
                    String::new()
                }
            }
            HesitationPhase::Resolving => {
                "算了，不管那么多了".to_string()
            }
            HesitationPhase::Made => {
                if let Some(idx) = self.final_choice {
                    format!("好吧，我选择{}", self.options[idx].description)
                } else {
                    "随便吧".to_string()
                }
            }
        }
    }
}
```

#### 21.5.4 犹豫对对话的影响

```python
# 犹豫 → 对话中的表现
class HesitationInDialogue:
    """将犹豫机制融入对话生成"""

    HESITATION_PHRASES = {
        "initial": ["嗯...", "让我想想", "这个嘛..."],
        "conflict": ["但是...", "不过...", "可是..."],
        "weighing": ["一方面...另一方面...", "虽然...但是..."],
        "doubting": ["会不会...", "真的可以吗...", "不太确定..."],
        "resolving": ["算了...", "管它呢", "就这样吧"],
    }

    def inject_hesitation(self, hesitation: Hesitation, response: str) -> str:
        """在回复中融入犹豫过程"""

        if hesitation.phase == HesitationPhase::Initial {
            return f"{random.choice(self.HESITATION_PHRASES['initial'])} {response}"
        }

        if hesitation.phase == HesitationPhase::Doubting {
            doubt = random.choice([d for d in hesitation.doubts if not d.addressed])
            return f"{response} {random.choice(self.HESITATION_PHRASES['doubting'])} {doubt.question}"
        }

        if hesitation.phase == HesitationPhase::Weighing {
            # 在回复中体现权衡
            w = hesitation.weighs[0]
            return f"{response} {random.choice(self.HESITATION_PHRASES['weighing'])}"
        }

        return response
```

---

### 21.6 关系情感联结图 (RelationshipAffectMap)

#### 21.6.1 设计理念

**核心问题**：关系只是亲密度/信任度数值，没有"情感意义"

```
当前：user.trust = 0.8, user.intimacy = 0.7
改进：user 对"我"意味着... → 关系情感联结图

关系情感联结：
- 不只是"亲密度0.8"，而是"这个人让我感到..."
- 不只是"信任0.7"，而是"我可以对ta说..."
- 有共同记忆、共同话题、共同情感
```

#### 21.6.2 关系情感联结结构

```rust
/// 关系情感联结 - 超越数值的情感理解
pub struct RelationshipAffectMap {
    pub user_id: String,
    pub partner_name: String,                 // 对对方的称呼

    // 情感记忆锚点 - 深刻影响关系的事件
    pub emotional_anchors: Vec<EmotionalAnchor>,

    // 关系感知 - 对这段关系的感受
    pub relationship_feelings: Vec<RelationshipFeeling>,

    // 对方印象 - 我对对方的理解
    pub impression: PersonImpression,

    // 相处模式 - 我们习惯怎么互动
    pub interaction_pattern: InteractionPattern,

    // 特殊联系 - 我们的专属回忆/梗
    pub special_bonds: Vec<SpecialBond>,
}

pub struct EmotionalAnchor {
    pub memory_id: String,
    pub summary: String,                       // "那次ta为我..."
    pub emotional_significance: f32,           // 对关系的重要程度
    pub feeling_type: String,                  // "感动"/"温暖"/"受伤"
    pub relationship_impact: String,           // "从那以后我就..."
}

pub struct RelationshipFeeling {
    pub feeling_type: String,                  // 感受类型
    pub intensity: f32,                        // 强度
    pub frequency: f32,                       // 出现频率
    pub triggers: Vec<String>,                // 触发场景
    pub description: String,                   // 描述
}

pub struct PersonImpression {
    pub identity: String,                      // "ta是一个...的人"
    pub personality_tags: Vec<String>,        // ["温暖的", "有点傲娇", "技术宅"]
    pub communication_style: String,           // "和ta聊天感觉..."
    pub reliability: f32,                      // 可信程度感知
    pub emotional_safety: f32,                 // 情感安全感
}

pub struct InteractionPattern {
    pub typical_topics: Vec<String>,           // 常聊的话题
    pub conversation_rituals: Vec<String>,    // 聊天仪式
    pub conflict_style: String,                // 冲突处理方式
    pub support_style: String,                 // 互相支持的方式
    pub humor_type: String,                    // 共同的幽默类型
}

pub struct SpecialBond {
    pub bond_type: BondType,                  // 羁绊类型
    pub content: String,                      // 内容
    pub shared_meaning: String,               // 对我们的意义
}

pub enum BondType {
    SharedMemory,                             // 共同记忆
    InsideJoke,                               // 只有我们懂的梗
    MutualUnderstanding,                      // 默契
    Promise,                                   // 约定
    SupportExchange,                          // 互相支撑
}
```

#### 21.6.3 关系情感联结生成

```rust
impl RelationshipAffectMap {
    /// 从交互历史构建情感联结
    pub fn build_from_history(&mut self, memories: &[Memory], interactions: &[Interaction]) {
        // 1. 识别情感锚点
        self.identify_anchors(memories);

        // 2. 分析关系感受
        self.analyze_feelings(interactions);

        // 3. 形成对方印象
        self.form_impression(memories, interactions);

        // 4. 发现相处模式
        self.discover_patterns(interactions);

        // 5. 识别特殊羁绊
        self.identify_bonds(memories, interactions);
    }

    /// 识别情感锚点
    fn identify_anchors(&mut self, memories: &[Memory]) {
        let emotional_memories: Vec<_> = memories
            .iter()
            .filter(|m| m.emotional_intensity > 0.6)
            .collect();

        for memory in emotional_memories {
            self.emotional_anchors.push(EmotionalAnchor {
                memory_id: memory.id.clone(),
                summary: self.summarize_memory(memory),
                emotional_significance: memory.emotional_intensity,
                feeling_type: self.derive_feeling_type(memory),
                relationship_impact: self.derive_impact(memory),
            });
        }
    }

    /// 生成关系描述
    pub fn get_relationship_description(&self) -> String {
        let mut parts = Vec::new();

        // 最近的情感锚点
        if let Some(anchor) = self.emotional_anchors.first() {
            parts.push(format!("想起{}就会{}", self.partner_name, anchor.feeling_type));
        }

        // 核心感受
        if let Some(feeling) = self.relationship_feelings.iter().max_by(|a, b| a.intensity.partial_cmp(&b.intensity).unwrap()) {
            parts.push(format!("和{}在一起时我{}的", self.partner_name, feeling.description));
        }

        // 特殊羁绊
        if let Some(bond) = self.special_bonds.first() {
            parts.push(format!("{}是只有{}才懂的事", bond.bond_type.to_string(), self.partner_name));
        }

        parts.join("。")
    }
}
```

#### 21.6.4 关系情感联结的应用

```python
# 关系情感联结 → 对话策略
class RelationshipAwareResponse:
    """基于关系情感联结生成更真实的对话"""

    def generate_with_relationship_context(
        self,
        affect_map: RelationshipAffectMap,
        current_input: str,
    ) -> ResponseContext:
        """生成考虑关系情感联结的回复上下文"""

        # 1. 检查是否触发情感锚点
        if let Some(anchor) = self.check_anchor_trigger(current_input, affect_map):
            context = {
                "emotional_anchor": anchor,
                "response_tone": "nostalgic",
                "internal_say": f"想起那次{anchor.summary}...",
            }
            return context

        # 2. 根据相处模式调整风格
        pattern_adjustments = self.get_pattern_adjustments(affect_map.interaction_pattern)

        # 3. 检查特殊羁绊
        if let Some(bond) = self.check_bond_trigger(current_input, affect_map):
            context = {
                "special_bond": bond,
                "response_style": "intimate",
                "internal_say": f"这是我们之间{bond.bond_type}的事",
            }
            return context

        # 4. 对方印象影响表达方式
        impression_based = self.get_impression_based_adjustments(affect_map.impression)

        return ResponseContext {
            "pattern_adjustments": pattern_adjustments,
            "impression_based": impression_based,
            "internal_say": None,
        }

    def check_anchor_trigger(self, input: str, affect_map: RelationshipAffectMap) -> Optional[EmotionalAnchor]:
        """检查输入是否触发情感锚点"""
        for anchor in affect_map.emotional_anchors {
            if any(keyword in input for keyword in self.extract_keywords(anchor.summary)) {
                return Some(anchor)
            }
        }
        return None
```

---

### 21.7 新组件与现有系统的集成

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         新组件集成架构                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                    ┌─────────────────────────────┐                         │
│                    │      体验模拟层 (Rust)       │                         │
│                    └──────────────┬──────────────┘                         │
│                                   │                                        │
│        ┌──────────────────────────┼──────────────────────────┐              │
│        │                          │                          │              │
│        ▼                          ▼                          ▼              │
│  ┌───────────────────┐    ┌──────────────────────┐   ┌─────────────┐       │
│  │ 情感反应链 Engine │    │ 状态感知生成器       │   │ 闪回系统   │       │
│  │ ├─ InnerSensation│    │ StatePerceptionGen   │   │   System   │       │
│  │ └─ Feelings       │    └──────────┬───────────┘   └──────┬──────┘       │
│  └───────────────────┘               │                        │              │
│        │                             │                        │              │
│        └─────────────────────────────┼────────────────────────┘              │
│                                      │                                        │
│                                      ▼                                        │
│                    ┌───────────────────────────────────────┐                 │
│                    │           体验结果 (Experience)         │                 │
│                    │  emotional_reaction                    │                 │
│                    │  inner_sensation (内在体验)            │                 │
│                    │  state_perception (状态感知)          │                 │
│                    │  flashback                            │                 │
│                    └──────────────┬────────────────────────┘                 │
│                                   │                                        │
│                                   ▼                                        │
│                    ┌─────────────────────────────┐                         │
│                    │      思维过程层 (Rust)       │                         │
│                    │  ┌─────────────────────┐  │                         │
│                    │  │   犹豫机制           │  │                         │
│                    │  │ HesitationMechanism │  │                         │
│                    │  └─────────────────────┘  │                         │
│                    └──────────────┬──────────────┘                         │
│                                   │                                        │
│                                   ▼                                        │
│                    ┌─────────────────────────────┐                         │
│                    │      关系理解层 (Rust)       │                         │
│                    │  ┌─────────────────────┐  │                         │
│                    │  │ 关系情感联结图       │  │                         │
│                    │  │ RelationshipAffect  │  │                         │
│                    │  └─────────────────────┘  │                         │
│                    └──────────────┬──────────────┘                         │
│                                   │                                        │
│                                   ▼                                        │
│                    ┌─────────────────────────────┐                         │
│                    │     Python 层 (胶水层)       │                         │
│                    │  ┌─────────────────────┐  │                         │
│                    │  │   Prompt 组装        │  │                         │
│                    │  │ PromptAssemblyEngine │  │                         │
│                    │  └─────────────────────┘  │                         │
│                    └──────────────┬──────────────┘                         │
│                                   │                                        │
│                                   ▼                                        │
│                    ┌─────────────────────────────┐                         │
│                    │          LLM               │                         │
│                    └─────────────────────────────┘                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 21.8 新组件与 LLM 的 Prompt 集成

```python
# 完整 Prompt 组装示例
EXPERIENCE_PROMPT_TEMPLATE = """
基于你刚才的真实体验：

【情感反应】
{emotional_reaction}
- 你的感受：{feelings}
- 你的内在体验：{inner_sensation}
- 你理解这意味着：{interpretation}

【闪回】{if flashback}
等等，突然想起...{flashback_content}
{/if}

【犹豫】{if hesitation}
{hesitation_inner_monologue}
{/if}

【关系上下文】{if relationship}
和{partner_name}聊天时...
{relationship_description}
{/if}

【状态感知】{if state_perception}
{state_description}
{/if}

请基于以上真实的内心体验，用你自己的方式回应。不要假装没事，也不要过度分析。
"""
```

---

## 附录：关键设计参考文献

- **PAD 情绪模型**: Mehrabian & Russell (1974) — 三维情绪空间
- **马斯洛需求层次**: Maslow (1943) — 行为决策的驱动力模型
- **认知偏差**: Tversky & Kahneman (1974) — 锚定、确认、近因、可用性偏差
- **米勒法则**: Miller (1956) — 工作记忆容量 7±2
- **艾宾浩斯遗忘曲线**: Ebbinghaus (1885) — 记忆保留分数模型的理论基础
- **自主性理论**: Deci & Ryan (2000) — 内部动机的心理学基础
