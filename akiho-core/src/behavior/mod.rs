pub mod registry;
pub mod decision;

pub use registry::{BehaviorRegistry, Behavior, BehaviorCategory, Requirement, ActiveBehavior};
pub use decision::{BehaviorDecider, DecisionContext, BehaviorWeights};

use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::time::Duration;

const MAX_HISTORY: usize = 100;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BehaviorEngine {
    registry: BehaviorRegistry,
    decider: BehaviorDecider,
    active: Vec<ActiveBehavior>,
    queue: Vec<Behavior>,
    history: VecDeque<BehaviorHistoryEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct BehaviorHistoryEntry {
    behavior_id: String,
    timestamp: i64,
    success: bool,
}

impl BehaviorEngine {
    pub fn new() -> Self {
        Self {
            registry: BehaviorRegistry::new(),
            decider: BehaviorDecider::default(),
            active: Vec::new(),
            queue: Vec::new(),
            history: VecDeque::with_capacity(MAX_HISTORY),
        }
    }

    pub fn get_registry(&self) -> &BehaviorRegistry {
        &self.registry
    }

    pub fn get_active(&self) -> &[ActiveBehavior] {
        &self.active
    }

    pub fn can_start_new_behavior(&self) -> bool {
        self.active.len() < 3
    }

    pub fn decide_next_behavior(&mut self, state: &crate::SystemState) -> Option<Behavior> {
        let candidates = self.registry.get_available(state);

        if candidates.is_empty() {
            return None;
        }

        let context = DecisionContext::from_system_state(state);

        self.decider
            .select(candidates, &context)
            .and_then(|id| self.registry.get(&id).cloned())
    }

    pub fn start_behavior(&mut self, behavior: Behavior) {
        // 检查是否已在执行
        if self.active.iter().any(|a| a.behavior_id == behavior.id) {
            return;
        }

        // 中断低优先级行为
        self.active.retain(|a| {
            if let Some(b) = self.registry.get(&a.behavior_id) {
                b.priority <= behavior.priority || !a.can_interrupt
            } else {
                true
            }
        });

        // 启动新行为
        self.active.push(ActiveBehavior::new(&behavior));
        self.registry.start_cooldown(&behavior.id);
    }

    pub fn interrupt_behavior(&mut self, behavior_id: &str) {
        self.active.retain(|a| a.behavior_id != behavior_id);
    }

    pub fn update(&mut self, delta: Duration) {
        // 更新活跃行为进度
        for active in &mut self.active {
            active.update(delta);
        }

        // 移除已完成的行为
        let completed: Vec<_> = self.active.iter()
            .filter(|a| a.is_complete())
            .map(|a| a.behavior_id.clone())
            .collect();

        for id in &completed {
            self.active.retain(|a| &a.behavior_id != id);
            self.record_completion(id);
        }

        // 处理队列
        if let Some(queued) = self.queue.pop() {
            if self.can_start_new_behavior() {
                self.start_behavior(queued);
            }
        }
    }

    fn record_completion(&mut self, behavior_id: &str) {
        if self.history.len() >= MAX_HISTORY {
            self.history.pop_front();
        }
        self.history.push_back(BehaviorHistoryEntry {
            behavior_id: behavior_id.to_string(),
            timestamp: chrono::Utc::now().timestamp(),
            success: true,
        });
    }
}

impl Default for BehaviorEngine {
    fn default() -> Self {
        Self::new()
    }
}

