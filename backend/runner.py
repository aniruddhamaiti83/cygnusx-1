"""Production-aware entrypoint for the CygnusX-1 FastAPI service.
Run from the repo root with python runner.py, or from backend/ with python runner.py.
Use python runner.py --check to validate runtime config and database connectivity.
"""
from __future__ import annotations
import argparse
import logging
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
from app.settings import settings  # noqa: E402
LOG = logging.getLogger("cygnusx1.runner")

def validate_runtime_config() -> None:
    """Fail closed on insecure production configuration."""
    if settings.app_env.strip().lower() not in {"production", "prod"}:
        return
    def looks_placeholder(value: str) -> bool:
        lowered = value.strip().lower()
        return not lowered or any(
            marker in lowered
            for marker in ("change-me", "changeme", "dev-secret", "replace-with", "placeholder", "example")
        )

    secret = settings.secret_key.strip()
    if len(secret) < 32 or looks_placeholder(secret):
        raise RuntimeError("Production requires SECRET_KEY with 32+ random, non-placeholder characters.")
    dashboard_token = settings.dashboard_token.strip()
    if len(dashboard_token) < 32 or looks_placeholder(dashboard_token):
        raise RuntimeError("Production requires DASHBOARD_TOKEN with 32+ random, non-placeholder characters.")
    if settings.database_url.lower().startswith("sqlite"):
        raise RuntimeError("Production requires PostgreSQL; SQLite is for local development only.")
    origins = [item.strip() for item in settings.cors_origins.split(",") if item.strip()]
    if not origins or "*" in origins:
        raise RuntimeError("Production CORS_ORIGINS must contain explicit browser origins.")
    if any(not origin.startswith("https://") for origin in origins):
        raise RuntimeError("Production CORS_ORIGINS must use HTTPS origins only.")

def check_database() -> None:
    from sqlalchemy import text
    from app.db import engine
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    LOG.info("Database connectivity check passed (%s).", engine.dialect.name)

def main() -> None:
    parser = argparse.ArgumentParser(description="CygnusX-1 API runner")
    parser.add_argument("--check", action="store_true", help="validate config and DB connectivity")
    args = parser.parse_args()
    logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO").upper(), format="%(asctime)s %(levelname)s %(name)s %(message)s")
    validate_runtime_config()
    if args.check:
        check_database()
        LOG.info("Runtime preflight passed.")
        return
    import uvicorn
    try:
        port = int(os.environ.get("PORT", "8000"))
        workers = int(os.environ.get("WEB_CONCURRENCY", "1"))
        limit_concurrency = int(os.environ.get("MAX_CONCURRENT_REQUESTS", "200"))
    except ValueError as exc:
        raise RuntimeError("PORT, WEB_CONCURRENCY and MAX_CONCURRENT_REQUESTS must be integers.") from exc
    if not 1 <= port <= 65535:
        raise RuntimeError("PORT must be in range 1..65535.")
    if not 1 <= workers <= 16 or limit_concurrency < 1:
        raise RuntimeError("WEB_CONCURRENCY must be 1..16 and MAX_CONCURRENT_REQUESTS must be positive.")
    default_host = "0.0.0.0" if settings.app_env.strip().lower() in {"production", "prod"} else "127.0.0.1"
    host = os.environ.get("HOST", default_host).strip() or default_host
    LOG.info("Starting CygnusX-1 API (environment=%s, host=%s, port=%d, workers=%d)", settings.app_env, host, port, workers)
    if workers > 1:
        LOG.warning("In-memory request metrics are per-worker; use external monitoring for fleet-wide KPIs.")
    uvicorn.run("app.main:app", app_dir=str(BACKEND_DIR), host=host, port=port, workers=workers,
        log_level=os.environ.get("LOG_LEVEL", "info").lower(), access_log=True, proxy_headers=True,
        forwarded_allow_ips=os.environ.get("FORWARDED_ALLOW_IPS", "127.0.0.1"), timeout_keep_alive=10,
        limit_concurrency=limit_concurrency)

if __name__ == "__main__":
    main()
