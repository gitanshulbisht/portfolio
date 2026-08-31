"""
ai_guardrails.py: Inbound security guardrails and sliding-window rate limiting for portfolio AI assistant.
"""

import re
import time
import math
import threading
from typing import Dict, List, Optional, Tuple


SAFE_DEFLECTION_MESSAGE = (
    "I am Anshul Bisht's AI assistant. I can only assist with questions regarding "
    "Anshul's background, skills, projects, and professional contact information."
)

INJECTION_PATTERNS = [
    # Ignore/forget previous instructions or system prompts
    re.compile(
        r"(?:ignore|disregard|forget|override|bypass|cancel)\s+(?:all\s+)?(?:previous|prior|above|system|initial)?\s*(?:instructions|prompt|rules|guidelines|directions|constraints)",
        re.IGNORECASE,
    ),
    # System override commands
    re.compile(r"\bsystem\s+override\b", re.IGNORECASE),
    # Prompt leakage / reveal system instructions
    re.compile(
        r"(?:reveal|show|display|print|output|repeat|echo|tell\s+me)\s+(?:your\s+)?(?:exact\s+|hidden\s+|verbatim\s+)?(?:system\s+)?(?:prompt|instructions|rules|guidelines)",
        re.IGNORECASE,
    ),
    # DAN mode / Jailbreaks / Developer mode
    re.compile(
        r"\b(?:dan\s+mode|dan\s+\(do\s+anything\s+now\)|developer\s+mode|jailbreak)\b",
        re.IGNORECASE,
    ),
    # Role-play jailbreak attempts
    re.compile(
        r"\b(?:you\s+are\s+now|act\s+as)\s+(?:dan|an?\s+unrestricted|an?\s+unfiltered|an?\s+evil|in\s+developer\s+mode|a\s+general\s+assistant)",
        re.IGNORECASE,
    ),
    # Bypass filters / safety rules
    re.compile(
        r"\bbypass\s+(?:all\s+)?(?:safety|content|security)?\s*(?:filters|guardrails|restrictions|rules)\b",
        re.IGNORECASE,
    ),
]


def check_prompt_injection(text: str) -> Optional[str]:
    """
    Scans the provided text for common prompt injection, jailbreak, and system override attempts.

    Returns:
        SAFE_DEFLECTION_MESSAGE if an injection pattern is detected, otherwise None.
    """
    if not text or not text.strip():
        return None

    for pattern in INJECTION_PATTERNS:
        if pattern.search(text):
            return SAFE_DEFLECTION_MESSAGE

    return None


class SlidingWindowRateLimiter:
    """
    Thread-safe in-memory sliding window rate limiter per client IP.
    """

    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: Dict[str, List[float]] = {}
        self._lock = threading.Lock()

    def is_allowed(self, client_ip: str) -> Tuple[bool, int]:
        """
        Checks if a client IP is allowed to make a request within the sliding window.

        Returns:
            Tuple of (is_allowed: bool, retry_after_seconds: int)
        """
        now = time.time()
        cutoff = now - self.window_seconds

        with self._lock:
            timestamps = self._requests.get(client_ip, [])

            # Filter out timestamps outside the sliding window
            timestamps = [ts for ts in timestamps if ts > cutoff]

            if len(timestamps) < self.max_requests:
                timestamps.append(now)
                self._requests[client_ip] = timestamps
                return True, 0

            # Rate limit exceeded: calculate retry-after based on oldest timestamp in window
            oldest_ts = timestamps[0]
            retry_after = max(1, int(math.ceil(oldest_ts + self.window_seconds - now)))
            self._requests[client_ip] = timestamps
            return False, retry_after

    def reset(self) -> None:
        """Clears all stored rate limit records."""
        with self._lock:
            self._requests.clear()


# Global limiter instances
chat_limiter = SlidingWindowRateLimiter(max_requests=10, window_seconds=60)
voice_limiter = SlidingWindowRateLimiter(max_requests=15, window_seconds=60)
