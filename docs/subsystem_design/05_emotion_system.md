# 情绪系统详细设计

> **对应设计文档章节**: 六（情绪系统）
> **优先级**: P0
>
> **架构说明**: 本模块实现 L1 实时情绪管线（高频 PAD 计算）。重要事件的深度体验由 L2 管线 [14_emotion_reaction_chain.md](./14_emotion_reaction_chain.md) 处理。两个管线的分层关系详见 14 号文档第二章。

---

## 一、设计目标

构建基于 PAD 情感模型的实时情绪引擎，支持：
- 三维情绪状态建模（Pleasure-Arousal-Dominance）
- 情绪状态机转换
- 情绪惯性衰减
- 多源刺激整合
- 实时可视化
- **为上层 L2 体验管线提供持续的情绪基底**

---

## 二、PAD 情绪模型

### 2.1 模型定义

PAD（Pleasure-Arousal-Dominance）是 Mehrabian 和 Russell 提出的三维情绪模型：

| 维度 | 范围 | 含义 |
|------|------|------|
| **P (愉悦度)** | -1.0 ~ +1.0 | 情绪的正负极性 |
| **A (唤醒度)** | -1.0 ~ +1.0 | 激活/兴奋程度 |
| **D (支配度)** | -1.0 ~ +1.0 | 对情绪的控制能力 |

### 2.2 PAD 与情绪映射

| 情绪 | P | A | D | 说明 |
|------|---|---|---|------|
| 愤怒 | -0.51 | +0.59 | +0.25 | 高唤醒、负愉悦、较高控制 |
| 恐惧 | -0.64 | +0.60 | -0.43 | 高唤醒、负愉悦、低控制 |
| 悲伤 | -0.30 | -0.20 | -0.50 | 低唤醒、负愉悦、低控制 |
| 喜悦 | +0.81 | +0.46 | +0.45 | 高唤醒、正愉悦、高控制 |
| 惊奇 | +0.40 | +0.67 | -0.13 | 高唤醒、中愉悦、低控制 |
| 厌恶 | -0.60 | +0.35 | +0.30 | 中唤醒、负愉悦、较高控制 |
| 服从 | -0.36 | -0.19 | -0.57 | 低唤醒、负愉悦、低控制 |
| 满足 | +0.57 | -0.33 | +0.25 | 低唤醒、正愉悦、中控制 |
| 厌倦 | -0.32 | -0.62 | -0.12 | 低唤醒、负愉悦、低控制 |
| 焦虑 | -0.40 | +0.62 | -0.42 | 高唤醒、负愉悦、低控制 |

### 2.3 复合情绪支持

基础 PAD 模型只能表示单一情绪，但人类体验中经常出现**复合情绪**（同时感受到多种情绪）。

```rust
/// 情绪状态——支持复合情绪
#[derive(Debug, Clone)]
pub struct EmotionalState {
    pub primary: EmotionCategory,
    pub intensity: f32,
    pub secondary: Option<EmotionCategory>,
    pub ambiguity: f32,
    pub pad: PADState,
}

impl EmotionalState {
    /// 创建单一情绪
    pub fn single(category: EmotionCategory, intensity: f32) -> Self {
        Self {
            primary: category,
            intensity,
            secondary: None,
            ambiguity: 0.0,
            pad: PADState::from_category(category, intensity),
        }
    }

    /// 混合两种情绪生成复合情绪
    pub fn blend(&self, other: &EmotionalState) -> EmotionalState {
        let blended_pad = PADState {
            pleasure: (self.pad.pleasure + other.pad.pleasure) / 2.0,
            arousal: (self.pad.arousal + other.pad.arousal) / 2.0,
            dominance: (self.pad.dominance + other.pad.dominance) / 2.0,
        };

        EmotionalState {
            primary: self.primary,
            intensity: (self.intensity + other.intensity) / 2.0,
            secondary: Some(other.primary),
            ambiguity: 0.5,
            pad: blended_pad,
        }
    }

    /// 获取复合情绪描述
    pub fn compound_description(&self) -> String {
        match (&self.primary, &self.secondary) {
            (Joy, Some(Sadness)) => "百感交集".to_string(),
            (Joy, Some(Fear)) => "又惊又喜".to_string(),
            (Anger, Some(Sadness)) => "委屈".to_string(),
            (Sadness, Some(Guilt)) => "悔恨".to_string(),
            (Fear, Some(Sadness)) => "绝望".to_string(),
            (Surprise, Some(Fear)) => "惊恐".to_string(),
            (Surprise, Some(Joy)) => "惊喜".to_string(),
            (Hope, Some(Fear)) => "忐忑的期待".to_string(),
            (a, Some(b)) => format!("{}而{}", a.description(), b.description()),
            _ => self.primary.description(),
        }
    }
}

/// 情绪类别——包括基础和复合情绪
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EmotionCategory {
    Neutral, Joy, Sadness, Anger, Fear, Disgust, Surprise,
    Anxiety, Shame, Guilt, Pride, Hope, Serenity, Contempt, Envy, Compassion, Relief,
    Melancholy, Nostalgia, Resentment, Awe, Longing,
}

impl EmotionCategory {
    pub fn description(&self) -> String {
        match self {
            Neutral => "平静", Joy => "开心", Sadness => "难过",
            Anger => "生气", Fear => "害怕", Disgust => "厌恶", Surprise => "惊讶",
            Anxiety => "焦虑", Shame => "羞耻", Guilt => "内疚", Pride => "自豪",
            Hope => "希望", Serenity => "宁静", Contempt => "轻蔑", Envy => "嫉妒",
            Compassion => "同情", Relief => "释然", Melancholy => "忧郁",
            Nostalgia => "怀旧", Resentment => "委屈", Awe => "敬畏", Longing => "渴望",
        }
    }
}
```

---

## 三、情绪状态机

### 3.1 状态定义

```rust
pub enum EmotionState {
    Neutral,     // 中性
    Positive,    // 正面情绪
    Negative,    // 负面情绪
    Mixed,       // 矛盾情绪
    Apathetic,   // 冷漠/厌倦
}
```

### 3.2 状态转换规则

```
                    ┌──────────────────────────────────────┐
                    │                                      │
                    ▼                                      │
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐ │
│ Neutral │◄──►│Positive │◄──►│  Mixed  │◄──►│Negative │ │
└─────────┘    └────┬────┘    └────┬────┘    └─────────┘ │
                    │              │                       │
                    │              ▼                       │
                    │         ┌─────────┐                  │
                    └────────►│ Apathetic│◄─────────────────┘
                              └─────────┘
```

**转换条件**：
- `P > 0.3` 且 `|A| < 0.3` → Positive
- `P < -0.3` 且 `|A| > 0.3` → Negative
- `|P| < 0.2` 且 `A < -0.3` → Apathetic
- `|P| < 0.2` 且 `|A| < 0.2` → Neutral
- 其他情况 → Mixed

---

## 四、情绪惯性

### 4.1 惯性定义

情绪不会瞬间变化，具有**惯性**（Inertia）特性：
- 情绪状态会沿当前方向逐渐变化
- 越强烈的情绪变化，需要越长时间平息
- 情绪惯性系数：`inertia = 0.0 ~ 1.0`

### 4.2 增强的衰减算法

```rust
/// 衰减上下文——用于计算动态衰减率
#[derive(Debug, Clone)]
pub struct DecayContext {
    /// 是否处于睡眠/休息状态
    pub is_resting: bool,

    /// 是否处于活跃时段
    pub is_active_period: bool,

    /// 当前唤醒度（影响衰减速度）
    pub arousal_level: f32,

    /// 是否为重要记忆相关的情绪（锚定情绪）
    pub is_anchored: bool,
}

/// 增强的情绪惯性系统
pub struct EmotionInertia {
    /// 基础衰减率（每秒）
    base_decay_rate: f32,

    /// 睡眠时衰减倍率（睡眠时情绪消退更快）
    sleep_multiplier: f32,

    /// 活跃时段衰减倍率（活跃时情绪消退更快）
    active_multiplier: f32,

    /// 锚定阈值——超过此强度的情绪更难消退
    anchoring_threshold: f32,

    /// 锚定衰减倍率——锚定情绪的衰减减慢
    anchoring_decay_rate: f32,

    /// 情绪特异性衰减——不同情绪衰减速度不同
    emotion_decay_rates: HashMap<EmotionCategory, f32>,
}

impl Default for EmotionInertia {
    fn default() -> Self {
        let mut emotion_decay_rates = HashMap::new();

        // 正面情绪衰减较快
        emotion_decay_rates.insert(EmotionCategory::Joy, 1.2);
        emotion_decay_rates.insert(EmotionCategory::Pride, 1.1);
        emotion_decay_rates.insert(EmotionCategory::Hope, 1.0);

        // 负面情绪衰减较慢
        emotion_decay_rates.insert(EmotionCategory::Sadness, 0.7);
        emotion_decay_rates.insert(EmotionCategory::Anger, 0.8);
        emotion_decay_rates.insert(EmotionCategory::Fear, 0.7);
        emotion_decay_rates.insert(EmotionCategory::Anxiety, 0.6);
        emotion_decay_rates.insert(EmotionCategory::Guilt, 0.5);  // 内疚最难消退

        // 中性情绪
        emotion_decay_rates.insert(EmotionCategory::Surprise, 1.3);
        emotion_decay_rates.insert(EmotionCategory::Neutral, 1.0);

        Self {
            base_decay_rate: 0.05,
            sleep_multiplier: 1.5,      // 睡眠时情绪消退快 50%
            active_multiplier: 1.2,       // 活跃时情绪消退快 20%
            anchoring_threshold: 0.7,     // 高于 0.7 的情绪算锚定情绪
            anchoring_decay_rate: 0.3,     // 锚定情绪衰减减慢 70%
            emotion_decay_rates,
        }
    }
}

impl EmotionInertia {
    /// 应用衰减——根据上下文计算动态衰减
    pub fn apply_decay(
        &self,
        current: &PADState,
        delta_seconds: f32,
        context: &DecayContext,
        emotion: &EmotionCategory,
    ) -> PADState {
        // 计算基础衰减
        let mut effective_decay = self.base_decay_rate * delta_seconds;

        // 情绪特异性衰减
        if let Some(emotion_rate) = self.emotion_decay_rates.get(emotion) {
            effective_decay *= emotion_rate;
        }

        // 睡眠时衰减加速
        if context.is_resting {
            effective_decay *= self.sleep_multiplier;
        }

        // 活跃时段衰减加速
        if context.is_active_period {
            effective_decay *= self.active_multiplier;
        }

        // 高唤醒状态时衰减减慢（激动的时候情绪持续更久）
        if context.arousal_level > 0.6 {
            effective_decay *= 0.8;
        }

        // 锚定情绪（重要记忆相关）衰减减慢
        if context.is_anchored || current.distance(&PADState::neutral()) > self.anchoring_threshold {
            effective_decay *= self.anchoring_decay_rate;
        }

        // 应用衰减
        self.decay_values(current, effective_decay)
    }

    /// 衰减 PAD 值
    fn decay_values(&self, current: &PADState, decay: f32) -> PADState {
        PADState {
            pleasure: self.decay_value(current.pleasure, decay),
            arousal: self.decay_value(current.arousal, decay),
            dominance: self.decay_value(current.dominance, decay),
        }
    }

    /// 衰减单个值（保持符号）
    fn decay_value(&self, value: f32, decay: f32) -> f32 {
        if value.abs() < 0.05 {
            return 0.0;  // 接近中性时归零
        }

        let sign = value.signum();
        let abs = value.abs();
        let new_abs = (abs - decay).max(0.0);

        sign * new_abs
    }

    /// 计算情绪峰值后的"冷却期"
    pub fn cooling_period_after_peak(&self, peak_intensity: f32) -> f32 {
        // 情绪越强烈，冷却期越长
        // 基础冷却 5 秒，每 0.1 强度增加 10 秒
        5.0 + peak_intensity * 100.0
    }
}

/// 情绪惯性历史——用于检测情绪趋势
pub struct EmotionInertiaHistory {
    /// 最近的 PAD 值历史
    pad_history: VecDeque<(std::time::Instant, PADState)>,

    /// 最大历史长度
    max_length: usize,

    /// 情绪峰值记录
    peak_intensity: f32,
}

impl EmotionInertiaHistory {
    pub fn new(max_length: usize) -> Self {
        Self {
            pad_history: VecDeque::with_capacity(max_length),
            max_length,
            peak_intensity: 0.0,
        }
    }

    /// 记录当前状态
    pub fn record(&mut self, state: &PADState) {
        let intensity = state.intensity();

        // 更新峰值
        if intensity > self.peak_intensity {
            self.peak_intensity = intensity;
        }

        self.pad_history.push_front((std::time::Instant::now(), state.clone()));

        // 限制历史长度
        while self.pad_history.len() > self.max_length {
            self.pad_history.pop_back();
        }
    }

    /// 判断是否为情绪峰值
    pub fn is_at_peak(&self) -> bool {
        if self.pad_history.len() < 3 {
            return false;
        }

        let current = &self.pad_history[0].1;
        let prev = &self.pad_history[1].1;

        current.intensity() > prev.intensity() &&
            self.pad_history[0].0.elapsed().as_secs() < 2
    }

    /// 获取趋势方向
    pub fn trend(&self) -> EmotionTrend {
        if self.pad_history.len() < 3 {
            return EmotionTrend::Stable;
        }

        let recent = &self.pad_history[0].1;
        let older = &self.pad_history[2].1;

        let diff = recent.intensity() - older.intensity();

        if diff > 0.1 {
            EmotionTrend::Rising
        } else if diff < -0.1 {
            EmotionTrend::Falling
        } else {
            EmotionTrend::Stable
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub enum EmotionTrend {
    Rising,    // 情绪正在升温
    Stable,    // 情绪稳定
    Falling,   // 情绪正在消退
}
```

### 4.3 衰减参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `base_decay_rate` | 0.05 | 基础衰减率（每秒） |
| `sleep_multiplier` | 1.5 | 睡眠时衰减倍率 |
| `active_multiplier` | 1.2 | 活跃时段衰减倍率 |
| `anchoring_threshold` | 0.7 | 锚定情绪阈值 |
| `anchoring_decay_rate` | 0.3 | 锚定情绪衰减倍率 |

### 4.4 情绪特异性衰减率

| 情绪 | 衰减率 | 说明 |
|------|--------|------|
| 喜悦 | 1.2 | 快速消退 |
| 惊讶 | 1.3 | 很快消失 |
| 愤怒 | 0.8 | 较慢消退 |
| 悲伤 | 0.7 | 持续较久 |
| 恐惧 | 0.7 | 难以消散 |
| 焦虑 | 0.6 | 持续性强 |
| 内疚 | 0.5 | 最难消退 |

---

## 五、刺激处理

### 5.1 刺激分类

```rust
pub enum EmotionStimulus {
    // 用户交互类
    PositiveInteraction { intensity: f32 },    // 正面互动
    NegativeInteraction { intensity: f32 },     // 负面互动
    NeutralMessage { intensity: f32 },           // 中性消息

    // 系统事件类
    GoalAchieved { satisfaction: f32 },          // 目标达成
    GoalFailed { frustration: f32 },            // 目标失败
    Attention { value: f32 },                   // 被关注
    Loneliness { intensity: f32 },              // 孤独感

    // 环境类
    TimeOfDay { factor: f32 },                  // 时间影响
    SessionDuration { fatigue: f32 },          // 会话疲劳
}
```

### 5.2 PAD 影响映射

| 刺激类型 | P 影响 | A 影响 | D 影响 |
|----------|--------|--------|--------|
| PositiveInteraction | +0.3 | +0.2 | +0.1 |
| NegativeInteraction | -0.3 | +0.3 | -0.2 |
| GoalAchieved | +0.4 | +0.2 | +0.3 |
| GoalFailed | -0.3 | +0.2 | -0.3 |
| Attention | +0.2 | +0.3 | +0.1 |
| Loneliness | -0.2 | -0.1 | -0.2 |
| SessionDuration | 0.0 | -0.2 | -0.1 |

### 5.3 刺激整合

多刺激同时作用时，采用**加权平均**：

```rust
pub fn integrate_stimuli(&self, stimuli: Vec<(EmotionStimulus, f32)>) -> PADState {
    let mut total_p = 0.0;
    let mut total_a = 0.0;
    let mut total_d = 0.0;
    let mut total_weight = 0.0;

    for (stimulus, weight) in stimuli {
        let (p, a, d) = stimulus.to_pad();
        total_p += p * weight;
        total_a += a * weight;
        total_d += d * weight;
        total_weight += weight;
    }

    if total_weight > 0.0 {
        PADState {
            pleasure: total_p / total_weight,
            arousal: total_a / total_weight,
            dominance: total_d / total_weight,
        }
    } else {
        PADState::neutral()
    }
}
```

---

## 六、Rust 实现

### 6.1 核心结构

```rust:1:50:akiho-core/src/emotion/mod.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PADState {
    pub pleasure: f32,   // P: -1.0 ~ +1.0
    pub arousal: f32,   // A: -1.0 ~ +1.0
    pub dominance: f32,  // D: -1.0 ~ +1.0
}

impl PADState {
    pub fn neutral() -> Self {
        Self { pleasure: 0.0, arousal: 0.0, dominance: 0.0 }
    }

    pub fn distance(&self, other: &PADState) -> f32 {
        let dp = self.pleasure - other.pleasure;
        let da = self.arousal - other.arousal;
        let dd = self.dominance - other.dominance;
        (dp*dp + da*da + dd*dd).sqrt()
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum EmotionState {
    Neutral,
    Positive,
    Negative,
    Mixed,
    Apathetic,
}

pub struct EmotionEngine {
    current_state: PADState,
    previous_state: PADState,
    emotion_state: EmotionState,
    inertia: EmotionInertia,
    state_machine: EmotionStateMachine,
    history: Vec<EmotionSnapshot>,
}

impl EmotionEngine {
    pub fn new() -> Self {
        Self {
            current_state: PADState::neutral(),
            previous_state: PADState::neutral(),
            emotion_state: EmotionState::Neutral,
            inertia: EmotionInertia::default(),
            state_machine: EmotionStateMachine::new(),
            history: Vec::new(),
        }
    }

    pub fn process_stimulus(&mut self, stimulus: EmotionStimulus) {
        self.previous_state = self.current_state.clone();
        let target = self.calculate_target(&stimulus);
        self.current_state = self.inertia.update(&self.current_state, &target);
        self.emotion_state = self.state_machine.classify(&self.current_state);
        self.history.push(EmotionSnapshot {
            timestamp: std::time::Instant::now(),
            state: self.current_state.clone(),
            stimulus: stimulus.clone(),
        });
    }

    pub fn update(&mut self, delta_seconds: f32) {
        // 衰减当前情绪向中性回归
        self.current_state = self.inertia.apply_decay(&self.current_state, delta_seconds);
        self.emotion_state = self.state_machine.classify(&self.current_state);
    }

    pub fn get_state(&self) -> &PADState {
        &self.current_state
    }

    pub fn get_emotion_category(&self) -> EmotionState {
        self.emotion_state
    }
}
```

### 6.2 PAD 模型

```rust:1:80:akiho-core/src/emotion/pad.rs
use super::{PADState, EmotionState};

pub struct PADMapper;

impl PADMapper {
    pub const EMOTION_MAP: &'static [(EmotionCategory, f32, f32, f32)] = &[
        (EmotionCategory::Anger,      -0.51,  0.59,  0.25),
        (EmotionCategory::Fear,       -0.64,  0.60, -0.43),
        (EmotionCategory::Sadness,    -0.30, -0.20, -0.50),
        (EmotionCategory::Joy,         0.81,  0.46,  0.45),
        (EmotionCategory::Surprise,    0.40,  0.67, -0.13),
        (EmotionCategory::Disgust,    -0.60,  0.35,  0.30),
        (EmotionCategory::Submission,  -0.36, -0.19, -0.57),
        (EmotionCategory::Serenity,    0.57, -0.33,  0.25),
        (EmotionCategory::Boredom,    -0.32, -0.62, -0.12),
        (EmotionCategory::Anxiety,     -0.40,  0.62, -0.42),
    ];

    pub fn find_nearest(&self, pad: &PADState) -> EmotionCategory {
        let mut min_dist = f32::MAX;
        let mut nearest = EmotionCategory::Neutral;

        for (cat, p, a, d) in Self::EMOTION_MAP {
            let dist = ((pad.pleasure - p).powi(2)
                      + (pad.arousal - a).powi(2)
                      + (pad.dominance - d).powi(2)).sqrt();
            if dist < min_dist {
                min_dist = dist;
                nearest = *cat;
            }
        }
        nearest
    }

    pub fn intensity(&self, pad: &PADState) -> f32 {
        (pad.pleasure.powi(2) + pad.arousal.powi(2)).sqrt()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EmotionCategory {
    Neutral,
    Anger,
    Fear,
    Sadness,
    Joy,
    Surprise,
    Disgust,
    Submission,
    Serenity,
    Boredom,
    Anxiety,
}
```

### 6.3 状态机

```rust:1:60:akiho-core/src/emotion/state_machine.rs
use super::{PADState, EmotionState};

pub struct EmotionStateMachine;

impl EmotionStateMachine {
    pub fn classify(&self, pad: &PADState) -> EmotionState {
        let p = pad.pleasure;
        let a = pad.arousal;

        if p > 0.3 && a.abs() < 0.3 {
            EmotionState::Positive
        } else if p < -0.3 && a > 0.3 {
            EmotionState::Negative
        } else if p.abs() < 0.2 && a < -0.3 {
            EmotionState::Apathetic
        } else if p.abs() < 0.2 && a.abs() < 0.2 {
            EmotionState::Neutral
        } else {
            EmotionState::Mixed
        }
    }

    pub fn transition(&self, from: EmotionState, to: EmotionState) -> bool {
        match (from, to) {
            (EmotionState::Neutral, _) => true,
            (EmotionState::Apathetic, EmotionState::Neutral) => true,
            (EmotionState::Apathetic, EmotionState::Positive) => true,
            (EmotionState::Positive, EmotionState::Mixed) => true,
            (EmotionState::Negative, EmotionState::Mixed) => true,
            (EmotionState::Mixed, EmotionState::Positive) => true,
            (EmotionState::Mixed, EmotionState::Negative) => true,
            _ => false,
        }
    }
}
```

### 6.4 情绪惯性

```rust:1:45:akiho-core/src/emotion/inertia.rs
pub struct EmotionInertia {
    pub coefficient: f32,
    pub decay_rate: f32,
    pub min_threshold: f32,
}

impl Default for EmotionInertia {
    fn default() -> Self {
        Self {
            coefficient: 0.7,
            decay_rate: 0.05,
            min_threshold: 0.05,
        }
    }
}

impl EmotionInertia {
    pub fn update(&self, current: &PADState, target: &PADState) -> PADState {
        use super::PADState;

        let distance = current.distance(target);
        let strength = (distance * self.coefficient).min(1.0);
        let factor = 1.0 - strength * (1.0 - self.decay_rate);

        PADState {
            pleasure: current.pleasure + (target.pleasure - current.pleasure) * factor,
            arousal: current.arousal + (target.arousal - current.arousal) * factor,
            dominance: current.dominance + (target.dominance - current.dominance) * factor,
        }
    }

    pub fn apply_decay(&self, current: &PADState, delta_seconds: f32) -> PADState {
        use super::PADState;

        let decay = self.decay_rate * delta_seconds;
        let is_high_emotion = current.distance(&PADState::neutral()) > 0.7;
        let effective_decay = if is_high_emotion { decay * 0.5 } else { decay };

        PADState {
            pleasure: self.decay_value(current.pleasure, effective_decay),
            arousal: self.decay_value(current.arousal, effective_decay),
            dominance: self.decay_value(current.dominance, effective_decay),
        }
    }

    fn decay_value(&self, value: f32, decay: f32) -> f32 {
        let sign = value.signum();
        let abs = value.abs();
        let new_abs = (abs - decay).max(0.0);
        sign * new_abs.min(abs)
    }
}
```

---

## 七、Python 绑定

### 7.1 PyO3 接口

```rust:1:60:akiho-core/python/bindings.rs
use pyo3::prelude::*;
use crate::emotion::{self, PADState, EmotionEngine, EmotionCategory, EmotionStimulus};

#[pyclass]
pub struct PyEmotionEngine(emotion::EmotionEngine);

#[pymethods]
impl PyEmotionEngine {
    #[new]
    pub fn new() -> Self {
        Self(EmotionEngine::new())
    }

    pub fn get_pad(&self) -> (f32, f32, f32) {
        let s = self.0.get_state();
        (s.pleasure, s.arousal, s.dominance)
    }

    pub fn get_category(&self) -> String {
        format!("{:?}", self.0.get_emotion_category())
    }

    pub fn process(&mut self, stimulus_type: &str, intensity: f32) {
        let stimulus = match stimulus_type {
            "positive" => EmotionStimulus::PositiveInteraction { intensity },
            "negative" => EmotionStimulus::NegativeInteraction { intensity },
            "neutral" => EmotionStimulus::NeutralMessage { intensity },
            "achieved" => EmotionStimulus::GoalAchieved { satisfaction: intensity },
            "failed" => EmotionStimulus::GoalFailed { frustration: intensity },
            "attention" => EmotionStimulus::Attention { value: intensity },
            "lonely" => EmotionStimulus::Loneliness { intensity },
            _ => return,
        };
        self.0.process_stimulus(stimulus);
    }

    pub fn update(&mut self, delta_seconds: f32) {
        self.0.update(delta_seconds);
    }

    pub fn get_display_data(&self) -> HashMap<String, Py<PyAny>> {
        let mut map = HashMap::new();
        let pad = self.0.get_state();
        map.insert("pleasure".to_string(), to_py_any(pad.pleasure));
        map.insert("arousal".to_string(), to_py_any(pad.arousal));
        map.insert("dominance".to_string(), to_py_any(pad.dominance));
        map.insert("category".to_string(), to_py_any(format!("{:?}", self.0.get_emotion_category())));
        map
    }
}

fn to_py_any<T: ToPyObject>(value: T) -> Py<PyAny> {
    Python::with_gil(|py| value.to_object(py).into_ref(py).into())
}
```

---

## 八、集成到 API

### 8.1 情绪更新端点

```python
# api_server.py
from fastapi import APIRouter, WebSocket
from akiho_core import PyEmotionEngine

router = APIRouter()
emotion_engine = PyEmotionEngine()

@router.post("/emotion/update")
async def update_emotion(
    stimulus_type: str,
    intensity: float = 0.5
):
    emotion_engine.process(stimulus_type, intensity)
    return {"status": "ok"}

@router.get("/emotion/state")
async def get_emotion_state():
    return emotion_engine.get_display_data()

@router.websocket("/ws/emotion")
async def emotion_websocket(websocket: WebSocket):
    await websocket.accept()
    while True:
        emotion_engine.update(0.1)
        data = emotion_engine.get_display_data()
        await websocket.send_json(data)
        await asyncio.sleep(0.1)
```

---

## 九、性能指标

| 指标 | 目标 | 说明 |
|------|------|------|
| 响应延迟 | < 5ms | 单次刺激处理 |
| 更新频率 | 10 Hz | 实时衰减更新 |
| 内存占用 | < 1MB | 状态 + 历史 |
| 吞吐量 | > 10K/s | 并发处理能力 |

---

## 十、测试用例

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pad_neutral() {
        let pad = PADState::neutral();
        assert!(pad.pleasure.abs() < 0.01);
        assert!(pad.arousal.abs() < 0.01);
        assert!(pad.dominance.abs() < 0.01);
    }

    #[test]
    fn test_state_classification() {
        let sm = EmotionStateMachine;
        let positive = PADState { pleasure: 0.5, arousal: 0.0, dominance: 0.0 };
        assert_eq!(sm.classify(&positive), EmotionState::Positive);

        let negative = PADState { pleasure: -0.5, arousal: 0.5, dominance: 0.0 };
        assert_eq!(sm.classify(&negative), EmotionState::Negative);
    }

    #[test]
    fn test_inertia_decay() {
        let inertia = EmotionInertia::default();
        let high_joy = PADState { pleasure: 0.8, arousal: 0.5, dominance: 0.3 };
        let decayed = inertia.apply_decay(&high_joy, 1.0);
        assert!(decayed.pleasure < high_joy.pleasure);
    }
}
```
