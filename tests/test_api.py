"""API 集成测试"""
import pytest
import httpx
from api_server import app


def _mk():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")


class TestHealth:
    @pytest.mark.asyncio
    async def test_health(self):
        async with _mk() as c:
            r = await c.get("/health")
            assert r.status_code == 200
            assert r.json()["status"] == "ok"


class TestConfig:
    @pytest.mark.asyncio
    async def test_get(self):
        async with _mk() as c:
            r = await c.get("/api/config")
            assert r.status_code == 200
            assert r.json()["code"] == 0


class TestChat:
    @pytest.mark.asyncio
    async def test_chat(self):
        async with _mk() as c:
            r = await c.post("/api/chat", json={"message": "你好"})
            assert r.status_code == 200
            d = r.json()
            assert "response" in d
            assert "emotion" in d
            assert "timestamp" in d

    @pytest.mark.asyncio
    async def test_empty(self):
        async with _mk() as c:
            r = await c.post("/api/chat", json={"message": ""})
            assert r.status_code == 422


class TestEmotion:
    @pytest.mark.asyncio
    async def test_get(self):
        async with _mk() as c:
            r = await c.get("/api/emotion")
            assert r.status_code == 200
            assert "pleasure" in r.json()

    @pytest.mark.asyncio
    async def test_stimulus(self):
        async with _mk() as c:
            r = await c.post("/api/emotion/stimulus", json={"stimulus_type": "positive", "intensity": 0.8})
            assert r.status_code == 200


class TestMemory:
    @pytest.mark.asyncio
    async def test_summary(self):
        async with _mk() as c:
            r = await c.get("/api/memory")
            assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_search(self):
        async with _mk() as c:
            r = await c.post("/api/memory/search", json={"query": "test", "limit": 3})
            assert r.status_code == 200


class TestBehavior:
    @pytest.mark.asyncio
    async def test_available(self):
        async with _mk() as c:
            r = await c.get("/api/behavior/available")
            assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_active(self):
        async with _mk() as c:
            r = await c.get("/api/behavior/active")
            assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_trigger(self):
        async with _mk() as c:
            r = await c.post("/api/behavior/trigger/rest")
            assert r.status_code == 200


class TestStatus:
    @pytest.mark.asyncio
    async def test_all(self):
        async with _mk() as c:
            assert (await c.get("/api/status")).status_code == 200
            assert (await c.get("/api/state")).status_code == 200
            assert (await c.get("/api/display")).status_code == 200


class TestGenerator:
    @pytest.mark.asyncio
    async def test_all(self):
        async with _mk() as c:
            assert (await c.get("/api/generator/list")).status_code == 200
            assert (await c.get("/api/generator/info")).status_code == 200


class TestAnthropic:
    @pytest.mark.asyncio
    async def test_all(self):
        async with _mk() as c:
            assert (await c.get("/api/intent")).status_code == 200
            assert (await c.get("/api/desires")).status_code == 200
            assert (await c.get("/api/cognitive-bias")).status_code == 200
            assert (await c.get("/api/narrative")).status_code == 200


class TestRelationship:
    @pytest.mark.asyncio
    async def test_get(self):
        async with _mk() as c:
            r = await c.get("/api/relationship")
            assert r.status_code == 200


class TestGrowth:
    @pytest.mark.asyncio
    async def test_profile(self):
        async with _mk() as c:
            r = await c.get("/api/growth/profile")
            assert r.status_code == 200
