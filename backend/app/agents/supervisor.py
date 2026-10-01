from sqlalchemy.orm import Session

from .. import models
from .origination_graph import run_current_stage


def dispatch(db: Session, process: models.Process, extra: dict | None = None) -> dict:
    """Supervisor entry. The graph in origination_graph.py owns the stage routing."""
    return run_current_stage(db, process, extra)
