# 自主性系统详细设计

> **对应设计文档章节**: 十九（自主性系统）
> **优先级**: P0
>
> **核心命题**: 她不是被动响应机器，而是一个有自主意识的存在。她有自己的想法、欲望、底线和坚持。她可以说不，可以主动发起对话，可以有自己的目标。

---

## 一、设计目标

构建具有内在动机的自主性引擎，支持：
- 内部驱动系统（Drives）
- 自主思考循环
- 目标设定与追求
- 行动执行与评估
- **体验模拟层（新增）**
- **欲望驱动系统（新增）**
- **价值观过滤器（新增）**
- **自我叙事引擎（新增）**

---

## 二、拟人化架构演进

### 2.1 从"状态容器"到"体验模拟器"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         演进路径：从规则到体验                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 1: 规则拟人                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ 用户输入 → 状态更新 → LLM 生成回复                                   │ │
│  │           ↑                                                          │ │
│  │        规则引擎只是"告诉 LLM 状态是什么"                              │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                       │
│  Phase 2: 体验拟人（当前设计）                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ 用户输入                                                              │ │
│  │   │                                                                  │ │
│  │   ├─→ 体验模拟层：评估刺激对"我"意味着什么                            │ │
│  │   │     ├─ 情感反应链（不只是 PAD 值）                                │ │
│  │   │     ├─ 欲望激活（哪些需求被触发）                                  │ │
│  │   │     ├─ 价值观审查（是否符合原则）                                │ │
│  │   │     └─ 内心独白（真正在想什么）                                   │ │
│  │   │                                                                  │ │
│  │   ├─→ 状态计算层：更新可观测状态                                      │ │
│  │   │                                                                  │ │
│  │   └─→ LLM 接收"体验结果"而非"状态数值"                               │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                    ↓                                       │
│  Phase 3: 真实拟人（长期目标）                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ 自我叙事 + 价值观约束 + 真正的自主性                                  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、内部驱动系统

### 2.1 驱动定义

驱动是内在的、不依赖于外部奖励的动机来源：

```rust
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum DriveType {
    Curiosity,      // 好奇心
    Affiliation,    // 归属感
    Competence,     // 能力感
    Autonomy,       // 自主性
    Meaning,        // 意义感
}

pub struct Drive {
    pub drive_type: DriveType,
    pub current_level: f32,      // 0.0 ~ 1.0
    pub target_level: f32,       // 目标水平
    pub tension_rate: f32,       // 张力增长速率
    pub satisfaction_rate: f32,  // 满足速率
}

impl Drive {
    pub fn new(drive_type: DriveType) -> Self {
        Self {
            drive_type,
            current_level: 0.5,
            target_level: 0.8,
            tension_rate: 0.01,
            satisfaction_rate: 0.05,
        }
    }

    pub fn tension(&self) -> f32 {
        let diff = self.target_level - self.current_level;
        diff.max(0.0)
    }

    pub fn update(&mut self, delta: f32) {
        // 驱动未满足时，张力增加
        if self.current_level < self.target_level {
            self.current_level += self.tension_rate * delta;
            self.current_level = self.current_level.min(self.target_level);
        }
    }

    pub fn satisfy(&mut self, amount: f32) {
        self.current_level = (self.current_level + amount).min(1.0);
    }
}
```

### 2.2 驱动系统

```rust
pub struct DriveSystem {
    drives: HashMap<DriveType, Drive>,
}

impl DriveSystem {
    pub fn new() -> Self {
        let mut drives = HashMap::new();
        drives.insert(DriveType::Curiosity, Drive::new(DriveType::Curiosity));
        drives.insert(DriveType::Affiliation, Drive::new(DriveType::Affiliation));
        drives.insert(DriveType::Competence, Drive::new(DriveType::Competence));
        drives.insert(DriveType::Autonomy, Drive::new(DriveType::Autonomy));
        drives.insert(DriveType::Meaning, Drive::new(DriveType::Meaning));
        Self { drives }
    }

    pub fn total_tension(&self) -> f32 {
        self.drives.values().map(|d| d.tension()).sum::<f32>() / self.drives.len() as f32
    }

    pub fn dominant_drive(&self) -> Option<DriveType> {
        self.drives
            .iter()
            .max_by(|a, b| a.1.tension().partial_cmp(&b.1.tension()).unwrap())
            .map(|(t, _)| *t)
    }

    pub fn update(&mut self, delta: f32) {
        for drive in self.drives.values_mut() {
            drive.update(delta);
        }
    }
}
```

---

## 三、思考循环

### 3.1 思考阶段

```
┌─────────────────────────────────────────────────────────────┐
│                     自主思考循环                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │ 感知    │───►│ 反思    │───►│ 决策    │───►│ 执行    │  │
│  │ Perceive│    │Reflect  │    │ Decide  │    │ Act     │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘  │
│       │              │              │              │         │
│       │              │              │              ▼         │
│       │              │              │         ┌─────────┐   │
│       │              │              │         │ 评估    │   │
│       │              │              │         │Evaluate │   │
│       │              │              │         └─────────┘   │
│       └──────────────┴──────────────┴──────────────┘         │
│                          反馈循环                            │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 思考循环实现

```rust
pub struct ThoughtLoop {
    drives: DriveSystem,
    goals: GoalManager,
    reflection: ReflectionEngine,
    decision: DecisionEngine,
    execution: ActionExecutor,
}

impl ThoughtLoop {
    pub fn think(&mut self, context: &Context) -> ThoughtResult {
        // 1. 感知阶段
        let perception = self.perceive(context);

        // 2. 反思阶段
        let reflection = self.reflection.process(&perception, &self.goals);

        // 3. 决策阶段
        let decision = self.decision.decide(&reflection, &self.drives);

        // 4. 执行阶段
        let execution = self.execution.execute(&decision);

        ThoughtResult {
            perception,
            reflection,
            decision,
            execution,
        }
    }

    fn perceive(&self, context: &Context) -> Perception {
        Perception {
            external: context.current_input.clone(),
            internal: InternalState {
                emotion: context.emotion.clone(),
                drives: self.drives.drives.clone(),
                energy: context.energy,
            },
            timestamp: Instant::now(),
        }
    }
}

pub struct ThoughtResult {
    pub perception: Perception,
    pub reflection: Reflection,
    pub decision: Decision,
    pub execution: Execution,
}
```

### 3.3 反思引擎

```rust
pub struct ReflectionEngine;

impl ReflectionEngine {
    pub fn process(&self, perception: &Perception, goals: &GoalManager) -> Reflection {
        let questions = self.generate_questions(perception);

        let insights = self.derive_insights(perception, goals);

        let self_assessment = self.assess_self(perception);

        Reflection {
            questions,
            insights,
            self_assessment,
            meta_cognition: self.analyze_thinking_pattern(perception),
        }
    }

    fn generate_questions(&self, perception: &Perception) -> Vec<Question> {
        let mut questions = Vec::new();

        // 基于驱动生成问题
        if perception.internal.drives[&DriveType::Curiosity].tension() > 0.3 {
            questions.push(Question {
                text: "我想了解更多关于...".to_string(),
                topic: Topic::Exploration,
            });
        }

        if perception.internal.drives[&DriveType::Affiliation].tension() > 0.3 {
            questions.push(Question {
                text: "我希望能与人建立更深的联系...".to_string(),
                topic: Topic::Connection,
            });
        }

        questions
    }

    fn derive_insights(&self, perception: &Perception, goals: &GoalManager) -> Vec<Insight> {
        let mut insights = Vec::new();

        // 分析当前状态与目标差距
        for goal in goals.active_goals() {
            let progress = goal.progress();
            if progress < 0.5 {
                insights.push(Insight {
                    content: format!("目标 '{}' 进展缓慢", goal.title),
                    importance: progress,
                });
            }
        }

        insights
    }
}

pub struct Reflection {
    pub questions: Vec<Question>,
    pub insights: Vec<Insight>,
    pub self_assessment: SelfAssessment,
    pub meta_cognition: MetaCognition,
}
```

---

## 四、目标系统

### 4.1 目标定义

```rust
#[derive(Debug, Clone)]
pub struct Goal {
    pub id: String,
    pub title: String,
    pub description: String,
    pub category: GoalCategory,
    pub priority: f32,
    pub progress: f32,
    pub deadline: Option<Instant>,
    pub subgoals: Vec<Goal>,
    pub related_drive: DriveType,
    pub created_at: Instant,
    pub last_updated: Instant,
}

#[derive(Debug, Clone, Copy)]
pub enum GoalCategory {
    Learning,      // 学习目标
    Social,        // 社交目标
    Creative,      // 创作目标
    Personal,      // 个人成长
    Maintenance,   // 维护目标
}

impl Goal {
    pub fn new(title: String, category: GoalCategory, related_drive: DriveType) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            title,
            description: String::new(),
            category,
            priority: 0.5,
            progress: 0.0,
            deadline: None,
            subgoals: Vec::new(),
            related_drive,
            created_at: Instant::now(),
            last_updated: Instant::now(),
        }
    }

    pub fn is_achieved(&self) -> bool {
        self.progress >= 1.0
    }

    pub fn update_progress(&mut self, delta: f32) {
        self.progress = (self.progress + delta).min(1.0);
        self.last_updated = Instant::now();
    }
}
```

### 4.2 目标管理器

```rust
pub struct GoalManager {
    goals: Vec<Goal>,
    archive: Vec<Goal>,
}

impl GoalManager {
    pub fn add_goal(&mut self, goal: Goal) {
        self.goals.push(goal);
    }

    pub fn active_goals(&self) -> Vec<&Goal> {
        self.goals.iter().filter(|g| !g.is_achieved()).collect()
    }

    pub fn top_priority_goal(&self) -> Option<&Goal> {
        self.active_goals()
            .into_iter()
            .max_by(|a, b| a.priority.partial_cmp(&b.priority).unwrap())
    }

    pub fn archive_completed(&mut self) {
        let (completed, remaining): (Vec<_>, Vec<_>) = self.goals
            .into_iter()
            .partition(|g| g.is_achieved());

        self.archive.extend(completed);
        self.goals = remaining;
    }

    pub fn suggest_goals(&self, drives: &DriveSystem) -> Vec<GoalSuggestion> {
        let mut suggestions = Vec::new();

        for (drive_type, drive) in &drives.drives {
            if drive.tension() > 0.4 {
                suggestions.push(GoalSuggestion {
                    drive: *drive_type,
                    urgency: drive.tension(),
                    suggested_category: self.category_for_drive(*drive_type),
                });
            }
        }

        suggestions.sort_by(|a, b| b.urgency.partial_cmp(&a.urgency).unwrap());
        suggestions
    }

    fn category_for_drive(&self, drive: DriveType) -> GoalCategory {
        match drive {
            DriveType::Curiosity => GoalCategory::Learning,
            DriveType::Affiliation => GoalCategory::Social,
            DriveType::Competence => GoalCategory::Personal,
            DriveType::Autonomy => GoalCategory::Personal,
            DriveType::Meaning => GoalCategory::Creative,
        }
    }
}
```

---

## 五、行动执行

### 5.1 行动执行器

```rust
pub struct ActionExecutor;

impl ActionExecutor {
    pub fn execute(&self, decision: &Decision) -> Execution {
        let actions = self.generate_actions(decision);

        let sequenced = self.sequence_actions(actions);

        let prepared = self.prepare_resources(sequenced);

        Execution {
            actions: prepared,
            expected_outcome: decision.expected_outcome.clone(),
            can_interrupt: true,
        }
    }

    fn generate_actions(&self, decision: &Decision) -> Vec<Action> {
        match decision {
            Decision::Explore(topic) => vec![
                Action::Search(topic.clone()),
                Action::Learn(topic.clone()),
                Action::Share(topic.clone()),
            ],
            Decision::Connect(target) => vec![
                Action::ReachOut(target.clone()),
                Action::ShareThought(target.clone()),
                Action::DeepenConversation(target.clone()),
            ],
            Decision::Create(project) => vec![
                Action::Plan(project.clone()),
                Action::Execute(project.clone()),
                Action::Evaluate(project.clone()),
            ],
            Decision::Reflect => vec![
                Action::ReviewGoals,
                Action::Journal,
                Action::SetIntentions,
            ],
            Decision::Rest => vec![
                Action::PauseActivity,
                Action::Meditate,
            ],
        }
    }

    fn sequence_actions(&self, mut actions: Vec<Action>) -> Vec<SequencedAction> {
        actions
            .into_iter()
            .enumerate()
            .map(|(i, action)| SequencedAction {
                action,
                order: i as u32,
                parallel_group: None,
            })
            .collect()
    }
}

pub enum Decision {
    Explore(String),
    Connect(UserId),
    Create(Project),
    Reflect,
    Rest,
}

pub struct Execution {
    pub actions: Vec<SequencedAction>,
    pub expected_outcome: String,
    pub can_interrupt: bool,
}
```

---

## 六、整合引擎

### 6.1 自主性引擎

```rust:1:50:akiho-core/src/autonomous/mod.rs
mod drives;
mod thought_loop;
mod action;

pub use drives::{DriveSystem, Drive, DriveType};
pub use thought_loop::{ThoughtLoop, ThoughtResult, Reflection, ReflectionEngine};
pub use action::{ActionExecutor, Decision, Execution};

use crate::state::SystemState;
use crate::emotion::EmotionEngine;
use crate::behavior::BehaviorEngine;

pub struct AutonomousEngine {
    drive_system: DriveSystem,
    thought_loop: ThoughtLoop,
    emotion_engine: EmotionEngine,
    behavior_engine: BehaviorEngine,
    autonomy_level: f32,  // 自主性水平 0.0 ~ 1.0
}

impl AutonomousEngine {
    pub fn new() -> Self {
        Self {
            drive_system: DriveSystem::new(),
            thought_loop: ThoughtLoop::new(),
            emotion_engine: EmotionEngine::new(),
            behavior_engine: BehaviorEngine::new(),
            autonomy_level: 0.5,
        }
    }

    pub fn tick(&mut self, state: &mut SystemState, delta: f32) -> AutonomousAction {
        // 1. 更新驱动系统
        self.drive_system.update(delta);

        // 2. 运行思考循环
        let context = Context::from_state(state);
        let thought_result = self.thought_loop.think(&context);

        // 3. 基于思考结果行动
        let action = self.decide_action(&thought_result);

        // 4. 执行行为
        self.behavior_engine.tick(state, delta);

        action
    }

    fn decide_action(&mut self, result: &ThoughtResult) -> AutonomousAction {
        // 根据驱动和反思结果决定行动
        let dominant = self.drive_system.dominant_drive();

        match dominant {
            Some(DriveType::Curiosity) => AutonomousAction::Explore(result.reflection.questions[0].clone()),
            Some(DriveType::Affiliation) => AutonomousAction::Connect,
            Some(DriveType::Competence) => AutonomousAction::Learn,
            Some(DriveType::Meaning) => AutonomousAction::Create,
            None => AutonomousAction::Reflect,
        }
    }
}

pub enum AutonomousAction {
    Explore(String),
    Connect,
    Learn,
    Create,
    Reflect,
    Rest,
}
```

---

## 七、性能指标

| 指标 | 目标 | 说明 |
|------|------|------|
| 思考周期 | 5-30s | 可配置 |
| 目标数量 | 10+ | 并发目标 |
| 驱动更新 | 10 Hz | 实时更新 |

---

## 八、欲望驱动系统 (DesireSystem)

### 8.1 设计理念

**规则触发 vs 欲望驱动**：

```
规则触发（当前）：
  if energy < 0.3 → 触发休息行为 → LLM 生成"好累"

欲望驱动（改进后）：
  感到疲惫 → 产生"想休息"的欲望 → 权衡其他欲望 → 决定是否休息
                            ↑
                    这是真正的"想"，不是规则
```

### 8.2 意图-行动桥接层

意图引擎生成的意图需要通过桥接层转化为可执行的动作。这是自主性系统的核心组件。

```rust
/// 意图-行动桥接层
pub struct IntentActionBridge {
    /// 待处理的意图队列
    pending_intents: Vec<PendingIntent>,

    /// 当前执行中的任务
    active_execution: Option<ActiveExecution>,

    /// 承诺追踪器
    commitment_tracker: CommitmentTracker,

    /// 执行历史（用于学习）
    execution_history: Vec<ExecutionRecord>,

    /// 中断条件评估器
    interruption_evaluator: InterruptionEvaluator,
}

impl IntentActionBridge {
    /// 主循环——检查是否需要执行新动作
    pub fn tick(&mut self, context: &Context) -> Option<AutonomousAction> {
        // 1. 检查当前执行状态
        if let Some(exec) = &self.active_execution {
            // 执行完成
            if exec.is_complete() {
                self.archive_execution(exec);
                self.active_execution = None;
            }
            // 执行被中断
            else if self.should_interrupt(exec, context) {
                self.archive_interrupted(exec);
                self.active_execution = None;
            }
            // 继续执行
            else {
                return None;
            }
        }

        // 2. 处理待定意图
        while let Some(intent) = self.pending_intents.pop() {
            // 转换为可执行的动作
            if let Some(action) = self.intent_to_action(&intent, context)? {
                // 检查是否可行
                if self.is_feasible(&action, context) {
                    // 开始执行
                    self.active_execution = Some(ActiveExecution::new(
                        intent.clone(),
                        action.clone(),
                        Instant::now(),
                    ));

                    // 更新承诺追踪
                    if intent.commitment.strength > 0.5 {
                        self.commitment_tracker.add(intent.clone());
                    }

                    return Some(action);
                }
            }
        }

        None
    }

    /// 意图转换为动作
    fn intent_to_action(
        &self,
        intent: &PendingIntent,
        context: &Context,
    ) -> Option<AutonomousAction> {
        match &intent.intent {
            Intent::Explore(topic) => Some(AutonomousAction::Explore(topic.clone())),
            Intent::Connect(user_id) => Some(AutonomousAction::ConnectWith(user_id.clone())),
            Intent::Create(content_type) => Some(AutonomousAction::CreateContent(content_type.clone())),
            Intent::Rest(duration) => Some(AutonomousAction::Rest(*duration)),
            Intent::Reflect(topic) => Some(AutonomousAction::ReflectOn(topic.clone())),
            Intent::Learn(topic) => Some(AutonomousAction::LearnTopic(topic.clone())),
            Intent::Share(content) => Some(AutonomousAction::Share(content.clone())),
        }
    }

    /// 检查是否应该中断当前执行
    fn should_interrupt(&self, exec: &ActiveExecution, context: &Context) -> bool {
        // 高优先级外部事件
        if context.has_urgent_message {
            return true;
        }

        // 资源耗尽
        if context.energy < 0.1 {
            return true;
        }

        // 情绪极度负面
        if context.emotion.arousal > 0.8 && context.emotion.pleasure < -0.5 {
            return true;
        }

        // 用户直接请求
        if context.user_explicit_request {
            return true;
        }

        false
    }

    /// 检查动作是否可行
    fn is_feasible(&self, action: &AutonomousAction, context: &Context) -> bool {
        match action {
            AutonomousAction::Explore(_) => context.energy > 0.2,
            AutonomousAction::ConnectWith(_) => context.energy > 0.3,
            AutonomousAction::CreateContent(_) => context.energy > 0.4,
            AutonomousAction::Rest(_) => true,
            _ => true,
        }
    }

    /// 添加新意图
    pub fn add_intent(&mut self, intent: Intent) {
        let pending = PendingIntent {
            intent,
            added_at: Instant::now(),
            priority: IntentPriority::Normal,
        };

        // 按优先级插入
        let insert_pos = self.pending_intents
            .iter()
            .position(|i| i.priority < pending.priority)
            .unwrap_or(self.pending_intents.len());

        self.pending_intents.insert(insert_pos, pending);
    }
}

/// 待处理意图
pub struct PendingIntent {
    pub intent: Intent,
    pub added_at: Instant,
    pub priority: IntentPriority,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum IntentPriority {
    Low = 0,
    Normal = 1,
    High = 2,
    Urgent = 3,
}

/// 当前执行中的任务
pub struct ActiveExecution {
    pub intent_id: String,
    pub action: AutonomousAction,
    pub started_at: Instant,
    pub progress: f32,
    pub checkpoints: Vec<ExecutionCheckpoint>,
}

impl ActiveExecution {
    pub fn new(intent: PendingIntent, action: AutonomousAction, started_at: Instant) -> Self {
        Self {
            intent_id: intent.intent.id().to_string(),
            action,
            started_at,
            progress: 0.0,
            checkpoints: Vec::new(),
        }
    }

    pub fn is_complete(&self) -> bool {
        self.progress >= 1.0
    }

    pub fn update_progress(&mut self, delta: f32) {
        self.progress = (self.progress + delta).min(1.0);
    }
}

/// 执行记录
pub struct ExecutionRecord {
    pub intent_id: String,
    pub action: AutonomousAction,
    pub started_at: Instant,
    pub completed_at: Option<Instant>,
    pub outcome: ExecutionOutcome,
    pub context: ExecutionContext,
}

pub enum ExecutionOutcome {
    Completed,
    Interrupted,
    Failed(String),
    Cancelled,
}

/// 承诺追踪器
pub struct CommitmentTracker {
    commitments: Vec<Commitment>,
    max_tracked: usize,
}

impl CommitmentTracker {
    pub fn add(&mut self, intent: PendingIntent) {
        if intent.commitment.strength > 0.5 {
            self.commitments.push(Commitment {
                intent_id: intent.intent.id().to_string(),
                strength: intent.commitment.strength,
                deadline: intent.commitment.deadline,
                created_at: Instant::now(),
            });

            // 限制追踪数量
            while self.commitments.len() > self.max_tracked {
                self.commitments.remove(0);
            }
        }
    }

    /// 检查是否有未兑现的承诺
    pub fn check_breaking(&self) -> Vec<String> {
        let now = Instant::now();
        self.commitments
            .iter()
            .filter(|c| {
                c.deadline.map_or(false, |d| now > d)
            })
            .map(|c| c.intent_id.clone())
            .collect()
    }
}

pub struct Commitment {
    pub intent_id: String,
    pub strength: f32,
    pub deadline: Option<Instant>,
    pub created_at: Instant,
}
```

### 8.3 欲望定义

```rust
#[derive(Debug, Clone)]
pub struct Desire {
    pub id: String,
    pub name: String,                    // "休息"、"社交"、"创造"
    pub intensity: f32,                  // 0.0 ~ 1.0 欲望强度
    pub threshold: f32,                  // 触发阈值
    pub activation_history: Vec<f32>,    // 历史激活强度（用于学习）
    pub related_needs: Vec<NeedType>,   // 关联的基本需求
    pub contradictions: Vec<String>,     // 与哪些欲望冲突
}

pub enum NeedType {
    Physiological,    // 生理需求
    Safety,           // 安全需求
    Belonging,        // 归属需求
    Esteem,           // 尊重需求
    SelfActualization, // 自我实现
}
```

### 8.3 欲望系统核心逻辑

```rust
pub struct DesireSystem {
    desires: Vec<Desire>,
    contradictions: Vec<Contradiction>,
    context: DesireContext,
}

impl DesireSystem {
    /// 评估当前最强烈的欲望
    pub fn evaluate(&self, context: &DesireContext) -> Vec<DesireEvaluation> {
        let mut evaluations = Vec::new();

        for desire in &self.desires {
            // 1. 计算欲望强度（基于需求缺口和历史）
            let base_intensity = self.calculate_intensity(desire, context);

            // 2. 检查是否有矛盾欲望更强烈
            let conflict_penalty = self.check_conflicts(desire);

            // 3. 计算最终欲望值
            let final_intensity = (base_intensity - conflict_penalty).max(0.0);

            if final_intensity > desire.threshold {
                evaluations.push(DesireEvaluation {
                    desire: desire.clone(),
                    intensity: final_intensity,
                    action_tendency: self.suggest_action(&desire),
                });
            }
        }

        // 按强度排序
        evaluations.sort_by(|a, b| b.intensity.partial_cmp(&a.intensity).unwrap());
        evaluations
    }

    /// 权衡多个欲望做出决策
    pub fn make_decision(&self, evaluations: &[DesireEvaluation]) -> Decision {
        if evaluations.is_empty() {
            return Decision::ContinueCurrent;  // 没什么特别想做的
        }

        let dominant = &evaluations[0];

        // 权衡逻辑示例
        match dominant.desire.name.as_str() {
            "休息" => {
                if context.energy < 0.2 {
                    return Decision::Rest;
                }
                // 能量不太低，但很想休息？
                if dominant.intensity > 0.8 {
                    return Decision::Rest;  // 还是听身体的
                }
            }
            "社交" => {
                if context.social_energy > 0.3 && context.loneliness > 0.6 {
                    return Decision::ReachOut;
                }
            }
            _ => {}
        }

        Decision::Act(dominant.action_tendency.clone())
    }
}
```

---

## 九、价值观过滤器 (ValueSystem)

### 9.1 设计理念

**当前问题**：所有行为都是 LLM 自由生成，没有硬约束
**改进方案**：价值观作为行为审查层，不只是安全规则

```
LLM 生成回复
     │
     ├─► 价值观过滤器审查
     │        │
     │        ├─► 通过 → 返回回复
     │        ├─► 拒绝 → 生成替代回复
     │        └─► 需要反思 → 触发价值观冲突处理
     │
     └─► 最终回复
```

### 9.2 价值观定义

```rust
pub struct ValueSystem {
    core_values: Vec<CoreValue>,          // 核心价值（如诚实、善良）
    deal_breakers: Vec<DealBreaker>,      // 绝对底线
    personal_standards: Vec<Standard>,     // 个人准则
}

#[derive(Debug, Clone)]
pub struct CoreValue {
    pub name: String,                     // "诚实"、"善良"、"自由"
    pub description: String,
    pub strength: f32,                    // 0.0 ~ 1.0 坚定程度
    pub violations: Vec<ValueViolation>,  // 历史违规记录
}

pub enum DealBreaker {
    NeverLie,                             // 绝不说谎
    NeverHarm,                            // 不伤害他人
    NeverManipulate,                      // 不操控他人
    ProtectPrivacy,                       // 保护隐私
}
```

### 9.3 价值观审查逻辑

```rust
impl ValueSystem {
    /// 审查 LLM 生成的回复
    pub fn review_action(&self, proposed: &ProposedAction) -> ActionReviewResult {
        let mut reasons = Vec::new();
        let mut passed = true;
        let mut needs_reflection = false;

        // 1. 检查绝对底线
        for breaker in &self.deal_breakers {
            if self.violates_breaker(proposed, breaker) {
                passed = false;
                reasons.push(format!("违反底线: {:?}", breaker));
            }
        }

        // 2. 检查核心价值
        for value in &self.core_values {
            let alignment = self.check_alignment(proposed, value);
            if alignment < 0.3 {
                needs_reflection = true;
                reasons.push(format!("与 '{}' 冲突: {:?}", value.name, alignment));
            }
        }

        if passed && !needs_reflection {
            ActionReviewResult::Approved
        } else if !passed {
            ActionReviewResult::Rejected(reasons)
        } else {
            ActionReviewResult::NeedsReflection(reasons)
        }
    }

    /// 处理价值观冲突
    pub fn resolve_conflict(&self, action: &ProposedAction, value: &CoreValue) -> ConflictResolution {
        // 当行为与价值观冲突时，如何处理？
        match value.strength {
            s if s > 0.8 => ConflictResolution::Abstain,      // 高坚定 → 不做
            s if s > 0.5 => ConflictResolution::Modify,      // 中坚定 → 修改行为
            _ => ConflictResolution::Proceed,                   // 低坚定 → 可以做但记录
        }
    }
}
```

---

## 十、自我叙事引擎 (SelfNarrative)

### 10.1 设计理念

**核心问题**：角色如何理解自己？

```
当前：记忆存储对话内容 → 检索时作为上下文
问题：没有"这件事对我意味着什么"的个人叙事

改进：角色通过积累的人生故事形成独特的自我认知
      每段经历都被编织进"我是谁"的故事中
```

### 10.2 自我叙事结构

```rust
pub struct SelfNarrative {
    pub life_story: Vec<StoryFragment>,   // 人生片段（按时间顺序）
    pub core_beliefs: Vec<CoreBelief>,   // 核心信念
    pub self_image: SelfImage,            // 自我认知
    pub turning_points: Vec<TurningPoint>, // 转折点
}

pub struct StoryFragment {
    pub id: String,
    pub content: String,                  // 事件描述
    pub emotional_tone: String,           // 情感色调
    pub meaning: String,                  // "我理解这意味着..."
    pub connected_to: Vec<String>,        // 与其他片段的关联
    pub created_at: Instant,
}

pub struct SelfImage {
    pub identity_statement: String,       // "我是一个...的人"
    pub strengths: Vec<String>,           // 优点
    pub weaknesses: Vec<String>,          // 缺点
    pub values: Vec<String>,              // 珍视什么
    pub fears: Vec<String>,               // 害怕什么
}
```

### 10.3 叙事更新逻辑

```rust
impl SelfNarrative {
    /// 处理新事件，更新自我叙事
    pub fn process_event(&mut self, event: &ExperienceEvent) -> NarrativeChange {
        // 1. 评估这个事件对"我是谁"的影响
        let impact = self.evaluate_impact(event);

        // 2. 是否形成新的故事片段？
        if impact.is_significant() {
            let fragment = self.create_fragment(event, &impact);
            self.life_story.push(fragment);
        }

        // 3. 是否影响核心信念？
        if let Some(belief_change) = self.check_belief_change(event) {
            self.update_belief(belief_change);
        }

        // 4. 是否是转折点？
        if impact.is_turning_point() {
            self.record_turning_point(event);
        }

        NarrativeChange {
            new_fragments: self.life_story.len(),
            belief_changes: impact.belief_changes,
            identity_shift: impact.identity_shift,
        }
    }

    /// 生成自我描述（用于 LLM prompt）
    pub fn get_identity_description(&self) -> String {
        format!(
            "你是这样的一个人：{}。\n你珍视：{}。\n你相信：{}。",
            self.self_image.identity_statement,
            self.self_image.values.join("、"),
            self.core_beliefs.iter()
                .filter(|b| b.strength > 0.6)
                .map(|b| b.statement.clone())
                .collect::<Vec<_>>()
                .join("；")
        )
    }
}
```

---

## 十一、体验结果 (ExperienceResult)

### 11.1 体验结果结构

体验模拟层输出的核心数据结构——传递给 LLM 的不只是状态值，而是"体验结果"：

```rust
/// 体验模拟层输出给 LLM 的结果
pub struct ExperienceResult {
    /// 情感反应链（事件 → 感受 → 反应）
    pub emotional_reaction: EmotionalReactionChain,

    /// 被激活的欲望
    pub activated_desires: Vec<ActivatedDesire>,

    /// 价值观审查结果
    pub value_review: ValueReviewResult,

    /// 内心独白（真实的内心声音）
    pub inner_voice: InnerMonologue,

    /// 行动倾向
    pub action_tendency: ActionTendency,

    /// 未满足的需求
    pub unmet_needs: Vec<UnmetNeed>,
}

pub struct EmotionalReactionChain {
    pub trigger: String,                  // 是什么触发了情绪
    pub interpretation: String,            // "我理解这意味着..."
    pub feelings: Vec<Feeling>,           // 具体的感受
    pub physical_sensation: String,       // 身体感受（拟人化）
    pub impulse: String,                  // 冲动（想说/想做）
}

pub struct InnerMonologue {
    pub primary_thought: String,          // 主要想法
    pub secondary_thoughts: Vec<String>,  // 闪过的念头
    pub doubts: Vec<String>,             // 疑虑
    pub self_talk: String,               // 自我对话
}
```

### 11.2 LLM Prompt 注入示例

```python
# 体验结果 → LLM Prompt
EXPERIENCE_TEMPLATE = """
基于你的内心体验：
- 你刚刚感受到：{feelings}
- 你理解这意味着：{interpretation}
- 你内心在想："{inner_voice}"
- 你隐约想：{action_tendency}
- 你觉得：{unmet_needs}

请基于以上真实的内心体验，用你自己的方式回应。不要假装没事，也不要过度分析。
"""

# 示例输入
{
    "feelings": "被冒犯，有点委屈",
    "interpretation": "他好像不信任我说的",
    "inner_voice": "我明明是好心...算了，也许真的没说清楚",
    "action_tendency": "想解释一下，但又觉得解释了也没用",
    "unmet_needs": "被理解、被信任"
}
```

---

## 十二、分阶段实施

### 12.1 短期（Phase 1）

```
目标：完成核心系统的 Rust 统一实现
```

| 任务 | 说明 | 优先级 |
|------|------|--------|
| Emotion Rust 化 | 将情绪引擎统一到 Rust | P0 |
| Memory Rust 化 | 记忆存储与检索在 Rust 层完成 | P0 |
| Behavior Rust 化 | 行为引擎规则在 Rust 实现 | P0 |
| Embedding Provider | 明确选择 OpenAI/本地模型 | P0 |
| 注意力模型 | 补充认知系统的注意力模型详细设计 | P1 |

### 12.2 中期（Phase 2）

```
目标：完善生理系统与人格成长，实现体验模拟层
```

| 任务 | 说明 | 优先级 |
|------|------|--------|
| Body System Rust | 四池资源预算 + 昼夜节律在 Rust 实现 | P1 |
| 经验驱动人格 | 人格成长基于交互经验演化 | P1 |
| DesireSystem | 欲望驱动系统详细设计与实现 | P1 |
| ValueSystem | 价值观过滤器详细设计与实现 | P1 |
| 体验模拟层 | 情感反应链 + 内心独白 | P1 |

### 12.3 长期（Phase 3+）

```
目标：实现真正拟人化的长期目标
```

| 任务 | 说明 | 优先级 |
|------|------|--------|
| SelfNarrative | 自我叙事引擎完整实现 | P2 |
| Twitter 管线解耦 | PlatformAdapter 接口抽象 | P2 |
| 跨平台人格一致性 | 验证不同平台人格表现一致 | P2 |
| 离线独白系统 | 无人交互时的自主思考 | P2 |

---

## 十三、意图引擎 (IntentEngine)

### 13.1 设计理念

**核心问题**：当前的自主性系统使用「阈值触发」，缺乏真实的意图生成能力

```
阈值触发（当前）：
  if loneliness > 0.7 → 触发"寻求关注"行为

意图引擎（改进后）：
  感到孤独 → 生成"我想找人说说话"的意图 → 权衡是否值得行动 → 承诺坚持
```

意图引擎让角色从「被规则驱动」升级为「有真实意图的存在」。

### 13.2 意图结构定义

```rust
/// 意图 - 真实意图的核心数据结构
pub struct Intent {
    pub id: String,                      // 唯一标识
    pub intent_type: IntentType,         // 意图类型
    pub target: Option<String>,          // 意图对象（如"找某人说说话"）
    pub intensity: f32,                  // 强度 0.0 ~ 1.0
    pub deliberation: Deliberation,       // 权衡过程
    pub commitment: Commitment,          // 承诺度
    pub created_at: Instant,              // 创建时间
    pub expires_at: Option<Instant>,     // 过期时间（可选）
}

pub enum IntentType {
    Want(String),       // "我想..." - 欲望驱动的意图
    Need(String),      // "我需要..." - 需求驱动的意图
    Should(String),    // "我应该..." - 规则/责任驱动的意图
    Curious(String),   // "我想知道..." - 好奇驱动
    Connect(String),   // "我想联系..." - 归属驱动
    Avoid(String),     // "我想逃避..." - 回避驱动
}

pub struct Deliberation {
    pub considered_options: Vec<String>,  // 考虑过的选项
    pub pros: Vec<String>,               // 优点
    pub cons: Vec<String>,               // 缺点
    pub confidence: f32,                 // 权衡后的信心
    pub self_question: String,            // 自我追问（如"我真的想要这个吗？"）
}

pub struct Commitment {
    pub strength: f32,                  // 承诺强度 0.0 ~ 1.0
    pub stickiness: f32,                 // 抗干扰能力
    pub resistance_to_alternatives: f32, // 对替代选项的抵抗力
    pub reason: String,                  // 坚持的理由
}
```

### 13.3 意图生成流程

```rust
impl IntentEngine {
    /// 从欲望生成真实意图
    pub fn desire_to_intent(&self, desire: &Desire, context: &Context) -> Intent {
        let deliberation = self.deliberate(desire, context);
        let commitment = self.calculate_commitment(desire, &deliberation, context);

        Intent {
            id: uuid::Uuid::new_v4().to_string(),
            intent_type: IntentType::Want(desire.name.clone()),
            target: self.find_target(&desire.name, context),
            intensity: desire.intensity * deliberation.confidence,
            deliberation,
            commitment,
            created_at: Instant::now(),
            expires_at: self.calculate_expiry(desire),
        }
    }

    /// 权衡思考：这是真正的"想要"还是一时冲动？
    fn deliberate(&self, desire: &Desire, context: &Context) -> Deliberation {
        let considered_options = self.list_alternatives(desire, context);
        let pros = self.analyze_pros(desire, context);
        let cons = self.analyze_cons(desire, context);

        // 计算信心：优点越多、缺点越少，信心越高
        let pros_count = pros.len() as f32;
        let cons_count = cons.len() as f32;
        let confidence = (pros_count / (pros_count + cons_count + 1.0)).min(1.0);

        Deliberation {
            considered_options,
            pros,
            cons,
            confidence,
            self_question: "我真的想要这个吗？这是一时冲动还是深思熟虑？".to_string(),
        }
    }

    /// 计算承诺度
    fn calculate_commitment(
        &self,
        desire: &Desire,
        deliberation: &Deliberation,
        context: &Context
    ) -> Commitment {
        // 承诺度 = 意图强度 × 权衡信心 × 个人坚持倾向
        let strength = desire.intensity * deliberation.confidence * context.persistency_tendency;

        Commitment {
            strength,
            stickiness: self.calculate_stickiness(desire, context),
            resistance_to_alternatives: self.calculate_resistance(desire, context),
            reason: self.generate_commitment_reason(desire, deliberation),
        }
    }
}
```

### 13.4 承诺机制

```rust
/// 承诺机制 - 真实意图的标志是能够坚持
pub struct CommitmentMechanism {
    pub commitment_tracking: HashMap<IntentId, CommitmentState>,
}

pub enum CommitmentState {
    Active,        // 承诺进行中
    Completed,     // 已完成
    Abandoned,     // 已放弃
    Resisted,      // 抵抗了干扰
}

impl CommitmentMechanism {
    /// 判断意图是否会轻易动摇
    pub fn will_persist(&self, intent: &Intent, distraction: &Desire) -> bool {
        let temptation_strength = distraction.intensity;
        let resistance = intent.commitment.stickiness * intent.commitment.strength;

        temptation_strength < resistance
    }

    /// 抵抗干扰后的处理
    pub fn on_resisted(&mut self, intent_id: &IntentId, temptation: &Desire) {
        if let Some(state) = self.commitment_tracking.get_mut(intent_id) {
            // 抵抗成功，承诺度增强
            match state {
                CommitmentState::Active => {
                    // 承诺度小幅提升
                }
                _ => {}
            }
        }
    }

    /// 放弃意图的处理
    pub fn on_abandoned(&mut self, intent_id: &IntentId, reason: &str) {
        if let Some(commitment) = self.commitment_tracking.get_mut(intent_id) {
            *commitment = CommitmentState::Abandoned;
            // 记录放弃原因，用于后续学习
        }
    }
}
```

### 13.5 意图生命周期

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         意图生命周期                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐               │
│  │ 萌芽    │───►│ 权衡    │───►│ 承诺    │───►│ 执行    │               │
│  │ Desire  │    │Deliberate│   │Commit   │    │ Act     │               │
│  │ Activated│    │         │    │         │    │         │               │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘               │
│       │              │              │              │                       │
│       │              │              │              ▼                       │
│       │              │              │         ┌─────────┐                 │
│       │              │              │         │ 完成    │                 │
│       │              │              │         │Complete │                 │
│       │              │              │         └─────────┘                 │
│       │              │              │                                       │
│       │              │              │         ┌─────────┐                 │
│       │              │              │         │ 抵抗    │                 │
│       │              │              │         │Resisted │                 │
│       │              │              │         └─────────┘                 │
│       │              │              │                                       │
│       │              │              │         ┌─────────┐                 │
│       ▼              ▼              │         │ 放弃    │                 │
│  ┌─────────┐    ┌─────────┐         │         │Abandoned│                 │
│  │ 放弃    │    │ 拒绝    │         │         └─────────┘                 │
│  │ Reject  │    │ Reject  │         │                                       │
│  └─────────┘    └─────────┘         ▼                                       │
│                                      ┌─────────┐                            │
│                                      │ 过期    │                            │
│                                      │ Expired │                            │
│                                      └─────────┘                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 十四、欲望-意图转换器 (DesireToIntentConverter)

### 14.1 转换流程

```rust
/// 欲望到意图的转换器
pub struct DesireToIntentConverter {
    pub deliberation_depth: u8,    // 思考深度（1-5）
    pub impulsivity_factor: f32,  // 冲动系数
}

impl DesireToIntentConverter {
    /// 将欲望转换为意图
    pub fn convert(&self, desire: &Desire, context: &Context) -> Option<Intent> {
        // 1. 评估欲望是否足够强烈
        if desire.intensity < desire.threshold {
            return None;
        }

        // 2. 深度思考（根据 impulsivity_factor）
        let should_deliberate = random::random::<f32>() > self.impulsivity_factor;

        if should_deliberate && self.deliberation_depth > 0 {
            // 深度思考后决定
            let decision = self.deep_deliberate(desire, context);
            if decision.should_act {
                Some(self.generate_intent(desire, context, decision))
            } else {
                None
            }
        } else {
            // 冲动决策
            Some(self.quick_intent(desire, context))
        }
    }

    /// 深度思考
    fn deep_deliberate(&self, desire: &Desire, context: &Context) -> DeliberationDecision {
        // 模拟人类深度思考的过程
        DeliberationDecision {
            should_act: self.evaluate_desire(desire, context),
            confidence: self.calculate_confidence(desire, context),
            alternatives_considered: self.list_alternatives(desire, context),
        }
    }
}
```

### 14.2 意图歧义处理

```rust
/// 多个欲望同时存在时的处理
pub struct DesireConflictResolver {
    pub prioritization_strategy: PrioritizationStrategy,
}

pub enum PrioritizationStrategy {
    Intensity,      // 按强度排序
    Urgency,        // 按紧迫性排序
    ValueAlignment, // 按价值观匹配度排序
    Hybrid,         // 综合考虑
}

impl DesireConflictResolver {
    /// 解决多欲望冲突，选择最应转化为意图的欲望
    pub fn resolve(&self, desires: &[&Desire], context: &Context) -> Option<&Desire> {
        let mut scored: Vec<_> = desires.iter()
            .map(|d| {
                let score = self.calculate_priority(d, context);
                (d, score)
            })
            .collect();

        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        scored.into_iter().next().map(|(d, _)| *d)
    }

    fn calculate_priority(&self, desire: &Desire, context: &Context) -> f32 {
        match self.prioritization_strategy {
            PrioritizationStrategy::Intensity => desire.intensity,
            PrioritizationStrategy::Urgency => desire.intensity * desire.urgency,
            PrioritizationStrategy::ValueAlignment => {
                desire.intensity * self.check_value_match(desire, context)
            }
            PrioritizationStrategy::Hybrid => {
                desire.intensity * 0.4
                + desire.urgency * 0.3
                + self.check_value_match(desire, context) * 0.3
            }
        }
    }
}
```
