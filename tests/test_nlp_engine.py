import pytest
from engine.nlp_engine import (
    PorterStemmer,
    TFIDFVectorizer,
    tokenize,
    levenshtein_similarity,
    expand_contractions
)


def test_stemmer():
    stemmer = PorterStemmer()
    assert stemmer.stem("computing") == "comput"
    assert stemmer.stem("services") == "servic"
    assert stemmer.stem("connecting") == "connect"
    assert stemmer.stem("repositories") == "repositori"


def test_contractions():
    assert "what is" in expand_contractions("what's the weather")
    assert "do not" in expand_contractions("don't fail")
    assert "cannot" in expand_contractions("can't stop")


def test_tokenize():
    tokens = tokenize("What is Cloud Computing?", stem=False)
    assert "what" in tokens
    assert "cloud" in tokens
    assert "computing" in tokens

    stemmed = tokenize("What is Cloud Computing?", stem=True)
    assert "comput" in stemmed


def test_levenshtein_similarity():
    assert levenshtein_similarity("aws", "aws") == 1.0
    assert levenshtein_similarity("internship", "internshpi") > 0.8
    assert levenshtein_similarity("github", "gitub") > 0.8
    assert levenshtein_similarity("apple", "zebra") < 0.3


def test_tfidf_vectorizer():
    corpus = [
        "Cloud computing on AWS and Docker",
        "Machine learning and natural language processing",
        "Chatbot development for internship task"
    ]
    vectorizer = TFIDFVectorizer(use_ngrams=True)
    vectorizer.fit(corpus)

    vec1, norm1 = vectorizer.transform("AWS cloud computing")
    vec2, norm2 = vectorizer.transform("Docker cloud AWS")
    vec3, norm3 = vectorizer.transform("Machine learning model")

    sim1_2 = TFIDFVectorizer.cosine_similarity(vec1, norm1, vec2, norm2)
    sim1_3 = TFIDFVectorizer.cosine_similarity(vec1, norm1, vec3, norm3)

    assert sim1_2 > 0.5  # Shared terms cloud, aws
    assert sim1_2 > sim1_3
