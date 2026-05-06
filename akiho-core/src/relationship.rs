// 关系动态系统 —— 信任模型与关系阶段
// 对应设计文档: docs/subsystem_design/03_relationship.md

use serde::{Deserialize, Serialize};

/// 信任模型（5 维度）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrustModel {
    pub reliability: f32,    // 可靠性
    pub authenticity: f32,   // 真实性
    pub competence: f32,     // 能力评估
    pub intimacy: f32,       // 亲密度
    pub self_disclosure: f32, // 自我暴露程度
}

impl Default for TrustModel {
    fn default() -> Self {
        Self {
            reliability: 0.5,
            authenticity: 0.5,
            competence: 0.5,
            intimacy: 0.0,
            self_disclosure: 0.0,
        }
    }
}

impl TrustModel {
    pub fn composite_trust(&self) -> f32 {
        self.reliability * 0.25
            + self.authenticity * 0.2
            + self.competence * 0.15
            + self.intimacy * 0.25
            + self.self_disclosure * 0.15
    }
}

/// 关系阶段
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum RelationshipStage {
    Stranger,
    Acquaintance,
    Familiar,
    Friend,
    CloseFriend,
    Intimate,
}

impl RelationshipStage {
    pub fn name(&self) -> &'static str {
        match self {
            RelationshipStage::Stranger => "陌生人",
            RelationshipStage::Acquaintance => "认识的人",
            RelationshipStage::Familiar => "熟悉的",
            RelationshipStage::Friend => "朋友",
            RelationshipStage::CloseFriend => "密友",
            RelationshipStage::Intimate => "亲密",
        }
    }

    pub fn min_trust(&self) -> f32 {
        match self {
            RelationshipStage::Stranger => 0.0,
            RelationshipStage::Acquaintance => 0.1,
            RelationshipStage::Familiar => 0.25,
            RelationshipStage::Friend => 0.4,
            RelationshipStage::CloseFriend => 0.6,
            RelationshipStage::Intimate => 0.8,
        }
    }

    pub fn next(&self) -> Option<RelationshipStage> {
        match self {
            RelationshipStage::Stranger => Some(RelationshipStage::Acquaintance),
            RelationshipStage::Acquaintance => Some(RelationshipStage::Familiar),
            RelationshipStage::Familiar => Some(RelationshipStage::Friend),
            RelationshipStage::Friend => Some(RelationshipStage::CloseFriend),
            RelationshipStage::CloseFriend => Some(RelationshipStage::Intimate),
            RelationshipStage::Intimate => None,
        }
    }
}

/// 用户关系状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserRelation {
    pub user_id: String,
    pub trust: TrustModel,
    pub stage: RelationshipStage,
    pub interaction_count: u32,
    pub last_interaction: Option<i64>,
}

impl UserRelation {
    pub fn new(user_id: &str) -> Self {
        Self {
            user_id: user_id.to_string(),
            trust: TrustModel::default(),
            stage: RelationshipStage::Stranger,
            interaction_count: 0,
            last_interaction: None,
        }
    }

    /// 记录一次互动
    pub fn record_interaction(&mut self, positivity: f32) {
        self.interaction_count += 1;
        self.last_interaction = Some(chrono::Utc::now().timestamp());

        // 对数增长避免线性膨胀
        let n = self.interaction_count as f32;
        let growth = positivity * (1.0 / (1.0 + n * 0.1)) * 0.05;

        self.trust.intimacy = (self.trust.intimacy + growth).min(1.0);
        self.trust.reliability = (self.trust.reliability + growth * 0.8).min(1.0);

        // 检查阶段升级
        if let Some(next) = self.stage.next() {
            if self.trust.composite_trust() >= next.min_trust() {
                self.stage = next;
            }
        }
    }
}

/// 关系管理器
#[derive(Debug, Clone, Default)]
pub struct RelationshipManager {
    pub relations: std::collections::HashMap<String, UserRelation>,
}

impl RelationshipManager {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn get_or_create(&mut self, user_id: &str) -> &mut UserRelation {
        self.relations
            .entry(user_id.to_string())
            .or_insert_with(|| UserRelation::new(user_id))
    }

    pub fn get(&self, user_id: &str) -> Option<&UserRelation> {
        self.relations.get(user_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_relationship_progression() {
        let mut rel = UserRelation::new("test_user");
        assert_eq!(rel.stage, RelationshipStage::Stranger);

        for _ in 0..50 {
            rel.record_interaction(0.8);
        }

        assert!(rel.interaction_count >= 50);
        assert!(rel.trust.composite_trust() > 0.1);
    }
}
