"""成长模块单元测试"""
import pytest
from engine.growth import GrowthManager, GrowthPhase


class TestGrowthManager:
    def test_initial_phase(self, growth_manager):
        assert growth_manager.phase == GrowthPhase.INFANT

    def test_initial_characteristics(self, growth_manager):
        assert len(growth_manager.characteristics) == 8
        assert "好奇心" in growth_manager.characteristics
        assert "友善" in growth_manager.characteristics

    def test_get_profile(self, growth_manager):
        profile = growth_manager.get_profile()
        assert profile["phase"] == "infant"
        assert "characteristics" in profile
        assert profile["experience_count"] == 0
        assert profile["milestone_count"] == 0

    def test_process_experience_positive_interaction(self, growth_manager):
        growth_manager.process_experience("positive_interaction", intensity=1.0)
        assert growth_manager.experience_count == 1
        assert growth_manager.characteristics["友善"].current_value > 0.5

    def test_process_experience_negative_interaction(self, growth_manager):
        growth_manager.process_experience("negative_interaction", intensity=1.0)
        assert growth_manager.characteristics["自信"].current_value < 0.4

    def test_process_experience_learning(self, growth_manager):
        growth_manager.process_experience("learning", intensity=1.0)
        assert growth_manager.characteristics["好奇心"].current_value > 0.5

    def test_process_experience_creation(self, growth_manager):
        growth_manager.process_experience("creation", intensity=1.0)
        assert growth_manager.characteristics["创造力"].current_value > 0.4

    def test_process_experience_social_bond(self, growth_manager):
        growth_manager.process_experience("social_bond", intensity=1.0)
        assert growth_manager.characteristics["友善"].current_value > 0.5

    def test_process_experience_achievement(self, growth_manager):
        growth_manager.process_experience("achievement", intensity=1.0)
        assert growth_manager.characteristics["自信"].current_value > 0.4

    def test_process_experience_failure(self, growth_manager):
        growth_manager.process_experience("failure", intensity=1.0)
        assert growth_manager.characteristics["耐心"].current_value > 0.4

    def test_process_experience_reflection(self, growth_manager):
        growth_manager.process_experience("reflection", intensity=1.0)
        assert growth_manager.characteristics["独立性"].current_value > 0.3

    def test_process_experience_unknown_type(self, growth_manager):
        growth_manager.process_experience("unknown_type", intensity=1.0)
        assert growth_manager.experience_count == 1

    def test_characteristics_clamped(self, growth_manager):
        for _ in range(100):
            growth_manager.process_experience("positive_interaction", intensity=1.0)
        assert growth_manager.characteristics["友善"].current_value <= 1.0

    def test_evolve(self, growth_manager):
        initial = growth_manager.characteristics["好奇心"].current_value
        growth_manager.evolve(delta=10.0)
        # 演化后值应有所变化
        assert growth_manager.characteristics["好奇心"].current_value != initial

    def test_milestone_to_toddler(self, growth_manager):
        for _ in range(100):
            growth_manager.process_experience("positive_interaction", intensity=0.5)
        assert growth_manager.phase == GrowthPhase.TODDLER
        assert growth_manager.milestone_count == 1

    def test_milestone_to_child(self, growth_manager):
        for _ in range(500):
            growth_manager.process_experience("learning", intensity=0.5)
        assert growth_manager.phase in (GrowthPhase.CHILD, GrowthPhase.ADOLESCENT, GrowthPhase.ADULT)
