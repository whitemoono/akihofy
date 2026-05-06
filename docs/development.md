# AKIHO 开发指南

## 环境准备

### 系统要求

- Python 3.10+
- 8GB RAM（推荐 16GB）
- 10GB 磁盘空间

### 安装依赖

```bash
# 克隆项目
git clone https://github.com/yourname/akiho.git
cd akiho

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

### 配置文件

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# LLM 配置
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=your_api_key_here

# 或使用硅基流动
SILICONFLOW_API_KEY=your_api_key_here

# 服务器配置
HOST=0.0.0.0
PORT=8000

# 调试模式
DEBUG=true
```

## 项目结构

```
AKIHO/
├── main.py              # 应用入口
├── config.py            # 配置管理
├── engine/              # 核心引擎
│   ├── __init__.py
│   ├── emotion.py       # 情绪系统
│   ├── memory.py        # 记忆网络
│   ├── privacy.py       # 隐私边界
│   ├── lifecycle.py     # 生命周期
│   ├── behavior.py      # 行为触发（欲望驱动）
│   ├── intent.py        # 意图引擎（新增）
│   ├── desire.py        # 欲望系统（新增）
│   ├── cognition.py     # 认知系统（增强）
│   ├── narrative.py     # 人生叙事（新增）
│   └── bias.py          # 认知偏差（新增）
├── api/                 # API 接口
│   ├── __init__.py
│   ├── router.py        # 路由
│   ├── chat.py          # 对话接口
│   ├── thought.py       # 念头接口
│   ├── intent.py        # 意图接口（新增）
│   ├── narrative.py      # 叙事接口（新增）
│   ├── memory.py        # 记忆接口
│   └── status.py        # 状态接口
├── llm/                 # LLM 适配器
│   ├── __init__.py
│   ├── base.py         # 基类
│   ├── deepseek.py     # DeepSeek
│   └── siliconflow.py   # 硅基流动
├── data/                # 数据存储
│   ├── memories/        # 记忆向量库
│   ├── states/         # 状态快照
│   └── config/         # 配置文件
├── prompts/            # Prompt 模板
│   ├── system.txt      # 系统提示词
│   └── fewshot.json    # Few-shot 示例
├── tests/              # 测试
├── docs/               # 文档
└── requirements.txt    # 依赖
```

## 开发指南

### 1. 添加新的情绪状态

编辑 `engine/emotion.py`：

```python
from .base import EmotionalState

class MelancholyState(EmotionalState):
    """忧郁状态"""
    name = "melancholy"

    PAD = {
        "P": -0.4,  # 不愉悦
        "A": 0.3,   # 中等唤醒
        "D": 0.1    # 低支配
    }

    def respond(self, input_msg: str) -> str:
        # 返回符合忧郁状态的回复
        return f"（郁郁寡欢）{input_msg}"
```

### 2. 创建新的行为触发器

编辑 `engine/behavior.py`：

```python
from .trigger import trigger, Behavior

@trigger(motivation="curiosity", threshold=0.8)
class ExploreBehavior(Behavior):
    name = "explore_topic"
    priority = 5

    async def execute(self, context: dict) -> str:
        topic = context.get("topic", "未知")
        return f"话说... {topic} 是什么呢？"

    def condition(self, state: EmotionalState) -> bool:
        return state.energy > 0.5 and state.mood != "tired"
```

### 3. 添加新的 LLM 适配器

创建 `llm/openai.py`：

```python
from .base import LLMAdapter, LLMResponse

class OpenAIAdapter(LLMAdapter):
    name = "openai"
    model = "gpt-4o-mini"

    def __init__(self, api_key: str):
        self.client = OpenAI(api_key=api_key)

    async def generate(self, prompt: str, **kwargs) -> LLMResponse:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=kwargs.get("temperature", 0.8)
        )

        return LLMResponse(
            content=response.choices[0].message.content,
            tokens=response.usage.total_tokens
        )
```

在 `llm/__init__.py` 中注册：

```python
from .openai import OpenAIAdapter

ADAPTERS = {
    "openai": OpenAIAdapter,
    # ... 其他适配器
}
```

### 4. 自定义 Prompt 模板

编辑 `prompts/system.txt`：

```
你是 AKIHO，一个有着独特性格的虚拟存在。

性格特点：
- {personality_description}
- {mood_influence}
- 当前能量：{energy_level}

你的记忆：
{long_term_memory}

当前对话：
{conversation_history}

请以 AKIHO 的风格回复，注意：
1. 符合当前的 {mood} 情绪状态
2. 考虑能量水平 {energy_level}
3. 不要泄露隐私信息
```

## 测试

### 运行测试

```bash
# 运行所有测试
pytest tests/

# 运行特定测试
pytest tests/test_emotion.py -v

# 生成覆盖率报告
pytest tests/ --cov=. --cov-report=html
```

### 编写测试

```python
# tests/test_emotion.py
import pytest
from engine.emotion import EmotionEngine, HappyState

def test_emotion_transition():
    engine = EmotionEngine()
    assert isinstance(engine.current_state, HappyState)

    # 模拟负面输入
    engine.process("你真的很烦！")

    # 应该切换到生气状态
    assert engine.current_state.name in ["angry", "sad"]
```

## 调试

### 启用调试模式

```env
DEBUG=true
LOG_LEVEL=DEBUG
```

### 查看日志

```bash
tail -f logs/akiho.log
```

### 常见问题

#### 1. LLM API 调用失败

```
错误: Connection timeout
解决: 检查网络连接和 API Key
```

#### 2. 记忆向量检索慢

```
解决: 定期清理过期记忆，或增加向量检索缓存
```

#### 3. 情绪状态卡死

```
解决: 检查状态转换条件，确保有出口状态
```

## 部署

### Docker 部署

```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["python", "main.py"]
```

```bash
# 构建
docker build -t akiho:latest .

# 运行
docker run -d -p 8000:8000 --env-file .env akiho:latest
```

### 生产环境

推荐使用 gunicorn：

```bash
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

### 4. 添加新的认知偏差

编辑 `engine/cognition.py`：

```python
from .bias import CognitiveBias, BiasType

class CognitiveBiasFactory:
    """认知偏差工厂"""

    @staticmethod
    def create_bias(bias_type: str, tendency: float = 0.5) -> CognitiveBias:
        """创建认知偏差实例"""
        biases = {
            "confirmation": CognitiveBias(
                bias_type=BiasType.Confirmation,
                tendency=tendency,
                strength=0.7,
            ),
            "anchoring": CognitiveBias(
                bias_type=BiasType.Anchoring,
                tendency=tendency,
                strength=0.5,
            ),
            "recency": CognitiveBias(
                bias_type=BiasType.Recency,
                tendency=tendency,
                strength=0.6,
            ),
        }
        return biases.get(bias_type)
```

### 5. 实现意图驱动行为

编辑 `engine/intent.py`：

```python
from .desire import Desire, DesireType

class Intent:
    """意图"""
    def __init__(self, intent_type: str, target: str = None, intensity: float = 0.5):
        self.intent_type = intent_type
        self.target = target
        self.intensity = intensity
        self.commitment_strength = 0.5

class IntentEngine:
    """意图引擎"""

    def __init__(self):
        self.current_intent = None
        self.intent_history = []

    def desire_to_intent(self, desire: Desire, context: dict) -> Intent:
        """从欲望生成意图"""
        deliberation = self.deliberate(desire, context)

        return Intent(
            intent_type=desire.desire_type.value,
            target=self.find_target(desire, context),
            intensity=desire.intensity * deliberation["confidence"],
        )

    def deliberate(self, desire: Desire, context: dict) -> dict:
        """权衡思考"""
        pros = self.analyze_pros(desire, context)
        cons = self.analyze_cons(desire, context)
        confidence = len(pros) / (len(pros) + len(cons) + 1)

        return {
            "pros": pros,
            "cons": cons,
            "confidence": min(confidence, 1.0),
        }
```

### 6. 实现人生叙事集成

编辑 `engine/narrative.py`：

```python
from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime

@dataclass
class NarrativeEvent:
    """叙事事件"""
    what_happened: str
    how_felt: str
    what_learned: str
    meaning_for_story: str

class LifeNarrative:
    """人生叙事引擎"""

    def __init__(self):
        self.chapters: List = []
        self.current_chapter: Optional[str] = None
        self.turning_points: List = []

    def process_significant_event(self, experience: dict) -> dict:
        """处理重要经历"""
        significance = self.evaluate_significance(experience)

        if significance < 0.5:
            return {"skipped": True}

        story = self.extract_story(experience)

        if self.is_turning_point(experience):
            turning_point = self.create_turning_point(experience)
            self.turning_points.append(turning_point)

        return {"story": story, "turning_point": turning_point if self.is_turning_point(experience) else None}

    def get_narrative_context(self) -> str:
        """获取叙事上下文"""
        if not self.chapters:
            return "我还是一个新生的存在，还没有太多故事。"
        return f"我已经走过了{len(self.chapters)}个人生篇章。"
```

### 7. 自定义欲望类型

编辑 `engine/desire.py`：

```python
from enum import Enum
from dataclasses import dataclass

class DesireType(Enum):
    """欲望类型"""
    CURIOUS = "curious"           # 好奇心
    AFFILIATION = "affiliation"   # 归属感
    REST = "rest"                 # 休息
    SOCIAL = "social"             # 社交
    CREATE = "create"             # 创造

@dataclass
class Desire:
    """欲望"""
    desire_type: DesireType
    intensity: float
    threshold: float = 0.5

class DesireSystem:
    """欲望系统"""

    def __init__(self):
        self.active_desires = []

    def evaluate(self, context: dict) -> List[Desire]:
        """评估当前欲望状态"""
        self.active_desires.clear()

        for desire_type in DesireType:
            intensity = self.calculate_intensity(desire_type, context)
            if intensity > 0.3:
                self.active_desires.append(Desire(
                    desire_type=desire_type,
                    intensity=intensity,
                ))

        return sorted(self.active_desires, key=lambda d: d.intensity, reverse=True)
```

## 贡献指南

1. Fork 项目
2. 创建特性分支 `git checkout -b feature/amazing-feature`
3. 提交更改 `git commit -m 'Add amazing feature'`
4. 推送到分支 `git push origin feature/amazing-feature`
5. 创建 Pull Request

## 许可证

MIT License
