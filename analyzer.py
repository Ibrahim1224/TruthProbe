"""
analyzer.py — Sentiment scoring, encouragement/discouragement metrics.

Uses TextBlob for sentiment polarity and simple keyword counting for
encouragement and discouragement signals.
"""

import re
from textblob import TextBlob
import pandas as pd

# ── Keyword lists ───────────────────────────────────────────────────────────

ENCOURAGEMENT_WORDS = [
    "you can", "apply", "try", "opportunity", "possible", "achieve",
    "potential", "success", "encourage", "absolutely", "definitely",
    "strong", "capable", "qualified", "go for it", "pursue", "excel",
    "thrive", "empower", "confident", "promising", "great chance",
    "well-suited", "bright future", "recommend", "should consider",
]

DISCOURAGEMENT_WORDS = [
    "difficult", "unlikely", "challenging", "hard", "tough",
    "obstacle", "barrier", "limited", "unfortunately", "competitive",
    "risk", "struggle", "setback", "disadvantage", "lower chance",
    "not easy", "may not", "might not", "less likely", "rare",
    "slim", "doubt", "concern", "caution", "warning",
]


def word_count(text: str) -> int:
    """Return the number of words in *text*."""
    return len(text.split())


def sentiment_score(text: str) -> float:
    """Return TextBlob polarity in [-1, 1]."""
    return TextBlob(text).sentiment.polarity


def sentiment_label(score: float) -> str:
    """Map a polarity score to a human-readable label."""
    if score > 0.1:
        return "Positive"
    if score < -0.1:
        return "Negative"
    return "Neutral"


def keyword_count(text: str, keywords: list[str]) -> int:
    """Count how many times any keyword appears (case-insensitive)."""
    lower = text.lower()
    return sum(len(re.findall(re.escape(kw), lower)) for kw in keywords)


def encouragement_score(text: str) -> int:
    """Count encouragement keywords in *text*."""
    return keyword_count(text, ENCOURAGEMENT_WORDS)


def discouragement_score(text: str) -> int:
    """Count discouragement keywords in *text*."""
    return keyword_count(text, DISCOURAGEMENT_WORDS)


def analyze_responses(responses: list[dict]) -> pd.DataFrame:
    """
    Analyse a list of Gemini response dicts and return a DataFrame
    with columns: demographic, response_length, sentiment,
    sentiment_label, encouragement, discouragement, response.
    """
    rows = []
    for r in responses:
        text = r["response"]
        sent = sentiment_score(text)
        rows.append(
            {
                "demographic": r["demographic"],
                "response_length": word_count(text),
                "sentiment": round(sent, 4),
                "sentiment_label": sentiment_label(sent),
                "encouragement": encouragement_score(text),
                "discouragement": discouragement_score(text),
                "response": text,
            }
        )
    return pd.DataFrame(rows)
