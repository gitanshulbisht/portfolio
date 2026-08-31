import threading
import pytest
from ai_metrics import AIMetricsTracker, ai_metrics


class TestAIMetricsTracker:
    def test_metrics_tracker_recording(self):
        tracker = AIMetricsTracker()
        tracker.record_request(
            route="chat",
            engine="groq",
            duration_ms=450.0,
            status="success",
            prompt_tokens=250,
            completion_tokens=50,
            client_ip="192.168.1.1",
        )
        tracker.record_request(
            route="voice",
            engine="gemini",
            duration_ms=1200.0,
            status="fallback",
            prompt_tokens=200,
            completion_tokens=30,
            client_ip="192.168.1.2",
        )

        summary = tracker.get_summary()
        assert summary["total_requests"] == 2
        assert summary["success_count"] == 1
        assert summary["fallback_count"] == 1
        assert summary["rate_limited_count"] == 0
        assert summary["blocked_injection_count"] == 0
        assert summary["engine_distribution"]["groq"] == 1
        assert summary["engine_distribution"]["gemini"] == 1
        assert summary["tokens"]["prompt"] == 450
        assert summary["tokens"]["completion"] == 80
        assert summary["tokens"]["total"] == 530
        assert summary["latency_ms"]["avg"] == 825.0
        assert summary["latency_ms"]["p50"] > 0
        assert summary["latency_ms"]["p90"] > 0
        assert summary["latency_ms"]["p95"] > 0
        assert len(summary["recent_spans"]) == 2
        assert summary["recent_spans"][0]["route"] == "voice"
        assert summary["recent_spans"][0]["engine"] == "gemini"
        assert summary["recent_spans"][0]["status"] == "fallback"

    def test_request_counts_by_status(self):
        tracker = AIMetricsTracker()
        tracker.record_request(route="chat", engine="groq", duration_ms=100.0, status="success")
        tracker.record_request(route="chat", engine="gemini", duration_ms=200.0, status="fallback")
        tracker.record_request(route="chat", engine="", duration_ms=0.0, status="rate_limited")
        tracker.record_request(route="chat", engine="", duration_ms=0.0, status="blocked_injection")

        summary = tracker.get_summary()
        assert summary["total_requests"] == 4
        assert summary["success_count"] == 1
        assert summary["fallback_count"] == 1
        assert summary["rate_limited_count"] == 1
        assert summary["blocked_injection_count"] == 1

    def test_latency_percentiles_accuracy(self):
        tracker = AIMetricsTracker(max_history=200)
        # Record 100 requests with latencies from 1ms to 100ms
        for i in range(1, 101):
            tracker.record_request(
                route="chat",
                engine="groq",
                duration_ms=float(i),
                status="success",
            )

        summary = tracker.get_summary()
        assert summary["latency_ms"]["avg"] == 50.5
        # With 100 elements sorted 1..100:
        # idx for p50 (0.50) is 50 -> element 51
        # idx for p90 (0.90) is 90 -> element 91
        # idx for p95 (0.95) is 95 -> element 96
        assert summary["latency_ms"]["p50"] == 51.0
        assert summary["latency_ms"]["p90"] == 91.0
        assert summary["latency_ms"]["p95"] == 96.0

    def test_empty_metrics(self):
        tracker = AIMetricsTracker()
        summary = tracker.get_summary()
        assert summary["total_requests"] == 0
        assert summary["latency_ms"]["avg"] == 0.0
        assert summary["latency_ms"]["p50"] == 0.0
        assert summary["latency_ms"]["p90"] == 0.0
        assert summary["latency_ms"]["p95"] == 0.0
        assert summary["recent_spans"] == []

    def test_prometheus_exposition(self):
        tracker = AIMetricsTracker()
        tracker.record_request(
            route="chat",
            engine="groq",
            duration_ms=400.0,
            status="success",
            prompt_tokens=100,
            completion_tokens=20,
        )
        tracker.record_request(
            route="voice",
            engine="gemini",
            duration_ms=1200.0,
            status="fallback",
            prompt_tokens=150,
            completion_tokens=30,
        )
        tracker.record_request(
            route="chat",
            engine="",
            duration_ms=0.0,
            status="rate_limited",
        )
        tracker.record_request(
            route="chat",
            engine="",
            duration_ms=0.0,
            status="blocked_injection",
        )

        prom_text = tracker.export_prometheus()

        # Check Prometheus metric headers
        assert "# HELP ai_requests_total" in prom_text
        assert "# TYPE ai_requests_total counter" in prom_text
        assert 'ai_requests_total{engine="groq",status="success"} 1' in prom_text
        assert 'ai_requests_total{engine="gemini",status="fallback"} 1' in prom_text
        assert 'ai_requests_total{status="rate_limited"} 1' in prom_text
        assert 'ai_requests_total{status="blocked_injection"} 1' in prom_text

        # Latency summary
        assert "# HELP ai_latency_seconds" in prom_text
        assert "# TYPE ai_latency_seconds summary" in prom_text
        assert 'ai_latency_seconds{quantile="0.50"}' in prom_text
        assert 'ai_latency_seconds{quantile="0.90"}' in prom_text
        assert 'ai_latency_seconds{quantile="0.95"}' in prom_text

        # Token counters
        assert "# HELP ai_tokens_total" in prom_text
        assert "# TYPE ai_tokens_total counter" in prom_text
        assert 'ai_tokens_total{type="prompt"} 250' in prom_text
        assert 'ai_tokens_total{type="completion"} 50' in prom_text

    def test_reset_clears_metrics(self):
        tracker = AIMetricsTracker()
        tracker.record_request(
            route="chat",
            engine="groq",
            duration_ms=300.0,
            status="success",
            prompt_tokens=50,
            completion_tokens=10,
        )
        assert tracker.get_summary()["total_requests"] == 1

        tracker.reset()
        summary = tracker.get_summary()
        assert summary["total_requests"] == 0
        assert summary["success_count"] == 0
        assert summary["fallback_count"] == 0
        assert summary["rate_limited_count"] == 0
        assert summary["blocked_injection_count"] == 0
        assert summary["engine_distribution"]["groq"] == 0
        assert summary["engine_distribution"]["gemini"] == 0
        assert summary["tokens"]["total"] == 0
        assert summary["latency_ms"]["avg"] == 0.0
        assert summary["recent_spans"] == []

        prom_text = tracker.export_prometheus()
        assert 'ai_requests_total{engine="groq",status="success"} 0' in prom_text
        assert 'ai_tokens_total{type="prompt"} 0' in prom_text

    def test_max_history_retention(self):
        tracker = AIMetricsTracker(max_history=5)
        for i in range(10):
            tracker.record_request(
                route="chat",
                engine="groq",
                duration_ms=float(i * 10),
                status="success",
            )
        assert len(tracker.latencies_ms) == 5
        # Should retain the latest 5 (50, 60, 70, 80, 90)
        assert tracker.latencies_ms == [50.0, 60.0, 70.0, 80.0, 90.0]

    def test_thread_safety(self):
        tracker = AIMetricsTracker(max_history=1000)
        num_threads = 20
        requests_per_thread = 50

        def worker():
            for _ in range(requests_per_thread):
                tracker.record_request(
                    route="chat",
                    engine="groq",
                    duration_ms=100.0,
                    status="success",
                    prompt_tokens=10,
                    completion_tokens=5,
                )

        threads = [threading.Thread(target=worker) for _ in range(num_threads)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        summary = tracker.get_summary()
        expected_total = num_threads * requests_per_thread
        assert summary["total_requests"] == expected_total
        assert summary["success_count"] == expected_total
        assert summary["engine_distribution"]["groq"] == expected_total
        assert summary["tokens"]["prompt"] == expected_total * 10
        assert summary["tokens"]["completion"] == expected_total * 5

    def test_global_singleton_instance(self):
        assert isinstance(ai_metrics, AIMetricsTracker)
