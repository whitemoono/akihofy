# 个人意义层 (Personal Meaning Layer)

> **对应设计章节**: 记忆系统增强
> **优先级**: P0
> **状态**: 待实现

---

## 一、设计目标

为记忆系统增加**个人意义层**，解决核心问题：

```
记忆存储的只是信息，但没有与"我"建立关联

普通记忆存储：
  记忆内容：今天他夸我了
  → 存储：✓

个人意义层：
  记忆内容：今天他夸我了
  → 意义：这让我觉得自己是有价值的
  → 关联：我之前的付出没有白费
  → 影响：这个人的看法对我来说很重要
```

个人意义层让记忆成为"我的人生故事"的一部分。

---

## 二、核心数据结构

### 2.1 显著性结构

```rust
/// 记忆的显著性——对"我"意味着什么
#[derive(Debug, Clone)]
pub struct Significance {
    /// 记忆 ID
    pub memory_id: MemoryId,

    /// 对"我"的重要性（0.0 ~ 1.0）
    pub importance: f32,

    /// 情感强度
    pub emotional_charge: f32,

    /// 与自我认同的相关性
    pub self_relevance: f32,

    /// 与成长的关联程度
    pub growth_connection: f32,

    /// 意义描述（如"这让我明白..."）
    pub meaning_text: String,

    /// 关联的自我认知
    pub related_self_beliefs: Vec<String>,

    /// 关联到其他记忆
    pub connected_memories: Vec<MemoryId>,

    /// 创建时间
    pub created_at: DateTime,
}

impl Significance {
    pub fn new(memory_id: MemoryId) -> Self {
        Self {
            memory_id,
            importance: 0.5,
            emotional_charge: 0.5,
            self_relevance: 0.5,
            growth_connection: 0.0,
            meaning_text: String::new(),
            related_self_beliefs: Vec::new(),
            connected_memories: Vec::new(),
            created_at: Utc::now(),
        }
    }

    /// 计算综合显著性分数
    pub fn composite_score(&self) -> f32 {
        self.importance * 0.3 +
        self.emotional_charge * 0.3 +
        self.self_relevance * 0.2 +
        self.growth_connection * 0.2
    }
}
```

### 2.2 意义关联网络

```rust
/// 意义关联网络——记忆之间的意义连接
#[derive(Debug, Clone)]
pub struct MeaningNetwork {
    /// 意义关联边
    pub edges: Vec<MeaningEdge>,

    /// 记忆到显著性的映射
    pub significances: HashMap<MemoryId, Significance>,

    /// 主题聚类
    pub themes: Vec<LifeTheme>,
}

#[derive(Debug, Clone)]
pub struct MeaningEdge {
    /// 源记忆
    pub from: MemoryId,

    /// 目标记忆
    pub to: MemoryId,

    /// 关联类型
    pub meaning_type: MeaningType,

    /// 关联强度（0.0 ~ 1.0）
    pub strength: f32,

    /// 关联描述（如"这让我想起..."）
    pub description: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MeaningType {
    /// 对比：如"和以前不同了"
    Contrast,

    /// 因果：如"这件事导致了..."
    Cause,

    /// 主题：如"这再次证明了..."
    Theme,

    /// 成长：如"我从中学会了..."
    Growth,

    /// 关系：如"这加深了我们..."
    Relationship,

    /// 回忆：如"这让我想起..."
    Memory,
}

#[derive(Debug, Clone)]
pub struct LifeTheme {
    /// 主题名称
    pub name: String,

    /// 主题描述
    pub description: String,

    /// 相关记忆
    pub related_memories: Vec<MemoryId>,

    /// 主题强度随时间变化
    pub intensity_timeline: Vec<(DateTime, f32)>,
}
```

---

## 三、意义赋予算法

### 3.1 核心逻辑

```rust
/// 个人意义层
pub struct PersonalMeaningLayer {
    /// 记忆 → 显著性 的映射
    significances: HashMap<MemoryId, Significance>,

    /// 意义关联网络
    pub meaning_network: MeaningNetwork,

    /// 自我认知分析器
    self_belief_analyzer: SelfBeliefAnalyzer,

    /// 成长关联分析器
    growth_analyzer: GrowthAnalyzer,
}

impl PersonalMeaningLayer {
    /// 为新记忆赋予个人意义
    pub fn assign_significance(
        &mut self,
        memory: &Memory,
        context: &ProcessingContext,
    ) -> Significance {
        let mut sig = Significance::new(memory.id.clone());

        // 1. 计算重要性
        sig.importance = self.calculate_importance(memory, context);

        // 2. 评估情感强度
        sig.emotional_charge = self.evaluate_emotional_charge(memory);

        // 3. 评估自我相关性
        sig.self_relevance = self.self_belief_analyzer.analyze(memory, context);

        // 4. 检查与成长的关联
        sig.growth_connection = self.growth_analyzer.assess(memory, context);

        // 5. 生成意义描述
        sig.meaning_text = self.generate_meaning_text(memory, &sig);

        // 6. 提取关联的自我认知
        sig.related_self_beliefs = self.extract_self_beliefs(memory);

        // 7. 发现并创建关联
        self.discover_connections(&mut sig, memory);

        // 保存
        self.significances.insert(sig.memory_id.clone(), sig.clone());
        sig
    }

    /// 计算重要性
    fn calculate_importance(&self, memory: &Memory, context: &ProcessingContext) -> f32 {
        // 基础分数
        let mut score = memory.base_importance;

        // 情感权重加成
        score += memory.emotional_intensity * 0.3;

        // 关系权重加成（与重要的人相关更重要）
        if let Some(relationship) = context.get_relationship(memory) {
            let relationship_importance = relationship.get_importance();
            score += relationship_importance * 0.2;
        }

        // 新奇性加成（第一次经历更有意义）
        if memory.is_first_time {
            score += 0.15;
        }

        // 时间因素（近期事件更有意义）
        let recency_factor = self.calculate_recency_factor(memory);
        score += recency_factor * 0.1;

        score.min(1.0)
    }

    /// 评估情感强度
    fn evaluate_emotional_charge(&self, memory: &Memory) -> f32 {
        // 基础情感强度
        let base = memory.emotional_intensity;

        // 情感标签加权
        let tag_bonus = memory.emotional_tags.iter()
            .map(|tag| self.get_tag_weight(tag))
            .sum::<f32>()
            * 0.1;

        base + tag_bonus
    }

    fn get_tag_weight(&self, tag: &str) -> f32 {
        match tag.to_lowercase().as_str() {
            "first_time" | "milestone" => 0.3,
            "breakthrough" | "turning_point" => 0.4,
            "conflict" | "betrayal" => 0.3,
            "achievement" | "proud" => 0.3,
            "loss" | "grief" => 0.4,
            _ => 0.1,
        }
    }
}
```

### 3.2 意义描述生成

```rust
impl PersonalMeaningLayer {
    /// 生成意义描述文本
    fn generate_meaning_text(&self, memory: &Memory, sig: &Significance) -> String {
        // 选择合适的模板
        let template = self.select_template(memory, sig);

        // 提取主题
        let theme = self.extract_theme(memory);

        // 提取教训
        let lesson = self.extract_lesson(memory);

        template
            .replace("{theme}", &theme)
            .replace("{lesson}", &lesson)
    }

    fn select_template(&self, memory: &Memory, sig: &Significance) -> String {
        // 根据记忆类型和显著性选择模板
        if sig.importance > 0.8 {
            "这让我明白{theme}。{lesson}".to_string()
        } else if sig.self_relevance > 0.6 {
            "{theme}对我来说很重要。{lesson}".to_string()
        } else if sig.growth_connection > 0.5 {
            "通过这件事，我学会了{lesson}".to_string()
        } else {
            "{theme}。{lesson}".to_string()
        }
    }

    fn extract_theme(&self, memory: &Memory) -> String {
        // 从记忆中提取主题
        // 简化：使用关键词匹配
        let content = memory.content.to_lowercase();

        if content.contains("第一次") || content.contains("首次") {
            "第一次的经历总是特别".to_string()
        } else if content.contains("成功") || content.contains("完成") {
            "成就感让人满足".to_string()
        } else if content.contains("失败") || content.contains("错误") {
            "失败也是成长".to_string()
        } else if content.contains("谢谢") || content.contains("感激") {
            "被感谢是温暖的".to_string()
        } else {
            "生活中总有些值得记住的时刻".to_string()
        }
    }

    fn extract_lesson(&self, memory: &Memory) -> String {
        // 从记忆中提取教训/领悟
        // 简化：基于情感标签推断
        if memory.emotional_tags.contains(&"proud".to_string()) {
            "我的努力没有白费".to_string()
        } else if memory.emotional_tags.contains(&"sad".to_string()) {
            "失去也是人生的一部分".to_string()
        } else if memory.emotional_tags.contains(&"grateful".to_string()) {
            "要珍惜身边的人".to_string()
        } else {
            "每段经历都有它的价值".to_string()
        }
    }
}
```

---

## 四、关联发现

### 4.1 自动关联

```rust
impl PersonalMeaningLayer {
    /// 发现并创建记忆之间的关联
    fn discover_connections(&mut self, sig: &mut Significance, memory: &Memory) {
        // 1. 基于主题相似性关联
        self.discover_theme_connections(sig, memory);

        // 2. 基于时间接近性关联
        self.discover_temporal_connections(sig, memory);

        // 3. 基于情感共鸣关联
        self.discover_emotional_connections(sig, memory);

        // 4. 基于关系关联
        self.discover_relationship_connections(sig, memory);
    }

    /// 基于主题相似性发现关联
    fn discover_theme_connections(&mut self, sig: &mut Significance, memory: &Memory) {
        for (other_id, other_sig) in &self.significances {
            if other_id == &sig.memory_id {
                continue;
            }

            // 计算主题相似度
            let similarity = self.calculate_theme_similarity(memory, other_id);

            if similarity > 0.6 {
                // 创建主题关联
                let edge = MeaningEdge {
                    from: sig.memory_id.clone(),
                    to: other_id.clone(),
                    meaning_type: MeaningType::Theme,
                    strength: similarity,
                    description: "这让我想起另一段相似的经历...".to_string(),
                };

                self.meaning_network.edges.push(edge);
                sig.connected_memories.push(other_id.clone());
            }
        }
    }

    /// 基于时间接近性发现关联
    fn discover_temporal_connections(&mut self, sig: &mut Significance, memory: &Memory) {
        let memory_time = memory.timestamp;

        for (other_id, other_sig) in &self.significances {
            if other_id == &sig.memory_id {
                continue;
            }

            // 计算时间距离（天数）
            let time_diff = (memory_time - other_sig.created_at).num_days();

            // 7 天内的记忆可能有关联
            if time_diff.abs() <= 7 {
                let edge = MeaningEdge {
                    from: sig.memory_id.clone(),
                    to: other_id.clone(),
                    meaning_type: MeaningType::Cause,
                    strength: 0.7 - (time_diff.abs() as f32 * 0.05),
                    description: "那段时间的经历似乎都有关联...".to_string(),
                };

                self.meaning_network.edges.push(edge);
                sig.connected_memories.push(other_id.clone());
            }
        }
    }

    /// 基于情感共鸣发现关联
    fn discover_emotional_connections(&mut self, sig: &mut Significance, memory: &Memory) {
        // 寻找情感相似的记忆
        for (other_id, other_sig) in &self.significances {
            if other_id == &sig.memory_id {
                continue;
            }

            let emotional_similarity =
                1.0 - (memory.emotional_intensity - other_sig.emotional_charge).abs();

            if emotional_similarity > 0.7 {
                let edge = MeaningEdge {
                    from: sig.memory_id.clone(),
                    to: other_id.clone(),
                    meaning_type: MeaningType::Growth,
                    strength: emotional_similarity * 0.8,
                    description: "类似的感觉让我想起了那次经历...".to_string(),
                };

                self.meaning_network.edges.push(edge);
            }
        }
    }
}
```

---

## 五、检索增强

### 5.1 意义加权检索

```rust
impl PersonalMeaningLayer {
    /// 根据个人意义调整检索结果
    pub fn adjust_results_with_significance(
        &self,
        results: Vec<MemorySearchResult>,
    ) -> Vec<MemorySearchResult> {
        results
            .into_iter()
            .map(|mut result| {
                if let Some(sig) = self.significances.get(&result.memory.id) {
                    // 重要性加成
                    result.score += sig.composite_score() * 0.3;
                }
                result
            })
            .collect()
    }

    /// 获取记忆的个人意义描述
    pub fn get_meaning_description(&self, memory_id: &MemoryId) -> Option<String> {
        self.significances
            .get(memory_id)
            .map(|sig| sig.meaning_text.clone())
    }

    /// 获取相关记忆
    pub fn get_connected_memories(&self, memory_id: &MemoryId) -> Vec<MemoryId> {
        self.meaning_network.edges
            .iter()
            .filter(|e| e.from == *memory_id || e.to == *memory_id)
            .map(|e| {
                if e.from == *memory_id {
                    e.to.clone()
                } else {
                    e.from.clone()
                }
            })
            .collect()
    }
}
```

---

## 六、与 LLM 的集成

### 6.1 Prompt 注入

```python
def generate_significance_prompt(memory_id: str, significance: Significance) -> str:
    """生成用于 LLM 的意义提示"""

    parts = []

    # 重要性描述
    if significance.importance > 0.7:
        parts.append(f"这段记忆对你很重要")

    # 情感共鸣
    if significance.emotional_charge > 0.7:
        parts.append(f"想起这件事你会有强烈的情感反应")

    # 自我关联
    if significance.self_relevance > 0.5:
        related = "、".join(significance.related_self_beliefs[:3])
        parts.append(f"这与你的自我认知有关：{related}")

    # 成长关联
    if significance.growth_connection > 0.4:
        parts.append("这段经历让你成长了")

    # 意义描述
    if significance.meaning_text:
        parts.append(significance.meaning_text)

    return "；".join(parts)
```

### 6.2 使用示例

```python
# 获取记忆检索结果
results = memory_manager.search("开心的事", limit=10)

# 增强结果
enhanced_results = meaning_layer.adjust_results_with_significance(results)

# 生成上下文
for result in enhanced_results:
    significance = meaning_layer.get_significance(result.memory_id)
    if significance:
        prompt_fragment = generate_significance_prompt(
            result.memory_id,
            significance
        )
        # 注入到 LLM prompt
        context.add_memory_context(result, prompt_fragment)
```

---

## 七、实现状态

| 组件 | 状态 | 说明 |
|------|------|------|
| Significance 结构 | 待实现 | 基础数据结构 |
| MeaningNetwork | 待实现 | 关联网络 |
| assign_significance | 待实现 | 核心算法 |
| generate_meaning_text | 待实现 | LLM 提示生成 |
| discover_connections | 待实现 | 自动关联 |
| adjust_results | 待实现 | 检索增强 |

---

## 八、测试用例

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn test_significance_calculation() {
        let layer = PersonalMeaningLayer::new();

        let memory = Memory::new(
            content: "今天主人夸我了".to_string(),
            emotional_intensity: 0.8,
            emotional_tags: vec!["proud", "happy"],
        );

        let sig = layer.assign_significance(&memory, &context);

        // 高情感强度应该有高显著性
        assert!(sig.emotional_charge > 0.7);
        assert!(sig.importance > 0.6);
    }

    #[test]
    fn test_connection_discovery() {
        // 测试关联发现逻辑
    }

    #[test]
    fn test_meaning_text_generation() {
        // 测试意义描述生成
    }
}
```

---

*文档版本: 1.0.0*
*最后更新: 2026-05-06*
