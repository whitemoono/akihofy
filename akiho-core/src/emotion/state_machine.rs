use crate::emotion::PADState;
use crate::emotion::EmotionState;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmotionStateMachine;

impl EmotionStateMachine {
    pub fn new() -> Self {
        Self
    }

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
        matches!(
            (from, to),
            (EmotionState::Neutral, _)
                | (EmotionState::Apathetic, EmotionState::Neutral)
                | (EmotionState::Apathetic, EmotionState::Positive)
                | (EmotionState::Positive, EmotionState::Mixed)
                | (EmotionState::Negative, EmotionState::Mixed)
                | (EmotionState::Mixed, EmotionState::Positive)
                | (EmotionState::Mixed, EmotionState::Negative)
        )
    }
}

impl Default for EmotionStateMachine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_state_classification() {
        let sm = EmotionStateMachine::new();

        let positive = PADState { pleasure: 0.5, arousal: 0.0, dominance: 0.0 };
        assert_eq!(sm.classify(&positive), EmotionState::Positive);

        let negative = PADState { pleasure: -0.5, arousal: 0.5, dominance: 0.0 };
        assert_eq!(sm.classify(&negative), EmotionState::Negative);

        let neutral = PADState { pleasure: 0.0, arousal: 0.0, dominance: 0.0 };
        assert_eq!(sm.classify(&neutral), EmotionState::Neutral);

        let apathetic = PADState { pleasure: 0.0, arousal: -0.5, dominance: 0.0 };
        assert_eq!(sm.classify(&apathetic), EmotionState::Apathetic);
    }

    #[test]
    fn test_transition_rules() {
        let sm = EmotionStateMachine::new();

        assert!(sm.transition(EmotionState::Neutral, EmotionState::Positive));
        assert!(sm.transition(EmotionState::Mixed, EmotionState::Positive));
        assert!(!sm.transition(EmotionState::Positive, EmotionState::Neutral));
    }
}
