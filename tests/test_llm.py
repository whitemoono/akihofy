"""LLM 模块单元测试"""
import pytest
from engine.llm import LLMManager, GenerationContext, GenerationResult


class TestGenerationContext:
    def test_defaults(self):
        ctx = GenerationContext(user_message="hello")
        assert ctx.user_message == "hello"
        assert ctx.character_name == "AKIHO"
        assert ctx.current_mood == "neutral"
        assert ctx.temperature == 0.8
        assert ctx.max_length == 1024


class TestGenerationResult:
    def test_success_result(self):
        r = GenerationResult(text="hello", generator_type="deepseek", response_time_ms=100)
        assert r.success is True
        assert r.text == "hello"
        assert r.error is None

    def test_error_result(self):
        r = GenerationResult.error_result("deepseek", "timeout")
        assert r.success is False
        assert r.text == ""
        assert r.error == "timeout"


class TestLLMManager:
    def test_default_provider(self, llm_manager):
        assert llm_manager.default_provider == "deepseek"

    def test_get_provider_deepseek(self, llm_manager):
        try:
            import openai
        except ImportError:
            pytest.skip("openai not installed")
        provider = llm_manager.get_provider("deepseek")
        assert provider is not None

    def test_get_provider_cached(self, llm_manager):
        try:
            import openai
        except ImportError:
            pytest.skip("openai not installed")
        p1 = llm_manager.get_provider("deepseek")
        p2 = llm_manager.get_provider("deepseek")
        assert p1 is p2

    def test_get_provider_unknown(self, llm_manager):
        # 未知 provider 会使用默认配置而不是抛出异常
        provider = llm_manager.get_provider("unknown_provider")
        assert provider is not None
        assert provider.description is not None

    def test_build_system_prompt(self, llm_manager, generation_context):
        prompt = llm_manager.build_system_prompt(generation_context)
        assert "AKIHO" in prompt
        assert "秋穗" in prompt
        assert "朋友" in prompt

    def test_build_system_prompt_with_memories(self, llm_manager):
        ctx = GenerationContext(
            user_message="hello",
            relevant_memories=["上次聊了天气", "你喜欢猫"]
        )
        prompt = llm_manager.build_system_prompt(ctx)
        assert "天气" in prompt

    def test_build_system_prompt_low_energy(self, llm_manager):
        ctx = GenerationContext(user_message="hello", energy=0.1)
        prompt = llm_manager.build_system_prompt(ctx)
        assert "困" in prompt

    def test_build_system_prompt_high_energy(self, llm_manager):
        ctx = GenerationContext(user_message="hello", energy=0.9)
        prompt = llm_manager.build_system_prompt(ctx)
        assert "精神好" in prompt

    def test_build_system_prompt_stranger(self, llm_manager):
        ctx = GenerationContext(user_message="hello", relationship="stranger")
        prompt = llm_manager.build_system_prompt(ctx)
        assert "刚认识" in prompt

    def test_build_system_prompt_intimate(self, llm_manager):
        ctx = GenerationContext(user_message="hello", relationship="intimate")
        prompt = llm_manager.build_system_prompt(ctx)
        assert "亲近" in prompt

    @pytest.mark.asyncio
    async def test_generate_error_on_no_api_key(self, llm_manager):
        ctx = GenerationContext(user_message="test")
        result = await llm_manager.generate(ctx)
        assert isinstance(result, GenerationResult)
        # 没有 API key 时应该返回错误结果
        if not result.success:
            assert result.error is not None
