"""
AKIHO 事件日志系统

收集和管理系统各子模块的事件日志：
- 系统日志 (system): 引擎状态变化、错误等
- 行为日志 (behavior): 行为决策、执行记录
- 情绪日志 (emotion): 情绪状态变化
- 对话日志 (conversation): 对话交互记录
"""

import time
import uuid
from collections import deque
from datetime import datetime
from typing import Any, Dict, List, Optional


class EventLogger:
    """事件日志收集器"""

    # 最大保留日志数量
    MAX_SYSTEM_LOGS = 1000
    MAX_BEHAVIOR_LOGS = 500
    MAX_EMOTION_LOGS = 500
    MAX_CONVERSATION_LOGS = 500

    def __init__(self):
        self.system_logs = deque(maxlen=self.MAX_SYSTEM_LOGS)
        self.behavior_logs = deque(maxlen=self.MAX_BEHAVIOR_LOGS)
        self.emotion_logs = deque(maxlen=self.MAX_EMOTION_LOGS)
        self.conversation_logs = deque(maxlen=self.MAX_CONVERSATION_LOGS)

        # 日志统计
        self.stats = {
            "system": {"total": 0, "error": 0, "warning": 0},
            "behavior": {"total": 0},
            "emotion": {"total": 0},
            "conversation": {"total": 0},
        }

    def _create_log_entry(
        self,
        log_type: str,
        level: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """创建日志条目"""
        return {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "type": log_type,
            "level": level,
            "message": message,
            "details": details or {},
        }

    # === 系统日志 ===

    def log_system(
        self,
        level: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        source: str = "engine",
    ):
        """记录系统日志"""
        entry = self._create_log_entry("system", level, message, details)
        entry["source"] = source
        self.system_logs.append(entry)

        self.stats["system"]["total"] += 1
        if level == "error":
            self.stats["system"]["error"] += 1
        elif level == "warning":
            self.stats["system"]["warning"] += 1

    def log_info(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.log_system("info", message, details)

    def log_warning(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.log_system("warning", message, details)

    def log_error(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.log_system("error", message, details)

    # === 行为日志 ===

    def log_behavior(
        self,
        action: str,
        decision: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        result: Optional[str] = None,
    ):
        """记录行为日志"""
        details = {
            "action": action,
            "decision": decision,
            "context": context,
            "result": result,
        }
        entry = self._create_log_entry("behavior", "info", action, details)
        self.behavior_logs.append(entry)
        self.stats["behavior"]["total"] += 1

    def log_intent(self, intent_id: str, description: str, stage: str, commitment: float):
        """记录意图日志"""
        details = {
            "intent_id": intent_id,
            "description": description,
            "stage": stage,
            "commitment": commitment,
        }
        entry = self._create_log_entry("behavior", "info", f"意图: {description}", details)
        self.behavior_logs.append(entry)

    def log_drive_satisfied(self, drive_name: str, amount: float):
        """记录驱动满足日志"""
        details = {"drive": drive_name, "amount": amount}
        entry = self._create_log_entry("behavior", "info", f"驱动满足: {drive_name}", details)
        self.behavior_logs.append(entry)

    # === 情绪日志 ===

    def log_emotion(
        self,
        pleasure: float,
        arousal: float,
        dominance: float,
        category: str,
        trigger: Optional[str] = None,
    ):
        """记录情绪日志"""
        details = {
            "PAD": {"pleasure": pleasure, "arousal": arousal, "dominance": dominance},
            "category": category,
            "trigger": trigger,
        }
        entry = self._create_log_entry("emotion", "info", f"情绪: {category}", details)
        self.emotion_logs.append(entry)
        self.stats["emotion"]["total"] += 1

    def log_emotion_transition(self, from_state: str, to_state: str, reason: str):
        """记录情绪转换"""
        details = {"from": from_state, "to": to_state, "reason": reason}
        entry = self._create_log_entry("emotion", "info", f"情绪转换: {from_state} -> {to_state}", details)
        self.emotion_logs.append(entry)

    # === 对话日志 ===

    def log_conversation(
        self,
        role: str,
        content: str,
        emotion: Optional[str] = None,
        platform: str = "web",
    ):
        """记录对话日志"""
        details = {"role": role, "content": content, "emotion": emotion, "platform": platform}
        entry = self._create_log_entry("conversation", "info", f"{role}: {content[:50]}...", details)
        self.conversation_logs.append(entry)
        self.stats["conversation"]["total"] += 1

    def log_autonomous_message(self, content: str, reasoning: str):
        """记录自主发言"""
        details = {"reasoning": reasoning, "autonomous": True}
        entry = self._create_log_entry("conversation", "info", f"自主发言: {content[:50]}...", details)
        self.conversation_logs.append(entry)
        self.stats["conversation"]["total"] += 1

    # === 查询接口 ===

    def get_logs(
        self,
        log_type: str = "all",
        level: Optional[str] = None,
        limit: int = 100,
        since: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """获取日志"""
        if log_type == "all":
            logs = list(self.system_logs) + list(self.behavior_logs) + list(self.emotion_logs) + list(self.conversation_logs)
        elif log_type == "system":
            logs = list(self.system_logs)
        elif log_type == "behavior":
            logs = list(self.behavior_logs)
        elif log_type == "emotion":
            logs = list(self.emotion_logs)
        elif log_type == "conversation":
            logs = list(self.conversation_logs)
        else:
            logs = []

        # 过滤
        if level:
            logs = [l for l in logs if l.get("level") == level]

        if since:
            logs = [l for l in logs if datetime.fromisoformat(l["timestamp"]).timestamp() >= since]

        # 排序并限制数量
        logs.sort(key=lambda x: x["timestamp"], reverse=True)
        return logs[:limit]

    def get_stats(self) -> Dict[str, Any]:
        """获取日志统计"""
        return {
            **self.stats,
            "queues": {
                "system": len(self.system_logs),
                "behavior": len(self.behavior_logs),
                "emotion": len(self.emotion_logs),
                "conversation": len(self.conversation_logs),
            },
        }

    def clear(self, log_type: Optional[str] = None):
        """清空日志"""
        if log_type == "system" or log_type is None:
            self.system_logs.clear()
            self.stats["system"] = {"total": 0, "error": 0, "warning": 0}
        if log_type == "behavior" or log_type is None:
            self.behavior_logs.clear()
            self.stats["behavior"] = {"total": 0}
        if log_type == "emotion" or log_type is None:
            self.emotion_logs.clear()
            self.stats["emotion"] = {"total": 0}
        if log_type == "conversation" or log_type is None:
            self.conversation_logs.clear()
            self.stats["conversation"] = {"total": 0}


# 全局日志实例
_event_logger: Optional[EventLogger] = None


def get_event_logger() -> EventLogger:
    """获取全局事件日志器"""
    global _event_logger
    if _event_logger is None:
        _event_logger = EventLogger()
    return _event_logger


def init_event_logger() -> EventLogger:
    """初始化全局事件日志器"""
    global _event_logger
    _event_logger = EventLogger()
    return _event_logger
