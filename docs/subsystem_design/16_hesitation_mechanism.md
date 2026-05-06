# 犹豫机制详细设计

> **对应设计文档章节**: 二十一（拟人化能力深化设计）
> **优先级**: P2
> **状态**: 待实现

---

## 一、设计目标

模拟真实人类在做决定前的内心纠结过程，让角色的决策更加自然和有层次感。

---

## 二、核心概念

### 2.1 当前问题

```
当前：评估选项 → 选择最优 → 执行
问题：决策太干脆，不像真实人类的思维过程
```

### 2.2 犹豫的特点

```
真实人类的犹豫：
- 不确定性：不完全确定自己的判断
- 权衡过程：考虑多个因素，权重可能变化
- 自我质疑：怀疑自己是否正确
- 临时改变：可能中途改变主意
- 反复：可能在几个选项间来回摇摆
```

---

## 三、数据结构

### 3.1 犹豫状态

```rust
/// 犹豫状态 - 决策前的内心纠结
pub struct Hesitation {
    pub id: String,
    pub decision_type: DecisionType,        // 决策类型
    pub options: Vec<HesitationOption>,   // 可选方案
    pub phase: HesitationPhase,           // 当前阶段
    pub doubts: Vec<Doubt>,              // 疑虑
    pub weighs: Vec<Weighing>,           // 权衡过程
    pub leaning: f32,                    // 当前倾向 (-1 ~ 1)
    pub final_choice: Option<usize>,       // 最终选择
    pub completed: bool,                  // 是否完成犹豫
}

pub enum DecisionType {
    WhatToSay,        // 说什么
    HowToRespond,     // 如何回应
    WhetherToEngage,  // 是否参与
    HowToFeel,       // 如何感受
    WhatToWant,      // 想要什么
}

pub enum HesitationPhase {
    Initial,       // 初始评估
    Conflict,      // 发现冲突
    Weighing,      // 权衡阶段
    Doubting,      // 自我质疑
    Resolving,     // 接近决定
    Made,          // 已决定
}

pub struct HesitationOption {
    pub id: String,
    pub description: String,    // 选项描述
    pub pros: Vec<String>,       // 支持理由
    pub cons: Vec<String>,       // 反对理由
    pub confidence: f32,        // 信心程度 0.0 ~ 1.0
    pub appeal: f32,            // 吸引力 0.0 ~ 1.0
    pub perceived_risk: f32,     // 感知风险 0.0 ~ 1.0
}

pub struct Doubt {
    pub id: String,
    pub target: String,         // 质疑对象（选项或自己的判断）
    pub question: String,       // 疑问
    pub severity: f32,          // 严重程度 0.0 ~ 1.0
    pub addressed: bool,         // 是否已解答
    pub resolution: Option<String>, // 解答
}

pub struct Weighing {
    pub id: String,
    pub dimension: String,     // 权衡维度
    pub option_a: String,     // 选项A
    pub option_b: String,     // 选项B
    pub weight_a: f32,        // 选项A的权重
    pub weight_b: f32,        // 选项B的权重
    pub leaning: f32,         // 倾向 (-1 ~ 1, 负=B)
    pub reason: String,        // 权衡理由
}
```

---

## 四、犹豫过程

### 4.1 模拟犹豫过程

```rust
pub struct HesitationSimulator {
    personality: PersonalityProfile,
    current_hesitation: Option<Hesitation>,
}

impl HesitationSimulator {
    /// 模拟完整的犹豫过程
    pub fn simulate(
        &mut self,
        decision_type: DecisionType,
        options: Vec<String>,
        context: &ProcessingContext,
    ) -> Hesitation {
        // 1. 初始评估
        let initial_options = self.evaluate_options(&options, context);

        // 2. 发现冲突
        let conflict = self.find_conflicts(&initial_options);

        // 3. 开始权衡
        let mut weighing_process = self.start_weighing(&initial_options, &conflict, context);

        // 4. 自我质疑
        let doubts = self.generate_doubts(&weighing_process, context);

        // 5. 解决疑虑或做出妥协
        let (resolved_doubts, updated_weighing) =
            self.resolve_hesitation(&doubts, weighing_process, context);

        // 6. 做出最终选择
        let final_choice = self.make_choice(&updated_weighing, &resolved_doubts);

        // 7. 确定阶段
        let phase = if final_choice.is_some() {
            HesitationPhase::Made
        } else {
            HesitationPhase::Resolving
        };

        Hesitation {
            id: Uuid::new_v4().to_string(),
            decision_type,
            options: initial_options,
            phase,
            doubts: resolved_doubts,
            weighs: vec![updated_weighing],
            leaning: updated_weighing.leaning,
            final_choice,
            completed: final_choice.is_some(),
        }
    }

    /// 评估选项
    fn evaluate_options(
        &self,
        options: &[String],
        context: &ProcessingContext,
    ) -> Vec<HesitationOption> {
        options
            .iter()
            .enumerate()
            .map(|(i, opt)| {
                let confidence = self.assess_confidence(opt, context);
                let appeal = self.assess_appeal(opt, context);

                HesitationOption {
                    id: format!("option_{}", i),
                    description: opt.clone(),
                    pros: self.list_pros(opt, context),
                    cons: self.list_cons(opt, context),
                    confidence,
                    appeal,
                    perceived_risk: self.assess_risk(opt, context),
                }
            })
            .collect()
    }

    /// 发现冲突
    fn find_conflicts(
        &self,
        options: &[HesitationOption],
    ) -> Option<Conflict> {
        if options.len() < 2 {
            return None;
        }

        // 找出最矛盾的两个选项
        let mut max_conflict = 0.0;
        let mut conflicting_pair = (0, 1);

        for i in 0..options.len() {
            for j in (i + 1)..options.len() {
                let conflict = self.calculate_conflict(&options[i], &options[j]);
                if conflict > max_conflict {
                    max_conflict = conflict;
                    conflicting_pair = (i, j);
                }
            }
        }

        if max_conflict > 0.3 {
            Some(Conflict {
                option_a: conflicting_pair.0,
                option_b: conflicting_pair.1,
                dimensions: self.compare_dimensions(&options[conflicting_pair.0], &options[conflicting_pair.1]),
                severity: max_conflict,
            })
        } else {
            None
        }
    }

    /// 开始权衡
    fn start_weighing(
        &self,
        options: &[HesitationOption],
        conflict: &Option<Conflict>,
        context: &ProcessingContext,
    ) -> Weighing {
        match conflict {
            Some(c) => {
                let dimension = self.pick_weighing_dimension(context);
                let option_a = &options[c.option_a];
                let option_b = &options[c.option_b];

                // 计算初始倾向
                let mut leaning = 0.0;

                // 考虑信心和吸引力
                leaning += (option_a.confidence - option_b.confidence) * 0.3;
                leaning += (option_a.appeal - option_b.appeal) * 0.3;
                leaning -= (option_a.perceived_risk - option_b.perceived_risk) * 0.2;

                // 人格因素
                leaning += (self.personality.decisiveness - 0.5) * 0.2;

                Weighing {
                    id: Uuid::new_v4().to_string(),
                    dimension: dimension.clone(),
                    option_a: option_a.description.clone(),
                    option_b: option_b.description.clone(),
                    weight_a: (option_a.confidence + option_a.appeal) / 2.0,
                    weight_b: (option_b.confidence + option_b.appeal) / 2.0,
                    leaning: leaning.clamp(-1.0, 1.0),
                    reason: format!("在{}方面纠结于{}和{}", dimension, option_a.description, option_b.description),
                }
            }
            None => Weighing {
                id: Uuid::new_v4().to_string(),
                dimension: "整体".to_string(),
                option_a: options[0].description.clone(),
                option_b: "其他".to_string(),
                weight_a: options[0].confidence,
                weight_b: 0.3,
                leaning: 0.5,
                reason: "选择".to_string(),
            },
        }
    }

    /// 生成自我质疑
    fn generate_doubts(
        &self,
        weighing: &Weighing,
        context: &ProcessingContext,
    ) -> Vec<Doubt> {
        let mut doubts = Vec::new();

        // 基于人格生成疑虑
        if self.personality.self_doubt > 0.5 {
            doubts.push(Doubt {
                id: Uuid::new_v4().to_string(),
                target: "self".to_string(),
                question: "我真的判断对了吗？".to_string(),
                severity: 0.5,
                addressed: false,
                resolution: None,
            });
        }

        // 基于权衡结果生成疑虑
        if weighing.leaning.abs() < 0.3 {
            doubts.push(Doubt {
                id: Uuid::new_v4().to_string(),
                target: weighing.option_a.clone(),
                question: format!("{}真的是最好的选择吗？", weighing.option_a),
                severity: 0.6,
                addressed: false,
                resolution: None,
            });
        }

        // 基于风险生成疑虑
        if weighing.weight_a * (1.0 - weighing.leaning) > 0.4 {
            doubts.push(Doubt {
                id: Uuid::new_v4().to_string(),
                target: weighing.option_a.clone(),
                question: "万一选错了怎么办？".to_string(),
                severity: 0.4,
                addressed: false,
                resolution: None,
            });
        }

        doubts
    }

    /// 解决犹豫
    fn resolve_hesitation(
        &self,
        doubts: &[Doubt],
        mut weighing: Weighing,
        context: &ProcessingContext,
    ) -> (Vec<Doubt>, Weighing) {
        let mut resolved_doubts = Vec::new();

        for mut doubt in doubts.to_vec() {
            // 尝试解决疑虑
            if let Some(resolution) = self.try_resolve(&doubt, &weighing, context) {
                doubt.addressed = true;
                doubt.resolution = Some(resolution.clone());

                // 更新倾向
                if doubt.target == "self" {
                    // 自我质疑解决后更自信
                    weighing.leaning *= 1.1;
                } else if doubt.target == weighing.option_a {
                    weighing.leaning -= doubt.severity * 0.2;
                }
            }
            resolved_doubts.push(doubt);
        }

        // 确保倾向在有效范围内
        weighing.leaning = weighing.leaning.clamp(-1.0, 1.0);

        (resolved_doubts, weighing)
    }

    /// 做出选择
    fn make_choice(
        &self,
        weighing: &Weighing,
        doubts: &[Doubt],
    ) -> Option<usize> {
        // 考虑犹豫程度
        let unresolved_count = doubts.iter().filter(|d| !d.addressed).count();

        // 如果有太多未解决的疑虑，可能不做选择
        if unresolved_count > 2 && rand::random::<f32>() < 0.3 {
            return None;
        }

        // 基于倾向做出选择
        Some(if weighing.leaning > 0.1 {
            0  // 选择 option_a
        } else if weighing.leaning < -0.1 {
            1  // 选择 option_b
        } else {
            // 接近中间时，根据随机性决定
            if rand::random::<f32>() > 0.5 { 0 } else { 1 }
        })
    }
}
```

---

## 五、内心独白生成

### 5.1 犹豫阶段的独白

```rust
impl Hesitation {
    /// 根据当前阶段生成内心独白
    pub fn get_phase_monologue(&self) -> String {
        match self.phase {
            HesitationPhase::Initial => {
                self.get_initial_monologue()
            }
            HesitationPhase::Conflict => {
                self.get_conflict_monologue()
            }
            HesitationPhase::Weighing => {
                self.get_weighing_monologue()
            }
            HesitationPhase::Doubting => {
                self.get_doubting_monologue()
            }
            HesitationPhase::Resolving => {
                self.get_resolving_monologue()
            }
            HesitationPhase::Made => {
                self.get_made_monologue()
            }
        }
    }

    fn get_initial_monologue(&self) -> String {
        if self.options.len() == 1 {
            format!("要不要{}", self.options[0].description)
        } else {
            format!(
                "{}还是{}呢...",
                self.options[0].description,
                self.options.get(1).map(|o| o.description.as_str()).unwrap_or("")
            )
        }
    }

    fn get_conflict_monologue(&self) -> String {
        let conflict = self.weighs.first()
            .map(|w| format!(
                "{}和{}都挺好的，但又不太一样...",
                w.option_a, w.option_b
            ))
            .unwrap_or_else(|| "但是...好像有点矛盾".to_string());

        conflict
    }

    fn get_weighing_monologue(&self) -> String {
        if let Some(w) = self.weighs.first() {
            if w.leaning > 0.5 {
                format!(
                    "{}方面好像是{}更好...",
                    w.dimension, w.option_a
                )
            } else if w.leaning < -0.5 {
                format!(
                    "{}方面好像是{}更好...",
                    w.dimension, w.option_b
                )
            } else {
                format!(
                    "{}方面{}和{}各有优劣...",
                    w.dimension, w.option_a, w.option_b
                )
            }
        } else {
            String::new()
        }
    }

    fn get_doubting_monologue(&self) -> String {
        if let Some(doubt) = self.doubts.iter().find(|d| !d.addressed) {
            doubt.question.clone()
        } else {
            "真的可以吗...".to_string()
        }
    }

    fn get_resolving_monologue(&self) -> String {
        let unresolved = self.doubts.iter().filter(|d| !d.addressed).count();

        if unresolved > 0 {
            format!("算了，想那么多干嘛...",)
        } else {
            "好吧，就这么办".to_string()
        }
    }

    fn get_made_monologue(&self) -> String {
        if let Some(idx) = self.final_choice {
            if idx < self.options.len() {
                format!("好，选择{}", self.options[idx].description)
            } else {
                "随便吧".to_string()
            }
        } else {
            "还是算了".to_string()
        }
    }
}
```

---

## 六、与对话的集成

### 6.1 在回复中体现犹豫

```python
class HesitationInDialogue:
    """将犹豫机制融入对话生成"""

    HESITATION_PHRASES = {
        "initial": [
            "嗯...", "让我想想...", "这个嘛...",
            "等一下...", "嗯嗯..."
        ],
        "conflict": [
            "但是...", "不过...", "可是...",
            "然而...", "话虽如此..."
        ],
        "weighing": [
            "一方面...另一方面...",
            "虽然...但是...",
            "{}方面是{}好，但{}方面又是{}好...",
            "要说的话..."
        ],
        "doubting": [
            "会不会...", "真的可以吗...",
            "不太确定...", "万一...",
            "但如果..."
        ],
        "resolving": [
            "算了...", "管它呢", "就这样吧",
            "不管了", "想那么多干嘛"
        ],
    }

    def inject_hesitation(self, hesitation: Hesitation, response: str) -> str:
        """在回复中融入犹豫过程"""

        if !hesitation.completed {
            # 未完成的犹豫可能表现为延迟
            return response
        }

        phrases = []

        # 根据阶段添加短语
        if hesitation.phase == HesitationPhase::Initial:
            phrases.append(random.choice(self.HESITATION_PHRASES["initial"]))

        if hesitation.phase == HesitationPhase::Conflict:
            phrases.append(random.choice(self.HESITATION_PHRASES["conflict"]))

        if hesitation.phase == HesitationPhase::Weighing:
            w = hesitation.weighs[0]
            if "{}" in self.HESITATION_PHRASES["weighing"][2]:
                phrase = self.HESITATION_PHRASES["weighing"][2].format(
                    w.dimension, w.option_a, w.dimension, w.option_b
                )
            else:
                phrase = random.choice(self.HESITATION_PHRASES["weighing"])
            phrases.append(phrase)

        if hesitation.phase == HesitationPhase::Doubting:
            if let Some(doubt) = hesitation.doubts.iter().find(|d| !d.addressed) {
                phrases.append(doubt.question)

        if hesitation.phase == HesitationPhase::Resolving:
            phrases.append(random.choice(self.HESITATION_PHRASES["resolving"]))

        # 在回复前后插入犹豫短语
        if phrases:
            prefix = " ".join(phrases[:len(phrases)//2 + 1])
            suffix = " ".join(phrases[len(phrases)//2 + 1:])
            return f"{prefix}，{response}，{suffix}"

        return response
```

### 6.2 完整示例

```python
# 输入：用户问"你觉得这个方案怎么样？"
# 犹豫模拟结果：

hesitation = {
    "decision_type": "what_to_say",
    "options": [
        "说方案好",
        "说方案有问题",
        "说方案一般"
    ],
    "phase": "made",
    "leaning": 0.3,
    "final_choice": 0,
    "doubts": [
        {"question": "会不会太直接了？", "addressed": True, "resolution": "但这是事实"}
    ],
    "weighs": [
        {
            "dimension": "诚实",
            "option_a": "说方案好",
            "option_b": "说方案有问题",
            "leaning": 0.3
        }
    ]
}

# 生成的回复（融入犹豫）：
response = "嗯...一方面我觉得可以优化一下，但整体还是不错的"
```

---

## 七、实现计划

| 阶段 | 任务 | 优先级 | 依赖 |
|------|------|--------|------|
| 1 | 定义数据结构 | P0 | 无 |
| 2 | 实现犹豫模拟器 | P0 | 阶段1 |
| 3 | 实现内心独白生成 | P1 | 阶段2 |
| 4 | 实现对话集成 | P1 | 阶段3 |
| 5 | 调参与测试 | P2 | 阶段4 |

---

## 八、性能指标

| 指标 | 目标 | 说明 |
|------|------|------|
| 犹豫触发概率 | 20-30% | 需要做选择时触发犹豫的比例 |
| 平均犹豫时长 | 1-3轮对话 | 犹豫持续的对话轮数 |
| 犹豫后反悔概率 | < 10% | 选择后改变主意的概率 |
