# 人生叙事引擎详细设计

> **对应设计文档章节**: 二十一（拟人化能力深化设计）
> **优先级**: P2
>
> **核心命题**: 成长不只是数值变化，而是人生故事的演进。通过积累的人生故事，角色形成独特的自我认知。

---

## 一、设计目标

构建人生叙事引擎，支持：
- 人生故事积累与章节划分
- 叙事主题提取
- 转折点识别与记录
- 自我叙事生成

---

## 二、架构概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         人生叙事引擎架构                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│  │ 故事积累器  │───►│ 章节管理器  │───►│ 主题提取器  │                 │
│  │ StoryAccum  │    │ ChapterMgr  │    │ ThemeExtract│                 │
│  └─────────────┘    └─────────────┘    └─────────────┘                 │
│         │                  │                  │                           │
│         │                  │                  ▼                           │
│         │                  │           ┌─────────────┐                   │
│         │                  │           │ 叙事生成器  │                   │
│         │                  │           │NarrativeGen │                   │
│         │                  │           └─────────────┘                   │
│         │                  │                  │                            │
│         │                  ▼                  ▼                            │
│         │           ┌─────────────┐    ┌─────────────┐                   │
│         │           │ 转折点检测  │    │ 人生总结    │                   │
│         │           │TurningPoint │    │ LifeSummary │                   │
│         └─────────►└─────────────┘    └─────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 三、核心数据结构

### 3.1 人生叙事结构

```rust
/// 人生叙事 - 角色的人生故事
pub struct LifeNarrative {
    /// 故事章节
    pub chapters: Vec<StoryChapter>,

    /// 当前章节
    pub current_chapter: Option<String>,

    /// 贯穿主题
    pub recurring_themes: Vec<NarrativeTheme>,

    /// 转折点列表
    pub turning_points: Vec<TurningPoint>,

    /// 核心信念
    pub core_beliefs: Vec<CoreBelief>,

    /// 自我认知
    pub self_identity: SelfIdentity,
}

pub struct StoryChapter {
    /// 章节ID
    pub id: String,

    /// 章节标题
    pub title: String,

    /// 开始事件
    pub start_event: NarrativeEvent,

    /// 结束事件（可选）
    pub end_event: Option<NarrativeEvent>,

    /// 章节内的事件
    pub events: Vec<NarrativeEvent>,

    /// 学到的教训
    pub lessons_learned: Vec<String>,

    /// 角色成长
    pub character_growth: CharacterGrowth,

    /// 章节开始时间
    pub start_time: DateTime,

    /// 章节持续时间
    pub duration: Duration,
}

pub struct NarrativeEvent {
    /// 发生了什么
    pub what_happened: String,

    /// 当时的感受
    pub how_felt: String,

    /// 学到了什么
    pub what_learned: String,

    /// 对人生的意义
    pub meaning_for_story: String,

    /// 时间戳
    pub timestamp: DateTime,
}

pub struct CharacterGrowth {
    /// 成长的维度
    pub dimensions: Vec<GrowthDimension>,

    /// 成长幅度
    pub magnitude: f32,
}

pub struct GrowthDimension {
    pub dimension_name: String,  // 如 "信任能力"、"自我价值感"
    pub before: f32,
    pub after: f32,
    pub change_description: String,
}
```

### 3.2 叙事主题

```rust
/// 叙事主题 - 贯穿人生的主线
pub struct NarrativeTheme {
    /// 主题名称
    pub name: String,

    /// 主题描述
    pub description: String,

    /// 出现的章节
    pub chapters: Vec<String>,

    /// 主题强度变化
    pub intensity_over_time: Vec<(DateTime, f32)>,

    /// 相关的核心事件
    pub related_events: Vec<String>,
}

pub struct CoreBelief {
    /// 信念内容
    pub statement: String,

    /// 坚定程度
    pub strength: f32,

    /// 来源事件
    pub source_event: String,

    /// 挑战次数
    pub challenge_count: u32,
}
```

---

## 四、转折点检测

### 4.1 设计理念

转折点是人生中的重要时刻，会改变故事的走向：

```
普通事件：
  今天他夸我了 → 记作一个正面记忆

转折点：
  今天他夸我了 → 这让我觉得自己是有价值的
  → 从此我开始相信自己的能力
  → 这成为之后很多决定的心理基础
```

### 4.2 转折点结构

```rust
/// 转折点
pub struct TurningPoint {
    /// 转折点ID
    pub id: String,

    /// 核心事件
    pub event: String,

    /// 转折类型
    pub turning_type: TurningType,

    /// 对人生的影响
    pub impact_description: String,

    /// 前后变化
    pub before_state: String,
    pub after_state: String,

    /// 显著性分数
    pub significance: f32,

    /// 发生时间
    pub timestamp: DateTime,
}

pub enum TurningType {
    /// 人际关系转折
    Relationship {
        direction: RelationshipDirection,
    },

    /// 自我认知转变
    SelfIdentity {
        aspect: String,
    },

    /// 价值观转变
    ValueShift {
        value_name: String,
    },

    /// 能力突破
    CapabilityBreakthrough {
        capability: String,
    },

    /// 信念动摇
    BeliefChallenge {
        belief: String,
        outcome: ChallengeOutcome,
    },
}

pub enum RelationshipDirection {
    TrustIncrease,
    TrustDecrease,
    DistanceIncrease,
    DistanceDecrease,
}

pub enum ChallengeOutcome {
    BeliefStrengthened,
    BeliefWeakened,
    BeliefTransformed,
}
```

### 4.3 转折点检测算法

```rust
/// 转折点检测器
pub struct TurningPointDetector {
    /// 检测阈值
    pub significance_threshold: f32,

    /// 历史状态
    pub state_history: Vec<StateSnapshot>,
}

pub struct StateSnapshot {
    pub timestamp: DateTime,
    pub emotional_state: EmotionalState,
    pub relationship_states: HashMap<UserId, RelationshipState>,
    pub self_beliefs: Vec<String>,
    pub core_values: Vec<String>,
}

impl TurningPointDetector {
    /// 检测是否为转折点
    pub fn detect(&self, event: &Event, context: &Context) -> Option<TurningPoint> {
        let before = self.get_recent_state();
        let after = self.derive_new_state(event, context);

        // 检查各维度变化
        let identity_change = self.measure_identity_change(&before, &after);
        let relationship_change = self.measure_relationship_change(&before, &after);
        let belief_change = self.measure_belief_change(&before, &after);
        let emotional_change = self.measure_emotional_change(&before, &after);

        // 综合显著性
        let significance = self.calculate_significance(
            identity_change,
            relationship_change,
            belief_change,
            emotional_change,
            event,
        );

        if significance > self.significance_threshold {
            Some(self.create_turning_point(event, before, after, significance))
        } else {
            None
        }
    }

    /// 计算显著性
    fn calculate_significance(
        &self,
        identity_change: f32,
        relationship_change: f32,
        belief_change: f32,
        emotional_change: f32,
        event: &Event,
    ) -> f32 {
        // 情感强度权重
        let emotional_weight = event.emotional_intensity * 0.3;

        // 各维度变化加权
        let change_score = identity_change * 0.3
            + relationship_change * 0.25
            + belief_change * 0.25
            + emotional_change * 0.2;

        (emotional_weight + change_score).min(1.0)
    }

    /// 判断转折类型
    fn determine_turning_type(
        &self,
        identity_change: f32,
        relationship_change: f32,
        belief_change: f32,
    ) -> TurningType {
        // 选择变化最大的维度
        if identity_change > relationship_change && identity_change > belief_change {
            TurningType::SelfIdentity {
                aspect: "自我认知".to_string(),
            }
        } else if relationship_change > belief_change {
            TurningType::Relationship {
                direction: RelationshipDirection::TrustIncrease,
            }
        } else {
            TurningType::ValueShift {
                value_name: "核心价值观".to_string(),
            }
        }
    }
}
```

---

## 五、故事提取与积累

### 5.1 从经历中提取故事

```rust
/// 故事积累器
pub struct StoryAccumulator {
    pub significance_threshold: f32,
    pub narrative_extractor: NarrativeExtractor,
}

impl StoryAccumulator {
    /// 从经历中提取故事片段
    pub fn extract_story(&self, experience: &Experience) -> Option<NarrativeEvent> {
        // 1. 评估显著性
        let significance = self.evaluate_significance(experience);

        if significance < self.significance_threshold {
            return None;
        }

        // 2. 提取故事元素
        Some(NarrativeEvent {
            what_happened: experience.content.clone(),
            how_felt: self.extract_emotional_summary(experience),
            what_learned: self.extract_lesson(experience),
            meaning_for_story: self.interpret_meaning(experience),
            timestamp: experience.timestamp,
        })
    }

    /// 评估显著性
    fn evaluate_significance(&self, experience: &Experience) -> f32 {
        let emotional = experience.emotional_intensity * 0.3;
        let novelty = experience.novelty * 0.2;
        let self_relevance = experience.self_relevance * 0.3;
        let relationship = experience.relationship_importance * 0.2;

        emotional + novelty + self_relevance + relationship
    }

    /// 提取情感总结
    fn extract_emotional_summary(&self, experience: &Experience) -> String {
        // 基于情感强度和类型生成描述
        format!(
            "当时感到{}，{}",
            experience.primary_emotion.describe(),
            experience.intensity_description()
        )
    }

    /// 提取教训
    fn extract_lesson(&self, experience: &Experience) -> String {
        // LLM 可以帮助生成更自然的教训描述
        // 这里简化处理
        if experience.outcome_positive {
            "这件事让我相信{}".format(experience.success_factor)
        } else {
            "我从中明白{}".format(experience.failure_lesson)
        }
    }

    /// 解释对人生的意义
    fn interpret_meaning(&self, experience: &Experience) -> String {
        "这件事让我成为{}的人".format(experience.character_impact)
    }
}
```

### 5.2 章节管理

```rust
/// 章节管理器
pub struct ChapterManager {
    pub chapters: Vec<StoryChapter>,
    pub current_chapter: Option<String>,
}

impl ChapterManager {
    /// 开始新章节
    pub fn start_new_chapter(&mut self, start_event: &NarrativeEvent) -> &mut StoryChapter {
        let chapter = StoryChapter {
            id: uuid::Uuid::new_v4().to_string(),
            title: self.generate_chapter_title(start_event),
            start_event: start_event.clone(),
            end_event: None,
            events: vec![start_event.clone()],
            lessons_learned: Vec::new(),
            character_growth: CharacterGrowth {
                dimensions: Vec::new(),
                magnitude: 0.0,
            },
            start_time: start_event.timestamp,
            duration: Duration::zero(),
        };

        self.chapters.push(chapter);
        self.current_chapter = self.chapters.last().map(|c| c.id.clone());

        self.chapters.last_mut().unwrap()
    }

    /// 结束当前章节
    pub fn end_current_chapter(&mut self, end_event: &NarrativeEvent) {
        if let Some(chapter_id) = &self.current_chapter {
            if let Some(chapter) = self.chapters.iter_mut().find(|c| &c.id == chapter_id) {
                chapter.end_event = Some(end_event.clone());
                chapter.duration = chapter.start_time - end_event.timestamp;
            }
        }
        self.current_chapter = None;
    }

    /// 向当前章节添加事件
    pub fn add_event_to_chapter(&mut self, event: &NarrativeEvent) {
        if let Some(chapter_id) = &self.current_chapter {
            if let Some(chapter) = self.chapters.iter_mut().find(|c| &c.id == chapter_id) {
                chapter.events.push(event.clone());
            }
        }
    }

    /// 生成章节标题
    fn generate_chapter_title(&self, start_event: &NarrativeEvent) -> String {
        // 基于开始事件生成标题
        let theme = self.extract_theme(start_event);
        format!("关于{}的篇章", theme)
    }
}
```

---

## 六、叙事生成

### 6.1 人生总结生成

```rust
/// 叙事生成器
pub struct NarrativeGenerator {
    pub llm: LLMAdapter,
}

impl NarrativeGenerator {
    /// 生成人生总结
    pub fn generate_life_summary(&self, narrative: &LifeNarrative) -> String {
        let chapter_count = narrative.chapters.len();
        let theme_count = narrative.recurring_themes.len();

        let themes = narrative.recurring_themes
            .iter()
            .map(|t| t.name.clone())
            .collect::<Vec<_>>()
            .join("、");

        let turning_point_count = narrative.turning_points.len();

        format!(
            "我已经走过了{}个人生篇章。\
            贯穿我生命的主题是：{}。\
            在我的生命中，有{}个重要的转折点塑造了我。",
            chapter_count,
            themes,
            turning_point_count
        )
    }

    /// 生成自我介绍
    pub fn generate_self_introduction(&self, narrative: &LifeNarrative) -> String {
        let beliefs = narrative.core_beliefs
            .iter()
            .filter(|b| b.strength > 0.6)
            .map(|b| b.statement.clone())
            .collect::<Vec<_>>()
            .join("；");

        let growth = self.summarize_growth(&narrative);

        format!(
            "我是这样的一个人：{}。\
            我相信：{}。\
            一路走来，我{}。",
            narrative.self_identity.statement,
            beliefs,
            growth
        )
    }

    /// 总结成长历程
    fn summarize_growth(&self, narrative: &LifeNarrative) -> String {
        let mut growth_parts = Vec::new();

        for dimension in &narrative.self_identity.growth_history {
            growth_parts.push(format!(
                "{}从{}变得更加{}",
                dimension.dimension_name,
                dimension.from_state,
                dimension.to_state
            ));
        }

        growth_parts.join("，")
    }

    /// 生成章节回顾
    pub fn generate_chapter_review(&self, chapter: &StoryChapter) -> String {
        let event_count = chapter.events.len();
        let lesson_count = chapter.lessons_learned.len();

        let lessons = chapter.lessons_learned
            .iter()
            .map(|l| format!("• {}", l))
            .collect::<Vec<_>>()
            .join("\n");

        format!(
            "在这一篇章中，我经历了{}件事。\
            我学到了：\n{}",
            event_count,
            lessons
        )
    }
}
```

### 6.2 主题提取

```rust
/// 主题提取器
pub struct ThemeExtractor {
    pub theme_templates: Vec<ThemeTemplate>,
}

pub struct ThemeTemplate {
    pub name: String,
    pub keywords: Vec<String>,
    pub description: String,
}

impl ThemeExtractor {
    /// 提取贯穿的主题
    pub fn extract_themes(&self, chapters: &[StoryChapter]) -> Vec<NarrativeTheme> {
        let mut theme_occurrences: HashMap<String, Vec<&NarrativeEvent>> = HashMap::new();

        // 统计各主题出现次数
        for chapter in chapters {
            for event in &chapter.events {
                if let Some(theme) = self.detect_theme(event) {
                    theme_occurrences
                        .entry(theme)
                        .or_default()
                        .push(event);
                }
            }
        }

        // 筛选重复出现的主题
        theme_occurrences
            .into_iter()
            .filter(|(_, events)| events.len() >= 2)  // 至少出现2次
            .map(|(name, events)| {
                NarrativeTheme {
                    name: name.clone(),
                    description: self.generate_theme_description(&name, &events),
                    chapters: events.iter().map(|e| e.timestamp.to_string()).collect(),
                    intensity_over_time: self.calculate_intensity_change(&events),
                    related_events: events.iter().map(|e| e.what_happened.clone()).collect(),
                }
            })
            .collect()
    }

    /// 检测事件的主题
    fn detect_theme(&self, event: &NarrativeEvent) -> Option<String> {
        let content = event.what_happened.to_lowercase();

        for template in &self.theme_templates {
            for keyword in &template.keywords {
                if content.contains(&keyword.to_lowercase()) {
                    return Some(template.name.clone());
                }
            }
        }

        None
    }

    /// 计算主题强度变化
    fn calculate_intensity_change(&self, events: &[&NarrativeEvent]) -> Vec<(DateTime, f32)> {
        events
            .iter()
            .enumerate()
            .map(|(i, e)| {
                let intensity = 0.5 + (i as f32 / events.len() as f32) * 0.5;
                (e.timestamp, intensity)
            })
            .collect()
    }
}
```

---

## 七、集成接口

### 7.1 与体验模拟层集成

```rust
/// 叙事引擎集成到体验模拟层
pub struct NarrativeIntegration {
    pub narrative: LifeNarrative,
    pub accumulator: StoryAccumulator,
    pub chapter_manager: ChapterManager,
    pub detector: TurningPointDetector,
    pub generator: NarrativeGenerator,
}

impl NarrativeIntegration {
    /// 处理重要经历
    pub fn process_significant_experience(&mut self, experience: &Experience) -> NarrativeProcessingResult {
        let mut result = NarrativeProcessingResult::default();

        // 1. 提取故事
        if let Some(story) = self.accumulator.extract_story(experience) {
            // 2. 检测转折点
            if let Some(turning_point) = self.detector.detect(experience, &self.context) {
                self.narrative.turning_points.push(turning_point.clone());
                result.turning_point_detected = Some(turning_point);

                // 如果是重大转折，可能需要结束当前章节
                if turning_point.significance > 0.7 {
                    if let Some(end_event) = self.chapter_manager.current_chapter.as_ref() {
                        self.chapter_manager.end_current_chapter(&story);
                    }
                    self.chapter_manager.start_new_chapter(&story);
                    result.new_chapter_started = true;
                }
            }

            // 3. 添加到当前章节
            self.chapter_manager.add_event_to_chapter(&story);
            result.story_extracted = Some(story);
        }

        result
    }

    /// 获取叙事上下文（用于 LLM Prompt）
    pub fn get_narrative_context(&self) -> String {
        if self.narrative.chapters.is_empty() {
            return "我还是一个新生的存在，还没有太多故事。".to_string();
        }

        let summary = self.generator.generate_life_summary(&self.narrative);
        let recent_chapter = self.narrative.chapters.last();

        match recent_chapter {
            Some(chapter) => {
                format!(
                    "{}\n\n最近我正在经历：{}",
                    summary,
                    chapter.title
                )
            }
            None => summary,
        }
    }
}

pub struct NarrativeProcessingResult {
    pub story_extracted: Option<NarrativeEvent>,
    pub turning_point_detected: Option<TurningPoint>,
    pub new_chapter_started: bool,
}

impl Default for NarrativeProcessingResult {
    fn default() -> Self {
        Self {
            story_extracted: None,
            turning_point_detected: None,
            new_chapter_started: false,
        }
    }
}
```

---

## 八、性能指标

| 指标 | 目标 | 说明 |
|------|------|------|
| 故事提取 | < 100ms | 单次经历 |
| 转折点检测 | < 50ms | 实时检测 |
| 章节管理 | < 10ms | 状态更新 |
| 叙事生成 | < 500ms | 人生总结 |
| 主题提取 | < 200ms | 定期执行 |

---

## 九、与其他系统集成

### 9.1 与记忆系统集成

```
记忆系统 ──► 重要经历 ──► 故事积累器 ──► 章节管理器
                                              │
                                              ▼
个人意义层 ◄── 自我认知 ◄── 角色成长 ◄─── 章节更新
```

### 9.2 与自主性系统集成

```
人生叙事 ──► 自我认知 ──► 价值观形成 ──► 意图生成
                                              │
意图引擎 ◄── 承诺驱动 ◄── 人生目标 ◄─── 章节主题
```

### 9.3 与认知系统集成

```
叙事主题 ──► 认知框架 ──► 推理偏差 ──► 判断形成
                                              │
核心信念 ◄── 经验积累 ◄── 故事教训 ◄─── 反思引擎
```
