"""Hardened entrypoint for the CygnusX-1 FastAPI service.

Run from the repository root with python runner.py or from backend/ with
python runner.py. Run python runner.py --check before starting a service.
For local browser development, scripts/ensure-api.mjs uses a private Unix
socket; for standalone API or containers, use the TCP listener. Do not expose
a laptop directly to the public internet.
"""
from __future__ import annotations

import argparse
import logging
import os
import stat
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


def _prepare_unix_socket(path_text: str) -> str:
    """Prepare a private local socket without deleting an arbitrary filesystem entry."""
    if os.name == "nt":
        raise RuntimeError("Unix-domain sockets are not supported by this runner on Windows; use TCP mode.")
    socket_path = Path(path_text).expanduser().resolve()
    socket_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        existing = socket_path.lstat()
    except FileNotFoundError:
        pass
    else:
        if not stat.S_ISSOCK(existing.st_mode):
            raise RuntimeError("Refusing to remove the configured socket path because it is not a Unix-domain socket.")
        socket_path.unlink()
    return str(socket_path)


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
    parser.add_argument("--host", default=None, help="TCP bind address; local development defaults to loopback")
    parser.add_argument("--port", type=int, default=os.environ.get("PORT", "8000"), help="TCP listening port")
    parser.add_argument("--workers", type=int, default=os.environ.get("WEB_CONCURRENCY", "1"), help="Uvicorn worker processes")
    parser.add_argument(
        "--max-concurrent-requests",
        type=int,
        default=os.environ.get("MAX_CONCURRENT_REQUESTS", "200"),
        help="Uvicorn concurrency limit per worker",
    )
    parser.add_argument("--log-level", default=os.environ.get("LOG_LEVEL", "info").lower(), help="debug, info, warning, error, or critical")
    parser.add_argument("--uds", default=None, help="Unix-domain socket path for the local Vite proxy")
    parser.add_argument("--reload", action="store_true", help="enable development auto-reload; forbidden in production")
    return parser


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)

    log_level = str(args.log_level).lower()
    if log_level not in _LOG_LEVELS:
        parser.error("--log-level must be one of: debug, info, warning, error, critical")

    environment = settings.app_env.strip().lower()
    try:
        _positive_int("PORT", args.port, minimum=1, maximum=65535)
        _positive_int("WEB_CONCURRENCY", args.workers, minimum=1, maximum=16)
        _positive_int("MAX_CONCURRENT_REQUESTS", args.max_concurrent_requests, minimum=1)
        validate_runtime_config()
        if args.uds and os.name == "nt":
            raise RuntimeError("Unix-domain sockets are not supported by this runner on Windows; use TCP mode.")
        if args.reload and environment in _PRODUCTION_ENVS:
            raise RuntimeError("--reload is a development-only option and is forbidden in production.")
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
            LOG.error("Database connectivity check failed (%s).", type(exc).__name__)
            raise RuntimeError("Database connectivity check failed; verify DATABASE_URL and database availability.") from exc
        LOG.info("Runtime preflight passed (environment=%s).", settings.app_env)
        return

    default_host = "0.0.0.0" if environment in _PRODUCTION_ENVS else "127.0.0.1"
    host = (args.host or os.environ.get("HOST") or default_host).strip()
    if not args.uds and (not host or any(char.isspace() for char in host)):
        parser.error("HOST/--host must be a non-empty TCP bind address without whitespace.")

    uds_path: str | None = None
    if args.uds:
        try:
            uds_path = _prepare_unix_socket(args.uds)
        except RuntimeError as exc:
            parser.error(str(exc))

    if not uds_path and host in {"0.0.0.0", "::"} and environment not in _PRODUCTION_ENVS:
        LOG.warning("Binding to all interfaces outside production. Restrict firewall rules; never expose a dev laptop to the public internet.")

    if args.workers > 1:
        LOG.warning("Using multiple workers. Request metrics are in-memory and per-worker; use external telemetry for fleet-wide KPIs.")

    import uvicorn

    access_log = os.environ.get("ACCESS_LOG", "false").strip().lower() in {"1", "true", "yes", "on"}
    forwarded_allow_ips = os.environ.get("FORWARDED_ALLOW_IPS", "127.0.0.1").strip()
    if uds_path:
        LOG.info("Starting CygnusX-1 API on private Unix socket %s (environment=%s, reload=%s)", uds_path, settings.app_env, args.reload)
        # Limit local socket permissions to the current OS user/group.
        previous_umask = os.umask(0o077)
    else:
        LOG.info(
            "Starting CygnusX-1 API on TCP %s:%d (environment=%s, workers=%d, access_log=%s)",
            host,
            args.port,
            settings.app_env,
            args.workers,
            access_log,
        )
        previous_umask = None

    try:
        uvicorn.run(
            "app.main:app",
            app_dir=str(BACKEND_DIR),
            host=host,
            port=args.port,
            uds=uds_path,
            reload=args.reload,
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
    finally:
        if previous_umask is not None:
            os.umask(previous_umask)


if __name__ == "__main__":
    main()
