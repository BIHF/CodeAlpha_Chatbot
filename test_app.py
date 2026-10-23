import pytest
from app import app, get_reply


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client


def test_greeting():
    response = get_reply("Hello")
    assert isinstance(response, str)
    assert len(response) > 0


def test_github_question():
    response = get_reply("How do I use GitHub?")
    assert isinstance(response, str)
    assert len(response) > 0


def test_unknown_question():
    response = get_reply("What is the meaning of life?")
    assert isinstance(response, str)
    assert len(response) > 0


def test_home_page(client):
    response = client.get("/")
    assert response.status_code == 200


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200