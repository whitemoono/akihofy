// 认知系统 —— 注意力模型与推理引擎
// 对应设计文档: docs/subsystem_design/06_cognition_system.md（精简版）

use serde::{Deserialize, Serialize};

/// 注意力模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttentionModel {
    /// 当前关注的焦点（话题/概念）
    pub current_focus: Vec<String>,
    /// 注意力广度（可同时关注的项目数，通常 3~7）
    pub attention_span: f32,
    /// 持续注意力（0.0 ~ 1.0）
    pub sustained_attention: f32,
    /// 注意力衰减速率
    pub decay_rate: f32,
    /// 分心概率
    pub distractibility: f32,
}

impl Default for AttentionModel {
    fn default() -> Self {
        Self {
            current_focus: Vec::new(),
            attention_span: 5.0,
            sustained_attention: 1.0,
            decay_rate: 0.001,
            distractibility: 0.1,
        }
    }
}

impl AttentionModel {
    pub fn new() -> Self {
        Self::default()
    }

    /// 将注意力转移到新焦点
    pub fn focus_on(&mut self, topic: &str) {
        // 如果已有这个焦点，提升到最近
        self.current_focus.retain(|t| t != topic);
        self.current_focus.insert(0, topic.to_string());

        // 限制焦点数量
        let max = self.attention_span.round() as usize;
        self.current_focus.truncate(max.max(3));
    }

    /// 注意力衰减更新
    pub fn tick(&mut self, delta: f32) {
        self.sustained_attention -= self.decay_rate * delta;
        self.sustained_attention = self.sustained_attention.max(0.0);

        // 注意力低时更容易分心
        self.distractibility = (1.0 - self.sustained_attention) * 0.5;
    }

    /// 重置注意力（新刺激到达时）
    pub fn refresh(&mut self) {
        self.sustained_attention = 1.0;
        self.distractibility = 0.1;
    }

    /// 当前是否在关注某话题
    pub fn is_focused_on(&self, topic: &str) -> bool {
        self.current_focus.iter().any(|t| t.contains(topic) || topic.contains(t))
    }
}

/// 推理类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ReasoningType {
    Deductive,   // 演绎
    Inductive,   // 归纳
    Analogical,  // 类比
    Causal,      // 因果
}

impl ReasoningType {
    pub fn name(&self) -> &'static str {
        match self {
            ReasoningType::Deductive => "演绎推理",
            ReasoningType::Inductive => "归纳推理",
            ReasoningType::Analogical => "类比推理",
            ReasoningType::Causal => "因果推理",
        }
    }
}

/// 推理引擎（策略选择层，实际推理由 LLM 完成）
#[derive(Debug, Clone)]
pub struct ReasoningEngine {
    /// 当前活跃的推理类型
    pub active_reasoning: Vec<ReasoningType>,
    /// 推理质量评分 (0.0 ~ 1.0)
    pub reasoning_quality: f32,
}

impl Default for ReasoningEngine {
    fn default() -> Self {
        Self {
            active_reasoning: vec![ReasoningType::Inductive],
            reasoning_quality: 0.5,
        }
    }
}

impl ReasoningEngine {
    pub fn new() -> Self {
        Self::default()
    }

    /// 根据任务选择推理策略
    pub fn select_strategy(&mut self, task: &str) -> Vec<ReasoningType> {
        let strategies = if task.contains("为什么") || task.contains("原因") {
            vec![ReasoningType::Causal]
        } else if task.contains("比如") || task.contains("类似") {
            vec![ReasoningType::Analogical]
        } else if task.contains("所有") || task.contains("一定") {
            vec![ReasoningType::Deductive]
        } else {
            vec![ReasoningType::Inductive]
        };
        self.active_reasoning = strategies.clone();
        strategies
    }
}

/// 认知偏差引擎（简化版）
#[derive(Debug, Clone)]
pub struct CognitiveBiasEngine {
    pub confirmation_bias: f32,  // 确认偏误强度
    pub anchoring: f32,          // 锚定效应强度
    pub recency_bias: f32,       // 近因效应强度（随成长阶段变化）
    pub optimism_bias: f32,      // 乐观偏误强度
}

impl Default for CognitiveBiasEngine {
    fn default() -> Self {
        Self {
            confirmation_bias: 0.3,
            anchoring: 0.2,
            recency_bias: 0.4,
            optimism_bias: 0.2,
        }
    }
}

impl CognitiveBiasEngine {
    pub fn new() -> Self {
        Self::default()
    }

    /// 应用确认偏误：倾向于接受与已有信念一致的信息
    pub fn apply_confirmation_bias(&self, evidence_strength: f32, aligns_with_belief: bool) -> f32 {
        if aligns_with_belief {
            evidence_strength * (1.0 + self.confirmation_bias)
        } else {
            evidence_strength * (1.0 - self.confirmation_bias * 0.5)
        }
    }

    /// 根据成长阶段调整偏差强度
    pub fn set_phase(&mut self, phase: &crate::growth::GrowthPhase) {
        use crate::growth::GrowthPhase;
        match phase {
            GrowthPhase::Infant => {
                self.confirmation_bias = 0.1; // 婴儿期：还没有太多信念
                self.recency_bias = 0.8;      // 婴儿期：极度依赖最近经验
            }
            GrowthPhase::Toddler => {
                self.recency_bias = 0.7;
            }
            GrowthPhase::Child => {
                self.confirmation_bias = 0.2;
                self.recency_bias = 0.5;
            }
            GrowthPhase::Adolescent => {
                self.confirmation_bias = 0.4; // 青春期：信念形成，容易固执
                self.optimism_bias = 0.4;
            }
            GrowthPhase::Adult => {
                self.confirmation_bias = 0.3;
                self.recency_bias = 0.3;
            }
            GrowthPhase::Sage => {
                self.confirmation_bias = 0.2; // 智慧期：更客观
                self.recency_bias = 0.2;
            }
        }
    }
}

/// 元认知 —— 对自身思考的反思
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Metacognition {
    /// 对自身推理质量的评价 (0.0 ~ 1.0)
    pub reasoning_confidence: f32,
    /// 已知的知识盲区
    pub known_blindspots: Vec<String>,
    /// 当前思考策略
    pub thinking_strategy: ThinkingStrategy,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ThinkingStrategy {
    Cautious,
    Quick,
    Systematic,
    Creative,
}

impl Default for Metacognition {
    fn default() -> Self {
        Self {
            reasoning_confidence: 0.5,
            known_blindspots: vec![],
            thinking_strategy: ThinkingStrategy::Quick,
        }
    }
}

/// 认知系统顶层
#[derive(Debug, Clone)]
pub struct CognitionEngine {
    pub attention: AttentionModel,
    pub reasoning: ReasoningEngine,
    pub biases: CognitiveBiasEngine,
    pub metacognition: Metacognition,
}

impl CognitionEngine {
    pub fn new() -> Self {
        Self {
            attention: AttentionModel::new(),
            reasoning: ReasoningEngine::new(),
            biases: CognitiveBiasEngine::new(),
            metacognition: Metacognition::default(),
        }
    }

    pub fn tick(&mut self, delta: f32) {
        self.attention.tick(delta);
    }

    /// 设置成长阶段（影响认知偏差参数）
    pub fn set_growth_phase(&mut self, phase: &crate::growth::GrowthPhase) {
        self.biases.set_phase(phase);
    }
}

impl Default for CognitionEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_attention_focus() {
        let mut attn = AttentionModel::new();
        attn.focus_on("Rust编程");
        assert!(attn.is_focused_on("Rust"));

        attn.focus_on("机器学");
        attn.focus_on("深度学习");
        assert!(attn.current_focus.len() <= 5);
    }

    #[test]
    fn test_confirmation_bias() {
        let bias = CognitiveBiasEngine::new();
        let strength = 0.5;

        // 与信念一致的证据被强化
        let aligned = bias.apply_confirmation_bias(strength, true);
        assert!(aligned > strength);

        // 不一致的证据被削弱
        let unaligned = bias.apply_confirmation_bias(strength, false);
        assert!(unaligned < strength);
    }
}
