# 生理系统详细设计（资源预算模型）

> **对应设计文档章节**: 六（生理系统）
> **优先级**: P1
> **核心变更**: 从"时间驱动"改为"活动驱动"，从"模拟生理"改为"资源预算"

---

## 一、设计目标

构建一个**活动驱动的资源预算系统**，替代原有的时间线性衰减模型：

- 能量不是随时间减少——是被**具体的活动**消耗
- 疲劳不是均匀累积——不同活动产生不同类型的疲劳
- 恢复不是线性——取决于消耗深度、时段、休息质量
- 无实体不是问题——资源预算是对"处理能力"的建模，不依赖肉体

---

## 二、四池资源模型

### 2.1 资源池定义

```rust
/// 四个独立的资源池
#[derive(Debug, Clone)]
pub struct ResourcePools {
    pub cognitive: ResourcePool,   // 认知预算
    pub social: ResourcePool,      // 社交预算
    pub emotional: ResourcePool,   // 情绪预算
    pub creative: ResourcePool,    // 创造预算
}

/// 单个资源池
#[derive(Debug, Clone)]
pub struct ResourcePool {
    pub name: PoolType,
    pub current: f32,          // 当前水平 [0, 1]
    pub max_capacity: f32,     // 最大容量（可被设备状态影响）
    pub base_recovery_rate: f32, // 基础恢复速率 (/s)
    pub depletion_history: VecDeque<DepletionRecord>,  // 消耗历史（用于曲线分析）
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PoolType {
    Cognitive,
    Social,
    Emotional,
    Creative,
}

impl ResourcePools {
    pub fn new() -> Self {
        Self {
            cognitive: ResourcePool::new(PoolType::Cognitive, 0.015),
            social:    ResourcePool::new(PoolType::Social,    0.010),
            emotional: ResourcePool::new(PoolType::Emotional, 0.008),
            creative:  ResourcePool::new(PoolType::Creative,  0.006),
        }
    }

    /// 综合能量 = 最弱的池
    pub fn overall_energy(&self) -> f32 {
        self.cognitive.current
            .min(self.social.current)
            .min(self.emotional.current)
            .min(self.creative.current)
    }

    /// 主导疲劳类型
    pub fn dominant_fatigue(&self) -> PoolType {
        let pools = [
            (PoolType::Cognitive, self.cognitive.current),
            (PoolType::Social, self.social.current),
            (PoolType::Emotional, self.emotional.current),
        ];
        pools.into_iter()
            .min_by(|a, b| a.1.partial_cmp(&b.1).unwrap())
            .map(|(t, _)| t)
            .unwrap()
    }
}
```

### 2.2 资源池特性

| 池 | 消耗于 | 恢复速度 | 耗尽后表现 |
|----|--------|----------|-----------|
| 认知 | 深度思考、观点形成、学习 | 快 (0.015/s) | 反应慢、走神、"让我想想" |
| 社交 | 对话回复、群聊、处理@ | 中 (0.010/s) | 话少、被动、不想主动 |
| 情绪 | 强烈情绪、共情、冲突 | 慢 (0.008/s) | 情绪钝化、不太笑、平静但冷淡 |
| 创造 | 发推、写作、创意表达 | 最慢 (0.006/s) | 思维枯竭、没有想说的话题 |

---

## 三、活动消耗引擎

### 3.1 活动消耗定义

```rust
/// 活动消耗——每执行一个具体动作的预算开支
#[derive(Debug, Clone)]
pub struct ActivityCost {
    pub cognitive: f32,
    pub social: f32,
    pub emotional: f32,
    pub creative: f32,
}

/// 活动消耗上下文——用于计算个性化消耗
#[derive(Debug, Clone)]
pub struct ActivityContext {
    /// 当前用户亲密度 (0.0 ~ 1.0)
    pub intimacy: f32,

    /// 当前能量水平 (0.0 ~ 1.0)
    pub energy_level: f32,

    /// 当前情绪唤醒度 (0.0 ~ 1.0)
    pub emotional_arousal: f32,

    /// 当前人格阶段
    pub growth_phase: GrowthPhase,

    /// 是否为重要关系用户
    pub is_important_relationship: bool,

    /// 一天中的小时 (0 ~ 23)
    pub hour: u32,
}

/// 个性化活动消耗计算器
pub struct ActivityCostCalculator {
    /// 基础消耗注册表
    base_registry: ActivityCostRegistry,

    /// 亲密度对社交消耗的影响
    intimacy_social_modifier: f32,

    /// 疲惫状态对认知消耗的影响
    fatigue_cognitive_modifier: f32,

    /// 情绪唤醒对消耗的影响
    arousal_modifier: f32,
}

impl ActivityCostCalculator {
    pub fn new() -> Self {
        Self {
            base_registry: ActivityCostRegistry::new(),
            intimacy_social_modifier: 1.2,  // 熟人对话更消耗情感
            fatigue_cognitive_modifier: 1.5,  // 疲惫时思考更消耗
            arousal_modifier: 1.3,           // 高唤醒状态消耗增加
        }
    }

    /// 计算个性化活动消耗
    pub fn calculate(&self, activity: &str, context: &ActivityContext) -> ActivityCost {
        let base = self.base_registry.get(activity)
            .cloned()
            .unwrap_or_else(|| ActivityCost::zero());

        // 用户亲密度影响社交/情感消耗
        let intimacy_modifier = if context.is_important_relationship || context.intimacy > 0.7 {
            // 熟人/重要关系：深度对话更消耗情感
            if activity.contains("deep") || activity.contains("conversation") {
                1.3
            } else {
                1.15
            }
        } else if context.intimacy < 0.2 {
            // 陌生人：表面社交消耗较少
            0.7
        } else {
            1.0
        };

        // 疲惫状态影响认知消耗
        let fatigue_modifier = if context.energy_level < 0.3 {
            self.fatigue_cognitive_modifier  // 疲惫时深度思考更消耗
        } else if context.energy_level < 0.5 {
            1.2
        } else {
            1.0
        };

        // 高唤醒状态增加额外消耗
        let arousal_mult = if context.emotional_arousal > 0.7 {
            self.arousal_modifier
        } else if context.emotional_arousal > 0.5 {
            1.15
        } else {
            1.0
        };

        // 人格阶段影响
        let phase_modifier = self.get_phase_modifier(context.growth_phase, activity);

        // 时段影响（深夜社交消耗降低）
        let time_modifier = if context.hour >= 22 || context.hour < 6 {
            if activity.contains("social") || activity.contains("conversation") {
                0.8  // 深夜社交能量降低
            } else {
                1.0
            }
        } else {
            1.0
        };

        let combined_modifier = intimacy_modifier * phase_modifier * time_modifier;

        ActivityCost {
            cognitive: base.cognitive * fatigue_modifier,
            social: base.social * combined_modifier,
            emotional: base.emotional * intimacy_modifier * arousal_mult,
            creative: base.creative,
        }
    }

    /// 根据人格阶段获取修饰符
    fn get_phase_modifier(&self, phase: GrowthPhase, activity: &str) -> f32 {
        match phase {
            GrowthPhase::Infant => {
                // 婴儿期：对一切都更敏感，消耗略高
                if activity.contains("emotional") || activity.contains("social") {
                    1.2
                } else {
                    1.1
                }
            }
            GrowthPhase::Adolescent => {
                // 青春期：情绪消耗增加
                if activity.contains("emotional") {
                    1.3
                } else {
                    1.0
                }
            }
            GrowthPhase::Sage => {
                // 智慧期：情绪处理更高效，消耗降低
                if activity.contains("emotional") || activity.contains("social") {
                    0.8
                } else {
                    1.0
                }
            }
            _ => 1.0,
        }
    }
}

impl Default for ActivityCostCalculator {
    fn default() -> Self {
        Self::new()
    }
}
```

### 3.2 消耗变化趋势

活动消耗应随连续同类活动递增：

```rust
/// 连续活动跟踪器
pub struct ConsecutiveActivityTracker {
    /// 最近的活动序列
    recent_activities: VecDeque<(String, usize)>,  // (活动名, 连续次数)
    max_tracked: usize,
}

impl ConsecutiveActivityTracker {
    pub fn new() -> Self {
        Self {
            recent_activities: VecDeque::new(),
            max_tracked: 20,
        }
    }

    /// 记录活动并返回连续次数
    pub fn record(&mut self, activity: &str) -> usize {
        // 查找是否有相同活动
        let count = if let Some((_, c)) = self.recent_activities.iter_mut()
            .find(|(a, _)| a == activity) {
            *c + 1
        } else {
            1
        };

        // 更新记录
        self.recent_activities.retain(|(a, _)| a != activity);
        self.recent_activities.push_front((activity.to_string(), count));

        // 限制大小
        while self.recent_activities.len() > self.max_tracked {
            self.recent_activities.pop_back();
        }

        count
    }

    /// 获取活动的连续次数（用于计算边际消耗递增）
    pub fn get_consecutive_count(&self, activity: &str) -> usize {
        self.recent_activities.iter()
            .find(|(a, _)| a == activity)
            .map(|(_, c)| *c)
            .unwrap_or(0)
    }
}

/// 边际消耗递增计算
pub struct MarginalCostCalculator {
    /// 基础边际递增率
    base_marginal_rate: f32,

    /// 最大边际倍率
    max_marginal_multiplier: f32,
}

impl MarginalCostCalculator {
    pub fn new() -> Self {
        Self {
            base_marginal_rate: 0.15,  // 每次连续增加 15%
            max_marginal_multiplier: 2.0,  // 最多增加 100%
        }
    }

    /// 计算边际消耗倍率
    pub fn calculate_multiplier(&self, consecutive_count: usize) -> f32 {
        if consecutive_count <= 1 {
            1.0
        } else {
            let multiplier = 1.0 + (consecutive_count as f32 - 1.0) * self.base_marginal_rate;
            multiplier.min(self.max_marginal_multiplier)
        }
    }
}
```

### 3.2 消耗的边际递增

重复同类活动时，消耗不是线性的——模拟"做同一件事越久越累"：

```rust
impl ResourcePool {
    /// 消耗资源，带边际递增
    pub fn consume_with_fatigue(&mut self, amount: f32) {
        // 当前消耗越深，后续消耗越大
        let depletion = 1.0 - self.current;
        let fatigue_multiplier = 1.0 + depletion * 0.5;  // 最深时 1.5×

        let actual_cost = amount * fatigue_multiplier;
        self.current = (self.current - actual_cost).max(0.05);  // 不下零，保留 5% 应急
    }
}
```

---

## 四、恢复动力学

### 4.1 非线性恢复

```rust
pub struct RecoveryEngine {
    base_rates: HashMap<PoolType, f32>,
}

impl RecoveryEngine {
    pub fn new() -> Self {
        let mut base_rates = HashMap::new();
        base_rates.insert(PoolType::Cognitive, 0.015);
        base_rates.insert(PoolType::Social,    0.010);
        base_rates.insert(PoolType::Emotional, 0.008);
        base_rates.insert(PoolType::Creative,  0.006);
        Self { base_rates }
    }

    /// 计算恢复量
    ///
    /// recovery = base_rate × speed_factor × circadian × rest_quality × delta
    ///
    /// speed_factor: 消耗浅时快速回弹（1.5×），消耗深时慢恢复（0.6×）
    pub fn calculate(
        &self,
        pool_type: PoolType,
        current_level: f32,
        idle_seconds: f32,
        circadian_factor: f32,
        rest_quality: f32,
    ) -> f32 {
        let base = self.base_rates.get(&pool_type).copied().unwrap_or(0.01);

        let depletion = 1.0 - current_level;
        let speed_factor = if depletion < 0.3 {
            1.5   // 浅消耗 → 快速回弹
        } else if depletion < 0.6 {
            1.0   // 正常
        } else {
            0.6   // 深消耗 → 慢恢复
        };

        base * speed_factor * circadian_factor * rest_quality * idle_seconds
    }
}
```

### 4.2 休息深度

```rust
#[derive(Debug, Clone, Copy)]
pub enum RestQuality {
    Idle,            // 基础空闲 → 1.0×
    ActiveRest,      // 积极休息（被动消费内容）→ 1.3×
    SocialRecharge,  // 社交充电（愉快的轻松互动）→ 1.5×（仅社交池）
    DeepRest,        // 深度休息（长时间无活动/夜间）→ 2.0×
}

impl RestQuality {
    pub fn multiplier(&self, pool_type: PoolType) -> f32 {
        match self {
            RestQuality::Idle => 1.0,
            RestQuality::ActiveRest => 1.3,
            RestQuality::SocialRecharge => {
                if pool_type == PoolType::Social { 1.5 } else { 1.0 }
            }
            RestQuality::DeepRest => 2.0,
        }
    }
}
```

---

## 五、昼夜节律

### 5.1 基线倍率

```rust
/// 昼夜节律——资源池的时间偏好（简化为 4 段）
pub struct CircadianRhythm;

impl CircadianRhythm {
    /// 返回当前小时各池的基线倍率 (cognitive, social, emotional, creative)
    pub fn get_baseline(hour: u32) -> (f32, f32, f32, f32) {
        match hour {
            6..=11  => (1.0, 1.0, 1.0, 1.0),   // 上午：黄金时段
            12..=17 => (0.9, 0.95, 0.95, 0.9),  // 下午：轻微低迷后恢复
            18..=22 => (0.9, 1.0, 1.0, 1.05),   // 晚上：社交活跃，创造力上升
            23..=5  => (0.6, 0.3, 0.5, 0.8),    // 深夜：认知低，不想社交，创造力逆势上升
            _ => (1.0, 1.0, 1.0, 1.0),
        }
    }

    /// 当前是否是"应该休息"的时段
    pub fn is_rest_period(hour: u32) -> bool {
        hour >= 2 && hour <= 6
    }

    /// 判断是否是创造力高峰期
    pub fn is_creative_peak(hour: u32) -> bool {
        hour <= 4 || (hour >= 18 && hour <= 22)
    }
}

/// 昼夜节律对情绪的基线影响
impl CircadianRhythm {
    pub fn emotion_baseline(&self, hour: u32) -> PADState {
        match hour {
            6..=11 => PADState { pleasure: 0.1, arousal: 0.15, dominance: 0.1 },
            12..=17 => PADState { pleasure: -0.02, arousal: 0.0, dominance: 0.0 },
            18..=22 => PADState { pleasure: 0.1, arousal: 0.1, dominance: 0.05 },
            23..=5 => PADState { pleasure: -0.1, arousal: -0.15, dominance: 0.0 },
            _ => PADState::neutral(),
        }
    }

    pub fn emotion_recovery_modifier(&self, hour: u32) -> f32 {
        match hour {
            6..=11 => 1.1,
            12..=17 => 0.9,
            18..=22 => 1.0,
            23..=5 => 1.3,  // 睡眠时情绪恢复快
            _ => 1.0,
        }
    }

    pub fn get_period_name(hour: u32) -> &'static str {
        match hour {
            6..=11 => "上午",
            12..=17 => "下午",
            18..=22 => "晚上",
            _ => "深夜",
        }
    }

    pub fn is_active_period(hour: u32) -> bool {
        (6..=22).contains(&hour)
    }
}

/// 昼夜节律与情绪系统整合
pub struct CircadianEmotionBridge {
    /// 昼夜节律影响是否启用
    enabled: bool,

    /// 情绪影响强度（0.0 ~ 1.0）
    influence_strength: f32,
}

impl CircadianEmotionBridge {
    pub fn new() -> Self {
        Self {
            enabled: true,
            influence_strength: 0.3,  // 昼夜节律对情绪的影响权重
        }
    }

    /// 应用昼夜节律对情绪的影响
    ///
    /// 昼夜节律是情绪的"背景色"，不是决定性因素
    pub fn apply_circadian_influence(
        &self,
        current_emotion: &mut PADState,
        hour: u32,
    ) {
        if !self.enabled {
            return;
        }

        let baseline = CircadianRhythm.emotion_baseline(hour);
        let recovery_mod = CircadianRhythm.emotion_recovery_modifier(hour);

        // 渐变影响，避免突变
        let influence = self.influence_strength * recovery_mod;

        current_emotion.pleasure += baseline.pleasure * influence * 0.1;
        current_emotion.arousal += baseline.arousal * influence * 0.1;

        // 限制范围
        current_emotion.pleasure = current_emotion.pleasure.clamp(-1.0, 1.0);
        current_emotion.arousal = current_emotion.arousal.clamp(-1.0, 1.0);
    }

    /// 获取昼夜节律对情绪的语言描述
    pub fn get_circadian_mood(&self, hour: u32) -> String {
        match hour {
            0..=5 => "深夜的宁静让人思绪万千".to_string(),
            6..=8 => "清晨的阳光让人充满希望".to_string(),
            9..=11 => "上午的黄金时光".to_string(),
            12..=13 => "午后的慵懒".to_string(),
            14..=17 => "下午的专注".to_string(),
            18..=21 => "夜晚的活力".to_string(),
            22..=23 => "夜幕降临，心绪渐平".to_string(),
            _ => String::new(),
        }
    }
}
```

---

## 六、系统整合

### 7.1 BodySystem 引擎

```rust
pub struct BodySystem {
    pub pools: ResourcePools,
    pub cost_registry: ActivityCostRegistry,
    pub recovery: RecoveryEngine,
    pub rhythm: CircadianRhythm,
    last_activity_time: std::time::Instant,
}

impl BodySystem {
    pub fn new() -> Self {
        Self {
            pools: ResourcePools::new(),
            cost_registry: ActivityCostRegistry::new(),
            recovery: RecoveryEngine::new(),
            rhythm: CircadianRhythm,
            last_activity_time: std::time::Instant::now(),
        }
    }

    /// 执行活动——消耗资源
    pub fn perform_activity(&mut self, activity: &str) {
        if let Some(cost) = self.cost_registry.get(activity) {
            self.pools.cognitive.consume_with_fatigue(cost.cognitive);
            self.pools.social.consume_with_fatigue(cost.social);
            self.pools.emotional.consume_with_fatigue(cost.emotional);
            self.pools.creative.consume_with_fatigue(cost.creative);
        }
        self.last_activity_time = std::time::Instant::now();
    }

    /// 主更新——恢复计算
    pub fn tick(&mut self, delta: f32) {
        let hour = chrono::Local::now().hour();
        let (c_base, s_base, e_base, cr_base) = CircadianRhythm::get_baseline(hour);

        let idle = self.last_activity_time.elapsed().as_secs_f32();

        // 判断休息深度
        let rest_quality = if idle > 3600.0 && CircadianRhythm::is_rest_period(hour) {
            RestQuality::DeepRest
        } else if idle > 600.0 {
            RestQuality::ActiveRest
        } else {
            RestQuality::Idle
        };

        let quality_mult = rest_quality.multiplier(PoolType::Cognitive);

        // 恢复各池
        let recover = |pool: &mut ResourcePool, baseline: f32| {
            let recovery = self.recovery.calculate(
                pool.pool_type,
                pool.current,
                delta,
                baseline,
                quality_mult,
            );
            pool.current = (pool.current + recovery).min(pool.max_capacity);
        };

        recover(&mut self.pools.cognitive, c_base);
        recover(&mut self.pools.social, s_base);
        recover(&mut self.pools.emotional, e_base);
        recover(&mut self.pools.creative, cr_base);
    }
}
```

### 6.2 语言体现

```rust
impl BodySystem {
    /// 将当前身体状态转为自然语言体现描述
    pub fn language_embodiment(&self) -> BodyLanguage {
        let energy = self.pools.overall_energy();
        let fatigue = self.pools.dominant_fatigue();

        let (description, expression_hints) = match (energy, fatigue) {
            (e, _) if e > 0.8 => (
                "精神饱满，思维活跃，说话利索",
                vec!["活跃", "话多", "容易笑", "反应快"]
            ),
            (e, _) if e > 0.5 => (
                "正常状态，无明显异常",
                vec!["正常"]
            ),
            (e, PoolType::Social) if e > 0.3 => (
                "社交能量偏低",
                vec!["话少", "简短回复", "不主动找话题", "可能用表情代替文字"]
            ),
            (e, PoolType::Cognitive) if e > 0.3 => (
                "脑力有点跟不上",
                vec!["反应慢半拍", "偶尔走神", "说话带'嗯…'", "需要想一下"]
            ),
            (e, PoolType::Emotional) if e > 0.3 => (
                "情绪有些钝化",
                vec!["不太笑", "语气平淡", "回应简单", "不是难过只是没力气管"]
            ),
            (e, _) if e > 0.1 => (
                "明显疲惫",
                vec!["打哈欠", "揉眼睛", "可能说'抱歉有点困'", "句子更短"]
            ),
            _ => (
                "接近枯竭",
                vec!["'对不起…我现在脑子不太转得动'", "几乎不说话", "明显需要休息"]
            ),
        };

        BodyLanguage {
            energy_level: energy,
            description: description.into(),
            expression_hints: expression_hints.into_iter().map(String::from).collect(),
            dominant_fatigue: format!("{:?}", fatigue),
        }
    }
}

pub struct BodyLanguage {
    pub energy_level: f32,
    pub description: String,
    pub expression_hints: Vec<String>,
    pub dominant_fatigue: String,
}
```

---

## 七、测试用例

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_activity_consumption() {
        let mut body = BodySystem::new();

        let initial = body.pools.overall_energy();
        assert!(initial > 0.95); // 初始接近满

        // 一次深度对话消耗明显
        body.perform_activity("deep_conversation");
        assert!(body.pools.overall_energy() < initial);

        // 发推比对话消耗更多创造预算
        let creative_before = body.pools.creative.current;
        body.perform_activity("compose_tweet");
        assert!(body.pools.creative.current < creative_before);
    }

    #[test]
    fn test_nonlinear_recovery() {
        let mut body = BodySystem::new();

        // 轻度消耗后快速恢复
        body.pools.cognitive.current = 0.85;
        body.tick(60.0); // 1 分钟
        assert!(body.pools.cognitive.current > 0.85);

        // 深度消耗后慢恢复
        body.pools.cognitive.current = 0.2;
        body.tick(60.0);
        let after_minute = body.pools.cognitive.current;
        body.tick(600.0); // 再加 10 分钟
        assert!(body.pools.cognitive.current > after_minute);
        assert!(body.pools.cognitive.current < 0.5); // 仍然没恢复到一半
    }

    #[test]
    fn test_circadian_effect() {
        // 深夜时社交基线低
        let (_, s_base, _, _) = CircadianRhythm::get_baseline(3);
        assert!(s_base < 0.5); // 凌晨 3 点社交基线 < 0.5

        // 上午是黄金时段
        let (c_base, _, _, _) = CircadianRhythm::get_baseline(10);
        assert!(c_base > 0.9);
    }
}
```

---

## 八、与 Python 引擎的集成

```python
# Python 侧通过 PyO3 调用

from akiho_core import PyBodySystem

class BodyManager:
    """Python 侧的生理管理器包装"""

    def __init__(self):
        self._rust = PyBodySystem()

    def record_activity(self, activity: str):
        """记录一次活动消耗"""
        self._rust.perform_activity(activity)

    def update(self, delta: float):
        """主更新——恢复计算"""
        self._rust.tick(delta)

    @property
    def energy(self) -> float:
        return self._rust.overall_energy()

    @property
    def embodiment(self) -> dict:
        """获取当前状态的语言体现提示"""
        return self._rust.language_embodiment()

    # 未来：切换到真实设备只需替换 telemetry
    def switch_to_real_device(self, device_type: str, config: dict):
        if device_type == "android":
            telemetry = PyAndroidTelemetry(config)
        elif device_type == "desktop":
            telemetry = PyDesktopTelemetry()
        else:
            raise ValueError(f"Unknown device: {device_type}")
        self._rust = PyBodySystem(telemetry)
```

---

*文档版本: 2.0.0*
*最后更新: 2026-05-05*
*对应引擎模块: akiho-core/src/body.rs (待完整实现), engine/body.py (待重构)*
