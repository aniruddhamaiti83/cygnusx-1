from __future__ import annotations

import json

from sqlalchemy.orm import Session

from .. import models
from ..catalog import (
    BUSINESS_PRODUCTS,
    BUSINESS_SOURCES,
    CONSUMER_PRODUCTS,
    CONSUMER_SOURCES,
    staff_by_id,
)
from ..models import new_id, utcnow
from .llm import invoke_json


def _audit(db: Session, process_id: str, actor: str, action: str, entity: str, detail: str = "") -> None:
    db.add(
        models.AuditEvent(
            process_id=process_id, actor=actor, action=action, entity=entity, detail=detail[:2000]
        )
    )


def _event(
    db: Session,
    process: models.Process,
    agent_id: str,
    agent_name: str,
    kind: str,
    action: str,
    detail: str,
    artefact_id: str = "",
    confidence: float = 0,
    provider: str = "",
) -> models.AgentEvent:
    ev = models.AgentEvent(
        process_id=process.process_id,
        stage=process.current_stage,
        agent_id=agent_id,
        agent_name=agent_name,
        kind=kind,
        action=action,
        detail=detail[:4000],
        artefact_id=artefact_id,
        confidence=confidence,
        provider=provider,
    )
    db.add(ev)
    return ev


def _label(rows: list[dict], key: str) -> str:
    return next((r["label"] for r in rows if r["id"] == key), key)


def run_consumer_credit(db: Session, process: models.Process, source: str, product: str) -> models.CreditPull:
    customer = db.query(models.Customer).filter_by(process_id=process.process_id).first()
    if not customer:
        raise ValueError("Customer required.")
    existing = (
        db.query(models.CreditPull)
        .filter_by(process_id=process.process_id, party_kind="customer")
        .first()
    )
    name = f"{customer.first_name} {customer.last_name}"
    data, status = invoke_json(
        "You are the CygnusX-1 consumer credit worker. Return JSON only: "
        '{"score": number, "outcome": "pass"|"fail", "confidence": 0-1, "summary": string, "factors": string[]}. '
        "FCRA: one pull keyed (partyId, processId). Score >= 640 is pass. SBSS is not the gate.",
        f"Consumer credit pull. Customer={name}. Source={source}. Product={product}. "
        f"Process={process.process_id}. Last4={customer.ssn_last4}. DOB year={(customer.dob or '')[:4]}.",
    )
    score = float(data.get("score") or 712)
    outcome = data.get("outcome") or ("pass" if score >= 640 else "fail")
    summary = data.get("summary") or (
        f"{_label(CONSUMER_SOURCES, source)} {_label(CONSUMER_PRODUCTS, product)} on {name}."
    )
    actor = staff_by_id("cr-marcus")["name"]
    if existing:
        existing.source = source
        existing.product_code = product
        existing.score = score
        existing.outcome = outcome
        existing.ran_at = utcnow()
        existing.summary = summary
        existing.actor = actor
        existing.provider = status.get("provider", "")
        pull = existing
    else:
        pull = models.CreditPull(
            process_id=process.process_id,
            party_kind="customer",
            party_id=customer.customer_id,
            source=source,
            product_code=product,
            score=score,
            artefact_id=new_id(),
            fcra_purpose=process.process_id,
            outcome=outcome,
            actor=actor,
            summary=summary,
            provider=status.get("provider", ""),
        )
        db.add(pull)
    _event(
        db,
        process,
        "consumerCredit",
        "Consumer credit",
        "worker",
        "pull",
        summary,
        pull.artefact_id,
        float(data.get("confidence") or 0.7),
        status.get("label", ""),
    )
    _audit(db, process.process_id, actor, "credit.consumer", "CreditPull", pull.artefact_id)
    return pull


def run_commercial_credit(db: Session, process: models.Process, source: str, product: str) -> models.CreditPull:
    business = db.query(models.Business).filter_by(process_id=process.process_id).first()
    if not business:
        raise ValueError("Business required.")
    existing = (
        db.query(models.CreditPull)
        .filter_by(process_id=process.process_id, party_kind="business")
        .first()
    )
    products = BUSINESS_PRODUCTS.get(source) or BUSINESS_PRODUCTS["experianBusiness"]
    product_label = _label(products, product)
    data, status = invoke_json(
        "You are the CygnusX-1 commercial credit worker. Return JSON only: "
        '{"score": number, "outcome": "pass"|"fail", "confidence": 0-1, "summary": string, "factors": string[]}. '
        "This is NOT a consumer CRA. Experian Business / SBFE / D&B PAYDEX.",
        f"Commercial pull. Business={business.legal_name}. NAICS={business.naics_code}. "
        f"Source={source}. Product={product_label}. Type={business.business_type}.",
    )
    score = float(data.get("score") or (80 if source == "dnb" else 76))
    outcome = data.get("outcome") or "pass"
    summary = data.get("summary") or (
        f"{_label(BUSINESS_SOURCES, source)} {product_label} on {business.legal_name}."
    )
    actor = staff_by_id("cr-marcus")["name"]
    if existing:
        existing.source = source
        existing.product_code = product
        existing.score = score
        existing.outcome = outcome
        existing.ran_at = utcnow()
        existing.summary = summary
        existing.actor = actor
        existing.provider = status.get("provider", "")
        pull = existing
    else:
        pull = models.CreditPull(
            process_id=process.process_id,
            party_kind="business",
            party_id=business.business_id,
            source=source,
            product_code=product,
            score=score,
            artefact_id=new_id(),
            fcra_purpose=None,
            outcome=outcome,
            actor=actor,
            summary=summary,
            provider=status.get("provider", ""),
        )
        db.add(pull)
    _event(
        db,
        process,
        "commercialCredit",
        "Commercial credit",
        "worker",
        "pull",
        summary,
        pull.artefact_id,
        float(data.get("confidence") or 0.7),
        status.get("label", ""),
    )
    _audit(db, process.process_id, actor, "credit.commercial", "CreditPull", pull.artefact_id)
    return pull
