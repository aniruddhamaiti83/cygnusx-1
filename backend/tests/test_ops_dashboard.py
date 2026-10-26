"""Smoke tests for operations dashboard and low-cardinality metrics."""
import os
import tempfile
import unittest

_DB = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_DB.name}")
os.environ.setdefault("SECRET_KEY", "test-only-secret-key-for-cx1")
os.environ.setdefault("APP_ENV", "development")
os.environ.setdefault("DASHBOARD_TOKEN", "")

from fastapi.testclient import TestClient  # noqa: E402
from app.main import create_app  # noqa: E402
from app.observability import MetricsRegistry  # noqa: E402


class OperationsDashboardTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(create_app())

    def test_dashboard_html_is_served_with_no_store(self):
        response = self.client.get("/dashboard")
        self.assertEqual(response.status_code, 200)
        self.assertIn("CygnusX-1 Operations", response.text)
        self.assertEqual(response.headers.get("cache-control"), "no-store")

    def test_metrics_payload_has_resource_and_latency_sections(self):
        response = self.client.get("/api/cx1/ops/metrics")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("compute", payload)
        self.assertIn("storage", payload)
        self.assertIn("database", payload)
        self.assertIn("latencyMs", payload["http"])
        self.assertIn("p95", payload["http"]["latencyMs"])

    def test_registry_ignores_metrics_endpoint_and_computes_percentiles(self):
        registry = MetricsRegistry(sample_limit=4)
        registry.record("GET", "/health", 200, 10)
        registry.record("GET", "/api/cx1/ops/metrics", 200, 900)
        registry.record("POST", "/save", 500, 30)
        summary = registry.snapshot()
        self.assertEqual(summary["requestsTotal"], 2)
        self.assertEqual(summary["errorRatePercent"], 50.0)
        self.assertEqual(summary["latencyMs"]["max"], 30.0)
        self.assertEqual(summary["latencyMs"]["sampleWindow"], 2)

if __name__ == "__main__":
    unittest.main()
