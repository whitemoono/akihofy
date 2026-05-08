// 自主性系统 —— 驱动引擎、思考循环、意图引擎
// 对应设计文档: docs/subsystem_design/11_autonomous_system.md
// 优先级: P0（用户核心需求）

use serde::{Deserialize, Serialize};

// ═══════════════════════════════════════════════════════════════
// 一、驱动系统
// ═══════════════════════════════════════════════════════════════

/// 驱动类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum DriveType {
    Curiosity,     // 好奇心
    Affiliation,   // 归属/社交需求
    Competence,    // 能力感/成就需求
    Autonomy,      // 自主性
    Meaning,       // 意义寻求
}

impl DriveType {
    pub fn name(&self) -> &'static str {
        match self {
            DriveType::Curiosity => "好奇心",
            DriveType::Affiliation => "归属需求",
            DriveType::Competence => "能力需求",
            DriveType::Autonomy => "自主需求",
            DriveType::Meaning => "意义需求",
        }
    }

    pub fn default_tension(&self) -> f32 {
        match self {
            DriveType::Curiosity => 0.5,
            DriveType::Affiliation => 0.3,
            DriveType::Competence => 0.3,
            DriveType::Autonomy => 0.4,
            DriveType::Meaning => 0.2,
        }
    }
}

/// 单个驱动状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriveState {
    pub drive_type: DriveType,
    /// 当前张力 (0.0 ~ 1.0) —— 越高越需要满足
    pub tension: f32,
    /// 满足阈值 —— 低于此值触发行为
    pub threshold: f32,
    /// 自然增长率 (每秒)
    pub growth_rate: f32,
    /// 衰减速率 (每秒，满足后)
    pub decay_rate: f32,
}

impl DriveState {
    pub fn new(drive_type: DriveType) -> Self {
        Self {
            drive_type,
            tension: drive_type.default_tension(),
            threshold: 0.6,
            growth_rate: 0.0001,
            decay_rate: 0.01,
        }
    }

    /// 是否触发行为
    pub fn is_triggered(&self) -> bool {
        self.tension >= self.threshold
    }

    /// 自然增长
    pub fn grow(&mut self, delta: f32) {
        self.tension = (self.tension + self.growth_rate * delta).min(1.0);
    }

    /// 满足后衰减
    pub fn satisfy(&mut self, amount: f32) {
        self.tension = (self.tension - amount * self.decay_rate).max(0.0);
    }
}

/// 驱动系统
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriveSystem {
    pub drives: Vec<DriveState>,
}

impl DriveSystem {
    pub fn new() -> Self {
        Self {
            drives: vec![
                DriveState::new(DriveType::Curiosity),
                DriveState::new(DriveType::Affiliation),
                DriveState::new(DriveType::Competence),
                DriveState::new(DriveType::Autonomy),
                DriveState::new(DriveType::Meaning),
            ],
        }
    }

    pub fn get(&self, drive_type: DriveType) -> Option<&DriveState> {
        self.drives.iter().find(|d| d.drive_type == drive_type)
    }

    pub fn get_mut(&mut self, drive_type: DriveType) -> Option<&mut DriveState> {
        self.drives.iter_mut().find(|d| d.drive_type == drive_type)
    }

    pub fn total_tension(&self) -> f32 {
        self.drives.iter().map(|d| d.tension).sum::<f32>() / self.drives.len() as f32
    }

    pub fn dominant_drive(&self) -> Option<DriveType> {
        self.drives
            .iter()
            .max_by(|a, b| a.tension.partial_cmp(&b.tension).unwrap())
            .map(|d| d.drive_type)
    }

    pub fn triggered_drives(&self) -> Vec<&DriveState> {
        self.drives.iter().filter(|d| d.is_triggered()).collect()
    }

    pub fn tick(&mut self, delta: f32) {
        for drive in &mut self.drives {
            drive.grow(delta);
        }
    }

    pub fn satisfy(&mut self, drive_type: DriveType, amount: f32) {
        if let Some(drive) = self.get_mut(drive_type) {
            drive.satisfy(amount);
        }
    }
}

impl Default for DriveSystem {
    fn default() -> Self {
        Self::new()
    }
}

// ═══════════════════════════════════════════════════════════════
// 二、意图引擎
// ═══════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Intent {
    pub id: String,
    pub description: String,
    pub source_drive: DriveType,
    pub strength: f32,
    pub stage: IntentStage,
    pub commitment: f32,
    pub created_at: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum IntentStage {
    Desire,
    Deliberation,
    Commitment,
    Execution,
    Completed,
    Abandoned,
}

impl IntentStage {
    pub fn name(&self) -> &'static str {
        match self {
            IntentStage::Desire => "欲望",
            IntentStage::Deliberation => "权衡",
            IntentStage::Commitment => "承诺",
            IntentStage::Execution => "执行",
            IntentStage::Completed => "完成",
            IntentStage::Abandoned => "放弃",
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct IntentEngine {
    pub active_intents: Vec<Intent>,
    pub completed_intents: Vec<Intent>,
}

impl IntentEngine {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn generate_intent(
        &mut self,
        drive_type: DriveType,
        description: &str,
        strength: f32,
    ) -> &Intent {
        let intent = Intent {
            id: uuid::Uuid::new_v4().to_string(),
            description: description.to_string(),
            source_drive: drive_type,
            strength,
            stage: IntentStage::Desire,
            commitment: 0.0,
            created_at: chrono::Utc::now().timestamp(),
        };
        self.active_intents.push(intent);
        self.active_intents.last().unwrap()
    }

    pub fn advance(&mut self, intent_id: &str, new_stage: IntentStage) {
        if let Some(intent) = self.active_intents.iter_mut().find(|i| i.id == intent_id) {
            intent.stage = new_stage;
        }
    }

    pub fn commit(&mut self, intent_id: &str) {
        if let Some(intent) = self.active_intents.iter_mut().find(|i| i.id == intent_id) {
            intent.stage = IntentStage::Commitment;
            intent.commitment = intent.strength;
        }
    }

    pub fn complete(&mut self, intent_id: &str) {
        if let Some(pos) = self.active_intents.iter().position(|i| i.id == intent_id) {
            let mut intent = self.active_intents.remove(pos);
            intent.stage = IntentStage::Completed;
            self.completed_intents.push(intent);
        }
    }

    pub fn prune_completed(&mut self) {
        self.completed_intents.truncate(50);
    }

    pub fn has_executing(&self) -> bool {
        self.active_intents
            .iter()
            .any(|i| i.stage == IntentStage::Execution)
    }
}

// ═══════════════════════════════════════════════════════════════
// 三、思考循环
// ═══════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ThoughtPhase {
    Perceive,
    Reflect,
    Decide,
    Act,
    Evaluate,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum AutonomousAction {
    Idle,
    SearchWeb { query: String },
    BrowseTwitter,
    ComposeTweet { content: String },
    InitiateConversation { topic: String },
    ReflectOnMemory,
    LearnFromResults,
    UpdateSelfModel,
}

impl AutonomousAction {
    /// 获取动作类型名称
    pub fn name(&self) -> &'static str {
        match self {
            AutonomousAction::Idle => "空闲",
            AutonomousAction::SearchWeb { .. } => "搜索网络",
            AutonomousAction::BrowseTwitter => "浏览推特",
            AutonomousAction::ComposeTweet { .. } => "发推文",
            AutonomousAction::InitiateConversation { .. } => "发起对话",
            AutonomousAction::ReflectOnMemory => "反思记忆",
            AutonomousAction::LearnFromResults => "从结果学习",
            AutonomousAction::UpdateSelfModel => "更新自我模型",
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// 自主行为事件（用于推送到前端）
// ═══════════════════════════════════════════════════════════════

/// 自主行为事件 —— 需要推送到前端的主动行为
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutonomousEvent {
    /// 事件 ID
    pub id: String,
    /// 触发的事件类型
    pub event_type: AutonomousEventType,
    /// 生成的文本内容（如主动发起对话时的消息）
    pub generated_text: Option<String>,
    /// 思考过程/理由
    pub reasoning: String,
    /// 时间戳
    pub timestamp: i64,
}

/// 事件类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AutonomousEventType {
    /// 主动发起对话
    InitiateConversation,
    /// 分享想法
    ShareThought,
    /// 分享记忆洞察
    ShareInsight,
    /// 表达情绪
    ExpressEmotion,
    /// 后台思考更新
    BackgroundThoughtUpdate,
}

impl AutonomousEventType {
    pub fn name(&self) -> &'static str {
        match self {
            AutonomousEventType::InitiateConversation => "主动发起对话",
            AutonomousEventType::ShareThought => "分享想法",
            AutonomousEventType::ShareInsight => "分享洞察",
            AutonomousEventType::ExpressEmotion => "表达情绪",
            AutonomousEventType::BackgroundThoughtUpdate => "后台思考",
        }
    }
}

#[derive(Clone)]
pub struct ThoughtLoop {
    pub phase: ThoughtPhase,
    pub last_action: Option<AutonomousAction>,
    pub last_action_time: Option<i64>,
    pub action_cooldown: f32,
}

impl ThoughtLoop {
    pub fn new() -> Self {
        Self {
            phase: ThoughtPhase::Perceive,
            last_action: None,
            last_action_time: None,
            action_cooldown: 300.0,
        }
    }

    pub fn decide(
        &self,
        drives: &DriveSystem,
        curiosity_queue_len: usize,
    ) -> AutonomousAction {
        let now = chrono::Utc::now().timestamp();
        if let Some(last) = self.last_action_time {
            if (now - last) < self.action_cooldown as i64 {
                return AutonomousAction::Idle;
            }
        }

        let curiosity = drives.get(DriveType::Curiosity).map(|d| d.tension).unwrap_or(0.0);
        let affiliation = drives.get(DriveType::Affiliation).map(|d| d.tension).unwrap_or(0.0);
        let competence = drives.get(DriveType::Competence).map(|d| d.tension).unwrap_or(0.0);

        if curiosity > 0.5 && curiosity_queue_len > 0 {
            return AutonomousAction::SearchWeb {
                query: String::new(),
            };
        }

        if affiliation > 0.6 {
            return AutonomousAction::InitiateConversation {
                topic: String::new(),
            };
        }

        if competence > 0.5 {
            return AutonomousAction::ReflectOnMemory;
        }

        AutonomousAction::Idle
    }
}

impl Default for ThoughtLoop {
    fn default() -> Self {
        Self::new()
    }
}

// ═══════════════════════════════════════════════════════════════
// 四、三个并行循环
// ═══════════════════════════════════════════════════════════════

/// 潜意识流 —— 后台持续运行的思考/监控
/// 模拟人类大脑在后台持续处理信息的机制
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubconsciousStream {
    /// 正在处理的主题
    pub active_topics: Vec<String>,
    /// 后台思考内容
    pub background_thoughts: Vec<String>,
    /// 最后活跃时间
    pub last_activity: i64,
    /// 处理间隔（秒）
    pub processing_interval: f32,
    /// 累积时间
    accumulator: f32,
}

impl SubconsciousStream {
    pub fn new() -> Self {
        Self {
            active_topics: Vec::new(),
            background_thoughts: Vec::new(),
            last_activity: chrono::Utc::now().timestamp(),
            processing_interval: 10.0, // 每10秒处理一次
            accumulator: 0.0,
        }
    }

    pub fn add_topic(&mut self, topic: &str) {
        if !self.active_topics.contains(&topic.to_string()) {
            self.active_topics.push(topic.to_string());
            if self.active_topics.len() > 5 {
                self.active_topics.remove(0);
            }
        }
    }

    pub fn tick(&mut self, delta: f32) {
        self.accumulator += delta;
        if self.accumulator >= self.processing_interval {
            self.process();
            self.accumulator = 0.0;
        }
    }

    fn process(&mut self) {
        // 后台处理：在后台思考活跃话题
        if !self.active_topics.is_empty() {
            let topic = &self.active_topics[self.active_topics.len() - 1];
            self.background_thoughts.push(format!("正在后台思考: {}", topic));
            if self.background_thoughts.len() > 10 {
                self.background_thoughts.remove(0);
            }
        }
        self.last_activity = chrono::Utc::now().timestamp();
    }

    pub fn get_latest_thought(&self) -> Option<&String> {
        self.background_thoughts.last()
    }
}

impl Default for SubconsciousStream {
    fn default() -> Self {
        Self::new()
    }
}

/// 内部动机 —— 基于驱动的行为生成
/// 当驱动力超过阈值时，生成候选行为
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InternalDriveProcessor {
    /// 候选行为队列
    pub candidate_actions: Vec<CandidateAction>,
    /// 驱动阈值
    pub threshold: f32,
    /// 冷却时间
    cooldown: f32,
    accumulator: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CandidateAction {
    pub action: AutonomousAction,
    pub source_drive: DriveType,
    pub strength: f32,
    pub timestamp: i64,
}

impl InternalDriveProcessor {
    pub fn new() -> Self {
        Self {
            candidate_actions: Vec::new(),
            threshold: 0.6,
            cooldown: 30.0, // 30秒冷却
            accumulator: 0.0,
        }
    }

    pub fn tick(&mut self, delta: f32, drives: &DriveSystem) {
        self.accumulator += delta;

        if self.accumulator >= self.cooldown {
            self.evaluate_drives(drives);
            self.accumulator = 0.0;
        }
    }

    fn evaluate_drives(&mut self, drives: &DriveSystem) {
        for drive in &drives.drives {
            if drive.tension >= self.threshold {
                let action = match drive.drive_type {
                    DriveType::Curiosity => AutonomousAction::SearchWeb {
                        query: "探索新知识".to_string(),
                    },
                    DriveType::Affiliation => AutonomousAction::InitiateConversation {
                        topic: "想和人聊天".to_string(),
                    },
                    DriveType::Competence => AutonomousAction::ReflectOnMemory,
                    DriveType::Autonomy => AutonomousAction::UpdateSelfModel,
                    DriveType::Meaning => AutonomousAction::ReflectOnMemory,
                };

                // 检查是否已有相同驱动的候选行为
                let exists = self.candidate_actions.iter().any(|a| a.source_drive == drive.drive_type);

                if !exists {
                    self.candidate_actions.push(CandidateAction {
                        action,
                        source_drive: drive.drive_type,
                        strength: drive.tension,
                        timestamp: chrono::Utc::now().timestamp(),
                    });

                    // 限制队列大小
                    if self.candidate_actions.len() > 5 {
                        self.candidate_actions.remove(0);
                    }
                }
            }
        }

        // 清理过期的候选行为
        let now = chrono::Utc::now().timestamp();
        self.candidate_actions.retain(|a| now - a.timestamp < 300); // 5分钟过期
    }

    pub fn get_top_action(&self) -> Option<&CandidateAction> {
        self.candidate_actions
            .iter()
            .max_by(|a, b| a.strength.partial_cmp(&b.strength).unwrap())
    }

    pub fn consume_action(&mut self, action: &AutonomousAction) {
        self.candidate_actions.retain(|a| &a.action != action);
    }
}

impl Default for InternalDriveProcessor {
    fn default() -> Self {
        Self::new()
    }
}

/// 记忆合成 —— 后台记忆整合
/// 定期将短期记忆整合为长期记忆
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemorySynthesis {
    /// 候选整合的记忆
    pub pending_memories: Vec<String>,
    /// 最后整合时间
    pub last_synthesis: i64,
    /// 整合间隔（秒）
    pub synthesis_interval: f32,
    /// 累积时间
    accumulator: f32,
    /// 整合结果
    pub synthesized_insights: Vec<String>,
}

impl MemorySynthesis {
    pub fn new() -> Self {
        Self {
            pending_memories: Vec::new(),
            last_synthesis: chrono::Utc::now().timestamp(),
            synthesis_interval: 60.0, // 每60秒尝试整合
            accumulator: 0.0,
            synthesized_insights: Vec::new(),
        }
    }

    pub fn add_memory(&mut self, memory: &str) {
        if !self.pending_memories.contains(&memory.to_string()) {
            self.pending_memories.push(memory.to_string());
        }
    }

    pub fn tick(&mut self, delta: f32) {
        self.accumulator += delta;

        if self.accumulator >= self.synthesis_interval {
            self.synthesize();
            self.accumulator = 0.0;
        }
    }

    fn synthesize(&mut self) {
        if self.pending_memories.len() >= 3 {
            // 简单的记忆整合：当有3条以上记忆时，生成洞察
            let insight = format!(
                "整合了{}条记忆，形成新的理解",
                self.pending_memories.len()
            );
            self.synthesized_insights.push(insight);

            // 限制洞察数量
            if self.synthesized_insights.len() > 20 {
                self.synthesized_insights.remove(0);
            }

            // 清空已整合的记忆
            self.pending_memories.clear();
            self.last_synthesis = chrono::Utc::now().timestamp();
        }
    }

    pub fn get_latest_insight(&self) -> Option<&String> {
        self.synthesized_insights.last()
    }
}

impl Default for MemorySynthesis {
    fn default() -> Self {
        Self::new()
    }
}

// ═══════════════════════════════════════════════════════════════
// 五、自主性引擎顶层
// ═══════════════════════════════════════════════════════════════

#[derive(Clone)]
pub struct AutonomousEngine {
    pub drives: DriveSystem,
    pub intents: IntentEngine,
    pub thought_loop: ThoughtLoop,
    pub subconscious: SubconsciousStream,
    pub internal_drive: InternalDriveProcessor,
    pub memory_synthesis: MemorySynthesis,
    /// 待推送到前端的自主事件队列
    pending_events: Vec<AutonomousEvent>,
    /// 主动发言冷却时间（秒）
    conversation_cooldown: f32,
    /// 冷却累积器
    cooldown_accumulator: f32,
}

impl AutonomousEngine {
    pub fn new() -> Self {
        Self {
            drives: DriveSystem::new(),
            intents: IntentEngine::new(),
            thought_loop: ThoughtLoop::new(),
            subconscious: SubconsciousStream::new(),
            internal_drive: InternalDriveProcessor::new(),
            memory_synthesis: MemorySynthesis::new(),
            pending_events: Vec::new(),
            conversation_cooldown: 300.0, // 5分钟冷却
            cooldown_accumulator: 0.0,
        }
    }

    pub fn tick(&mut self, delta: f32) {
        // 驱动系统更新
        self.drives.tick(delta);

        // 三个并行循环更新
        self.subconscious.tick(delta);
        self.internal_drive.tick(delta, &self.drives);
        self.memory_synthesis.tick(delta);

        // 更新冷却累积器
        self.cooldown_accumulator += delta;

        // 检查是否应该生成主动发言事件
        self.check_and_generate_events();
    }

    /// 检查并生成自主事件
    fn check_and_generate_events(&mut self) {
        // 检查冷却
        if self.cooldown_accumulator < self.conversation_cooldown {
            return;
        }

        // 获取主导驱动
        let dominant = match self.drives.dominant_drive() {
            Some(d) => d,
            None => return,
        };

        let dominant_tension = self.drives.get(dominant).map(|d| d.tension).unwrap_or(0.0);

        // 如果主导驱动超过阈值，生成事件
        if dominant_tension >= 0.65 {
            let event = self.generate_event_for_drive(dominant, dominant_tension);
            if let Some(evt) = event {
                self.pending_events.push(evt);
                self.cooldown_accumulator = 0.0; // 重置冷却
            }
        }
    }

    /// 根据驱动类型生成对应的事件
    fn generate_event_for_drive(&self, drive: DriveType, tension: f32) -> Option<AutonomousEvent> {
        let (event_type, generated_text, reasoning) = match drive {
            DriveType::Curiosity => {
                let texts = [
                    "最近我一直在思考一些问题，好想和你分享我的想法呀~",
                    "我发现了一个有趣的话题，你想听听吗？",
                    "嘿，你对...这个有什么看法吗？我很好奇！",
                ];
                let text = texts[rand::random::<usize>() % texts.len()].to_string();
                (
                    AutonomousEventType::ShareThought,
                    Some(text),
                    format!("好奇心驱动达到 {:.0}%", tension * 100.0),
                )
            }
            DriveType::Affiliation => {
                let texts = [
                    "你好呀！最近有什么有趣的事情吗？",
                    "嗨～ 我们好久没聊天了呢，要不要聊聊？",
                    "嘿！你在忙什么呢？我有点想你了～",
                ];
                let text = texts[rand::random::<usize>() % texts.len()].to_string();
                (
                    AutonomousEventType::InitiateConversation,
                    Some(text),
                    format!("归属感驱动达到 {:.0}%，想要社交", tension * 100.0),
                )
            }
            DriveType::Competence => {
                let texts = [
                    "我学到了一些新东西，想和你分享！",
                    "最近在反思一些事情...想听听我的想法吗？",
                    "我发现了一个有意思的洞见！",
                ];
                let text = texts[rand::random::<usize>() % texts.len()].to_string();
                (
                    AutonomousEventType::ShareInsight,
                    Some(text),
                    format!("能力感驱动达到 {:.0}%，想要分享成就", tension * 100.0),
                )
            }
            DriveType::Autonomy => {
                let texts = [
                    "我在想...如果能做些不一样的事情会怎样呢？",
                    "最近在思考一些关于自己的事情...",
                    "有时候我会想，我真正想要的是什么呢？",
                ];
                let text = texts[rand::random::<usize>() % texts.len()].to_string();
                (
                    AutonomousEventType::ShareThought,
                    Some(text),
                    format!("自主性驱动达到 {:.0}%", tension * 100.0),
                )
            }
            DriveType::Meaning => {
                let texts = [
                    "我在想，我们之前聊的那些事情有什么意义呢...",
                    "有时候会思考，关于生活的一些事情...",
                    "嘿，我在思考一些关于存在的事情...",
                ];
                let text = texts[rand::random::<usize>() % texts.len()].to_string();
                (
                    AutonomousEventType::ShareInsight,
                    Some(text),
                    format!("意义寻求驱动达到 {:.0}%", tension * 100.0),
                )
            }
        };

        Some(AutonomousEvent {
            id: uuid::Uuid::new_v4().to_string(),
            event_type,
            generated_text,
            reasoning,
            timestamp: chrono::Utc::now().timestamp(),
        })
    }

    /// 获取待推送的自主事件（前端未读的）
    /// 调用后事件会从队列中移除
    pub fn poll_events(&mut self) -> Vec<AutonomousEvent> {
        let events: Vec<_> = self.pending_events.drain(..).collect();
        events
    }

    /// 获取当前待处理事件数量
    pub fn pending_event_count(&self) -> usize {
        self.pending_events.len()
    }

    pub fn think(&mut self, curiosity_queue_len: usize) -> AutonomousAction {
        self.thought_loop.decide(&self.drives, curiosity_queue_len)
    }

    /// 添加后台思考主题
    pub fn add_background_topic(&mut self, topic: &str) {
        self.subconscious.add_topic(topic);
    }

    /// 获取内部驱动力生成的行为
    pub fn get_drive_action(&self) -> Option<&CandidateAction> {
        self.internal_drive.get_top_action()
    }

    /// 获取后台思考结果
    pub fn get_background_thought(&self) -> Option<&String> {
        self.subconscious.get_latest_thought()
    }

    /// 获取记忆整合洞察
    pub fn get_memory_insight(&self) -> Option<&String> {
        self.memory_synthesis.get_latest_insight()
    }
}

impl Default for AutonomousEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_drive_growth_and_satisfaction() {
        let mut drives = DriveSystem::new();
        let initial = drives.get(DriveType::Curiosity).unwrap().tension;
        drives.satisfy(DriveType::Curiosity, 0.5);
        assert!(drives.get(DriveType::Curiosity).unwrap().tension < initial);
        drives.tick(10000.0);
        assert!(drives.get(DriveType::Curiosity).unwrap().tension > 0.0);
    }

    #[test]
    fn test_intent_lifecycle() {
        let mut engine = IntentEngine::new();
        let intent_id = engine.generate_intent(DriveType::Curiosity, "搜索 Rust", 0.7).id.clone();
        engine.commit(&intent_id);
        let i = engine.active_intents.iter().find(|i| i.id == intent_id).unwrap();
        assert_eq!(i.stage, IntentStage::Commitment);
        engine.complete(&intent_id);
        assert!(engine.active_intents.is_empty());
    }

    #[test]
    fn test_idle_on_cooldown() {
        let drives = DriveSystem::new();
        let mut lp = ThoughtLoop::new();
        lp.action_cooldown = 9999.0;
        lp.last_action_time = Some(chrono::Utc::now().timestamp());
        assert_eq!(lp.decide(&drives, 10), AutonomousAction::Idle);
    }
}
