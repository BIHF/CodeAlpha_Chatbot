import pytest
from app import app, get_reply


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client


def test_home_page(client):
    res = client.get("/")
    assert res.status_code == 200
    assert b"CodeAlpha Chatbot Project" in res.data


def test_chat_portal_page(client):
    res = client.get("/chat")
    assert res.status_code == 200
    assert b"CodeAlpha Chatbot Project" in res.data


def test_embed_page(client):
    res = client.get("/embed")
    assert res.status_code == 200


def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert data["intents_loaded"] > 20
    assert "uptime_seconds" in data


def test_api_intents(client):
    res = client.get("/api/intents")
    assert res.status_code == 200
    data = res.get_json()
    assert data["total"] > 20
    assert isinstance(data["intents"], list)


def test_api_chat_valid(client):
    payload = {"message": "How do I deploy this chatbot to AWS Elastic Beanstalk?"}
    res = client.post("/api/chat", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert "reply" in data
    assert "confidence" in data
    assert data["intent"] in ("aws_elastic_beanstalk", "aws_cloud_services")


def test_api_chat_empty(client):
    payload = {"message": ""}
    res = client.post("/api/chat", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["suggestions"]) > 0


def test_api_chat_invalid_type(client):
    payload = {"message": 12345}
    res = client.post("/api/chat", json=payload)
    assert res.status_code == 400
    assert "error" in res.get_json()


def test_api_chat_too_long(client):
    payload = {"message": "a" * 1050}
    res = client.post("/api/chat", json=payload)
    assert res.status_code == 400


def test_api_ticket(client):
    payload = {"email": "student@example.com", "issue": "Docker build fails with permission denied"}
    res = client.post("/api/ticket", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "ticket_id" in data


def test_api_ticket_empty_issue(client):
    payload = {"email": "student@example.com", "issue": ""}
    res = client.post("/api/ticket", json=payload)
    assert res.status_code == 400


def test_api_feedback(client):
    payload = {"rating": "helpful", "intent": "aws_cloud_services", "comment": "Great answer!"}
    res = client.post("/api/feedback", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True


def test_api_feedback_invalid(client):
    payload = {"rating": "neutral"}
    res = client.post("/api/feedback", json=payload)
    assert res.status_code == 400


def test_cors_headers(client):
    res = client.get("/health")
    assert res.headers.get("Access-Control-Allow-Origin") == "*"


def test_get_reply_backward_compatibility():
    greeting = get_reply("Hello")
    assert isinstance(greeting, str)
    assert len(greeting) > 0

    aws_answer = get_reply("What is AWS?")
    assert "AWS" in aws_answer or "cloud" in aws_answer.lower()
