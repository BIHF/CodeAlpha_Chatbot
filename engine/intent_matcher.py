"""
Intent Matcher Engine for CodeAlpha Chatbot
Integrates TF-IDF vectorization, Cosine Similarity scoring,
Exact Pattern Boosting, Disambiguation, and Hybrid Generative AI fallback.
"""

import json
import os
import random
import re
import time
from engine.nlp_engine import (
    TFIDFVectorizer,
    tokenize,
    levenshtein_similarity
)
from engine.llm_fallback import LLMFallbackEngine

DEFAULT_INTENTS_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    "intents.json"
)

# Confidence thresholds
CONFIDENCE_HIGH = 0.38      # Clear match -> Direct reply
CONFIDENCE_MEDIUM = 0.20    # Ambiguous / partial match -> Reply + "Did you mean?" suggestions
# < CONFIDENCE_MEDIUM -> Fallback or Generative LLM


class IntentMatcher:
    def __init__(self, intents_path=DEFAULT_INTENTS_PATH):
        self.intents_path = intents_path
        self.intents_data = []
        self.intents_by_tag = {}
        self.vectorizer = TFIDFVectorizer(use_ngrams=True, sublinear_tf=True)
        self.pattern_records = []  # List of dicts: {'tag', 'raw_pattern', 'vector', 'norm'}
        self.exact_patterns = {}   # Normalized pattern text -> tag
        self.llm_engine = LLMFallbackEngine()
        self.load_and_train()

    def load_and_train(self):
        """Load intents from JSON and fit the TF-IDF vectorizer."""
        with open(self.intents_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.intents_data = data.get("intents", [])
        self.intents_by_tag = {intent["tag"]: intent for intent in self.intents_data}

        corpus = []
        self.exact_patterns = {}
        temp_patterns = []

        for intent in self.intents_data:
            tag = intent["tag"]
            for pattern in intent.get("patterns", []):
                cleaned = " ".join(tokenize(pattern, remove_stopwords=False, stem=False))
                self.exact_patterns[cleaned] = tag
                self.exact_patterns[pattern.strip().lower()] = tag
                corpus.append(pattern)
                temp_patterns.append((tag, pattern))

        # Fit vectorizer on all pattern sentences
        self.vectorizer.fit(corpus)

        # Precompute vectors & norms for all training patterns
        self.pattern_records = []
        for tag, pattern in temp_patterns:
            vec, norm = self.vectorizer.transform(pattern)
            self.pattern_records.append({
                "tag": tag,
                "raw_pattern": pattern,
                "vec": vec,
                "norm": norm
            })

    def match(self, message):
        """
        Match user input to the best intent using hybrid scoring.
        Returns a dict containing reply, intent tag, confidence score, tier, and suggestions.
        """
        start_time = time.perf_counter()
        raw_text = (message or "").strip()

        if not raw_text:
            return {
                "reply": "Please type a question or choose one of the suggestions below.",
                "intent": "empty_input",
                "confidence": 1.0,
                "tier": "direct",
                "suggestions": ["Internship Tasks", "Task 4 Chatbot", "AWS Deployment", "Submission Form"],
                "latency_ms": 0.5
            }

        # Check for simulated support ticket creation command
        ticket_match = re.match(r"^ticket:\s*(.*)", raw_text, re.IGNORECASE)
        if ticket_match:
            issue_desc = ticket_match.group(1).strip() or "General inquiry"
            ticket_id = f"CA-{random.randint(10000, 99999)}"
            elapsed = (time.perf_counter() - start_time) * 1000.0
            return {
                "reply": (
                    f"**Support Ticket Created Successfully!**\n\n"
                    f"- **Ticket ID**: `{ticket_id}`\n"
                    f"- **Issue**: {issue_desc}\n"
                    f"- **Status**: Open (Queued for Cloud Technical Mentor)\n\n"
                    f"A mentor will review your inquiry shortly. Feel free to ask more questions in the meantime!"
                ),
                "intent": "create_ticket_success",
                "confidence": 1.0,
                "tier": "action",
                "ticket_id": ticket_id,
                "suggestions": ["Internship Tasks", "AWS Cloud Services", "Submission Guidelines"],
                "latency_ms": round(elapsed, 2)
            }

        cleaned_query = " ".join(tokenize(raw_text, remove_stopwords=False, stem=False))
        lower_query = raw_text.lower().strip()

        # 1. Exact match check
        if lower_query in self.exact_patterns or cleaned_query in self.exact_patterns:
            matched_tag = self.exact_patterns.get(lower_query) or self.exact_patterns.get(cleaned_query)
            elapsed = (time.perf_counter() - start_time) * 1000.0
            return self._build_intent_response(matched_tag, confidence=1.0, tier="exact", latency=elapsed)

        # 2. Vector Cosine Similarity
        query_vec, query_norm = self.vectorizer.transform(raw_text)
        tag_scores = {}
        tag_best_pattern = {}

        for record in self.pattern_records:
            sim = TFIDFVectorizer.cosine_similarity(
                query_vec, query_norm, record["vec"], record["norm"]
            )
            tag = record["tag"]

            # Phrase bonus only when there is baseline similarity and meaningful phrase length
            pat_lower = record["raw_pattern"].lower()
            if sim > 0.15 and len(pat_lower) >= 4:
                if pat_lower in lower_query or (len(lower_query) >= 4 and lower_query in pat_lower):
                    sim = min(1.0, sim + 0.20)

            if sim > tag_scores.get(tag, 0.0):
                tag_scores[tag] = sim
                tag_best_pattern[tag] = record["raw_pattern"]

        # 3. Typo-tolerance check for short single/double word inputs
        query_words = lower_query.split()
        if len(query_words) <= 2:
            for pattern_text, tag in self.exact_patterns.items():
                lev_sim = levenshtein_similarity(lower_query, pattern_text)
                if lev_sim >= 0.82:  # High typo similarity (e.g. "internshpi" -> "internship")
                    boosted_score = lev_sim * 0.90
                    if boosted_score > tag_scores.get(tag, 0.0):
                        tag_scores[tag] = boosted_score

        # Sort tags by match score
        ranked_intents = sorted(tag_scores.items(), key=lambda item: item[1], reverse=True)
        top_tag, top_score = ranked_intents[0] if ranked_intents else ("unknown", 0.0)

        elapsed = (time.perf_counter() - start_time) * 1000.0

        # High Confidence Match
        if top_score >= CONFIDENCE_HIGH:
            return self._build_intent_response(
                top_tag, confidence=round(top_score, 4), tier="high", latency=elapsed
            )

        # Medium Confidence Match: Disambiguate with suggestion chips
        if top_score >= CONFIDENCE_MEDIUM:
            intent_meta = self.intents_by_tag.get(top_tag, {})
            base_reply = random.choice(intent_meta.get("responses", [""]))
            alt_suggestions = []
            for tag, _ in ranked_intents[:3]:
                if tag in self.intents_by_tag:
                    patterns = self.intents_by_tag[tag].get("patterns", [])
                    if patterns:
                        alt_suggestions.append(patterns[0].title())

            reply_text = f"{base_reply}\n\n*Did this answer your query? If not, check related topics below:*"
            return {
                "reply": reply_text,
                "intent": top_tag,
                "confidence": round(top_score, 4),
                "tier": "medium",
                "suggestions": alt_suggestions or intent_meta.get("suggestions", []),
                "latency_ms": round(elapsed, 2)
            }

        # Low Confidence: Check Generative LLM Fallback
        if self.llm_engine.is_available:
            llm_result = self.llm_engine.generate_reply(raw_text)
            if llm_result:
                reply_text, provider = llm_result
                return {
                    "reply": f"{reply_text}\n\n*(Generated via {provider} fallback)*",
                    "intent": "llm_generative",
                    "confidence": 0.50,
                    "tier": "llm",
                    "suggestions": ["Task 4: Making a Chatbot", "AWS Cloud Services", "Create Support Ticket"],
                    "latency_ms": round((time.perf_counter() - start_time) * 1000.0, 2)
                }

        # Default Graceful Fallback
        fallback_suggestions = [
            "Task 4: Making a Chatbot",
            "Cloud Internship Tasks",
            "AWS Deployment Guide",
            "GitHub Requirements",
            "Raise Support Ticket"
        ]
        return {
            "reply": (
                "I couldn't find a direct match in my knowledge base. "
                "Try asking about **CodeAlpha internship tasks**, **GitHub repository setup**, "
                "**AWS cloud deployment**, or pick one of the quick options below:"
            ),
            "intent": "fallback",
            "confidence": round(top_score, 4),
            "tier": "fallback",
            "suggestions": fallback_suggestions,
            "latency_ms": round(elapsed, 2)
        }

    def _build_intent_response(self, tag, confidence, tier, latency):
        intent_meta = self.intents_by_tag.get(tag, {})
        responses = intent_meta.get("responses", ["I am here to help!"])
        reply = random.choice(responses)
        suggestions = intent_meta.get("suggestions", [])
        return {
            "reply": reply,
            "intent": tag,
            "confidence": confidence,
            "tier": tier,
            "suggestions": suggestions,
            "latency_ms": round(latency, 2)
        }
