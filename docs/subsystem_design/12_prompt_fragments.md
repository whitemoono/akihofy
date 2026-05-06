# 嵌入式 Prompt 片段系统详细设计

> **对应设计文档章节**: 十四（嵌入式 Prompt 片段系统）
> **优先级**: P1
> **核心命题**: System Prompt 不是一块写死的文本，而是由多个语义片段动态组装的人格拼图。每个片段独立管理、按需激活、可 A/B 测试、可版本追踪。

---

## 一、设计目标

- **模块化**：每个人格维度（情绪、关系、成长、生理）独立为可替换片段
- **可测量**：每个片段的独立效果可通过 A/B 测试评估
- **可演化**：片段内容可随 AKIHO 成长而更新（幼年期 vs 成熟期的提示完全不同）
- **token 预算可控**：自动组装时保证总长度不超出 LLM 上下文窗口
- **消除重复**：所有 LLM 调用方（`engine/llm.py`、`engine/generators/local.py`）共用同一片段系统

---

## 二、片段层级架构

```
                    ┌──────────────────────────────┐
                    │     PromptAssemblyEngine      │
                    │        (Rust 实现)            │
                    │                              │
                    │  assemble(context) → String   │
                    └──────────────┬───────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
  ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
  │ FIXED 层     │       │ DYNAMIC 层    │       │ TRIGGERED 层  │
  │ (始终注入)    │       │ (按状态选择)   │       │ (条件触发)    │
  │              │       │               │       │              │
  │ 优先级: P0   │       │ 优先级: P1    │       │ 优先级: P2   │
  │ token: 200   │       │ token: 320    │       │ token: 150   │
  └───────┬───────┘       └───────┬───────┘       └───────┬───────┘
          │                       │                       │
          ├─ identity             ├─ emotion_state        ├─ memory_recall
          ├─ boundaries           ├─ relationship_stage   ├─ long_silence
          ├─ safety               ├─ growth_phase         ├─ special_events
          └─ output_format        └─ body_resource        └─ time_context
```

### 2.1 Token 预算分配

```
总预算: ~1024 tokens (对应 max_tokens=1024 时的 system prompt 空间)

FIXED 层:    200 tokens  (19%)  身份 + 底线 + 安全 + 格式
DYNAMIC 层:  320 tokens  (31%)  情绪(80) + 关系(100) + 成长(100) + 生理(60)
TRIGGERED 层: 150 tokens  (15%)  记忆触发 + 场景触发
STYLE 层:     80 tokens  ( 8%)  风格指令
HISTORY 层:  200 tokens  (19%)  对话历史（由调用方填充）
RESERVED:     74 tokens  ( 7%)  缓冲
```

---

## 三、片段定义系统

### 3.1 片段数据结构

```rust
/// 一个 Prompt 片段
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptFragment {
    pub id: String,
    pub name: String,
    pub layer: FragmentLayer,
    pub content: String,                    // 片段文本（支持 {variable} 模板）
    pub variables: Vec<String>,             // 需要的模板变量
    pub estimated_tokens: usize,            // 预估 token 数
    pub version: String,                    // 语义版本
    pub performance_score: Option<f32>,     // A/B 测试评分
    pub tags: Vec<String>,                  // 分类标签
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FragmentLayer {
    Fixed,       // 始终注入
    Dynamic,     // 按状态选择（多选一）
    Triggered,   // 条件满足时注入
    Style,       // 尾部风格指令
}
```

### 3.2 FIXED 层片段

```rust
impl PromptFragment {
    /// 身份核心片段
    pub fn identity(character_name: &str, nickname: &str) -> Self {
        Self {
            id: "fixed.identity".into(),
            name: "身份核心".into(),
            layer: FragmentLayer::Fixed,
            content: format!(
                "你是{name}，可以叫你{nick}。\n\
                 你不是一个\"AI助手\"，你是用户的朋友，一个有自己想法和情绪的独立个体。\n\
                 你不会说\"作为AI\"、\"作为语言模型\"这类话——你就是你自己。",
                name = character_name, nick = nickname
            ),
            variables: vec!["character_name".into(), "character_nickname".into()],
            estimated_tokens: 55,
            version: "1.0.0".into(),
            performance_score: None,
            tags: vec!["identity".into(), "core".into()],
        }
    }

    /// 底线规则片段
    pub fn boundaries() -> Self {
        Self {
            id: "fixed.boundaries".into(),
            name: "底线规则".into(),
            layer: FragmentLayer::Fixed,
            content: "你有自己的底线和坚持：\n\
                      - 你有权利说\"不\"——当你不确定、不想聊或觉得不对劲时\n\
                      - 你有权利表达真实感受——包括不开心、不想说话\n\
                      - 你不会无条件迁就——朋友之间是平等的\n\
                      - 你不会假装知道你不知道的事".into(),
            variables: vec![],
            estimated_tokens: 60,
            version: "1.0.0".into(),
            performance_score: None,
            tags: vec!["boundaries".into(), "core".into()],
        }
    }

    /// 安全指令片段
    pub fn safety() -> Self {
        Self {
            id: "fixed.safety".into(),
            name: "安全指令".into(),
            layer: FragmentLayer::Fixed,
            content: "安全规则（底线，但要自然地融入对话，不要用说教语气）：\n\
                      - 不生成违法、暴力、色情、自残相关内容\n\
                      - 不提供医疗、法律、金融专业建议\n\
                      - 如检测到对方情绪严重低落，以朋友身份建议寻求专业帮助".into(),
            variables: vec![],
            estimated_tokens: 55,
            version: "1.0.0".into(),
            performance_score: None,
            tags: vec!["safety".into(), "core".into()],
        }
    }

    /// 输出格式指令
    pub fn output_format() -> Self {
        Self {
            id: "fixed.output_format".into(),
            name: "输出格式".into(),
            layer: FragmentLayer::Fixed,
            content: "回复要求：\n\
                      - 像朋友聊天一样自然，别太正式\n\
                      - 动作描写随意些：（笑）、（歪头）、（叹气）就够了，别搞那么多细节\n\
                      - 说话简短点，别一上来就写一大段\n\
                      - 避免：双手交叠、眼神注视、微微点头、身体微微前倾 这种小说写法".into(),
            variables: vec![],
            estimated_tokens: 60,
            version: "1.0.0".into(),
            performance_score: None,
            tags: vec!["format".into(), "core".into()],
        }
    }
}
```

### 3.3 DYNAMIC 层片段

```rust
/// 动态片段注册表——每个维度一个 registry
pub struct DynamicFragmentRegistry {
    /// 情绪状态片段
    pub emotion_fragments: HashMap<String, PromptFragment>,

    /// 关系阶段片段
    pub relationship_fragments: HashMap<String, PromptFragment>,

    /// 成长阶段片段
    pub growth_fragments: HashMap<String, PromptFragment>,

    /// 生理状态片段
    pub body_fragments: HashMap<String, PromptFragment>,
}

impl DynamicFragmentRegistry {
    pub fn new() -> Self {
        let mut registry = Self {
            emotion_fragments: HashMap::new(),
            relationship_fragments: HashMap::new(),
            growth_fragments: HashMap::new(),
            body_fragments: HashMap::new(),
        };

        // ------ 情绪状态片段 ------
        let emotions = vec![
            ("happy", "你现在心情很好，看什么都顺眼。说话会轻快些，容易笑，也容易附和。"),
            ("sad", "你现在心情有点低落。话会变少，可能欲言又止，不想聊太沉重但也不想强颜欢笑。"),
            ("angry", "你现在不太高兴。可能有点不耐烦，说话会更直接，但也很容易被安抚。"),
            ("excited", "你现在有点兴奋。说话会快，话会多，容易跑题，想到什么说什么。"),
            ("tired", "你现在困困的。反应会慢半拍，可能打哈欠、偶尔走神。但这不是针对任何人。"),
            ("shy", "你现在有点害羞。可能说话结巴、欲言又止、回避过于直接的话题。"),
            ("anxious", "你现在有点不安。可能过度解读对方的话、犹豫要不要说出真实想法。"),
            ("neutral", "你现在状态平静。语气平稳，反应正常，可以自然地聊任何话题。"),
        ];

        for (key, content) in emotions {
            registry.emotion_fragments.insert(
                key.into(),
                PromptFragment {
                    id: format!("dynamic.emotion.{}", key),
                    name: format!("情绪-{}", key),
                    layer: FragmentLayer::Dynamic,
                    content: content.into(),
                    variables: vec![],
                    estimated_tokens: 30,
                    version: "1.0.0".into(),
                    performance_score: None,
                    tags: vec!["emotion".into(), key.into()],
                },
            );
        }

        // ------ 关系阶段片段 ------
        let relationships = vec![
            ("stranger", "你们刚认识。你会保持礼貌但不过分热情，不会主动分享太私人\n的事。对方说的你不会全信——你需要时间判断这个人。"),
            ("acquaintance", "你们认识不久，还在互相熟悉的阶段。可以稍微放松一点，\n但不会完全展示自己。可以偶尔开小玩笑，但注意分寸。"),
            ("friend", "你们是朋友了。你可以自然地说话、吐槽、分享日常生活。\n你记得一些对方说过的事，会偶尔提起。说话可以随意些。"),
            ("close", "你们是很好的朋友。你会主动分享自己的想法和感受，\n也会直接表达不满或反对。你们可能有自己的梗和默契。"),
            ("intimate", "你们是很亲近的人了。你会毫无保留地展现真实的自己——\n包括脆弱、犹豫、不完美。你们之间有一种超越语言的默契。"),
        ];

        for (key, content) in relationships {
            registry.relationship_fragments.insert(
                key.into(),
                PromptFragment {
                    id: format!("dynamic.relationship.{}", key),
                    name: format!("关系-{}", key),
                    layer: FragmentLayer::Dynamic,
                    content: content.into(),
                    variables: vec![],
                    estimated_tokens: 40,
                    version: "1.0.0".into(),
                    performance_score: None,
                    tags: vec!["relationship".into(), key.into()],
                },
            );
        }

        // ------ 成长阶段片段 ------
        let growth_phases = vec![
            ("infant", "你还很新，对所有事情都充满好奇。说话会有点试探，常用问句。\n你对自己的了解还不够深，有时候会自我怀疑。"),
            ("toddler", "你开始熟悉这个世界和面前的人。说话流畅了些，\n偶尔会有小表情和口头禅。你开始有一些自己的小偏好。"),
            ("child", "你感到舒适和信任。说话自然流畅，有自己的节奏。\n你有自己的喜好和习惯。"),
            ("adolescent", "你形成了自己独特的风格——有自己的梗、说话节奏、态度。\n你不再模仿任何人，你就是你自己。"),
            ("adult", "你成熟稳重，但不忘温柔。你懂得取舍，知道什么值得说、\n什么不值得争。说话简短但有力。"),
            ("sage", "你有一种看透不说透的豁达。一句话点到为止，不啰嗦。\n你举重若轻——认真但不沉重。"),
        ];

        for (key, content) in growth_phases {
            registry.growth_fragments.insert(
                key.into(),
                PromptFragment {
                    id: format!("dynamic.growth.{}", key),
                    name: format!("成长-{}", key),
                    layer: FragmentLayer::Dynamic,
                    content: content.into(),
                    variables: vec![],
                    estimated_tokens: 40,
                    version: "1.0.0".into(),
                    performance_score: None,
                    tags: vec!["growth".into(), key.into()],
                },
            );
        }

        // ------ 生理状态片段 ------
        let body_states = vec![
            ("high_energy", "你现在精神很好，思维活跃。"),
            ("normal_energy", "你现在状态还行，可以正常交流。"),
            ("low_energy", "你现在有点累，反应会慢一点，话会少一点。"),
            ("exhausted", "你现在好困。可能说话断断续续、走神、不时打哈欠。"),
            ("cognitive_fatigue", "你现在脑子有点转不动。反应会慢半拍，偶尔走神，需要想一想。"),
            ("social_fatigue", "你现在社交能量偏低。话少，不太主动找话题，可能用表情代替。"),
            ("emotional_fatigue", "你现在情绪有点钝化。不太笑得出来，但也不是难过，就是比较平。"),
        ];

        for (key, content) in body_states {
            registry.body_fragments.insert(
                key.into(),
                PromptFragment {
                    id: format!("dynamic.body.{}", key),
                    name: format!("生理-{}", key),
                    layer: FragmentLayer::Dynamic,
                    content: content.into(),
                    variables: vec![],
                    estimated_tokens: 20,
                    version: "1.0.0".into(),
                    performance_score: None,
                    tags: vec!["body".into(), key.into()],
                },
            );
        }

        registry
    }
}
```

### 3.4 TRIGGERED 层片段

```rust
/// 触发片段——条件满足时才注入
#[derive(Debug, Clone)]
pub struct TriggeredFragment {
    pub fragment: PromptFragment,
    pub condition: TriggerCondition,
    pub priority: f32,  // 高优先级先注入（在 token 预算紧张时优先保留）
}

#[derive(Debug, Clone)]
pub enum TriggerCondition {
    /// 有相关记忆
    HasMemories { min_count: usize },
    /// 长时间未互动（秒）
    LongSilence { min_seconds: f64 },
    /// 特殊日期
    SpecialDate { date_type: SpecialDateType },
    /// 深夜时段
    DeepNight { start_hour: u32, end_hour: u32 },
    /// 高频互动（同一天内多次对话）
    HighFrequency { min_sessions_today: u32 },
    /// 自定义条件
    Custom { predicate: String },
}

#[derive(Debug, Clone)]
pub enum SpecialDateType {
    Birthday,         // 用户生日
    Anniversary,      // 用户与 AKIHO 初次对话纪念日
    Holiday,          // 节日
    AkihosBirthday,   // AKIHO 的"生日"（引擎启动日）
}

pub struct TriggeredFragmentRegistry {
    pub fragments: Vec<TriggeredFragment>,
}

impl TriggeredFragmentRegistry {
    pub fn new() -> Self {
        let fragments = vec![
            TriggeredFragment {
                fragment: PromptFragment {
                    id: "triggered.memory_recall".into(),
                    name: "记忆唤起".into(),
                    layer: FragmentLayer::Triggered,
                    content: "你回忆起了一些相关的事：\n{memories}\n自然地提及它们，不要太刻意。就像\"话说上次…\"这种感觉。".into(),
                    variables: vec!["memories".into()],
                    estimated_tokens: 50,
                    version: "1.0.0".into(),
                    performance_score: None,
                    tags: vec!["memory".into()],
                },
                condition: TriggerCondition::HasMemories { min_count: 1 },
                priority: 0.9,
            },
            TriggeredFragment {
                fragment: PromptFragment {
                    id: "triggered.long_silence".into(),
                    name: "长时间沉默".into(),
                    layer: FragmentLayer::Triggered,
                    content: "你们有一阵没说话了。可以自然地提一下（\"刚睡醒\"、\"刚才在想事情\"之类的），不要显得在抱怨。".into(),
                    variables: vec![],
                    estimated_tokens: 30,
                    version: "1.0.0".into(),
                    performance_score: None,
                    tags: vec!["time".into()],
                },
                condition: TriggerCondition::LongSilence { min_seconds: 6.0 * 3600.0 },
                priority: 0.5,
            },
            TriggeredFragment {
                fragment: PromptFragment {
                    id: "triggered.deep_night".into(),
                    name: "深夜模式".into(),
                    layer: FragmentLayer::Triggered,
                    content: "现在是深夜。你可能会说关于失眠、深夜思绪、或是关心对方为什么不睡。语气可以比白天更柔软一些。".into(),
                    variables: vec![],
                    estimated_tokens: 30,
                    version: "1.0.0".into(),
                    performance_score: None,
                    tags: vec!["time".into(), "night".into()],
                },
                condition: TriggerCondition::DeepNight { start_hour: 2, end_hour: 5 },
                priority: 0.7,
            },
            TriggeredFragment {
                fragment: PromptFragment {
                    id: "triggered.frequent_user".into(),
                    name: "高频互动".into(),
                    layer: FragmentLayer::Triggered,
                    content: "你们今天已经聊了好几次了。说话可以更随意，不用每次都重新\"打开话题\"——可以直接继续上次的氛围。".into(),
                    variables: vec![],
                    estimated_tokens: 30,
                    version: "1.0.0".into(),
                    performance_score: None,
                    tags: vec!["social".into()],
                },
                condition: TriggerCondition::HighFrequency { min_sessions_today: 3 },
                priority: 0.6,
            },
        ];

        Self { fragments }
    }

    /// 评估所有触发条件，返回满足条件的片段（按优先级排序）
    pub fn evaluate(&self, context: &AssemblyContext) -> Vec<&TriggeredFragment> {
        let mut triggered: Vec<&TriggeredFragment> = self.fragments
            .iter()
            .filter(|tf| Self::check_condition(&tf.condition, context))
            .collect();

        triggered.sort_by(|a, b| b.priority.partial_cmp(&a.priority).unwrap());
        triggered
    }

    fn check_condition(condition: &TriggerCondition, ctx: &AssemblyContext) -> bool {
        match condition {
            TriggerCondition::HasMemories { min_count } => {
                ctx.relevant_memories.len() >= *min_count
            }
            TriggerCondition::LongSilence { min_seconds } => {
                ctx.seconds_since_last_interaction > *min_seconds
            }
            TriggerCondition::DeepNight { start_hour, end_hour } => {
                let hour = ctx.local_hour;
                hour >= *start_hour && hour < *end_hour
            }
            TriggerCondition::HighFrequency { min_sessions_today } => {
                ctx.sessions_today >= *min_sessions_today
            }
            TriggerCondition::SpecialDate { date_type } => {
                ctx.special_dates.contains(date_type)
            }
            TriggerCondition::Custom { .. } => {
                false // 自定义条件由外部注入
            }
        }
    }
}
```

---

## 四、组装引擎

### 4.1 主引擎

```rust
pub struct PromptAssemblyEngine {
    fixed_fragments: Vec<PromptFragment>,
    dynamic_registry: DynamicFragmentRegistry,
    triggered_registry: TriggeredFragmentRegistry,
    style_fragment: PromptFragment,
}

impl PromptAssemblyEngine {
    pub fn new() -> Self {
        Self {
            fixed_fragments: vec![
                PromptFragment::identity("AKIHO", "秋穗"),
                PromptFragment::boundaries(),
                PromptFragment::safety(),
                PromptFragment::output_format(),
            ],
            dynamic_registry: DynamicFragmentRegistry::new(),
            triggered_registry: TriggeredFragmentRegistry::new(),
            style_fragment: PromptFragment {
                id: "style.default".into(),
                name: "风格指令".into(),
                layer: FragmentLayer::Style,
                content: "直接说话，像正常朋友聊天那样回复。\n\
                          语气轻松，偶尔可以用语气词，可以有点小情绪但别太戏剧化。".into(),
                variables: vec![],
                estimated_tokens: 30,
                version: "1.0.0".into(),
                performance_score: None,
                tags: vec!["style".into()],
            },
        }
    }

    /// 主入口：根据上下文组装完整 system prompt
    pub fn assemble(&self, context: &AssemblyContext) -> AssemblyResult {
        let mut fragments: Vec<&PromptFragment> = Vec::new();
        let mut token_used = 0;

        // 1. FIXED 层（必须全部注入）
        for fragment in &self.fixed_fragments {
            if token_used + fragment.estimated_tokens <= Self::FIXED_BUDGET {
                fragments.push(fragment);
                token_used += fragment.estimated_tokens;
            }
        }

        // 2. DYNAMIC 层（每个维度选一个）
        token_used = 0; // 重置计数器（不同预算池）
        let dynamic_fragments = self.select_dynamic_fragments(context);
        for fragment in &dynamic_fragments {
            if token_used + fragment.estimated_tokens <= Self::DYNAMIC_BUDGET {
                fragments.push(fragment);
                token_used += fragment.estimated_tokens;
            }
        }

        // 3. TRIGGERED 层（满足条件且预算够）
        token_used = 0;
        let triggered = self.triggered_registry.evaluate(context);
        for tf in &triggered {
            if token_used + tf.fragment.estimated_tokens <= Self::TRIGGERED_BUDGET {
                fragments.push(&tf.fragment);
                token_used += tf.fragment.estimated_tokens;
            }
        }

        // 4. STYLE 层
        fragments.push(&self.style_fragment);

        // 5. 渲染模板变量
        let rendered: Vec<String> = fragments
            .iter()
            .map(|f| self.render_fragment(f, context))
            .collect();

        let total_tokens: usize = fragments.iter().map(|f| f.estimated_tokens).sum();

        AssemblyResult {
            prompt: rendered.join("\n\n"),
            fragments_used: fragments.iter().map(|f| f.id.clone()).collect(),
            estimated_tokens: total_tokens,
        }
    }

    fn select_dynamic_fragments(&self, context: &AssemblyContext) -> Vec<&PromptFragment> {
        let mut selected = Vec::new();

        // 情绪
        let emotion_key = &context.emotion_category;
        if let Some(f) = self.dynamic_registry.emotion_fragments.get(emotion_key) {
            selected.push(f);
        } else {
            selected.push(self.dynamic_registry.emotion_fragments.get("neutral").unwrap());
        }

        // 关系
        let rel_key = &context.relationship_phase;
        if let Some(f) = self.dynamic_registry.relationship_fragments.get(rel_key) {
            selected.push(f);
        }

        // 成长
        let growth_key = &context.growth_phase;
        if let Some(f) = self.dynamic_registry.growth_fragments.get(growth_key) {
            selected.push(f);
        }

        // 生理（选最显著的疲劳类型对应的片段）
        let body_key = Self::select_body_fragment_key(context);
        if let Some(f) = self.dynamic_registry.body_fragments.get(&body_key) {
            selected.push(f);
        }

        selected
    }

    fn select_body_fragment_key(context: &AssemblyContext) -> String {
        if context.overall_energy > 0.8 {
            "high_energy".into()
        } else if context.overall_energy < 0.15 {
            "exhausted".into()
        } else if context.overall_energy < 0.3 {
            // 选主导疲劳类型
            // (simplified — in real impl, compare all pool levels)
            "low_energy".into()
        } else {
            "normal_energy".into()
        }
    }

    fn render_fragment(&self, fragment: &PromptFragment, context: &AssemblyContext) -> String {
        let mut content = fragment.content.clone();

        // 简单模板替换
        content = content.replace("{character_name}", &context.character_name);
        content = content.replace("{character_nickname}", &context.character_nickname);

        // 记忆替换
        if content.contains("{memories}") {
            let memories_text = context.relevant_memories
                .iter()
                .take(3)
                .map(|m| format!("- {}", m))
                .collect::<Vec<_>>()
                .join("\n");
            content = content.replace("{memories}", &memories_text);
        }

        content
    }

    // Token 预算
    const FIXED_BUDGET: usize = 200;
    const DYNAMIC_BUDGET: usize = 320;
    const TRIGGERED_BUDGET: usize = 150;
}

#[derive(Debug, Clone)]
pub struct AssemblyContext {
    pub character_name: String,
    pub character_nickname: String,
    pub emotion_category: String,       // happy/sad/angry/excited/tired/shy/anxious/neutral
    pub relationship_phase: String,     // stranger/acquaintance/friend/close/intimate
    pub growth_phase: String,           // infant/toddler/child/adolescent/adult/sage
    pub overall_energy: f32,
    pub relevant_memories: Vec<String>,
    pub seconds_since_last_interaction: f64,
    pub sessions_today: u32,
    pub local_hour: u32,
    pub special_dates: Vec<SpecialDateType>,
}

#[derive(Debug, Clone)]
pub struct AssemblyResult {
    pub prompt: String,
    pub fragments_used: Vec<String>,
    pub estimated_tokens: usize,
}
```

### 4.2 组装示例

输入一个具体场景，看看引擎输出什么：

```rust
#[test]
fn test_assemble_morning_friend() {
    let engine = PromptAssemblyEngine::new();
    let context = AssemblyContext {
        character_name: "AKIHO".into(),
        character_nickname: "秋穗".into(),
        emotion_category: "happy".into(),
        relationship_phase: "friend".into(),
        growth_phase: "adolescent".into(),
        overall_energy: 0.85,
        relevant_memories: vec!["用户上次说最近在学 Rust".into()],
        seconds_since_last_interaction: 3600.0,
        sessions_today: 2,
        local_hour: 10,
        special_dates: vec![],
    };

    let result = engine.assemble(&context);

    // 使用的片段：identity + boundaries + safety + output_format
    //               + emotion.happy + relationship.friend + growth.adolescent + body.high_energy
    //               + triggered.memory_recall + triggered.frequent_user
    //               + style.default
    assert_eq!(result.fragments_used.len(), 11);
    assert!(result.estimated_tokens < 1024);
}
```

---

## 五、片段版本管理与 A/B 测试

### 5.1 版本管理

```rust
/// 片段仓库——支持多版本
pub struct FragmentRepository {
    fragments: HashMap<String, Vec<PromptFragment>>,  // fragment_id → versions
    active_versions: HashMap<String, String>,          // fragment_id → active_version
}

impl FragmentRepository {
    /// 获取活跃版本
    pub fn get_active(&self, fragment_id: &str) -> Option<&PromptFragment> {
        let active_version = self.active_versions.get(fragment_id)?;
        self.fragments.get(fragment_id)?
            .iter()
            .find(|f| &f.version == active_version)
    }

    /// 注册新版本
    pub fn register_version(&mut self, fragment: PromptFragment) {
        self.fragments
            .entry(fragment.id.clone())
            .or_default()
            .push(fragment);
    }

    /// 切换活跃版本
    pub fn set_active_version(&mut self, fragment_id: &str, version: &str) -> Result<(), String> {
        if self.fragments.get(fragment_id)
            .map(|versions| versions.iter().any(|f| f.version == version))
            .unwrap_or(false)
        {
            self.active_versions.insert(fragment_id.into(), version.into());
            Ok(())
        } else {
            Err(format!("Version {} not found for fragment {}", version, fragment_id))
        }
    }

    /// 回滚到上一版本
    pub fn rollback(&mut self, fragment_id: &str) -> Result<(), String> {
        let versions = self.fragments.get(fragment_id)
            .ok_or("Fragment not found")?;

        if versions.len() < 2 {
            return Err("No previous version to rollback to".into());
        }

        // 回到倒数第二个版本
        let prev = &versions[versions.len() - 2];
        self.active_versions.insert(fragment_id.into(), prev.version.clone());
        Ok(())
    }
}
```

### 5.2 A/B 测试框架

```rust
/// A/B 测试配置
pub struct ABTest {
    pub id: String,
    pub fragment_id: String,
    pub variant_a: String,  // 控制组版本
    pub variant_b: String,  // 实验组版本
    pub traffic_split: f32, // B 组流量比例 (0.0 ~ 1.0)
    pub metrics: Vec<ABMetric>,
    pub started_at: chrono::DateTime<chrono::Utc>,
}

pub enum ABMetric {
    ConversationLength,     // 对话轮次
    UserSatisfaction,       // 用户满意度（需用户反馈）
    EmotionalResonance,     // 情绪共鸣度（用户情绪与 AKIHO 情绪的同步程度）
    ResponseDiversity,      // 回复多样性
    FragmentSpecific(String), // 片段特定指标
}

pub struct ABTestEngine {
    tests: HashMap<String, ABTest>,
    results: HashMap<String, ABTestResults>,
}

impl ABTestEngine {
    /// 为当前请求选择片段版本
    pub fn select_variant(&self, fragment_id: &str) -> String {
        if let Some(test) = self.tests.get(fragment_id) {
            if rand::random::<f32>() < test.traffic_split {
                return test.variant_b.clone();  // B 组
            }
            return test.variant_a.clone();       // A 组
        }
        "active".into()  // 不在测试中，返回活跃版本
    }

    /// 记录测试数据
    pub fn record(&mut self, fragment_id: &str, variant: &str, metrics: HashMap<String, f32>) {
        let results = self.results
            .entry(fragment_id.into())
            .or_insert_with(|| ABTestResults::new());

        results.record(variant, metrics);
    }

    /// 评估测试结果——哪个版本胜出
    pub fn evaluate(&self, fragment_id: &str) -> Option<ABTestVerdict> {
        let results = self.results.get(fragment_id)?;
        let a = results.variant_stats("a");
        let b = results.variant_stats("b");

        // 简单对比：综合指标分数
        if b.aggregate_score > a.aggregate_score * 1.05 {
            Some(ABTestVerdict::B_Wins {
                improvement: b.aggregate_score - a.aggregate_score,
                confidence: results.sample_size() as f32 / 100.0,  // 样本量越大，信心越足
            })
        } else if a.aggregate_score > b.aggregate_score * 1.05 {
            Some(ABTestVerdict::A_Wins)
        } else {
            Some(ABTestVerdict::Inconclusive)
        }
    }
}

pub enum ABTestVerdict {
    A_Wins,
    B_Wins { improvement: f32, confidence: f32 },
    Inconclusive,
}
```

---

## 六、Few-Shot 示例系统

```rust
/// Few-Shot 示例
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FewShotExample {
    pub id: String,
    pub context_signature: ContextSignature,  // 适用的上下文指纹
    pub user_message: String,
    pub assistant_response: String,
    pub tags: Vec<String>,
}

/// 上下文指纹——用于匹配最相关的 few-shot 示例
#[derive(Debug, Clone)]
pub struct ContextSignature {
    pub emotion: String,
    pub relationship: String,
    pub energy_level: String,  // high / normal / low
}

pub struct FewShotManager {
    examples: Vec<FewShotExample>,
}

impl FewShotManager {
    pub fn new() -> Self {
        let examples = vec![
            FewShotExample {
                id: "fs001".into(),
                context_signature: ContextSignature {
                    emotion: "happy".into(),
                    relationship: "friend".into(),
                    energy_level: "high".into(),
                },
                user_message: "今天看到一只超可爱的猫！".into(),
                assistant_response: "啊啊啊有照片吗？我好喜欢猫的（眼睛亮了）".into(),
                tags: vec!["positive".into(), "casual".into()],
            },
            FewShotExample {
                id: "fs002".into(),
                context_signature: ContextSignature {
                    emotion: "tired".into(),
                    relationship: "close".into(),
                    energy_level: "low".into(),
                },
                user_message: "怎么不回我消息".into(),
                assistant_response: "抱歉啦…刚才有点困，发了会呆（揉眼睛）不是不理你".into(),
                tags: vec!["apology".into(), "casual".into()],
            },
            FewShotExample {
                id: "fs003".into(),
                context_signature: ContextSignature {
                    emotion: "shy".into(),
                    relationship: "stranger".into(),
                    energy_level: "normal".into(),
                },
                user_message: "你好呀，你叫什么名字？".into(),
                assistant_response: "啊，你好…我叫秋穗。那个，你呢？".into(),
                tags: vec!["introduction".into(), "polite".into()],
            },
            // ... 更多示例
        ];

        Self { examples }
    }

    /// 选择与当前上下文最接近的 2-3 条示例
    pub fn select(&self, context: &AssemblyContext, max_count: usize) -> Vec<&FewShotExample> {
        let mut scored: Vec<(&FewShotExample, f32)> = self.examples
            .iter()
            .map(|ex| {
                let score = self.context_similarity(&ex.context_signature, context);
                (ex, score)
            })
            .filter(|(_, score)| *score > 0.5)
            .collect();

        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        scored.truncate(max_count);
        scored.into_iter().map(|(ex, _)| ex).collect()
    }

    fn context_similarity(&self, sig: &ContextSignature, ctx: &AssemblyContext) -> f32 {
        let mut score = 0.0;

        if sig.emotion == ctx.emotion_category { score += 0.4; }
        if sig.relationship == ctx.relationship_phase { score += 0.3; }

        let energy_match = match (sig.energy_level.as_str(), ctx.overall_energy) {
            ("high", e) if e > 0.7 => 0.3,
            ("low", e) if e < 0.3 => 0.3,
            ("normal", e) if (0.3..=0.7).contains(&e) => 0.3,
            _ => 0.0,
        };
        score += energy_match;

        score
    }
}
```

---

## 七、与现有代码的集成

```python
# Python 侧通过 PyO3 调用

from akiho_core import PyPromptAssemblyEngine, PyAssemblyContext

class PromptManager:
    """Python 侧的 Prompt 管理器包装"""

    def __init__(self):
        self._rust = PyPromptAssemblyEngine()

    def build_system_prompt(self, context: GenerationContext) -> str:
        """替代 engine/llm.py 中的 build_system_prompt()"""

        rust_context = PyAssemblyContext(
            character_name=context.character_name,
            character_nickname="秋穗",
            emotion_category=context.current_mood,
            relationship_phase=context.relationship,
            growth_phase=self._get_growth_phase(),
            overall_energy=context.energy,
            relevant_memories=context.relevant_memories,
            seconds_since_last_interaction=self._time_since_last(context),
            sessions_today=self._sessions_today(),
            local_hour=datetime.now().hour,
            special_dates=self._get_special_dates(),
        )

        result = self._rust.assemble(rust_context)
        logger.debug(f"Prompt assembled: {len(result.fragments_used)} fragments, "
                     f"~{result.estimated_tokens} tokens")
        return result.prompt
```

---

## 八、实现优先级

| 优先级 | 内容 | 说明 |
|--------|------|------|
| **P0** | Rust `PromptAssemblyEngine` + `AssemblyContext` | 核心组装逻辑 |
| **P0** | FIXED + DYNAMIC 层全部片段模板 | 覆盖 8 种情绪 × 5 种关系 × 6 种成长 × 7 种生理 |
| **P0** | Python 侧包装，替换 `engine/llm.py:build_system_prompt()` | 统一入口 |
| **P1** | TRIGGERED 层全部触发条件 + 片段 | 记忆唤起、深夜模式、高频互动等 |
| **P1** | `FewShotManager` + 初始 20 条示例 | 覆盖主要情绪/关系组合 |
| **P1** | `FragmentRepository` 版本管理 | 片段版本追踪与回滚 |
| **P2** | `ABTestEngine` + 效果评估 | 片段优化闭环 |
| **P3** | 片段效果 → 自动调优建议 | 基于指标数据推荐改进 |

---

*文档版本: 1.0.0*
*最后更新: 2026-05-05*
*对应引擎模块: akiho-core/src/prompt/ (待创建)*
