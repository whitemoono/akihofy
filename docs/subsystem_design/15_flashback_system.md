# 闪回系统详细设计

> **对应设计文档章节**: 二十一（拟人化能力深化设计）
> **优先级**: P2
> **状态**: 待实现

---

## 一、设计目标

模拟人类记忆的"不自主涌现"现象——某些触发点会让记忆像闪回一样突然涌入。

---

## 二、核心概念

### 2.1 当前问题

```
当前：用户问"上次我们聊的..." → 主动检索记忆
问题：记忆是"被动"的，不会主动涌现
```

### 2.2 闪回的特点

```
闪回 vs 主动回忆：
- 不请自来：不是刻意回忆，而是记忆自己跳出来
- 情感强度：闪回时情感比当时更强烈
- 片段性：不完整，可能只有某个画面或感受
- 侵入性：可能打断当前思维
- 自发性：没有明确触发也能发生
```

---

## 三、数据结构

### 3.1 闪回结构

```rust
/// 闪回 - 不自主的记忆涌现
pub struct Flashback {
    pub id: String,
    pub triggered_by: TriggerContext,     // 什么触发了闪回
    pub memory_id: String,               // 关联的记忆
    pub content: FlashbackContent,       // 闪回内容
    pub emotional_intensity: f32,         // 闪回时的情感强度
    pub vividness: f32,                 // 清晰度
    pub intrusiveness: f32,            // 侵入性
    pub duration_ms: u64,               // 持续时间
    pub self_interruption: bool,         // 是否自我打断
}

pub struct FlashbackContent {
    pub visual: Option<String>,           // 视觉画面（文字描述）
    pub auditory: Option<String>,        // 声音
    pub dialogue: Option<String>,         // 当时说的话
    pub thought: String,                 // 当时的想法
    pub sensation: String,               // 身体感受
    pub atmosphere: String,              // 当时的气氛
}

pub enum TriggerContext {
    SensorySimilarity { similarity: String },    // 感官相似
    EmotionalResonance { emotion: String },       // 情感共鸣
    TemporalCue { date: String },               // 时间线索（纪念日等）
    AssociativeLink { association: String },     // 联想触发
    SymbolicMatch { symbol: String },            // 象征符号匹配
    Spontaneous,                                 // 自发产生
}
```

### 3.2 闪回系统状态

```rust
pub struct FlashbackSystem {
    memory_store: Arc<MemoryStore>,
    recent_flashbacks: Vec<Flashback>,  // 最近闪回（冷却机制）
    active_flashback: Option<Flashback>, // 当前正在进行的闪回
    flashback_cooldown: Duration,        // 冷却时间
}

impl FlashbackSystem {
    pub fn new(memory_store: Arc<MemoryStore>) -> Self {
        Self {
            memory_store,
            recent_flashbacks: Vec::new(),
            active_flashback: None,
            flashback_cooldown: Duration::from_secs(60),  // 1分钟内不重复
        }
    }
}
```

---

## 四、触发机制

### 4.1 触发类型

```rust
impl FlashbackSystem {
    /// 检查是否触发闪回
    pub fn check_for_flashback(
        &mut self,
        current_input: &str,
        current_emotion: &EmotionState,
        context: &ProcessingContext,
    ) -> Option<Flashback> {
        // 1. 检查冷却
        if self.is_in_cooldown() {
            return None;
        }

        // 2. 检查感官相似触发
        if let Some(trigger) = self.check_sensory_trigger(current_input, context) {
            if self.should_trigger(&trigger) {
                return Some(self.create_flashback(trigger, context));
            }
        }

        // 3. 检查情感共鸣触发
        if let Some(trigger) = self.check_emotional_resonance(current_emotion, context) {
            if self.should_trigger(&trigger) {
                return Some(self.create_flashback(trigger, context));
            }
        }

        // 4. 检查联想触发
        if let Some(trigger) = self.check_associative_trigger(current_input, context) {
            if self.should_trigger(&trigger) {
                return Some(self.create_flashback(trigger, context));
            }
        }

        // 5. 检查时间线索（纪念日等）
        if let Some(trigger) = self.check_temporal_trigger(context) {
            if self.should_trigger(&trigger) {
                return Some(self.create_flashback(trigger, context));
            }
        }

        // 6. 小概率自发产生
        if self.should_spontaneously_trigger() {
            if let Some(trigger) = self.find_emotionally_significant_memory(context) {
                return Some(self.create_flashback(trigger, context));
            }
        }

        None
    }

    /// 检查感官相似触发
    fn check_sensory_trigger(
        &self,
        current_input: &str,
        context: &ProcessingContext,
    ) -> Option<TriggerInfo> {
        // 提取关键词
        let keywords = self.extract_keywords(current_input);

        // 搜索相关的感官记忆
        for keyword in &keywords {
            if let Some(memories) = self.memory_store.search_by_sensory(keyword) {
                if let Some(memory) = self.select_significant_memory(&memories) {
                    return Some(TriggerInfo {
                        memory_id: memory.id,
                        context: TriggerContext::SensorySimilarity {
                            similarity: keyword.clone()
                        },
                        relevance: self.calculate_relevance(&memory, context),
                    });
                }
            }
        }

        None
    }

    /// 检查情感共鸣触发
    fn check_emotional_resonance(
        &self,
        current_emotion: &EmotionState,
        context: &ProcessingContext,
    ) -> Option<TriggerInfo> {
        // 查找同情绪类型的深刻记忆
        if let Some(memories) = self.memory_store.search_by_emotion(
            current_emotion.primary_type,
        ) {
            // 选择情感强度最高的
            if let Some(memory) = memories
                .iter()
                .max_by(|a, b| a.emotional_intensity.partial_cmp(&b.emotional_intensity).unwrap())
            {
                return Some(TriggerInfo {
                    memory_id: memory.id,
                    context: TriggerContext::EmotionalResonance {
                        emotion: format!("{:?}", current_emotion.primary_type)
                    },
                    relevance: memory.emotional_intensity,
                });
            }
        }

        None
    }

    /// 检查联想触发
    fn check_associative_trigger(
        &self,
        current_input: &str,
        context: &ProcessingContext,
    ) -> Option<TriggerInfo> {
        // 分析当前话题的联想词
        let associations = self.extract_associations(current_input);

        for association in &associations {
            if let Some(memory) = self.memory_store.search_by_association(association) {
                return Some(TriggerInfo {
                    memory_id: memory.id,
                    context: TriggerContext::AssociativeLink {
                        association: association.clone()
                    },
                    relevance: 0.7,
                });
            }
        }

        None
    }
}
```

### 4.2 触发决策

```rust
impl FlashbackSystem {
    /// 判断是否应该触发（考虑多种因素）
    fn should_trigger(&self, trigger: &TriggerInfo) -> bool {
        // 1. 相关性阈值
        if trigger.relevance < 0.5 {
            return false;
        }

        // 2. 记忆的情感强度
        if let Some(memory) = self.memory_store.get(&trigger.memory_id) {
            if memory.emotional_intensity < 0.4 {
                return false;
            }
        }

        // 3. 当前情绪状态（情绪不稳定时更易触发）
        let emotion_factor = self.current_emotional_state_factor();

        // 4. 人格因素（敏感型更易闪回）
        let personality_factor = self.personality_factor();

        // 5. 随机因素（模拟真实的不确定性）
        let random_factor = self.random_factor();

        let threshold = 0.5 * emotion_factor * personality_factor;
        trigger.relevance * threshold + random_factor > 0.6
    }

    fn current_emotional_state_factor(&self) -> f32 {
        // 情绪波动大时更容易闪回
        // 简化实现
        1.0 + self.emotion_volatility * 0.5
    }

    fn personality_factor(&self) -> f32 {
        // 敏感型人格更容易闪回
        1.0 + self.personality.sensitivity * 0.3
    }

    fn random_factor(&self) -> f32 {
        // 10% 的随机因素
        rand::random::<f32>() * 0.1
    }
}
```

---

## 五、闪回生成

### 5.1 创建闪回

```rust
impl FlashbackSystem {
    /// 创建闪回
    fn create_flashback(
        &mut self,
        trigger: TriggerInfo,
        context: &ProcessingContext,
    ) -> Flashback {
        let memory = self.memory_store.get(&trigger.memory_id);

        // 闪回时的情感强度可能比原始记忆更强
        let emotional_intensity = self.calculate_flashback_intensity(&memory);

        let flashback = Flashback {
            id: Uuid::new_v4().to_string(),
            triggered_by: trigger.context,
            memory_id: trigger.memory_id,
            content: self.generate_flashback_content(&memory),
            emotional_intensity,
            vividness: self.calculate_vividness(&memory, context),
            intrusiveness: self.calculate_intrusiveness(&memory),
            duration_ms: self.estimate_duration(emotional_intensity),
            self_interruption: self.should_self_interrupt(emotional_intensity),
        };

        // 添加到最近闪回
        self.recent_flashbacks.push(flashback.clone());
        self.active_flashback = Some(flashback.clone());

        flashback
    }

    /// 计算闪回情感强度
    fn calculate_flashback_intensity(&self, memory: &Memory) -> f32 {
        // 负面记忆闪回时可能更强（尤其是 PTSD 相关的模拟）
        let base_intensity = memory.emotional_intensity;

        if memory.emotional_intensity > 0.6 {
            // 深刻记忆闪回增强
            base_intensity * 1.2
        } else {
            base_intensity
        }
    }

    /// 生成闪回内容（片段化）
    fn generate_flashback_content(&self, memory: &Memory) -> FlashbackContent {
        // 闪回通常是不完整的，选择最突出的片段

        // 优先提取最强烈的感官记忆
        let visual = memory.visual_elements.first().cloned();
        let auditory = memory.sound_elements.first().cloned();

        FlashbackContent {
            visual,
            auditory,
            dialogue: memory.key_dialogue.clone(),
            thought: memory.inner_thought.clone(),
            sensation: memory.body_sensation.clone(),
            atmosphere: memory.atmosphere.clone(),
        }
    }

    /// 计算闪回侵入性
    fn calculate_intrusiveness(&self, memory: &Memory) -> f32 {
        // 高情绪强度的记忆侵入性更强
        // 负面记忆比正面记忆侵入性更强
        let intensity_factor = memory.emotional_intensity;
        let valence_factor = if memory.valence < 0.0 { 1.3 } else { 1.0 };

        (intensity_factor * valence_factor).min(1.0)
    }

    /// 估算闪回持续时间
    fn estimate_duration(&self, emotional_intensity: f32) -> u64 {
        // 高强度闪回持续更长时间
        let base = 500;  // 基础 500ms
        let extra = (emotional_intensity * 2000.0) as u64;
        (base + extra).min(5000)  // 最多 5 秒
    }
}
```

---

## 六、对行为的影响

### 6.1 闪回处理

```rust
pub struct FlashbackProcessor {
    flashback_system: Arc<RwLock<FlashbackSystem>>,
}

impl FlashbackProcessor {
    /// 处理闪回对当前交互的影响
    pub fn process_flashback(
        &self,
        flashback: &Flashback,
        current_input: &str,
    ) -> ProcessingResult {
        // 1. 闪回可能打断当前思维
        if flashback.intrusiveness > 0.7 {
            return ProcessingResult {
                interrupted: true,
                delay_ms: flashback.duration_ms,
                internal_say: Some(self.generate_internal_comment(flashback)),
                emotional_shift: Some(self.calculate_emotional_shift(flashback)),
                potential_topic: self.extract_related_topic(flashback),
            };
        }

        // 2. 闪回可能只影响情绪基调
        ProcessingResult {
            interrupted: false,
            delay_ms: 0,
            internal_say: None,
            emotional_shift: Some(self.calculate_emotional_shift(flashback)),
            potential_topic: None,
        }
    }

    /// 生成闪回时的内心独白
    fn generate_internal_comment(&self, flashback: &Flashback) -> String {
        let intensity = flashback.emotional_intensity;

        match intensity {
            i if i > 0.8 => {
                format!(
                    "等等，突然想起...{}",
                    flashback.content.sensation
                )
            }
            i if i > 0.6 => {
                format!(
                    "咦，怎么突然想到{}那时候的事...",
                    flashback.content.dialogue.as_deref().unwrap_or("").split_whitespace().next().unwrap_or("")
                )
            }
            i if i > 0.4 => {
                "哦对，当时...".to_string()
            }
            _ => {
                "...".to_string()
            }
        }
    }

    /// 计算闪回导致的情绪变化
    fn calculate_emotional_shift(&self, flashback: &Flashback) -> EmotionalShift {
        EmotionalShift {
            valence_change: self.memory_valence(&flashback.memory_id) * flashback.emotional_intensity * 0.3,
            arousal_change: flashback.emotional_intensity * 0.2,
            dominant_emotion: self.memory_emotion(&flashback.memory_id),
        }
    }
}
```

---

## 七、与对话的集成

### 7.1 Prompt 生成

```python
def flashback_to_prompt(flashback: Flashback) -> str:
    """将闪回转换为 prompt 片段"""

    parts = []

    # 闪回内容
    if flashback.content.sensation:
        parts.append(f"突然想起：{flashback.content.sensation}")

    if flashback.content.dialogue:
        parts.append(f"当时想说：{flashback.content.dialogue}")

    if flashback.content.visual:
        parts.append(f"画面：{flashback.content.visual}")

    return "\n".join(parts)


FLASHBACK_PROMPT_TEMPLATE = """
{flashback_prompt}

这个记忆突然涌了上来...
请基于这个闪回，以你自己的方式回应。
"""
```

---

## 八、实现计划

| 阶段 | 任务 | 优先级 | 依赖 |
|------|------|--------|------|
| 1 | 定义数据结构 (Flashback, FlashbackContent) | P0 | 无 |
| 2 | 实现触发检测 (sensory, emotional, associative) | P0 | 阶段1 |
| 3 | 实现触发决策 (should_trigger) | P0 | 阶段2 |
| 4 | 实现闪回生成 (create_flashback) | P0 | 阶段2 |
| 5 | 实现闪回内容生成 | P1 | 阶段4 |
| 6 | 实现侵入性处理 | P1 | 阶段4 |
| 7 | 实现 Prompt 生成器 | P1 | 阶段5 |
| 8 | 与 Memory System 集成 | P1 | 阶段7 |
| 9 | 与 Emotion System 集成 | P2 | 阶段8 |
| 10 | 单元测试 | P2 | 阶段9 |

---

## 九、性能指标

| 指标 | 目标 | 说明 |
|------|------|------|
| 触发检测延迟 | < 10ms | 检查是否触发的处理时间 |
| 闪回生成延迟 | < 5ms | 生成闪回内容的时间 |
| 冷却时间 | 60s | 同一记忆的最小触发间隔 |
| 触发概率 | < 10% | 每次输入触发闪回的概率上限 |
