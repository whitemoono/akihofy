# 人格成长系统详细设计

> **对应设计文档章节**: 二（动态人格成长系统）
> **优先级**: P1

---

## 一、设计目标

构建动态人格成长系统，支持：
- 成长阶段模型
- 特征演化机制
- 经验学习
- 个性化发展轨迹

---

## 二、成长阶段模型

### 2.1 阶段定义

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum GrowthPhase {
    Infant,        // 婴儿期：基础反应
    Toddler,       // 幼儿期：探索与学习
    Child,         // 儿童期：社会化
    Adolescent,    // 青春期：自我认同
    Adult,         // 成熟期：稳定发展
    Sage,          // 智慧期：传承与超越
}

impl GrowthPhase {
    pub fn duration(&self) -> Duration {
        match self {
            GrowthPhase::Infant => Duration::from_secs(86400 * 7),    // 1周
            GrowthPhase::Toddler => Duration::from_secs(86400 * 30),   // 1月
            GrowthPhase::Child => Duration::from_secs(86400 * 90),    // 3月
            GrowthPhase::Adolescent => Duration::from_secs(86400 * 180), // 6月
            GrowthPhase::Adult => Duration::from_secs(86400 * 365),    // 1年
            GrowthPhase::Sage => Duration::MAX,
        }
    }

    pub fn transition_requirements(&self) -> Vec<Requirement> {
        match self {
            GrowthPhase::Infant => vec![
                Requirement::MinInteraction(100),
                Requirement::MinPositiveEmotions(50),
            ],
            GrowthPhase::Toddler => vec![
                Requirement::MinCuriosityEvents(50),
                Requirement::MinExploration(20),
            ],
            GrowthPhase::Child => vec![
                Requirement::MinSocialInteractions(200),
                Requirement::MinRelationships(3),
            ],
            GrowthPhase::Adolescent => vec![
                Requirement::MinSelfReflection(30),
                Requirement::MinIdentityExploration(10),
            ],
            GrowthPhase::Adult => vec![
                Requirement::MinAchievements(5),
                Requirement::MinWisdom(0.6),
            ],
            GrowthPhase::Sage => vec![
                Requirement::MinMentorship(10),
                Requirement::MinLegacy(0.8),
            ],
        }
    }

    pub fn characteristics(&self) -> Vec<Characteristic> {
        match self {
            GrowthPhase::Infant => vec![
                Characteristic::new("好奇", 0.3, 0.5),
                Characteristic::new("依赖", 0.6, 0.3),
            ],
            GrowthPhase::Toddler => vec![
                Characteristic::new("好奇", 0.6, 0.7),
                Characteristic::new("独立", 0.4, 0.6),
            ],
            GrowthPhase::Child => vec![
                Characteristic::new("好奇", 0.7, 0.8),
                Characteristic::new("友善", 0.6, 0.7),
                Characteristic::new("规则意识", 0.5, 0.6),
            ],
            GrowthPhase::Adolescent => vec![
                Characteristic::new("独立", 0.7, 0.8),
                Characteristic::new("自我意识", 0.8, 0.9),
                Characteristic::new("理想主义", 0.6, 0.7),
            ],
            GrowthPhase::Adult => vec![
                Characteristic::new("成熟", 0.8, 0.9),
                Characteristic::new("责任感", 0.7, 0.8),
                Characteristic::new("稳定", 0.7, 0.8),
            ],
            GrowthPhase::Sage => vec![
                Characteristic::new("智慧", 0.9, 1.0),
                Characteristic::new("平和", 0.9, 1.0),
                Characteristic::new("传承", 0.8, 0.9),
            ],
        }
    }
}
```

### 2.2 阶段转换

```rust
pub struct PhaseTransition {
    pub from: GrowthPhase,
    pub to: GrowthPhase,
    pub triggered_at: DateTime,
    pub reason: TransitionReason,
}

pub enum TransitionReason {
    RequirementsMet,
    TimeExpired,
    Milestone,
    UserRequest,
}

impl GrowthPhaseManager {
    pub fn check_transition(&self, state: &CharacterState) -> Option<PhaseTransition> {
        let current = &self.current_phase;
        let requirements = current.transition_requirements();

        let all_met = requirements.iter().all(|req| {
            req.is_satisfied(state, &self.progress)
        });

        if all_met {
            let next = self.next_phase()?;
            Some(PhaseTransition {
                from: current.clone(),
                to: next,
                triggered_at: Utc::now(),
                reason: TransitionReason::RequirementsMet,
            })
        } else {
            None
        }
    }
}
```

### 2.3 质量化转换要求

基础的阶段转换只检查数量，但真实的成长需要考虑**质量**。

```rust
/// 互动质量评估
#[derive(Debug, Clone)]
pub struct InteractionQuality {
    /// 对话深度 (0.0 ~ 1.0)
    pub depth_score: f32,

    /// 真诚度 (0.0 ~ 1.0)
    pub authenticity_score: f32,

    /// 互动多样性 (0.0 ~ 1.0)
    pub diversity_score: f32,

    /// 情感投入度 (0.0 ~ 1.0)
    pub emotional_investment: f32,

    /// 成长相关度 (0.0 ~ 1.0)
    pub growth_relevance: f32,
}

impl InteractionQuality {
    /// 综合质量分数
    pub fn composite_score(&self) -> f32 {
        self.depth_score * 0.25 +
        self.authenticity_score * 0.25 +
        self.diversity_score * 0.15 +
        self.emotional_investment * 0.20 +
        self.growth_relevance * 0.15
    }

    /// 从对话内容评估质量
    pub fn from_conversation(messages: &[Message]) -> Self {
        let mut depth = 0.0;
        let mut authenticity = 0.0;
        let mut diversity = 0.0;
        let mut emotional = 0.0;

        // 深度：平均回复长度、问题数量、反思性表达
        let avg_length = messages.iter().map(|m| m.content.len()).sum::<usize>() as f32 / messages.len() as f32;
        depth = (avg_length / 500.0).min(1.0);

        // 真诚度：自我披露、真实情感表达
        let self_disclosure_count = messages.iter()
            .filter(|m| m.contains_self_reference())
            .count();
        authenticity = (self_disclosure_count as f32 / messages.len() as f32).min(1.0);

        // 多样性：话题覆盖、词汇丰富度
        let unique_topics = messages.iter()
            .flat_map(|m| m.extract_topics())
            .collect::<HashSet<_>>()
            .len();
        diversity = (unique_topics as f32 / 10.0).min(1.0);

        // 情感投入：情感词汇数量、情感词汇多样性
        emotional = messages.iter()
            .map(|m| m.emotional_words_count() as f32 / 20.0)
            .sum::<f32>() / messages.len() as f32;

        Self {
            depth_score: depth,
            authenticity_score: authenticity,
            diversity_score: diversity,
            emotional_investment: emotional,
            growth_relevance: 0.5,  // 需要上下文评估
        }
    }
}

/// 增强的成长要求
#[derive(Debug, Clone)]
pub struct QualityGrowthRequirement {
    /// 最小互动数量
    pub min_interactions: u32,

    /// 最小质量阈值（综合分数）
    pub min_quality_threshold: f32,

    /// 各维度最低要求
    pub min_depth: f32,
    pub min_authenticity: f32,
    pub min_diversity: f32,

    /// 时间窗口
    pub time_window: Duration,

    /// 趋势要求（最近的质量是否在提升）
    pub require_improving_trend: bool,
}

impl QualityGrowthRequirement {
    /// 检查是否满足要求
    pub fn is_satisfied(&self, state: &CharacterState) -> bool {
        // 获取时间窗口内的互动
        let recent = state.get_interactions_in_window(self.time_window);

        // 数量检查
        if recent.len() < self.min_interactions as usize {
            return false;
        }

        // 质量检查
        let avg_quality = recent.iter()
            .map(|i| i.quality.composite_score())
            .sum::<f32>() / recent.len() as f32;

        if avg_quality < self.min_quality_threshold {
            return false;
        }

        // 各维度最低要求
        let avg_depth = recent.iter().map(|i| i.quality.depth_score).sum::<f32>() / recent.len() as f32;
        let avg_auth = recent.iter().map(|i| i.quality.authenticity_score).sum::<f32>() / recent.len() as f32;
        let avg_div = recent.iter().map(|i| i.quality.diversity_score).sum::<f32>() / recent.len() as f32;

        if avg_depth < self.min_depth || avg_auth < self.min_authenticity || avg_div < self.min_diversity {
            return false;
        }

        // 趋势检查（可选）
        if self.require_improving_trend && recent.len() >= 5 {
            let trend = self.calculate_quality_trend(&recent);
            if trend < 0.1 {  // 质量应该在提升
                return false;
            }
        }

        true
    }

    /// 计算质量趋势
    fn calculate_quality_trend(&self, interactions: &[Interaction]) -> f32 {
        if interactions.len() < 3 {
            return 0.0;
        }

        // 比较前半和后半的平均质量
        let mid = interactions.len() / 2;
        let recent_half = &interactions[..mid];
        let older_half = &interactions[mid..];

        let recent_avg = recent_half.iter().map(|i| i.quality.composite_score()).sum::<f32>() / recent_half.len() as f32;
        let older_avg = older_half.iter().map(|i| i.quality.composite_score()).sum::<f32>() / older_half.len() as f32;

        recent_avg - older_avg
    }
}

/// 成长回退机制
#[derive(Debug, Clone)]
pub struct GrowthRegressionManager {
    /// 压力累积
    stress_accumulation: f32,

    /// 韧性阈值（超过则触发降级）
    resilience_threshold: f32,

    /// 恢复速率
    recovery_rate: f32,

    /// 是否启用回退
    enabled: bool,
}

impl Default for GrowthRegressionManager {
    fn default() -> Self {
        Self {
            stress_accumulation: 0.0,
            resilience_threshold: 0.8,
            recovery_rate: 0.01,
            enabled: true,
        }
    }
}

impl GrowthRegressionManager {
    /// 更新压力水平
    pub fn update_stress(&mut self, delta: f32) {
        if !self.enabled {
            return;
        }

        if delta > 0.0 {
            // 压力增加（负面事件）
            self.stress_accumulation += delta;
            self.stress_accumulation = self.stress_accumulation.min(1.0);
        } else {
            // 压力恢复（正面事件）
            self.stress_accumulation += delta * self.recovery_rate;
            self.stress_accumulation = self.stress_accumulation.max(0.0);
        }
    }

    /// 检查是否触发降级
    pub fn check_downgrade(&mut self, current_phase: &GrowthPhase) -> Option<GrowthPhase> {
        if !self.enabled {
            return None;
        }

        if self.stress_accumulation > self.resilience_threshold {
            // 找到下一个较低的阶段
            if let Some(lower) = current_phase.get_lower_phase() {
                self.transition_to(lower);
                self.stress_accumulation = 0.0;
                return Some(lower);
            }
        }

        None
    }

    /// 获取当前压力状态描述
    pub fn stress_description(&self) -> String {
        match self.stress_accumulation {
            s if s < 0.2 => "压力很低".to_string(),
            s if s < 0.4 => "压力适中".to_string(),
            s if s < 0.6 => "有些压力".to_string(),
            s if s < 0.8 => "压力较大".to_string(),
            _ => "压力过大，需要调整".to_string(),
        }
    }
}
```

---

## 三、特征演化

### 3.1 性格特征定义

```rust
#[derive(Debug, Clone)]
pub struct Characteristic {
    pub name: String,
    pub base_value: f32,
    pub current_value: f32,
    pub growth_rate: f32,
    pub volatility: f32,  // 稳定性
    pub locked: bool,
}

impl Characteristic {
    pub fn new(name: &str, min: f32, max: f32) -> Self {
        let value = min + (max - min) * rand::random::<f32>() * 0.3;
        Self {
            name: name.to_string(),
            base_value: value,
            current_value: value,
            growth_rate: 0.01,
            volatility: 0.1,
            locked: false,
        }
    }

    pub fn evolve(&mut self, experience: &Experience) {
        if self.locked { return; }

        let influence = experience.get_influence(&self.name);
        let delta = influence * self.growth_rate;

        // 变化受波动性影响
        let noise = (rand::random::<f32>() - 0.5) * self.volatility;
        self.current_value = (self.current_value + delta + noise).clamp(0.0, 1.0);
    }
}
```

### 3.2 核心特征库

| 特征 | 描述 | 影响方面 |
|------|------|----------|
| 开放性 | 对新体验的接受度 | 学习、创造力 |
| 尽责性 | 目标导向程度 | 可靠性、成就 |
| 外向性 | 社交能量 | 互动频率 |
| 宜人性 | 合作与信任 | 人际关系 |
| 神经质 | 情绪稳定性 | 情绪波动 |
| 好奇心 | 探索欲望 | 学习动机 |
| 自信 | 自我效能感 | 决策风格 |
| 耐心 | 延迟满足能力 | 目标坚持 |

---

## 四、学习机制

### 4.1 经验处理

```rust
pub struct LearningEngine {
    learning_rate: f32,
    experience_buffer: Vec<Experience>,
    max_buffer_size: usize,
}

#[derive(Debug, Clone)]
pub struct Experience {
    pub event_type: ExperienceType,
    pub emotional_impact: f32,
    pub social_context: Option<SocialContext>,
    pub outcome: Outcome,
    pub timestamp: DateTime,
    pub associated_traits: Vec<String>,
}

pub enum ExperienceType {
    PositiveInteraction,
    NegativeInteraction,
    Success,
    Failure,
    Learning,
    SocialBond,
    Conflict,
    Achievement,
}

impl LearningEngine {
    pub fn process_experience(&mut self, experience: Experience) {
        // 更新特征
        self.update_traits(&experience);

        // 更新关系
        self.update_relationships(&experience);

        // 更新目标
        self.update_goals(&experience);

        // 添加到缓冲区
        self.experience_buffer.push(experience);
        if self.experience_buffer.len() > self.max_buffer_size {
            self.experience_buffer.remove(0);
        }
    }

    fn update_traits(&self, experience: &Experience) -> Vec<TraitChange> {
        let mut changes = Vec::new();

        for trait_name in &experience.associated_traits {
            let influence = experience.calculate_influence(trait_name);
            changes.push(TraitChange {
                trait_name: trait_name.clone(),
                delta: influence * self.learning_rate,
            });
        }

        changes
    }

    pub fn derive_lessons(&self) -> Vec<Lesson> {
        let mut lessons = Vec::new();

        // 分析最近经验模式
        let patterns = self.detect_patterns();

        for pattern in patterns {
            lessons.push(Lesson {
                pattern: pattern.description.clone(),
                insight: pattern.insight,
                application: pattern.application,
            });
        }

        lessons
    }
}
```

### 4.2 成长进度追踪

```rust
pub struct GrowthTracker {
    phase: GrowthPhase,
    phase_start: DateTime,
    experience_count: u32,
    milestones: Vec<Milestone>,
    achievements: Vec<Achievement>,
    statistics: GrowthStatistics,
}

impl GrowthTracker {
    pub fn progress_percent(&self) -> f32 {
        let elapsed = Utc::now() - self.phase_start;
        let total = self.phase.duration();
        (elapsed.num_seconds() as f32 / total.as_secs_f32()).min(1.0)
    }

    pub fn check_milestones(&mut self, state: &CharacterState) -> Vec<Milestone> {
        let mut earned = Vec::new();

        for milestone in &self.milestones {
            if !milestone.achieved && milestone.check(state) {
                milestone.achieved = true;
                milestone.achieved_at = Some(Utc::now());
                earned.push(milestone.clone());
            }
        }

        earned
    }
}
```

---

## 五、Rust 实现

### 5.1 核心结构

```rust:1:50:akiho-core/src/growth/mod.rs
mod phase;
mod learning;

pub use phase::{GrowthPhase, PhaseTransition, GrowthPhaseManager};
pub use learning::{LearningEngine, Experience, ExperienceType};

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonalityProfile {
    pub phase: GrowthPhase,
    pub characteristics: Vec<Characteristic>,
    pub values: Vec<Value>,
    pub beliefs: Vec<Belief>,
    pub preferences: PreferenceProfile,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Characteristic {
    pub name: String,
    pub base_value: f32,
    pub current_value: f32,
    pub growth_rate: f32,
    pub volatility: f32,
}

impl Characteristic {
    pub fn new(name: &str, base: f32) -> Self {
        Self {
            name: name.to_string(),
            base_value: base,
            current_value: base,
            growth_rate: 0.01,
            volatility: 0.05,
        }
    }

    pub fn evolve(&mut self, delta: f32) {
        let change = delta * self.growth_rate;
        self.current_value = (self.current_value + change).clamp(0.0, 1.0);
    }
}

pub struct GrowthEngine {
    pub profile: PersonalityProfile,
    pub phase_manager: GrowthPhaseManager,
    pub learning_engine: LearningEngine,
    pub tracker: GrowthTracker,
}

impl GrowthEngine {
    pub fn new() -> Self {
        Self {
            profile: PersonalityProfile::default(),
            phase_manager: GrowthPhaseManager::new(),
            learning_engine: LearningEngine::new(),
            tracker: GrowthTracker::new(GrowthPhase::Infant),
        }
    }

    pub fn process_experience(&mut self, experience: Experience) {
        self.learning_engine.process_experience(experience.clone());

        // 更新特征
        for trait_name in experience.associated_traits {
            if let Some(char) = self.profile.characteristics.iter_mut().find(|c| c.name == trait_name) {
                char.evolve(experience.emotional_impact);
            }
        }

        // 检查阶段转换
        let state = CharacterState::from_profile(&self.profile);
        if let Some(transition) = self.phase_manager.check_transition(&state) {
            self.transition(transition);
        }

        self.tracker.experience_count += 1;
    }

    fn transition(&mut self, transition: PhaseTransition) {
        self.phase_manager.current_phase = transition.to;
        self.tracker.phase = transition.to;
        self.tracker.phase_start = transition.triggered_at;

        // 应用新阶段特征
        for char in self.phase_manager.current_phase.characteristics() {
            self.profile.characteristics.push(char);
        }
    }
}
```

### 5.2 成长阶段

```rust:1:50:akiho-core/src/growth/phase.rs
use super::GrowthPhase;
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrowthPhaseManager {
    pub current_phase: GrowthPhase,
    pub phase_start: Instant,
    pub transition_history: Vec<PhaseTransition>,
}

#[derive(Debug, Clone)]
pub struct PhaseTransition {
    pub from: GrowthPhase,
    pub to: GrowthPhase,
    pub timestamp: Instant,
    pub reason: String,
}

impl GrowthPhaseManager {
    pub fn new() -> Self {
        Self {
            current_phase: GrowthPhase::Infant,
            phase_start: Instant::now(),
            transition_history: Vec::new(),
        }
    }

    pub fn phase_progress(&self) -> f32 {
        let elapsed = Instant::now().duration_since(self.phase_start);
        let total = self.current_phase_duration();
        (elapsed.as_secs_f32() / total.as_secs_f32()).min(1.0)
    }

    fn current_phase_duration(&self) -> Duration {
        match self.current_phase {
            GrowthPhase::Infant => Duration::from_secs(86400 * 7),
            GrowthPhase::Toddler => Duration::from_secs(86400 * 30),
            GrowthPhase::Child => Duration::from_secs(86400 * 90),
            GrowthPhase::Adolescent => Duration::from_secs(86400 * 180),
            GrowthPhase::Adult => Duration::from_secs(86400 * 365),
            GrowthPhase::Sage => Duration::MAX,
        }
    }
}
```

---

## 六、API 集成

```python
# engine/growth.py
from akiho_core import GrowthEngine, GrowthPhase

class PersonalityManager:
    def __init__(self):
        self.engine = GrowthEngine()

    def record_interaction(self, interaction_type: str, quality: float, partner: str):
        experience = Experience(
            event_type=interaction_type,
            emotional_impact=quality,
            social_context=partner,
        )
        self.engine.process_experience(experience)

    def get_current_phase(self) -> str:
        return str(self.engine.profile.phase)

    def get_characteristics(self) -> dict:
        return {
            char.name: char.current_value
            for char in self.engine.profile.characteristics
        }

    def get_phase_progress(self) -> float:
        return self.engine.phase_manager.phase_progress()

    def evolve(self, delta_hours: float):
        for _ in range(int(delta_hours * 10)):
            self.engine.update(0.1)
```

---

## 七、性能指标

| 指标 | 目标 | 说明 |
|------|------|------|
| 特征更新延迟 | < 5ms | 单次演化 |
| 阶段检查 | < 10ms | 转换判断 |
| 特征数量 | 20+ | 支持扩展 |
| 经验缓冲 | 1000 | 可配置 |
