"""
Ephemeral Session Manager with Sliding-Window Context Truncation.
Manages chat memory, token budgets, and session lifecycle.
"""

import time
import threading
from typing import List, Dict, Any, Optional

DEFAULT_MAX_TURNS = 10
DEFAULT_MAX_TOKENS = 1500
SESSION_TTL_SECONDS = 7200  # 2 Hours


def estimate_tokens(text: str) -> int:
    """Rough estimation of token count (~4 characters per token)."""
    if not text:
        return 0
    return max(1, len(text) // 4)


class EphemeralSessionManager:
    """Thread-safe in-memory session manager with sliding-window memory management."""

    def __init__(self, ttl_seconds: int = SESSION_TTL_SECONDS):
        self.ttl_seconds = ttl_seconds
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def get_session(self, session_id: str) -> Dict[str, Any]:
        """Retrieve an existing session or initialize a new one."""
        with self._lock:
            now = time.time()
            self._cleanup_expired(now)

            if session_id not in self._sessions:
                self._sessions[session_id] = {
                    "session_id": session_id,
                    "created_at": now,
                    "last_accessed": now,
                    "messages": []
                }
            else:
                self._sessions[session_id]["last_accessed"] = now

            return self._sessions[session_id]

    def add_message(self, session_id: str, role: str, content: str) -> None:
        """Append a message to the session's conversational memory."""
        session = self.get_session(session_id)
        with self._lock:
            session["messages"].append({
                "role": role,
                "content": content,
                "timestamp": time.time(),
                "token_count": estimate_tokens(content)
            })
            session["last_accessed"] = time.time()

    def get_context_window(
        self,
        session_id: str,
        max_messages: int = DEFAULT_MAX_TURNS,
        max_tokens: int = DEFAULT_MAX_TOKENS
    ) -> List[Dict[str, str]]:
        """
        Extract the sliding window of conversational turns within a specified token budget.
        Returns messages in chronological order [oldest -> newest].
        """
        session = self.get_session(session_id)
        with self._lock:
            all_messages = session["messages"]

            if not all_messages:
                return []

            # 1. Truncate by message turn count
            recent_turns = all_messages[-max_messages:]

            # 2. Truncate by token budget from newest to oldest
            truncated = []
            accumulated_tokens = 0

            for msg in reversed(recent_turns):
                msg_tokens = msg.get("token_count", estimate_tokens(msg["content"]))
                if accumulated_tokens + msg_tokens > max_tokens and truncated:
                    break
                truncated.append({"role": msg["role"], "content": msg["content"]})
                accumulated_tokens += msg_tokens

            # Return in chronological order
            truncated.reverse()
            return truncated

    def clear_session(self, session_id: str) -> bool:
        """Clear the history for a specific session."""
        with self._lock:
            if session_id in self._sessions:
                del self._sessions[session_id]
                return True
            return False

    def _cleanup_expired(self, current_time: float) -> None:
        """Purge sessions that have exceeded the TTL limit."""
        expired = [
            sid for sid, data in self._sessions.items()
            if (current_time - data["last_accessed"]) > self.ttl_seconds
        ]
        for sid in expired:
            del self._sessions[sid]


# Global shared session manager
session_manager = EphemeralSessionManager()
