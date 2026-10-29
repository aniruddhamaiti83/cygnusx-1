"""Low-overhead, process-local runtime telemetry for the CygnusX-1 API.

Metrics never capture request bodies, headers, query strings, customer identifiers,
or other borrower PII.
"""
from __future__ import annotations

import threading
import time
from collections import Counter, deque
from pathlib import Path
from typing import Any

import psutil
from sqlalchemy import inspect, text

from .db import engine
from .settings import settings

_STARTED_AT = time.time()
_PROCESS = psutil.Process()
_METRICS_PATH = "/api/cx1/ops/metrics"


class MetricsRegistry:
    """Thread-safe bounded request metrics; intended for a single app worker."""

    def __init__(self, sample_limit: int = 2000) -> None:
        self._lock = threading.Lock()
        self._samples: deque[tuple[float, float, int, str, str]] = deque(maxlen=sample_limit)
        self._counts: Counter[str] = Counter()
        self._status_counts: Counter[str] = Counter()

    def record(self, method: str, route: str, status: int, elapsed_ms: float) -> None:
        if route == _METRICS_PATH:
            return
        now = time.time()
        with self._lock:
            self._counts["requests_total"] += 1
            self._status_counts[str(status)] += 1
            self._samples.append((now, max(0.0, elapsed_ms), status, method, route))

    def snapshot(self) -> dict[str, Any]:
        now = time.time()
        with self._lock:
            samples = list(self._samples)
            counts = dict(self._counts)
            statuses = dict(self._status_counts)
        latencies = sorted(sample[1] for sample in samples)
        recent = [sample for sample in samples if now - sample[0] <= 60]
        total = counts.get("requests_total", 0)
        failures = sum(count for status, count in statuses.items() if int(status) >= 500)
        p50 = _percentile(latencies, 0.50)
        p95 = _percentile(latencies, 0.95)
        p99 = _percentile(latencies, 0.99)
        endpoint_counts: Counter[str] = Counter(f"{sample[3]} {sample[4]}" for sample in samples)
        return {
            "requestsTotal": total,
            "requestsLastMinute": len(recent),
            "requestsPerSecondLastMinute": round(len(recent) / 60.0, 3),
            "errorRatePercent": round((failures / total * 100.0) if total else 0.0, 3),
            "statusCounts": statuses,
            "latencyMs": {
                "p50": round(p50, 2),
                "p95": round(p95, 2),
                "p99": round(p99, 2),
                "max": round(latencies[-1] if latencies else 0.0, 2),
                "sampleWindow": len(latencies),
            },
            "topEndpoints": [
                {"endpoint": endpoint, "requests": count}
                for endpoint, count in endpoint_counts.most_common(8)
            ],
        }


def _percentile(values: list[float], percentile: float) -> float:
    if not values:
        return 0.0
    index = round((len(values) - 1) * percentile)
    return values[max(0, min(index, len(values) - 1))]


METRICS = MetricsRegistry()


def collect_runtime_metrics() -> dict[str, Any]:
    """Return live process, filesystem, database, and request diagnostics."""
    try:
        vm = psutil.virtual_memory()
        memory = {
            "systemTotalBytes": int(vm.total),
            "systemAvailableBytes": int(vm.available),
            "systemUsedPercent": round(float(vm.percent), 2),
            "processRssBytes": int(_PROCESS.memory_info().rss),
            "processThreads": int(_PROCESS.num_threads()),
        }
    except (psutil.Error, OSError):
        memory = {
            "systemTotalBytes": None, "systemAvailableBytes": None,
            "systemUsedPercent": None, "processRssBytes": None, "processThreads": None,
        }

    try:
        fs = psutil.disk_usage(str(Path.cwd()))
        storage = {
            "mount": str(Path.cwd()), "totalBytes": int(fs.total),
            "usedBytes": int(fs.used), "freeBytes": int(fs.free),
            "usedPercent": round(float(fs.percent), 2),
        }
    except (psutil.Error, OSError):
        storage = {
            "mount": str(Path.cwd()), "totalBytes": None, "usedBytes": None,
            "freeBytes": None, "usedPercent": None,
        }

    db_status, db_size_bytes, table_count = "healthy", None, None
    db_started = time.perf_counter()
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            if engine.dialect.name == "postgresql":
                db_size_bytes = int(
                    connection.execute(text("SELECT pg_database_size(current_database())")).scalar_one()
                )
            elif engine.dialect.name == "sqlite":
                db_path = engine.url.database
                if db_path and db_path != ":memory:":
                    try:
                        db_size_bytes = Path(db_path).stat().st_size
                    except OSError:
                        pass
        table_count = len(inspect(engine).get_table_names())
    except Exception:
        # Never emit exception text here; it may include host or credential details.
        db_status = "unavailable"

    try:
        cpu_percent = round(float(psutil.cpu_percent(interval=None)), 2)
    except (psutil.Error, OSError):
        cpu_percent = None

    from .agents.llm import llm_status
    llm = llm_status()
    return {
        "service": "CygnusX-1 API",
        "version": "0.3.0",
        "environment": settings.app_env,
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "uptimeSeconds": round(max(0.0, time.time() - _STARTED_AT), 1),
        "status": "healthy" if db_status == "healthy" else "degraded",
        "compute": {"cpuPercent": cpu_percent, **memory},
        "storage": storage,
        "database": {
            "status": db_status, "dialect": engine.dialect.name,
            "connectLatencyMs": round((time.perf_counter() - db_started) * 1000.0, 2),
            "sizeBytes": db_size_bytes, "tableCount": table_count,
        },
        "llm": {
            "provider": llm.get("provider", "unknown"),
            "model": llm.get("model", "unknown"),
            "configured": bool(llm.get("configured", False)),
        },
        "http": METRICS.snapshot(),
        "notes": [
            "CPU, memory, storage, and request latency are local to this container/process.",
            "HTTP latency percentiles use a bounded in-memory sample window and reset on restart.",
            "Use CloudWatch or Cloud Monitoring for retained, fleet-wide production telemetry.",
        ],
    }