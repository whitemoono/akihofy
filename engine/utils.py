"""
工具函数模块
"""
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
import hashlib
import json


def calculate_similarity(text1: str, text2: str) -> float:
    """
    计算两个文本的相似度

    Args:
        text1: 文本1
        text2: 文本2

    Returns:
        相似度 0.0 ~ 1.0
    """
    # 简单的词袋相似度
    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())

    if not words1 or not words2:
        return 0.0

    intersection = words1 & words2
    union = words1 | words2

    return len(intersection) / len(union)


def calculate_hash(text: str) -> str:
    """计算文本的 MD5 哈希"""
    return hashlib.md5(text.encode()).hexdigest()


def calculate_token_estimate(text: str) -> int:
    """
    估算 token 数量

    简化估算：中文约 1.3 tokens/字，英文约 4 chars/token
    """
    chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
    other_chars = len(text) - chinese_chars

    return int(chinese_chars * 1.3 + other_chars / 4)


def truncate_text(text: str, max_tokens: int, suffix: str = "...") -> str:
    """
    按 token 数量截断文本

    Args:
        text: 原始文本
        max_tokens: 最大 token 数
        suffix: 截断后缀

    Returns:
        截断后的文本
    """
    current_tokens = calculate_token_estimate(text)

    if current_tokens <= max_tokens:
        return text

    # 二分搜索找到合适的截断点
    max_chars = int(max_tokens / 1.3)  # 估算

    if len(text) <= max_chars:
        return text

    return text[:max_chars] + suffix


def format_duration(seconds: float) -> str:
    """
    格式化时长

    Args:
        seconds: 秒数

    Returns:
        格式化的字符串
    """
    if seconds < 60:
        return f"{seconds:.0f}秒"
    elif seconds < 3600:
        minutes = seconds / 60
        return f"{minutes:.0f}分钟"
    else:
        hours = seconds / 3600
        return f"{hours:.1f}小时"


def parse_duration(duration_str: str) -> float:
    """
    解析时长字符串

    Args:
        duration_str: 如 "1h", "30m", "45s"

    Returns:
        秒数
    """
    duration_str = duration_str.lower().strip()

    if duration_str.endswith("h"):
        return float(duration_str[:-1]) * 3600
    elif duration_str.endswith("m"):
        return float(duration_str[:-1]) * 60
    elif duration_str.endswith("s"):
        return float(duration_str[:-1])
    else:
        return float(duration_str)


def merge_dicts(dict1: Dict, dict2: Dict) -> Dict:
    """深度合并两个字典"""
    result = dict1.copy()

    for key, value in dict2.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = merge_dicts(result[key], value)
        else:
            result[key] = value

    return result


def deduplicate_list(items: List[Any], key: Optional[str] = None) -> List[Any]:
    """
    去重列表

    Args:
        items: 列表
        key: 如果指定，则按该属性去重

    Returns:
        去重后的列表
    """
    if not key:
        seen = set()
        result = []
        for item in items:
            if item not in seen:
                seen.add(item)
                result.append(item)
        return result
    else:
        seen = set()
        result = []
        for item in items:
            value = getattr(item, key) if hasattr(item, key) else item.get(key)
            if value not in seen:
                seen.add(value)
                result.append(item)
        return result


def clamp(value: float, min_val: float, max_val: float) -> float:
    """限制值在范围内"""
    return max(min_val, min(max_val, value))


def normalize(value: float, min_val: float, max_val: float) -> float:
    """将值归一化到 0.0 ~ 1.0"""
    if max_val == min_val:
        return 0.5
    return (value - min_val) / (max_val - min_val)


def exponential_decay(value: float, rate: float, time: float) -> float:
    """
    指数衰减

    Args:
        value: 初始值
        rate: 衰减率
        time: 时间

    Returns:
        衰减后的值
    """
    return value * pow(2.71828, -rate * time)


class CircularBuffer:
    """循环缓冲区"""

    def __init__(self, capacity: int):
        self.capacity = capacity
        self.buffer = []
        self.index = 0

    def append(self, item: Any):
        """添加元素"""
        if len(self.buffer) < self.capacity:
            self.buffer.append(item)
        else:
            self.buffer[self.index] = item

        self.index = (self.index + 1) % self.capacity

    def get_all(self) -> List[Any]:
        """获取所有元素（按插入顺序）"""
        if len(self.buffer) < self.capacity:
            return self.buffer.copy()

        return self.buffer[self.index:] + self.buffer[:self.index]

    def get_recent(self, n: int) -> List[Any]:
        """获取最近的 n 个元素"""
        return self.get_all()[-n:]


class Timer:
    """简单计时器"""

    def __init__(self):
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None

    def start(self):
        """开始计时"""
        self.start_time = datetime.now()
        self.end_time = None

    def stop(self) -> float:
        """停止计时，返回秒数"""
        self.end_time = datetime.now()
        return self.elapsed()

    def elapsed(self) -> float:
        """获取经过的时间（秒）"""
        if self.start_time is None:
            return 0.0

        end = self.end_time or datetime.now()
        return (end - self.start_time).total_seconds()
