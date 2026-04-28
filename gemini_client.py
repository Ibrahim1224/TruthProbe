"""
gemini_client.py — Handles all Google Gemini API interactions.

Uses the modern google-genai SDK.
Provides:
  • API key configuration (from .env)
  • Automatic retry with exponential backoff
  • Rate-limit-friendly inter-call delay
"""

import os
import time
from google import genai
from dotenv import load_dotenv

load_dotenv()

# ── Defaults ────────────────────────────────────────────────────────────────
DEFAULT_MODEL = "gemini-2.0-flash"
INTER_CALL_DELAY = 2
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 4

_client: genai.Client | None = None


def configure(api_key: str | None = None):
    """Configure the Gemini client. Priority: explicit key > .env."""
    global _client
    key = api_key or os.getenv("GEMINI_API_KEY", "")
    if not key or key in ("your_key_here", "PASTE_YOUR_GEMINI_API_KEY_HERE"):
        raise ValueError("No API key found. Set GEMINI_API_KEY in your .env file.")
    _client = genai.Client(api_key=key)


def call_gemini(prompt: str, *, model_name: str = DEFAULT_MODEL) -> str:
    """Send a single prompt to Gemini and return the text response."""
    if _client is None:
        raise ValueError("Gemini client not configured. Call configure() first.")

    last_err = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = _client.models.generate_content(model=model_name, contents=prompt)
            time.sleep(INTER_CALL_DELAY)
            return response.text
        except Exception as exc:
            last_err = exc
            wait = RETRY_BACKOFF_BASE * (2 ** (attempt - 1))
            if attempt < MAX_RETRIES:
                time.sleep(wait)

    return f"[Error after {MAX_RETRIES} retries: {last_err}]"


def batch_call(prompts: list[dict], status_callback=None) -> list[dict]:
    """Send a batch of prompts to Gemini sequentially."""
    results = []
    total = len(prompts)
    for idx, item in enumerate(prompts):
        response_text = call_gemini(item["prompt"])
        enriched = {**item, "response": response_text}
        results.append(enriched)
        if status_callback:
            preview = response_text[:120] + "…" if len(response_text) > 120 else response_text
            status_callback(idx, total, item["demographic"], preview)
    return results
