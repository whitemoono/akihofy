# 子系统设计文档索引

欢迎来到 AKIHO 子系统设计文档。

## 核心文档

| 文档 | 章节 | 优先级 | 状态 | 描述 |
|------|------|--------|------|------|
| [00_architecture.md](./00_architecture.md) | 一、十五、十六 | P0 | 🚧 部分实现 | 架构总览、文件结构、实现优先级 |
| [core_algorithms.md](../core_algorithms.md) | - | P0 | 📄 设计完成 | 核心引擎算法（数学公式与实现） |
| [05_emotion_system.md](./05_emotion_system.md) | 三 | P0 | 🚧 部分实现 | 情绪系统（PAD模型） |
| [14_emotion_reaction_chain.md](./14_emotion_reaction_chain.md) | 二十一 | P1 | 📄 设计完成 | 情感反应链引擎（体验模拟层） |
| [13_memory_system.md](./13_memory_system.md) | 四 | P0 | 🚧 部分实现 | 跨会话记忆系统 |
| [personal_meaning_layer.md](../memory_enhancements/personal_meaning_layer.md) | 记忆增强 | P0 | 📄 设计完成 | 个人意义层 |
| [07_behavior_system.md](./07_behavior_system.md) | 五 | P0 | 🚧 部分实现 | 行为决策系统 |
| [04_body_system.md](./04_body_system.md) | 六 | P1 | 🚧 部分实现 | 生理系统（资源预算模型） |
| [02_growth_system.md](./02_growth_system.md) | 七 | P1 | 📄 设计完成 | 人格成长系统 |
| [17_life_narrative.md](./17_life_narrative.md) | 二十一 | P2 | 📄 设计完成 | 人生叙事引擎 |
| [06_cognition_system.md](./06_cognition_system.md) | 八 | P1 | 📄 设计完成 | 认知系统（注意力、推理、元认知） |
| [03_relationship.md](./03_relationship.md) | 九 | P2 | 📄 设计完成 | 关系动态系统 |
| [11_autonomous_system.md](./11_autonomous_system.md) | 十 | **P0** | 📄 设计完成 | **自主性系统（驱动、思考循环、意图引擎）** |
| [18_self_model.md](./18_self_model.md) | 新增 | P0 | 📄 设计完成 | **统一自我模型（整合 SelfIdentity/CoreBelief/SelfNarrative）** |
| [19_web_search.md](./19_web_search.md) | 新增 | P1 | 📄 设计完成 | **Web 搜索与自主学习模块** |
| [09_twitter_integration.md](./09_twitter_integration.md) | 十一 | P1 | 📄 设计完成 | Twitter/X 深度集成 |
| [12_prompt_fragments.md](./12_prompt_fragments.md) | 十四 | P1 | 📄 设计完成 | 嵌入式 Prompt 片段系统 |
| [10_persistence.md](./10_persistence.md) | 十六 | P1 | 📄 设计完成 | 持久化架构（PostgreSQL/Redis/ChromaDB） |
| [08_offline_api.md](./08_offline_api.md) | 十二、十三 | P3 | 📄 设计完成 | 离线处理、API优化 |
| [15_flashback_system.md](./15_flashback_system.md) | 二十一 | P3 | 📄 设计完成 | 闪回系统 |
| [16_hesitation_mechanism.md](./16_hesitation_mechanism.md) | 二十一 | P3 | 📄 设计完成 | 犹豫机制 |

## 快速导航

### P0 - 必须实现（阻塞其他功能）

| 模块 | 文档 | 关键概念 |
|------|------|----------|
| 架构设计 | [00_architecture.md](./00_architecture.md) | Python+Rust架构、项目结构 |
| 情绪系统 | [05_emotion_system.md](./05_emotion_system.md) | PAD模型、状态机、情绪惯性 |
| 情感体验 | [14_emotion_reaction_chain.md](./14_emotion_reaction_chain.md) | 刺激→评估→感受→冲动→表达 |
| 行为系统 | [07_behavior_system.md](./07_behavior_system.md) | 马斯洛需求、决策算法 |
| 记忆系统 | [13_memory_system.md](./13_memory_system.md) | 情景/语义记忆、向量检索 |
| 个人意义 | [personal_meaning_layer.md](../memory_enhancements/personal_meaning_layer.md) | 记忆显著性、关联网络 |
| 自主性系统 | [11_autonomous_system.md](./11_autonomous_system.md) | 驱动系统、思考循环、意图引擎 |
| 自我模型 | [18_self_model.md](./18_self_model.md) | 统一自我认知、核心信念、价值观 |

### P1 - 应该实现（提升体验）

| 模块 | 文档 | 关键概念 |
|------|------|----------|
| 人格成长 | [02_growth_system.md](./02_growth_system.md) | 成长阶段、特征演化 |
| 生理系统 | [04_body_system.md](./04_body_system.md) | 四池资源预算、昼夜节律 |
| 认知系统 | [06_cognition_system.md](./06_cognition_system.md) | 注意力、推理引擎、认知偏差 |
| Twitter 集成 | [09_twitter_integration.md](./09_twitter_integration.md) | 推文消费管线、观点形成、互动决策 |
| Web 搜索 | [19_web_search.md](./19_web_search.md) | 自主搜索、知识整合、兴趣演化 |
| Prompt 片段 | [12_prompt_fragments.md](./12_prompt_fragments.md) | 片段组装、版本管理、A/B测试 |
| 持久化 | [10_persistence.md](./10_persistence.md) | PostgreSQL/Redis/ChromaDB、Embedding Provider 抽象层、人格迁移 |

### P2 - 可以实现（锦上添花）

| 模块 | 文档 | 关键概念 |
|------|------|----------|
| 关系动态 | [03_relationship.md](./03_relationship.md) | 信任模型、关系阶段 |
| 人生叙事 | [17_life_narrative.md](./17_life_narrative.md) | 章节管理、转折点、主题提取 |

### P3 - 远期愿景

| 模块 | 文档 | 关键概念 |
|------|------|----------|
| 闪回系统 | [15_flashback_system.md](./15_flashback_system.md) | 非自主记忆唤起 |
| 犹豫机制 | [16_hesitation_mechanism.md](./16_hesitation_mechanism.md) | 决策前的内在冲突模拟 |
| 离线处理 | [08_offline_api.md](./08_offline_api.md) | 任务调度、缓存策略 |

## 实现顺序建议

```
Phase 1 (MVP):    架构 + 情绪 + 情感反应链 + 行为 + 记忆 + 自主性 + 自我模型
Phase 2 (V1.0):   生理 + 认知 + 成长 + 持久化 + 个人意义层
Phase 3 (V1.1):   Web搜索 + Twitter集成 + 关系 + Prompt片段
Phase 4 (V1.2):   人生叙事 + 知识整合 + 兴趣演化
Phase 5 (远期):   闪回 + 犹豫 + 离线处理
```

## 模块依赖图

```
API Server
    │
    ├── LLM Layer ←── Prompt 片段组装引擎
    │
    ├── Persistence Layer (PostgreSQL / Redis / ChromaDB)
    │
    └── Rust Core
            │
            ├── Self Model (统一自我认知) ←── 新增
            │       │
            ├── Emotion Engine ←─────────┐
            │   ├── PAD 实时管线          │ 影响
            │   └── 情感反应链 (体验管线)  │
            │                             │
            ├── Behavior Engine           │
            │        │                   │
            ├── Autonomous Engine ←──────┤
            │   ├── 驱动系统              │
            │   ├── 思考循环              │
            │   ├── 意图引擎              │
            │   └── 价值观过滤器          │
            │        │                   │
            ├── Memory Store ←───────────┤
            │   ├── 个人意义层            │
            │   └── 三层记忆              │
            │                             │
            ├── Body System ←────────────┤
            │   (资源预算 + 昼夜节律)     │
            │                             │
            ├── Cognition Engine ←───────┤
            │   (注意力 + 推理 + 元认知)   │
            │                             │
            ├── Growth Engine ←──────────┤
            │                             │
            ├── Relationship ←───────────┘
            │
            ├── Twitter Integration
            │
            └── Web Search & Learning ←── 新增
```

## 查看方式

- **概览**: 先读 `00_architecture.md`
- **自我模型**: 先读 `18_self_model.md`——这是理解角色"我是谁"的核心
- **特定模块**: 按优先级选择对应文档
- **实现参考**: 文档包含完整 Rust 代码示例
