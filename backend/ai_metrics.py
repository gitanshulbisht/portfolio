"""
ai_metrics.py: SRE Telemetry & Observability tracker for Anshul Bisht's AI assistant.
Tracks latency percentiles (P50/P90/P95), token estimations, engine splits, and Prometheus format.
"""

import time
import threading
from typing import List, Dict, Any, Optional


class AIMetricsTracker:
    """Thread-safe SRE telemetry and observability metrics collector for AI endpoints."""

    def __init__(self, max_history: int = 200):
        self.max_history = max_history
        self._lock = threading.Lock()

        self.total_requests = 0
        self.success_count = 0
        self.fallback_count = 0
        self.rate_limited_count = 0
        self.blocked_injection_count = 0

        self.groq_count = 0
        self.gemini_count = 0

        self.total_prompt_tokens = 0
        self.total_completion_tokens = 0

        self.latencies_ms: List[float] = []
        self.recent_spans: List[Dict[str, Any]] = []

    def record_request(
        self,
        route: str,
        engine: str,
        duration_ms: float,
        status: str = "success",
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        client_ip: Optional[str] = None,
    ):
        """Record an inbound AI request invocation span and update telemetry aggregates."""
        with self._lock:
            self.total_requests += 1
            if status == "success":
                self.success_count += 1
            elif status == "fallback":
                self.fallback_count += 1
            elif status == "rate_limited":
                self.rate_limited_count += 1
            elif status == "blocked_injection":
                self.blocked_injection_count += 1

            if engine == "groq":
                self.groq_count += 1
            elif engine == "gemini":
                self.gemini_count += 1

            self.total_prompt_tokens += prompt_tokens
            self.total_completion_tokens += completion_tokens

            if duration_ms > 0:
                self.latencies_ms.append(duration_ms)
                if len(self.latencies_ms) > self.max_history:
                    self.latencies_ms.pop(0)

            span = {
                "timestamp": time.time(),
                "route": route,
                "engine": engine,
                "duration_ms": round(duration_ms, 2),
                "status": status,
                "tokens": prompt_tokens + completion_tokens,
                "client_ip": client_ip or "",
            }
            self.recent_spans.insert(0, span)
            if len(self.recent_spans) > 50:
                self.recent_spans.pop()

    def _percentile(self, data: List[float], p: float) -> float:
        """Calculate the p-th percentile from a list of float values."""
        if not data:
            return 0.0
        sorted_data = sorted(data)
        idx = int(len(sorted_data) * p)
        idx = min(idx, len(sorted_data) - 1)
        return round(sorted_data[idx], 2)

    def get_summary(self) -> Dict[str, Any]:
        """Return a structured summary dictionary of all recorded telemetry metrics."""
        with self._lock:
            avg_latency = round(sum(self.latencies_ms) / len(self.latencies_ms), 2) if self.latencies_ms else 0.0
            return {
                "total_requests": self.total_requests,
                "success_count": self.success_count,
                "fallback_count": self.fallback_count,
                "rate_limited_count": self.rate_limited_count,
                "blocked_injection_count": self.blocked_injection_count,
                "engine_distribution": {
                    "groq": self.groq_count,
                    "gemini": self.gemini_count,
                },
                "tokens": {
                    "prompt": self.total_prompt_tokens,
                    "completion": self.total_completion_tokens,
                    "total": self.total_prompt_tokens + self.total_completion_tokens,
                },
                "latency_ms": {
                    "avg": avg_latency,
                    "p50": self._percentile(self.latencies_ms, 0.50),
                    "p90": self._percentile(self.latencies_ms, 0.90),
                    "p95": self._percentile(self.latencies_ms, 0.95),
                    "p99": self._percentile(self.latencies_ms, 0.99),
                },
                "recent_spans": list(self.recent_spans[:15]),
            }

    def export_prometheus(self) -> str:
        """Export metrics in OpenMetrics / Prometheus text format for scraping."""
        with self._lock:
            p50 = self._percentile(self.latencies_ms, 0.50) / 1000.0
            p90 = self._percentile(self.latencies_ms, 0.90) / 1000.0
            p95 = self._percentile(self.latencies_ms, 0.95) / 1000.0

            lines = [
                "# HELP ai_requests_total Total number of AI assistant requests",
                "# TYPE ai_requests_total counter",
                f'ai_requests_total{{engine="groq",status="success"}} {self.groq_count}',
                f'ai_requests_total{{engine="gemini",status="fallback"}} {self.fallback_count}',
                f'ai_requests_total{{status="rate_limited"}} {self.rate_limited_count}',
                f'ai_requests_total{{status="blocked_injection"}} {self.blocked_injection_count}',
                "",
                "# HELP ai_latency_seconds AI assistant latency percentiles in seconds",
                "# TYPE ai_latency_seconds summary",
                f'ai_latency_seconds{{quantile="0.50"}} {p50:.3f}',
                f'ai_latency_seconds{{quantile="0.90"}} {p90:.3f}',
                f'ai_latency_seconds{{quantile="0.95"}} {p95:.3f}',
                "",
                "# HELP ai_tokens_total Estimated tokens consumed",
                "# TYPE ai_tokens_total counter",
                f'ai_tokens_total{{type="prompt"}} {self.total_prompt_tokens}',
                f'ai_tokens_total{{type="completion"}} {self.total_completion_tokens}',
                "",
            ]
            return "\n".join(lines)

    def reset(self):
        """Reset all in-memory metrics counters, latency buffers, and span histories."""
        with self._lock:
            self.total_requests = 0
            self.success_count = 0
            self.fallback_count = 0
            self.rate_limited_count = 0
            self.blocked_injection_count = 0
            self.groq_count = 0
            self.gemini_count = 0
            self.total_prompt_tokens = 0
            self.total_completion_tokens = 0
            self.latencies_ms.clear()
            self.recent_spans.clear()


# Global singleton instance
ai_metrics = AIMetricsTracker()
