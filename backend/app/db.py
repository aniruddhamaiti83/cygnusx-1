from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .settings import BACKEND_ROOT, settings


class Base(DeclarativeBase):
    pass


def _engine_url() -> str:
    url = settings.database_url
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://") and "+psycopg" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    if url.startswith("sqlite"):
        (BACKEND_ROOT / "data").mkdir(exist_ok=True)
    return url


connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(_engine_url(), connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _add_columns(table: str, additions: list[tuple[str, str]]) -> None:
    """create_all does not add columns to an existing table."""
    insp = inspect(engine)
    if table not in insp.get_table_names():
        return
    have = {c["name"] for c in insp.get_columns(table)}
    pending = [(name, ddl) for name, ddl in additions if name not in have]
    if not pending:
        return
    with engine.begin() as conn:
        for name, ddl in pending:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))


def _ensure_schema_columns() -> None:
    pg = engine.dialect.name.startswith("postgres")
    dt = "TIMESTAMP" if pg else "DATETIME"
    fl = "DOUBLE PRECISION" if pg else "FLOAT"
    _add_columns(
        "credit_pulls",
        [
            ("score_type", "VARCHAR(64) DEFAULT ''"),
            ("last_checked_at", dt),
            ("years_since_first_credit", "INTEGER"),
            ("outstanding_amount", fl),
            ("utilization_pct", fl),
            ("open_tradelines", "INTEGER"),
            ("past_due_amount", fl),
        ],
    )
    _add_columns(
        "sba_profiles",
        [
            ("mock_report_json", "TEXT DEFAULT ''"),
            ("sam_status", "VARCHAR(32) DEFAULT ''"),
            ("size_standard", "VARCHAR(96) DEFAULT ''"),
            ("eligibility_status", "VARCHAR(32) DEFAULT ''"),
            ("ran_at", dt),
            ("actor", "VARCHAR(128) DEFAULT ''"),
            ("artefact_id", "VARCHAR(36) DEFAULT ''"),
            ("provider", "VARCHAR(64) DEFAULT ''"),
        ],
    )
    _add_columns(
        "scorecard_results",
        [
            ("hallucination", f"{fl} DEFAULT 1"),
            ("releasable", "BOOLEAN DEFAULT 0"),
            ("trace_id", "VARCHAR(64) DEFAULT ''"),
            ("brief_json", "TEXT DEFAULT '{}'"),
        ],
    )


def init_db():
    from . import models  # noqa: F401

    if settings.database_url.startswith("sqlite"):
        Path(BACKEND_ROOT / "data").mkdir(exist_ok=True)
    Base.metadata.create_all(bind=engine)
    _ensure_schema_columns()
