"""
Hybrid Generative AI Fallback Engine for CodeAlpha Commercial Chatbot.
Supports fast cloud LLM inference (Google Gemini, Anthropic Claude, OpenAI)
with strict temperature control (0.2–0.4), enterprise system instructions,
and graceful offline retrieval fallback.
"""

import os
import json
import urllib.request
import urllib.error
from typing import Optional, Tuple, Iterator
from engine.guardrails import ENTERPRISE_SYSTEM_PROMPT

# Strict temperature setting enforced across all LLM inference calls
STRICT_LLM_TEMPERATURE = 0.3
MAX_OUTPUT_TOKENS = 350


class LLMFallbackEngine:
    def __init__(self):
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
        self.llm_provider = os.getenv("LLM_PROVIDER", "auto").strip().lower()

    @property
    def is_available(self) -> bool:
        """Check if any LLM API provider key is configured."""
        return bool(self.gemini_api_key or self.openai_api_key or self.anthropic_api_key)

    def generate_reply(
        self,
        user_message: str,
        context_summary: str = "",
        context_messages: Optional[list] = None
    ) -> Optional[Tuple[str, str]]:
        """
        Generate response using configured LLM API.
        Returns (reply_text, provider_name) or None if unavailable/failed.
        """
        if not self.is_available:
            return None

        # 1. Anthropic Claude (if specified or available)
        if self.anthropic_api_key and (self.llm_provider in ("anthropic", "claude", "auto")):
            reply = self._call_anthropic(user_message, context_messages)
            if reply:
                return reply, "Anthropic Claude"

        # 2. Google Gemini API (if specified or available)
        if self.gemini_api_key and (self.llm_provider in ("gemini", "auto")):
            reply = self._call_gemini(user_message, context_summary, context_messages)
            if reply:
                return reply, "Google Gemini"

        # 3. OpenAI API (if specified or available)
        if self.openai_api_key and (self.llm_provider in ("openai", "auto")):
            reply = self._call_openai(user_message, context_messages)
            if reply:
                return reply, "OpenAI GPT"

        return None

    def _call_gemini(self, message: str, context: str, context_messages: Optional[list] = None) -> Optional[str]:
        """Google Gemini API inference with system instruction and temperature 0.3."""
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_api_key}"
            
            contents = []
            if context_messages:
                for msg in context_messages:
                    role = "user" if msg.get("role") == "user" else "model"
                    contents.append({"role": role, "parts": [{"text": msg.get("content", "")}]})
            elif context:
                contents.append({"role": "user", "parts": [{"text": f"Context history:\n{context}"}]})
                contents.append({"role": "model", "parts": [{"text": "Understood. I will answer within CodeAlpha commercial scope."}]})

            contents.append({"role": "user", "parts": [{"text": message}]})

            payload = {
                "systemInstruction": {
                    "parts": [{"text": ENTERPRISE_SYSTEM_PROMPT}]
                },
                "contents": contents,
                "generationConfig": {
                    "temperature": STRICT_LLM_TEMPERATURE,
                    "maxOutputTokens": MAX_OUTPUT_TOKENS
                }
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=6) as response:
                result = json.loads(response.read().decode("utf-8"))
                candidates = result.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "").strip()
        except Exception:
            return None
        return None

    def _call_anthropic(self, message: str, context_messages: Optional[list] = None) -> Optional[str]:
        """Anthropic Claude API inference with temperature 0.3."""
        try:
            url = "https://api.anthropic.com/v1/messages"
            messages = []
            if context_messages:
                for msg in context_messages:
                    role = "user" if msg.get("role") == "user" else "assistant"
                    messages.append({"role": role, "content": msg.get("content", "")})
            messages.append({"role": "user", "content": message})

            payload = {
                "model": "claude-3-5-haiku-20241022",
                "max_tokens": MAX_OUTPUT_TOKENS,
                "temperature": STRICT_LLM_TEMPERATURE,
                "system": ENTERPRISE_SYSTEM_PROMPT,
                "messages": messages
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": self.anthropic_api_key,
                    "anthropic-version": "2023-06-01"
                }
            )
            with urllib.request.urlopen(req, timeout=6) as response:
                result = json.loads(response.read().decode("utf-8"))
                content = result.get("content", [])
                if content and isinstance(content, list):
                    return content[0].get("text", "").strip()
        except Exception:
            return None
        return None

    def _call_openai(self, message: str, context_messages: Optional[list] = None) -> Optional[str]:
        """OpenAI GPT API inference with temperature 0.3."""
        try:
            url = "https://api.openai.com/v1/chat/completions"
            messages = [{"role": "system", "content": ENTERPRISE_SYSTEM_PROMPT}]
            if context_messages:
                for msg in context_messages:
                    role = "user" if msg.get("role") == "user" else "assistant"
                    messages.append({"role": role, "content": msg.get("content", "")})
            messages.append({"role": "user", "content": message})

            payload = {
                "model": "gpt-4o-mini",
                "messages": messages,
                "max_tokens": MAX_OUTPUT_TOKENS,
                "temperature": STRICT_LLM_TEMPERATURE
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.openai_api_key}"
                }
            )
            with urllib.request.urlopen(req, timeout=6) as response:
                result = json.loads(response.read().decode("utf-8"))
                choices = result.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content", "").strip()
        except Exception:
            return None
        return None
