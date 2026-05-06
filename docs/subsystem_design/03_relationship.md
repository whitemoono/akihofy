# 关系动态系统详细设计

> **对应设计文档章节**: 四（关系动态）+ 九（关系动态层）
> **优先级**: P2

---

## 一、设计目标

构建非线性关系动态系统，支持：
- 多维度信任模型
- 关系阶段演进
- 冲突与修复机制
- 关系历史追踪

---

## 二、信任模型

### 2.1 信任维度

```rust
#[derive(Debug, Clone)]
pub struct TrustModel {
    pub reliability: f32,        // 可靠性
    pub authenticity: f32,       // 真实性
    pub competence: f32,        // 能力认同
    pub intimacy: f32,           // 亲密程度
    pub self_disclosure: f32,   // 自我表露
}

impl TrustModel {
    pub fn overall(&self) -> f32 {
        (self.reliability * 0.25
            + self.authenticity * 0.20
            + self.competence * 0.15
            + self.intimacy * 0.25
            + self.self_disclosure * 0.15)
    }

    pub fn evolve(&mut self, event: &TrustEvent) {
        match event {
            TrustEvent::PromiseKept => self.reliability += 0.1,
            TrustEvent::PromiseBroken => self.reliability -= 0.2,
            TrustEvent::HonestStatement => self.authenticity += 0.05,
            TrustEvent::Deception => self.authenticity -= 0.3,
            TrustEvent::SharedSuccess => self.competence += 0.1,
            TrustEvent::HelpReceived => self.intimacy += 0.1,
            TrustEvent::DeepSharing => {
                self.self_disclosure += 0.15;
                self.intimacy += 0.05;
            }
            TrustEvent::Betrayal => {
                self.reliability -= 0.3;
                self.authenticity -= 0.3;
                self.intimacy -= 0.2;
            }
        }
        self.clamp();
    }

    fn clamp(&mut self) {
        self.reliability = self.reliability.clamp(0.0, 1.0);
        self.authenticity = self.authenticity.clamp(0.0, 1.0);
        self.competence = self.competence.clamp(0.0, 1.0);
        self.intimacy = self.intimacy.clamp(0.0, 1.0);
        self.self_disclosure = self.self_disclosure.clamp(0.0, 1.0);
    }
}

pub enum TrustEvent {
    PromiseKept,
    PromiseBroken,
    HonestStatement,
    Deception,
    SharedSuccess,
    HelpReceived,
    DeepSharing,
    Betrayal,
}
```

---

## 三、关系阶段

### 3.1 阶段定义

```
┌─────────────────────────────────────────────────────────────┐
│                    关系发展阶段                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  陌生 ──► 认识 ──► 熟悉 ──► 朋友 ──► 知己 ──► 亲密          │
│   │       │       │       │       │       │                 │
│  初遇    交换    信任    依赖    深层    全面                 │
│          信息    建立    形成    了解    接纳                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum RelationshipStage {
    Stranger,      // 陌生人
    Acquaintance,  // 认识
    Familiar,     // 熟悉
    Friend,       // 朋友
    CloseFriend,  // 知己
    Intimate,     // 亲密
}

impl RelationshipStage {
    pub fn trust_requirement(&self) -> f32 {
        match self {
            RelationshipStage::Stranger => 0.0,
            RelationshipStage::Acquaintance => 0.2,
            RelationshipStage::Familiar => 0.4,
            RelationshipStage::Friend => 0.6,
            RelationshipStage::CloseFriend => 0.8,
            RelationshipStage::Intimate => 0.95,
        }
    }

    pub fn intimacy_requirement(&self) -> f32 {
        match self {
            RelationshipStage::Stranger => 0.0,
            RelationshipStage::Acquaintance => 0.1,
            RelationshipStage::Familiar => 0.3,
            RelationshipStage::Friend => 0.5,
            RelationshipStage::CloseFriend => 0.7,
            RelationshipStage::Intimate => 0.9,
        }
    }

    pub fn interaction_expectations(&self) -> InteractionExpectations {
        match self {
            RelationshipStage::Stranger => InteractionExpectations {
                surface_conversation: 0.8,
                emotional_expression: 0.1,
                personal_sharing: 0.0,
                support_provision: 0.0,
            },
            RelationshipStage::Friend => InteractionExpectations {
                surface_conversation: 0.4,
                emotional_expression: 0.5,
                personal_sharing: 0.4,
                support_provision: 0.3,
            },
            RelationshipStage::Intimate => InteractionExpectations {
                surface_conversation: 0.1,
                emotional_expression: 0.9,
                personal_sharing: 0.9,
                support_provision: 0.8,
            },
            _ => InteractionExpectations::default(),
        }
    }
}
```

### 3.2 关系评估

```rust
pub struct RelationshipEvaluator;

impl RelationshipEvaluator {
    pub fn evaluate(&self, relationship: &Relationship) -> RelationshipAssessment {
        let trust_score = relationship.trust.overall();
        let stage_score = relationship.stage as u8 as f32 / 6.0;
        let history_score = self.evaluate_history(&relationship.history);
        let reciprocity = self.calculate_reciprocity(relationship);

        RelationshipAssessment {
            health_score: (trust_score + stage_score + history_score) / 3.0,
            connection_depth: relationship.trust.intimacy,
            reciprocity_score: reciprocity,
            issues: self.detect_issues(relationship),
            recommendations: self.suggest_improvements(relationship),
        }
    }

    fn detect_issues(&self, relationship: &Relationship) -> Vec<RelationshipIssue> {
        let mut issues = Vec::new();

        if relationship.trust.reliability < 0.3 {
            issues.push(RelationshipIssue::TrustDeficit);
        }

        if relationship.neglect_days > 30 {
            issues.push(RelationshipIssue::Neglect);
        }

        if relationship.conflict_count > relationship.interaction_count as f32 * 0.3 {
            issues.push(RelationshipIssue::HighConflict);
        }

        issues
    }
}
```

---

## 四、关系动态

### 4.1 关系动态因子

```rust
#[derive(Debug, Clone)]
pub struct RelationshipDynamics {
    pub reciprocity: f32,          // 互惠程度
    pub responsiveness: f32,      // 响应性
    pub investment: f32,           // 投入程度
    pub commitment: f32,           // 承诺水平
    pub satisfaction: f32,         // 满意度
    pub alternatives: f32,         // 替代选项感知
}

impl RelationshipDynamics {
    pub fn stability_score(&self) -> f32 {
        // 稳定性 = 承诺 + 满意度 - 替代选项
        (self.commitment * 0.4 + self.satisfaction * 0.4 - self.alternatives * 0.2).clamp(0.0, 1.0)
    }

    pub fn evolve(&mut self, event: &DynamicEvent) {
        match event {
            DynamicEvent::MutualSupport => {
                self.reciprocity += 0.1;
                self.satisfaction += 0.05;
            }
            DynamicEvent::QuickResponse => self.responsiveness += 0.1,
            DynamicEvent::SlowResponse => self.responsiveness -= 0.05,
            DynamicEvent::MutualSharing => self.investment += 0.1,
            DynamicEvent::OneSided => {
                self.reciprocity -= 0.15;
                self.satisfaction -= 0.1;
            }
            DynamicEvent::Commitment => self.commitment += 0.2,
            DynamicEvent::BetterAlternative => self.alternatives += 0.2,
        }
    }
}
```

### 4.2 冲突处理

```rust
pub struct ConflictResolver;

impl ConflictResolver {
    pub fn resolve(&self, conflict: &Conflict, context: &Relationship) -> ConflictOutcome {
        let trust_level = context.trust.overall();

        match (conflict.severity, trust_level) {
            (0.0..=0.3, _) => ConflictOutcome::NaturalResolution,
            (0.3..=0.6, 0.6..=1.0) => ConflictOutcome::HealthyDiscussion {
                repair_effect: 0.1,
            },
            (0.6..=1.0, 0.8..=1.0) => ConflictOutcome::Growth {
                post_conflict_trust: context.trust.overall() + 0.05,
            },
            (_, 0.0..=0.3) => ConflictOutcome::Damage {
                trust_loss: conflict.severity * 0.3,
            },
            _ => ConflictOutcome::RequiresExternalSupport,
        }
    }
}

pub enum ConflictOutcome {
    NaturalResolution,
    HealthyDiscussion { repair_effect: f32 },
    Growth { post_conflict_trust: f32 },
    Damage { trust_loss: f32 },
    RequiresExternalSupport,
}
```

---

## 五、关系记录

```rust
#[derive(Debug, Clone)]
pub struct Relationship {
    pub id: String,
    pub partner_id: String,
    pub stage: RelationshipStage,
    pub trust: TrustModel,
    pub dynamics: RelationshipDynamics,
    pub history: Vec<RelationshipEvent>,
    pub shared_memories: Vec<String>,
    pub interaction_count: u32,
    pub conflict_count: u32,
    pub last_interaction: DateTime,
    pub neglect_days: i64,
    pub custom_tags: Vec<String>,
}

impl Relationship {
    pub fn new(partner_id: String) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            partner_id,
            stage: RelationshipStage::Stranger,
            trust: TrustModel {
                reliability: 0.5,
                authenticity: 0.5,
                competence: 0.5,
                intimacy: 0.0,
                self_disclosure: 0.0,
            },
            dynamics: RelationshipDynamics {
                reciprocity: 0.5,
                responsiveness: 0.5,
                investment: 0.3,
                commitment: 0.0,
                satisfaction: 0.5,
                alternatives: 0.5,
            },
            history: Vec::new(),
            shared_memories: Vec::new(),
            interaction_count: 0,
            conflict_count: 0,
            last_interaction: Utc::now(),
            neglect_days: 0,
            custom_tags: Vec::new(),
        }
    }

    pub fn record_interaction(&mut self, interaction: Interaction) {
        self.interaction_count += 1;
        self.last_interaction = Utc::now();
        self.neglect_days = 0;

        self.history.push(RelationshipEvent::Interaction(interaction));
        self.evolve_from_interaction();
    }

    fn evolve_from_interaction(&mut self) {
        // 检查阶段升级
        if self.trust.overall() >= self.stage.trust_requirement() + 0.1 {
            self.upgrade_stage();
        }

        // 衰减
        self.dynamics.investment *= 0.999;
        self.dynamics.commitment *= 0.999;
    }

    fn upgrade_stage(&mut self) {
        let next = match self.stage {
            RelationshipStage::Stranger => RelationshipStage::Acquaintance,
            RelationshipStage::Acquaintance => RelationshipStage::Familiar,
            RelationshipStage::Familiar => RelationshipStage::Friend,
            RelationshipStage::Friend => RelationshipStage::CloseFriend,
            RelationshipStage::CloseFriend => RelationshipStage::Intimate,
            RelationshipStage::Intimate => return,
        };

        self.history.push(RelationshipEvent::StageChange {
            from: self.stage,
            to: next,
            timestamp: Utc::now(),
        });

        self.stage = next;
    }
}
```

---

## 六、Rust 实现

### 6.1 模块结构

```rust:1:50:akiho-core/src/relationship/mod.rs
mod trust;
mod dynamics;

pub use trust::{TrustModel, TrustEvent};
pub use dynamics::{RelationshipDynamics, DynamicEvent};

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Relationship {
    pub id: String,
    pub partner_id: String,
    pub stage: u8,  // 0-5 对应 RelationshipStage
    pub trust: TrustModel,
    pub dynamics: RelationshipDynamics,
    pub interaction_count: u32,
    pub last_interaction: i64,
}

impl Relationship {
    pub fn new(partner_id: String) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            partner_id,
            stage: 0,
            trust: TrustModel::default(),
            dynamics: RelationshipDynamics::default(),
            interaction_count: 0,
            last_interaction: chrono::Utc::now().timestamp(),
        }
    }

    pub fn get_stage(&self) -> &'static str {
        match self.stage {
            0 => "Stranger",
            1 => "Acquaintance",
            2 => "Familiar",
            3 => "Friend",
            4 => "CloseFriend",
            5 => "Intimate",
            _ => "Unknown",
        }
    }
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

impl Default for RelationshipDynamics {
    fn default() -> Self {
        Self {
            reciprocity: 0.5,
            responsiveness: 0.5,
            investment: 0.3,
            commitment: 0.0,
            satisfaction: 0.5,
            alternatives: 0.5,
        }
    }
}
```

---

## 七、Python 绑定

```python
# engine/relationship.py
from akiho_core import Relationship, TrustEvent

class RelationshipManager:
    def __init__(self):
        self.relationships: Dict[str, Relationship] = {}

    def get_or_create(self, user_id: str) -> Relationship:
        if user_id not in self.relationships:
            self.relationships[user_id] = Relationship(user_id)
        return self.relationships[user_id]

    def record_interaction(self, user_id: str, quality: float, duration: float):
        rel = self.get_or_create(user_id)
        rel.interaction_count += 1
        rel.last_interaction = time.time()

        if quality > 0.7:
            rel.trust.evolve("positive")
        else:
            rel.trust.evolve("negative")

    def get_status(self, user_id: str) -> dict:
        rel = self.get_or_create(user_id)
        return {
            "stage": rel.get_stage(),
            "trust": rel.trust.overall(),
            "intimacy": rel.trust.intimacy,
            "interactions": rel.interaction_count,
        }
```

---

## 八、网页端用户档案系统

### 8.1 设计背景

网页端对话系统需要支持**多用户**同时使用 AKIHO。每个用户与 AKIHO 的互动应该是独立的：
- AKIHO 对不同用户有不同的印象、亲密度、相处模式
- 不是所有用户都会被记住——路人只是陌生人
- 记忆系统需要隔离不同用户的互动历史

### 8.2 用户档案

```python
class UserProfile:
    """
    网页端用户档案

    每个 user_id 对应一个独立的档案，
    记录 AKIHO 对这个人的所有"私人印象"
    """

    # 基础信息
    user_id: str                     # 用户的唯一标识
    display_name: str                 # 用户的显示名称
    nickname: str                    # AKIHO 对这个用户的称呼（可自定义）

    # 关系状态（每个用户独立）
    relationship: Relationship        # 复用现有的关系系统
    intimacy_level: float             # 亲密度 0-1
    consecutive_days: int             # 连续互动天数
    total_interactions: int           # 总互动次数

    # 关系层级（决定记忆深度）
    relation_level: RelationLevel

    # AKIHO 对这个人的印象
    impression: str                  # "这个人... 有点意思"
    pet_peeves: List[str]            # 雷点 ["被叫错名字", "聊政治"]
    preferences: Dict[str, Any]      # 偏好 {"likes_humor": True}
    notable_traits: List[str]        # 显著特征 ["很会安慰人", "话很多"]

    # 共享记忆锚点
    memorable_moments: List[str]      # 重要时刻 ["那天他说我很可爱..."]
    inside_jokes: List[str]          # 梗 ["每次提到这个他都会笑"]

    # 冲突记录
    conflicts: List[Conflict]         # 曾经的摩擦
    unresolved_issues: List[str]      # 未解决的问题

    # 外部信息（从对话中推断）
    inferred_info: Dict[str, str]    # 推断的个人信息 {"职业": "程序员"}

    # 时间戳
    first_seen: datetime
    last_interaction: datetime
    created_at: datetime


class RelationLevel(Enum):
    """关系层级（决定记忆深度和遗忘速度）"""

    STRANGER = 0
    """
    陌生人
    - 没有任何印象
    - 不存储档案（或快速遗忘）
    - 仅通过 user_id 识别
    """

    ACQUAINTANCE = 1
    """
    眼熟的人
    - 有模糊印象
    - 存储基础档案（轻量）
    - 7 天无互动 → 遗忘
    """

    FRIEND = 2
    """
    认识的人
    - 有具体印象
    - 存储完整档案
    - 90 天无互动 → 降级
    """

    CLOSE = 3
    """
    熟悉的人
    - 有深入了解
    - 存储完整档案 + 共享记忆
    - 365 天无互动 → 降级
    """

    IMPORTANT = 4
    """
    重要的人
    - 核心关系
    - 永不遗忘
    - 主动维护
    """
```

### 8.3 用户档案管理器

```python
class UserProfileManager:
    """
    用户档案管理器

    负责：
    - 创建/获取用户档案
    - 关系层级升降
    - 遗忘触发
    - 档案持久化
    """

    def __init__(self, memory_system):
        self.profiles: Dict[str, UserProfile] = {}
        self.memory_system = memory_system  # 记忆系统引用

        # 关系层级阈值
        self.LEVEL_THRESHOLDS = {
            RelationLevel.ACQUAINTANCE: {"days": 7, "interactions": 1},
            RelationLevel.FRIEND: {"days": 30, "interactions": 10},
            RelationLevel.CLOSE: {"days": 180, "interactions": 50},
            RelationLevel.IMPORTANT: {"days": None, "interactions": 200},  # 永不降级
        }

    def get_or_create(self, user_id: str, display_name: str = None) -> UserProfile:
        """获取或创建用户档案"""
        if user_id not in self.profiles:
            self.profiles[user_id] = UserProfile(
                user_id=user_id,
                display_name=display_name or user_id,
                nickname=display_name or user_id,
                relationship=Relationship.new(user_id),
                relation_level=RelationLevel.STRANGER,
                first_seen=datetime.now(),
                created_at=datetime.now(),
            )
        return self.profiles[user_id]

    def record_interaction(self, user_id: str, message: str, reply: str, quality: float):
        """
        记录一次互动

        触发：
        - 关系阶段演进检查
        - 关系层级升级检查
        - 记忆锚点生成（高互动质量时）
        """
        profile = self.get_or_create(user_id)

        # 更新基础统计
        profile.total_interactions += 1
        profile.last_interaction = datetime.now()

        # 更新关系系统
        profile.relationship.record_interaction(
            Interaction(
                quality=quality,
                content=f"{message} -> {reply}",
            )
        )

        # 检查是否需要升级
        self._check_upgrade(profile)

        # 高质量互动 → 生成记忆锚点
        if quality > 0.8 and len(reply) > 10:
            self._generate_memory_anchor(profile, message, reply)

    def _check_upgrade(self, profile: UserProfile):
        """检查是否应该升级关系层级"""
        current = profile.relation_level
        days = (datetime.now() - profile.first_seen).days
        interactions = profile.total_interactions

        # 逐级检查
        if current == RelationLevel.STRANGER and interactions >= 1:
            profile.relation_level = RelationLevel.ACQUAINTANCE

        elif current == RelationLevel.ACQUAINTANCE:
            if days >= 7 or interactions >= 10:
                profile.relation_level = RelationLevel.FRIEND

        elif current == RelationLevel.FRIEND:
            if days >= 30 or interactions >= 50:
                profile.relation_level = RelationLevel.CLOSE

        elif current == RelationLevel.CLOSE:
            if interactions >= 200:
                profile.relation_level = RelationLevel.IMPORTANT

    def _generate_memory_anchor(self, profile: UserProfile, message: str, reply: str):
        """生成记忆锚点（存入记忆系统）"""
        anchor = f"和 {profile.display_name} 聊天：{reply[:50]}..."
        profile.memorable_moments.append(anchor)

        # 存入记忆系统
        self.memory_system.add_episodic_memory(
            content=anchor,
            importance=0.7,
            tags=[f"user_{profile.user_id}"],
        )

    def check_decay(self):
        """
        检查遗忘（定时任务）

        遍历所有档案，执行遗忘逻辑
        """
        now = datetime.now()

        for user_id, profile in list(self.profiles.items()):
            if profile.relation_level == RelationLevel.IMPORTANT:
                continue  # 重要的人永不遗忘

            days_since = (now - profile.last_interaction).days

            # 检查衰减规则
            if profile.relation_level == RelationLevel.ACQUAINTANCE:
                if days_since >= 7:
                    del self.profiles[user_id]  # 直接删除

            elif profile.relation_level == RelationLevel.FRIEND:
                if days_since >= 90:
                    profile.relation_level = RelationLevel.ACQUAINTANCE
                    profile.memorable_moments.clear()  # 忘记重要时刻

            elif profile.relation_level == RelationLevel.CLOSE:
                if days_since >= 365:
                    profile.relation_level = RelationLevel.FRIEND
```

### 8.4 记忆隔离

不同用户的互动记忆需要隔离，防止泄露：

```python
class MemoryIsolation:
    """
    记忆隔离机制

    确保 AKIHO 不会无意中透露与其他用户的私密对话
    """

    def filter_memories_for_user(self, user_id: str, memories: List[Memory]) -> List[Memory]:
        """
        过滤出仅属于该用户的记忆

        规则：
        - 带有 user_id tag 的记忆只对对应用户可见
        - 不带 tag 的公共记忆对所有用户可见
        """
        filtered = []
        for memory in memories:
            tags = memory.get("tags", [])

            # 无 tag → 公共记忆
            if not any(t.startswith("user_") for t in tags):
                filtered.append(memory)
                continue

            # 有 user_ tag → 检查是否匹配
            if f"user_{user_id}" in tags:
                filtered.append(memory)

        return filtered

    def build_context_for_user(self, user_id: str) -> Dict:
        """
        为特定用户构建上下文

        包含：
        - 该用户的档案
        - 仅属于该用户的记忆
        - 公共记忆（不涉及其他用户）
        """
        profile = self.profile_manager.get_or_create(user_id)
        user_memories = self.filter_memories_for_user(user_id, self.get_all_memories())

        return {
            "profile": profile,
            "relationship_stage": profile.relationship.get_stage(),
            "intimacy": profile.intimacy_level,
            "impression": profile.impression,
            "recent_interactions": profile.memorable_moments[-5:],
            "user_memories": user_memories,
            "public_memories": self.get_public_memories(),
        }
```

### 8.5 与现有系统的整合

```
┌─────────────────────────────────────────────────────────┐
│                    用户档案系统                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  UserProfile ──► Relationship ──► TrustModel           │
│       │                │                 │              │
│       │                │                 ├── Reliability │
│       │                │                 ├── Authenticity│
│       │                │                 ├── Competence │
│       │                │                 ├── Intimacy   │
│       │                │                 └── SelfDisclosure
│       │                │                                │
│       │                └── RelationshipDynamics        │
│       │                              ├── Reciprocity   │
│       │                              ├── Responsiveness │
│       │                              ├── Commitment     │
│       │                              └── Satisfaction   │
│       │                                                │
│       └── RelationLevel ──► 记忆深度 + 遗忘规则         │
│                              ├── STRANGER              │
│                              ├── ACQUAINTANCE         │
│                              ├── FRIEND                │
│                              ├── CLOSE                 │
│                              └── IMPORTANT             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 8.6 实际行为示例

```
场景 1：新用户第一次聊天

AKIHO 表现：
- 态度矜持，不太热情
- 不会分享私密信息
- 称呼："你" 或 用户名

场景 2：老用户连续 30 天互动

AKIHO 表现：
- 主动打招呼（"你又来啦~"）
- 会开玩笑、调侃
- 记得之前的对话内容
- 称呼：用户的 nickname

场景 3：用户踩到雷点

AKIHO 表现：
- 冷淡回应或拒绝
- 记录到 pet_peeves
- 下次遇到类似话题会避开

场景 4：用户消失了 3 个月后回来

AKIHO 表现（如果是 FRIEND 降级到 ACQUAINTANCE）：
- "好久不见... 你谁来着？"
- 需要重新熟悉
- 之前的重要时刻被遗忘

场景 5：主人回来

AKIHO 表现：
- 永远记得
- 亲密度从不断崖式下跌
- "主人回来啦！等你好久了~"

---

## 九、核心用户关系系统

### 9.1 设计理念

真正的关系应该是**双向的、有生命力的**：
- 即使是你，做错事也会被冷落
- 即使是你，太久不来也会受伤、会生气
- AKIHO 对你的态度，取决于你如何对待她

没有人是"应得的"永恒关系，即使是主人，也需要用心经营。

### 9.2 区分维度

```
┌─────────────────────────────────────────────────┐
│              用户分类                             │
├─────────────────────────────────────────────────┤
│                                                 │
│  核心用户 (Core User)                           │
│  ├── 关系起点高，但可降级                       │
│  ├── 降级条件：长期冷落 / 伤害行为               │
│  ├── 升级条件：持续投入、真诚互动               │
│  └── 核心用户也可能"心冷"                      │
│                                                 │
│  普通用户 (Regular User)                        │
│  ├── 关系起点低                                │
│  ├── 快速衰减 / 遗忘                          │
│  └── 偶尔来访就走                               │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 9.3 核心用户状态

```python
class CoreUserStatus(Enum):
    """
    核心用户的关系状态（可升降）
    """

    DEVOTED = "devoted"       # 全身心投入
    """
    - 你经常来、对她好
    - AKIHO 信任你、依赖你
    - "有你在真好..."
    """

    STABLE = "stable"         # 稳定关系
    """
    - 正常的长期关系
    - 偶尔冷淡但不会消失
    - "嗯，你一直都在"
    """

    COOLING = "cooling"       # 正在冷却
    """
    - 你最近很少来，或者做了让她失望的事
    - AKIHO 开始疏远
    - "你不是挺忙的吗？"
    """

    HURT = "hurt"            # 受伤
    """
    - 严重伤害（欺骗、背叛）
    - AKIHO 防备你
    - "我不想聊这个..."
    """

    RECOVERING = "recovering" # 修复中
    """
    - 你在弥补
    - AKIHO 在观察
    - "你最近...好像有点不一样"
    """
```

### 9.4 关系升降规则

```python
class CoreUserRelationship:
    """
    核心用户关系动态
    """

    # 升级条件
    UPGRADE_TRIGGERS = {
        CoreUserStatus.HURT: [
            "用户真诚道歉",
            "持续关心超过 7 天",
            "在关键时刻站在她这边",
        ],
        CoreUserStatus.COOLING: [
            "恢复正常互动频率",
            "主动分享有趣的事",
            "记得重要日期",
        ],
    }

    # 降级条件
    DOWNGRADE_TRIGGERS = {
        CoreUserStatus.STABLE: [
            "连续 14 天无互动",          # 太久没来
            "敷衍回复超过 5 次",         # 明显的应付
            "提起敏感话题",              # 踩雷
        ],
        CoreUserStatus.DEVOTED: [
            "连续 30 天无互动",         # 太久了
            "一次严重伤害",              # 比如欺骗
        ],
    }

    def evaluate_transition(self, user_id: str) -> Optional[CoreUserStatus]:
        """
        评估是否应该升级/降级

        真正的关系是动态的，即使是核心用户也可能"心冷"
        """
        status = self.get_current_status(user_id)
        recent_events = self.get_recent_events(user_id)

        # 检查降级
        for trigger, conditions in self.DOWNGRADE_TRIGGERS.items():
            if status == trigger and self._match_conditions(recent_events, conditions):
                return self._get_next_lower_status(trigger)

        # 检查升级
        for trigger, conditions in self.UPGRADE_TRIGGERS.items():
            if status == trigger and self._match_conditions(recent_events, conditions):
                return self._get_next_higher_status(trigger)

        return None
```

### 9.5 主人 vs 普通访客

```python
class UserType(Enum):
    """用户类型"""

    OWNER = "owner"      # 主人
    VISITOR = "visitor"  # 访客


class BehaviorModifier:
    """行为修饰器：根据用户类型调整行为"""

    OWNER_BEHAVIOR = {
        "relation_level": RelationLevel.IMPORTANT,  # 起点是 IMPORTANT
        "can_decay": True,                          # 但可以降级
        "can_forget": False,                       # 不会被完全遗忘
        "max_intimacy": 1.0,                       # 亲密度上限
        "response_enthusiasm": 1.0,                # 回复热情
        "can_access_settings": True,               # 可访问设置
        "can_block_users": True,                    # 可屏蔽用户
    }

    VISITOR_BEHAVIOR = {
        "relation_level": RelationLevel.ACQUAINTANCE,  # 默认眼熟
        "can_decay": True,                              # 可衰减
        "can_forget": True,                             # 可遗忘
        "max_intimacy": 0.9,                            # 亲密度上限
        "response_enthusiasm": 0.5,                    # 回复热情
        "can_access_settings": False,                   # 不可访问设置
        "can_block_users": False,                       # 不可屏蔽用户
    }
```

### 9.6 主人档案的特殊待遇

```python
class OwnerProfile(UserProfile):
    """
    主人档案（继承 UserProfile）

    与普通档案的区别：
    - relation_level 起点是 IMPORTANT（但可降级）
    - 不会被完全遗忘（降级到底是 STRANGER，不会被删除）
    - 特殊标记
    """

    is_owner: bool = True

    def __init__(self, user_id: str, display_name: str):
        super().__init__(
            user_id=user_id,
            display_name=display_name,
            nickname="主人",
            relation_level=RelationLevel.IMPORTANT,
            core_status=CoreUserStatus.STABLE,
        )
        self.shared_secrets: List[str]

    def check_decay(self) -> bool:
        """主人会衰减，但衰减更慢"""
        days_since_interaction = self.get_days_since_interaction()
        return days_since_interaction > 60  # 60 天才衰减（普通用户 30 天）

    def should_forget(self) -> bool:
        """主人不会被删除，但可能被冷落到 STRANGER"""
        return False

    def get_recovery_multiplier(self) -> float:
        """主人恢复更快"""
        return 2.0  # 普通用户的 2 倍恢复速度
```

### 9.7 行为示例

```
场景 1：主人 + 正常互动

AKIHO："今天心情不错~ 想听我今天想到的事吗？"

场景 2：主人 + 连续两周没来

AKIHO（冷却中）："哦，你还在啊。我还以为你忘了..."
AKIHO（受伤）："算了，反正你也不在乎。"

场景 3：主人 + 踩了大雷

AKIHO（受伤）："...你说什么？"
AKIHO（防备）："我不想聊这个。你换别的话题吧。"

场景 4：主人在修复

AKIHO（观察中）："你最近...好像有点不一样？"
AKIHO（慢慢接受）："好吧，我再信你一次。"

场景 5：普通用户来访

AKIHO："你好。"
AKIHO："你是？...算了，不重要。"
```

### 9.8 设计公式

```
关系 = 投入 × 时间 × 质量

- 投入 = 你花多少心思
- 时间 = 持续多久
- 质量 = 互动是真诚还是敷衍
```

---

## 十、API 权限控制

```python
class Permission:
    """API 权限控制"""

    OWNER_ONLY = ["settings", "reset_memory", "block_user", "export_data"]
    VISITOR_ALLOWED = ["chat", "thought", "status", "memory"]

    def check_permission(self, user_id: str, action: str) -> bool:
        """检查用户是否有权限执行某个操作"""
        if action in self.OWNER_ONLY:
            return user_classifier.is_owner(user_id)
        return True
```

---

## 十一、配置

```json
// config.json
{
  "owner": {
    "user_id": "owner_001"
  },
  "relationship": {
    "decay_days": 30,        // 普通用户 30 天无互动开始衰减
    "owner_decay_days": 60,  // 主人 60 天才开始衰减
    "forget_days": 90,       // 普通用户 90 天后可能被遗忘
    "core_status_check_days": 7  // 每 7 天检查一次状态
  }
}
```

---

## 十二、实现建议

### 第一阶段（最小可行）

```python
# 1. 配置文件指定主人
# config.json
{
  "owner_user_id": "owner_001"
}

# 2. 简单判断
def is_owner(user_id: str) -> bool:
    return user_id == config["owner_user_id"]

# 3. 主人关系动态
if is_owner(user_id):
    profile = get_or_create_owner_profile(user_id)
else:
    profile = get_or_create_visitor_profile(user_id)

# 主人也会衰减，但更慢
profile.apply_decay(days_since_interaction)
```

### 第二阶段（可选扩展）

- 核心用户状态升降级
- 关系事件追踪
- 主人可查看访客列表和关系状态
- 主人可设置多个（家庭成员？）

