"""Credit decision: three LangGraph agents, then a grounded proposal.

1. Credit — scores captured at Pre-application.
2. Collateral — pledges (lease, machine, land, property) and insurance.
3. Statements — account statements submitted at Processing.

The proposal is releasable only at >= 97% confidence and <= 3% hallucination.
Every figure in the memo has to appear in the evidence packet. LangSmith
tracing is on when LANGSMITH_API_KEY or LANGCHAIN_API_KEY is present.
"""

from __future__ import annotations

import os
import re
import uuid
from typing import Any

from langgraph.graph import END, START, StateGraph

from .llm import invoke_json
from .state import CreditState

MIN_CONFIDENCE = 0.97
MAX_HALLUCINATION = 0.03

_KIND = {
    "realEstate": "property",
    "property": "property",
    "land": "land",
    "equipment": "machine",
    "machine": "machine",
    "vehicle": "machine",
    "lease": "lease",
    "accountsReceivable": "other",
    "inventory": "other",
    "other": "other",
}


def _nums(text: str) -> list[str]:
    return [n.replace(",", "") for n in re.findall(r"\d[\d,]*(?:\.\d+)?", text or "")]


def _evidence_numbers(evidence: dict) -> set[str]:
    blob = str(evidence)
    found = set(_nums(blob))
    # Integers that were stored as 712.0 still match "712".
    extra = set()
    for n in found:
        if "." in n:
            whole, frac = n.split(".", 1)
            if set(frac) <= {"0"}:
                extra.add(whole)
    return found | extra


def credit_agent(state: CreditState) -> dict:
    evidence = state["evidence"]
    scores = []
    for pull in evidence.get("pulls") or []:
        if pull.get("score") is None and not pull.get("scoreType"):
            continue
        scores.append(
            {
                "party": pull.get("partyKind"),
                "score": pull.get("score"),
                "scoreType": pull.get("scoreType") or "",
                "outcome": pull.get("outcome"),
                "lastCheckedAt": pull.get("lastCheckedAt"),
                "yearsSinceFirstCredit": pull.get("yearsSinceFirstCredit"),
                "outstandingAmount": pull.get("outstandingAmount"),
                "utilizationPct": pull.get("utilizationPct"),
                "openTradelines": pull.get("openTradelines"),
                "pastDueAmount": pull.get("pastDueAmount"),
            }
        )
    fraud = evidence.get("fraud")
    summary = (
        f"{len(scores)} credit score(s) on file from Pre-application."
        if scores
        else "No credit score was stored at Pre-application."
    )
    if fraud:
        summary += f" Fraud screen outcome: {fraud.get('outcome')}."
    return {
        "credit": {
            "agent": "credit",
            "name": "Credit",
            "scores": scores,
            "fraud": fraud,
            "hasScore": bool(scores),
            "scoreCount": len(scores),
            "summary": summary,
        }
    }


def collateral_agent(state: CreditState) -> dict:
    evidence = state["evidence"]
    buckets = {"lease": [], "machine": [], "land": [], "property": [], "other": []}
    pledges = []
    for row in evidence.get("pledges") or []:
        bucket = _KIND.get(row.get("kind") or "", "other")
        pledges.append({**row, "bucket": bucket})
        buckets[bucket].append(row.get("label") or row.get("kind"))
    policies = evidence.get("insurance") or []
    bits = []
    for key in ("lease", "machine", "land", "property"):
        if buckets[key]:
            bits.append(f"{key} ({len(buckets[key])})")
    summary = (
        "Pledges: " + ", ".join(bits) + f". Insurance policies: {len(policies)}."
        if pledges
        else "No collateral pledge on this loan."
    )
    return {
        "collateral": {
            "agent": "collateral",
            "name": "Collateral",
            "pledges": pledges,
            "pledgeCount": len(pledges),
            "buckets": {k: v for k, v in buckets.items() if v},
            "insuranceCount": len(policies),
            "summary": summary,
        }
    }


def statement_agent(state: CreditState) -> dict:
    evidence = state["evidence"]
    years = list(evidence.get("statements") or [])
    years.sort(key=lambda r: r.get("year") or 0, reverse=True)
    if len(years) >= 2:
        labels = ", ".join(str(r.get("year")) for r in years)
        summary = f"Account statements on file for {labels}, submitted at Processing."
    elif len(years) == 1:
        summary = f"Only {years[0].get('year')} is on the Processing pack. At least two years are required."
    else:
        summary = "No account statements were submitted at Processing."
    return {
        "statements": {
            "agent": "statements",
            "name": "Statements",
            "years": years,
            "yearCount": len(years),
            "summary": summary,
        }
    }


def _deterministic_memo(state: CreditState, action: str) -> str:
    credit = state.get("credit") or {}
    collateral = state.get("collateral") or {}
    statements = state.get("statements") or {}
    evidence = state.get("evidence") or {}
    parts = [
        f"Proposal for {evidence.get('business') or 'the borrower'} on loan {evidence.get('amount') or '—'}."
    ]
    if credit.get("scores"):
        bits = [
            f"{s.get('scoreType') or 'score'} {s.get('score')} ({s.get('outcome')})"
            for s in credit["scores"]
        ]
        parts.append("Credit: " + "; ".join(bits) + ".")
    else:
        parts.append("Credit: none on file.")
    parts.append(collateral.get("summary") or "Collateral: none.")
    if statements.get("years"):
        yr = ", ".join(
            f"{r.get('year')} revenue {r.get('revenue')}" for r in statements["years"]
        )
        parts.append(f"Statements: {yr}.")
    else:
        parts.append("Statements: none.")
    parts.append(f"Recommendation to the underwriter: {action}. This memo cites only stored file facts.")
    return " ".join(parts)


def propose(state: CreditState) -> dict:
    credit = state.get("credit") or {}
    collateral = state.get("collateral") or {}
    statements = state.get("statements") or {}
    passes = [s for s in credit.get("scores") or [] if s.get("outcome") == "pass"]
    fails = [s for s in credit.get("scores") or [] if s.get("outcome") == "fail"]
    action = "reject" if fails and not passes else "approve"
    memo = _deterministic_memo(state, action)
    packet = {
        "credit": credit.get("summary"),
        "collateral": collateral.get("summary"),
        "statements": statements.get("summary"),
        "facts": state.get("evidence"),
    }
    data, status = invoke_json(
        "You write the underwriter proposal for CygnusX-1. Use ONLY numbers and facts in the packet. "
        "Do not invent scores, balances, guaranty numbers, or years. Return JSON only: "
        '{"narrative": string, "recommendedAction": "approve"|"reject"}.',
        str({"recommendedAction": action, "groundedMemo": memo, "packet": packet}),
    )
    narrative = (data.get("narrative") or memo).strip()
    recommended = data.get("recommendedAction") if data.get("recommendedAction") in ("approve", "reject") else action
    return {
        "proposal": {
            "recommendedAction": recommended,
            "narrative": narrative,
            "groundedMemo": memo,
            "provider": status.get("provider", ""),
            "model": status.get("model", ""),
            "label": status.get("label", ""),
        }
    }


def critic(state: CreditState) -> dict:
    evidence = state.get("evidence") or {}
    proposal = state.get("proposal") or {}
    allowed = _evidence_numbers(evidence)
    # Years and small counts also appear in agent summaries built from evidence.
    for block in (state.get("credit"), state.get("collateral"), state.get("statements")):
        allowed |= _evidence_numbers(block or {})
    narrative = proposal.get("narrative") or ""
    nums = _nums(narrative)
    bad = [n for n in nums if n not in allowed and n.lstrip("0") not in allowed]
    rate = (len(bad) / len(nums)) if nums else 0.0
    used = narrative
    if rate > MAX_HALLUCINATION:
        used = proposal.get("groundedMemo") or narrative
        nums = _nums(used)
        bad = [n for n in nums if n not in allowed and n.lstrip("0") not in allowed]
        rate = (len(bad) / len(nums)) if nums else 0.0
    credit_ok = bool((state.get("credit") or {}).get("hasScore"))
    coll_ok = (state.get("collateral") or {}).get("pledgeCount", 0) > 0
    stmt_ok = (state.get("statements") or {}).get("yearCount", 0) >= 2
    present = sum((credit_ok, coll_ok, stmt_ok))
    if present == 3 and rate <= MAX_HALLUCINATION:
        confidence = 0.98
    else:
        confidence = round(min(0.96, 0.62 + 0.10 * present), 2)
    gaps = []
    if not credit_ok:
        gaps.append("No credit score from Pre-application.")
    if not coll_ok:
        gaps.append("No collateral pledge (lease, machine, land, or property).")
    if not stmt_ok:
        gaps.append("Fewer than two years of account statements from Processing.")
    if rate > MAX_HALLUCINATION:
        gaps.append("Proposal cited figures that are not on the file.")
    releasable = confidence >= MIN_CONFIDENCE and rate <= MAX_HALLUCINATION and not gaps
    action = proposal.get("recommendedAction") or "approve"
    if not releasable:
        action = "hold"
    return {
        "critic": {
            "narrative": used,
            "recommendedAction": action,
            "confidence": confidence,
            "hallucination": round(rate, 4),
            "releasable": releasable,
            "gaps": gaps,
            "unsupported": bad[:8],
        }
    }


def build_credit_graph():
    graph = StateGraph(CreditState)
    graph.add_node("credit", credit_agent)
    graph.add_node("collateral", collateral_agent)
    graph.add_node("statements", statement_agent)
    graph.add_node("propose", propose)
    graph.add_node("critic", critic)
    graph.add_edge(START, "credit")
    graph.add_edge("credit", "collateral")
    graph.add_edge("collateral", "statements")
    graph.add_edge("statements", "propose")
    graph.add_edge("propose", "critic")
    graph.add_edge("critic", END)
    return graph.compile()


_COMPILED: Any = None


def invoke_credit_graph(evidence: dict) -> dict:
    global _COMPILED
    if _COMPILED is None:
        _COMPILED = build_credit_graph()
    run_id = str(uuid.uuid4())
    key = os.environ.get("LANGSMITH_API_KEY") or os.environ.get("LANGCHAIN_API_KEY") or ""
    if key:
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ.setdefault("LANGCHAIN_PROJECT", "cygnusx-1")
    config = {
        "run_id": run_id,
        "run_name": "cygnusx-1 credit decision",
        "tags": ["cygnusx-1", "underwriter"],
        "metadata": {
            "processNumber": evidence.get("processNumber") or "",
            "langsmith": bool(key),
        },
    }
    result = _COMPILED.invoke({"evidence": evidence}, config)
    result["traceId"] = run_id
    result["langsmith"] = bool(key)
    return result
