"""Origination swarm.

Each class is one agent. The supervisor in origination_graph.py runs only the
agents for the file's current stage. Agents write their own tables. None of
them write the underwriter's Decision.
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from .. import models
from . import workers


@dataclass(frozen=True)
class Agent:
    id: str
    name: str
    does: str


class Stage:
    """One stage of the file. `run` executes that stage's agents in order."""

    id: str
    name: str
    human: str
    gate: str
    agents: tuple[Agent, ...]

    def run(self, db: Session, process: models.Process, extra: dict) -> list[str]:
        raise NotImplementedError


class Intake(Stage):
    id = "intake"
    name = "Intake"
    human = "Elena Voss — relationship manager"
    gate = "Email verified. Business and Loan saved. No model call."
    agents = (
        Agent("cip", "CIP / identity", "Customer, email, address"),
        Agent("facility", "Facility keepers", "Business and Loan"),
    )

    def run(self, db: Session, process: models.Process, extra: dict) -> list[str]:
        # The relationship manager types the customer, the business, and the loan.
        # This stage has no model call.
        return [agent.id for agent in self.agents]


class PreApplication(Stage):
    id = "preApplication"
    name = "Pre-application"
    human = "Marcus Hale — credit · Priya Shah — fraud"
    gate = "Any one pass qualifies the customer."
    agents = (
        Agent("consumerCredit", "Consumer credit", "Score on the individual"),
        Agent("commercialCredit", "Commercial credit", "Score on the business"),
        Agent("sanctions", "Fraud", "OFAC / sanctions screen"),
    )

    def run(self, db: Session, process: models.Process, extra: dict) -> list[str]:
        workers.run_consumer_credit(
            db,
            process,
            extra.get("consumerSource", "equifax"),
            extra.get("consumerProduct", "fico9"),
        )
        workers.run_commercial_credit(
            db,
            process,
            extra.get("businessSource", "experianBusiness"),
            extra.get("businessProduct", "intelliscorePlus"),
        )
        workers.run_sanctions(db, process)
        return [agent.id for agent in self.agents]


class Processing(Stage):
    id = "processing"
    name = "Processing"
    human = "Jordan Kim — processor"
    gate = "KYB and SBA profile stored, including statement years."
    agents = (Agent("processing", "Processing pack", "KYB, SBA size, SAM, statements"),)

    def run(self, db: Session, process: models.Process, extra: dict) -> list[str]:
        workers.run_processing_pack(db, process, extra.get("kybSource", "sos"))
        return ["processing"]


class CollateralStage(Stage):
    id = "collateral"
    name = "Collateral"
    human = "Jordan Kim — processor"
    gate = "At least one pledge on the loan."
    agents = (
        Agent("collateral", "Collateral", "Lease, machine, land, property, insurance"),
    )

    def run(self, db: Session, process: models.Process, extra: dict) -> list[str]:
        workers.run_collateral_agent(db, process)
        return ["collateral"]


class CreditDecision(Stage):
    """Nested graph: Credit, Collateral, Statements, then the critic.

    The proposal is releasable only at >= 97% confidence and <= 3% hallucination.
    Diana Okonkwo approves, or rejects with a reason. This agent does not decide.
    """

    id = "underwriter"
    name = "Credit decision"
    human = "Diana Okonkwo — approve, or reject with a reason"
    gate = "Releasable proposal, then the underwriter decides. Approval moves the loan to Funding."
    agents = (
        Agent("credit", "Credit", "Reads scores from Pre-application"),
        Agent("collateralRead", "Collateral", "Reads pledges and insurance"),
        Agent("statements", "Statements", "Reads account statements"),
        Agent("critic", "Critic", "97% confidence, under 3% hallucination"),
    )

    def run(self, db: Session, process: models.Process, extra: dict) -> list[str]:
        workers.run_credit_decision(db, process)
        return [agent.id for agent in self.agents]


class Documents(Stage):
    id = "documents"
    name = "Documents"
    human = "Sam Ruiz — closer"
    gate = "Every document imaged and reviewed."
    agents = (Agent("docs", "Documentation", "Closing package checklist"),)

    def run(self, db: Session, process: models.Process, extra: dict) -> list[str]:
        workers.run_docs_agent(db, process)
        return ["docs"]


class Funding(Stage):
    id = "financing"
    name = "Funding"
    human = "Sam Ruiz — funding ops"
    gate = "Human authorizes the guaranty."
    agents = (Agent("funding", "Funding", "E-Tran. Does not invent a guaranty number."),)

    def run(self, db: Session, process: models.Process, extra: dict) -> list[str]:
        workers.run_funding_agent(db, process)
        return ["funding"]


class Closure(Stage):
    id = "closure"
    name = "Closure"
    human = "Sam Ruiz — funding ops"
    gate = "Dual-control post seals the file."
    agents = (
        Agent("funding", "Funding", "Ledger draft is not a post"),
        Agent("evaluator", "Evaluator", "Checks the package before seal"),
    )

    def run(self, db: Session, process: models.Process, extra: dict) -> list[str]:
        workers.run_funding_agent(db, process)
        workers.run_evaluator(db, process)
        return [agent.id for agent in self.agents]


# Order is the file. The supervisor picks the one that matches current_stage.
SWARM: tuple[Stage, ...] = (
    Intake(),
    PreApplication(),
    Processing(),
    CollateralStage(),
    CreditDecision(),
    Documents(),
    Funding(),
    Closure(),
)

BY_STAGE: dict[str, Stage] = {stage.id: stage for stage in SWARM}


def architecture() -> list[dict]:
    """Same shape the architecture diagram draws."""
    rows = []
    for index, stage in enumerate(SWARM, start=1):
        rows.append(
            {
                "id": stage.id,
                "n": f"{index:02d}",
                "name": stage.name,
                "human": stage.human,
                "agents": [{"id": a.id, "name": a.name, "does": a.does} for a in stage.agents],
                "gate": stage.gate,
            }
        )
    return rows
