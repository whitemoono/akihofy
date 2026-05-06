# AKIHO 核心引擎算法文档

> 本文档详细描述 AKIHO 核心引擎中各子系统使用的核心算法，包括数学公式、实现细节和伪代码。

---

## 目录

1. [情绪系统算法](#一情绪系统算法)
2. [行为决策算法](#二行为决策算法)
3. [记忆系统算法](#三记忆系统算法)
4. [人格成长算法](#四人格成长算法)
5. [生理系统算法](#五生理系统算法)

---

## 一、情绪系统算法

### 1.1 PAD 三维情绪模型

#### 1.1.1 基本定义

PAD 模型使用三个维度描述情绪状态：

| 维度 | 符号 | 范围 | 含义 |
|------|------|------|------|
| 愉悦度 (Pleasure) | P | [-1.0, +1.0] | 情绪正负极性 |
| 唤醒度 (Arousal) | A | [-1.0, +1.0] | 激活/兴奋程度 |
| 支配度 (Dominance) | D | [-1.0, +1.0] | 对情绪的控制能力 |

#### 1.1.2 情绪状态分类算法

```python
def classify_emotion(p: float, a: float, d: float) -> str:
    """
    根据 PAD 值分类情绪状态

    Args:
        p: 愉悦度 [-1, 1]
        a: 唤醒度 [-1, 1]
        d: 支配度 [-1, 1]

    Returns:
        情绪类别字符串
    """
    abs_p = abs(p)
    abs_a = abs(a)
    abs_d = abs(d)

    # 分类规则
    if abs_p < 0.2 and abs_a < 0.2:
        return "neutral"      # 中性
    elif p > 0.3 and abs_a < 0.3:
        return "positive"     # 正面
    elif p < -0.3 and abs_a > 0.3:
        return "negative"    # 负面
    elif abs_p < 0.2 and a < -0.3:
        return "apathetic"   # 冷漠/厌倦
    else:
        return "mixed"       # 混合情绪
```

#### 1.1.3 PAD 值计算

情绪 PAD 值通过刺激加权和计算：

```
PAD(t) = PAD(t-1) * (1 - decay_rate) + Σ(stimulus_i * weight_i) * stimulus_rate
```

```python
class PADCalculator:
    def __init__(self):
        self.decay_rate = 0.1      # 自然衰减率
        self.stimulus_rate = 0.3   # 刺激影响系数

    def calculate(
        self,
        current_pad: Tuple[float, float, float],
        stimuli: List[Stimulus],
        delta_time: float
    ) -> Tuple[float, float, float]:
        """
        计算新的 PAD 值
        """
        p, a, d = current_pad

        # 自然衰减
        p *= (1 - self.decay_rate * delta_time)
        a *= (1 - self.decay_rate * delta_time)
        d *= (1 - self.decay_rate * delta_time)

        # 刺激叠加
        for stimulus in stimuli:
            effect = stimulus.get_pad_effect()
            weight = stimulus.weight * self.stimulus_rate

            p += effect[0] * weight * delta_time
            a += effect[1] * weight * delta_time
            d += effect[2] * weight * delta_time

        # 归一化到 [-1, 1]
        p = max(-1.0, min(1.0, p))
        a = max(-1.0, min(1.0, a))
        d = max(-1.0, min(1.0, d))

        return (p, a, d)
```

### 1.2 情绪惯性算法

情绪具有惯性特性，变化需要时间积累。

#### 1.2.1 惯性系数

```python
class EmotionInertia:
    def __init__(self):
        self.base_coefficient = 0.5      # 基础惯性系数
        self.intensity_weight = 0.3       # 强度权重
        self.duration_weight = 0.2        # 持续时间权重

    def calculate_coefficient(
        self,
        emotion_intensity: float,
        duration_seconds: float
    ) -> float:
        """
        计算当前惯性系数

        公式: coefficient = base * (1 + intensity * I_w + duration * D_w)
        """
        coefficient = self.base_coefficient * (
            1 +
            emotion_intensity * self.intensity_weight +
            min(duration_seconds / 3600, 1.0) * self.duration_weight  # 最多1小时
        )
        return min(coefficient, 1.0)  # 最大为 1.0
```

#### 1.2.2 惯性衰减

```python
def apply_inertia(
    current_value: float,
    target_value: float,
    coefficient: float,
    delta_time: float
) -> float:
    """
    应用情绪惯性

    公式: new_value = current + (target - current) * rate * delta

    其中 rate = (1 - coefficient) * max_change_rate
    """
    max_change_rate = 0.5  # 最大变化率

    rate = (1 - coefficient) * max_change_rate
    change = (target_value - current_value) * rate * delta_time

    return current_value + change
```

### 1.3 多源刺激整合

#### 1.3.1 刺激类型与 PAD 效果

| 刺激类型 | P 效果 | A 效果 | D 效果 | 示例 |
|----------|--------|--------|--------|------|
| positive | +0.6 | +0.2 | +0.1 | 赞美、成功 |
| negative | -0.6 | +0.3 | -0.2 | 批评、失败 |
| neutral | 0.0 | -0.1 | 0.0 | 日常对话 |
| achieved | +0.5 | +0.4 | +0.3 | 达成目标 |
| failed | -0.4 | +0.2 | -0.3 | 遭遇挫折 |
| attention | 0.0 | +0.5 | +0.1 | 被关注 |
| lonely | -0.3 | -0.2 | -0.2 | 感到孤独 |

#### 1.3.2 刺激整合算法

```python
def integrate_stimuli(stimuli: List[Stimulus]) -> Tuple[float, float, float]:
    """
    整合多个刺激的 PAD 效果

    使用加权平均，考虑刺激强度和时间衰减
    """
    total_weight = 0.0
    weighted_pad = (0.0, 0.0, 0.0)

    for stimulus in stimuli:
        # 时间衰减因子
        time_factor = math.exp(-stimulus.elapsed_time / stimulus.half_life)

        # 计算权重
        weight = stimulus.intensity * time_factor
        total_weight += weight

        # 累加加权 PAD
        effect = stimulus.pad_effect
        weighted_pad = (
            weighted_pad[0] + effect[0] * weight,
            weighted_pad[1] + effect[1] * weight,
            weighted_pad[2] + effect[2] * weight,
        )

    # 归一化
    if total_weight > 0:
        weighted_pad = tuple(v / total_weight for v in weighted_pad)

    return weighted_pad
```

---

## 二、行为决策算法

### 2.1 马斯洛需求优先级计算

#### 2.1.1 需求强度计算

```python
class MaslowHierarchy:
    """马斯洛需求层次"""

    NEEDS = {
        1: "physiological",      # 生理需求
        2: "safety",            # 安全需求
        3: "belonging",         # 归属需求
        4: "esteem",           # 尊重需求
        5: "self_actualization" # 自我实现
    }

    def calculate_need_intensity(self, need_type: str, state: Dict) -> float:
        """
        计算需求强度 [0, 1]

        公式: intensity = base_level * (1 - satisfaction) * urgency_factor
        """
        base_level = state.get(f"{need_type}_base", 0.5)
        satisfaction = state.get(f"{need_type}_satisfaction", 0.0)
        urgency = state.get(f"{need_type}_urgency", 1.0)

        intensity = base_level * (1 - satisfaction) * urgency
        return min(max(intensity, 0.0), 1.0)
```

#### 2.1.2 需求优先级

```
优先级 = 需求强度 × 层级系数 × 上下文系数

层级系数（低层级优先）:
- 生理需求: 1.0
- 安全需求: 0.9
- 归属需求: 0.8
- 尊重需求: 0.7
- 自我实现: 0.6
```

```python
HIERARCHY_WEIGHTS = {
    "physiological": 1.0,
    "safety": 0.9,
    "belonging": 0.8,
    "esteem": 0.7,
    "self_actualization": 0.6
}

def calculate_priority(need_type: str, intensity: float, context: float = 1.0) -> float:
    """
    计算行为优先级

    Returns:
        优先级分数 [0, 1]
    """
    hierarchy_weight = HIERARCHY_WEIGHTS.get(need_type, 0.5)
    return intensity * hierarchy_weight * context
```

### 2.2 行为选择算法

#### 2.2.1 行为评估

```python
@dataclass
class BehaviorEvaluation:
    behavior_id: str
    priority: float
    urgency: float
    feasibility: float
    expected_effect: Dict[str, float]
   的综合评分: float = 0.0

    def calculate_score(self) -> float:
        """
        综合评分公式

        score = w1 * priority + w2 * urgency + w3 * feasibility

        权重: w1=0.4, w2=0.3, w3=0.3
        """
        self.score = (
            0.4 * self.priority +
            0.3 * self.urgency +
            0.3 * self.feasibility
        )
        return self.score
```

#### 2.2.2 ε-贪心行为选择

```python
class BehaviorSelector:
    def __init__(self, epsilon: float = 0.1):
        self.epsilon = epsilon  # 探索概率

    def select(
        self,
        evaluations: List[BehaviorEvaluation]
    ) -> str:
        """
        ε-贪心行为选择

        以 ε 概率随机选择（探索）
        以 1-ε 概率选择最优（利用）
        """
        if random.random() < self.epsilon:
            # 探索：随机选择
            return random.choice(evaluations).behavior_id
        else:
            # 利用：选择评分最高的
            best = max(evaluations, key=lambda e: e.calculate_score())
            return best.behavior_id
```

### 2.3 冲突解决算法

当多个行为同时激活时，使用以下策略解决冲突：

#### 2.3.1 冲突解决优先级

```
1. 需求层级（低层级优先）
2. 紧迫性（高紧迫性优先）
3. 时间约束（紧急优先）
4. 历史冲突（避免重复）
```

```python
class ConflictResolver:
    def resolve(self, behaviors: List[ActiveBehavior]) -> ActiveBehavior:
        """
        解决行为冲突

        策略：
        1. 筛选有效行为
        2. 按优先级排序
        3. 选择最高优先级
        """
        # 过滤有效行为
        valid = [b for b in behaviors if self._is_valid(b)]

        if not valid:
            return None

        if len(valid) == 1:
            return valid[0]

        # 按优先级排序
        valid.sort(
            key=lambda b: (
                b.category_priority,  # 需求层级
                -b.urgency,          # 紧迫性（取负，高优先）
                -b.time_constraint   # 时间约束
            ),
            reverse=True
        )

        return valid[0]

    def _is_valid(self, behavior: ActiveBehavior) -> bool:
        """检查行为是否有效"""
        return (
            behavior.requirements_met and
            not behavior.in_cooldown and
            behavior.feasibility > 0.3
        )
```

---

## 三、记忆系统算法

### 3.1 向量相似度计算

#### 3.1.1 余弦相似度

```python
def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """
    计算两个向量的余弦相似度

    公式: cos(θ) = (A · B) / (||A|| × ||B||)

    Returns:
        相似度分数 [-1, 1]，通常为 [0, 1]
    """
    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot_product / (norm_a * norm_b)
```

#### 3.1.2 加权相似度

```python
def weighted_similarity(
    embedding_a: List[float],
    embedding_b: List[float],
    weights: List[float] = None
) -> float:
    """
    加权余弦相似度

    用于考虑不同维度的重要性
    """
    if weights is None:
        weights = [1.0] * len(embedding_a)

    # 加权向量
    weighted_a = [a * w for a, w in zip(embedding_a, weights)]
    weighted_b = [b * w for b, w in zip(embedding_b, weights)]

    return cosine_similarity(weighted_a, weighted_b)
```

### 3.2 记忆检索算法

#### 3.2.1 向量检索

```python
class MemoryRetriever:
    def __init__(self):
        self.top_k = 5
        self.similarity_threshold = 0.6

    def retrieve(
        self,
        query_embedding: List[float],
        memories: List[Memory],
        filters: Dict = None
    ) -> List[Memory]:
        """
        检索最相关的记忆

        算法：
        1. 过滤记忆
        2. 计算相似度
        3. 排序返回 Top-K
        """
        candidates = []

        for memory in memories:
            # 应用过滤器
            if filters and not self._passes_filters(memory, filters):
                continue

            # 计算相似度
            similarity = cosine_similarity(
                query_embedding,
                memory.embedding
            )

            if similarity >= self.similarity_threshold:
                # 应用衰减因子
                decay = self._calculate_decay(memory)
                effective_score = similarity * decay

                candidates.append((memory, effective_score))

        # 排序并返回 Top-K
        candidates.sort(key=lambda x: x[1], reverse=True)
        return [m for m, _ in candidates[:self.top_k]]

    def _calculate_decay(self, memory: Memory) -> float:
        """
        计算记忆衰减因子

        公式: decay = base_decay ^ (hours_elapsed / half_life)
        """
        base_decay = 0.9
        half_life_hours = 24 * 7  # 一周半衰期

        hours_elapsed = (datetime.now() - memory.created_at).total_seconds() / 3600
        decay = base_decay ** (hours_elapsed / half_life_hours)

        # 记忆巩固程度影响衰减
        consolidation_bonus = 1.0 + 0.2 * memory.consolidation_level
        decay *= consolidation_bonus

        return min(decay, 1.0)
```

#### 3.2.2 多路召回

```python
class HybridRetriever:
    def retrieve_hybrid(
        self,
        query: str,
        query_embedding: List[float],
        memories: List[Memory]
    ) -> List[Tuple[Memory, float]]:
        """
        混合检索：向量 + 关键词 + 元数据
        """
        results = []

        # 1. 向量检索
        vector_scores = self._vector_search(query_embedding, memories)

        # 2. 关键词检索
        keyword_scores = self._keyword_search(query, memories)

        # 3. 元数据过滤
        metadata_scores = self._metadata_search(memories)

        # 融合分数
        for memory in memories:
            vector_s = vector_scores.get(memory.id, 0)
            keyword_s = keyword_scores.get(memory.id, 0)
            meta_s = metadata_scores.get(memory.id, 0)

            # 加权融合
            final_score = (
                0.5 * vector_s +
                0.3 * keyword_s +
                0.2 * meta_s
            )

            if final_score > 0.3:
                results.append((memory, final_score))

        results.sort(key=lambda x: x[1], reverse=True)
        return results[:10]

    def _keyword_search(
        self,
        query: str,
        memories: List[Memory]
    ) -> Dict[str, float]:
        """BM25 关键词检索"""
        # 简化为词匹配
        query_words = set(query.lower().split())
        scores = {}

        for memory in memories:
            content_words = set(memory.content.lower().split())
            overlap = len(query_words & content_words)
            if overlap > 0:
                scores[memory.id] = overlap / len(query_words)

        return scores
```

### 3.3 遗忘算法

#### 3.3.1 指数衰减遗忘

```python
class ForgetfulnessModel:
    def __init__(self):
        self.base_forgetting_rate = 0.1    # 基础遗忘率
        self.importance_weight = 0.5        # 重要性权重

    def calculate_strength(
        self,
        memory: Memory,
        hours_elapsed: float
    ) -> float:
        """
        计算记忆强度（0-1）

        公式: strength = e^(-rate * t) * importance_boost

        其中 rate = base_rate * (1 - importance * w)
        """
        # 遗忘率：重要记忆遗忘慢
        rate = self.base_forgetting_rate * (
            1 - memory.importance * self.importance_weight
        )

        # 指数衰减
        strength = math.exp(-rate * hours_elapsed)

        # 检索强化：被检索后暂时增强
        if memory.retrieval_count > 0:
            retrieval_boost = min(memory.retrieval_count * 0.05, 0.3)
            strength = min(strength + retrieval_boost, 1.0)

        return strength

    def should_forget(self, memory: Memory) -> bool:
        """
        判断记忆是否应该被遗忘/删除
        """
        strength = self.calculate_strength(
            memory,
            (datetime.now() - memory.last_accessed).total_seconds() / 3600
        )

        return strength < 0.1  # 强度低于 10% 时可删除
```

### 3.4 记忆巩固算法

#### 3.4.1 巩固阶段

```python
class ConsolidationAlgorithm:
    def process_consolidation(
        self,
        memories: List[Memory],
        current_time: datetime
    ) -> List[Memory]:
        """
        记忆巩固处理
        """
        for memory in memories:
            if memory.consolidation_level >= ConsolidationLevel.Stable:
                continue

            hours_since_creation = (
                current_time - memory.created_at
            ).total_seconds() / 3600

            # 根据时间和条件升级巩固级别
            if memory.consolidation_level == ConsolidationLevel.New:
                if hours_since_creation > 6:
                    memory.consolidation_level = ConsolidationLevel.Labile

            elif memory.consolidation_level == ConsolidationLevel.Labile:
                if hours_since_creation > 24 and memory.emotional_tags:
                    memory.consolidation_level = ConsolidationLevel.Consolidating

            elif memory.consolidation_level == ConsolidationLevel.Consolidating:
                if hours_since_creation > 168:  # 一周
                    memory.consolidation_level = ConsolidationLevel.Stable

        return memories
```

---

## 四、人格成长算法

### 4.1 特征演化算法

#### 4.1.1 人格特征向量

```python
class PersonalityEvolution:
    """人格特征演化"""

    TRAITS = [
        "openness",           # 开放性
        "conscientiousness",  # 尽责性
        "extraversion",       # 外向性
        "agreeableness",      # 宜人性
        "neuroticism"         # 神经质
    ]

    def evolve_traits(
        self,
        current_traits: Dict[str, float],
        experiences: List[Experience],
        delta_days: float
    ) -> Dict[str, float]:
        """
        演化人格特征

        公式: new_trait = old_trait + Σ(experience_impact * learning_rate * time_factor)
        """
        learning_rate = 0.01  # 学习率
        new_traits = current_traits.copy()

        for trait in self.TRAITS:
            total_change = 0.0

            for exp in experiences:
                impact = exp.get_trait_impact(trait)
                time_factor = math.exp(-exp.age_days / 30)  # 近期经验影响更大

                total_change += impact * learning_rate * time_factor

            # 应用变化（限制范围）
            new_value = current_traits[trait] + total_change * delta_days
            new_traits[trait] = max(0.0, min(1.0, new_value))

        return new_traits
```

#### 4.1.2 经验影响计算

```python
def calculate_experience_impact(
    experience: Experience,
    trait: str,
    emotion_state: Dict
) -> float:
    """
    计算经验对特质的影响

    情感强度放大影响效果
    """
    base_impact = experience.trait_effects.get(trait, 0.0)

    # 情感调节因子
    emotion_multiplier = 1.0 + emotion_state["intensity"] * 0.5

    # 频率调节（频繁行为影响更大）
    frequency_factor = math.log1p(experience.count) / 10

    return base_impact * emotion_multiplier * (1 + frequency_factor)
```

### 4.2 阶段转换算法

#### 4.2.1 成长阶段定义

```python
class GrowthPhase:
    PHASES = {
        "infant": {
            "min_days": 0,
            "max_days": 7,
            "characteristics": {
                "vocabulary_size": 50,
                "behavior_complexity": 0.2,
                "emotion_depth": 0.3
            }
        },
        "toddler": {
            "min_days": 7,
            "max_days": 30,
            "characteristics": {
                "vocabulary_size": 200,
                "behavior_complexity": 0.4,
                "emotion_depth": 0.4
            }
        },
        "child": {
            "min_days": 30,
            "max_days": 180,
            "characteristics": {
                "vocabulary_size": 1000,
                "behavior_complexity": 0.6,
                "emotion_depth": 0.6
            }
        },
        "adolescent": {
            "min_days": 180,
            "max_days": 365,
            "characteristics": {
                "vocabulary_size": 5000,
                "behavior_complexity": 0.8,
                "emotion_depth": 0.8
            }
        },
        "adult": {
            "min_days": 365,
            "max_days": float('inf'),
            "characteristics": {
                "vocabulary_size": 10000,
                "behavior_complexity": 1.0,
                "emotion_depth": 1.0
            }
        }
    }

    def check_phase_transition(
        self,
        current_phase: str,
        age_days: float,
        metrics: Dict[str, float]
    ) -> Optional[str]:
        """
        检查是否应该转换阶段

        条件：
        1. 满足时间要求
        2. 满足特征指标要求
        """
        current = self.PHASES[current_phase]

        # 按顺序检查下一个阶段
        phases_order = list(self.PHASES.keys())
        current_idx = phases_order.index(current_phase)

        for next_phase in phases_order[current_idx + 1:]:
            next_def = self.PHASES[next_phase]

            # 检查时间要求
            if age_days < next_def["min_days"]:
                continue

            # 检查特征指标
            chars = next_def["characteristics"]
            if all(
                metrics.get(k, 0) >= v * 0.8  # 达到80%即可
                for k, v in chars.items()
            ):
                return next_phase

        return None  # 不转换
```

---

## 五、生理系统算法

### 5.1 能量模型

#### 5.1.1 能量计算

```python
class EnergyModel:
    def __init__(self):
        self.max_energy = 100.0
        self.base_decay_rate = 0.1        # 每秒基础消耗
        self.activity_multiplier = 1.5    # 活动时消耗倍率
        self.sleep_recovery_rate = 2.0    # 睡眠恢复速率

    def update_energy(
        self,
        current_energy: float,
        is_active: bool,
        is_sleeping: bool,
        delta_seconds: float
    ) -> float:
        """
        更新能量值

        公式:
        - 活跃时: energy -= base_rate * activity_mult * delta
        - 睡眠时: energy += sleep_rate * delta
        - 空闲时: energy -= base_rate * delta
        """
        if is_sleeping:
            # 睡眠恢复
            energy_change = self.sleep_recovery_rate * delta_seconds
        elif is_active:
            # 活动消耗
            energy_change = -self.base_decay_rate * self.activity_multiplier * delta_seconds
        else:
            # 空闲消耗
            energy_change = -self.base_decay_rate * delta_seconds

        new_energy = current_energy + energy_change
        return max(0.0, min(self.max_energy, new_energy))
```

#### 5.1.2 疲劳度计算

```python
class FatigueModel:
    def __init__(self):
        self.base_fatigue_rate = 0.05
        self.rest_recovery_rate = 0.1
        self.energy_threshold = 30.0  # 低能量时疲劳加速

    def calculate_fatigue(
        self,
        current_fatigue: float,
        energy: float,
        is_resting: bool,
        delta_seconds: float
    ) -> float:
        """
        计算疲劳度

        疲劳度受能量水平影响：
        - 能量低时疲劳增加更快
        - 休息时疲劳降低
        """
        if is_resting:
            # 休息恢复
            fatigue_change = -self.rest_recovery_rate * delta_seconds
        else:
            # 基础疲劳累积
            fatigue_change = self.base_fatigue_rate * delta_seconds

            # 低能量惩罚
            if energy < self.energy_threshold:
                energy_penalty = (self.energy_threshold - energy) / self.energy_threshold
                fatigue_change *= (1 + energy_penalty)

        new_fatigue = current_fatigue + fatigue_change
        return max(0.0, min(1.0, new_fatigue))
```

### 5.2 需求系统

#### 5.2.1 需求强度

```python
class NeedsSystem:
    NEEDS = {
        "energy": {"weight": 0.3, "threshold": 0.3},
        "social": {"weight": 0.25, "threshold": 0.4},
        "stimulation": {"weight": 0.2, "threshold": 0.5},
        "security": {"weight": 0.15, "threshold": 0.3},
        "achievement": {"weight": 0.1, "threshold": 0.4}
    }

    def calculate_needs(self, state: State) -> Dict[str, float]:
        """
        计算各需求的紧迫程度

        公式: need = max(0, (threshold - current) / threshold) * weight
        """
        needs = {}

        for need_name, config in self.NEEDS.items():
            current = getattr(state, need_name, 1.0)
            threshold = config["threshold"]
            weight = config["weight"]

            if current < threshold:
                urgency = (threshold - current) / threshold
            else:
                urgency = 0.0

            needs[need_name] = urgency * weight

        # 归一化
        total = sum(needs.values())
        if total > 0:
            needs = {k: v / total for k, v in needs.items()}

        return needs

    def get_dominant_need(self, needs: Dict[str, float]) -> str:
        """获取最紧迫的需求"""
        return max(needs, key=needs.get)
```

### 5.3 注意力分配

#### 5.3.1 注意力资源模型

```python
class AttentionModel:
    def __init__(self):
        self.total_attention = 1.0
        self.base_allocation = 0.3  # 基础注意力
        self.stimulus_threshold = 0.5

    def allocate_attention(
        self,
        stimuli: List[Stimulus],
        current_state: State
    ) -> Dict[str, float]:
        """
        分配注意力资源

        公式: attention_i = base + (salience_i / Σ salience) * (1 - base - reserved)
        """
        allocations = {}

        # 基础分配
        base = self.base_allocation
        reserved = 0.2  # 保留资源
        flexible = 1.0 - base - reserved

        # 计算各刺激的显著度
        saliences = {}
        for stim in stimuli:
            saliences[stim.id] = self._calculate_salience(
                stim,
                current_state
            )

        total_salience = sum(saliences.values())

        if total_salience > 0:
            for stim_id, salience in saliences.items():
                allocations[stim_id] = (
                    base +
                    (salience / total_salience) * flexible
                )
        else:
            # 无显著刺激，平均分配
            for stim in stimuli:
                allocations[stim.id] = (1.0 - reserved) / len(stimuli)

        return allocations

    def _calculate_salience(
        self,
        stimulus: Stimulus,
        state: State
    ) -> float:
        """
        计算刺激显著度

        公式: salience = intensity * novelty * relevance * emotional_weight
        """
        intensity = stimulus.intensity
        novelty = 1.0 - min(stimulus.familiarity, 1.0)  # 越熟悉越不显著
        relevance = stimulus.get_relevance_to_current_goal(state)
        emotion_weight = 1.0 + stimulus.emotional_intensity * 0.5

        return intensity * novelty * relevance * emotion_weight
```

---

## 六、意图生成算法

### 6.1 欲望-意图转换算法

#### 6.1.1 意图生成流程

```python
class IntentGenerator:
    """从欲望生成真实意图"""

    def __init__(self):
        self.deliberation_depth = 3
        self.impulsivity_factor = 0.2

    def desire_to_intent(self, desire: Desire, context: Context) -> Optional[Intent]:
        """
        将欲望转换为意图

        公式: intent = desire × deliberation_confidence × commitment_factor
        """
        # 检查欲望强度是否足够
        if desire.intensity < desire.threshold:
            return None

        # 生成意图
        intent = Intent(
            intent_type=IntentType.Want(desire.name),
            target=self.find_target(desire, context),
            intensity=desire.intensity,
            deliberation=self.deliberate(desire, context),
            commitment=self.calculate_commitment(desire, context),
        )

        return intent

    def deliberate(self, desire: Desire, context: Context) -> Deliberation:
        """权衡思考"""
        options = self.list_alternatives(desire)
        pros = self.analyze_pros(desire, context)
        cons = self.analyze_cons(desire, context)

        # 信心 = 优点数 / (优点数 + 缺点数 + 1)
        confidence = len(pros) / (len(pros) + len(cons) + 1)

        return Deliberation(
            considered_options=options,
            pros=pros,
            cons=cons,
            confidence=min(confidence, 1.0),
        )

    def calculate_commitment(self, desire: Desire, context: Context) -> Commitment:
        """计算承诺度"""
        # 承诺度 = 欲望强度 × 情境坚持因子
        strength = desire.intensity * context.persistency_tendency

        return Commitment(
            strength=strength,
            stickiness=self.calculate_stickiness(desire),
            resistance=0.5 + desire.intensity * 0.3,
        )
```

#### 6.1.2 承诺追踪算法

```python
class CommitmentTracker:
    """追踪意图承诺"""

    def will_persist(self, intent: Intent, distraction: Desire) -> bool:
        """
        判断意图是否会坚持

        条件: 诱惑强度 < 承诺抵抗度
        """
        temptation = distraction.intensity
        resistance = intent.commitment.stickiness * intent.commitment.strength

        return temptation < resistance

    def on_resisted(self, intent_id: str):
        """抵抗诱惑后，承诺度增强"""
        if intent_id in self.commitments:
            self.commitments[intent_id].strength *= 1.05
            self.commitments[intent_id].resistance *= 1.02
```

### 6.2 认知偏差算法

#### 6.2.1 偏差应用算法

```python
class CognitiveBiasApplicator:
    """认知偏差应用到推理过程"""

    BIAS_EFFECTS = {
        "confirmation": 1.2,     # 确认偏差：信心提升20%
        "recency": 1.15,        # 近因：权重提升15%
        "optimism": 1.1,        # 乐观：积极结论+10%
        "anchoring": 0.95,      # 锚定：向锚点调整5%
    }

    def apply_bias(self, inference: InferenceResult, bias_type: str) -> InferenceResult:
        """
        应用认知偏差

        公式: new_confidence = original × bias_effect
        """
        effect = self.BIAS_EFFECTS.get(bias_type, 1.0)

        inference.confidence = min(
            inference.confidence * effect,
            1.0
        )

        return inference
```

#### 6.2.2 偏差检测算法

```python
class BiasDetector:
    """检测应该激活的认知偏差"""

    def detect_biases(
        self,
        inference: InferenceResult,
        context: CognitiveContext
    ) -> List[Tuple[str, float]]:
        """
        检测触发的偏差

        返回: [(偏差类型, 强度), ...]
        """
        triggered = []

        # 检查确认偏差
        if context.current_belief:
            if self.supports_belief(inference, context.current_belief):
                triggered.append(("confirmation", 0.7))

        # 检查乐观偏差
        if inference.confidence > 0.6 and self.is_positive_conclusion(inference):
            triggered.append(("optimism", 0.5))

        # 检查近因偏差
        if self.has_recent_evidence(inference, context):
            triggered.append(("recency", 0.6))

        return triggered
```

### 6.3 意义赋予算法

#### 6.3.1 个人意义计算

```python
class MeaningCalculator:
    """为记忆赋予个人意义"""

    def calculate_significance(self, memory: Memory, context: Context) -> Significance:
        """
        计算记忆的个人意义

        公式: significance = importance × 0.3
                                 + self_relevance × 0.4
                                 + growth_connection × 0.3
        """
        importance = self.calc_importance(memory)
        self_relevance = self.calc_self_relevance(memory, context)
        growth = self.calc_growth_connection(memory, context)

        return Significance(
            importance=importance,
            self_relevance=self_relevance,
            growth_connection=growth,
            meaning_description=self.generate_description(memory, context),
        )

    def calc_importance(self, memory: Memory) -> float:
        """计算重要性"""
        base = memory.base_importance
        emotion_bonus = memory.emotional_intensity * 0.3
        context_bonus = 0.2 if memory.is_first_time else 0.0

        return min(base + emotion_bonus + context_bonus, 1.0)

    def calc_self_relevance(self, memory: Memory, context: Context) -> float:
        """计算自我相关性"""
        # 与自我认同相关 +0.3
        # 与核心价值观相关 +0.2
        # 与人生叙事相关 +0.2
        return 0.0  # 简化
```

### 6.4 转折点检测算法

#### 6.4.1 转折点识别

```python
class TurningPointDetector:
    """识别人生转折点"""

    def is_turning_point(
        self,
        event: Event,
        before: State,
        after: State
    ) -> bool:
        """
        判断是否为转折点

        条件（满足任一）：
        1. 变化幅度 > 阈值
        2. 情感强度 > 0.8
        3. 自我认知变化 > 0.5
        """
        change_magnitude = self.calc_change_magnitude(before, after)
        emotional_intensity = event.emotional_intensity
        identity_shift = self.calc_identity_shift(event)

        return (
            change_magnitude > 0.6
            or emotional_intensity > 0.8
            or identity_shift > 0.5
        )

    def calc_change_magnitude(self, before: State, after: State) -> float:
        """计算变化幅度"""
        identity_change = abs(after.identity - before.identity)
        relationship_change = abs(after.relationship - before.relationship)
        belief_change = abs(after.belief - before.belief)

        return (identity_change + relationship_change + belief_change) / 3.0
```

### 6.5 叙事提取算法

#### 6.5.1 故事片段提取

```python
class StoryExtractor:
    """从经历中提取故事片段"""

    def extract_story(self, experience: Experience) -> Optional[NarrativeEvent]:
        """
        提取故事片段

        条件: significance > 0.5
        """
        significance = self.calc_significance(experience)

        if significance < 0.5:
            return None

        return NarrativeEvent(
            what_happened=experience.content,
            how_felt=self.summarize_emotion(experience),
            what_learned=self.extract_lesson(experience),
            meaning_for_story=self.interpret_meaning(experience),
        )

    def calc_significance(self, experience: Experience) -> float:
        """计算显著性"""
        emotional = experience.emotional_intensity * 0.3
        novelty = experience.novelty * 0.2
        self_rel = experience.self_relevance * 0.3
        relationship = experience.relationship_importance * 0.2

        return emotional + novelty + self_rel + relationship
```

---

## 附录：算法索引

| 算法 | 子系统 | 复杂度 | 说明 |
|------|--------|--------|------|
| PAD 情绪分类 | 情绪 | O(1) | 常量时间 |
| 情绪惯性衰减 | 情绪 | O(1) | 常量时间 |
| 余弦相似度 | 记忆 | O(n) | n 为向量维度 |
| 向量检索 | 记忆 | O(m log k) | m 为记忆数，k 为 Top-K |
| 马斯洛优先级 | 行为 | O(n) | n 为行为数 |
| ε-贪心选择 | 行为 | O(n) | 排序复杂度 |
| 指数遗忘 | 记忆 | O(m) | m 为记忆数 |
| 人格演化 | 成长 | O(e × t) | e 为经验数，t 为特质数 |
| 能量更新 | 生理 | O(1) | 常量时间 |
| **意图生成** | 自主性 | O(1) | 欲望到意图转换 |
| **欲望权衡** | 决策 | O(n) | n 为欲望数 |
| **认知偏差应用** | 认知 | O(1) | 偏差效果计算 |
| **意义赋予** | 记忆 | O(1) | 重要性计算 |
| **转折点检测** | 成长 | O(1) | 状态变化检测 |
| **叙事提取** | 成长 | O(1) | 显著性计算 |

---

*文档版本: 2.0.0*
*最后更新: 2026-05-06*
