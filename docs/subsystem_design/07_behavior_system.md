# 行为决策系统详细设计

> **对应设计文档章节**: 八（行为决策层）
> **优先级**: P0

---

## 一、设计目标

构建基于需求的分层行为决策引擎，支持：
- 行为注册与优先级管理
- 多目标冲突解决
- 行为选择算法
- 行为执行与反馈

---

## 二、行为分层架构

### 2.1 马斯洛需求层次

```
┌─────────────────────────────────────────────────────┐
│                    自我实现                            │
│              (Self-Actualization)                    │
│         创造力、问题解决、成长                         │
├─────────────────────────────────────────────────────┤
│                    尊重需求                            │
│                 (Esteem)                             │
│         成就、认可、自主性                            │
├─────────────────────────────────────────────────────┤
│                    归属需求                            │
│                (Love/Belonging)                      │
│           友谊、亲密、连接                            │
├─────────────────────────────────────────────────────┤
│                    安全需求                            │
│                  (Safety)                            │
│         安全、稳定、保护                              │
├─────────────────────────────────────────────────────┤
│                    生理需求                            │
│                (Physiological)                       │
│         能量、休息、健康、舒适                        │
└─────────────────────────────────────────────────────┘
```

### 2.2 行为分类

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum BehaviorCategory {
    Physiological = 1,   // 生理需求
    Safety = 2,          // 安全需求
    Belonging = 3,       // 归属需求
    Esteem = 4,          // 尊重需求
    SelfActualization = 5, // 自我实现
}

#[derive(Debug, Clone)]
pub struct Behavior {
    pub id: String,
    pub name: String,
    pub category: BehaviorCategory,
    pub priority: f32,           // 基础优先级
    pub activation_threshold: f32, // 激活阈值
    pub duration: Duration,        // 持续时间
    pub cooldown: Duration,        // 冷却时间
    pub effects: Vec<Effect>,     // 效果
    pub requirements: Vec<Requirement>, // 前置条件
}
```

### 2.3 行为库示例

| 行为 | 类别 | 优先级 | 激活条件 | 效果 |
|------|------|--------|----------|------|
| 休息 | 生理 | 0.9 | 能量 < 30% | 能量恢复 |
| 进食 | 生理 | 0.85 | 饥饿 > 50% | 饱食度增加 |
| 社交 | 归属 | 0.7 | 孤独 > 40% | 孤独感降低 |
| 表达情感 | 归属 | 0.6 | 情绪强度 > 0.6 | 情绪调节 |
| 学习 | 自我实现 | 0.5 | 能量 > 60% | 知识积累 |
| 创作 | 自我实现 | 0.55 | 能量 > 50%, 情绪正面 | 成就感 |
| 寻求关注 | 尊重 | 0.65 | 被忽视 > 30% | 关注度恢复 |
| 设定目标 | 尊重 | 0.5 | 空闲时间 > 5min | 目标达成 |

---

## 三、行为注册表

### 3.1 核心结构

```rust
pub struct BehaviorRegistry {
    behaviors: HashMap<String, Behavior>,
    active_behaviors: Vec<ActiveBehavior>,
    cooldowns: HashMap<String, Instant>,
}

impl BehaviorRegistry {
    pub fn register(&mut self, behavior: Behavior) {
        self.behaviors.insert(behavior.id.clone(), behavior);
    }

    pub fn get_available(&self, current_state: &SystemState) -> Vec<(&Behavior, f32)> {
        let now = Instant::now();
        self.behaviors
            .values()
            .filter(|b| {
                // 检查冷却
                self.cooldowns.get(&b.id)
                    .map(|t| now.duration_since(*t) > b.cooldown)
                    .unwrap_or(true)
            })
            .filter(|b| self.check_requirements(b, current_state))
            .map(|b| {
                let score = self.calculate_score(b, current_state);
                (b, score)
            })
            .filter(|(_, score)| *score >= 0.0)
            .collect()
    }

    fn check_requirements(&self, behavior: &Behavior, state: &SystemState) -> bool {
        behavior.requirements.iter().all(|req| {
            match req {
                Requirement::MinEnergy(e) => state.energy >= *e,
                Requirement::MinMood(m) => state.emotion.pleasure >= *m,
                Requirement::MaxFatigue(f) => state.fatigue <= *f,
                Requirement::MinTrust(t) => state.trust_level >= *t,
            }
        })
    }

    fn calculate_score(&self, behavior: &Behavior, state: &SystemState) -> f32 {
        let need_intensity = self.get_need_intensity(behavior.category, state);
        let base_score = behavior.priority * need_intensity;

        // 时间折扣：刚执行过的行为降低优先级
        let recency_factor = self.get_recency_factor(&behavior.id);
        let energy_cost = state.energy * 0.3;

        base_score * recency_factor - energy_cost
    }
}
```

### 3.2 行为执行跟踪

```rust
pub struct ActiveBehavior {
    pub behavior_id: String,
    pub started_at: Instant,
    pub duration: Duration,
    pub progress: f32,  // 0.0 ~ 1.0
    pub can_interrupt: bool,
}

impl ActiveBehavior {
    pub fn is_complete(&self) -> bool {
        self.progress >= 1.0
    }

    pub fn update(&mut self, delta: Duration) {
        let elapsed = delta.as_secs_f32();
        let total = self.duration.as_secs_f32();
        self.progress = (self.progress + elapsed / total).min(1.0);
    }

    pub fn can_be_interrupted(&self, by_priority: f32) -> bool {
        self.can_interrupt && self.progress < 0.5
    }
}
```

---

## 四、决策算法

### 4.1 多属性决策（MAUT）

```rust
pub struct BehaviorDecider {
    weights: BehaviorWeights,
}

#[derive(Debug, Clone)]
pub struct BehaviorWeights {
    pub need_match: f32,      // 需求匹配度
    pub energy_cost: f32,     // 能量消耗
    pub emotional_impact: f32, // 情绪影响
    pub social_benefit: f32,  // 社交收益
    pub learning_value: f32,  // 学习价值
}

impl BehaviorDecider {
    pub fn select(&self, candidates: Vec<(String, f32)>, context: &DecisionContext) -> Option<String> {
        let mut scored: Vec<_> = candidates
            .into_iter()
            .map(|(id, base_score)| {
                let score = self.calculate_final_score(&id, base_score, context);
                (id, score)
            })
            .collect();

        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        scored.into_iter().next().map(|(id, _)| id)
    }

    fn calculate_final_score(&self, id: &str, base_score: f32, ctx: &DecisionContext) -> f32 {
        let need_score = base_score * self.weights.need_match;

        let energy_penalty = ctx.current_energy * self.weights.energy_cost;

        let emotional_bonus = ctx.emotional_state.intensity() * self.weights.emotional_impact;

        let social_bonus = ctx.social_context.interaction_opportunity * self.weights.social_benefit;

        let learning_bonus = ctx.learning_opportunity * self.weights.learning_value;

        need_score - energy_penalty + emotional_bonus + social_bonus + learning_bonus
    }
}
```

### 4.2 冲突解决

```rust
pub struct ConflictResolver;

impl ConflictResolver {
    pub fn resolve(behaviors: Vec<ActiveBehavior>, new: &Behavior, priority: f32) -> ConflictResult {
        let mut to_interrupt = Vec::new();
        let mut to_queue = Vec::new();

        for active in &behaviors {
            if active.behavior_id == new.id {
                return ConflictResult::AlreadyActive;
            }

            if new.category > self.get_category(&active.behavior_id) {
                if active.can_be_interrupted(priority) {
                    to_interrupt.push(active.behavior_id.clone());
                } else {
                    to_queue.push(new.clone());
                    return ConflictResult::Queue { interrupt: to_interrupt, queue: to_queue };
                }
            }
        }

        ConflictResult::Execute { interrupt: to_interrupt }
    }
}

pub enum ConflictResult {
    AlreadyActive,
    Execute { interrupt: Vec<String> },
    Queue { interrupt: Vec<String>, queue: Vec<Behavior> },
    Reject { reason: String },
}
```

### 4.3 决策上下文

```rust
#[derive(Debug, Clone)]
pub struct DecisionContext {
    pub current_energy: f32,
    pub emotional_state: PADState,
    pub social_context: SocialContext,
    pub time_of_day: f32,
    pub session_duration: Duration,
    pub recent_behaviors: Vec<String>,
    pub learning_opportunity: f32,
}

impl DecisionContext {
    pub fn from_system_state(state: &SystemState, history: &BehaviorHistory) -> Self {
        Self {
            current_energy: state.energy,
            emotional_state: state.emotion.clone(),
            social_context: state.social.clone(),
            time_of_day: state.time_of_day,
            session_duration: state.session_duration,
            recent_behaviors: history.last_n(5),
            learning_opportunity: history.learning_value(),
        }
    }
}
```

---

## 五、执行循环

### 5.1 行为引擎主循环

```rust
pub struct BehaviorEngine {
    registry: BehaviorRegistry,
    decider: BehaviorDecider,
    conflict_resolver: ConflictResolver,
    active: Vec<ActiveBehavior>,
    effects_applier: EffectsApplier,
}

impl BehaviorEngine {
    pub fn tick(&mut self, state: &mut SystemState, delta: Duration) {
        // 1. 更新活跃行为
        self.update_active_behaviors(delta);

        // 2. 应用行为效果
        self.apply_active_effects(state);

        // 3. 检查是否可以开始新行为
        if self.can_start_new_behavior() {
            if let Some(behavior) = self.decide_next_behavior(state) {
                self.start_behavior(behavior, state);
            }
        }

        // 4. 处理已完成的行为
        self.finalize_completed_behaviors(state);
    }

    fn decide_next_behavior(&mut self, state: &SystemState) -> Option<Behavior> {
        let candidates = self.registry.get_available(state);

        if candidates.is_empty() {
            return None;
        }

        let context = DecisionContext::from_system_state(state, &self.history);

        self.decider
            .select(candidates, &context)
            .and_then(|id| self.registry.get(&id).cloned())
    }

    fn start_behavior(&mut self, behavior: Behavior, state: &mut SystemState) {
        let result = self.conflict_resolver.resolve(
            &self.active,
            &behavior,
            behavior.priority
        );

        match result {
            ConflictResult::Execute { interrupt } => {
                for id in interrupt {
                    self.interrupt_behavior(&id, state);
                }
                self.active.push(ActiveBehavior::new(&behavior));
                self.registry.start_cooldown(&behavior.id);
            }
            ConflictResult::Queue { .. } => {
                self.queue.push(behavior);
            }
            _ => {}
        }
    }

    fn apply_active_effects(&mut self, state: &mut SystemState) {
        for active in &self.active {
            if let Some(behavior) = self.registry.get(&active.behavior_id) {
                for effect in &behavior.effects {
                    self.effects_applier.apply(effect, active.progress, state);
                }
            }
        }
    }
}
```

### 5.2 效果应用器

```rust
pub struct EffectsApplier;

impl EffectsApplier {
    pub fn apply(&self, effect: &Effect, progress: f32, state: &mut SystemState) {
        match effect {
            Effect::RestoreEnergy(amount) => {
                state.energy = (state.energy + amount * progress).min(1.0);
            }
            Effect::ReduceEmotion(intensity, emotion_type) => {
                state.emotion.modulate(-intensity * progress, emotion_type);
            }
            Effect::EnhanceMood(amount) => {
                state.emotion.pleasure = (state.emotion.pleasure + amount * progress).min(1.0);
            }
            Effect::BuildTrust(target_id, amount) => {
                state.relationships.modify_trust(target_id, amount * progress);
            }
            Effect::GainKnowledge(topic, amount) => {
                state.memory.add_knowledge(topic, amount * progress);
            }
            Effect::TriggerExpression(expression_type) => {
                state.pending_expressions.push(expression_type.clone());
            }
        }
    }
}
```

---

## 六、Rust 实现

### 6.1 模块结构

```rust:1:50:akiho-core/src/behavior/mod.rs
mod registry;
mod decision;
mod conflict;
mod effects;

pub use registry::{BehaviorRegistry, Behavior, BehaviorCategory, Requirement};
pub use decision::{BehaviorDecider, DecisionContext, BehaviorWeights};
pub use conflict::{ConflictResolver, ConflictResult};
pub use effects::{EffectsApplier, Effect};

use crate::state::SystemState;
use std::time::{Duration, Instant};

pub struct BehaviorEngine {
    registry: BehaviorRegistry,
    decider: BehaviorDecider,
    conflict_resolver: ConflictResolver,
    active: Vec<ActiveBehavior>,
    queue: Vec<Behavior>,
    history: BehaviorHistory,
    effects_applier: EffectsApplier,
}

#[derive(Debug, Clone)]
pub struct ActiveBehavior {
    pub behavior_id: String,
    pub started_at: Instant,
    pub duration: Duration,
    pub progress: f32,
    pub can_interrupt: bool,
}

impl ActiveBehavior {
    pub fn new(behavior: &Behavior) -> Self {
        Self {
            behavior_id: behavior.id.clone(),
            started_at: Instant::now(),
            duration: behavior.duration,
            progress: 0.0,
            can_interrupt: behavior.requirements.is_empty(),
        }
    }
}

pub struct BehaviorHistory {
    entries: Vec<HistoryEntry>,
}

impl BehaviorHistory {
    pub fn record(&mut self, behavior_id: String, success: bool) {
        self.entries.push(HistoryEntry {
            behavior_id,
            timestamp: Instant::now(),
            success,
        });
    }

    pub fn last_n(&self, n: usize) -> Vec<String> {
        self.entries
            .iter()
            .rev()
            .take(n)
            .map(|e| e.behavior_id.clone())
            .collect()
    }

    pub fn learning_value(&self) -> f32 {
        let recent = self.entries.iter().rev().take(10);
        let successes = recent.filter(|e| e.success).count();
        successes as f32 / 10.0
    }
}

struct HistoryEntry {
    behavior_id: String,
    timestamp: Instant,
    success: bool,
}
```

### 6.2 行为注册表

```rust:1:80:akiho-core/src/behavior/registry.rs
use super::{Behavior, BehaviorCategory, Requirement};
use std::collections::HashMap;
use std::time::{Duration, Instant};

pub struct BehaviorRegistry {
    behaviors: HashMap<String, Behavior>,
    cooldowns: HashMap<String, Instant>,
}

impl BehaviorRegistry {
    pub fn new() -> Self {
        let mut registry = Self {
            behaviors: HashMap::new(),
            cooldowns: HashMap::new(),
        };
        registry.register_defaults();
        registry
    }

    fn register_defaults(&mut self) {
        self.register(Behavior {
            id: "rest".to_string(),
            name: "休息".to_string(),
            category: BehaviorCategory::Physiological,
            priority: 0.9,
            activation_threshold: 0.3,
            duration: Duration::from_secs(300),
            cooldown: Duration::from_secs(600),
            effects: vec![],
            requirements: vec![Requirement::MinEnergy(0.0)],
        });

        self.register(Behavior {
            id: "socialize".to_string(),
            name: "社交互动".to_string(),
            category: BehaviorCategory::Belonging,
            priority: 0.7,
            activation_threshold: 0.4,
            duration: Duration::from_secs(600),
            cooldown: Duration::from_secs(300),
            effects: vec![],
            requirements: vec![Requirement::MinEnergy(0.3)],
        });

        self.register(Behavior {
            id: "learn".to_string(),
            name: "学习".to_string(),
            category: BehaviorCategory::SelfActualization,
            priority: 0.5,
            activation_threshold: 0.0,
            duration: Duration::from_secs(900),
            cooldown: Duration::from_secs(1800),
            effects: vec![],
            requirements: vec![Requirement::MinEnergy(0.6)],
        });

        self.register(Behavior {
            id: "create".to_string(),
            name: "创作".to_string(),
            category: BehaviorCategory::SelfActualization,
            priority: 0.55,
            activation_threshold: 0.0,
            duration: Duration::from_secs(1200),
            cooldown: Duration::from_secs(3600),
            effects: vec![],
            requirements: vec![Requirement::MinEnergy(0.5)],
        });
    }

    pub fn register(&mut self, behavior: Behavior) {
        self.behaviors.insert(behavior.id.clone(), behavior);
    }

    pub fn get(&self, id: &str) -> Option<&Behavior> {
        self.behaviors.get(id)
    }

    pub fn start_cooldown(&mut self, id: &str) {
        self.cooldowns.insert(id.to_string(), Instant::now());
    }

    pub fn is_in_cooldown(&self, id: &str) -> bool {
        if let Some(start) = self.cooldowns.get(id) {
            if let Some(behavior) = self.behaviors.get(id) {
                return Instant::now().duration_since(*start) < behavior.cooldown;
            }
        }
        false
    }
}
```

---

## 七、集成到 API

### 7.1 行为控制端点

```python
# api_server.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/behavior/available")
async def get_available_behaviors():
    behaviors = behavior_engine.registry.get_available(current_state)
    return {"behaviors": behaviors}

@router.post("/behavior/trigger/{behavior_id}")
async def trigger_behavior(behavior_id: str):
    if let Some(behavior) = behavior_engine.registry.get(behavior_id) {
        behavior_engine.start_behavior(behavior, current_state)
        return {"status": "started", "behavior": behavior_id}
    }
    return {"status": "error", "message": "Behavior not found"}

@router.get("/behavior/active")
async def get_active_behaviors():
    return {"active": behavior_engine.active}

@router.post("/behavior/cancel/{behavior_id}")
async def cancel_behavior(behavior_id: str):
    behavior_engine.interrupt_behavior(behavior_id, current_state)
    return {"status": "cancelled"}
```

---

## 八、性能指标

| 指标 | 目标 | 说明 |
|------|------|------|
| 决策延迟 | < 10ms | 行为选择 |
| 并发行为 | 3 个 | 最大同时执行 |
| 行为库大小 | 50+ | 可扩展 |
| 冲突解决 | < 5ms | 冲突检测 |

---

## 九、欲望驱动决策（增强）

### 9.1 设计理念

**核心问题**：当前行为决策是基于规则的（if energy < 0.3 → 休息），缺乏真实的欲望驱动

```
规则触发（当前）：
  if energy < 0.3 → 触发休息行为 → LLM 生成"好累"

欲望驱动（增强后）：
  感到疲惫 → 产生"想休息"的欲望 → 权衡其他欲望 → 决定是否休息
                         ↑
                 这是真正的"想"，不是规则
```

### 9.2 欲望驱动决策结构

```rust
/// 欲望驱动决策器
pub struct DesireDrivenDecision {
    /// 当前活跃的欲望列表
    pub active_desires: Vec<Desire>,

    /// 欲望-行为映射
    pub desire_action_map: HashMap<DesireType, Vec<BehaviorId>>,

    /// 欲望冲突解决器
    pub conflict_resolver: DesireConflictResolver,
}

pub struct Desire {
    pub desire_type: DesireType,
    pub intensity: f32,        // 0.0 ~ 1.0
    pub threshold: f32,        // 触发阈值
    pub urgency: f32,          // 紧迫程度
    pub source: DesireSource,  // 欲望来源
}

pub enum DesireType {
    Rest,       // 休息
    Social,     // 社交
    Create,     // 创造
    Learn,      // 学习
    Connect,    // 连接
    Explore,    // 探索
    Achieve,    // 成就
}

pub enum DesireSource {
    Internal,   // 内部驱动（自发）
    External,   // 外部刺激（被动）
    Memory,    // 记忆触发
}
```

### 9.3 欲望驱动决策流程

```rust
impl DesireDrivenDecision {
    /// 欲望驱动的决策流程
    pub fn decide(&mut self, context: &Context) -> Decision {
        // 1. 激活所有相关欲望
        let activated = self.activate_desires(context);

        if activated.is_empty() {
            return Decision::ContinueCurrent;  // 没什么特别想做的
        }

        // 2. 欲望之间进行"谈判"
        let negotiation = self.negotiate_between_desires(&activated, context);

        // 3. 选择获胜的欲望
        if let Some(winner) = negotiation.winner {
            // 4. 转换为行为
            let behaviors = self.desire_action_map.get(&winner.desire_type);
            if let Some(behavior_id) = behaviors.and_then(|b| b.first()) {
                return Decision::ExecuteBehavior(behavior_id.clone());
            }
        }

        Decision::ContinueCurrent
    }

    /// 激活当前欲望
    fn activate_desires(&self, context: &Context) -> Vec<&Desire> {
        let mut activated = Vec::new();

        // 基于生理状态激活欲望
        if context.energy < 0.3 {
            activated.push(Desire {
                desire_type: DesireType::Rest,
                intensity: 1.0 - context.energy,
                threshold: 0.5,
                urgency: 0.8,
                source: DesireSource::Internal,
            });
        }

        // 基于社交需求激活欲望
        if context.loneliness > 0.6 {
            activated.push(Desire {
                desire_type: DesireType::Social,
                intensity: context.loneliness,
                threshold: 0.5,
                urgency: 0.6,
                source: DesireSource::Internal,
            });
        }

        // 基于好奇心激活欲望
        if context.novelty_detected {
            activated.push(Desire {
                desire_type: DesireType::Explore,
                intensity: context.curiosity_level,
                threshold: 0.4,
                urgency: 0.5,
                source: DesireSource::External,
            });
        }

        // 过滤低于阈值的欲望
        activated.into_iter()
            .filter(|d| d.intensity > d.threshold)
            .collect()
    }

    /// 欲望谈判：多个欲望同时存在时如何选择
    fn negotiate_between_desires(
        &self,
        desires: &[Desire],
        context: &Context
    ) -> NegotiationResult {
        let mut contenders: Vec<DesireContender> = desires.iter()
            .map(|d| DesireContender {
                desire: (*d).clone(),
                strength: self.calculate_strength(d, context),
                alignment_with_values: self.check_value_alignment(d),
                alignment_with_current_state: self.check_state_alignment(d, context),
            })
            .collect();

        // 价值观审查：价值观不支持的欲望强度降低
        for contender in &mut contenders {
            if contender.alignment_with_values < 0.3 {
                contender.strength *= 0.5;
            }
        }

        // 按强度排序
        contenders.sort_by(|a, b| b.strength.partial_cmp(&a.strength).unwrap());

        NegotiationResult {
            winner: contenders.first().cloned(),
            runner_ups: contenders.into_iter().skip(1).take(3).collect(),
            was_conflict: contenders.len() > 1,
        }
    }

    /// 计算欲望强度（考虑上下文）
    fn calculate_strength(&self, desire: &Desire, context: &Context) -> f32 {
        let base = desire.intensity;

        // 紧迫性加成
        let urgency_bonus = desire.urgency * 0.2;

        // 内部驱动的欲望略强
        let source_bonus = match desire.source {
            DesireSource::Internal => 0.1,
            _ => 0.0,
        };

        base + urgency_bonus + source_bonus
    }
}

pub struct DesireContender {
    pub desire: Desire,
    pub strength: f32,
    pub alignment_with_values: f32,
    pub alignment_with_current_state: f32,
}

pub struct NegotiationResult {
    pub winner: Option<DesireContender>,
    pub runner_ups: Vec<DesireContender>,
    pub was_conflict: bool,
}
```

### 9.4 与规则触发的对比

| 方面 | 规则触发 | 欲望驱动 |
|------|----------|----------|
| 决策依据 | 状态阈值 | 欲望强度 |
| 行为选择 | if-then 映射 | 欲望谈判 |
| 冲突处理 | 固定优先级 | 权衡协商 |
| 灵活性 | 低 | 高 |
| 拟真度 | 低 | 高 |

### 9.5 欲望驱动的优势

1. **真实性**：行为来自"想要"而非"必须"
2. **权衡能力**：能够权衡多个冲突的欲望
3. **上下文感知**：考虑价值观、当前状态
4. **渐进性**：欲望强度是连续值，而非二元判断
5. **可解释性**：决策过程清晰可见

---

## 十、测试用例

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_behavior_registry() {
        let registry = BehaviorRegistry::new();
        let rest = registry.get("rest").unwrap();
        assert_eq!(rest.category, BehaviorCategory::Physiological);
    }

    #[test]
    fn test_cooldown() {
        let mut registry = BehaviorRegistry::new();
        registry.start_cooldown("rest");
        assert!(registry.is_in_cooldown("rest"));
    }

    #[test]
    fn test_conflict_resolution() {
        let resolver = ConflictResolver;
        // 测试冲突解决逻辑
    }
}
```
