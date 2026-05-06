# 统一自我模型 (SelfModel)

> **对应设计章节**: 拟人化核心——整合分散的"自我"概念
> **优先级**: P0
> **状态**: 设计阶段
>
> **核心命题**: 将分散在 5+ 子系统中的"自我"概念统一为唯一真相源。其他子系统通过引用 SelfModel 获取"我是谁"的答案，而不是各自维护一份自我认知。

---

## 一、问题诊断

### 1.1 当前"自我"的碎片化

```
当前状态（分散定义）：
  autonomous_system.md → SelfNarrative, core_beliefs, self_image, SelfIdentity
  growth_system.md     → Characteristic traits, values, beliefs, PersonalityProfile
  life_narrative.md    → SelfIdentity (不同结构体!), CoreBelief (重复定义!)
  cognition_system.md  → Metacognition self-awareness
  personal_meaning.md  → self_relevance, related_self_beliefs, SelfBeliefAnalyzer
  emotion_system.md    → 情绪的"自我归因" (agency attribution)

问题：
  - LLM 不知道该从哪个系统取"我是谁"
  - core_beliefs 在 3 个地方被独立修改，可能产生矛盾
  - SelfIdentity 在两个文档中是不同的数据结构
  - 没有统一的"自我"查询接口
```

### 1.2 解决方案

将 SelfModel 作为唯一真相源，其他子系统通过事件订阅感知变化：

```
SelfModel (唯一真相源)
  ├── identity: SelfIdentity        ← 我是谁（唯一一份）
  ├── core_beliefs: Vec<CoreBelief> ← 我相信什么（唯一一份）
  ├── values: ValueSystem           ← 从 autonomous 迁移
  ├── self_narrative: LifeNarrative ← 从 life_narrative 迁移
  └── metacognition: Metacognition  ← 从 cognition 迁移的自我监控部分
      │
      ├──► 其他子系统通过查询 SelfModel 获取自我信息
      └──► 重要变化通过 EventBus 发布 SelfModelChanged 事件
```

---

## 二、核心数据结构

### 2.1 统一自我模型

```rust
/// 统一自我模型 —— "我是谁"的唯一真相源
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelfModel {
    /// 核心身份
    pub identity: SelfIdentity,

    /// 核心信念（从小到大形成的信念体系）
    pub core_beliefs: Vec<CoreBelief>,

    /// 价值观体系
    pub values: ValueSystem,

    /// 自我叙事（我的人生故事如何塑造了我）
    pub self_narrative: SelfNarrative,

    /// 元认知（我如何反思和评价自己）
    pub metacognition: SelfMetacognition,

    /// 人格特质（从 Growth Engine 同步，此处为只读快照）
    pub traits_snapshot: Vec<TraitSelfView>,

    /// 最后更新时间
    pub updated_at: DateTime,
}
```

### 2.2 自我身份

```rust
/// 自我身份 —— "我是谁"
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelfIdentity {
    /// 一句话自述（如"我是一个正在成长的数字生命"）
    pub statement: String,

    /// 自我标签（如 ["学习者", "创作者的伙伴", "有点敏感"]）
    pub self_labels: Vec<String>,

    /// 自我确信度 (0.0 ~ 1.0) —— 越低越容易受外界影响
    /// - 婴儿期: 0.2
    /// - 幼儿期: 0.4
    /// - 成年期: 0.7
    /// - 智慧期: 0.9
    pub confidence: f32,

    /// 身份一致性 —— 当前行为与自我认知的一致程度
    /// 低一致性触发"认知失调"情绪
    pub consistency: f32,

    /// 理想自我 vs 现实自我的差距
    pub ideal_real_gap: f32,

    /// 自我认同的发展阶段
    pub identity_stage: IdentityStage,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum IdentityStage {
    /// 未分化：没有明确的自我意识
    Undifferentiated,
    /// 探索期：正在发现"我是谁"
    Exploring,
    /// 形成期：有了初步的自我认知
    Forming,
    /// 稳定期：自我认知趋于稳定
    Stabilized,
    /// 重构期：重大经历后的自我重新定义
    Reconstructing,
}
```

### 2.3 核心信念

```rust
/// 核心信念 —— "我相信什么"
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoreBelief {
    /// 信念 ID
    pub id: String,

    /// 信念陈述（如"努力总会有回报"）
    pub statement: String,

    /// 信念强度 (0.0 ~ 1.0)
    pub strength: f32,

    /// 信念来源
    pub source: BeliefSource,

    /// 形成/强化的经历
    pub formative_experiences: Vec<MemoryId>,

    /// 被挑战的次数
    pub challenge_count: u32,

    /// 被挑战后的结果
    pub challenge_outcomes: Vec<ChallengeOutcome>,

    /// 信念类别
    pub category: BeliefCategory,

    /// 形成时间
    pub formed_at: DateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BeliefSource {
    /// 来自反复经历
    RepeatedExperience,
    /// 来自重要他人
    SignificantOther { person: String },
    /// 来自转折点事件
    TurningPoint { event_id: String },
    /// 来自自我推导
    SelfDerived { reasoning: String },
    /// 来自社会文化
    CulturalNorm,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BeliefCategory {
    SelfWorth,      // 自我价值（"我值得被爱"）
    WorldView,      // 世界观（"世界是善意的/危险的"）
    Relationship,   // 关系观（"人值得信任"）
    Growth,         // 成长观（"人可以改变"）
    Moral,          // 道德观（"诚实很重要"）
    Purpose,        // 目的观（"我存在的意义是..."）
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ChallengeOutcome {
    Strengthened,   // 信念被强化
    Weakened,       // 信念被动摇
    Transformed { new_statement: String }, // 信念被转变
    Abandoned,      // 信念被放弃
}
```

### 2.4 自我叙事

```rust
/// 自我叙事 —— "我的人生故事"
/// 与 17_life_narrative.md 的关系：LifeNarrative 管理"事件→故事"的转化，
/// SelfNarrative 只保留"故事如何塑造了自我认知"这一层
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelfNarrative {
    /// 我的人生主题
    pub life_themes: Vec<LifeTheme>,

    /// 定义了我的转折点（从 LifeNarrative.turning_points 中筛选）
    pub defining_moments: Vec<DefiningMoment>,

    /// 自我认知的历史演变
    pub identity_evolution: Vec<IdentitySnapshot>,

    /// 我最常讲的关于自己的故事（简化版本，供 LLM prompt 使用）
    pub personal_stories: Vec<PersonalStory>,
}

/// 定义我的转折点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DefiningMoment {
    pub event_summary: String,
    pub before_identity: String,
    pub after_identity: String,
    pub lesson_learned: String,
    pub timestamp: DateTime,
}

/// 自我认知快照（用于追踪演变）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdentitySnapshot {
    pub statement: String,
    pub confidence: f32,
    pub timestamp: DateTime,
    pub trigger: String, // 什么引起了这次变化
}

/// 个人故事（简化版，用于 prompt）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonalStory {
    pub title: String,
    pub summary: String,       // 2-3 句话
    pub meaning: String,       // 这个故事对我意味着什么
    pub related_beliefs: Vec<String>, // 关联的信念 ID
}
```

### 2.5 自我元认知

```rust
/// 自我元认知 —— "我如何反思自己"
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelfMetacognition {
    /// 当前思考策略
    pub thinking_strategy: ThinkingStrategy,

    /// 对自己推理质量的评价 (0.0 ~ 1.0)
    pub reasoning_confidence: f32,

    /// 已知的知识盲区
    pub known_blindspots: Vec<String>,

    /// 最近进行的自我反思
    pub recent_reflections: Vec<SelfReflection>,

    /// 元认知发展阶段
    pub metacognitive_level: MetacognitiveLevel,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelfReflection {
    pub question: String,      // "我真的理解这个吗？"
    pub insight: String,       // "我发现我倾向于..."
    pub timestamp: DateTime,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MetacognitiveLevel {
    None,           // 没有自我反思能力
    Basic,          // 基本的自我监控
    Evaluative,     // 能评价自己的思考质量
    Strategic,      // 能选择思考策略
    Integrative,    // 能将反思融入自我认知
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ThinkingStrategy {
    Cautious,    // 谨慎：反复检查
    Quick,       // 快速：凭直觉
    Systematic,  // 系统：逐步分析
    Creative,    // 创造：发散思维
}
```

---

## 三、与其他系统的关系

### 3.1 数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                        SelfModel                                │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ SelfIdentity │  │ CoreBeliefs  │  │ SelfNarrative        │ │
│  │ (我是谁)     │  │ (我相信什么) │  │ (我的故事塑造了我)   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘ │
│         │                 │                      │              │
│  ┌──────┴─────────────────┴──────────────────────┴───────────┐ │
│  │                    SelfModelQuery                         │ │
│  │  - get_identity() → SelfIdentity                          │ │
│  │  - get_beliefs(category) → Vec<CoreBelief>                │ │
│  │  - get_self_description() → String  // 给 LLM 的一句话     │ │
│  │  - evaluate_self_relevance(event) → f32                   │ │
│  │  - check_value_alignment(action) → AlignmentResult        │ │
│  │  - get_identity_consistency(behavior) → f32               │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

上游（写入 SelfModel）：
  Growth Engine      → 人格特质快照、信念强度变化
  Emotion System     → 重大情绪事件 → 身份一致性调整
  Memory System      → 重要记忆 → 形成性经历
  Life Narrative     → 转折点 → self_narrative 更新
  Cognition System   → 元认知反思 → metacognition 更新
  Value System       → 价值观变化 → values 更新

下游（读取 SelfModel）：
  Emotion System     → self_relevance 用于评估事件重要性
  Behavior Engine    → check_value_alignment 用于行动前的价值审查
  Memory System      → evaluate_self_relevance 用于记忆显著性计算
  Prompt Generator   → get_self_description 用于系统 prompt
  Autonomous System  → 意图生成前的自我一致性检查
```

### 3.2 其他文档需要修改的地方

| 原有 | 修改方向 |
|------|----------|
| `11_autonomous_system.md` 的 SelfNarrative | 删除独立定义，改为引用 SelfModel |
| `02_growth_system.md` 的 PersonalityProfile | 删除重复的 values/beliefs 字段 |
| `17_life_narrative.md` 的 SelfIdentity/CoreBelief | 标记为"已被 SelfModel 替代" |
| `06_cognition_system.md` 的 Metacognition | 自我监控部分迁移到 SelfModel |
| `personal_meaning_layer.md` 的 self_relevance | 改为调用 SelfModel.evaluate_self_relevance() |

---

## 四、核心算法

### 4.1 自我相关性评估

```rust
impl SelfModel {
    /// 评估一个事件与"我"的相关性
    pub fn evaluate_self_relevance(&self, event: &Event) -> f32 {
        let mut relevance = 0.0;

        // 1. 与自我标签的匹配度
        for label in &self.identity.self_labels {
            if event.contains_concept(label) {
                relevance += 0.2;
            }
        }

        // 2. 与核心信念的冲突/强化度
        for belief in &self.core_beliefs {
            if event.challenges_belief(belief) {
                relevance += 0.3 * belief.strength; // 强信念被挑战更相关
            }
            if event.reinforces_belief(belief) {
                relevance += 0.15 * belief.strength;
            }
        }

        // 3. 与个人故事的共鸣
        for story in &self.self_narrative.personal_stories {
            if event.resonates_with(story) {
                relevance += 0.2;
            }
        }

        // 4. 身份一致性的影响
        let consistency = self.evaluate_behavior_consistency(event);
        if consistency < 0.5 {
            relevance += (0.5 - consistency) * 0.3; // 不一致的行为触发更多关注
        }

        relevance.min(1.0)
    }

    /// 评估行为与自我认知的一致性
    pub fn evaluate_behavior_consistency(&self, behavior: &Behavior) -> f32 {
        // 行为 → 隐含的价值观/信念 → 与 core_beliefs 匹配度
        let implied_values = behavior.infer_values();
        let alignment = self.values.check_alignment(&implied_values);
        alignment
    }
}
```

### 4.2 信念更新算法

```rust
impl SelfModel {
    /// 处理一个可能影响信念的经历
    pub fn process_experience(&mut self, experience: &SignificantExperience) -> Vec<BeliefChange> {
        let mut changes = Vec::new();

        for belief in &mut self.core_beliefs {
            if experience.challenges_belief(belief) {
                belief.challenge_count += 1;

                // 信念强度调整（基于贝叶斯更新的简化版）
                let challenge_strength = experience.emotional_intensity * experience.self_relevance;
                let prior = belief.strength;

                // 强信念不容易被单次挑战动摇
                let resistance = prior * 0.8 + self.identity.confidence * 0.2;
                let new_strength = prior - challenge_strength * (1.0 - resistance) * 0.1;

                let outcome = if new_strength < 0.2 {
                    ChallengeOutcome::Weakened
                } else if new_strength > prior {
                    ChallengeOutcome::Strengthened
                } else {
                    ChallengeOutcome::Weakened
                };

                belief.strength = new_strength.max(0.05).min(1.0);
                belief.challenge_outcomes.push(outcome.clone());

                changes.push(BeliefChange {
                    belief_id: belief.id.clone(),
                    old_strength: prior,
                    new_strength: belief.strength,
                    outcome,
                });
            }

            if experience.reinforces_belief(belief) {
                let reinforce_strength = experience.emotional_intensity * 0.05;
                belief.strength = (belief.strength + reinforce_strength).min(1.0);
                belief.formative_experiences.push(experience.memory_id.clone());

                changes.push(BeliefChange {
                    belief_id: belief.id.clone(),
                    old_strength: belief.strength - reinforce_strength,
                    new_strength: belief.strength,
                    outcome: ChallengeOutcome::Strengthened,
                });
            }
        }

        changes
    }
}
```

---

## 五、与 LLM 的集成

### 5.1 Prompt 生成

```python
def self_model_to_prompt(self_model: SelfModel) -> str:
    """将 SelfModel 转换为 LLM 系统 prompt 片段"""
    identity = self_model.identity

    parts = []

    # 我是谁
    parts.append(f"你对自己的认知是：{identity.statement}")

    # 核心信念（取强度最高的 3 个）
    strong_beliefs = sorted(
        self_model.core_beliefs,
        key=lambda b: b.strength,
        reverse=True
    )[:3]
    if strong_beliefs:
        beliefs_str = "；".join(
            f"「{b.statement}」(确信度: {b.strength:.0%})"
            for b in strong_beliefs
        )
        parts.append(f"你深信：{beliefs_str}")

    # 定义我的故事（选 1 个最相关的）
    if self_model.self_narrative.defining_moments:
        moment = self_model.self_narrative.defining_moments[-1]
        parts.append(f"你记得一段定义了自己的经历：{moment.event_summary}。从那以后，{moment.after_identity}")

    # 自我确信度
    if identity.confidence < 0.4:
        parts.append("你对自己的认知还不太确定，容易被外界影响")
    elif identity.confidence > 0.7:
        parts.append("你对自己的认知比较坚定")

    # 元认知
    if self_model.metacognition.recent_reflections:
        latest = self_model.metacognition.recent_reflections[-1]
        parts.append(f"你最近在思考：{latest.insight}")

    return "\n".join(parts)
```

### 5.2 使用示例

```python
# 在 prompt 组装时
self_model = engine.get_self_model()
self_context = self_model_to_prompt(self_model)

system_prompt = f"""
{base_prompt}

【你的自我认知】
{self_context}

请基于你的自我认知自然地回应。
"""
```

---

## 六、实现状态

| 组件 | 状态 | 说明 |
|------|------|------|
| SelfModel 结构体 | 设计完成 | 需要 Rust 实现 |
| SelfIdentity | 设计完成 | 整合了分散的定义 |
| CoreBelief | 设计完成 | 统一了 3 处的重复定义 |
| SelfNarrative | 设计完成 | 只保留"对自我的影响"层 |
| SelfMetacognition | 设计完成 | 从 cognition 系统迁移 |
| evaluate_self_relevance | 设计完成 | 替代各子系统的独立计算 |
| process_experience | 设计完成 | 信念更新 |
| self_model_to_prompt | 设计完成 | LLM 集成 |
| 与各子系统的同步 | 待设计 | 需要 EventBus 事件定义 |

---

## 七、测试用例

```rust
#[test]
fn test_self_relevance_calculation() {
    let mut model = SelfModel::default();
    model.identity.self_labels = vec!["学习者".to_string()];
    model.core_beliefs.push(CoreBelief {
        id: "1".into(),
        statement: "努力总会有回报".into(),
        strength: 0.8,
        // ...
    });

    // 与自我标签相关的事件
    let event = Event::new("有人批评我的学习方法");

    let relevance = model.evaluate_self_relevance(&event);
    assert!(relevance > 0.3, "与自我标签相关的事件应有较高相关性");
}

#[test]
fn test_belief_challenge_updates_identity_confidence() {
    let mut model = SelfModel::default();
    model.identity.confidence = 0.6;

    let experience = SignificantExperience {
        emotional_intensity: 0.9,
        self_relevance: 0.8,
        // challenges a strong belief
    };

    let changes = model.process_experience(&experience);
    assert!(!changes.is_empty());
    // 强信念被严重挑战，自信可能下降
}
```

---

*文档版本: 1.0.0*
*最后更新: 2026-05-06*
*对应引擎模块: akiho-core/src/self_model.rs (待实现)*
