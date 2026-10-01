"""LangGraph supervisor for the origination swarm.

Stage agents live in swarm.py. This module routes the file's current stage
to that agent and commits once.
"""

from __future__ import annotations

import contextvars
from typing import Any

from langgraph.graph import END, START, StateGraph

from .. import models
from ..catalog import STAGE_WORKERS
from .llm import llm_status
from .state import OriginationState, initial_origination_state
from .swarm import BY_STAGE, architecture

ARCHITECTURE: list[dict[str, Any]] = architecture()

_CTX: contextvars.ContextVar[tuple[Any, models.Process, dict]] = contextvars.ContextVar("cx1_graph")


def _bind() -> tuple[Any, models.Process, dict]:
    return _CTX.get()


def _supervisor(state: OriginationState) -> dict:
    db, process, _extra = _bind()
    stage = BY_STAGE.get(process.current_stage)
    names = ", ".join(agent.name for agent in stage.agents) if stage else "none"
    db.add(
        models.AgentEvent(
            process_id=process.process_id,
            stage=process.current_stage,
            agent_id="supervisor",
            agent_name="Supervisor / planner",
            kind="supervisor",
            action="dispatch",
            detail=f"Stage {process.current_stage}. Agents: {names}.",
            provider=llm_status().get("label", ""),
        )
    )
    return {"stage": process.current_stage, "detail": stage.name if stage else ""}


def _run_stage(state: OriginationState) -> dict:
    db, process, extra = _bind()
    stage = BY_STAGE[state["stage"]]
    ran = stage.run(db, process, extra)
    return {"ran": ran, "gate": stage.gate, "detail": stage.gate}


def _route(state: OriginationState) -> str:
    if state.get("stage") in BY_STAGE:
        return "stage"
    return "end"


def build_origination_graph():
    graph = StateGraph(OriginationState)
    graph.add_node("supervisor", _supervisor)
    graph.add_node("stage", _run_stage)
    graph.add_edge(START, "supervisor")
    graph.add_conditional_edges("supervisor", _route, {"stage": "stage", "end": END})
    graph.add_edge("stage", END)
    return graph.compile()


_COMPILED = None


def graph():
    global _COMPILED
    if _COMPILED is None:
        _COMPILED = build_origination_graph()
    return _COMPILED


def run_current_stage(db, process: models.Process, extra: dict | None = None) -> dict:
    """Run the supervisor for whatever stage the file is on. One commit."""
    token = _CTX.set((db, process, extra or {}))
    try:
        out = graph().invoke(initial_origination_state(process.process_id, process.current_stage))
    finally:
        _CTX.reset(token)
    db.commit()
    ran = list(out.get("ran") or [])
    return {
        "stage": process.current_stage,
        "workers": STAGE_WORKERS.get(process.current_stage, []),
        "ran": ran,
    }
