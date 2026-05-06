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

#[derive(Debug, Clone, PartialEq, Eq)]
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
// 四、自主性引擎顶层
// ═══════════════════════════════════════════════════════════════

#[derive(Clone)]
pub struct AutonomousEngine {
    pub drives: DriveSystem,
    pub intents: IntentEngine,
    pub thought_loop: ThoughtLoop,
}

impl AutonomousEngine {
    pub fn new() -> Self {
        Self {
            drives: DriveSystem::new(),
            intents: IntentEngine::new(),
            thought_loop: ThoughtLoop::new(),
        }
    }

    pub fn tick(&mut self, delta: f32) {
        self.drives.tick(delta);
    }

    pub fn think(&mut self, curiosity_queue_len: usize) -> AutonomousAction {
        self.thought_loop.decide(&self.drives, curiosity_queue_len)
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
