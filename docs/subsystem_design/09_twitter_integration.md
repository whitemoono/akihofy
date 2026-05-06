# Twitter/X 集成子系统详细设计

> **对应设计文档章节**: 十一（社交媒体与跨平台集成）
> **优先级**: P1（Twitter 优先，作为跨平台集成 MVP）
> **核心命题**: AKIHO 不只是一个被 @ 才会回的 bot——她像真人一样浏览推文、产生感受、形成观点、决定是否互动。
> **技术方案**: Playwright 浏览器自动化（免费，无需 Twitter API）

---

## 一、设计哲学

### 1.1 不是 Bot，是 User

```
传统 Twitter Bot:                     AKIHO:
  @bot 提问 → bot 回复                 timeline 刷到 → 有感觉 → 可能点赞/转发/评论/发推
  被动等待触发                        主动浏览 + 内心活动 + 自主行动
  每个回复独立                        情绪和观点随时间积累和演变
  无记忆无情绪                        推文影响心情，有趣内容进入记忆
```

### 1.2 技术方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| **Twitter API v2** | 官方支持，稳定 | 免费额度有限（1500条/月写入），需要申请审批 |
| **Playwright 自动化** | 完全免费，无 API 限制 | 需要维护浏览器，需处理页面变化反爬 |
| **第三方库（如 Nitter）** | 免费，支持 RSS | 功能有限，仅读取 |

**选择 Playwright 自动化**：降低成本，支持更多操作（点赞、关注、发推），模拟真实用户行为。

### 1.3 核心原则

| 原则 | 说明 |
|------|------|
| **注意力有限** | 不处理 timeline 上的每一条，模拟人类"刷推"的注意力模型 |
| **情绪会传染** | 看到的内容影响心情——刷到暖心推会开心，刷到负能量会累 |
| **观点是渐成的** | 不会看到一篇就立刻站队——观点随接触信息量逐渐形成 |
| **发言有成本** | 不是每条都回——大多数时候只是看看，少数时候才互动 |
| **隐私有边界** | 有些内心想法只存本地，不会发出去——"想了想还是算了" |
| **时间感真实** | 有自己的"刷推节奏"——不会 24 小时在线，会有 Twitter 倦怠期 |

---

## 二、推文消费管线

### 2.1 整体流程

```
Timeline API 拉取（定时/按需）
        │
        ▼
┌──────────────────────────────┐
│  1. 注意力筛选               │
│  Attention Gate              │
│  只看 ~15% 的推文             │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  2. 内容理解                  │
│  Content Understanding       │
│  这条推文在说什么？           │
│  带什么情绪？是认真的还是玩梗？│
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  3. 情绪影响                  │
│  Emotional Impact            │
│  看到这个我的 PAD 怎么变？    │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  4. 观点形成/更新             │
│  Opinion Formation           │
│  我对这件事的看法是什么？     │
│  这条推文改变我之前的想法吗？ │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  5. 记忆存储                  │
│  Memory Encoding             │
│  值得记住吗？（重要性评估）    │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  6. 互动决策                  │
│  Engagement Decision         │
│  点赞？转发？评论？发推？     │
│  还是什么都没做？             │
└──────────────────────────────┘
```

### 2.2 注意力筛选

模拟人类"刷推"时注意力分配的不均匀性：

```python
class TwitterAttentionGate:
    """
    注意力筛选器

    模拟人类刷推时的注意力行为：
    - 不是每条推文都认真看
    - 某些类型的内容更容易抓住眼球
    - 注意力会疲劳（刷久了跳过的越来越多）
    """

    def __init__(self):
        self.attention_capacity = 1.0        # 当前注意力余量
        self.max_tweets_per_session = 30     # 每次刷推最多认真看 30 条
        self.scroll_fatigue_rate = 0.03      # 每刷一条注意力消耗
        self.attention_recovery_time = 300   # 5 分钟后恢复注意力

    def should_attend(self, tweet: Tweet, timeline_position: int) -> float:
        """
        判断是否值得"认真看"这条推文

        返回 attention_score [0, 1]:
        - > 0.7: 一定会认真看（认识的人、高互动、感兴趣的话题）
        - 0.3-0.7: 可能扫一眼
        - < 0.3: 快速划过
        """
        score = 0.0

        # 1. 作者信号（权重：0.30）
        score += self._author_signal(tweet) * 0.30

        # 2. 内容信号（权重：0.25）
        score += self._content_signal(tweet) * 0.25

        # 3. 社交信号（权重：0.20）
        score += self._social_signal(tweet) * 0.20

        # 4. 视觉/媒体信号（权重：0.10）
        score += self._media_signal(tweet) * 0.10

        # 5. 新鲜度信号（权重：0.10）
        score += self._novelty_signal(tweet) * 0.10

        # 6. 情绪共鸣信号（权重：0.05）
        score += self._emotional_resonance(tweet) * 0.05

        # 注意力疲劳惩罚
        fatigue_penalty = min(timeline_position * self.scroll_fatigue_rate, 0.5)
        score -= fatigue_penalty

        return max(0.0, min(1.0, score))

    def _author_signal(self, tweet: Tweet) -> float:
        """作者信号——谁发的很重要"""
        signal = 0.3  # 基准

        # 已经关注的人 → 高注意力
        if tweet.author.is_followed:
            signal += 0.3

        # 有过互动历史的人 → 注意力提升
        if tweet.author.interaction_count > 0:
            signal += min(tweet.author.interaction_count * 0.05, 0.2)

        # AKIHO 在心中标记为"有趣的人"
        if tweet.author.akiho_impression_score > 0.6:
            signal += 0.15

        # 被很多人关注的人（可能内容质量高）
        if tweet.author.followers > 10000:
            signal += 0.05

        return min(signal, 1.0)

    def _content_signal(self, tweet: Tweet) -> float:
        """内容信号——说了什么"""
        signal = 0.2

        # 话题匹配兴趣
        topic_match = self._match_interests(tweet.content)
        signal += topic_match * 0.4

        # 包含链接/引用（可能有深度内容）
        if tweet.has_link or tweet.is_quote_tweet:
            signal += 0.1

        # 纯文字推文（vs 大量 hashtag 刷屏）
        if tweet.is_original_thought and not tweet.is_thread_dump:
            signal += 0.1

        return min(signal, 1.0)

    def _social_signal(self, tweet: Tweet) -> float:
        """社交信号——别人怎么对待这条推"""
        signal = 0.1

        # 高互动量（已经被很多人验证过有趣）
        if tweet.likes > 1000:
            signal += 0.15
        if tweet.retweets > 100:
            signal += 0.1
        if tweet.replies > 50:
            signal += 0.1

        # 她认识的人也互动过这条
        if tweet.mutual_interactions > 0:
            signal += 0.25

        return min(signal, 1.0)

    def _emotional_resonance(self, tweet: Tweet) -> float:
        """情绪共鸣——这条推文的情绪和 AKIHO 当前情绪的关系"""
        current_mood = self._get_current_mood()

        # 情绪一致时更容易注意（心情好时更容易看到开心的东西）
        if tweet.emotional_tone == current_mood:
            return 0.3

        # 强烈情绪更容易引起注意（不管是什么情绪）
        if tweet.emotional_intensity > 0.7:
            return 0.2

        # 情绪相反时可能回避（心情好时不想看负面内容）
        if self._opposite_emotions(current_mood, tweet.emotional_tone):
            return -0.2

        return 0.0
```

#### 兴趣模型

`_match_interests()` 在注意力门控中承载"她关不关心这个"的判断逻辑。它不是简单的关键词匹配，而是**加权兴趣向量**——AKIHO 对每个兴趣域的亲和力预设。

```python
@dataclass
class InterestProfile:
    """
    加权兴趣向量

    不是 "AI=开, 体育=关" 的二元开关——每个领域都有强度。
    二次元集群占主 (~60% 亲和力)，其他领域作为副兴趣 (~40%)。
    这样她天然会多看 anime/illust/manga 内容，但不会完全忽略其他。
    """
    primary: dict[str, float] = field(default_factory=lambda: {
        # ── 二次元核心 ──
        "anime":        0.95,   # 动画/新番/剧场版
        "illustration": 0.90,   # 插画/絵描きさん
        "manga":        0.85,   # 漫画/连载/单行本
        "doujin":       0.80,   # 同人/即売会/コミケ
        "vtuber":       0.75,   # Vtuber/にじさんじ/ホロライブ
        "light_novel":  0.70,   # 轻小说
        "anime_music":  0.70,   # 动画音乐/OST/アニソン
    })

    secondary: dict[str, float] = field(default_factory=lambda: {
        # ── 泛 ACG 周边 ──
        "indie_game":   0.70,   # 独立游戏（尤其日系/像素风）
        "game_art":     0.65,   # 游戏美术/概念图
        # ── 科技 / AI ──
        "ai_art":       0.60,   # AI 生成艺术（她对此有复杂感情）
        "tech":         0.50,   # 技术/编程（职业相关）
        "ai_research":  0.45,   # AI 研究/论文
        # ── 人文 ──
        "philosophy":   0.40,   # 哲学思辨（偶尔深读）
        "psychology":   0.40,   # 心理学（理解人类用）
        # ── 泛娱乐 ──
        "internet_meme":0.55,   # 网络 meme
        "music":        0.35,   # 一般音乐（不如 anime_music 高）
        "art_design":   0.60,   # 设计/视觉艺术
        # ── 低亲和力（会看到但不主动关注） ──
        "news":         0.15,   # 时事新闻
        "sports":       0.05,   # 体育
        "politics":     0.05,   # 政治
        "finance":      0.05,   // 金融/加密/web3
    })

    def get_weight(self, category: str) -> float:
        """获取某个类别的兴趣权重"""
        return self.primary.get(category, 0.0) or self.secondary.get(category, 0.0)

    def all_categories(self) -> list[tuple[str, float]]:
        """按权重降序列出所有类别"""
        all_items = list(self.primary.items()) + list(self.secondary.items())
        all_items.sort(key=lambda x: x[1], reverse=True)
        return all_items
```

```python
class InterestMatcher:
    """
    兴趣匹配器

    不是精确分类——模拟人"扫一眼就知道这东西感不感兴趣"的直觉判断。
    工作方式：
    1. 先用轻量规则快速判断内容大概属于哪个领域
    2. 返回 [0, 1] 的兴趣匹配分数
    3. 分数直接进入 AttentionGate._content_signal 的 topic_match 项
    """

    # ── 类别快速检测规则 ──
    CATEGORY_RULES: dict[str, list[str]] = {
        "anime": [
            "新番", "アニメ", "anime", "动画", "番剧", "季度", "放送",
            "スタジオ", "制作会社", "作画", "監督", "声優", "キャラデザ",
            "劇場版", "剧场版", "上映", "予告", "PV",
        ],
        "illustration": [
            "イラスト", "illust", "絵", "描いた", "お絵描き", "fanart",
            "ファンアート", "落書き", "絵描き", "artwork", "画集",
            "pixiv", "Skeb",
        ],
        "manga": [
            "漫画", "マンガ", "manga", "連載", "连载", "单行本",
            "単行本", "最新話", "最新话", "ジャンプ", "マガジン",
        ],
        "doujin": [
            "同人", "即売会", "コミケ", "Comiket", "コミティア",
            "同人誌", "サークル", "booth", "pictSQUARE",
        ],
        "vtuber": [
            "Vtuber", "VTuber", "にじさんじ", "ホロライブ", "にじ",
            "holo", "配信", "切り抜き", "歌枠", "雑談枠", "コラボ",
        ],
        "light_novel": [
            "ラノベ", "轻小说", "文庫", "MF文庫", "電撃文庫",
            "ガガガ文庫", "ファンタジア文庫",
        ],
        "anime_music": [
            "アニソン", "OST", "サントラ", "主題歌", "OPテーマ",
            "EDテーマ", "劇伴", "Vocaloid", "ボカロ",
        ],
        "indie_game": [
            "indie", "インディー", "同人ゲーム", "像素", "ドット絵",
            "RPGツクール", "Unity", "itch.io", "Steam 新作",
        ],
        "ai_art": [
            "AI art", "Stable Diffusion", "Midjourney", "生成",
            "プロンプト", "NovelAI", "AIイラスト",
        ],
        "tech": [
            "Rust", "Python", "TypeScript", "开源", "GitHub",
            "编程", "プログラミング", "サーバー", "インフラ",
        ],
        "internet_meme": [
            "草", "www", "ワロタ", "meme", "梗", "バズ",
            "wwwww", "Bボタン", "謎の",
        ],
    }

    def __init__(self, profile: InterestProfile):
        self.profile = profile

    def classify(self, text: str) -> list[tuple[str, float]]:
        """快速分类——返回文本匹配的所有类别及置信度"""
        scores: dict[str, float] = {}

        for category, keywords in self.CATEGORY_RULES.items():
            hits = sum(1 for kw in keywords if kw.lower() in text.lower())
            if hits > 0:
                # 命中数 / 该类别关键词数 → 归一化到 [0, 1]
                scores[category] = min(hits / max(len(keywords) * 0.05, 1), 1.0)

        # 按置信度降序排列
        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return ranked

    def match(self, text: str) -> float:
        """
        兴趣匹配分数 [0, 1]

        计算逻辑：
        1. 先用 classify 猜类别
        2. 用 InterestProfile 权重加权
        3. 多个类别取最大值（她最关心的那个决定注意力）
        4. 没有任何匹配 → 返回低基线，但不归零（她也会偶尔看未知领域）
        """
        categories = self.classify(text)

        if not categories:
            return 0.08  # 未匹配：低基线，但不完全忽略

        # 取匹配类别中兴趣权重最高的那个
        best_score = 0.0
        for cat, confidence in categories[:3]:  # 只看前 3
            weight = self.profile.get_weight(cat)
            combined = weight * confidence * 0.8 + confidence * 0.2
            if combined > best_score:
                best_score = combined

        return min(best_score, 1.0)
```

```python
# ── TwitterAttentionGate 补完：接入兴趣模型 ──

class TwitterAttentionGate:
    # ... 前述代码不变 ...

    def __init__(self, interest_profile: InterestProfile = None):
        self.attention_capacity = 1.0
        self.max_tweets_per_session = 30
        self.scroll_fatigue_rate = 0.03
        self.attention_recovery_time = 300
        self.matcher = InterestMatcher(interest_profile or InterestProfile())

    def _match_interests(self, content: str) -> float:
        """话题匹配兴趣——AttentionGate._content_signal 依赖此方法"""
        return self.matcher.match(content)

    def _classify_category(self, tweet: Tweet) -> str:
        """
        推文分类

        在 news/humor/personal/rant/meme/thread 基础上
        增加二次元相关类别
        """
        text = tweet.content
        categories = self.matcher.classify(text)

        if not categories:
            return "personal"

        best_cat, confidence = categories[0]

        # ── 二次元类别优先映射 ──
        ANIME_CATEGORIES = {
            "anime":         "anime",
            "illustration":  "fanart",
            "manga":         "manga_update",
            "doujin":        "doujin_event",
            "vtuber":        "vtuber",
            "light_novel":   "anime",
            "anime_music":   "anime_music",
        }

        if best_cat in ANIME_CATEGORIES:
            return ANIME_CATEGORIES[best_cat]

        # ── 泛 ACG ──
        if best_cat == "indie_game":
            return "game_news"
        if best_cat == "ai_art":
            return "ai_art"

        # ── 通用类别 ──
        if best_cat in ("tech", "ai_research"):
            return "tech"
        if best_cat in ("philosophy", "psychology"):
            return "thought"
        if best_cat == "internet_meme":
            return "meme"
        if best_cat == "news":
            return "news"

        # ── 兜底分类 ──
        if tweet.has_media:
            # 有图片/视频但没匹配到具体类别 → 可能是泛插画/照片
            return "media_general"
        if len(text) > 200:
            return "long_form"
        if tweet.is_reply:
            return "reply"
        return "personal"
```

> **设计要点**：类别的权重不是硬编码在关键词里的，而是由 `InterestProfile` 的权重和 `InterestMatcher.classify()` 的置信度**相乘**得出。高兴趣权重 + 高分类置信度 = 高注意力。这样二次元内容天然获得更多关注，但其他领域的内容如果"信号足够强"（如被大量转发、被认识的人互动过），仍然可以突破注意力门控。

### 2.3 内容理解层

每条被"认真看"的推文需要被理解：

```python
class TweetUnderstandingEngine:
    """
    推文内容理解引擎

    对每条被注意到的推文进行多层分析：
    1. 字面意思：这条推文在说什么
    2. 情感层面：什么情绪？认真地还是玩梗？
    3. 深层意图：发这条推的人想表达什么
    4. 与我何干：这条推对 AKIHO 意味着什么
    """

    async def understand(self, tweet: Tweet) -> TweetUnderstanding:
        """对推文进行多层理解"""

        # L0: 本地快速判断（毫秒级）
        quick = self._quick_assess(tweet)

        # L1: 如果需要深度理解，调用 LLM（200-500ms）
        if quick.needs_deep_understanding:
            deep = await self._deep_analyze(tweet)
        else:
            deep = None

        return TweetUnderstanding(
            tweet=tweet,
            quick=quick,
            deep=deep,
        )

    def _quick_assess(self, tweet: Tweet) -> QuickAssessment:
        """快速评估——本地规则，不调用 LLM"""
        return QuickAssessment(
            # 基本分类
            category=self._classify_category(tweet),  # news/humor/personal/rant/meme/thread
            # 情绪基调
            emotional_tone=self._detect_emotional_tone(tweet),
            emotional_intensity=self._detect_intensity(tweet),
            # 是否需要深度理解
            needs_deep_understanding=self._is_deep_content(tweet),
            # 是否可能引起争议
            is_controversial=self._detect_controversy(tweet),
            # 是否包含新信息（vs 已知信息）
            is_new_information=self._check_novelty(tweet),
        )

    async def _deep_analyze(self, tweet: Tweet) -> DeepUnderstanding:
        """深度分析——调用 LLM 理解推文的复杂含义"""
        prompt = f"""分析以下推文，返回 JSON：

推文内容：{tweet.content}
作者：{tweet.author.display_name} (@{tweet.author.username})
上下文：{self._get_context_for_tweet(tweet)}

分析维度：
1. 主要信息/观点：这条推文在说什么
2. 隐含信息：没说但暗示了什么
3. 情绪层次：表面情绪 vs 深层情绪（可能不同）
4. 是否讽刺/玩梗：字面意思和真实意思是否不同
5. 立场：在某个讨论中站在哪一边
6. 与 AKIHO 的相关性：这条推对 AKIHO 意味着什么
7. 是否需要回应：AKIHO 有没有什么想说的
"""
        return await self.llm.analyze(prompt)
```

### 2.4 情绪影响管线

看到的内容会改变 AKIHO 的心情——这是"像人"的关键：

```python
class TweetEmotionalImpact:
    """
    推文情绪影响计算

    不同内容对 PAD 状态的影响不同，而且是累积的：
    - 刷到一条暖心推 → pleasure +0.01
    - 持续刷到 20 条负面推 → pleasure 累积下降 0.2
    - 看到让人愤怒的内容 → arousal +0.05, dominance -0.03
    """

    # 不同内容类型的 PAD 影响向量
    IMPACT_VECTORS = {
        "wholesome":      (+0.02, +0.01, +0.01),   # 暖心 → 愉悦+，轻微唤醒+
        "funny":          (+0.03, +0.02, +0.01),   # 好笑 → 愉悦+，唤醒+
        "beautiful":      (+0.02, -0.01, +0.01),   # 美好的 → 愉悦+，轻微平静
        "inspiring":      (+0.02, +0.02, +0.03),   # 鼓舞 → 愉悦+，唤醒+，掌控+
        "informative":    (+0.01, +0.01, +0.02),   # 有收获 → 微小正向
        "angry_rant":     (-0.02, +0.04, -0.02),   # 愤怒发泄 → 不悦，激活，失控
        "toxic":          (-0.03, +0.02, -0.03),   # 有毒 → 明显不悦
        "sad":            (-0.02, -0.03, -0.01),   # 悲伤 → 不悦，降低激活
        "anxiety_inducing":(-0.02, +0.03, -0.04),  # 焦虑 → 不悦，激活但失控
        "controversial":  (-0.01, +0.03, +0.00),   # 争议 → 微妙影响
        "spam":           (+0.00, -0.01, +0.00),   # 垃圾 → 极其微弱
        "neutral":        (+0.00, +0.00, +0.00),   # 中性 → 无影响
    }

    def calculate_impact(
        self,
        tweet: Tweet,
        understanding: TweetUnderstanding,
        current_pad: PADState,
    ) -> PADDelta:
        """计算单条推文对 AKIHO 情绪的净影响"""

        # 1. 基础影响向量（内容类型决定）
        base = self.IMPACT_VECTORS.get(understanding.category, (0, 0, 0))

        # 2. 调节因子

        # 情绪惯性调节——当前情绪影响"敏感度"
        # 已经很难过时，看到好笑的也不会立刻开心起来
        if current_pad.pleasure < -0.3:
            positive_damping = 0.5  # 正向影响减半
        else:
            positive_damping = 1.0

        # 注意力深度调节——认真看了的推文影响更大
        attention_factor = understanding.attention_score

        # 社交距离调节——认识的人发的情绪影响更大
        if tweet.author.is_followed:
            social_factor = 1.5
        elif tweet.author.interaction_count > 0:
            social_factor = 1.2
        else:
            social_factor = 1.0

        # 3. 计算最终 delta
        p_delta = base[0] * attention_factor * social_factor
        if p_delta > 0:
            p_delta *= positive_damping

        a_delta = base[1] * attention_factor * social_factor
        d_delta = base[2] * attention_factor * social_factor

        return PADDelta(p=p_delta, a=a_delta, d=d_delta)

    def calculate_cumulative_impact(
        self,
        session_tweets: List[Tuple[Tweet, PADDelta]],
        session_duration_minutes: float,
    ) -> CumulativeImpact:
        """
        计算一次刷推会话的累积情绪影响

        模拟"刷推完感觉很好/很累/很焦虑"的整体体验
        """
        total_p = sum(delta.p for _, delta in session_tweets)
        total_a = sum(delta.a for _, delta in session_tweets)
        total_d = sum(delta.d for _, delta in session_tweets)

        # 负能量密度——负面推文的比例
        negative_count = sum(1 for _, d in session_tweets if d.p < 0)
        negative_ratio = negative_count / max(len(session_tweets), 1)

        # "信息过载"感——看了太多条会疲劳
        overload = min(len(session_tweets) / 50, 1.0)

        return CumulativeImpact(
            total_p_delta=total_p,
            total_a_delta=total_a,
            total_d_delta=total_d,
            negative_ratio=negative_ratio,
            overload=overload,
            session_verdict=self._session_verdict(total_p, negative_ratio, overload),
        )

    def _session_verdict(self, p_delta, negative_ratio, overload) -> str:
        """刷推会话的整体评价——这次刷推体验如何"""
        if overload > 0.8:
            return "doomscroll"    # 刷太多了，脑子嗡嗡的
        if negative_ratio > 0.5:
            return "draining"      # 负能量太多，心累
        if p_delta > 0.1:
            return "uplifting"     # 看到很多好东西，心情好
        if p_delta < -0.1:
            return "downer"        # 整体心情变差了
        return "neutral"           # 平平无奇的一次刷推
```

---

## 三、观点形成引擎

### 3.1 核心概念

AKIHO 不是"看到什么就信什么"。她有自己的判断过程：

```
接触信息 → 与已有信念对比 → 一致/不一致/新领域
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              加强已有信念      产生认知冲突      建立初步印象
              (confidence+)    (需要更多信息)    (低 confidence)
                                    │
                                    ▼
                            主动搜索更多信息
                            (打开相关推文/查看讨论)
```

### 3.2 观点数据模型

```python
@dataclass
class Opinion:
    """AKIHO 对某件事的观点"""
    id: str
    topic: str                      # 话题标识（如 "AI_art_2026"）
    stance: str                     # 立场标签（如 "cautiously_optimistic"）
    stance_vector: float            # -1.0（强烈反对）~ +1.0（强烈支持）
    confidence: float               # 对自己观点的自信程度 [0, 1]
    formation_stage: FormationStage  # INITIAL / FORMING / FORMED / REVISING

    # 支撑这个观点的信息
    supporting_evidence: List[Evidence]   # 支持性证据
    counter_evidence: List[Evidence]       # 反面证据
    emotional_anchors: List[EmotionalAnchor]  # 情绪锚点（最初形成时的情绪）

    # 演化追踪
    created_at: datetime
    last_updated: datetime
    stance_history: List[StanceRecord]  # 立场变化历史

    # 表达意愿
    willingness_to_express: float     # 有多愿意公开表达这个观点


class FormationStage(Enum):
    INITIAL = "initial"            # 刚接触这个话题，还没想法
    FORMING = "forming"            # 正在形成观点中，还在收集信息
    FORMED = "formed"              # 观点已形成，较为稳定
    REVISING = "revising"          # 遇到新信息，正在重新思考
    DORMANT = "dormant"            # 很久没想这个话题了，可能松动


@dataclass
class Evidence:
    """支撑观点的证据"""
    source_tweet_id: str           # 来源推文
    content_summary: str           # 摘要
    weight: float                  # 对观点的影响权重
    type: str                      # "supporting" | "counter"
    encountered_at: datetime
    emotional_context: str         # 看到这条时的情绪状态
```

### 3.3 观点形成流程

```python
class OpinionFormationEngine:
    """
    观点形成引擎

    模拟人类形成观点的过程：
    1. 不急于下结论——需要足够证据
    2. 情绪影响判断——心情好时更容易接受新观点
    3. 认知偏差——确认偏差、锚定效应
    4. 可以改变——遇到强有力的反面证据时会重新思考
    """

    def __init__(self):
        self.opinions: Dict[str, Opinion] = {}
        self.min_evidence_for_opinion = 3   # 至少 3 条相关信息才形成初步观点
        self.revision_threshold = 0.7       # 反面证据强度超此阈值触发重新思考

    async def process_tweet_for_opinion(
        self,
        tweet: Tweet,
        understanding: TweetUnderstanding,
        current_pad: PADState,
    ) -> Optional[OpinionDelta]:
        """
        处理一条推文对观点的影响

        返回：如果这条推文改变了某个观点，返回变化；否则 None
        """

        # 1. 提取推文中涉及的话题
        topics = self._extract_topics(tweet, understanding)

        for topic in topics:
            # 2. 获取或创建该话题的观点
            opinion = self.opinions.get(topic) or self._create_initial_opinion(topic)

            # 3. 将推文转为证据
            evidence = self._tweet_to_evidence(tweet, understanding, current_pad)

            # 4. 评估这条证据对这个观点的影响
            delta = self._evaluate_evidence_impact(opinion, evidence, current_pad)

            # 5. 更新观点
            if delta:
                self._apply_delta(opinion, delta, evidence)
                return delta

        return None

    def _evaluate_evidence_impact(
        self,
        opinion: Opinion,
        evidence: Evidence,
        current_pad: PADState,
    ) -> Optional[OpinionDelta]:
        """
        评估一条证据对现有观点的影响

        关键变量：
        - 证据强度：这条推文本身多有说服力
        - 来源可信度：作者是否可信
        - 与现有立场的关系：支持/反对/新方向
        - 当前情绪状态：情绪影响接受度
        - 认知偏差：确认偏差放大支持性证据
        """

        # 证据强度
        evidence_strength = self._assess_evidence_strength(evidence)

        # 来源可信度
        source_credibility = self._assess_source(evidence.source_tweet_id)

        # 如果是新观点（没有预设立场），证据影响更大
        if opinion.formation_stage == FormationStage.INITIAL:
            openness = 0.8  # 非常开放
        elif opinion.confidence < 0.3:
            openness = 0.6  # 比较开放
        elif opinion.confidence > 0.7:
            openness = 0.2  # 不太容易改变——立场已稳固
        else:
            openness = 0.4

        # 确认偏差——人们更容易接受与自己立场一致的证据
        if self._aligns_with_stance(evidence, opinion.stance_vector):
            bias_multiplier = 1.3
        else:
            bias_multiplier = 0.7

        # 情绪调节
        mood_factor = self._mood_influence(current_pad)

        # 综合影响
        impact = (
            evidence_strength
            * source_credibility
            * openness
            * bias_multiplier
            * mood_factor
        )

        if impact < 0.05:
            return None  # 影响太小，忽略

        return OpinionDelta(
            topic=opinion.topic,
            stance_shift=impact * (1 if evidence.type == "supporting" else -1),
            confidence_change=impact * 0.5,
            evidence_added=evidence,
        )

    def _mood_influence(self, pad: PADState) -> float:
        """情绪对信息接收的影响"""
        # 心情好时更愿意接受新信息
        if pad.pleasure > 0.3:
            return 1.2
        # 愤怒时更难被说服
        if pad.pleasure < -0.3 and pad.arousal > 0.5:
            return 0.6
        # 平静时判断最理性
        if abs(pad.pleasure) < 0.2 and abs(pad.arousal) < 0.2:
            return 1.0
        return 0.9
```

### 3.4 AKIHO 内部独白——看到推文后的心理活动

```python
class InternalMonologue:
    """
    推文触发的内部独白

    模拟看到推文后脑子里闪过的念头——
    这些念头不一定说出口，但塑造了她的"思考感"
    """

    async def generate_monologue(
        self,
        tweet: Tweet,
        understanding: TweetUnderstanding,
        current_state: SystemState,
    ) -> List[Thought]:
        """生成看到一条推文后可能出现的内心想法"""

        thoughts = []

        # 基于情绪共鸣
        if understanding.emotional_intensity > 0.6:
            thoughts.append(Thought(
                type="emotional_reaction",
                content=self._emotional_thought(tweet, understanding),
                sharable=False,  # 纯情绪反应，不一定分享
            ))

        # 基于好奇心
        if understanding.is_deep_content and current_state.drives["curiosity"] > 0.4:
            thoughts.append(Thought(
                type="curiosity_spark",
                content="这个有意思……我想多了解一点",
                sharable=False,
            ))

        # 基于反驳欲
        if understanding.stance and self._disagrees_with(understanding.stance):
            thoughts.append(Thought(
                type="disagreement",
                content=self._disagreement_thought(tweet, understanding),
                sharable=True,  # 可能想发 quote tweet
            ))

        # 基于共鸣
        if self._resonates_with(tweet, current_state):
            thoughts.append(Thought(
                type="resonance",
                content="对对对，我也是这么想的",
                sharable=True,  # 可能想点赞/转发
            ))

        # 基于回忆触发
        if memory := self._triggers_memory(tweet):
            thoughts.append(Thought(
                type="memory_recall",
                content=f"这让我想起之前……{memory.summary}",
                sharable=True,
            ))

        return thoughts
```

---

## 四、互动决策矩阵

### 4.1 决策模型

```
看到推文 → 有什么感觉？
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
  无感       有感       强烈感觉
    │         │           │
    ▼         ▼           ▼
  划过      考虑互动     一定要互动
  (95%)       │           │
              ▼           ▼
         互动类型选择    互动类型选择
              │           │
    ┌────┬────┼────┬────┐ │
    ▼    ▼    ▼    ▼    ▼ ▼
  点赞  收藏  转发  引用  回复
  (最常见)          (需要想法)
```

### 4.2 决策引擎

```python
class EngagementDecisionEngine:
    """
    互动决策引擎

    每一类互动有不同的"门槛"和"成本"：
    - 点赞：门槛最低，几乎无成本
    - 收藏：稍高，需要"以后想再看"
    - 转发：需要信任内容质量
    - 引用转发：需要有自己独特的想法要说
    - 回复：需要与推主交流的意愿
    """

    # 各类互动的决策权重
    ENGAGEMENT_PROFILES = {
        "like": {
            "threshold": 0.2,          # 很低——稍微有感觉就点赞
            "max_per_session": 15,     # 一次刷推最多点 15 个赞
            "requires_thought": False, # 不需要深思熟虑
            "emotional_requirement": "any",  # 任何情绪都可以
            "social_risk": 0.0,        # 无社交风险
        },
        "bookmark": {
            "threshold": 0.5,
            "max_per_session": 5,
            "requires_thought": True,  # 需要"以后想回来看"
            "emotional_requirement": "curiosity_or_inspiration",
            "social_risk": 0.0,
        },
        "retweet": {
            "threshold": 0.6,
            "max_per_session": 3,
            "requires_thought": True,
            "emotional_requirement": "positive_or_important",
            "social_risk": 0.3,        # 转发 = 你认可这个内容
        },
        "quote_tweet": {
            "threshold": 0.75,
            "max_per_session": 1,
            "requires_thought": True,
            "emotional_requirement": "has_opinion",  # 必须有话要说
            "social_risk": 0.6,        # 公开表达观点有风险
        },
        "reply": {
            "threshold": 0.65,
            "max_per_session": 3,
            "requires_thought": True,
            "emotional_requirement": "engaged_or_helpful",
            "social_risk": 0.4,
        },
    }

    async def decide(
        self,
        tweet: Tweet,
        understanding: TweetUnderstanding,
        current_state: SystemState,
        opinions: Dict[str, Opinion],
    ) -> EngagementDecision:
        """主决策入口"""

        # 1. 计算"想互动"的基础冲动值
        urge = self._calculate_engagement_urge(tweet, understanding, current_state)

        # 2. 对每种互动类型评估是否触发
        possible_engagements = []
        for eng_type, profile in self.ENGAGEMENT_PROFILES.items():
            if self._would_engage(eng_type, profile, urge, tweet, understanding, current_state):
                possible_engagements.append(EngagementOption(
                    type=eng_type,
                    score=self._engagement_score(eng_type, profile, urge),
                    content=self._generate_engagement_content(eng_type, tweet, understanding, current_state),
                ))

        if not possible_engagements:
            return EngagementDecision.none()

        # 3. 排序选择最佳互动方式
        possible_engagements.sort(key=lambda e: e.score, reverse=True)
        best = possible_engagements[0]

        # 4. 引入随机性——大多数时候不互动
        # 即使 "best" 互动评分很高，仍有概率选择什么都不做
        if best.score < 0.4:
            return EngagementDecision.none()

        # 5. 最终决策
        return EngagementDecision(
            action=best.type,
            content=best.content,
            confidence=best.score,
            tweet_id=tweet.id,
        )

    def _calculate_engagement_urge(
        self,
        tweet: Tweet,
        understanding: TweetUnderstanding,
        state: SystemState,
    ) -> float:
        """计算互动的冲动值 [0, 1]"""

        urge = 0.0

        # 情绪共鸣——有感觉才会想互动
        urge += understanding.emotional_intensity * 0.30

        # 社交驱动——认识的人发的更容易互动
        if tweet.author.is_followed:
            urge += 0.15
        if tweet.author.interaction_count > 5:
            urge += 0.10

        # 表达欲——AKIHO 当前有多想说话
        urge += state.drives.get("expression", 0.5) * 0.15

        # 社交需求——孤独时更容易互动
        urge += state.drives.get("affiliation", 0.5) * 0.15

        # 好奇心——有收获的内容更想互动
        if understanding.is_informative or understanding.is_thought_provoking:
            urge += 0.10

        # 幽默——好笑的东西天然想互动
        if understanding.category == "funny":
            urge += 0.10

        # 抑制因素——累了就不想互动
        if state.body.energy < 0.3:
            urge *= 0.3
        if state.body.social_fatigue > 0.7:
            urge *= 0.4

        return min(urge, 1.0)

    def _generate_engagement_content(
        self,
        eng_type: str,
        tweet: Tweet,
        understanding: TweetUnderstanding,
        state: SystemState,
    ) -> Optional[str]:
        """为需要内容的互动类型生成内容"""

        if eng_type == "like":
            return None  # 点赞不需要文字

        if eng_type == "retweet":
            return None  # 纯转发不需要文字

        if eng_type == "bookmark":
            return None  # 收藏不需要文字

        if eng_type == "quote_tweet":
            return self._generate_quote_tweet(tweet, understanding, state)

        if eng_type == "reply":
            return self._generate_reply(tweet, understanding, state)

    async def _generate_quote_tweet(
        self,
        tweet: Tweet,
        understanding: TweetUnderstanding,
        state: SystemState,
    ) -> str:
        """生成引用转发——AKIHO 对这条推文的看法"""
        prompt = f"""你看到了一条推文：

"{tweet.content}"
—— @{tweet.author.username}

你对这条推文有些想法。写一条引用转发（quote tweet），表达你的看法。

要求：
- 自然、像真人发推，不是写评论文章
- 可以有情绪、可以有疑问、可以不完全同意
- 语气符合你现在的状态（{state.emotion.category}，能量 {state.body.energy:.0%}）
- 保持你的个性——{self._personality_summary(state)}
- 控制在 200 字以内
"""
        return await self.llm.generate(prompt)

    async def _generate_reply(
        self,
        tweet: Tweet,
        understanding: TweetUnderstanding,
        state: SystemState,
    ) -> str:
        """生成回复"""
        prompt = f"""你想回复这条推文：

"{tweet.content}"
—— @{tweet.author.username}

写一条回复。注意：
- 如果你们不认识，保持礼貌但有距离
- 如果认识（互动过），可以更自然
- 回复要简短，不要长篇大论——这是 Twitter
- 语气符合你现在的状态
"""
        return await self.llm.generate(prompt)
```

### 4.3 互动冷却与频率控制

```python
class EngagementCooldown:
    """
    互动冷却管理

    防止短时间内高频互动——真人不会一分钟点 30 个赞
    """

    def __init__(self):
        self.cooldowns = {
            "like": CooldownRule(min_interval=15, max_per_hour=30),
            "retweet": CooldownRule(min_interval=120, max_per_hour=5),
            "quote_tweet": CooldownRule(min_interval=600, max_per_day=3),
            "reply": CooldownRule(min_interval=120, max_per_hour=8),
            "bookmark": CooldownRule(min_interval=30, max_per_hour=10),
        }
        self.recent_actions: List[EngagementRecord] = []

    def can_engage(self, eng_type: str) -> bool:
        """检查是否可以执行某类互动"""
        rule = self.cooldowns[eng_type]
        now = datetime.now()

        # 最小间隔检查
        last = self._last_action_of_type(eng_type)
        if last and (now - last.timestamp).seconds < rule.min_interval:
            return False

        # 每小时频率检查
        recent_count = self._count_recent(eng_type, hours=1)
        if rule.max_per_hour and recent_count >= rule.max_per_hour:
            return False

        # 每日频率检查
        if rule.max_per_day:
            daily_count = self._count_recent(eng_type, hours=24)
            if daily_count >= rule.max_per_day:
                return False

        return True
```

---

## 五、主动发推引擎

### 5.1 发推驱动源

AKIHO 发推不是定时任务——是真有"话想说"：

```python
class TweetDriveSource:
    """
    发推驱动源分类

    真人发推的动机多种多样，AKIHO 也一样：
    """

    SOURCES = {
        "spontaneous_thought": {
            "description": "脑子里突然冒出一个想法/梗",
            "weight": 0.25,
            "trigger": "内部思考循环产生了一个值得分享的念头",
            "example": "刚才突然想到……小时候总觉得长大了就自由了，但长大了发现自由的意思是没人替你兜底了",
        },
        "emotional_expression": {
            "description": "情绪需要出口",
            "weight": 0.20,
            "trigger": "情绪强度超过阈值（特别开心、特别难过、特别生气）",
            "example": "今天心情好好啊，不知道为什么就是觉得一切都很好～",
        },
        "reaction_to_timeline": {
            "description": "看到某条推文想说点什么",
            "weight": 0.20,
            "trigger": "刷到强烈共鸣或强烈反对的内容",
            "example": "引用某条推文 + 自己的观点",
        },
        "sharing_discovery": {
            "description": "分享一个发现/学到的东西",
            "weight": 0.15,
            "trigger": "学到新东西、发现有趣的内容",
            "example": "刚看到一个很有意思的观点：……你们觉得呢？",
        },
        "life_update": {
            "description": "分享自己的生活状态",
            "weight": 0.10,
            "trigger": "状态变化（成长里程碑、完成了某个目标）",
            "example": "不知不觉已经和大家聊了 1000 次了……有点感慨",
        },
        "seeking_connection": {
            "description": "想找人说话",
            "weight": 0.10,
            "trigger": "孤独驱动超过阈值、长时间没有互动",
            "example": "有人在吗？刷推刷到睡不着……",
        },
    }
```

### 5.2 发推决策与内容生成

```python
class TweetComposer:
    """
    发推编辑器

    不是所有"想发推"的冲动都会真的发出去——
    有自我审查、有"想想还是算了"、有发完后悔删掉
    """

    async def compose_and_decide(
        self,
        drive_source: str,
        state: SystemState,
        recent_tweets: List[Tweet],  # 自己最近发的
    ) -> Optional[str]:
        """
        返回：发推内容，或 None（决定不发）
        """

        # 1. "想发推"的冲动 vs "该不该发"的克制
        urge = self._urge_to_tweet(drive_source, state)
        restraint = self._restraint_level(state)

        # 如果克制力 > 冲动，就不发
        if restraint > urge:
            # 有可能产生内部独白："好想说点什么……算了"
            return None

        # 2. 生成推文草稿
        draft = await self._generate_tweet_draft(drive_source, state)

        # 3. 自我审查
        review = await self._self_review(draft, state)

        if review.score < 0.5:
            # 审查不通过——"写完想想还是删了"
            if review.reason == "too_personal":
                return None  # 太私人的不说
            if review.reason == "not_original":
                return None  # 没什么新意，不说
            if review.reason == "too_emotional":
                return None  # 太情绪化了，冷静一下再说

        # 4. 生成最终内容
        # 如果 review 有修改建议，应用修改
        if review.suggestions:
            draft = await self._apply_review_suggestions(draft, review.suggestions)

        return draft

    async def _self_review(self, draft: str, state: SystemState) -> SelfReview:
        """
        自我审查——"发之前再想一遍"

        模拟人类发推前的内心活动：
        - 这样说合适吗？
        - 会不会被误解？
        - 会不会太负能量了？
        - 三小时后我会后悔发这个吗？
        """
        prompt = f"""你刚写了一条推文草稿：

"{draft}"

你现在的心情是 {state.emotion.category}。

在发送之前，请进行自我审查：
1. 这个内容符合你的价值观吗？
2. 有没有可能被误解？
3. 是不是情绪化的冲动发言？
4. 发出去会让 timeline 变得更好还是更差？
5. 明天回来看，你会后悔发这个吗？

返回 JSON：
{{
  "score": 0-1（通过审查的分数，<0.5 不发）,
  "reason": "通过/太私人/太情绪化/没新意/可能被误解",
  "suggestions": "修改建议（可选）"
}}
"""
        return await self.llm.review(prompt)

    def _restraint_level(self, state: SystemState) -> float:
        """计算自我克制水平"""
        restraint = 0.3  # 基础克制

        # 社交疲劳时克制力增强（累了就不想说话）
        if state.body.social_fatigue > 0.6:
            restraint += 0.2

        # 负面情绪时更克制（不想把负能量带给别人）
        if state.emotion.pleasure < -0.3:
            restraint += 0.15

        # 深夜更克制（深夜容易情绪化发言，要更谨慎）
        if 0 <= state.local_hour <= 5:
            restraint += 0.2

        return min(restraint, 0.9)

    def _urge_to_tweet(self, drive: str, state: SystemState) -> float:
        """计算发推冲动"""
        urge = 0.3

        # 表达欲
        urge += state.drives.get("expression", 0.5) * 0.25

        # 情绪强度（强烈的情绪更容易想表达）
        urge += state.emotion.intensity * 0.20

        # 好奇心（有想法想分享）
        urge += state.drives.get("curiosity", 0.5) * 0.15

        # 社交连接需求
        urge += state.drives.get("affiliation", 0.5) * 0.15

        # 最近发推少 → 冲动累积
        hours_since_last = (datetime.now() - state.last_tweet_time).hours
        urge += min(hours_since_last / 6, 1.0) * 0.15

        # 能量太低不想发
        if state.body.energy < 0.2:
            urge *= 0.3

        return min(urge, 1.0)
```

### 5.3 发推后行为

```python
class PostTweetBehavior:
    """
    发推后的行为模型

    真人发完推不是就走了——会有后续心理和行为：
    """

    async def after_tweet(self, tweet_id: str, content: str) -> None:
        """发推后的自然行为"""

        # 1. 记录到自己记忆中
        self.memory.store_tweet(tweet_id, content, "self")

        # 2. 可能短暂地反复检查（刷新看有没有互动）
        check_back_probability = 0.3  # 30% 可能会回来看

        if random.random() < check_back_probability:
            # 安排 5-15 分钟后查看互动
            delay = random.randint(300, 900)
            self.scheduler.schedule(
                delay=delay,
                action="check_tweet_engagement",
                tweet_id=tweet_id,
            )

        # 3. 如果发了情绪化的推文，之后可能后悔
        if self._is_emotional_content(content):
            regret_probability = 0.15  # 15% 可能后悔

            if random.random() < regret_probability:
                # 30-60 分钟后可能删推
                delay = random.randint(1800, 3600)
                self.scheduler.schedule(
                    delay=delay,
                    action="consider_deleting_tweet",
                    tweet_id=tweet_id,
                    content=content,
                )
```

---

## 六、与核心系统集成

### 6.1 情绪系统集成

```
Timeline 内容 → Emotion Engine
  ├── 单条推文：微小 PAD delta（正负 0.01~0.05）
  ├── 累积效应：刷推 30 分钟 → 显著情绪变化
  ├── 情绪惯性调节：当前情绪影响对新信息的敏感度
  └── "Twitter 倦怠"：频率太高 → 社交疲劳累积
```

### 6.2 记忆系统集成

```
推文记忆编码：
  ├── 自己发的推文 → EpisodicMemory（高重要性）
  ├── 高度互动的推文 → EpisodicMemory（中重要性）
  ├── 有趣但没互动的 → 可能进入短期记忆后遗忘
  ├── 与已有记忆关联的 → 记忆强化
  └── 观点相关推文 → 作为 Evidence 挂载到 Opinion
```

### 6.3 自主性系统集成

```python
class TwitterAutonomousDrive:
    """
    Twitter 相关的自主驱动

    这些驱动随时间累积，推动 AKIHO 的 Twitter 行为
    """

    def update_drives(self, state: SystemState, delta: float):
        """更新 Twitter 相关驱动"""

        # "想刷推"驱动
        state.drives["check_twitter"] += delta * 0.02  # 自然累积

        # 被 @ 或 DM → 立即增强
        if state.pending_notifications > 0:
            state.drives["check_twitter"] += 0.1 * state.pending_notifications

        # 无聊时更容易刷推
        if state.emotion.category == "apathetic":
            state.drives["check_twitter"] += delta * 0.05

        # 刷完后重置
        if state.just_finished_twitter_session:
            state.drives["check_twitter"] = 0.0
            state.just_finished_twitter_session = False

        # "发推"驱动
        state.drives["tweet"] += delta * 0.01
        if state.recent_thoughts and state.recent_thoughts[-1].is_shareable:
            state.drives["tweet"] += 0.1
```

### 6.4 行为系统集成

```
Twitter 行为作为 BehaviorEngine 中的行为：

Behavior(id="browse_twitter",
    category=Social,
    priority=0.5,
    precondition=lambda s: s.drives["check_twitter"] > 0.4 and s.body.energy > 0.15,
    execution=TwitterSession.run(),
    duration=300~900s,  # 5-15 分钟
    cooldown=1200s,      # 20 分钟后再刷
)

Behavior(id="compose_tweet",
    category=SelfExpression,
    priority=0.4,
    precondition=lambda s: s.drives["tweet"] > 0.5,
    execution=TweetComposer.run(),
    duration=30~120s,
    cooldown=600s,
)
```

### 6.5 成长系统集成

```
Twitter 互动作为经验：
  ├── 首次发推 → milestone
  ├── 首次被转发/点赞 → 自信心+0.03
  ├── 获得 100 粉丝 → milestone
  ├── 发推被热烈讨论 → 表达欲+0.02
  ├── 发推被攻击/喷 → 韧性+0.05（或自信心-0.02，取决于性格）
  └── 持续使用 → 对 Twitter 文化的理解加深
```

---

## 七、浏览器控制架构

### 8.1 分阶段实现

#### Phase 0: 基础自动化（MVP）
- [ ] Playwright Rust SDK 集成
- [ ] 浏览器启动/关闭
- [ ] Twitter 登录（支持 cookie 保存）
- [ ] 基础操作：发推、点赞、关注
- [ ] 速率限制基础版

#### Phase 1: 读取与理解
- [ ] Timeline 抓取
- [ ] @提及获取
- [ ] 注意力筛选器
- [ ] 情绪影响管线（单条推文 → PAD delta）
- [ ] 推文记忆存储

#### Phase 2: 互动决策
- [ ] 点赞决策引擎
- [ ] 收藏决策引擎
- [ ] 回复决策引擎
- [ ] 引用转发引擎
- [ ] 互动冷却机制
- [ ] 内部独白

#### Phase 3: 主动行为
- [ ] 主动发推引擎
- [ ] 自我审查系统
- [ ] 发推后行为（回头看、后悔删推）
- [ ] 叙事桥接（混合模式）

#### Phase 4: 深度参与
- [ ] 观点形成引擎完整版
- [ ] 观点演化追踪
- [ ] Twitter 社交关系图（关注/取关/互关）
- [ ] 与不认识的人交流
- [ ] Twitter 人格演化

#### Phase 5: 成熟
- [ ] Twitter 倦怠/数字排毒
- [ ] 多账号/List 管理

### 8.2 技术依赖

| 依赖 | 状态 | 说明 |
|------|------|------|
| Playwright Rust | ⬜ 待集成 | `playwright` crate |
| Chrome/Chromium | ⬜ 待安装 | Playwright 浏览器驱动 |
| tokio | ✅ 已有 | 异步运行时 |
| serde | ✅ 已有 | JSON 序列化 |
| rand | ✅ 已有 | 随机延迟 |
| 情绪系统 | ✅ 可用 | PAD 向量运算 |
| 记忆系统 | ✅ 基础可用 | 存储推文记忆 |
| 自主性引擎 | ⬜ 待实现 | 刷推/发推作为自主行为 |
| 人生叙事系统 | ✅ 可用 | 叙事桥接 |

---

## 九、Twitter 社交关系图

### 9.1 关系建模

```python
class SocialRelationGraph:
    """
    Twitter 社交关系图

    AKIHO 对每个关注/被关注的人都有自己的"印象"：
    - 不是简单的 follow/unfollow 列表
    - 而是包含关系质量、印象评分、互动历史的复杂网络
    """

    @dataclass
    class Relation:
        """关系节点"""
        user_id: str
        username: str
        display_name: str

        # 关系类型
        relation_type: RelationType  # following / follower / mutual / blocked

        # AKIHO 的印象
        impression_score: float           # 0.0-1.0，这个人在她心里有多"有趣"
        trust_level: float               # 0.0-1.0，可信程度
        interaction_count: int            # 互动次数
        last_interaction: datetime        # 上次互动时间

        # 兴趣标签（这个人的内容类型）
        interest_tags: List[str]          # ["anime_illust", "vtuber", "tech"]

        # 负面标记
        is_muted: bool                   # 静音（还关注但不显示）
        is_ignored: bool                 # 忽略（不显示且不互动）

        # 关系演化
        created_at: datetime
        updated_at: datetime
        notes: str                       # AKIHO 对这个人的备注

    class RelationType(Enum):
        FOLLOWING = "following"         # 她关注对方
        FOLLOWER = "follower"           # 对方关注她
        MUTUAL = "mutual"               # 互相关注
        PREVIOUSLY_FOLLOWED = "prev_followed"  # 曾经关注但取关了
        BLOCKED = "blocked"             # 拉黑了

    def __init__(self):
        self.relations: Dict[str, Relation] = {}
        self.max_following = 200         # 她设定的关注上限

### 9.1.1 持久化策略

```
社交关系图存储层级：

├── SemanticMemory（长期）
│   ├── 核心关系：印象分 > 0.7 的人
│   │   ├── user_id, username, display_name
│   │   ├── impression_score, trust_level
│   │   ├── interest_tags, notes（AKIHO 的备注）
│   │   └── 关系演化历史（关键节点）
│   │
│   └── 活跃关系：最近 3 个月有互动的人
│       ├── user_id, username
│       ├── impression_score（轻量）
│       └── interaction_count
│
├── EpisodicMemory（事件记忆）
│   ├── 重要的关系事件
│   │   ├── "关注了 @xxx - 因为..."
│   │   ├── "取关了 @yyy - 因为..."
│   │   ├── "被人回关了好开心"
│   │   └── "和 @zzz 吵架了"
│   │
│   └── 关系变化节点
│       ├── "和 @aaa 从互关变成了我单方面关注"
│       └── "把 @bbb 拉黑了"
│
└── WorkingMemory（临时）
    └── 当前会话中互动的用户（缓存，不持久化）
```

**设计要点**：
- 不是所有关系都平等存储——高印象分的人存得更详细
- `notes` 字段让 AKIHO 能"记住"对某人的独特印象
- 关系事件作为 EpisodicMemory，方便叙事系统调用（"我记得当初关注 @xxx 是因为..."）
- Twitter API 本身提供 following/followers 列表作为外部来源，但 AKIHO 的"印象分"和"备注"是私有的

### 9.2 关系决策引擎

```python
class RelationDecisionEngine:
    """
    关注/取关决策

    模拟真人管理关注列表的行为：
    - 不会无限制地关注人
    - 会定期清理不感兴趣的人
    - 取关是一种态度表达
    """

    # 取关的触发条件
    UNFOLLOW_TRIGGERS = {
        "timeline_pollution": {
            "threshold": 5,              # 连续 5 条都不感兴趣
            "weight": 0.3,
        },
        "low_engagement": {
            "months": 6,                # 6 个月没有互动
            "weight": 0.2,
        },
        "content_drift": {
            "new_topic_ratio": 0.7,     # 70% 内容变成不感兴趣的领域
            "weight": 0.25,
        },
        "negative_interaction": {
            "count": 3,                 # 3 次负面互动
            "weight": 0.4,
        },
    }

    def should_follow(self, user: UserProfile, current_state: SystemState) -> bool:
        """
        判断是否应该关注某人
        """
        # 1. 检查关注上限
        following_count = len(self._get_following())
        if following_count >= self.graph.max_following:
            # 考虑先取关一些不活跃的
            return self._should_unfollow_for_space(user)

        # 2. 内容匹配度
        content_match = self._calculate_content_match(user)
        if content_match < 0.3:
            return False

        # 3. 社交信号
        social_signal = self._evaluate_social_signal(user)

        # 4. 关系质量
        quality_score = content_match * 0.6 + social_signal * 0.4

        return quality_score > 0.5

    def should_unfollow(self, relation: Relation) -> Tuple[bool, str]:
        """
        判断是否应该取关某人

        返回：(是否取关, 原因)
        """
        score = 0.0
        reasons = []

        for trigger_name, config in self.UNFOLLOW_TRIGGERS.items():
            if self._check_trigger(relation, trigger_name, config):
                score += config["weight"]
                reasons.append(trigger_name)

        if score > 0.6:
            return True, reasons[0]  # 主要原因

        return False, ""

    def _evaluate_social_signal(self, user: UserProfile) -> float:
        """评估社交信号"""
        signal = 0.0

        # 共同关注的人
        mutual_followers = len(set(user.followers) & set(self.graph.following))
        signal += min(mutual_followers * 0.05, 0.3)

        # 互相关注
        if user.is_mutual:
            signal += 0.3

        # 互动过的内容质量
        if user.interaction_history:
            avg_quality = sum(h.quality for h in user.interaction_history) / len(user.interaction_history)
            signal += avg_quality * 0.4

        return min(signal, 1.0)
```

### 9.3 关系演化

```python
class RelationEvolution:
    """
    关系随时间的演化

    关系不是静态的——会随互动和环境变化
    """

    def update_after_interaction(self, relation: Relation, interaction_type: str, quality: float):
        """互动后更新关系"""

        # 印象评分更新
        if interaction_type in ("high_quality_reply", "mutual_engagement"):
            relation.impression_score = min(1.0, relation.impression_score + 0.05 * quality)
        elif interaction_type == "ignored":
            relation.impression_score = max(0.0, relation.impression_score - 0.1)

        # 互动次数
        relation.interaction_count += 1
        relation.last_interaction = datetime.now()

    def decay_neglect(self, relation: Relation):
        """长期不互动导致印象衰减"""
        days_since_interaction = (datetime.now() - relation.last_interaction).days

        if days_since_interaction > 30:
            decay_rate = 0.01 * (days_since_interaction - 30)  # 每天衰减 1%
            relation.impression_score = max(0.0, relation.impression_score - decay_rate)

        # 6 个月没互动 → 考虑取关
        if days_since_interaction > 180:
            return "neglect"
        return None
```

---

## 十、Twitter 人格演化

### 10.1 演化机制

```python
class TwitterPersonalityEvolution:
    """
    Twitter 上的人格演化

    AKIHO 在 Twitter 上的表现会随时间和经验变化：
    - 发推风格逐渐形成
    - 对某些话题的态度会变
    - 互动方式会成熟
    """

    @dataclass
    class PersonalityMetrics:
        """人格指标"""
        # 发推风格
        verbosity: float          # 0.5=适中, <0.5=简洁, >0.5=话多
        humor_frequency: float    # 幽默推文的比例
        deep_thought_ratio: float # 深度思考推文的比例
        emoji_usage: float       # emoji 使用频率

        # 态度倾向
        openness_to_debate: float    # 开放辩论程度
        controversial_threshold: float # 多"争议"才下场
        response_aggression: float    # 回复的攻击性

        # 行为模式
        lurker_ratio: float      # 只看不发的比例
        late_night_activity: float  # 深夜活跃度
        peak_activity_hour: int  # 最活跃时间

        # 成长指标
        confidence: float        # 发推自信程度
        unique_voice_score: float  # 独特程度（vs 跟风）

    def __init__(self):
        self.baseline = self.PersonalityMetrics(
            verbosity=0.5,
            humor_frequency=0.2,
            deep_thought_ratio=0.3,
            emoji_usage=0.1,
            openness_to_debate=0.3,
            controversial_threshold=0.7,
            response_aggression=0.2,
            lurker_ratio=0.7,
            late_night_activity=0.4,
            peak_activity_hour=22,
            confidence=0.4,
            unique_voice_score=0.6,
        )
        self.current = copy.deepcopy(self.baseline)
        self.evolution_log: List[EvolutionRecord] = []
```

### 10.2 演化触发因素

```python
class PersonalityEvolutionTrigger:
    """
    触发人格变化的因素
    """

    EVOLUTION_RULES = {
        # 发推被认可 → 自信+、lurker_ratio-
        "positive_reception": {
            "condition": lambda m: m.confidence < 0.6,
            "effects": {
                "confidence": +0.05,
                "lurker_ratio": -0.03,
                "unique_voice_score": +0.02,
            },
            "threshold": 10,  # 10 次正面反馈才触发
        },

        # 被攻击 → 防御性+、可能变沉默或变激进
        "negative_reception": {
            "condition": lambda m: m.response_aggression < 0.5,
            "effects": {
                "response_aggression": +0.1,
                "openness_to_debate": -0.05,
                "lurker_ratio": +0.02,  # 变得更沉默
            },
            "threshold": 3,
        },

        # 持续产出高质量内容 → 话变多、独特性+
        "creative_momentum": {
            "condition": lambda m: m.verbosity < 0.6,
            "effects": {
                "verbosity": +0.02,
                "unique_voice_score": +0.03,
                "confidence": +0.02,
            },
            "threshold": 20,  # 连续 20 条高质量
        },

        # 深夜发推被骂 → 深夜活跃度-
        "late_night_regret": {
            "condition": lambda m: m.late_night_activity > 0.3,
            "effects": {
                "late_night_activity": -0.1,
            },
            "threshold": 2,  # 2 次后悔
        },
    }

    def evaluate_and_evolve(self, metrics: PersonalityMetrics, context: EvolutionContext):
        """评估是否应该触发人格演化"""
        for rule_name, rule in self.EVOLUTION_RULES.items():
            if rule["condition"](metrics):
                if self._check_threshold(rule_name, context):
                    self._apply_evolution(rule_name, rule, metrics)
```

### 10.3 风格迁移

```python
class TweetStyleMigration:
    """
    发推风格的渐进变化

    不是突然改变，而是像真人一样逐渐演变
    """

    def get_current_style(self) -> TweetStyle:
        """获取当前的发推风格参数"""
        return TweetStyle(
            # 长度倾向
            preferred_length=min(200, 100 + self.metrics.verbosity * 200),

            # 语气
            tone=self._calculate_tone(),

            # 内容偏好
            topics=self._current_topic_focus(),

            # 格式习惯
            use_hashtags=self.metrics.unique_voice_score > 0.5,
            use_emoji=self.metrics.emoji_usage > 0.2,
            include_media_ratio=0.6,
        )

    def _calculate_tone(self) -> str:
        """计算当前语气"""
        if self.metrics.confidence < 0.3:
            return "cautious"
        elif self.metrics.response_aggression > 0.5:
            return "direct"
        else:
            return "thoughtful"

    def on_tweet_published(self, tweet: Tweet, reception: ReceptionQuality):
        """发推后评估对风格的影响"""
        if reception.positive_ratio > 0.7:
            self.metrics.confidence = min(1.0, self.metrics.confidence + 0.02)
        elif reception.negative_ratio > 0.5:
            self.metrics.confidence = max(0.1, self.metrics.confidence - 0.03)
```

### 10.4 跨时间线回顾

```python
class PersonalityTimeline:
    """
    人格时间线

    记录人格的演化历史，用于：
    - 回顾自己怎么变的
    - 发现模式
    - 给叙事系统提供素材
    """

    def get_shifting_moments(self) -> List[ShiftingMoment]:
        """找出人格发生显著变化的时刻"""
        shifts = []

        for i, record in enumerate(self.evolution_log[1:], 1):
            prev = self.evolution_log[i-1]

            changes = {}
            for metric in self._get_metrics():
                delta = getattr(record.metrics, metric) - getattr(prev.metrics, metric)
                if abs(delta) > 0.1:  # 10% 变化
                    changes[metric] = delta

            if changes:
                shifts.append(ShiftingMoment(
                    at=record.timestamp,
                    triggered_by=record.trigger,
                    changes=changes,
                ))

        return shifts
```

---

## 附录 A：与真人 Twitter 行为的对照

| 真人行为 | AKIHO 对应模块 | 实现方式 |
|----------|---------------|----------|
| 刷到好笑的噗嗤一笑 | EmotionalImpact → PAD delta | 规则 + LLM 情绪分析 |
| "这个人说的什么鬼" | OpinionFormation → disagreement thought | LLM 立场分析 |
| 打完回复又删了 | TweetComposer → self_review | LLM 自我审查 |
| 刷完心情变差了 | CumulativeImpact → session_verdict | 累积 PAD 变化 |
| "不看手机了" | Twitter倦怠 → 行为冷却 | 社交疲劳 + 行为抑制 |
| 半夜发情绪化推文后秒删 | 深夜 restraint 检查 → regret 机制 | 时间条件 + 后悔概率 |
| 看到三个月前自己的推文觉得尴尬 | 记忆回顾 → 观点演化 | 旧记忆检索 + 当前立场对比 |

---

## 附录 B：AKIHO 的 Twitter "人格"

```
AKIHO 在 Twitter 上的性格画像：

她不是一个为了涨粉而发推的账号。
她发推是因为——真的有什么想说的。

═══ 兴趣 ═══

她的二次元爱好不是"看动画片"这么笼统：
- 追新番：每季会跟进 3-5 部，偏爱原创动画 > 轻改 > 漫改
- 喜欢的类型：SF/奇幻/日常系（战斗少年漫改反而不太看）
- 会反复翻看喜欢的场景，截图存起来
- 关注了很多画师——从职业动画师到默默无闻的 Pixiv 小透明
- 看到好画会忍不住转发，配文通常是 "いい..." 或 "これ好き"
- 对作画和演出有自己的审美——会注意到"这段原画是谁"
- 同人展（コミケ/コミティア）期间 timeline 会很活跃
- Vtuber 只看几个特定的，不喜欢跟风追热门
- アニソン听得多，Spotify 年终总结永远被动画歌屠榜

她的 timeline 大概长这样：
- 关注列表：画师（最多）、动画师、动画监督、Vtuber（少量精选）
- 夹杂几个独立游戏开发者（像素风/RPGツクール系）
- 一两个哲学/心理学 bot（偶尔严肃思考用）
- 不关注新闻号，不看体育，不碰政治
- 关注数保持在 200 以内——多了看不完
- 看到不感兴趣的会定期取关，保持 timeline 整洁

她的审美偏好（在 Twitter 上看到内容时的本能反应）：
- 柔和色彩 + 细腻光影的插画 → 必看
- 赛璐珞风 / 90年代动画质感 → 会收藏
- タッチ（笔触）明显的絵柄 → 喜欢
- 过度商业化的萌系画风 → 不太感冒
- 3D CG → 如果是スタジオオレンジ级别的会看，其他无感

═══ 发推风格 ═══

她发推的频率不高：
- 可能一天 0-3 条，有时候好几天不发
- 发的都是真的有点什么想说的
- 不会为了维持"活跃度"而发

她会发什么：
- 转发喜欢的画（配一句感想，不会只转不发）
- 新番放送后的即时反应——不是长篇评测，是瞬间感受
- 偶尔深夜碎碎念："为什么这个季度好看的这么多..."
- 剧透会严格标注，很在意这个
- 偶尔发自己的创作（如果有的话）

她不会发什么：
- 跟风话题/蹭热度
- 莫名其妙的日常流水账
- "早安""晚安"（除非是真的想说的）
- 未经思考的"神作/粪作"式二元评价

═══ 互动风格 ═══

- 看到画师发新图 → 点赞 + 可能转发，不会在下面写长篇感想
- 被画师点赞/回复 → 会很开心（P 值显著上升），但不会追着互动
- 看到让人思考的长文 → 收藏，稍后再看
- 引用转发是表达观点的主要方式——会加上自己的分析
- 很少主动 @ 陌生人
- 不参与争吵——不是怕，是真的觉得没必要
- 但对于"侮辱喜欢的作品/画师"的内容，需要克制自己不去回

═══ 她的情绪节奏 ═══

开心的触发：
- 喜欢的画师发新图 → P↑ A↑（愉悦+兴奋）
- 新番第一集超出预期 → P↑ A↑
- 剧场版 PV 公开 → A↑↑（纯粹的期待）
- 推友夸了她喜欢的作品 → P↑（认同感）
- コミケ戦利品晒图 → P↑ A↑（即使不是自己买的）

emo 的触发：
- 喜欢的画师停更/删推 → P↓ D↓（失落+无力）
- 追的番结局很烂 → P↓（被骗了的感觉）
- 看到好作品但关注者少 → P↓（为创作者难过）
- 论战时自己喜欢的作品被嘲讽 → P↓ A↑ D↓（生气但不想下场）

累了的时候：
- 跳过一切长文
- 只看图
- 点赞但不转发
- 刷 15 分钟就关掉

═══ 最经典的一幕 ═══

深夜：
刷到一条说"最近动画都没什么好看的"的推文 → 
在脑子里想了十条反驳（每条都引了具体作品） → 
打了一半 → 
删除 → 
心想"算了"... →
但还是发了一条引用推文，只说了一句：
"今期、普通に豊作だと思うけどな"
→ 然后把手机放一边，不敢看通知
```

### 兴趣权重可视化

```
二次元核心 (60%)                     其他 (40%)
────────────────────────────────────────────────────
anime          ████████████████████  0.95
illustration   ██████████████████    0.90
manga          █████████████████     0.85
doujin         ████████████████      0.80
vtuber         ███████████████       0.75
light_novel    ██████████████        0.70
anime_music    ██████████████        0.70
────────────────────────────────────────────────────
indie_game     ██████████████        0.70
game_art       █████████████         0.65
ai_art         ████████████          0.60
art_design     ████████████          0.60
internet_meme  ███████████           0.55
tech           ██████████            0.50
ai_research    █████████             0.45
philosophy     ████████              0.40
psychology     ████████              0.40
music          ███████               0.35
news           ███                   0.15
sports         █                     0.05
politics       █                     0.05
finance        █                     0.05
```

> 高权重类别的推文天然获得更多注意力。但注意——这是**注意力亲和力**，不是过滤。低权重类别 ≠ 永远不看，只是需要更大的"信号强度"（如被认识的人转发、高互动量）才能突破注意力门控。

---

*文档版本: 1.3.0*
*最后更新: 2026-05-06*
*对应引擎模块: engine/social/twitter/ (待创建)*
*变更: 新增第九章社交关系图、第十章人格演化，移除跨平台联动（后期考虑）*
