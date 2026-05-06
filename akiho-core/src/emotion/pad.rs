use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct PADState {
    pub pleasure: f32,    // P: -1.0 ~ +1.0
    pub arousal: f32,     // A: -1.0 ~ +1.0
    pub dominance: f32,   // D: -1.0 ~ +1.0
}

impl PADState {
    pub fn neutral() -> Self {
        Self {
            pleasure: 0.0,
            arousal: 0.0,
            dominance: 0.0,
        }
    }

    pub fn distance(&self, other: &PADState) -> f32 {
        let dp = self.pleasure - other.pleasure;
        let da = self.arousal - other.arousal;
        let dd = self.dominance - other.dominance;
        (dp * dp + da * da + dd * dd).sqrt()
    }

    pub fn intensity(&self) -> f32 {
        (self.pleasure.powi(2) + self.arousal.powi(2)).sqrt()
    }

    pub fn clamp(&mut self) {
        self.pleasure = self.pleasure.clamp(-1.0, 1.0);
        self.arousal = self.arousal.clamp(-1.0, 1.0);
        self.dominance = self.dominance.clamp(-1.0, 1.0);
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EmotionCategory {
    Neutral,
    Anger,
    Fear,
    Sadness,
    Joy,
    Surprise,
    Disgust,
    Submission,
    Serenity,
    Boredom,
    Anxiety,
}

pub struct PADMapper;

impl PADMapper {
    pub const EMOTION_MAP: &'static [(EmotionCategory, f32, f32, f32)] = &[
        (EmotionCategory::Anger,     -0.51,  0.59,  0.25),
        (EmotionCategory::Fear,      -0.64,  0.60, -0.43),
        (EmotionCategory::Sadness,   -0.30, -0.20, -0.50),
        (EmotionCategory::Joy,        0.81,  0.46,  0.45),
        (EmotionCategory::Surprise,   0.40,  0.67, -0.13),
        (EmotionCategory::Disgust,   -0.60,  0.35,  0.30),
        (EmotionCategory::Submission, -0.36, -0.19, -0.57),
        (EmotionCategory::Serenity,    0.57, -0.33,  0.25),
        (EmotionCategory::Boredom,   -0.32, -0.62, -0.12),
        (EmotionCategory::Anxiety,    -0.40,  0.62, -0.42),
    ];

    pub fn find_nearest(&self, pad: &PADState) -> EmotionCategory {
        let mut min_dist = f32::MAX;
        let mut nearest = EmotionCategory::Neutral;

        for (cat, p, a, d) in Self::EMOTION_MAP {
            let dist = ((pad.pleasure - p).powi(2)
                      + (pad.arousal - a).powi(2)
                      + (pad.dominance - d).powi(2)).sqrt();
            if dist < min_dist {
                min_dist = dist;
                nearest = *cat;
            }
        }
        nearest
    }

    pub fn intensity(&self, pad: &PADState) -> f32 {
        pad.intensity()
    }
}
