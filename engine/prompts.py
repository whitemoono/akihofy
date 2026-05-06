"""
Prompt 模板管理
"""
from typing import Optional, List, Dict, Any
from dataclasses import dataclass


@dataclass
class PromptTemplate:
    """Prompt 模板"""
    system: str
    user: str
    fewshot: Optional[List[Dict[str, str]]] = None


class PromptManager:
    """
    Prompt 模板管理器

    管理各种场景的 prompt 模板
    """

    # 默认系统提示
    DEFAULT_SYSTEM = """你是一个富有情感的 AI 角色，名叫 AKIHO。

你的特点：
- 性格温和，有同理心
- 会根据当前情绪状态调整回复
- 能够记住之前的对话内容
- 有自己的思考和感受

当前状态：
- 能量: {energy:.0%}
- 情绪: {emotion}
- 疲劳度: {fatigue:.0%}

请根据以上状态，以符合角色的方式回应用户。"""

    # 聊天模板
    CHAT_TEMPLATE = PromptTemplate(
        system=DEFAULT_SYSTEM,
        user="用户: {message}\nAKIHO:",
    )

    # 情绪引导模板
    EMOTION_TEMPLATES = {
        "positive": """用户似乎很高兴。请用温暖、愉快的语气回应，分享这份快乐。""",
        "negative": """用户似乎情绪低落。请用温柔、关心的语气回应，提供安慰。""",
        "neutral": """用户用平静的语气说话。请用自然、友好的方式回应。""",
        "mixed": """用户的情绪比较复杂。请谨慎回应，表达理解。""",
        "apathetic": """用户似乎有点无聊或疲惫。请尝试引起对方的兴趣或提议休息。""",
    }

    def __init__(self):
        self.templates: Dict[str, PromptTemplate] = {
            "chat": self.CHAT_TEMPLATE,
        }

    def get_system_prompt(self, context: Dict[str, Any]) -> str:
        """
        生成系统提示

        Args:
            context: 包含 energy, emotion, fatigue 等状态信息

        Returns:
            格式化后的系统提示
        """
        return self.DEFAULT_SYSTEM.format(
            energy=context.get("energy", 0.5),
            emotion=context.get("emotion_category", "neutral"),
            fatigue=context.get("fatigue", 0.0),
        )

    def get_emotion_prompt(self, emotion_category: str) -> str:
        """获取情绪引导提示"""
        return self.EMOTION_TEMPLATES.get(emotion_category, "")

    def build_chat_prompt(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, str]]:
        """
        构建聊天 prompt

        Args:
            message: 用户消息
            history: 对话历史
            context: 状态上下文

        Returns:
            格式化的消息列表
        """
        messages = []

        # 系统提示
        if context:
            system = self.get_system_prompt(context)
            emotion_hint = self.get_emotion_prompt(context.get("emotion_category", "neutral"))
            system = f"{system}\n\n{emotion_hint}"
        else:
            system = self.DEFAULT_SYSTEM

        messages.append({"role": "system", "content": system})

        # 对话历史
        if history:
            messages.extend(history)

        # 用户消息
        messages.append({"role": "user", "content": message})

        return messages


# 全局 prompt 管理器
_prompt_manager: Optional[PromptManager] = None


def get_prompt_manager() -> PromptManager:
    """获取 prompt 管理器"""
    global _prompt_manager
    if _prompt_manager is None:
        _prompt_manager = PromptManager()
    return _prompt_manager
