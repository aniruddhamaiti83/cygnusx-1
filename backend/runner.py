"""Hardened entrypoint for the CygnusX-1 FastAPI service.

Run from the repository root with python runner.py or from backend/ with
python runner.py. Run python runner.py --check before starting a service.
Keep local development bound to loopback; use a TLS/authenticated gateway for
remote users rather than exposing a laptop directly to the public internet.
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
from pathlib import Path
from urllib.parse import urlsplit

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.settings import settings  # noqa: E402

LOG = logging.getLogger("cygnusx1.runner")
_PRODUCTION_ENVS = {"production", "prod"}
_LOG_LEVELS = {"critical", "error", "warning", "info", "debug"}


def _looks_placeholder(value: str) -> bool:
    lowered = value.strip().lower()
    return not lowered or any(
        marker in lowered
        for marker in (
            "change-me",
            "changeme",
            "dev-secret",
            "replace-with",
            "placeholder",
            "example",
        )
    )


def validate_runtime_config() -> None:
    """Fail closed on high-risk production misconfiguration."""
    environment = settings.app_env.strip().lower()
    if not environment:
        raise RuntimeError("APP_ENV must not be empty.")

    if settings.llm_timeout <= 0:
        raise RuntimeError("LLM_TIMEOUT must be greater than zero.")
    if settings.session_days < 1 or settings.session_days > 365:
        raise RuntimeError("SESSION_DAYS must be between 1 and 365.")

    database_url = settings.database_url.strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL must not be empty.")

    if environment not in _PRODUCTION_ENVS:
        return

    secret_key = settings.secret_key.strip()
    if len(secret_key) < 32 or _looks_placeholder(secret_key):
        raise RuntimeError(
            "Production requires SECRET_KEY with at least 32 random, non-placeholder characters."
        )

    dashboard_token = settings.dashboard_token.strip()
    if len(dashboard_token) < 32 or _looks_placeholder(dashboard_token):
        raise RuntimeError(
            "Production requires DASHBOARD_TOKEN with at least 32 random, non-placeholder characters."
        )
    if dashboard_token == secret_key:
        raise RuntimeError("DASHBOARD_TOKEN and SECRET_KEY must be different secrets.")

    database_scheme = urlsplit(database_url).scheme.lower()
    if not database_scheme.startswith("postgresql") and database_scheme != "postgres":
        raise RuntimeError("Production requires PostgreSQL; SQLite is for local development only.")

    origins = [item.strip() for item in settings.cors_origins.split(",") if item.strip()]
    if not origins or "*" in origins:
        raise RuntimeError("Production CORS_ORIGINS must list explicit browser origins; wildcard is forbidden.")
    for origin in origins:
        parsed = urlsplit(origin)
        if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password:
            raise RuntimeError("Every production CORS_ORIGINS value must be an HTTPS origin.")
        if parsed.path not in {"", "/"} or parsed.query or parsed.fragment:
            raise RuntimeError("CORS_ORIGINS values must be origins only (no path, query, or fragment).")


def check_database() -> None:
    """Check DB connectivity without creating or modifying application tables."""
    from sqlalchemy import text
    from app.db import engine

    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    LOG.info("Database connectivity check passed (dialect=%s).", engine.dialect.name)


def _positive_int(name: str, value: int, *, minimum: int, maximum: int | None = None) -> int:
    if value < minimum or (maximum is not None and value > maximum):
        bounds = f"{minimum}..{maximum}" if maximum is not None else f">= {minimum}"
        raise RuntimeError(f"{name} must be {bounds}.")
    return value


def build_parser() -> argparse.ArgumentParser:
    """Build CLI options while retaining platform-provided environment defaults."""
    parser = argparse.ArgumentParser(
        description="CygnusX-1 API server",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--check", action="store_true", help="validate configuration and database connectivity, then exit")
    parser.add_argument("--host", default=None, help="bind address; local development defaults to loopback")
    parser.add_argument("--port", type=int, default=os.environ.get("PORT", "8000"), help="HTTP listening port")
    parser.add_argument("--workers", type=int, default=os.environ.get("WEB_CONCURRENCY", "1"), help="Uvicorn worker processes")
    parser.add_argument(
        "--max-concurrent-requests",
        type=int,
        default=os.environ.get("MAX_CONCURRENT_REQUESTS", "200"),
        help="Uvicorn concurrency limit per worker",
    )
    parser.add_argument("--log-level", default=os.environ.get("LOG_LEVEL", "info").lower(), help="debug, info, warning, error, or critical")
    return parser


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)

    log_level = str(args.log_level).lower()
    if log_level not in _LOG_LEVELS:
        parser.error("--log-level must be one of: debug, info, warning, error, critical")

    try:
        _positive_int("PORT", args.port, minimum=1, maximum=65535)
        _positive_int("WEB_CONCURRENCY", args.workers, minimum=1, maximum=16)
        _positive_int("MAX_CONCURRENT_REQUESTS", args.max_concurrent_requests, minimum=1)
        validate_runtime_config()
    except RuntimeError as exc:
        parser.error(str(exc))

    logging.basicConfig(
        level=log_level.upper(),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    if args.check:
        try:
            check_database()
        except Exception as exc:
            # Deliberately avoid logging exception details: DB errors can expose hosts
            # or connection metadata. The original exception remains chained for debugging.
            LOG.error("Database connectivity check failed (%s).", type(exc).__name__)
            raise RuntimeError("Database connectivity check failed; verify DATABASE_URL and database availability.") from exc
        LOG.info("Runtime preflight passed (environment=%s).", settings.app_env)
        return

    default_host = "0.0.0.0" if settings.app_env.strip().lower() in _PRODUCTION_ENVS else "127.0.0.1"
    host = (args.host or os.environ.get("HOST") or default_host).strip()
    if not host or any(char.isspace() for char in host):
        parser.error("HOST/--host must be a non-empty bind address without whitespace.")

    if host in {"0.0.0.0", "::"} and settings.app_env.strip().lower() not in _PRODUCTION_ENVS:
        LOG.warning(
            "Binding to all interfaces outside production. Verify firewall rules and do not expose this laptop to the public internet."
        )

    if args.workers > 1:
        LOG.warning(
            "Using multiple workers. Request metrics are in-memory and per-worker; use external telemetry for fleet-wide KPIs."
        )

    import uvicorn

    access_log = os.environ.get("ACCESS_LOG", "false").strip().lower() in {"1", "true", "yes", "on"}
    forwarded_allow_ips = os.environ.get("FORWARDED_ALLOW_IPS", "127.0.0.1").strip()
    LOG.info(
        "Starting CygnusX-1 API (environment=%s, host=%s, port=%d, workers=%d, access_log=%s)",
        settings.app_env,
        host,
        args.port,
        args.workers,
        access_log,
    )
    uvicorn.run(
        "app.main:app",
        app_dir=str(BACKEND_DIR),
        host=host,
        port=args.port,
        workers=args.workers,
        log_level=log_level,
        access_log=access_log,
        proxy_headers=True,
        forwarded_allow_ips=forwarded_allow_ips,
        server_header=False,
        timeout_keep_alive=10,
        timeout_graceful_shutdown=30,
        limit_concurrency=args.max_concurrent_requests,
    )


if __name__ == "__main__":
    main()
