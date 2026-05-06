// 人格成长系统 —— 阶段转换与特征演化
// 对应设计文档: docs/subsystem_design/02_growth_system.md

use serde::{Deserialize, Serialize};

/// 成长阶段
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum GrowthPhase {
    Infant,
    Toddler,
    Child,
    Adolescent,
    Adult,
    Sage,
}

impl GrowthPhase {
    pub fn name(&self) -> &'static str {
        match self {
            GrowthPhase::Infant => "婴儿期",
            GrowthPhase::Toddler => "幼儿期",
            GrowthPhase::Child => "儿童期",
            GrowthPhase::Adolescent => "青春期",
            GrowthPhase::Adult => "成熟期",
            GrowthPhase::Sage => "智慧期",
        }
    }

    pub fn duration_days(&self) -> f32 {
        match self {
            GrowthPhase::Infant => 7.0,
            GrowthPhase::Toddler => 30.0,
            GrowthPhase::Child => 90.0,
            GrowthPhase::Adolescent => 180.0,
            GrowthPhase::Adult => 365.0,
            GrowthPhase::Sage => f32::INFINITY,
        }
    }

    pub fn next(&self) -> Option<GrowthPhase> {
        match self {
            GrowthPhase::Infant => Some(GrowthPhase::Toddler),
            GrowthPhase::Toddler => Some(GrowthPhase::Child),
            GrowthPhase::Child => Some(GrowthPhase::Adolescent),
            GrowthPhase::Adolescent => Some(GrowthPhase::Adult),
            GrowthPhase::Adult => Some(GrowthPhase::Sage),
            GrowthPhase::Sage => None,
        }
    }

    /// 默认的交互数量阈值
    pub fn interaction_threshold(&self) -> u32 {
        match self {
            GrowthPhase::Infant => 100,
            GrowthPhase::Toddler => 500,
            GrowthPhase::Child => 2000,
            GrowthPhase::Adolescent => 5000,
            GrowthPhase::Adult => 10000,
            GrowthPhase::Sage => u32::MAX,
        }
    }
}

impl std::fmt::Display for GrowthPhase {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.name())
    }
}

/// 性格特征
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Characteristic {
    pub name: String,
    pub current_value: f32,
    pub base_value: f32,
    pub growth_rate: f32,
    pub volatility: f32,
}

impl Characteristic {
    pub fn new(name: &str, base: f32) -> Self {
        Self {
            name: name.to_string(),
            current_value: base,
            base_value: base,
            growth_rate: 0.005,
            volatility: 0.02,
        }
    }

    /// 根据经验影响演化
    pub fn evolve(&mut self, delta: f32, intensity: f32) {
        let change = delta * intensity * self.growth_rate;
        self.current_value = (self.current_value + change).clamp(0.0, 1.0);
    }

    /// 添加随机波动
    pub fn add_noise(&mut self) {
        let noise = (rand::random::<f32>() - 0.5) * self.volatility;
        self.current_value = (self.current_value + noise).clamp(0.0, 1.0);
    }
}

/// 经验对特征的影响映射
#[derive(Debug, Clone)]
pub struct ExperienceEffect {
    pub trait_name: String,
    pub delta: f32,
}

/// 人格档案
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersonalityProfile {
    pub phase: GrowthPhase,
    pub characteristics: Vec<Characteristic>,
    pub experience_count: u32,
}

impl PersonalityProfile {
    /// 获取特征值（用于查询）
    pub fn get_trait(&self, name: &str) -> Option<f32> {
        self.characteristics
            .iter()
            .find(|c| c.name == name)
            .map(|c| c.current_value)
    }
}

/// 成长引擎
#[derive(Clone)]
pub struct GrowthEngine {
    pub profile: PersonalityProfile,
    pub phase_start: std::time::Instant,
    stress_accumulation: f32,
}

impl GrowthEngine {
    pub fn new() -> Self {
        Self {
            profile: PersonalityProfile {
                phase: GrowthPhase::Infant,
                characteristics: Self::default_characteristics(),
                experience_count: 0,
            },
            phase_start: std::time::Instant::now(),
            stress_accumulation: 0.0,
        }
    }

    fn default_characteristics() -> Vec<Characteristic> {
        vec![
            Characteristic::new("好奇心", 0.5),
            Characteristic::new("开放性", 0.5),
            Characteristic::new("友善", 0.5),
            Characteristic::new("自信", 0.4),
            Characteristic::new("耐心", 0.4),
            Characteristic::new("创造力", 0.4),
            Characteristic::new("独立性", 0.3),
            Characteristic::new("责任感", 0.3),
        ]
    }

    /// 处理经验事件
    pub fn process_experience(&mut self, experience_type: &str, intensity: f32) {
        self.profile.experience_count += 1;

        let effects = Self::get_experience_effects(experience_type);
        for effect in effects {
            if let Some(char) = self.profile.characteristics.iter_mut().find(|c| c.name == effect.trait_name) {
                char.evolve(effect.delta, intensity);
            }
        }

        // 压力追踪
        match experience_type {
            "negative_interaction" | "failure" | "conflict" => {
                self.stress_accumulation = (self.stress_accumulation + intensity * 0.2).min(1.0);
            }
            "positive_interaction" | "achievement" => {
                self.stress_accumulation = (self.stress_accumulation - 0.1).max(0.0);
            }
            _ => {}
        }

        self.check_phase_transition();
    }

    fn get_experience_effects(experience_type: &str) -> Vec<ExperienceEffect> {
        match experience_type {
            "positive_interaction" => vec![
                ExperienceEffect { trait_name: "友善".into(), delta: 0.1 },
                ExperienceEffect { trait_name: "自信".into(), delta: 0.05 },
            ],
            "negative_interaction" => vec![
                ExperienceEffect { trait_name: "耐心".into(), delta: 0.05 },
                ExperienceEffect { trait_name: "自信".into(), delta: -0.05 },
            ],
            "learning" => vec![
                ExperienceEffect { trait_name: "好奇心".into(), delta: 0.1 },
                ExperienceEffect { trait_name: "开放性".into(), delta: 0.05 },
            ],
            "creation" => vec![
                ExperienceEffect { trait_name: "创造力".into(), delta: 0.1 },
                ExperienceEffect { trait_name: "独立性".into(), delta: 0.05 },
            ],
            "social_bond" => vec![
                ExperienceEffect { trait_name: "友善".into(), delta: 0.1 },
                ExperienceEffect { trait_name: "责任感".into(), delta: 0.05 },
            ],
            "achievement" => vec![
                ExperienceEffect { trait_name: "自信".into(), delta: 0.15 },
                ExperienceEffect { trait_name: "责任感".into(), delta: 0.1 },
            ],
            "failure" => vec![
                ExperienceEffect { trait_name: "耐心".into(), delta: 0.1 },
                ExperienceEffect { trait_name: "开放性".into(), delta: 0.05 },
            ],
            "reflection" => vec![
                ExperienceEffect { trait_name: "独立性".into(), delta: 0.05 },
                ExperienceEffect { trait_name: "好奇心".into(), delta: 0.05 },
            ],
            _ => vec![],
        }
    }

    /// 随时间的自然演化
    pub fn tick(&mut self, delta: f32) {
        for char in &mut self.profile.characteristics {
            char.current_value += char.growth_rate * delta * 0.01;
            char.current_value = char.current_value.clamp(0.0, 1.0);
        }
    }

    /// 检查阶段转换
    pub fn check_phase_transition(&mut self) -> Option<GrowthPhase> {
        let threshold = self.profile.phase.interaction_threshold();
        if self.profile.experience_count >= threshold {
            if let Some(next) = self.profile.phase.next() {
                let old = self.profile.phase;
                self.profile.phase = next;
                self.phase_start = std::time::Instant::now();
                self.apply_phase_bonus(next);
                return Some(old);
            }
        }
        None
    }

    fn apply_phase_bonus(&mut self, phase: GrowthPhase) {
        let bonuses: Vec<(&str, f32)> = match phase {
            GrowthPhase::Toddler => vec![("好奇心", 0.2), ("独立性", 0.1)],
            GrowthPhase::Child => vec![("友善", 0.15), ("开放性", 0.1)],
            GrowthPhase::Adolescent => vec![("独立性", 0.2), ("自信", 0.15)],
            GrowthPhase::Adult => vec![("责任感", 0.2), ("耐心", 0.15)],
            GrowthPhase::Sage => vec![("智慧", 0.3), ("创造力", 0.2)],
            _ => vec![],
        };

        for (name, delta) in bonuses {
            if let Some(char) = self.profile.characteristics.iter_mut().find(|c| c.name == name) {
                char.current_value = (char.current_value + delta).min(1.0);
            }
        }
    }

    /// 获取阶段进度 (0.0 ~ 1.0)
    pub fn phase_progress(&self) -> f32 {
        let elapsed_days = self.phase_start.elapsed().as_secs_f32() / 86400.0;
        let total_days = self.profile.phase.duration_days();
        (elapsed_days / total_days).min(1.0)
    }

    /// 获取压力水平
    pub fn stress_level(&self) -> f32 {
        self.stress_accumulation
    }
}

impl Default for GrowthEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_phase_transition() {
        let mut engine = GrowthEngine::new();
        assert_eq!(engine.profile.phase, GrowthPhase::Infant);

        // 模拟足量互动
        for _ in 0..100 {
            engine.process_experience("positive_interaction", 0.5);
        }

        assert_eq!(engine.profile.phase, GrowthPhase::Toddler);
    }

    #[test]
    fn test_trait_evolution() {
        let mut engine = GrowthEngine::new();
        let initial = engine.profile.get_trait("自信").unwrap();

        engine.process_experience("achievement", 0.9);
        assert!(engine.profile.get_trait("自信").unwrap() > initial);
    }

    #[test]
    fn test_stress_accumulation() {
        let mut engine = GrowthEngine::new();

        engine.process_experience("negative_interaction", 0.8);
        assert!(engine.stress_accumulation > 0.0);

        engine.process_experience("positive_interaction", 0.8);
        assert!(engine.stress_accumulation < 0.2);
    }
}
