// 生理系统 —— 活动驱动的四池资源预算模型
// 对应设计文档: docs/subsystem_design/04_body_system.md（简化版）

use serde::{Deserialize, Serialize};
use chrono::Timelike;

/// 四个资源池
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourcePools {
    pub cognitive: ResourcePool,
    pub social: ResourcePool,
    pub emotional: ResourcePool,
    pub creative: ResourcePool,
}

/// 单个资源池
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourcePool {
    pub pool_type: PoolType,
    pub current: f32,
    pub max_capacity: f32,
    pub base_recovery_rate: f32,
    pub fatigue: f32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PoolType {
    Cognitive,
    Social,
    Emotional,
    Creative,
}

impl ResourcePool {
    pub fn new(pool_type: PoolType, recovery_rate: f32) -> Self {
        Self {
            pool_type,
            current: 1.0,
            max_capacity: 1.0,
            base_recovery_rate: recovery_rate,
            fatigue: 0.0,
        }
    }

    pub fn consume(&mut self, amount: f32) {
        self.current = (self.current - amount).max(0.0);
        self.fatigue = (self.fatigue + amount * 0.3).min(1.0);
    }

    pub fn recover(&mut self, delta: f32, baseline: f32, quality_mult: f32) {
        let depth_factor = if self.current < 0.2 {
            0.6 // 深度消耗后恢复慢
        } else if self.current < 0.5 {
            1.5 // 轻度消耗后恢复快
        } else {
            1.0
        };

        let recovery = self.base_recovery_rate
            * baseline
            * quality_mult
            * depth_factor
            * delta;
        self.current = (self.current + recovery).min(self.max_capacity);
        self.fatigue = (self.fatigue - recovery * 0.1).max(0.0);
    }
}

impl ResourcePools {
    pub fn new() -> Self {
        Self {
            cognitive: ResourcePool::new(PoolType::Cognitive, 0.015),
            social: ResourcePool::new(PoolType::Social, 0.010),
            emotional: ResourcePool::new(PoolType::Emotional, 0.008),
            creative: ResourcePool::new(PoolType::Creative, 0.006),
        }
    }

    pub fn overall_energy(&self) -> f32 {
        (self.cognitive.current + self.social.current + self.emotional.current + self.creative.current) / 4.0
    }

    pub fn dominant_fatigue(&self) -> PoolType {
        let pools = [
            (PoolType::Cognitive, self.cognitive.fatigue),
            (PoolType::Social, self.social.fatigue),
            (PoolType::Emotional, self.emotional.fatigue),
            (PoolType::Creative, self.creative.fatigue),
        ];
        pools
            .iter()
            .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap())
            .map(|(t, _)| *t)
            .unwrap_or(PoolType::Cognitive)
    }

    pub fn set_energy(&mut self, energy: f32) {
        let delta = energy - self.overall_energy();
        let pool_delta = delta / 4.0;
        self.cognitive.current = (self.cognitive.current + pool_delta).clamp(0.0, 1.0);
        self.social.current = (self.social.current + pool_delta).clamp(0.0, 1.0);
        self.emotional.current = (self.emotional.current + pool_delta).clamp(0.0, 1.0);
        self.creative.current = (self.creative.current + pool_delta).clamp(0.0, 1.0);
    }
}

impl Default for ResourcePools {
    fn default() -> Self {
        Self::new()
    }
}

// ─── 活动消耗注册表 ───

#[derive(Debug, Clone)]
pub struct ActivityCost {
    pub cognitive: f32,
    pub social: f32,
    pub emotional: f32,
    pub creative: f32,
}

impl ActivityCost {
    pub fn new(cognitive: f32, social: f32, emotional: f32, creative: f32) -> Self {
        Self { cognitive, social, emotional, creative }
    }
}

#[derive(Debug, Clone)]
pub struct ActivityCostRegistry {
    costs: std::collections::HashMap<String, ActivityCost>,
}

impl ActivityCostRegistry {
    pub fn new() -> Self {
        let mut costs = std::collections::HashMap::new();
        costs.insert("idle".into(), ActivityCost::new(0.0, 0.0, 0.0, 0.0));
        costs.insert("chat".into(), ActivityCost::new(0.02, 0.03, 0.02, 0.0));
        costs.insert("deep_conversation".into(), ActivityCost::new(0.05, 0.06, 0.06, 0.01));
        costs.insert("compose_tweet".into(), ActivityCost::new(0.04, 0.02, 0.03, 0.06));
        costs.insert("browse_timeline".into(), ActivityCost::new(0.03, 0.01, 0.02, 0.0));
        costs.insert("search_web".into(), ActivityCost::new(0.06, 0.0, 0.01, 0.02));
        costs.insert("learn".into(), ActivityCost::new(0.08, 0.0, 0.02, 0.03));
        costs.insert("reflect".into(), ActivityCost::new(0.04, 0.0, 0.05, 0.02));
        costs.insert("create".into(), ActivityCost::new(0.05, 0.01, 0.04, 0.08));
        Self { costs }
    }

    pub fn get(&self, activity: &str) -> Option<&ActivityCost> {
        self.costs.get(activity)
    }
}

impl Default for ActivityCostRegistry {
    fn default() -> Self {
        Self::new()
    }
}

// ─── 休息质量 ───

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RestQuality {
    Idle,
    ActiveRest,
    SocialRecharge,
    DeepRest,
}

impl RestQuality {
    pub fn multiplier(&self, pool_type: PoolType) -> f32 {
        match (self, pool_type) {
            (RestQuality::Idle, _) => 1.0,
            (RestQuality::ActiveRest, PoolType::Creative) => 1.5,
            (RestQuality::ActiveRest, _) => 1.3,
            (RestQuality::SocialRecharge, PoolType::Social) => 1.5,
            (RestQuality::SocialRecharge, _) => 1.0,
            (RestQuality::DeepRest, _) => 2.0,
        }
    }
}

// ─── 恢复引擎 ───

#[derive(Clone)]
pub struct RecoveryEngine;

impl RecoveryEngine {
    pub fn new() -> Self {
        Self
    }

    pub fn calculate(
        &self,
        _pool_type: PoolType,
        current: f32,
        delta: f32,
        baseline: f32,
        quality_mult: f32,
    ) -> f32 {
        let base = 0.01 * baseline * quality_mult * delta;
        if current < 0.3 {
            base * 0.6 // 深度消耗恢复更慢
        } else if current < 0.6 {
            base * 1.5 // 轻度消耗恢复更快
        } else {
            base
        }
    }
}

impl Default for RecoveryEngine {
    fn default() -> Self {
        Self::new()
    }
}

// ─── 昼夜节律（4 段简化版）───

pub struct CircadianRhythm;

impl CircadianRhythm {
    /// (cognitive, social, emotional, creative)
    pub fn get_baseline(hour: u32) -> (f32, f32, f32, f32) {
        match hour {
            6..=11  => (1.0, 1.0, 1.0, 1.0),
            12..=17 => (0.9, 0.95, 0.95, 0.9),
            18..=22 => (0.9, 1.0, 1.0, 1.05),
            _       => (0.6, 0.3, 0.5, 0.8),
        }
    }

    pub fn is_rest_period(hour: u32) -> bool {
        hour >= 2 && hour <= 6
    }

    pub fn is_creative_peak(hour: u32) -> bool {
        hour <= 4 || (hour >= 18 && hour <= 22)
    }

    pub fn get_period_name(hour: u32) -> &'static str {
        match hour {
            6..=11  => "上午",
            12..=17 => "下午",
            18..=22 => "晚上",
            _       => "深夜",
        }
    }

    pub fn is_active_period(hour: u32) -> bool {
        (6..=22).contains(&hour)
    }
}

// ─── BodySystem 引擎 ───

#[derive(Clone)]
pub struct BodySystem {
    pub pools: ResourcePools,
    pub cost_registry: ActivityCostRegistry,
    pub recovery: RecoveryEngine,
    last_activity_time: std::time::Instant,
}

impl BodySystem {
    pub fn new() -> Self {
        Self {
            pools: ResourcePools::new(),
            cost_registry: ActivityCostRegistry::new(),
            recovery: RecoveryEngine::new(),
            last_activity_time: std::time::Instant::now(),
        }
    }

    /// 执行活动，消耗资源
    pub fn perform_activity(&mut self, activity: &str) {
        if let Some(cost) = self.cost_registry.get(activity) {
            self.pools.cognitive.consume(cost.cognitive);
            self.pools.social.consume(cost.social);
            self.pools.emotional.consume(cost.emotional);
            self.pools.creative.consume(cost.creative);
        }
        self.last_activity_time = std::time::Instant::now();
    }

    /// 主更新 tick
    pub fn tick(&mut self, delta: f32) {
        let hour = chrono::Local::now().hour();
        let (c_base, s_base, e_base, cr_base) = CircadianRhythm::get_baseline(hour);

        let idle = self.last_activity_time.elapsed().as_secs_f32();
        let rest_quality = if idle > 3600.0 && CircadianRhythm::is_rest_period(hour) {
            RestQuality::DeepRest
        } else if idle > 600.0 {
            RestQuality::ActiveRest
        } else {
            RestQuality::Idle
        };

        let quality_mult = rest_quality.multiplier(PoolType::Cognitive);

        self.pools.cognitive.recover(delta, c_base, quality_mult);
        self.pools.social.recover(delta, s_base, quality_mult);
        self.pools.emotional.recover(delta, e_base, quality_mult);
        self.pools.creative.recover(delta, cr_base, quality_mult);
    }

    /// 获取语言体现描述
    pub fn language_embodiment(&self) -> BodyLanguage {
        let energy = self.pools.overall_energy();

        let (description, hints) = if energy > 0.8 {
            ("精神饱满，思维活跃", vec!["活跃", "话多", "容易笑"])
        } else if energy > 0.5 {
            ("正常状态", vec!["正常"])
        } else if energy > 0.3 {
            ("有点疲惫", vec!["话少", "回复简短"])
        } else if energy > 0.1 {
            ("明显疲惫", vec!["反应慢", "句子短"])
        } else {
            ("接近枯竭", vec!["几乎不说话", "需要休息"])
        };

        BodyLanguage {
            energy_level: energy,
            description: description.into(),
            expression_hints: hints.into_iter().map(String::from).collect(),
        }
    }
}

impl Default for BodySystem {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BodyLanguage {
    pub energy_level: f32,
    pub description: String,
    pub expression_hints: Vec<String>,
}

// ─── 情绪-生理桥接（简化版，供 emotion 模块调用）───

impl BodySystem {
    /// 低能量对情绪的负面影响
    pub fn energy_emotion_impact(&self) -> f32 {
        let energy = self.pools.overall_energy();
        if energy < 0.2 {
            -(0.2 - energy) * 2.0
        } else if energy < 0.4 {
            -(0.4 - energy) * 1.0
        } else {
            0.0
        }
    }

    /// 获取当前能量水平（兼容 Python 侧旧 API）
    pub fn energy(&self) -> f32 {
        self.pools.overall_energy()
    }

    /// 获取总疲劳度（兼容旧 API）
    pub fn fatigue(&self) -> f32 {
        self.pools.cognitive.fatigue.max(
            self.pools.social.fatigue.max(
                self.pools.emotional.fatigue.max(self.pools.creative.fatigue),
            ),
        )
    }

    /// 获取饥饿/需求程度（基于四池总消耗推导）
    pub fn hunger(&self) -> f32 {
        let avg_pool = (self.pools.cognitive.current
            + self.pools.social.current
            + self.pools.emotional.current
            + self.pools.creative.current)
            / 4.0;
        1.0 - avg_pool
    }

    /// 获取舒适度（能量与疲劳的综合指标）
    pub fn comfort(&self) -> f32 {
        let energy = self.energy();
        let fatigue = self.fatigue();
        (energy + (1.0 - fatigue)) / 2.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_activity_consumption() {
        let mut body = BodySystem::new();
        let initial = body.pools.overall_energy();
        assert!(initial > 0.95);

        body.perform_activity("deep_conversation");
        assert!(body.pools.overall_energy() < initial);
    }

    #[test]
    fn test_nonlinear_recovery() {
        let mut body = BodySystem::new();
        body.pools.cognitive.current = 0.85;
        // Recovery at high energy should be slow (depth_factor = 1.0)
        body.tick(60.0);
        assert!(body.pools.cognitive.current >= 0.85);

        // Depleted pools should recover over long periods
        body.pools.cognitive.current = 0.2;
        body.tick(3600.0); // 1 hour — substantial recovery regardless of time of day
        assert!(body.pools.cognitive.current > 0.2, "depleted pool should recover after 1 hour");
    }

    #[test]
    fn test_circadian_baseline() {
        let (_, s_base, _, _) = CircadianRhythm::get_baseline(3);
        assert!(s_base < 0.5); // 凌晨 3 点社交基线低

        let (c_base, _, _, _) = CircadianRhythm::get_baseline(10);
        assert!(c_base > 0.9); // 上午是黄金时段
    }
}
