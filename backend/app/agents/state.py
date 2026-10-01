"""LangGraph state schema for the origination swarm and the credit-decision graph.

Nodes return a partial update. List channels use a reducer so a later node
appends instead of wiping what an earlier node wrote. Database sessions are
not part of the state — they are not serializable and stay outside the graph.
"""

from __future__ import annotations

from typing import Annotated

from typing_extensions import NotRequired, TypedDict


def append(left: list[str] | None, right: list[str] | None) -> list[str]:
    """Reducer for agent ids. Both sides may be missing on the first write."""
    return [*(left or ()), *(right or ())]


class CreditPullFact(TypedDict, total=False):
    partyKind: str
    score: float | None
    scoreType: str
    outcome: str
    lastCheckedAt: str | None
    yearsSinceFirstCredit: float | None
    outstandingAmount: float | None
    utilizationPct: float | None
    openTradelines: int | None
    pastDueAmount: float | None
    artefactId: str


class FraudFact(TypedDict, total=False):
    outcome: str
    artefactId: str


class PledgeFact(TypedDict, total=False):
    label: str
    kind: str
    value: str
    location: str
    lienPosition: int
    pledgedValue: str
    bucket: str


class InsuranceFact(TypedDict, total=False):
    carrier: str
    coverageAmount: str
    expiresOn: str


class StatementYear(TypedDict, total=False):
    year: int
    revenue: float
    netIncome: float
    source: str


class Evidence(TypedDict, total=False):
    """Facts already stored on the file. Agents may only cite these."""

    processNumber: str
    customer: str | None
    business: str | None
    amount: str | None
    product: str | None
    pulls: list[CreditPullFact]
    fraud: FraudFact | None
    pledges: list[PledgeFact]
    insurance: list[InsuranceFact]
    statements: list[StatementYear]


class ScoreReading(TypedDict, total=False):
    party: str
    score: float | None
    scoreType: str
    outcome: str
    lastCheckedAt: str | None
    yearsSinceFirstCredit: float | None
    outstandingAmount: float | None
    utilizationPct: float | None
    openTradelines: int | None
    pastDueAmount: float | None


class CreditChannel(TypedDict):
    agent: str
    name: str
    scores: list[ScoreReading]
    fraud: FraudFact | None
    hasScore: bool
    scoreCount: int
    summary: str


class CollateralChannel(TypedDict):
    agent: str
    name: str
    pledges: list[PledgeFact]
    pledgeCount: int
    buckets: dict[str, list[str]]
    insuranceCount: int
    summary: str


class StatementChannel(TypedDict):
    agent: str
    name: str
    years: list[StatementYear]
    yearCount: int
    summary: str


class ProposalChannel(TypedDict):
    recommendedAction: str
    narrative: str
    groundedMemo: str
    provider: str
    model: str
    label: str


class CriticChannel(TypedDict):
    narrative: str
    recommendedAction: str
    confidence: float
    hallucination: float
    releasable: bool
    gaps: list[str]
    unsupported: list[str]


class CreditState(TypedDict):
    """Credit-decision graph. Evidence is the input. The other channels are filled in order."""

    evidence: Evidence
    credit: NotRequired[CreditChannel]
    collateral: NotRequired[CollateralChannel]
    statements: NotRequired[StatementChannel]
    proposal: NotRequired[ProposalChannel]
    critic: NotRequired[CriticChannel]
    traceId: NotRequired[str]
    langsmith: NotRequired[bool]


class OriginationState(TypedDict):
    """Supervisor graph. One invoke is one stage of the file."""

    process_id: str
    stage: str
    ran: Annotated[list[str], append]
    detail: NotRequired[str]
    gate: NotRequired[str]


def initial_origination_state(process_id: str, stage: str) -> OriginationState:
    return {
        "process_id": process_id,
        "stage": stage,
        "ran": [],
        "detail": "",
        "gate": "",
    }
