"""
情绪模块单元测试
"""
import pytest
from engine.emotion import EmotionManager, EmotionState


class TestEmotionState:
    """EmotionState 数据类测试"""

    def test_default_values(self):
        state = EmotionState()
        assert state.pleasure == 0.0
        assert state.arousal == 0.0
        assert state.dominance == 0.0

    def test_intensity_zero(self):
        state = EmotionState()
        assert state.intensity == 0.0

    def test_intensity_calculation(self):
        state = EmotionState(pleasure=0.6, arousal=0.8, dominance=0.0)
        assert state.intensity == pytest.approx(1.0, abs=0.01)

    def test_intensity_partial(self):
        state = EmotionState(pleasure=0.3, arousal=0.4, dominance=0.0)
        assert state.intensity == pytest.approx(0.5, abs=0.01)

    def test_to_dict(self):
        state = EmotionState(pleasure=0.5, arousal=0.3, dominance=0.2)
        d = state.to_dict()
        assert d["pleasure"] == 0.5
        assert d["arousal"] == 0.3
        assert d["dominance"] == 0.2
        assert "intensity" in d

    def test_clamp_boundaries(self):
        state = EmotionState(pleasure=1.5, arousal=-2.0, dominance=3.0)
        assert state.pleasure == 1.5  # dataclass 不自动 clamp
        assert state.arousal == -2.0


class TestEmotionManager:
    """EmotionManager 测试"""

    def test_initial_state(self, emotion_manager):
        assert emotion_manager.pleasure == 0.0
        assert emotion_manager.arousal == 0.0
        assert emotion_manager.dominance == 0.0
        assert emotion_manager.category == "neutral"

    def test_get_state(self, emotion_manager):
        state = emotion_manager.get_state()
        assert "pleasure" in state
        assert "arousal" in state
        assert "dominance" in state
        assert "intensity" in state
        assert "category" in state

    def test_update_decay(self, emotion_manager):
        emotion_manager.state.pleasure = 0.5
        emotion_manager.state.arousal = 0.5
        emotion_manager.update(delta=1.0)
        assert emotion_manager.pleasure < 0.5
        assert emotion_manager.arousal < 0.5

    def test_update_decay_toward_neutral(self, emotion_manager):
        emotion_manager.state.pleasure = 0.8
        for _ in range(50):
            emotion_manager.update(delta=0.1)
        assert abs(emotion_manager.pleasure) < 0.8

    def test_process_positive_stimulus(self, emotion_manager):
        emotion_manager.process_stimulus("positive", intensity=1.0)
        assert emotion_manager.pleasure > 0.0
        assert emotion_manager.arousal > 0.0

    def test_process_negative_stimulus(self, emotion_manager):
        emotion_manager.process_stimulus("negative", intensity=1.0)
        assert emotion_manager.pleasure < 0.0
        assert emotion_manager.arousal > 0.0

    def test_process_neutral_stimulus(self, emotion_manager):
        emotion_manager.state.pleasure = 0.5
        emotion_manager.process_stimulus("neutral", intensity=1.0)
        # neutral 不改变值（仅通过惯性回拉）
        assert emotion_manager.pleasure <= 0.5

    def test_process_achieved_stimulus(self, emotion_manager):
        emotion_manager.process_stimulus("achieved", intensity=1.0)
        assert emotion_manager.pleasure > 0.0
        assert emotion_manager.dominance > 0.0

    def test_process_failed_stimulus(self, emotion_manager):
        emotion_manager.process_stimulus("failed", intensity=1.0)
        assert emotion_manager.pleasure < 0.0
        assert emotion_manager.dominance < 0.0

    def test_process_attention_stimulus(self, emotion_manager):
        emotion_manager.process_stimulus("attention", intensity=1.0)
        assert emotion_manager.pleasure > 0.0
        assert emotion_manager.arousal > 0.0

    def test_process_lonely_stimulus(self, emotion_manager):
        emotion_manager.process_stimulus("lonely", intensity=1.0)
        assert emotion_manager.pleasure < 0.0
        assert emotion_manager.arousal < 0.0

    def test_stimulus_intensity_scaling(self, emotion_manager):
        emotion_manager.process_stimulus("positive", intensity=0.2)
        low_pleasure = emotion_manager.pleasure

        emotion_manager2 = EmotionManager()
        emotion_manager2.process_stimulus("positive", intensity=1.0)
        assert emotion_manager2.pleasure > low_pleasure

    def test_unknown_stimulus_type(self, emotion_manager):
        """未知刺激类型不应崩溃"""
        emotion_manager.process_stimulus("nonexistent", intensity=0.5)
        assert isinstance(emotion_manager.pleasure, float)

    def test_process_text_positive(self, emotion_manager):
        emotion_manager.process_text_input("我好开心啊，今天真好！")
        assert emotion_manager.pleasure > 0.0

    def test_process_text_negative(self, emotion_manager):
        emotion_manager.process_text_input("我好难过，真的很讨厌这样")
        assert emotion_manager.pleasure < 0.0

    def test_process_text_question(self, emotion_manager):
        initial_arousal = emotion_manager.arousal
        emotion_manager.process_text_input("这是为什么呢？怎么回事？")
        assert emotion_manager.arousal > initial_arousal

    def test_process_text_emoji_positive(self, emotion_manager):
        emotion_manager.process_text_input(":) :D 哈哈")
        assert emotion_manager.pleasure > 0.0

    def test_process_text_emoji_negative(self, emotion_manager):
        emotion_manager.process_text_input(":( :/ 唉")
        assert emotion_manager.pleasure < 0.0

    def test_clamp_prevents_overflow(self, emotion_manager):
        emotion_manager.process_stimulus("positive", intensity=100.0)
        assert -1.0 <= emotion_manager.pleasure <= 1.0
        assert -1.0 <= emotion_manager.arousal <= 1.0
        assert -1.0 <= emotion_manager.dominance <= 1.0

    def test_update_from_body_low_energy(self, emotion_manager):
        emotion_manager.update_from_body(energy=0.1, fatigue=0.2)
        assert emotion_manager.pleasure < 0.0

    def test_update_from_body_high_energy(self, emotion_manager):
        emotion_manager.update_from_body(energy=0.9, fatigue=0.1)
        assert emotion_manager.pleasure > 0.0

    def test_update_from_body_high_fatigue(self, emotion_manager):
        emotion_manager.update_from_body(energy=0.5, fatigue=0.8)
        assert emotion_manager.pleasure < 0.0

    def test_classify_positive(self, emotion_manager):
        emotion_manager.state.pleasure = 0.5
        emotion_manager.state.arousal = 0.0
        assert emotion_manager.category == "positive"

    def test_classify_negative(self, emotion_manager):
        emotion_manager.state.pleasure = -0.5
        emotion_manager.state.arousal = 0.5
        assert emotion_manager.category == "negative"

    def test_classify_apathetic(self, emotion_manager):
        emotion_manager.state.pleasure = 0.0
        emotion_manager.state.arousal = -0.5
        assert emotion_manager.category == "apathetic"

    def test_classify_neutral(self, emotion_manager):
        emotion_manager.state.pleasure = 0.0
        emotion_manager.state.arousal = 0.0
        assert emotion_manager.category == "neutral"

    def test_classify_mixed(self, emotion_manager):
        emotion_manager.state.pleasure = 0.4
        emotion_manager.state.arousal = 0.5
        assert emotion_manager.category == "mixed"

    def test_emotion_map_contains_expected_emotions(self, emotion_manager):
        expected = ["joy", "serenity", "surprise", "anger", "fear", "sadness", "disgust", "anxiety", "boredom", "submission"]
        for e in expected:
            assert e in emotion_manager.EMOTION_MAP

    def test_emotion_map_values_in_range(self, emotion_manager):
        for emotion, values in emotion_manager.EMOTION_MAP.items():
            assert -1.0 <= values["pleasure"] <= 1.0
            assert -1.0 <= values["arousal"] <= 1.0
            assert -1.0 <= values["dominance"] <= 1.0

    def test_inertia_applied(self, emotion_manager):
        """情绪惯性应使变化更平滑"""
        emotion_manager.process_stimulus("positive", intensity=1.0)
        first_pleasure = emotion_manager.pleasure
        emotion_manager.process_stimulus("negative", intensity=1.0)
        # 由于惯性，不应立即翻转到完全负面
        assert emotion_manager.pleasure > -0.5
