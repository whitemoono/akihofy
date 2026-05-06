use serde::{Deserialize, Serialize};
use super::PADState;

#[derive(Debug, Clone, Serialize, Deserialize)]
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
        let neutral = PADState::neutral();
        let distance = current.distance(&neutral);
        let is_high_emotion = distance > 0.7;
        let effective_decay = if is_high_emotion {
            self.decay_rate * 0.5
        } else {
            self.decay_rate
        } * delta_seconds;

        PADState {
            pleasure: self.decay_value(current.pleasure, effective_decay),
            arousal: self.decay_value(current.arousal, effective_decay),
            dominance: self.decay_value(current.dominance, effective_decay),
        }
    }

    fn decay_value(&self, value: f32, decay: f32) -> f32 {
        if value.abs() < self.min_threshold {
            return 0.0;
        }
        let sign = value.signum();
        let abs = value.abs();
        let new_abs = (abs - decay).max(0.0);
        sign * new_abs.min(abs)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decay() {
        let inertia = EmotionInertia::default();
        let high_joy = PADState { pleasure: 0.8, arousal: 0.5, dominance: 0.3 };
        let decayed = inertia.apply_decay(&high_joy, 1.0);
        assert!(decayed.pleasure < high_joy.pleasure);
    }

    #[test]
    fn test_inertia_update() {
        let inertia = EmotionInertia::default();
        let current = PADState::neutral();
        let target = PADState { pleasure: 0.5, arousal: 0.3, dominance: 0.2 };
        let updated = inertia.update(&current, &target);
        assert!(updated.pleasure > 0.0);
        assert!(updated.pleasure < 0.5);
    }
}
