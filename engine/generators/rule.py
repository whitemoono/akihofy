"""
纯规则引擎生成器 - 零依赖，无需任何外部服务

使用模板 + 随机化实现对话生成，完全本地运行
"""

import random
import re
from typing import Optional
from .base import BaseGenerator, GenerationContext, GenerationResult, GeneratorType


class RuleBasedGenerator(BaseGenerator):
    """纯规则生成器 - 不依赖任何外部服务"""

    name = "rule"
    type = GeneratorType.RULE

    # 情绪前缀/后缀映射
    MOOD_PREFIXES = {
        "happy": ["（眼睛亮亮的）", "（心情不错）", "（微笑）", "（轻轻笑着）"],
        "sad": ["（有些低落）", "（叹气）", "（眼眶微红）", "（低着头）"],
        "angry": ["（眉头紧锁）", "（不悦）", "（冷哼一声）", "（气鼓鼓）"],
        "excited": ["（两眼放光）", "（兴奋地）", "（雀跃）", "（跳起来）"],
        "tired": ["（打了个哈欠）", "（揉揉眼睛）", "（无精打采）", "（困倦地）"],
        "shy": ["（脸微微发红）", "（低下头）", "（移开视线）", "（有些不好意思）"],
        "neutral": ["", "（歪头）", "（想了想）", "（若有所思）"],
    }

    # 关系前缀/后缀映射
    RELATION_PREFIXES = {
        "stranger": "嗯？",
        "acquaintance": "啊，是你啊。",
        "friend": "嗨~",
        "close": "你来啦！",
        "intimate": "（扑过来）你终于来了！",
    }

    # 疲劳度前缀
    FATIGUE_PREFIXES = {
        (0.8, 1.0): ["（精神抖擞）", "（活力满满）"],
        (0.5, 0.8): ["", "", "（有点困）"],
        (0.2, 0.5): ["（哈欠连天）", "（揉眼睛）"],
        (0.0, 0.2): ["（快要睡着了）", "（眼皮打架）"],
    }

    # 基础回复模板
    GREETING_TEMPLATES = [
        "你好呀。",
        "嗯？有什么事吗？",
        "（抬起头）啊...你好。",
        "有什么事吗？",
    ]

    QUESTION_TEMPLATES = [
        "嗯...为什么突然问这个？",
        "这个嘛...我也不太确定呢。",
        "（思考）让我想想...",
        "这个有点难回答呢。",
    ]

    POSITIVE_RESPONSE_TEMPLATES = [
        "嗯，说得对呢。",
        "嗯嗯，是这样没错。",
        "（点头）确实。",
        "有道理。",
    ]

    NEGATIVE_RESPONSE_TEMPLATES = [
        "嗯...但是我不太这样觉得。",
        "（摇头）不太同意呢。",
        "这个...我有点不同的看法。",
        "嗯，虽然你说的也有道理...",
    ]

    COMPLIMENT_TEMPLATES = [
        "（脸红）你、你突然说这个干嘛...",
        "（害羞）谢谢...",
        "（移开视线）哼，别以为这样说我就会开心...",
        "（小声）...谢谢夸奖。",
    ]

    GOODBYE_TEMPLATES = [
        "嗯，再见。",
        "要走了吗？好吧...再见。",
        "（挥手）拜拜~",
        "下次再来找我聊天哦。",
    ]

    CURIOSITY_TEMPLATES = [
        "话说...为什么你会这样想呢？",
        "嗯...有点好奇呢。",
        "（歪头）能告诉我更多吗？",
        "有意思...继续说？",
    ]

    DEFAULT_TEMPLATES = [
        "嗯...",
        "这样啊...",
        "（若有所思）...",
        "然后呢？",
        "我知道了。",
        "嗯嗯。",
    ]

    # 关键词匹配规则
    KEYWORD_PATTERNS = {
        "greeting": [
            r"你好", r"早上好", r"晚上好", r"中午好", r"嗨", r"哈喽",
            r"hello", r"hi", r" hey", r"在吗", r"在不在",
        ],
        "goodbye": [
            r"再见", r"拜拜", r"走了", r"离开", r"晚安",
            r"bye", r"goodbye", r"回头见",
        ],
        "question": [
            r"\?{1,}", r"吗", r"呢", r"怎么", r"为什么",
            r"什么", r"是不是", r"能不能", r"要不要",
        ],
        "positive": [
            r"好", r"是", r"对", r"棒", r"厉害", r"厉害",
            r"喜欢", r"开心", r"哈哈", r"笑",
        ],
        "negative": [
            r"不", r"没", r"不是", r"讨厌", r"生气", r"难过",
            r"烦", r"累", r"困", r"无聊",
        ],
        "compliment": [
            r"可爱", r"漂亮", r"好看", r"聪明", r"厉害",
            r"喜欢你", r"真棒", r"好棒", r"加油",
        ],
        "curiosity": [
            r"为什么", r"怎么", r"什么意思", r"为什么呢",
            r"咦", r"哦", r"原来如此", r"这样啊",
        ],
        "emotion_happy": [
            r"开心", r"高兴", r"快乐", r"愉快", r"哈哈",
        ],
        "emotion_sad": [
            r"难过", r"伤心", r"悲伤", r"哭", r"郁闷",
        ],
        "emotion_angry": [
            r"生气", r"愤怒", r"讨厌", r"可恶", r"哼",
        ],
        "emotion_excited": [
            r"兴奋", r"激动", r"太好了", r"太棒了", r"哇",
        ],
        "emotion_tired": [
            r"困", r"累", r"疲惫", r"想睡觉", r"打哈欠",
        ],
    }

    def __init__(self, **kwargs):
        """初始化规则生成器"""
        self.random_seed = kwargs.get("seed", None)
        if self.random_seed:
            random.seed(self.random_seed)

    def _match_keyword(self, text: str, pattern_type: str) -> bool:
        """检查文本是否匹配指定类型的关键词"""
        patterns = self.KEYWORD_PATTERNS.get(pattern_type, [])
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        return False

    def _detect_intent(self, text: str) -> list[str]:
        """检测用户意图"""
        intents = []
        for pattern_type in self.KEYWORD_PATTERNS:
            if self._match_keyword(text, pattern_type):
                intents.append(pattern_type)
        return intents

    def _get_mood_prefix(self, mood: str, intensity: float) -> str:
        """根据情绪状态获取前缀"""
        prefixes = self.MOOD_PREFIXES.get(mood, self.MOOD_PREFIXES["neutral"])
        # 高强度时选择更强烈的表情
        if intensity > 0.7 and len(prefixes) > 2:
            return random.choice(prefixes[-2:])
        return random.choice(prefixes)

    def _get_relation_prefix(self, relation: str) -> str:
        """根据关系获取前缀"""
        return self.RELATION_PREFIXES.get(relation, "")

    def _get_fatigue_prefix(self, energy: float) -> str:
        """根据疲劳度获取前缀"""
        for (min_e, max_e), prefixes in self.FATIGUE_PREFIXES.items():
            if min_e <= energy <= max_e:
                return random.choice(prefixes)
        return ""

    def _select_template(self, intents: list[str]) -> Optional[str]:
        """根据意图选择模板"""
        # 优先级处理
        priority_mapping = {
            "greeting": self.GREETING_TEMPLATES,
            "goodbye": self.GOODBYE_TEMPLATES,
            "compliment": self.COMPLIMENT_TEMPLATES,
            "emotion_happy": self.POSITIVE_RESPONSE_TEMPLATES,
            "emotion_sad": self.NEGATIVE_RESPONSE_TEMPLATES,
            "emotion_angry": self.NEGATIVE_RESPONSE_TEMPLATES,
            "emotion_excited": self.POSITIVE_RESPONSE_TEMPLATES,
            "positive": self.POSITIVE_RESPONSE_TEMPLATES,
            "negative": self.NEGATIVE_RESPONSE_TEMPLATES,
            "question": self.QUESTION_TEMPLATES,
            "curiosity": self.CURIOSITY_TEMPLATES,
        }

        # 按优先级选择
        for intent in intents:
            if intent in priority_mapping:
                templates = priority_mapping[intent]
                if templates:
                    return random.choice(templates)

        return None

    def _build_response(
        self,
        template: str,
        mood: str,
        mood_intensity: float,
        relation: str,
        energy: float,
        intimacy: float,
    ) -> str:
        """构建完整回复"""
        parts = []

        # 1. 疲劳前缀（低能量时）
        if energy < 0.6:
            fatigue_prefix = self._get_fatigue_prefix(energy)
            if fatigue_prefix:
                parts.append(fatigue_prefix)

        # 2. 情绪前缀
        mood_prefix = self._get_mood_prefix(mood, mood_intensity)
        if mood_prefix:
            parts.append(mood_prefix)

        # 3. 关系前缀（高亲密度时更友好）
        if intimacy > 0.6:
            relation_prefix = self._get_relation_prefix(relation)
            if relation_prefix:
                parts.append(relation_prefix)

        # 4. 主体内容
        parts.append(template)

        # 5. 随机补充（根据亲密度）
        if intimacy > 0.7 and random.random() > 0.5:
            extras = [
                "你想聊什么？",
                "最近怎么样？",
                "有什么事吗？",
                "...还有呢？",
            ]
            parts.append(random.choice(extras))
        elif intimacy < 0.3 and random.random() > 0.7:
            extras = ["...", "哦。", "嗯。"]
            parts.append(random.choice(extras))

        return "".join(parts)

    def generate(self, context: GenerationContext) -> GenerationResult:
        """生成回复"""
        user_message = context.user_message
        mood = context.current_mood
        mood_intensity = context.mood_intensity
        relation = context.relationship
        energy = context.energy
        intimacy = context.intimacy

        # 1. 检测用户意图
        intents = self._detect_intent(user_message)

        # 2. 选择回复模板
        template = self._select_template(intents)
        if template is None:
            # 如果没有匹配，使用默认模板
            template = random.choice(self.DEFAULT_TEMPLATES)

        # 3. 构建回复
        response = self._build_response(
            template=template,
            mood=mood,
            mood_intensity=mood_intensity,
            relation=relation,
            energy=energy,
            intimacy=intimacy,
        )

        # 4. 添加随机变化
        if random.random() > 0.7:
            variations = ["", "呀", "呢", "哦", "～"]
            suffix = random.choice(variations)
            if response and not response.endswith(suffix) and suffix:
                response = response.rstrip("。！？") + suffix

        return GenerationResult(
            text=response,
            generator_type=self.type,
            response_time_ms=0,  # 同步调用时会更新
            success=True,
            extra={
                "intents_detected": intents,
                "template_used": template,
                "mood": mood,
                "relation": relation,
            },
        )

    @property
    def is_available(self) -> bool:
        """规则生成器始终可用"""
        return True

    @property
    def description(self) -> str:
        return "规则引擎（零依赖，本地运行）"
