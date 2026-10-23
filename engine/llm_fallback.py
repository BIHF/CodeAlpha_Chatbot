"""
Generative AI Fallback Engine for CodeAlpha Chatbot.
Supports optional cloud LLM fallback (e.g. Google Gemini API or OpenAI API)
when confidence in retrieval-based knowledge base is low.
Gracefully degrades to retrieval fallback when no API key is configured.
"""

import os
import json
import urllib.request
import urllib.error

class LLMFallbackEngine:
    def __init__(self):
        self.gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "").strip()
        self.llm_provider = os.getenv("LLM_PROVIDER", "auto").strip().lower()

    @property
    def is_available(self):
        """Check if any LLM API provider key is configured."""
        return bool(self.gemini_api_key or self.openai_api_key)

    def generate_reply(self, user_message, context_summary=""):
        """
        Generate response using configured LLM API.
        Returns (reply_text, provider_name) or None if unavailable/failed.
        """
        if not self.is_available:
            return None

        # 1. Try Gemini API if key is present
        if self.gemini_api_key and (self.llm_provider in ("gemini", "auto")):
            reply = self._call_gemini(user_message, context_summary)
            if reply:
                return reply, "Gemini Generative AI"

        # 2. Try OpenAI API if key is present
        if self.openai_api_key and (self.llm_provider in ("openai", "auto")):
            reply = self._call_openai(user_message, context_summary)
            if reply:
                return reply, "OpenAI Generative AI"

        return None

    def _call_gemini(self, message, context):
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_api_key}"
            prompt = (
                "You are the CodeAlpha Cloud Computing Assistant. "
                "Answer the user query concisely, accurately, and professionally. "
                "Focus on Cloud Computing, AWS, Docker, web deployment, and developer guidance.\n"
                f"Context: {context}\n"
                f"User Question: {message}"
            )
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.4, "maxOutputTokens": 300}
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                result = json.loads(response.read().decode("utf-8"))
                candidates = result.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "").strip()
        except Exception:
            return None
        return None

    def _call_openai(self, message, context):
        try:
            url = "https://api.openai.com/v1/chat/completions"
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are the CodeAlpha Cloud Computing Assistant. Provide concise, expert cloud computing and software engineering assistance."
                    },
                    {"role": "user", "content": message}
                ],
                "max_tokens": 300,
                "temperature": 0.4
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.openai_api_key}"
                }
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                result = json.loads(response.read().decode("utf-8"))
                choices = result.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content", "").strip()
        except Exception:
            return None
        return None
