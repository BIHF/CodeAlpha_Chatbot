import pytest
from engine.intent_matcher import IntentMatcher


@pytest.fixture(scope="module")
def matcher():
    return IntentMatcher()


def test_greeting_intent(matcher):
    res = matcher.match("Hello there!")
    assert res["intent"] == "greeting"
    assert res["confidence"] >= 0.4
    assert len(res["reply"]) > 0


def test_task_4_intent(matcher):
    res = matcher.match("What is task 4 making a chatbot?")
    assert res["intent"] == "task_4_chatbot"
    assert "Task 4" in res["reply"]


def test_github_intent(matcher):
    res = matcher.match("How should I name the GitHub repository?")
    assert res["intent"] == "github_requirements"
    assert "CodeAlpha_Chatbot" in res["reply"]


def test_aws_intent(matcher):
    res = matcher.match("Tell me about AWS cloud services and Elastic Beanstalk")
    assert res["intent"] in ("aws_cloud_services", "aws_elastic_beanstalk")
    assert res["confidence"] >= 0.35


def test_ticket_creation(matcher):
    res = matcher.match("ticket: Unable to connect to MongoDB on cloud")
    assert res["intent"] == "create_ticket_success"
    assert res["tier"] == "action"
    assert "ticket_id" in res


def test_empty_query(matcher):
    res = matcher.match("")
    assert res["intent"] == "empty_input"
    assert len(res["suggestions"]) > 0


def test_fallback_query(matcher):
    res = matcher.match("What is quantum string theory in astrophysics?")
    assert res["intent"] in ("fallback", "llm_generative")
    assert len(res["suggestions"]) > 0
