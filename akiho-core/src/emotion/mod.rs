pub mod pad;
pub mod inertia;

use serde::{Deserialize, Serialize};
pub use pad::{PADState, EmotionCategory, PADMapper};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EmotionState {
    Neutral,
    Positive,
    Negative,
    Mixed,
    Apathetic,
}

impl std::fmt::Display for EmotionState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EmotionState::Neutral => write!(f, "Neutral"),
            EmotionState::Positive => write!(f, "Positive"),
            EmotionState::Negative => write!(f, "Negative"),
            EmotionState::Mixed => write!(f, "Mixed"),
            EmotionState::Apathetic => write!(f, "Apathetic"),
        }
    }
}

pub mod state_machine;
pub use state_machine::EmotionStateMachine;
pub use inertia::EmotionInertia;

use std::collections::VecDeque;

const MAX_HISTORY: usize = 100;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmotionEngine {
    current_state: PADState,
    previous_state: PADState,
    emotion_state: EmotionState,
    inertia: EmotionInertia,
    state_machine: EmotionStateMachine,
    history: VecDeque<EmotionSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct EmotionSnapshot {
    timestamp: i64,
    state: PADState,
    stimulus: String,
}

impl EmotionEngine {
    pub fn new() -> Self {
        Self {
            current_state: PADState::neutral(),
            previous_state: PADState::neutral(),
            emotion_state: EmotionState::Neutral,
            inertia: EmotionInertia::default(),
            state_machine: EmotionStateMachine::new(),
            history: VecDeque::with_capacity(MAX_HISTORY),
        }
    }

    pub fn get_state(&self) -> &PADState {
        &self.current_state
    }

    pub fn get_emotion_category(&self) -> EmotionState {
        self.emotion_state
    }

    pub fn update(&mut self, delta_seconds: f32) {
        self.current_state = self.inertia.apply_decay(&self.current_state, delta_seconds);
        self.emotion_state = self.state_machine.classify(&self.current_state);
    }

    pub fn process_stimulus(&mut self, stimulus: &EmotionStimulus) {
        self.previous_state = self.current_state;
        let target = stimulus.to_pad_state();
        self.current_state = self.inertia.update(&self.current_state, &target);
        self.emotion_state = self.state_machine.classify(&self.current_state);

        if self.history.len() >= MAX_HISTORY {
            self.history.pop_front();
        }
        self.history.push_back(EmotionSnapshot {
            timestamp: chrono::Utc::now().timestamp(),
            state: self.current_state,
            stimulus: stimulus.description(),
        });
    }

    pub fn history(&self) -> impl Iterator<Item = &EmotionSnapshot> {
        self.history.iter().rev()
    }
}

impl Default for EmotionEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Copy)]
pub enum EmotionStimulus {
    PositiveInteraction { intensity: f32 },
    NegativeInteraction { intensity: f32 },
    NeutralMessage { intensity: f32 },
    GoalAchieved { satisfaction: f32 },
    GoalFailed { frustration: f32 },
    Attention { value: f32 },
    Loneliness { intensity: f32 },
    TimeOfDay { factor: f32 },
    SessionDuration { fatigue: f32 },
}

impl EmotionStimulus {
    pub fn to_pad_state(&self) -> PADState {
        match self {
            EmotionStimulus::PositiveInteraction { intensity } => PADState {
                pleasure: 0.3 * intensity,
                arousal: 0.2 * intensity,
                dominance: 0.1 * intensity,
            },
            EmotionStimulus::NegativeInteraction { intensity } => PADState {
                pleasure: -0.3 * intensity,
                arousal: 0.3 * intensity,
                dominance: -0.2 * intensity,
            },
            EmotionStimulus::NeutralMessage { intensity: _ } => PADState::neutral(),
            EmotionStimulus::GoalAchieved { satisfaction } => PADState {
                pleasure: 0.4 * satisfaction,
                arousal: 0.2 * satisfaction,
                dominance: 0.3 * satisfaction,
            },
            EmotionStimulus::GoalFailed { frustration } => PADState {
                pleasure: -0.3 * frustration,
                arousal: 0.2 * frustration,
                dominance: -0.3 * frustration,
            },
            EmotionStimulus::Attention { value } => PADState {
                pleasure: 0.2 * value,
                arousal: 0.3 * value,
                dominance: 0.1 * value,
            },
            EmotionStimulus::Loneliness { intensity } => PADState {
                pleasure: -0.2 * intensity,
                arousal: -0.1 * intensity,
                dominance: -0.2 * intensity,
            },
            EmotionStimulus::TimeOfDay { factor } => PADState {
                pleasure: factor * 0.1,
                arousal: factor * -0.1,
                dominance: 0.0,
            },
            EmotionStimulus::SessionDuration { fatigue } => PADState {
                pleasure: 0.0,
                arousal: -0.2 * fatigue,
                dominance: -0.1 * fatigue,
            },
        }
    }

    pub fn description(&self) -> String {
        match self {
            EmotionStimulus::PositiveInteraction { .. } => "positive_interaction".to_string(),
            EmotionStimulus::NegativeInteraction { .. } => "negative_interaction".to_string(),
            EmotionStimulus::NeutralMessage { .. } => "neutral_message".to_string(),
            EmotionStimulus::GoalAchieved { .. } => "goal_achieved".to_string(),
            EmotionStimulus::GoalFailed { .. } => "goal_failed".to_string(),
            EmotionStimulus::Attention { .. } => "attention".to_string(),
            EmotionStimulus::Loneliness { .. } => "loneliness".to_string(),
            EmotionStimulus::TimeOfDay { .. } => "time_of_day".to_string(),
            EmotionStimulus::SessionDuration { .. } => "session_duration".to_string(),
        }
    }
}

