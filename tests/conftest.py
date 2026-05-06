"""
pytest 配置和共享 fixtures
"""
import pytest
import asyncio
import sys
from pathlib import Path

# 确保项目根目录在 sys.path 中
sys.path.insert(0, str(Path(__file__).parent.parent))

from engine.emotion import EmotionManager, EmotionState
from engine.memory import MemoryManager
from engine.behavior import BehaviorManager, Behavior, BehaviorCategory
from engine.body import BodyManager, NeedType
from engine.llm import LLMManager, GenerationContext
from engine.growth import GrowthManager, GrowthPhase
from engine.persistence import MemoryStateStore


@pytest.fixture
def emotion_manager():
    """创建情绪管理器实例"""
    return EmotionManager()


@pytest.fixture
def emotion_state():
    """创建情绪状态实例"""
    return EmotionState(pleasure=0.5, arousal=0.3, dominance=0.2)


@pytest.fixture
def memory_manager():
    """创建记忆管理器实例"""
    return MemoryManager()


@pytest.fixture
def behavior_manager():
    """创建行为管理器实例"""
    return BehaviorManager()


@pytest.fixture
def body_manager():
    """创建生理管理器实例"""
    return BodyManager()


@pytest.fixture
def growth_manager():
    """创建成长管理器实例"""
    return GrowthManager()


@pytest.fixture
def llm_manager():
    """创建 LLM 管理器实例"""
    return LLMManager()


@pytest.fixture
def memory_store():
    """创建内存状态存储实例"""
    return MemoryStateStore()


@pytest.fixture
def generation_context():
    """创建生成上下文"""
    return GenerationContext(
        user_message="你好",
        character_name="AKIHO",
        current_mood="happy",
        mood_intensity=0.6,
        intimacy=0.5,
        trust=0.5,
        relationship="friend",
        energy=0.8,
        fatigue=0.2,
        recent_messages=[
            {"role": "user", "content": "你好呀"},
            {"role": "assistant", "content": "嗨！今天怎么样？"}
        ],
        relevant_memories=["上次聊了天气"],
        temperature=0.8,
        max_length=1024,
    )


@pytest.fixture
def sample_state():
    """示例系统状态"""
    return {
        "energy": 0.8,
        "fatigue": 0.2,
        "emotion": {"pleasure": 0.5, "arousal": 0.3, "dominance": 0.2},
    }
