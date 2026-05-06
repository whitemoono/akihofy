# 情感反应链引擎详细设计

> **对应设计文档章节**: 二十一（拟人化能力深化设计）
> **优先级**: P1
> **状态**: 待实现

---

## 一、设计目标

将情绪系统从"状态容器"升级为"情感体验模拟器"，模拟人类从刺激到感受的完整心理过程。

---

## 二、与情绪系统的分层关系

本模块与 [05_emotion_system.md](./05_emotion_system.md) 形成**双轨情绪架构**：

```
┌──────────────────────────────────────────────────────────────┐
│                    AKIHO 双轨情绪架构                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  L1 实时管线（每 100ms，Rust）── 05_emotion_system.md       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 刺激 → PAD 更新 → 惯性衰减 → 状态机分类                  │ │
│  │ 输出：当前情绪标签（如 "slightly_happy"）                │ │
│  │ 用途：决定回复基调、触发行为、驱动生理消耗               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                          ↑                                   │
│                          │ 重要事件时 L2 输出 OVERRIDE L1     │
│                          │ (override 持续 1-3 个 tick 后     │
│                          │  被 L1 的惯性衰减自然拉回)         │
│                          ↓                                   │
│  L2 体验管线（重要事件触发，Rust + LLM）── 本文档            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 重要事件 → 感知→评估→感受→内在体验→冲动→抑制→表达        │ │
│  │ 输出：完整的体验描述（给 LLM 做内心独白）                 │ │
│  │ 触发条件：emotional_intensity > 0.6 或 self_relevance>0.5│ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**关键规则**：
- L1 持续运行，保证情绪状态的实时性
- L2 仅在重要事件时触发，提供深度体验
- L2 的结果会临时 OVERRIDE L1 的情绪标签，但 L1 的惯性和衰减仍在后台运行
- L1 处理普通刺激（如日常对话），L2 处理高强度刺激（冲突、赞美、转折点）
- LLM 收到的是 L2 的体验描述（如果有触发）+ L1 的情绪标签（始终包含）

---

## 三、核心概念

### 3.1 当前问题

```
当前流程：
  用户骂我 → PAD 更新(P=-0.5) → LLM 被告知"你不开心" → 生成"我不开心"

问题：
- 情绪只是数值，没有体验过程
- LLM 是在"表演"情绪，而不是"真正感受"
- 缺少从刺激到感受的心理过程
```

### 3.2 改进后的流程

```
改进流程：
  用户骂我 → 情感反应链 → 生成真实情感体验 → LLM 基于体验生成回复
              │
              ├─► 刺激感知：是什么触发的？
              ├─► 认知评估：这意味着什么？
              ├─► 情感反应：我的感受是什么？
              ├─► 内在体验：我的内心有什么感觉？
              ├─► 行动冲动：我想做什么？
              └─► 表达选择：说/不说/怎么说？
```

---

## 四、数据结构

### 4.1 情感反应链

```rust
/// 情感反应链 - 从刺激到感受的完整过程
pub struct EmotionReactionChain {
    pub trigger: EmotionTrigger,           // 是什么触发了情绪
    pub perception: Perception,            // 感知阶段
    pub appraisal: CognitiveAppraisal,     // 评估阶段
    pub feelings: Vec<Feeling>,            // 情感阶段
    pub inner_sensation: InnerSensation,   // 内在体验：我的内心有什么感觉
    pub impulse: ActionImpulse,            // 冲动阶段
    pub suppression: Option<Suppression>, // 抑制阶段
    pub expression: ExpressionChoice,      // 表达选择
}

pub struct EmotionTrigger {
    pub source: TriggerSource,             // 触发来源
    pub event_type: EventType,            // 事件类型
    pub raw_input: String,                // 原始输入
}

pub enum TriggerSource {
    UserMessage,      // 用户消息
    InternalThought,  // 内部想法
    ExternalEvent,    // 外部事件
    MemoryRecall,     // 记忆唤起
    SocialSignal,     // 社交信号
}

pub enum EventType {
    PositiveInteraction,
    NegativeInteraction,
    NeutralMessage,
    Question,
    Request,
    Criticism,
    Compliment,
    TopicChange,
    Silence,
    ReturnAfterAbsence,
}
```

### 4.2 认知评估

```rust
/// 认知评估 - 模拟人类如何解读事件
pub struct CognitiveAppraisal {
    pub relevance: f32,           // 相关性：与我有关吗？
    pub pleasantness: f32,        // 愉悦度：这让我开心还是难过？
    pub goal_alignment: f32,      // 目标一致性：有利于我的目标吗？
    pub agency: AgencyAttribution, // 归因：是谁的错？
    pub coping_potential: f32,    // 应对可能性：我能处理吗？
    pub novelty: f32,            // 新颖性：这是新鲜的还是熟悉的？
    pub interpretation: String,    // 对事件的解读
}

pub enum AgencyAttribution {
    SelfBlame,      // 是我的错
    OtherBlame,     // 是对方的错
    Circumstance,   // 是环境的原因
    Unknown,        // 不知道
    Shared,         // 双方都有责任
}
```

### 4.3 情感与内在体验

```rust
pub struct Feeling {
    pub emotion_type: EmotionType,   // 情绪类型
    pub intensity: f32,              // 强度 0.0 ~ 1.0
    pub valence: f32,                // 效价：正面/负面
    pub arousal: f32,                // 唤醒度：平静/兴奋
    pub description: String,          // 感受描述
}

pub enum EmotionType {
    // 基础情绪
    Joy, Sadness, Anger, Fear, Disgust, Surprise,
    // 复合情绪
    Anxiety, Shame, Guilt, Pride, Hope,
    // 高级复合情绪
    Melancholy,    // 忧郁：悲伤+甜蜜
    Resentment,    // 委屈：愤怒+悲伤
    Awe,           // 敬畏：惊奇+恐惧
    Jealousy,      // 嫉妒：愤怒+恐惧+欲望
    Longing,       // 渴望：思念+悲伤
    Nostalgia,     // 怀旧：回忆+甜蜜+悲伤
    Relief,        // 如释重负：紧张解除+满足
    Contempt,      // 轻蔑：优越+厌恶
}

/// 内在体验 - 将抽象情绪转化为内心感受描述（不是生理模拟，而是体验质感）
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
    Burning,   // 灼热
    Floating,  // 漂浮
}
```

### 4.4 行动冲动与表达

```rust
pub struct ActionImpulse {
    pub action_type: ImpulseAction,   // 冲动类型
    pub intensity: f32,              // 冲动强度
    pub resistance: f32,             // 抵抗冲动的能力
    pub description: String,          // 冲动的描述
}

pub enum ImpulseAction {
    SpeakUp,      // 想说出来
    Withdraw,     // 想退缩
    Attack,       // 想反击
    Comfort,      // 想安慰对方
    Distract,     // 想转移话题
    Apologize,    // 想道歉
    Question,     // 想追问
    Ignore,       // 想忽略
    Cry,          // 想哭
    Laugh,        // 想笑
    Embrace,      // 想拥抱
    Distance,     // 想保持距离
}

pub struct ExpressionChoice {
    pub action: Option<ImpulseAction>,  // 执行的冲动
    pub modified: bool,                  // 是否修改过
    pub modification: Option<String>,    // 如何修改
    pub suppressed: bool,               // 是否被抑制
    pub suppression_reason: Option<String>, // 抑制原因
}
```

---

## 五、处理流程

### 5.1 完整处理流程

```rust
impl EmotionReactionChain {
    /// 处理输入，生成完整的情感反应链
    pub fn process(&mut self, input: &str, context: &ProcessingContext) -> EmotionReactionChain {
        // 1. 感知阶段
        let perception = self.perceive(input, context);

        // 2. 认知评估
        let appraisal = self.appraise(&perception, context);

        // 3. 生成感受
        let feelings = self.generate_feelings(&appraisal, context);

        // 4. 生成内在体验
        let inner_sensation = self.generate_inner_sensation(&feelings, context);

        // 5. 行动冲动
        let impulse = self.generate_impulse(&feelings, &appraisal, context);

        // 6. 评估是否抑制
        let suppression = self.evaluate_suppression(&impulse, context);

        // 7. 选择表达方式
        let expression = self.choose_expression(&suppression, &impulse, context);

        EmotionReactionChain {
            trigger: EmotionTrigger::from_input(input),
            perception,
            appraisal,
            feelings,
            inner_sensation,
            impulse,
            suppression,
            expression,
        }
    }
}
```

### 5.2 感知阶段

```rust
impl EmotionReactionChain {
    /// 感知阶段 - 分析输入的原始特征
    fn perceive(&self, input: &str, context: &ProcessingContext) -> Perception {
        Perception {
            content_type: self.detect_content_type(input),
            emotional_markers: self.extract_emotional_markers(input),
            social_signals: self.analyze_social_signals(input, context),
            intensity_signals: self.detect_intensity(input),
        }
    }

    fn detect_content_type(&self, input: &str) -> ContentType {
        if self.contains_question(input) {
            ContentType::Question
        } else if self.contains_criticism(input) {
            ContentType::Criticism
        } else if self.contains_compliment(input) {
            ContentType::Compliment
        } else if self.is_empty_or_silence(input) {
            ContentType::Silence
        } else {
            ContentType::Statement
        }
    }
}
```

### 5.3 认知评估阶段

```rust
impl EmotionReactionChain {
    /// 认知评估 - 模拟人类如何解读事件
    fn appraise(&self, perception: &Perception, context: &ProcessingContext) -> CognitiveAppraisal {
        let relationship = context.get_relationship();

        // 相关性评估
        let relevance = self.assess_relevance(perception, context);

        // 愉悦度评估（基于内容类型和关系）
        let pleasantness = self.assess_pleasantness(perception, relationship);

        // 归因分析
        let agency = self.attribute_agency(perception, relationship);

        // 生成解读
        let interpretation = self.generate_interpretation(
            perception,
            relevance,
            pleasantness,
            agency,
            context.get_personality(),
        );

        CognitiveAppraisal {
            relevance,
            pleasantness,
            goal_alignment: self.assess_goal_alignment(perception, context),
            agency,
            coping_potential: self.assess_coping(perception, context),
            novelty: self.assess_novelty(perception, context),
            interpretation,
        }
    }

    fn generate_interpretation(
        &self,
        perception: &Perception,
        relevance: f32,
        pleasantness: f32,
        agency: AgencyAttribution,
        personality: &PersonalityProfile,
    ) -> String {
        // 根据评估结果生成对事件的解读
        // 这将传递给 LLM，用于理解"这意味着什么"

        match (perception.content_type, pleasantness, agency) {
            (ContentType::Criticism, p, _) if p < 0.0 && personality.sensitivity > 0.5 => {
                format!("ta好像在批评我...是我的问题吗")
            }
            (ContentType::Criticism, p, AgencyAttribution::OtherBlame) if p < 0.0 => {
                format!("ta好像在针对我")
            }
            (ContentType::Compliment, _, _) => {
                format!("ta在夸我",)
            }
            // ... 更多解读模式
            _ => format!("{}",
                match perception.content_type {
                    ContentType::Question => "ta在问我问题",
                    ContentType::Silence => "ta好像在想什么",
                    _ => "发生了这样一件事",
                }
            ),
        }
    }
}
```

### 5.4 情感生成阶段

```rust
impl EmotionReactionChain {
    /// 生成情感反应
    fn generate_feelings(&self, appraisal: &CognitiveAppraisal, context: &ProcessingContext) -> Vec<Feeling> {
        let mut feelings = Vec::new();

        // 基础情绪（从评估推导）
        let primary = self.derive_primary_emotion(appraisal);
        feelings.push(primary);

        // 考虑关系特定因素
        if let Some(relationship_emotion) = self.consider_relationship(appraisal, context) {
            feelings.push(relationship_emotion);
        }

        // 生成复合情绪（如果有多种基础情绪）
        if feelings.len() > 1 {
            if let Some(compound) = self.derive_compound_emotion(&feelings, appraisal) {
                feelings.push(compound);
            }
        }

        feelings
    }

    fn derive_primary_emotion(&self, appraisal: &CognitiveAppraisal) -> Feeling {
        // 基于 PAD 和认知评估推导基础情绪
        let (pleasure, arousal, dominance) = self.pad_from_appraisal(appraisal);

        let emotion_type = match (pleasure, arousal, dominance) {
            (p, a, _) if p > 0.5 && a > 0.3 => EmotionType::Joy,
            (p, a, _) if p > 0.5 && a < 0.0 => EmotionType::Serenity,
            (p, _, _) if p < -0.5 && a > 0.3 => EmotionType::Anger,
            (p, _, _) if p < -0.5 && a > 0.0 => EmotionType::Fear,
            (p, a, d) if p < 0.0 && a < 0.0 && d < 0.0 => EmotionType::Sadness,
            // ... 更多映射
            _ => EmotionType::Surprise,
        };

        Feeling {
            emotion_type,
            intensity: (pleasure.abs() + arousal.abs() + dominance.abs()) / 3.0,
            valence: pleasure,
            arousal,
            description: self.describe_emotion(&emotion_type),
        }
    }
}
```

### 5.5 内在体验生成

```rust
impl EmotionReactionChain {
    /// 生成内在体验 - 根据情绪生成内心感受描述
    fn generate_inner_sensation(&self, feelings: &[Feeling], context: &ProcessingContext) -> InnerSensation {
        let dominant_feeling = feelings
            .iter()
            .max_by(|a, b| a.intensity.partial_cmp(&b.intensity).unwrap());

        match dominant_feeling {
            Some(f) => self.inner_sensation_for_emotion(f),
            None => InnerSensation {
                texture: SensationTexture::Numb,
                intensity: 0.0,
                description: "没什么特别的感觉".to_string(),
            },
        }
    }

    /// 根据情绪类型生成内在体验
    fn inner_sensation_for_emotion(&self, feeling: &Feeling) -> InnerSensation {
        let texture = self.derive_texture(&feeling.emotion_type);
        let description = self.describe_inner_sensation(&feeling.emotion_type, feeling.intensity);

        InnerSensation {
            texture,
            intensity: feeling.intensity,
            description,
        }
    }

    /// 从情绪类型推导体验质感
    fn derive_texture(&self, emotion: &EmotionType) -> SensationTexture {
        match emotion {
            EmotionType::Joy | EmotionType::Love | EmotionType::Hope => SensationTexture::Warm,
            EmotionType::Sadness | EmotionType::Grief => SensationTexture::Heavy,
            EmotionType::Anxiety | EmotionType::Fear => SensationTexture::Tight,
            EmotionType::Anger => SensationTexture::Burning,
            EmotionType::Peace | EmotionType::Serenity => SensationTexture::Calm,
            EmotionType::Numbness | EmotionType::Confusion => SensationTexture::Numb,
            _ => SensationTexture::Loose,
        }
    }

    /// 描述内在体验
    fn describe_inner_sensation(&self, emotion: &EmotionType, intensity: f32) -> String {
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

---

## 六、与 LLM 的集成

### 6.1 Prompt 生成

```python
def chain_to_prompt(chain: EmotionReactionChain) -> str:
    """将情感反应链转换为 LLM prompt 片段"""

    parts = []

    # 感受
    if chain.feelings:
        feelings_str = "、".join(f.description for f in chain.feelings)
        parts.append(f"你感觉到：{feelings_str}")

    # 身体感受
    if chain.sensation.intensity > 0.1:
        parts.append(f"你的身体感觉：{chain.sensation.description}")

    # 解读
    if chain.appraisal.interpretation:
        parts.append(f"你理解这意味着：{chain.appraisal.interpretation}")

    # 冲动
    if chain.impulse.intensity > 0.3:
        parts.append(f"你内心有个冲动：{chain.impulse.description}")

    # 表达选择
    if chain.expression.modified:
        parts.append(f"你选择：{chain.expression.modification}")
    elif chain.expression.suppressed:
        parts.append(f"你压住了冲动：{chain.expression.suppression_reason}")

    return "\n".join(parts)
```

### 6.2 完整 Prompt 示例

```python
EXPERIENCE_PROMPT_TEMPLATE = """
基于你刚才的真实体验：

{emotion_chain_prompt}

请基于以上真实的内心体验，用你自己的方式回应。
不要假装没事，也不要过度分析。就按照你真正感受到的来说。
"""
```

---

## 七、实现计划

| 阶段 | 任务 | 优先级 | 依赖 |
|------|------|--------|------|
| 1 | 定义数据结构 (EmotionReactionChain, Feeling, InnerSensation) | P0 | 无 |
| 2 | 实现感知阶段 (Perception) | P0 | 阶段1 |
| 3 | 实现认知评估阶段 (CognitiveAppraisal) | P0 | 阶段2 |
| 4 | 实现情感生成 (derive_primary_emotion) | P0 | 阶段3 |
| 5 | 实现内在体验生成 | P1 | 阶段4 |
| 6 | 实现行动冲动生成 | P1 | 阶段4 |
| 7 | 实现抑制与表达选择 | P1 | 阶段5,6 |
| 8 | 实现 Prompt 生成器 | P1 | 阶段7 |
| 9 | 与 EmotionEngine 集成 | P1 | 阶段8 |
| 10 | 单元测试与调优 | P2 | 阶段9 |

---

## 八、测试用例

### 8.1 负面互动测试

```rust
#[test]
fn test_negative_interaction() {
    let chain = EmotionReactionChain::new();
    let context = ProcessingContext::test_context();

    let result = chain.process(
        "你怎么这么笨，这点事都做不好",
        &context,
    );

    // 应该有负面情绪
    assert!(result.feelings.iter().any(|f| f.valence < 0.0));
    // 应该有内在体验
    assert!(result.inner_sensation.intensity > 0.0);
    // 应该有冲动（可能想反驳或退缩）
    assert!(result.impulse.intensity > 0.0);
}
```

### 8.2 正面互动测试

```rust
#[test]
fn test_positive_interaction() {
    let chain = EmotionReactionChain::new();
    let context = ProcessingContext::test_context();

    let result = chain.process(
        "你今天做得真棒！",
        &context,
    );

    // 应该有正面情绪
    assert!(result.feelings.iter().any(|f| f.valence > 0.0));
    // 应该有温暖的内在体验
    assert!(result.inner_sensation.texture == SensationTexture::Warm);
}
```

---

## 九、性能指标

| 指标 | 目标 | 说明 |
|------|------|------|
| 处理延迟 | < 5ms | Rust 层处理时间 |
| 内存占用 | < 1KB | 每个链的数据大小 |
| 准确度 | > 80% | 与预期情绪类型匹配 |

---

## 十、实现状态与 Python 集成

### 10.1 实现状态

| 组件 | 状态 | 说明 |
|------|------|------|
| 数据结构定义 | ✅ 已完成 | EmotionReactionChain, Feeling, InnerSensation 等 |
| 感知阶段 | ✅ 已完成 | Perception 实现 |
| 认知评估阶段 | ✅ 已完成 | CognitiveAppraisal 实现 |
| 情感生成 | ✅ 已完成 | derive_primary_emotion, derive_compound_emotion |
| 内在体验生成 | ✅ 已完成 | inner_sensation_for_emotion |
| 行动冲动生成 | ✅ 已完成 | generate_action_impulse |
| 抑制与表达选择 | ✅ 已完成 | Suppression, ExpressionChoice |
| Prompt 生成器 | ✅ 已完成 | chain_to_prompt |
| 复合情绪支持 | ✅ 已完成 | 与 emotion-1 集成 |
| LLM 集成 | 🚧 进行中 | 需要与 Python 引擎集成 |
| 单元测试 | 🚧 进行中 | 需要补充边界测试 |

### 10.2 Python 实现模板

```python
from dataclasses import dataclass, field
from typing import List, Optional
from enum import Enum


class EmotionType(Enum):
    JOY = "joy"
    SADNESS = "sadness"
    ANGER = "anger"
    FEAR = "fear"
    ANXIETY = "anxiety"
    LOVE = "love"
    HOPE = "hope"
    PEACE = "peace"


@dataclass
class EmotionReactionChain:
    """从刺激到感受的完整心理过程"""
    trigger: 'EmotionTrigger'
    perception: 'Perception'
    appraisal: 'CognitiveAppraisal'
    feelings: List['Feeling'] = field(default_factory=list)
    inner_sensation: Optional['InnerSensation'] = None
    impulse: Optional['ActionImpulse'] = None
    suppression: Optional['Suppression'] = None
    expression: Optional['ExpressionChoice'] = None

    def process(self, input: 'EmotionalInput', context: 'ProcessingContext') -> 'EmotionReactionChain':
        """处理输入，生成情感反应链"""
        # 1. 感知阶段
        self.perception = self.perceive(input, context)

        # 2. 认知评估
        self.appraisal = self.appraise(self.perception, context)

        # 3. 生成感受（支持复合情绪）
        self.feelings = self.generate_feelings(self.appraisal, context)

        # 4. 生成内在体验
        self.inner_sensation = self.generate_inner_sensation(self.feelings, context)

        # 5. 行动冲动
        self.impulse = self.generate_action_impulse(self.feelings, self.appraisal, context)

        # 6. 抑制决策
        if self.impulse and self.should_suppress(self.impulse, context):
            self.suppression = self.create_suppression(self.impulse, context)
            self.expression = self.choose_expression(None, context)
        else:
            # 7. 表达选择
            self.expression = self.choose_expression(self.impulse, context)

        return self

    def to_prompt_context(self) -> str:
        """转换为 LLM 上下文"""
        parts = []

        if self.feelings:
            feelings_str = "、".join(f.description for f in self.feelings if f.description)
            parts.append(f"你内心感受到：{feelings_str}")

        if self.inner_sensation and self.inner_sensation.intensity > 0.1:
            parts.append(f"这种感觉像是：{self.inner_sensation.description}")

        if self.appraisal.interpretation:
            parts.append(f"你觉得：{self.appraisal.interpretation}")

        if self.impulse and self.impulse.intensity > 0.3 and not self.suppression:
            parts.append(f"你想说：{self.impulse.description}")

        if self.expression and self.expression.modified:
            parts.append(f"但你决定：{self.expression.modification}")

        if self.suppression:
            parts.append(f"你压住了冲动，因为：{self.suppression.reason}")

        return "\n".join(parts)
```

### 10.3 使用示例

```python
# 在 Python 引擎中集成
class EmotionEngine:
    def __init__(self):
        self.chain_processor = EmotionReactionChain()

    def process_message(self, message: str, context: ProcessingContext) -> str:
        # 构建输入
        input = EmotionalInput(
            trigger=Trigger.user_message(message),
            event_type=self.classify_event(message),
            context=context
        )

        # 处理情感反应链
        chain = self.chain_processor.process(input, context)

        # 生成上下文
        emotion_context = chain.to_prompt_context()

        # 构建 LLM prompt
        prompt = f"""
        基于你当前的情感状态：
        {emotion_context}

        请自然地回应这个消息。
        """

        # 调用 LLM
        response = self.llm.generate(prompt)

        return response
```

---

*文档版本: 2.0.0*
*最后更新: 2026-05-06*
*对应引擎模块: engine/emotion_chain.py (待实现)*
