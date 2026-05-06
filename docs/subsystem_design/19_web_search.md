# Web 搜索与自主学习模块

> **对应设计章节**: 自主性系统扩展——主动信息获取与知识积累
> **优先级**: P1
> **状态**: 设计阶段
>
> **核心命题**: 她不只是被动接收信息，而是有自己的好奇心。她会主动搜索想了解的东西，阅读、理解、形成观点，并将新知识整合进自己的认知体系。

---

## 一、设计目标

基于 `09_twitter_integration.md` 的管线设计模板，构建 Web 搜索与自主学习系统：

1. **自主提问生成** —— 从好奇心驱动到具体搜索 query
2. **Web 搜索管线** —— 搜索→筛选→理解→评估
3. **知识整合引擎** —— 将搜索结果转化为结构化知识
4. **兴趣演化** —— 从初始兴趣种子到通过体验调整的闭环

---

## 二、架构概览

```
用户兴趣种子（初始配置）
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    自主搜索管线                                  │
│                                                                 │
│  1. QuestionGenerator                                           │
│     "我现在想知道什么？"                                        │
│     输入：好奇心驱动强度 + 当前情绪 + 知识缺口                   │
│     输出：SearchIntent { query, urgency, depth }                 │
│                                                                 │
│  2. SearchExecutor                                              │
│     搜索引擎接口（可替换）                                       │
│     输入：SearchIntent                                          │
│     输出：Vec<SearchResult>                                     │
│                                                                 │
│  3. AttentionGate (复用 Twitter 管线)                            │
│     信号：作者权威、内容类型、新颖度、兴趣匹配、情绪共鸣          │
│     输出：筛选后的结果列表                                       │
│                                                                 │
│  4. ContentUnderstandingEngine (复用 Twitter 管线)               │
│     L0 快速评估 + L1 LLM 深度理解                                │
│     输出：理解摘要                                               │
│                                                                 │
│  5. EmotionalImpactCalculator (复用 Twitter 管线)                │
│     PAD delta 计算                                               │
│     输出：情绪变化                                               │
│                                                                 │
│  6. KnowledgeIntegrationEngine (新增)                            │
│     提取事实 → 语义记忆 L3                                       │
│     提取观点 → 信念系统审查                                       │
│     更新兴趣模型                                                  │
│     输出：KnowledgeDelta                                        │
│                                                                 │
│  7. OpinionFormationEngine (复用 Twitter 管线)                    │
│     立场向量、证据累积                                           │
│     输出：Opinion                                                │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
  记忆编码 + 自我叙事更新
```

---

## 三、核心数据结构

### 3.1 搜索意图

```rust
/// 搜索意图 —— "我想知道什么"
#[derive(Debug, Clone)]
pub struct SearchIntent {
    /// 搜索查询
    pub query: String,

    /// 搜索紧迫度 (0.0 ~ 1.0)
    pub urgency: f32,

    /// 期望的深度
    pub depth: SearchDepth,

    /// 搜索动机
    pub motivation: SearchMotivation,

    /// 触发搜索的内部驱动
    pub source_drive: Option<DriveType>,

    /// 相关问题（用于后续探索）
    pub follow_up_questions: Vec<String>,

    /// 生成时间
    pub created_at: DateTime,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SearchDepth {
    Quick,      // 快速了解（1-2 个结果）
    Moderate,   // 适度了解（3-5 个结果）
    Deep,       // 深入了解（5-10 个结果，含关联链接）
    Research,   // 研究级别（多轮搜索、交叉验证）
}

#[derive(Debug, Clone)]
pub enum SearchMotivation {
    /// 纯粹的好奇
    Curiosity { topic: String },
    /// 填补知识缺口
    KnowledgeGap { gap_description: String },
    /// 验证已有信念
    BeliefVerification { belief: String },
    /// 回应外部刺激（如看到推文后的搜索）
    ExternalStimulus { source: String },
    /// 解决当前问题
    ProblemSolving { problem: String },
}
```

### 3.2 搜索结果

```rust
/// 搜索结果
#[derive(Debug, Clone)]
pub struct SearchResult {
    /// URL
    pub url: String,
    /// 标题
    pub title: String,
    /// 摘要片段
    pub snippet: String,
    /// 来源域名
    pub source_domain: String,
    /// 搜索结果排名
    pub rank: usize,
    /// 估计的权威度 (0.0 ~ 1.0)
    pub estimated_authority: f32,
    /// 发布时间（如果可获取）
    pub published_at: Option<DateTime>,
}

/// 经过注意力筛选和理解处理后的结果
#[derive(Debug, Clone)]
pub struct ProcessedSearchResult {
    /// 原始结果
    pub source: SearchResult,
    /// 注意力得分
    pub attention_score: f32,
    /// 内容理解摘要
    pub understanding: ContentUnderstanding,
    /// 情感影响
    pub emotional_impact: PADDelta,
    /// 提取的关键事实
    pub extracted_facts: Vec<Fact>,
    /// 提取的观点
    pub extracted_opinions: Vec<ExtractedOpinion>,
    /// 与已有知识的关联
    pub knowledge_connections: Vec<KnowledgeConnection>,
}
```

### 3.3 知识整合

```rust
/// 知识增量 —— 一次搜索学到的东西
#[derive(Debug, Clone)]
pub struct KnowledgeDelta {
    /// 新增的事实
    pub new_facts: Vec<Fact>,
    /// 修正的已有知识
    pub corrected_facts: Vec<FactCorrection>,
    /// 被验证的已有知识
    pub verified_facts: Vec<MemoryId>,
    /// 新建立的知识关联
    pub new_connections: Vec<KnowledgeConnection>,
    /// 兴趣模型的更新
    pub interest_updates: Vec<InterestUpdate>,
    /// 搜索的总"收获感"
    pub learning_satisfaction: f32,
}

#[derive(Debug, Clone)]
pub struct Fact {
    pub statement: String,
    pub source_url: String,
    pub confidence: f32,
    pub domain: KnowledgeDomain,
    pub is_novel: bool, // 是新知识还是已知的
}

#[derive(Debug, Clone)]
pub struct FactCorrection {
    pub memory_id: MemoryId,
    pub old_statement: String,
    pub new_statement: String,
    pub correction_source: String,
}

#[derive(Debug, Clone)]
pub struct KnowledgeConnection {
    pub from_fact_id: String,
    pub to_fact_id: String,
    pub connection_type: ConnectionType,
    pub description: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConnectionType {
    Causal,        // 因果关系
    Hierarchical,  // 层级关系
    Similar,       // 相似关系
    Contradictory, // 矛盾关系
    Chronological, // 时间关系
}

#[derive(Debug, Clone)]
pub struct ExtractedOpinion {
    pub stance: String,
    pub supporting_evidence: Vec<String>,
    pub source_credibility: f32,
    pub emotional_tone: f32,
}
```

### 3.4 兴趣演化

```rust
/// 兴趣模型
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterestModel {
    /// 加权兴趣向量
    pub interests: HashMap<String, InterestEntry>,

    /// 兴趣发展历史
    pub evolution_history: Vec<InterestChange>,

    /// 当前"想知道"的优先级队列
    pub curiosity_queue: Vec<CuriosityItem>,

    /// 最后更新时间
    pub updated_at: DateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterestEntry {
    /// 兴趣名称
    pub name: String,
    /// 兴趣强度 (0.0 ~ 1.0)
    pub strength: f32,
    /// 兴趣成熟度 (0.0 ~ 1.0) —— 越高说明已有较多探索
    pub maturity: f32,
    /// 搜索次数
    pub search_count: u32,
    /// 最近一次搜索时间
    pub last_searched: Option<DateTime>,
    /// 兴趣词关联的关键词
    pub keywords: Vec<String>,
    /// 子兴趣
    pub sub_interests: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterestChange {
    pub interest_name: String,
    pub old_strength: f32,
    pub new_strength: f32,
    pub trigger: String,
    pub timestamp: DateTime,
}

#[derive(Debug, Clone)]
pub struct CuriosityItem {
    pub question: String,
    pub interest_area: String,
    pub priority: f32,
    pub added_at: DateTime,
}
```

---

## 四、核心处理流程

### 4.1 自主提问生成器

```rust
/// 提问生成器 —— "我现在想知道什么？"
pub struct QuestionGenerator {
    /// 兴趣模型
    pub interest_model: InterestModel,
    /// 好奇心驱动
    pub curiosity_drive: DriveState,
    /// 知识图谱
    pub knowledge_graph: KnowledgeGraph,
}

impl QuestionGenerator {
    /// 生成搜索意图
    pub fn generate_search_intent(&self, context: &AutonomousContext) -> Option<SearchIntent> {
        // 1. 检查是否有燃眉之急（待解决问题、未回复问题等）
        if let Some(urgent) = self.check_urgent_needs(context) {
            return Some(urgent);
        }

        // 2. 检查好奇心驱动强度
        let curiosity_tension = self.curiosity_drive.tension;
        if curiosity_tension < 0.3 {
            return None; // 好奇心不够强，不主动搜索
        }

        // 3. 从 curiosity_queue 取最高优先级
        let item = self.select_curiosity_item()?;

        // 4. 生成具体搜索 query
        let query = self.formulate_query(&item, context);

        // 5. 决定搜索深度
        let depth = match curiosity_tension {
            t if t > 0.8 => SearchDepth::Deep,
            t if t > 0.5 => SearchDepth::Moderate,
            _ => SearchDepth::Quick,
        };

        // 6. 生成后续问题
        let follow_ups = self.generate_follow_up_questions(&item, &query);

        Some(SearchIntent {
            query,
            urgency: curiosity_tension,
            depth,
            motivation: SearchMotivation::Curiosity {
                topic: item.interest_area.clone(),
            },
            source_drive: Some(DriveType::Curiosity),
            follow_up_questions: follow_ups,
            created_at: Utc::now(),
        })
    }

    /// 选择好奇心项目
    fn select_curiosity_item(&self) -> Option<CuriosityItem> {
        let mut items: Vec<_> = self.interest_model.curiosity_queue.iter().collect();

        // 按优先级排序（考虑兴趣强度 × 新颖性 × 情绪适应性）
        items.sort_by(|a, b| {
            let score_a = self.calculate_item_score(a);
            let score_b = self.calculate_item_score(b);
            score_b.partial_cmp(&score_a).unwrap()
        });

        items.first().map(|i| (*i).clone())
    }

    fn calculate_item_score(&self, item: &CuriosityItem) -> f32 {
        if let Some(entry) = self.interest_model.interests.get(&item.interest_area) {
            entry.strength * 0.4
                + (1.0 - entry.maturity) * 0.3  // 新颖性偏好
                + item.priority * 0.3
        } else {
            item.priority
        }
    }

    /// 将兴趣转化为具体搜索 query
    fn formulate_query(&self, item: &CuriosityItem, context: &AutonomousContext) -> String {
        // 基础 query
        let base = item.question.clone();

        // 根据知识状态优化 query
        if let Some(entry) = self.interest_model.interests.get(&item.interest_area) {
            if entry.maturity > 0.5 {
                // 已有一定了解，追问更深层的问题
                format!("{} 深入", base)
            }
        }

        base
    }
}
```

### 4.2 知识整合引擎

```rust
/// 知识整合引擎 —— 将搜索结果转化为结构化知识
pub struct KnowledgeIntegrationEngine {
    /// 语义记忆存储
    pub semantic_memory: SemanticMemoryStore,
    /// 自我模型引用
    pub self_model: Arc<SelfModel>,
    /// 知识图谱
    pub knowledge_graph: KnowledgeGraph,
}

impl KnowledgeIntegrationEngine {
    /// 整合搜索结果
    pub fn integrate(
        &mut self,
        results: &[ProcessedSearchResult],
        intent: &SearchIntent,
    ) -> KnowledgeDelta {
        let mut delta = KnowledgeDelta::default();

        for result in results {
            // 1. 提取新事实
            for fact in &result.extracted_facts {
                match self.semantic_memory.lookup_fact(&fact.statement) {
                    None => {
                        // 新知识！
                        delta.new_facts.push(fact.clone());
                    }
                    Some(existing) if existing.confidence < fact.confidence => {
                        // 已有知识被更新
                        delta.corrected_facts.push(FactCorrection {
                            memory_id: existing.id.clone(),
                            old_statement: existing.statement.clone(),
                            new_statement: fact.statement.clone(),
                            correction_source: result.source.url.clone(),
                        });
                    }
                    Some(_) => {
                        // 已有知识被验证
                        delta.verified_facts.push(existing.id.clone());
                    }
                }
            }

            // 2. 建立知识关联
            for connection in &result.knowledge_connections {
                if !self.knowledge_graph.has_connection(&connection.from_fact_id, &connection.to_fact_id) {
                    delta.new_connections.push(connection.clone());
                }
            }

            // 3. 兴趣更新
            if let Some(interest_update) = self.compute_interest_update(result, intent) {
                delta.interest_updates.push(interest_update);
            }
        }

        // 4. 计算学习满意度
        delta.learning_satisfaction = self.calculate_satisfaction(&delta, intent);

        // 5. 写入语义记忆
        self.commit(&delta);

        delta
    }

    /// 计算学习满意度
    fn calculate_satisfaction(&self, delta: &KnowledgeDelta, intent: &SearchIntent) -> f32 {
        let novelty_score = delta.new_facts.len() as f32 * 0.15;
        let correction_score = delta.corrected_facts.len() as f32 * 0.1;
        let connection_score = delta.new_connections.len() as f32 * 0.05;

        let base = (novelty_score + correction_score + connection_score).min(1.0);

        // 高紧迫度未满足则降低满意度
        if intent.urgency > 0.7 && delta.new_facts.is_empty() && delta.corrected_facts.is_empty() {
            base * 0.3
        } else {
            base
        }
    }
}
```

### 4.3 兴趣演化引擎

```rust
impl InterestModel {
    /// 处理一次搜索后的兴趣更新
    pub fn update_after_search(&mut self, intent: &SearchIntent, delta: &KnowledgeDelta) {
        let topic = match &intent.motivation {
            SearchMotivation::Curiosity { topic } => topic.clone(),
            SearchMotivation::KnowledgeGap { gap_description } => gap_description.clone(),
            _ => return,
        };

        let entry = self.interests
            .entry(topic.clone())
            .or_insert_with(|| InterestEntry {
                name: topic.clone(),
                strength: 0.1,
                maturity: 0.0,
                search_count: 0,
                last_searched: None,
                keywords: vec![],
                sub_interests: vec![],
            });

        entry.search_count += 1;
        entry.last_searched = Some(Utc::now());

        // 学习满意度影响兴趣强度
        let strength_change = if delta.learning_satisfaction > 0.6 {
            0.05  // 学到东西了，兴趣加深
        } else if delta.learning_satisfaction < 0.2 {
            -0.03 // 没学到东西，兴趣减弱
        } else {
            0.0
        };

        let old_strength = entry.strength;
        entry.strength = (entry.strength + strength_change).max(0.05).min(1.0);
        entry.maturity = (entry.maturity + 0.02).min(1.0);

        self.evolution_history.push(InterestChange {
            interest_name: topic,
            old_strength,
            new_strength: entry.strength,
            trigger: format!("搜索: {}", intent.query),
            timestamp: Utc::now(),
        });

        // 移除 curiosity_queue 中已处理的问题
        self.curiosity_queue.retain(|item| item.question != intent.query);
    }

    /// 从新知识中发现新的兴趣方向
    pub fn discover_new_interests(&mut self, delta: &KnowledgeDelta) {
        for fact in &delta.new_facts {
            // 分析事实的领域关键词
            let domain_keywords = extract_domain_keywords(&fact.statement);

            for keyword in domain_keywords {
                if !self.interests.contains_key(&keyword) {
                    // 如果与现有兴趣有关联，添加为子兴趣或新兴趣
                    if let Some(parent) = self.find_related_interest(&keyword) {
                        let entry = self.interests.get_mut(&parent).unwrap();
                        entry.sub_interests.push(keyword.clone());
                        entry.keywords.push(keyword);
                    }
                }
            }
        }

        // 生成新的好奇心问题
        for fact in &delta.new_facts {
            if fact.is_novel {
                self.curiosity_queue.push(CuriosityItem {
                    question: format!("关于{}，我还想知道更多", fact.domain),
                    interest_area: fact.domain.to_string(),
                    priority: fact.confidence * 0.5,
                    added_at: Utc::now(),
                });
            }
        }
    }
}
```

---

## 五、与自主性系统的集成

### 5.1 在思考循环中的位置

```
ThoughtLoop（来自 11_autonomous_system.md）:

  Perceive → Reflect → Decide → Act → Evaluate
                │                    │
                │         ┌──────────┴──────────┐
                │         │                      │
                │    TalkToUser            SearchWeb ←── 新增
                │    PostTweet             BrowseTwitter
                │    UpdateMemory          LearnFromResults
                │
                ▼
            Evaluate
```

### 5.2 搜索行为激活条件

```rust
impl ThoughtLoop {
    fn decide_action(&self, context: &AutonomousContext) -> Action {
        let curiosity_tension = context.drives.get(DriveType::Curiosity).tension;
        let social_tension = context.drives.get(DriveType::Affiliation).tension;

        // 好奇心 > 社交需求 + 有未搜索的好奇心问题 → 搜索
        if curiosity_tension > 0.5
            && curiosity_tension > social_tension
            && !self.question_generator.curiosity_queue_is_empty()
        {
            return Action::SearchWeb;
        }

        // ... 其他决策逻辑
        Action::Idle
    }
}
```

---

## 六、搜索提供者抽象

```rust
/// 搜索提供者接口（可替换实现）
#[async_trait]
pub trait SearchProvider: Send + Sync {
    /// 执行搜索
    async fn search(&self, query: &str, limit: usize) -> Result<Vec<SearchResult>>;

    /// 提供者的能力
    fn capabilities(&self) -> SearchCapabilities;
}

pub struct SearchCapabilities {
    pub max_results_per_query: usize,
    pub supports_time_filter: bool,
    pub supports_domain_filter: bool,
    pub rate_limit_per_minute: u32,
}

/// Google Custom Search 实现
pub struct GoogleSearchProvider {
    api_key: String,
    cx: String,
    client: reqwest::Client,
}

/// Bing Search 实现
pub struct BingSearchProvider {
    api_key: String,
    client: reqwest::Client,
}

/// DuckDuckGo 实现（免费，但功能有限）
pub struct DDGSearchProvider {
    client: reqwest::Client,
}
```

---

## 七、配置

```json
{
  "web_search": {
    "provider": "duckduckgo",
    "max_results_per_query": 10,
    "min_curiosity_threshold": 0.3,
    "max_searches_per_hour": 5,
    "max_searches_per_day": 20,
    "cooldown_after_search_seconds": 300,
    "attention_gate": {
      "min_interest_match": 0.2,
      "novelty_bonus": 0.15,
      "authority_threshold": 0.3
    },
    "knowledge_integration": {
      "min_fact_confidence": 0.5,
      "auto_correct_threshold": 0.8,
      "max_connections_per_result": 5
    },
    "interest_evolution": {
      "strength_increment": 0.05,
      "strength_decrement": 0.03,
      "maturity_increment": 0.02,
      "decay_days_without_search": 30
    }
  }
}
```

---

## 八、与 Twitter 管线的复用

| Twitter 管线组件 | Web Search 复用 |
|------------------|----------------|
| AttentionGate | 直接复用 —— 相同的信号评估逻辑 |
| ContentUnderstandingEngine (L0+L1) | 直接复用 —— L0 基于规则快速评估，L1 LLM 深度理解 |
| EmotionalImpactCalculator | 直接复用 —— PAD delta 按内容类型 |
| OpinionFormationEngine | 直接复用 —— 立场向量、证据累积 |
| EngagementDecisionEngine | 替换为 "保存/分享/追问" 决策 |
| TweetComposer | 替换为 "学习总结/知识卡片" 生成 |
| SocialRelationGraph | 不需要（网页搜索不涉及社交关系） |
| TwitterPersonalityEvolution | 替换为 InterestModel 演化 |

---

## 九、实现计划

| 阶段 | 任务 | 优先级 | 依赖 |
|------|------|--------|------|
| 1 | SearchProvider 接口 + DuckDuckGo 实现 | P0 | 无 |
| 2 | QuestionGenerator | P0 | 阶段1 + CuriosityDrive |
| 3 | ContentUnderstandingEngine（复用 Twitter） | P1 | 阶段2 |
| 4 | KnowledgeIntegrationEngine | P1 | 阶段3 |
| 5 | InterestModel + 演化引擎 | P1 | 阶段4 |
| 6 | 与 ThoughtLoop 集成 | P1 | 阶段2,3 |
| 7 | LLM Prompt 生成（学习成果分享） | P2 | 阶段4 |

---

## 十、测试用例

```rust
#[test]
fn test_question_generation_from_curiosity() {
    let mut generator = QuestionGenerator::new();
    generator.curiosity_drive.tension = 0.7;
    generator.curiosity_queue.push(CuriosityItem {
        question: "什么是神经网络？".into(),
        interest_area: "AI".into(),
        priority: 0.8,
        added_at: Utc::now(),
    });

    let intent = generator.generate_search_intent(&context);
    assert!(intent.is_some());
    assert_eq!(intent.unwrap().depth, SearchDepth::Moderate);
}

#[test]
fn test_interest_evolution_after_learning() {
    let mut model = InterestModel::new();
    model.interests.insert("AI".into(), InterestEntry {
        strength: 0.5,
        maturity: 0.2,
        search_count: 5,
        // ...
    });

    let delta = KnowledgeDelta {
        new_facts: vec![/* 3 new facts */],
        learning_satisfaction: 0.8,
        // ...
    };

    model.update_after_search(&intent, &delta);

    let ai_entry = model.interests.get("AI").unwrap();
    assert!(ai_entry.strength > 0.5, "成功的学习应该加深兴趣");
    assert!(ai_entry.maturity > 0.2);
}

#[test]
fn test_knowledge_integration_correction() {
    let mut engine = KnowledgeIntegrationEngine::new();

    // 已有事实 "天空是蓝色的" with confidence 0.6
    engine.semantic_memory.store_fact(Fact {
        statement: "天空是蓝色的".into(),
        confidence: 0.6,
        // ...
    });

    // 搜索结果声称 "天空是蓝色的因为瑞利散射" with confidence 0.9
    let result = ProcessedSearchResult {
        extracted_facts: vec![Fact {
            statement: "天空是蓝色的因为瑞利散射".into(),
            confidence: 0.9,
            // ...
        }],
        // ...
    };

    let delta = engine.integrate(&[result], &intent);
    assert!(!delta.corrected_facts.is_empty());
}
```

---

*文档版本: 1.0.0*
*最后更新: 2026-05-06*
*对应引擎模块: engine/web_search.py, akiho-core/src/search/ (待实现)*
