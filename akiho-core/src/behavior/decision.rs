use serde::{Deserialize, Serialize};
use super::Behavior;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BehaviorDecider {
    weights: BehaviorWeights,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BehaviorWeights {
    pub need_match: f32,
    pub energy_cost: f32,
    pub emotional_impact: f32,
}

impl Default for BehaviorDecider {
    fn default() -> Self {
        Self {
            weights: BehaviorWeights::default(),
        }
    }
}

impl Default for BehaviorWeights {
    fn default() -> Self {
        Self {
            need_match: 0.6,
            energy_cost: 0.2,
            emotional_impact: 0.2,
        }
    }
}

impl BehaviorDecider {
    pub fn select(&self, candidates: Vec<(&Behavior, f32)>, context: &DecisionContext) -> Option<String> {
        let mut scored: Vec<_> = candidates
            .into_iter()
            .map(|(behavior, base_score)| {
                let score = self.calculate_final_score(behavior, base_score, context);
                (behavior.id.clone(), score)
            })
            .collect();

        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        scored.into_iter().next().map(|(id, _)| id)
    }

    fn calculate_final_score(&self, behavior: &Behavior, base_score: f32, ctx: &DecisionContext) -> f32 {
        let need_score = base_score * self.weights.need_match;
        let energy_penalty = ctx.current_energy * self.weights.energy_cost;
        let emotional_bonus = ctx.emotional_intensity * self.weights.emotional_impact;

        need_score - energy_penalty + emotional_bonus
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionContext {
    pub current_energy: f32,
    pub emotional_intensity: f32,
    pub social_opportunity: f32,
    pub recent_behaviors: Vec<String>,
}

impl DecisionContext {
    pub fn from_system_state(state: &crate::SystemState) -> Self {
        Self {
            current_energy: state.energy,
            emotional_intensity: state.emotion.intensity(),
            social_opportunity: 0.5, // 简化
            recent_behaviors: Vec::new(),
        }
    }
}
