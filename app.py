"""
CodeAlpha Cloud AI Chatbot - Enterprise Flask Application
Features Hybrid NLP Engine (TF-IDF + Cosine Similarity), Live SaaS Demo,
Dedicated Fullscreen Portal, Embeddable Widget, and Support Ticket Automation.
"""

import os
import time
import datetime
from flask import Flask, request, jsonify, render_template

from engine.intent_matcher import IntentMatcher

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "codealpha-chatbot-secret-key-2026")
APP_START_TIME = time.time()

# Initialize NLP Intent Engine
matcher = IntentMatcher()

# In-memory stores for tickets and feedback (production: connect to PostgreSQL / DynamoDB)
SUPPORT_TICKETS = []
USER_FEEDBACK = []


def get_reply(message):
    """
    Standard reply generator for backward compatibility.
    Accepts string message, returns string reply.
    """
    res = matcher.match(message)
    return res.get("reply", "I am here to help.")


@app.after_request
def add_cors_headers(response):
    """Allow cross-origin access so the chatbot widget can be embedded on any website."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.route("/")
def home():
    """Commercial SaaS Landing Page demonstrating the embedded floating chatbot widget."""
    return render_template("index.html")


@app.route("/chat")
def chat_portal():
    """Dedicated full-screen AI assistant portal with confidence telemetry."""
    return render_template("chat.html")


@app.route("/embed")
def embed_widget():
    """Embeddable lightweight iframe view."""
    return render_template("chat.html", embedded=True)


@app.route("/api/chat", methods=["POST"])
def api_chat():
    """
    Main Chat API Endpoint.
    Payload: {"message": "string", "session_id": "optional-string"}
    Returns rich match results with confidence score and actionable suggestion chips.
    """
    data = request.get_json(silent=True) or {}
    message = data.get("message", "")

    if not isinstance(message, str):
        return jsonify(error="Message must be text"), 400

    if len(message) > 1000:
        return jsonify(error="Message exceeds maximum length of 1000 characters"), 400

    match_result = matcher.match(message)
    match_result["timestamp"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

    return jsonify(match_result)


@app.route("/api/intents", methods=["GET"])
def api_intents():
    """Returns list of supported intent categories and sample patterns."""
    catalog = []
    for intent in matcher.intents_data:
        catalog.append({
            "tag": intent.get("tag"),
            "sample_patterns": intent.get("patterns", [])[:3],
            "suggestions": intent.get("suggestions", [])
        })
    return jsonify(intents=catalog, total=len(catalog))


@app.route("/api/ticket", methods=["POST"])
def api_ticket():
    """Create a new customer support ticket."""
    data = request.get_json(silent=True) or {}
    email = data.get("email", "anonymous@codealpha.com").strip()
    issue = data.get("issue", "").strip()

    if not issue:
        return jsonify(error="Issue description cannot be empty"), 400

    ticket_id = f"CA-{len(SUPPORT_TICKETS) + 1001}"
    ticket = {
        "id": ticket_id,
        "email": email,
        "issue": issue,
        "status": "OPEN",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    SUPPORT_TICKETS.append(ticket)

    return jsonify(
        success=True,
        ticket_id=ticket_id,
        message="Support ticket successfully filed. A cloud mentor will contact you shortly."
    )


@app.route("/api/feedback", methods=["POST"])
def api_feedback():
    """Capture user CSAT ratings (thumbs up/down) for response optimization."""
    data = request.get_json(silent=True) or {}
    rating = data.get("rating")  # 'helpful' or 'unhelpful'
    comment = data.get("comment", "")
    message_intent = data.get("intent", "general")

    if rating not in ("helpful", "unhelpful"):
        return jsonify(error="Invalid rating value. Must be 'helpful' or 'unhelpful'"), 400

    USER_FEEDBACK.append({
        "rating": rating,
        "comment": comment,
        "intent": message_intent,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    })

    return jsonify(success=True, message="Thank you for your feedback!")


@app.route("/health", methods=["GET"])
def health():
    """Cloud Health Check endpoint for AWS Beanstalk / Render / Kubernetes."""
    uptime_seconds = int(time.time() - APP_START_TIME)
    return jsonify(
        status="healthy",
        uptime_seconds=uptime_seconds,
        intents_loaded=len(matcher.intents_data),
        engine="Hybrid TF-IDF + Cosine Retrieval",
        generative_fallback=matcher.llm_engine.is_available,
        active_tickets=len(SUPPORT_TICKETS),
        version="2.0.0"
    )


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug_mode = os.getenv("FLASK_ENV", "development") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
