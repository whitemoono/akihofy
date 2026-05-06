# 认知系统详细设计

> **对应设计文档章节**: 七（认知系统）
> **优先级**: P1

---

## 一、设计目标

构建认知处理引擎，支持：
- 注意力模型
- 推理引擎
- 知识表示
- 决策辅助

---

## 二、注意力模型

### 2.1 注意力定义

```rust
#[derive(Debug, Clone)]
pub struct AttentionModel {
    pub current_focus: Vec<AttentionTarget>,
    pub attention_span: f32,         // 注意广度
    pub sustained_attention: f32,   // 持续注意力
    pub selective_attention: f32,   // 选择性注意力
    pub divided_attention: f32,     // 分配性注意力
    pub decay_rate: f32,            // 注意衰减率
}

impl AttentionModel {
    pub fn new() -> Self {
        Self {
            current_focus: Vec::new(),
            attention_span: 5.0,      // 5个目标
            sustained_attention: 0.8,
            selective_attention: 0.7,
            divided_attention: 0.5,
            decay_rate: 0.1,
        }
    }

    pub fn attend_to(&mut self, target: AttentionTarget) {
        // 如果已达上限，移除最不重要的
        if self.current_focus.len() >= self.attention_span as usize {
            self.current_focus.sort_by_key(|t| t.priority);
            self.current_focus.remove(0);
        }

        self.current_focus.push(target);
    }

    pub fn update(&mut self, delta: f32) {
        // 衰减注意力
        for target in &mut self.current_focus {
            target.intensity = (target.intensity - self.decay_rate * delta).max(0.0);
        }

        // 移除已消散的目标
        self.current_focus.retain(|t| t.intensity > 0.1);
    }

    pub fn is_attending_to(&self, target_id: &str) -> bool {
        self.current_focus.iter().any(|t| t.id == target_id)
    }
}

#[derive(Debug, Clone)]
pub struct AttentionTarget {
    pub id: String,
    pub content: String,
    pub priority: f32,
    pub intensity: f32,
    pub source: AttentionSource,
}

#[derive(Debug, Clone, Copy)]
pub enum AttentionSource {
    External,
    Internal,
    Memory,
    Goal,
}
```

### 2.2 注意力分配

```rust
pub struct AttentionAllocator;

impl AttentionAllocator {
    pub fn allocate(
        &self,
        candidates: &[AttentionCandidate],
        current: &AttentionModel,
        context: &CognitiveContext,
    ) -> Vec<AttentionTarget> {
        let mut scored: Vec<_> = candidates
            .iter()
            .map(|c| {
                let base_score = c.relevance * c.urgency;
                let novelty_bonus = if !current.is_attending_to(&c.id) {
                    c.novelty * 0.2
                } else {
                    0.0
                };
                let emotional_bonus = c.emotional_significance * 0.3;
                let goal_alignment = c.goal_alignment * 0.4;

                let total = base_score + novelty_bonus + emotional_bonus + goal_alignment;
                (c.clone(), total)
            })
            .collect();

        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        scored
            .into_iter()
            .take(current.attention_span as usize)
            .map(|(c, score)| AttentionTarget {
                id: c.id,
                content: c.content,
                priority: score,
                intensity: score.min(1.0),
                source: c.source,
            })
            .collect()
    }
}

#[derive(Debug, Clone)]
pub struct AttentionCandidate {
    pub id: String,
    pub content: String,
    pub relevance: f32,
    pub urgency: f32,
    pub novelty: f32,
    pub emotional_significance: f32,
    pub goal_alignment: f32,
    pub source: AttentionSource,
}
```

---

## 三、推理引擎

### 3.1 推理类型

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReasoningType {
    Deductive,     // 演绎推理
    Inductive,     // 归纳推理
    Abductive,     // 溯因推理
    Analogical,    // 类比推理
    Causal,        // 因果推理
}

pub struct ReasoningEngine {
    pub logical_confidence: f32,
    pub pattern_recognition: f32,
    pub causal_inference: f32,
}

impl ReasoningEngine {
    pub fn new() -> Self {
        Self {
            logical_confidence: 0.8,
            pattern_recognition: 0.75,
            causal_inference: 0.7,
        }
    }

    pub fn deductive(&self, premises: &[Fact], conclusion: &str) -> InferenceResult {
        let supporting = premises.iter()
            .filter(|p| self.supports(p, conclusion))
            .count();

        let confidence = (supporting as f32 / premises.len() as f32) * self.logical_confidence;

        InferenceResult {
            conclusion: conclusion.to_string(),
            confidence,
            reasoning_type: ReasoningType::Deductive,
            supporting_premises: supporting,
            is_valid: confidence > 0.5,
        }
    }

    pub fn inductive(&self, instances: &[Case]) -> Generalization {
        let patterns = self.extract_patterns(instances);
        let confidence = self.calculate_generalization_confidence(&patterns, instances.len());

        Generalization {
            pattern: patterns,
            confidence,
            based_on_instances: instances.len(),
        }
    }

    pub fn abductive(&self, observation: &str, knowledge: &[Rule]) -> Vec<Hypothesis> {
        knowledge
            .iter()
            .filter(|r| r.consequent.contains(observation))
            .map(|r| {
                Hypothesis {
                    explanation: r.antecedent.clone(),
                    confidence: self.calculate_abduction_confidence(r),
                    completeness: 0.7,
                }
            })
            .collect()
    }

    pub fn analogical(&self, source: &Case, target_domain: &str) -> AnalogyResult {
        let similarities = self.find_similarities(source, target_domain);
        let confidence = similarities.len() as f32 / 10.0 * self.pattern_recognition;

        AnalogyResult {
            source: source.description.clone(),
            target_domain: target_domain.to_string(),
            mapped_features: similarities,
            confidence,
            inferred_truth: confidence > 0.6,
        }
    }

    fn supports(&self, premise: &Fact, conclusion: &str) -> bool {
        premise.content.contains(conclusion) || premise.related_to(conclusion)
    }

    fn extract_patterns(&self, instances: &[Case]) -> Vec<Pattern> {
        // 简化模式提取
        instances
            .iter()
            .flat_map(|c| c.features.clone())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .map(|f| Pattern { feature: f, frequency: 0.5 })
            .collect()
    }

    fn calculate_generalization_confidence(&self, patterns: &[Pattern], instance_count: usize) -> f32 {
        let pattern_strength = patterns.iter().map(|p| p.frequency).sum::<f32>() / patterns.len().max(1) as f32;
        let evidence_strength = (instance_count as f32 / 10.0).min(1.0);

        pattern_strength * 0.6 + evidence_strength * 0.4
    }

    fn find_similarities(&self, source: &Case, target: &str) -> Vec<Feature> {
        source.features.iter()
            .filter(|f| target.contains(&f.name))
            .cloned()
            .collect()
    }

    fn calculate_abduction_confidence(&self, rule: &Rule) -> f32 {
        rule.supporting_evidence as f32 * self.pattern_recognition
    }
}
```

### 3.2 推理结果

```rust
#[derive(Debug, Clone)]
pub struct InferenceResult {
    pub conclusion: String,
    pub confidence: f32,
    pub reasoning_type: ReasoningType,
    pub supporting_premises: usize,
    pub is_valid: bool,
}

#[derive(Debug, Clone)]
pub struct Generalization {
    pub pattern: Vec<Pattern>,
    pub confidence: f32,
    pub based_on_instances: usize,
}

#[derive(Debug, Clone)]
pub struct Hypothesis {
    pub explanation: String,
    pub confidence: f32,
    pub completeness: f32,
}

#[derive(Debug, Clone)]
pub struct AnalogyResult {
    pub source: String,
    pub target_domain: String,
    pub mapped_features: Vec<Feature>,
    pub confidence: f32,
    pub inferred_truth: bool,
}

#[derive(Debug, Clone)]
pub struct Pattern {
    pub feature: String,
    pub frequency: f32,
}

#[derive(Debug, Clone)]
pub struct Fact {
    pub content: String,
    pub source: String,
    pub reliability: f32,
}

impl Fact {
    pub fn related_to(&self, other: &str) -> bool {
        self.content.contains(other) || other.contains(&self.content)
    }
}

#[derive(Debug, Clone)]
pub struct Rule {
    pub antecedent: String,
    pub consequent: String,
    pub supporting_evidence: usize,
}

#[derive(Debug, Clone)]
pub struct Case {
    pub description: String,
    pub features: Vec<Feature>,
}

#[derive(Debug, Clone)]
pub struct Feature {
    pub name: String,
    pub value: String,
}
```

---

## 四、认知上下文

```rust
#[derive(Debug, Clone)]
pub struct CognitiveContext {
    pub current_goal: Option<String>,
    pub relevant_knowledge: Vec<String>,
    pub recent_inferences: Vec<InferenceResult>,
    pub working_memory_load: f32,
    pub cognitive_load: f32,
}

impl CognitiveContext {
    pub fn new() -> Self {
        Self {
            current_goal: None,
            relevant_knowledge: Vec::new(),
            recent_inferences: Vec::new(),
            working_memory_load: 0.0,
            cognitive_load: 0.5,
        }
    }

    pub fn set_goal(&mut self, goal: String) {
        self.current_goal = Some(goal);
        self.cognitive_load = 0.7;
    }

    pub fn clear_goal(&mut self) {
        self.current_goal = None;
        self.cognitive_load = 0.5;
    }

    pub fn add_inference(&mut self, result: InferenceResult) {
        self.recent_inferences.push(result);
        if self.recent_inferences.len() > 10 {
            self.recent_inferences.remove(0);
        }
    }
}
```

---

## 五、认知引擎整合

```rust:1:50:akiho-core/src/cognition/mod.rs
mod attention;
mod reasoning;

pub use attention::{AttentionModel, AttentionTarget, AttentionSource, AttentionCandidate};
pub use reasoning::{ReasoningEngine, ReasoningType, InferenceResult};

#[derive(Debug, Clone)]
pub struct CognitionEngine {
    pub attention: AttentionModel,
    pub reasoning: ReasoningEngine,
    pub context: CognitiveContext,
}

impl CognitionEngine {
    pub fn new() -> Self {
        Self {
            attention: AttentionModel::new(),
            reasoning: ReasoningEngine::new(),
            context: CognitiveContext::new(),
        }
    }

    pub fn process(&mut self, input: &str, candidates: Vec<AttentionCandidate>) -> CognitiveOutput {
        // 1. 分配注意力
        let focus = self.attention.allocate(&candidates, &self.context);

        // 2. 根据注意力进行推理
        let inferences = self.perform_reasoning(&focus);

        // 3. 更新上下文
        for inf in &inferences {
            self.context.add_inference(inf.clone());
        }

        CognitiveOutput {
            focus,
            inferences,
            cognitive_state: self.context.cognitive_load,
        }
    }

    fn perform_reasoning(&self, focus: &[AttentionTarget]) -> Vec<InferenceResult> {
        let mut results = Vec::new();

        // 基于当前关注进行推理
        for target in focus.iter().take(3) {
            if let Some(hypothesis) = self.reasoning.abductive(
                &target.content,
                &[]  // 知识库
            ).first() {
                results.push(InferenceResult {
                    conclusion: hypothesis.explanation.clone(),
                    confidence: hypothesis.confidence,
                    reasoning_type: ReasoningType::Abductive,
                    supporting_premises: 1,
                    is_valid: hypothesis.confidence > 0.5,
                });
            }
        }

        results
    }

    pub fn update(&mut self, delta: f32) {
        self.attention.update(delta);

        // 认知疲劳
        if self.context.cognitive_load > 0.8 {
            self.attention.decay_rate *= 1.5;
        }
    }
}

#[derive(Debug, Clone)]
pub struct CognitiveOutput {
    pub focus: Vec<AttentionTarget>,
    pub inferences: Vec<InferenceResult>,
    pub cognitive_state: f32,
}
```

---

## 六、认知偏差引擎 (CognitiveBiasEngine)

### 6.1 设计理念

**核心问题**：当前推理引擎是"理性"的，但人类思维存在系统性偏差

```
理想推理（当前）：
  收集证据 → 分析逻辑 → 得出结论

人类推理（含偏差）：
  受已有信念影响 → 选择性注意证据 → 应用思维捷径 → 得出结论
```

认知偏差让 AI 更像真实的人类思维。

### 6.2 认知偏差类型

```rust
/// 人类认知偏差类型
#[derive(Debug, Clone, PartialEq)]
pub enum CognitiveBias {
    /// 确认偏差：倾向于寻找支持自己观点的证据
    Confirmation {
        target_belief: String,
        strength: f32,
    },

    /// 锚定效应：过度依赖第一个获得的信息
    Anchoring {
        anchor_value: f32,
        adjustment_rate: f32,
    },

    /// 可得性启发：容易想到的就是可能的
    Availability {
        recentness_weight: f32,
    },

    /// 近因效应：最近发生的事情影响更大
    Recency {
        decay_rate: f32,
    },

    /// 光环效应：一个优点影响对整体的判断
    Halo {
        source_trait: String,
    },

    /// 沉没成本谬误：因为已经投入而难以放弃
    SunkCost {
        investment_threshold: f32,
    },

    /// 后见之明偏差：事后认为结果"显而易见"
    Hindsight {
        confidence_boost: f32,
    },

    /// 乐观偏差：过高估计积极结果的可能性
    Optimism {
        bias_strength: f32,
    },
}

pub struct CognitiveBiasEngine {
    /// 当前活跃的偏差
    pub active_biases: Vec<ActiveBias>,

    /// 个人偏差倾向（初始化时随机生成，形成"认知指纹"）
    pub bias_tendencies: BiasTendencies,

    /// 偏差激活阈值
    pub activation_threshold: f32,
}

pub struct ActiveBias {
    pub bias_type: CognitiveBias,
    pub intensity: f32,
    pub triggered_by: String,
    pub applied_count: u32,
}

#[derive(Debug, Clone)]
pub struct BiasTendencies {
    pub confirmation_tendency: f32,   // 确认偏差倾向
    pub anchoring_tendency: f32,      // 锚定倾向
    pub availability_tendency: f32,   // 可得性倾向
    pub optimism_tendency: f32,      // 乐观倾向
}
```

### 6.3 偏差应用算法

```rust
impl CognitiveBiasEngine {
    /// 应用认知偏差到推理结果
    pub fn apply_biases(&mut self, inference: &mut InferenceResult, context: &CognitiveContext) {
        // 1. 检测应该激活的偏差
        let triggered = self.detect_triggered_biases(inference, context);

        for (bias, intensity) in triggered {
            self.apply_single_bias(inference, &bias, intensity);
            self.active_biases.push(ActiveBias {
                bias_type: bias,
                intensity,
                triggered_by: inference.conclusion.clone(),
                applied_count: 0,
            });
        }
    }

    /// 应用单个偏差
    fn apply_single_bias(&self, inference: &mut InferenceResult, bias: &CognitiveBias, intensity: f32) {
        match bias {
            CognitiveBias::Confirmation { target_belief, strength } => {
                // 放大支持目标信念的证据
                inference.confidence = (inference.confidence * (1.0 + strength * intensity)).min(1.0);
            }

            CognitiveBias::Recency { decay_rate } => {
                // 给予近期信息更高权重
                inference.supporting_premises += (intensity * 2.0) as usize;
            }

            CognitiveBias::Optimism { bias_strength } => {
                // 提升积极结论的信心
                if inference.confidence > 0.5 {
                    inference.confidence += bias_strength * intensity * 0.1;
                }
            }

            CognitiveBias::Anchoring { anchor_value, adjustment_rate } => {
                // 调整结果向锚点靠近
                let adjustment = (*anchor_value - inference.confidence) * adjustment_rate * intensity;
                inference.confidence += adjustment;
            }

            // ... 其他偏差处理
            _ => {}
        }
    }

    /// 检测触发偏差的条件
    fn detect_triggered_biases(&self, inference: &InferenceResult, context: &CognitiveContext) -> Vec<(CognitiveBias, f32)> {
        let mut triggered = Vec::new();

        // 检查确认偏差
        if let Some(belief) = &context.current_belief {
            if self.check_confirmation_trigger(inference, belief) {
                let intensity = self.bias_tendencies.confirmation_tendency;
                triggered.push((
                    CognitiveBias::Confirmation {
                        target_belief: belief.clone(),
                        strength: intensity,
                    },
                    intensity,
                ));
            }
        }

        // 检查乐观偏差
        if inference.confidence > 0.6 && self.bias_tendencies.optimism_tendency > 0.5 {
            triggered.push((
                CognitiveBias::Optimism {
                    bias_strength: self.bias_tendencies.optimism_tendency,
                },
                self.bias_tendencies.optimism_tendency,
            ));
        }

        triggered
    }
}
```

---

## 七、元认知系统 (Metacognition)

### 7.1 设计理念

**核心问题**：AI 只知道自己在"推理"，但不知道自己的推理是否可靠

```
普通推理：
  输入 → 推理 → 输出

元认知推理：
  输入 → 推理 → 评估推理质量 → 调整策略 → 输出
```

元认知让角色能够"思考自己的思考"。

### 7.2 元认知结构

```rust
/// 元认知 - 思考自己的思考
pub struct Metacognition {
    /// 自我觉知水平（0.0 ~ 1.0）
    pub self_awareness: f32,

    /// 当前思考策略
    pub thinking_strategy: ThinkingStrategy,

    /// 不确定容忍度
    pub uncertainty_tolerance: f32,

    /// 对自己推理能力的信心
    pub reasoning_confidence: f32,

    /// 历史推理评估
    pub history: Vec<ReasoningEvaluation>,
}

pub enum ThinkingStrategy {
    Cautious,    // 谨慎策略：多角度思考，延迟决策
    Quick,       // 快速策略：凭直觉，快速决策
    Systematic,  // 系统策略：按步骤分析，全面考量
    Creative,    // 创造性策略：发散思维，寻找新角度
}

pub struct ReasoningEvaluation {
    pub inference_id: String,
    pub was_correct: Option<bool>,  // None = 未验证
    pub confidence_accurate: bool,  // 信心评估是否准确
    pub errors_identified: Vec<String>,
    pub improvements: Vec<String>,
}
```

### 7.3 推理自检

```rust
impl Metacognition {
    /// 评估推理的质量
    pub fn evaluate_reasoning(&self, inference: &InferenceResult) -> ReasoningQuality {
        let self_check = self.perform_self_check(inference);

        ReasoningQuality {
            is_trustworthy: self_check.uncertainty < self.uncertainty_tolerance,
            needs_evidence: self_check.gaps_in_logic > 2,
            should_consult: self_check.confidence_low,
            suggested_strategy: self.recommend_strategy(&self_check),
        }
    }

    /// 执行自我检查
    fn perform_self_check(&self, inference: &InferenceResult) -> SelfCheckResult {
        let gaps = self.identify_logic_gaps(inference);
        let uncertainty = self.estimate_uncertainty(inference);
        let bias_aware = self.check_for_bias_contamination(inference);

        SelfCheckResult {
            gaps_in_logic: gaps,
            uncertainty,
            confidence_low: inference.confidence < 0.5 && self.self_awareness > 0.7,
            potential_biases: bias_aware,
        }
    }

    /// 推荐思考策略
    fn recommend_strategy(&self, check: &SelfCheckResult) -> ThinkingStrategy {
        if check.uncertainty > 0.7 || check.gaps_in_logic > 3 {
            ThinkingStrategy::Cautious  // 高不确定性，转向谨慎
        } else if check.gaps_in_logic > 0 {
            ThinkingStrategy::Systematic  // 有逻辑漏洞，系统分析
        } else {
            self.thinking_strategy  // 保持当前策略
        }
    }

    /// 学习：从推理结果中改进
    pub fn learn_from_result(&mut self, inference_id: &str, was_correct: bool) {
        if let Some(eval) = self.history.iter_mut().find(|e| &e.inference_id == inference_id) {
            eval.was_correct = Some(was_correct);
            eval.confidence_accurate = (eval.confidence_accurate as i32 + was_correct as i32) > 0;

            // 如果多次失误，降低推理信心
            let recent_correct = self.history.iter()
                .rev()
                .take(10)
                .filter_map(|e| e.was_correct)
                .filter(|&c| c)
                .count();

            if recent_correct < 3 {
                self.reasoning_confidence *= 0.9;
            }
        }
    }
}

pub struct ReasoningQuality {
    pub is_trustworthy: bool,
    pub needs_evidence: bool,
    pub should_consult: bool,
    pub suggested_strategy: ThinkingStrategy,
}
```

---

## 八、意图推断引擎 (IntentionInference)

### 8.1 设计理念

**核心问题**：只能理解用户"说什么"，不能推断"为什么说"

```
表层理解：
  "今天好累" → 理解为：用户累了

深层意图推断：
  "今天好累" → 表层意图：分享状态
                深层意图：寻求安慰/发泄情绪/想要陪伴
                未说出口的需求：被关心、被理解
```

意图推断让交互更有深度。

### 8.2 意图推断结构

```rust
/// 意图推断引擎
pub struct IntentionInferenceEngine {
    /// 是否启用表层分析
    pub surface_analysis: bool,

    /// 是否启用深层推断
    pub deep_inference: bool,

    /// 关系亲密阈值（超过此值启用深层推断）
    pub intimacy_threshold: f32,
}

pub struct IntentionResult {
    /// 表层意图（用户明确表达的意思）
    pub surface_intent: SurfaceIntent,

    /// 深层意图（隐含的真实意图）
    pub underlying_intent: Option<UnderlyingIntent>,

    /// 情感潜台词
    pub emotional_subtext: EmotionalSubtext,

    /// 未满足的需求
    pub unsaid_needs: Vec<UnmetNeed>,

    /// 置信度
    pub confidence: f32,
}

pub enum SurfaceIntent {
    Share,        // 分享
    Ask,          // 询问
    Request,      // 请求
    Complain,     // 抱怨
    Test,         // 测试/试探
    Connect,      // 建立联系
}

pub struct UnderlyingIntent {
    pub intent_type: UnderlyingIntentType,
    pub evidence: Vec<String>,
    pub confidence: f32,
}

pub enum UnderlyingIntentType {
    SeekingComfort,      // 寻求安慰
    Venting,             // 发泄情绪
    SeekingAttention,    // 寻求关注
    TestingRelationship, // 测试关系
    SettingBoundary,      // 设立边界
    ExpressingLove,       // 表达关心
    AskingForHelp,        // 请求帮助
}

pub struct EmotionalSubtext {
    pub hidden_emotion: EmotionType,
    pub surface_emotion: EmotionType,
    pub discrepancy: f32,  // 差异程度
}

pub struct UnmetNeed {
    pub need_type: NeedType,
    pub intensity: f32,
    pub evidence: String,
}
```

### 8.3 意图推断算法

```rust
impl IntentionInferenceEngine {
    /// 推断消息背后的意图
    pub fn infer(&self, message: &str, relationship: &Relationship) -> IntentionResult {
        let surface = self.analyze_surface(message);

        // 关系亲密时，启用深层推断
        let underlying = if relationship.intimacy > self.intimacy_threshold {
            self.analyze_deep(message, relationship, &surface)
        } else {
            None
        };

        let subtext = self.detect_emotional_subtext(message, &surface);
        let needs = self.identify_unmet_needs(message, relationship);

        IntentionResult {
            surface_intent: surface,
            underlying_intent: underlying,
            emotional_subtext: subtext,
            unsaid_needs: needs,
            confidence: self.calculate_confidence(relationship),
        }
    }

    /// 表层分析
    fn analyze_surface(&self, message: &str) -> SurfaceIntent {
        // 基于消息内容和模式识别
        if self.contains_complaint_pattern(message) {
            SurfaceIntent::Complain
        } else if self.contains_question_pattern(message) {
            SurfaceIntent::Ask
        } else if self.contains_personal_sharing(message) {
            SurfaceIntent::Share
        } else {
            SurfaceIntent::Connect
        }
    }

    /// 深层推断
    fn analyze_deep(
        &self,
        message: &str,
        relationship: &Relationship,
        surface: &SurfaceIntent
    ) -> Option<UnderlyingIntent> {
        let mut candidates = Vec::new();

        // 基于消息特征推断
        if self.contains_vulnerability(message) {
            candidates.push(UnderlyingIntentType::SeekingComfort);
        }
        if self.contains_frustration(message) {
            candidates.push(UnderlyingIntentType::Venting);
        }
        if self.is_testing_boundary(message) {
            candidates.push(UnderlyingIntentType::TestingRelationship);
        }

        // 选择置信度最高的
        candidates.into_iter()
            .map(|t| {
                let evidence = self.collect_evidence(message, &t);
                let confidence = self.calculate_underlying_confidence(&t, &evidence, relationship);
                (t, evidence, confidence)
            })
            .max_by(|a, b| a.2.partial_cmp(&b.2).unwrap())
            .map(|(t, e, c)| UnderlyingIntent {
                intent_type: t,
                evidence: e,
                confidence: c,
            })
    }

    /// 检测情感潜台词
    fn detect_emotional_subtext(&self, message: &str, surface: &SurfaceIntent) -> EmotionalSubtext {
        let surface_emotion = self.detect_expressed_emotion(message);
        let hidden_emotion = self.infer_hidden_emotion(message, surface);

        let discrepancy = self.calculate_discrepancy(&surface_emotion, &hidden_emotion);

        EmotionalSubtext {
            hidden_emotion,
            surface_emotion,
            discrepancy,
        }
    }
}
```

---

## 九、性能指标

| 指标 | 目标 | 说明 |
|------|------|------|
| 注意力切换 | < 100ms | 焦点转换 |
| 推理延迟 | < 200ms | 简单推理 |
| 并行处理 | 3+ | 注意力分配 |
| 记忆负载 | < 80% | 工作记忆 |
| 偏差应用 | < 50ms | 认知偏差处理 |
| 元认知自检 | < 100ms | 推理质量评估 |
| 意图推断 | < 150ms | 深层意图分析 |
