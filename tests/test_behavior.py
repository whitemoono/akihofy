"""行为模块单元测试"""
import pytest
from engine.behavior import BehaviorManager, Behavior, BehaviorCategory


class TestBehavior:
    def test_check_requirements_energy(self):
        b = Behavior(id="test", name="测试", category=BehaviorCategory.PHYSIOLOGICAL, priority=0.5, activation_threshold=0.3, duration=60, cooldown=120, requirements={"min_energy": 0.5})
        assert b.check_requirements({"energy": 0.8})
        assert not b.check_requirements({"energy": 0.2})

    def test_check_requirements_mood(self):
        b = Behavior(id="test", name="测试", category=BehaviorCategory.BELONGING, priority=0.5, activation_threshold=0.3, duration=60, cooldown=120, requirements={"min_mood": 0.3})
        assert b.check_requirements({"emotion": {"pleasure": 0.5}})
        assert not b.check_requirements({"emotion": {"pleasure": 0.1}})

    def test_check_requirements_fatigue(self):
        b = Behavior(id="test", name="测试", category=BehaviorCategory.PHYSIOLOGICAL, priority=0.5, activation_threshold=0.3, duration=60, cooldown=120, requirements={"max_fatigue": 0.5})
        assert b.check_requirements({"fatigue": 0.2})
        assert not b.check_requirements({"fatigue": 0.8})

    def test_check_requirements_empty(self):
        b = Behavior(id="test", name="测试", category=BehaviorCategory.SELF_ACTUALIZATION, priority=0.5, activation_threshold=0.0, duration=60, cooldown=120, requirements={})
        assert b.check_requirements({})


class TestBehaviorManager:
    def test_default_behaviors_loaded(self, behavior_manager):
        assert len(behavior_manager.behaviors) >= 5

    def test_get_available(self, behavior_manager):
        available = behavior_manager.get_available()
        assert len(available) > 0
        assert "id" in available[0]
        assert "name" in available[0]
        assert "priority" in available[0]

    def test_get_active_empty(self, behavior_manager):
        assert behavior_manager.get_active() == []

    def test_trigger_valid(self, behavior_manager):
        result = behavior_manager.trigger("rest")
        assert result is True
        assert len(behavior_manager.get_active()) == 1

    def test_trigger_invalid(self, behavior_manager):
        result = behavior_manager.trigger("nonexistent")
        assert result is False

    def test_trigger_on_cooldown(self, behavior_manager):
        behavior_manager.trigger("rest")
        result = behavior_manager.trigger("rest")
        assert result is False  # 冷却中

    def test_trigger_replaces_lower_priority(self, behavior_manager):
        behavior_manager.trigger("reflect")  # priority 0.4
        behavior_manager.trigger("create")   # priority 0.55, same category
        active = behavior_manager.get_active()
        assert len(active) == 1
        assert active[0]["id"] == "create"

    def test_trigger_from_input_learn(self, behavior_manager):
        state = {"energy": 0.8, "fatigue": 0.1}
        result = behavior_manager.trigger_from_input("教我学习Python", state)
        assert result == "learn"

    def test_trigger_from_input_create(self, behavior_manager):
        state = {"energy": 0.7, "fatigue": 0.1}
        result = behavior_manager.trigger_from_input("帮我创作一首诗", state)
        assert result == "create"

    def test_trigger_from_input_socialize(self, behavior_manager):
        state = {"energy": 0.5, "fatigue": 0.2}
        result = behavior_manager.trigger_from_input("来聊聊天吧", state)
        assert result == "socialize"

    def test_trigger_from_input_no_match(self, behavior_manager):
        state = {"energy": 0.8, "fatigue": 0.1}
        result = behavior_manager.trigger_from_input("今天天气不错", state)
        assert result is None

    def test_update_progress(self, behavior_manager):
        behavior_manager.trigger("rest")
        behavior_manager.update({"energy": 0.5, "fatigue": 0.3}, delta=0.1)
        active = behavior_manager.get_active()
        if active:
            assert 0.0 <= active[0]["progress"] <= 1.0

    def test_auto_trigger_rest_low_energy(self, behavior_manager):
        behavior_manager.update({"energy": 0.1, "fatigue": 0.5}, delta=0.1)
        active = behavior_manager.get_active()
        assert len(active) >= 1
        assert active[0]["id"] == "rest"

    def test_auto_trigger_rest_high_fatigue(self, behavior_manager):
        behavior_manager.update({"energy": 0.8, "fatigue": 0.9}, delta=0.1)
        active = behavior_manager.get_active()
        assert any(ab["id"] == "rest" for ab in active)
