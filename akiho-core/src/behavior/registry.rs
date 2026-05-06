use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;

use chrono::Utc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BehaviorRegistry {
    behaviors: HashMap<String, Behavior>,
    cooldowns: HashMap<String, i64>,
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
            requirements: vec![],
        });

        self.register(Behavior {
            id: "socialize".to_string(),
            name: "社交互动".to_string(),
            category: BehaviorCategory::Belonging,
            priority: 0.7,
            activation_threshold: 0.4,
            duration: Duration::from_secs(600),
            cooldown: Duration::from_secs(300),
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
            requirements: vec![Requirement::MinEnergy(0.5)],
        });
    }

    pub fn register(&mut self, behavior: Behavior) {
        self.behaviors.insert(behavior.id.clone(), behavior);
    }

    pub fn get(&self, id: &str) -> Option<&Behavior> {
        self.behaviors.get(id)
    }

    pub fn get_all(&self) -> impl Iterator<Item = &Behavior> {
        self.behaviors.values()
    }

    pub fn start_cooldown(&mut self, id: &str) {
        self.cooldowns.insert(id.to_string(), Utc::now().timestamp());
    }

    pub fn is_in_cooldown(&self, id: &str) -> bool {
        if let Some(start) = self.cooldowns.get(id) {
            if let Some(behavior) = self.behaviors.get(id) {
                let elapsed_secs = Utc::now().timestamp() - start;
                return std::time::Duration::from_secs(elapsed_secs as u64) < behavior.cooldown;
            }
        }
        false
    }

    pub fn get_available(&self, state: &crate::SystemState) -> Vec<(&Behavior, f32)> {
        self.behaviors
            .values()
            .filter(|b| !self.is_in_cooldown(&b.id))
            .filter(|b| b.requirements.iter().all(|r| r.satisfied(state)))
            .map(|b| {
                let score = b.calculate_priority(state);
                (b, score)
            })
            .filter(|(_, score)| *score > 0.0)
            .collect()
    }
}

impl Default for BehaviorRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Behavior {
    pub id: String,
    pub name: String,
    pub category: BehaviorCategory,
    pub priority: f32,
    pub activation_threshold: f32,
    pub duration: Duration,
    pub cooldown: Duration,
    pub requirements: Vec<Requirement>,
}

impl Behavior {
    pub fn calculate_priority(&self, state: &crate::SystemState) -> f32 {
        // 简化计算：基础优先级 * 能量因子
        let energy_factor = state.energy * 0.5 + 0.5;
        self.priority * energy_factor
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum BehaviorCategory {
    Physiological = 1,
    Safety = 2,
    Belonging = 3,
    Esteem = 4,
    SelfActualization = 5,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Requirement {
    MinEnergy(f32),
    MinMood(f32),
    MaxFatigue(f32),
    MinTrust(f32),
}

impl Requirement {
    pub fn satisfied(&self, state: &crate::SystemState) -> bool {
        match self {
            Requirement::MinEnergy(e) => state.energy >= *e,
            Requirement::MinMood(m) => state.emotion.pleasure >= *m,
            Requirement::MaxFatigue(f) => state.fatigue <= *f,
            Requirement::MinTrust(_) => true, // 简化
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ActiveBehavior {
    pub behavior_id: String,
    pub started_at: i64,
    pub duration: Duration,
    pub progress: f32,
    pub can_interrupt: bool,
}

impl ActiveBehavior {
    pub fn new(behavior: &Behavior) -> Self {
        Self {
            behavior_id: behavior.id.clone(),
            started_at: Utc::now().timestamp(),
            duration: behavior.duration,
            progress: 0.0,
            can_interrupt: behavior.requirements.is_empty(),
        }
    }

    pub fn is_complete(&self) -> bool {
        self.progress >= 1.0
    }

    pub fn update(&mut self, delta: Duration) {
        let elapsed = delta.as_secs_f32();
        let total = self.duration.as_secs_f32();
        if total > 0.0 {
            self.progress = (self.progress + elapsed / total).min(1.0);
        }
    }
}
