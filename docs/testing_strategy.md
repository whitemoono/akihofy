# 测试策略文档

> **对应设计章节**: 十一（测试与文档）
> **优先级**: P2
> **状态**: 待实现

---

## 一、测试层次架构

### 1.1 四层测试模型

```
┌─────────────────────────────────────────┐
│          人工评估 (Human Evaluation)       │  ← 最高层，最主观
│   对话自然度、情绪反应、人格一致性         │
├─────────────────────────────────────────┤
│          模拟环境 (Simulation)            │
│   长周期模拟、压力测试、边界情况           │
├─────────────────────────────────────────┤
│          集成测试 (Integration)           │
│   子系统间交互、跨系统数据流              │
├─────────────────────────────────────────┤
│          单元测试 (Unit Tests)            │  ← 最低层，最客观
│   子系统独立测试、边界条件验证             │
└─────────────────────────────────────────┘
```

### 1.2 各层测试目标

| 层次 | 目标 | 自动化程度 | 执行频率 |
|------|------|-----------|----------|
| 单元测试 | 验证每个组件的正确性 | 全自动 | 每次提交 |
| 集成测试 | 验证组件间的交互 | 全自动 | 每日 |
| 模拟环境 | 模拟真实使用场景 | 半自动 | 每周 |
| 人工评估 | 验证主观体验质量 | 人工 | 发布前 |

---

## 二、单元测试

### 2.1 覆盖范围

#### Rust 组件

| 模块 | 测试覆盖目标 |
|------|-------------|
| `emotion_engine` | PAD 计算、情绪衰减、状态转换 |
| `body_system` | 资源消耗、恢复计算、昼夜节律 |
| `memory_system` | 记忆存储、检索、遗忘曲线 |
| `growth_system` | 阶段转换、特征演化 |
| `autonomous_system` | 驱动计算、意图生成、目标管理 |
| `behavior_system` | 行为选择、冲突解决 |

#### Python 组件

| 模块 | 测试覆盖目标 |
|------|-------------|
| `emotion_chain` | 情感反应链处理、内在体验生成 |
| `meaning_layer` | 显著性计算、关联发现 |
| `llm_interface` | Prompt 构建、响应解析 |

### 2.2 测试框架

```rust
// Rust: 使用标准库测试
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pad_calculation() {
        let state = PADState::from_category(EmotionCategory::Joy, 0.8);
        assert!(state.pleasure > 0.5);
        assert!(state.arousal > 0.3);
    }

    #[test]
    fn test_forgetting_curve() {
        let memory = create_test_memory();
        let curve = AdaptiveForgettingCurve::default();

        // 新记忆应该保持较高强度
        let strength_new = curve.calculate_strength(&memory);
        assert!(strength_new > 0.8);

        // 模拟时间流逝后强度下降
        let memory_old = simulate_time_passes(memory, Days(30));
        let strength_old = curve.calculate_strength(&memory_old);
        assert!(strength_old < strength_new);
    }

    #[test]
    fn test_compound_emotion() {
        let joy = EmotionalState::single(EmotionCategory::Joy, 0.7);
        let sadness = EmotionalState::single(EmotionCategory::Sadness, 0.5);

        let blended = joy.blend(&sadness);
        assert!(blended.secondary.is_some());
    }

    #[test]
    fn test_growth_transition_quality() {
        let state = CharacterState::new();
        let req = QualityGrowthRequirement {
            min_interactions: 10,
            min_quality_threshold: 0.6,
            min_depth: 0.5,
            min_authenticity: 0.4,
            min_diversity: 0.3,
            time_window: Duration::days(30),
            require_improving_trend: true,
        };

        // 高质量互动应该满足要求
        let high_quality_state = add_high_quality_interactions(&state);
        assert!(req.is_satisfied(&high_quality_state));

        // 低质量互动不满足要求
        let low_quality_state = add_low_quality_interactions(&state);
        assert!(!req.is_satisfied(&low_quality_state));
    }
}
```

```python
# Python: 使用 pytest
import pytest
from dataclasses import dataclass

class TestEmotionReactionChain:
    def test_negative_interaction(self):
        chain = EmotionReactionChain()
        input = EmotionalInput(
            trigger=Trigger.user_message("你真的很烦人"),
            event_type=EventType.Criticism,
        )
        result = chain.process(input)

        # 应该产生负面情绪
        assert any(f.emotion_type in [EmotionType.SADNESS, EmotionType.ANGER]
                   for f in result.feelings)

        # 应该有内在体验
        assert result.inner_sensation.intensity > 0.0

    def test_compound_emotion_blending(self):
        chain = EmotionReactionChain()
        joy = EmotionalState.single(EmotionType.JOY, 0.7)
        sadness = EmotionalState.single(EmotionType.SADNESS, 0.5)

        blended = joy.blend(sadness)
        assert blended.secondary == EmotionType.SADNESS
        assert blended.ambiguity > 0.3

    def test_prompt_generation(self):
        chain = create_test_chain()
        prompt = chain.to_prompt_context()

        assert "内心感受到" in prompt or "这种感觉像是" in prompt


class TestPersonalMeaningLayer:
    def test_significance_calculation(self):
        layer = PersonalMeaningLayer()
        memory = Memory(content="今天主人夸我了", emotional_intensity=0.8)

        sig = layer.assign_significance(memory)

        assert sig.emotional_charge > 0.7
        assert sig.importance > 0.6

    def test_connection_discovery(self):
        layer = PersonalMeaningLayer()

        # 添加多个记忆
        m1 = add_memory("第一次做某事", tags=["first_time"])
        m2 = add_memory("又一次做某事")
        m3 = add_memory("再次做某事", tags=["first_time"])

        # 应该发现 m1 和 m3 的主题关联
        connections = layer.get_connections(m1.id)
        assert any(c.to == m3.id for c in connections)
```

### 2.3 边界条件测试

```rust
#[test]
fn test_edge_cases() {
    // 边界：能量为 0
    let mut pools = ResourcePools::new();
    pools.cognitive.current = 0.0;
    assert_eq!(pools.overall_energy(), 0.0);

    // 边界：情绪超过范围
    let state = PADState { pleasure: 1.5, arousal: 0.0, dominance: 0.0 };
    state.clamp();
    assert!(state.pleasure <= 1.0);

    // 边界：阶段转换边界
    let req = QualityGrowthRequirement { min_interactions: 10, .. };
    let mut state = CharacterState::new();
    state.add_interaction(Interaction { quality: InteractionQuality { depth_score: 0.5, .. }, .. });

    // 刚好达到边界
    for _ in 0..9 {
        state.add_interaction(create_minimal_interaction());
    }
    // 9 次应该不满足
    assert!(!req.is_satisfied(&state));

    state.add_interaction(create_minimal_interaction());
    // 10 次应该满足
    assert!(req.is_satisfied(&state));
}
```

---

## 三、集成测试

### 3.1 子系统间交互

```rust
#[test]
fn test_emotion_body_integration() {
    let mut emotion = EmotionEngine::new();
    let mut body = BodySystem::new(Box::new(SimulatedTelemetry));

    // 初始状态
    let initial_cognitive = body.pools.cognitive.current;

    // 触发强烈情绪
    emotion.process_stimulus(Stimulus::NegativeInteraction { intensity: 0.8 });

    // 等待 tick
    body.tick(1.0);

    // 情绪应该消耗认知资源
    // （通过 Bridge 应用）
}
```

### 3.2 跨系统数据流测试

```rust
#[test]
fn test_cross_system_event_flow() {
    let mut event_bus = EventBus::new();
    let mut emotion = EmotionEngine::new();
    let mut body = BodySystem::new(Box::new(SimulatedTelemetry));
    let mut memory = MemorySystem::new();

    // 设置事件订阅
    event_bus.subscribe(EventType::EmotionChanged, |e| {
        // Emotion → Body
        body.handle_emotion_change(e);
    });

    event_bus.subscribe(EventType::MemoryRecalled, |e| {
        // Memory → Emotion
        emotion.handle_memory_recall(e);
    });

    // 触发事件链
    memory.recall("重要记忆");
    event_bus.flush();

    // 验证结果
    // - 记忆唤起应该触发情绪反应
    // - 情绪变化应该影响身体状态
}
```

### 3.3 完整场景测试

```python
def test_complete_interaction_scenario():
    """测试完整的用户交互场景"""
    # 1. 初始化系统
    engine = AKIHOEngine()

    # 2. 用户发送消息
    response1 = engine.process_message("你好！今天心情不错")
    assert "你好" in response1

    # 3. 模拟时间流逝
    engine.tick(delta=3600)  # 1 小时

    # 4. 继续对话
    response2 = engine.process_message("我们来聊聊你最近在做什么？")
    assert "最近" in response2 or "思考" in response2

    # 5. 验证状态变化
    assert engine.emotion_state.intensity > 0.3  # 应该有正面情绪
    assert engine.body.energy < 1.0  # 能量应该消耗了一些
```

---

## 四、模拟环境测试

### 4.1 长周期模拟

```python
def test_long_term_growth():
    """模拟 30 天的成长"""
    engine = AKIHOEngine()

    for day in range(30):
        # 每天模拟多次交互
        for _ in range(5):
            engine.process_message(random.choice(INTERACTION_TEMPLATES))

        # 模拟时间流逝（夜间）
        engine.tick(delta=86400)  # 一天

        # 检查成长状态
        if day % 7 == 0:
            state = engine.get_state_snapshot()
            print(f"Day {day}: Phase={state.growth_phase}, Traits={state.traits}")

    # 验证：30 天后应该有明显成长
    final_state = engine.get_state_snapshot()
    assert final_state.growth_phase != GrowthPhase.Infant
```

### 4.2 压力测试

```python
def test_high_frequency_interaction():
    """高频交互测试"""
    engine = AKIHOEngine()

    start_time = time.time()

    # 模拟 100 条消息快速发送
    for i in range(100):
        engine.process_message(f"消息 {i}")

    elapsed = time.time() - start_time

    # 应该在合理时间内完成
    assert elapsed < 10.0  # 100 条消息 < 10 秒

    # 验证系统没有崩溃
    state = engine.get_state_snapshot()
    assert state is not None
```

### 4.3 边界情况测试

```python
def test_extreme_conditions():
    """极端条件测试"""
    engine = AKIHOEngine()

    # 1. 能量耗尽场景
    engine.body.pools.cognitive.current = 0.0
    engine.body.pools.social.current = 0.0
    engine.body.pools.emotional.current = 0.0
    engine.body.pools.creative.current = 0.0

    response = engine.process_message("我们来聊天吧")
    # 应该表现出疲惫状态
    assert any(word in response for word in ["困", "累", "想休息"])

    # 2. 极端情绪场景
    engine.emotion.state = PADState(pleasure=-1.0, arousal=1.0, dominance=-1.0)
    response = engine.process_message("你还好吗？")
    # 应该表达强烈负面情绪
    assert "难过" in response or "生气" in response or "害怕" in response

    # 3. 极端正面情绪
    engine.emotion.state = PADState(pleasure=1.0, arousal=1.0, dominance=1.0)
    response = engine.process_message("有个好消息！")
    # 应该表达强烈正面情绪
    assert "开心" in response or "高兴" in response or "太棒了" in response
```

---

## 五、人工评估

### 5.1 评估维度

| 维度 | 指标 | 评估方法 |
|------|------|---------|
| 对话自然度 | 回复是否像真人 | 人工盲测 |
| 情绪真实性 | 情绪反应是否合理 | 人工判断 |
| 人格一致性 | 是否保持设定的人格 | 人工对照 |
| 共情能力 | 是否理解用户情绪 | 人工评估 |
| 成长感知 | 成长是否可感知 | 长期用户反馈 |

### 5.2 评估问卷

```
## 对话自然度评估

1. 这段对话有多自然？
   [1] 非常不自然  [2] 不太自然  [3] 一般  [4] 比较自然  [5] 非常自然

2. AI 的回复是否像真人？
   [1] 完全不像  [2] 不太像  [3] 一般  [4] 比较像  [5] 完全像真人

3. 是否有"AI 感"（生硬、不自然）？
   [1] 非常明显  [2] 比较明显  [3] 一般  [4] 不太明显  [5] 没有

## 情绪反应评估

4. AI 的情绪反应是否合理？
   [1] 完全不合理  [2] 不太合理  [3] 一般  [4] 比较合理  [5] 完全合理

5. AI 是否表现出适当的情感深度？
   [1] 完全没有  [2] 不太有  [3] 一般  [4] 比较有  [5] 非常有

## 人格一致性评估

6. AI 是否保持了一致的人格？
   [1] 完全不一致  [2] 不太一致  [3] 一般  [4] 比较一致  [5] 完全一致
```

---

## 六、测试数据生成

### 6.1 Fixture 工厂

```rust
pub struct TestFixtures;

impl TestFixtures {
    pub fn character_state() -> CharacterState {
        CharacterState {
            growth_phase: GrowthPhase::Child,
            traits: HashMap::from([
                ("openness".to_string(), 0.6),
                ("conscientiousness".to_string(), 0.5),
                ("extraversion".to_string(), 0.7),
                ("agreeableness".to_string(), 0.8),
                ("neuroticism".to_string(), 0.3),
            ]),
            energy: 0.8,
            relationships: vec![],
            memories: vec![],
        }
    }

    pub fn emotional_input() -> EmotionalInput {
        EmotionalInput {
            trigger: Trigger::UserMessage("今天天气真好".to_string()),
            event_type: EventType::PositiveInteraction,
            context: ProcessingContext {
                relationship: Some(RelationshipContext {
                    intimacy: 0.7,
                    trust: 0.6,
                }),
                ..Default::default()
            },
        }
    }

    pub fn resource_pools() -> ResourcePools {
        ResourcePools {
            cognitive: ResourcePool { current: 0.8, .. },
            social: ResourcePool { current: 0.7, .. },
            emotional: ResourcePool { current: 0.9, .. },
            creative: ResourcePool { current: 0.6, .. },
        }
    }
}
```

### 6.2 模糊测试

```rust
#[test]
fn fuzz_test_pad_calculation() {
    use quickcheck::Arbitrary;

    #[derive(Debug, Clone)]
    struct PADInput {
        pleasure: f32,
        arousal: f32,
        dominance: f32,
    }

    impl Arbitrary for PADInput {
        fn arbitrary(g: &mut quickcheck::Gen) -> Self {
            PADInput {
                pleasure: f32::arbitrary(g) * 2.0 - 1.0,
                arousal: f32::arbitrary(g) * 2.0 - 1.0,
                dominance: f32::arbitrary(g) * 2.0 - 1.0,
            }
        }
    }

    fn prop_pad_calculation(input: PADInput) -> bool {
        let state = PADState {
            pleasure: input.pleasure,
            arousal: input.arousal,
            dominance: input.dominance,
        };

        // 验证 clamp 后范围正确
        let clamped = state.clamp();
        clamped.pleasure >= -1.0 && clamped.pleasure <= 1.0
            && clamped.arousal >= -1.0 && clamped.arousal <= 1.0
            && clamped.dominance >= -1.0 && clamped.dominance <= 1.0
    }

    quickcheck(prop_pad_calculation as fn(PADInput) -> bool);
}
```

---

## 七、持续集成

### 7.1 CI 流程

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit_tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Rust tests
        run: cargo test --lib
      - name: Run Python tests
        run: pytest tests/python/

  integration_tests:
    runs-on: ubuntu-latest
    needs: unit_tests
    steps:
      - uses: actions/checkout@v2
      - name: Run integration tests
        run: cargo test --test '*'

  simulation_tests:
    runs-on: ubuntu-latest
    needs: integration_tests
    steps:
      - uses: actions/checkout@v2
      - name: Run simulation
        run: python -m pytest tests/simulation/ --timeout=300

  weekly_evaluation:
    runs-on: ubuntu-latest
    needs: simulation_tests
    if: github.event_name == 'schedule'
    steps:
      - uses: actions/checkout@v2
      - name: Generate evaluation report
        run: python scripts/generate_eval_report.py
      - name: Upload report
        uses: actions/upload-artifact@v2
        with:
          name: evaluation-report
          path: reports/
```

### 7.2 测试覆盖率目标

| 组件 | 覆盖率目标 |
|------|-----------|
| Rust 核心 | > 90% |
| Python 逻辑 | > 80% |
| LLM 接口 | > 70% |
| 整体 | > 80% |

---

## 八、调试与日志

### 8.1 日志级别

| 级别 | 使用场景 |
|------|---------|
| ERROR | 系统错误、需要立即处理 |
| WARN | 异常情况、可能的问题 |
| INFO | 重要状态变化、决策 |
| DEBUG | 详细流程、变量值 |
| TRACE | 最细粒度、仅调试用 |

### 8.2 结构化日志

```rust
info!(
    target: "emotion",
    emotion = ?state.category,
    intensity = state.intensity,
    pad = ?state.pad,
    "情绪状态更新"
);

debug!(
    target: "behavior",
    decision = ?decision,
    available_actions = available.len(),
    "行为决策"
);
```

---

*文档版本: 1.0.0*
*最后更新: 2026-05-06*
