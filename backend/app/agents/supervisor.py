from sqlalchemy.orm import Session

from .. import models
from ..catalog import STAGE_WORKERS
from . import workers
from .llm import llm_status


def dispatch(db: Session, process: models.Process, extra: dict | None = None) -> dict:
    extra = extra or {}
    allowed = STAGE_WORKERS.get(process.current_stage, [])
    db.add(
        models.AgentEvent(
            process_id=process.process_id,
            stage=process.current_stage,
            agent_id="supervisor",
            agent_name="Supervisor / planner",
            kind="supervisor",
            action="dispatch",
            detail=f"Dispatching {', '.join(allowed)} for {process.current_stage}.",
            provider=llm_status().get("label", ""),
        )
    )
    results: dict = {"stage": process.current_stage, "workers": allowed, "ran": []}
    for agent_id in allowed:
        if agent_id == "consumerCredit":
            workers.run_consumer_credit(
                db,
                process,
                extra.get("consumerSource", "equifax"),
                extra.get("consumerProduct", "fico9"),
            )
        elif agent_id == "commercialCredit":
            workers.run_commercial_credit(
                db,
                process,
                extra.get("businessSource", "experianBusiness"),
                extra.get("businessProduct", "intelliscorePlus"),
            )
        elif agent_id == "sanctions":
            workers.run_sanctions(db, process)
        elif agent_id == "processing":
            workers.run_kyb(db, process, extra.get("kybSource", "sos"))
        elif agent_id == "collateral":
            workers.run_collateral_agent(db, process)
        elif agent_id == "policy":
            workers.run_scorecard(db, process)
        elif agent_id == "evaluator":
            workers.run_evaluator(db, process)
        elif agent_id == "docs":
            workers.run_docs_agent(db, process)
        elif agent_id == "funding":
            workers.run_funding_agent(db, process)
        results["ran"].append(agent_id)
    db.commit()
    return results
