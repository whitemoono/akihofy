"""生理模块单元测试"""
import pytest
from engine.body import BodyManager, NeedType


class TestBodyManager:
    def test_initial_state(self, body_manager):
        assert body_manager.energy == 1.0
        assert body_manager.mental_fatigue == 0.0
        assert body_manager.emotional_fatigue == 0.0
        assert body_manager.social_fatigue == 0.0

    def test_total_fatigue_zero(self, body_manager):
        assert body_manager.total_fatigue == 0.0

    def test_total_fatigue_calculation(self, body_manager):
        body_manager.mental_fatigue = 0.3
        body_manager.emotional_fatigue = 0.6
        body_manager.social_fatigue = 0.9
        expected = (0.3 + 0.6 + 0.9) / 3.0
        assert body_manager.total_fatigue == pytest.approx(expected)

    def test_fatigue_property(self, body_manager):
        body_manager.mental_fatigue = 0.5
        assert body_manager.fatigue == body_manager.total_fatigue

    def test_get_status(self, body_manager):
        status = body_manager.get_status()
        assert "energy" in status
        assert "fatigue" in status
        assert "dominant_need" in status
        assert "needs" in status

    def test_update_active_drains_energy(self, body_manager):
        initial = body_manager.energy
        body_manager.update(delta=10.0, is_active=True)
        assert body_manager.energy < initial

    def test_update_inactive_recovers_energy(self, body_manager):
        body_manager.energy = 0.5
        body_manager.update(delta=10.0, is_active=False)
        assert body_manager.energy > 0.5

    def test_update_active_increases_fatigue(self, body_manager):
        body_manager.update(delta=10.0, is_active=True)
        assert body_manager.mental_fatigue > 0.0

    def test_update_inactive_recovers_fatigue(self, body_manager):
        body_manager.mental_fatigue = 0.5
        body_manager.update(delta=10.0, is_active=False)
        assert body_manager.mental_fatigue < 0.5

    def test_energy_cannot_exceed_max(self, body_manager):
        body_manager.energy = 0.99
        body_manager.update(delta=100.0, is_active=False)
        assert body_manager.energy <= body_manager.max_energy

    def test_energy_cannot_go_below_zero(self, body_manager):
        body_manager.energy = 0.01
        body_manager.update(delta=100.0, is_active=True)
        assert body_manager.energy >= 0.0

    def test_dominant_need(self, body_manager):
        dn = body_manager.dominant_need()
        assert dn is None or isinstance(dn, str)

    def test_apply_social_fatigue(self, body_manager):
        body_manager.apply_social_fatigue(0.3)
        assert body_manager.social_fatigue == 0.3

    def test_apply_social_fatigue_clamped(self, body_manager):
        body_manager.apply_social_fatigue(2.0)
        assert body_manager.social_fatigue == 1.0

    def test_restore_energy(self, body_manager):
        body_manager.energy = 0.3
        body_manager.restore_energy(0.5)
        assert body_manager.energy == 0.8

    def test_restore_energy_clamped(self, body_manager):
        body_manager.energy = 0.9
        body_manager.restore_energy(0.5)
        assert body_manager.energy == 1.0

    def test_satisfy_need(self, body_manager):
        body_manager.needs[NeedType.COGNITIVE].intensity = 0.8
        body_manager.satisfy_need(NeedType.COGNITIVE, 0.5)
        assert body_manager.needs[NeedType.COGNITIVE].intensity == pytest.approx(0.3)
        assert body_manager.needs[NeedType.COGNITIVE].urgency == 0.0

    def test_needs_update_urgency(self, body_manager):
        body_manager.needs[NeedType.COGNITIVE].intensity = 0.8
        body_manager._update_needs(1.0)
        assert body_manager.needs[NeedType.COGNITIVE].urgency > 0.0
