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


def run_sanctions(db: Session, process: models.Process) -> models.SanctionsScreen:
    customer = db.query(models.Customer).filter_by(process_id=process.process_id).first()
    business = db.query(models.Business).filter_by(process_id=process.process_id).first()
    name = f"{customer.first_name} {customer.last_name}" if customer else "Customer"
    company = business.legal_name if business else "Business"
    existing = db.query(models.SanctionsScreen).filter_by(process_id=process.process_id).first()
    data, status = invoke_json(
        "You are the CygnusX-1 sanctions / fraud worker. Return JSON only: "
        '{"outcome": "pass"|"fail", "confidence": 0-1, "summary": string, "matches": string[]}. '
        "OFAC SDN. A hit fail-closes. Not a bureau.",
        f"Screen {name} and {company}. Last name={(customer.last_name if customer else '')}.",
    )
    outcome = data.get("outcome") or "pass"
    summary = data.get("summary") or f"OFAC / SDN on {name} and {company}."
    actor = staff_by_id("fr-priya")["name"]
    if existing:
        existing.outcome = outcome
        existing.ran_at = utcnow()
        existing.summary = summary
        existing.actor = actor
        existing.provider = status.get("provider", "")
        row = existing
    else:
        row = models.SanctionsScreen(
            process_id=process.process_id,
            outcome=outcome,
            actor=actor,
            summary=summary,
            provider=status.get("provider", ""),
        )
        db.add(row)
    if outcome == "fail":
        process.stage_status = "rejected"
    _event(
        db,
        process,
        "sanctions",
        "Sanctions / fraud",
        "worker",
        "screen",
        summary,
        row.artefact_id,
        float(data.get("confidence") or 0.9),
        status.get("label", ""),
    )
    _audit(db, process.process_id, actor, "sanctions.screen", "SanctionsScreen", row.artefact_id)
    return row


def run_kyb(db: Session, process: models.Process, source: str) -> models.KybReport:
    business = db.query(models.Business).filter_by(process_id=process.process_id).first()
    if not business:
        raise ValueError("Business required.")
    existing = db.query(models.KybReport).filter_by(process_id=process.process_id).first()
    data, status = invoke_json(
        "You are the CygnusX-1 KYB worker. Return JSON only: "
        '{"status": "clear"|"review"|"fail", "outcome": "pass"|"fail", "confidence": 0-1, "summary": string}.',
        f"KYB source={source} on {business.legal_name}, type={business.business_type}, "
        f"formed={business.incorporated_on}, NAICS={business.naics_code}.",
    )
    kyb_status = data.get("status") or "clear"
    summary = data.get("summary") or f"{business.legal_name} — KYB {source}. Active entity."
    actor = staff_by_id("pr-jordan")["name"]
    if existing:
        existing.source = source
        existing.status = kyb_status
        existing.ran_at = utcnow()
        existing.summary = summary
        existing.actor = actor
        existing.provider = status.get("provider", "")
        row = existing
    else:
        row = models.KybReport(
            process_id=process.process_id,
            business_id=business.business_id,
            source=source,
            status=kyb_status,
            actor=actor,
            summary=summary,
            provider=status.get("provider", ""),
        )
        db.add(row)
    _event(
        db,
        process,
        "processing",
        "Spreading / KYB",
        "worker",
        "kyb",
        summary,
        row.artefact_id,
        float(data.get("confidence") or 0.7),
        status.get("label", ""),
    )
    _audit(db, process.process_id, actor, "kyb.run", "KybReport", row.artefact_id)
    return row


def run_collateral_agent(db: Session, process: models.Process) -> dict:
    items = db.query(models.CollateralItem).filter_by(process_id=process.process_id).all()
    pledges = db.query(models.CollateralPledge).filter_by(process_id=process.process_id).all()
    policies = db.query(models.InsurancePolicy).filter_by(process_id=process.process_id).all()
    payload = [
        {"label": i.label, "kind": i.kind, "value": i.value} for i in items
    ]
    data, status = invoke_json(
        "You are the CygnusX-1 collateral worker. Return JSON only: "
        '{"outcome": "pass"|"fail", "confidence": 0-1, "summary": string, "lienNotes": string, "insuranceRequired": true}.',
        f"Items={json.dumps(payload)}. Pledges={len(pledges)}. Policies={len(policies)}.",
    )
    summary = data.get("summary") or "Collateral package reviewed."
    _event(
        db,
        process,
        "collateral",
        "Collateral",
        "worker",
        "review",
        summary,
        "",
        float(data.get("confidence") or 0.68),
        status.get("label", ""),
    )
    _audit(db, process.process_id, staff_by_id("pr-jordan")["name"], "collateral.review", "CollateralItem", summary)
    return data


def run_scorecard(db: Session, process: models.Process) -> models.ScorecardResult:
    customer = db.query(models.Customer).filter_by(process_id=process.process_id).first()
    business = db.query(models.Business).filter_by(process_id=process.process_id).first()
    loan = db.query(models.Loan).filter_by(process_id=process.process_id).first()
    consumer = (
        db.query(models.CreditPull).filter_by(process_id=process.process_id, party_kind="customer").first()
    )
    commercial = (
        db.query(models.CreditPull).filter_by(process_id=process.process_id, party_kind="business").first()
    )
    fraud = db.query(models.SanctionsScreen).filter_by(process_id=process.process_id).first()
    kyb = db.query(models.KybReport).filter_by(process_id=process.process_id).first()
    sba = db.query(models.SbaProfile).filter_by(process_id=process.process_id).first()
    items = db.query(models.CollateralItem).filter_by(process_id=process.process_id).all()
    pledges = db.query(models.CollateralPledge).filter_by(process_id=process.process_id).all()
    facts = {
        "customer": f"{customer.first_name} {customer.last_name}" if customer else None,
        "business": business.legal_name if business else None,
        "amount": loan.loan_amount if loan else None,
        "product": loan.product_id if loan else None,
        "consumerScore": consumer.score if consumer else None,
        "consumerOutcome": consumer.outcome if consumer else None,
        "commercialScore": commercial.score if commercial else None,
        "ofac": fraud.outcome if fraud else None,
        "kyb": kyb.status if kyb else None,
        "sbaSizeMet": sba.size_standard_met if sba else None,
        "collateralItems": len(items),
        "pledges": len(pledges),
    }
    data, status = invoke_json(
        "You are the CygnusX-1 credit policy pack. Scorecard RECOMMENDS, it does not decide. "
        "Return JSON only: "
        '{"recommendedAction": "approve"|"pend"|"reject", "confidence": 0-1, "narrative": string, "factors": string[]}. '
        "Do not invent a guaranty number. SBSS is not the gate.",
        f"Underwrite this SBA origination file: {json.dumps(facts)}",
    )
    existing = db.query(models.ScorecardResult).filter_by(process_id=process.process_id).first()
    factors = data.get("factors") or []
    action = data.get("recommendedAction") or "pend"
    narrative = data.get("narrative") or "Advisory scorecard."
    if existing:
        existing.recommended_action = action
        existing.confidence = float(data.get("confidence") or 0.6)
        existing.factors_json = json.dumps(factors)
        existing.narrative = narrative
        existing.provider = status.get("provider", "")
        existing.model_name = status.get("model", "")
        existing.ran_at = utcnow()
        row = existing
    else:
        row = models.ScorecardResult(
            process_id=process.process_id,
            recommended_action=action,
            confidence=float(data.get("confidence") or 0.6),
            factors_json=json.dumps(factors),
            narrative=narrative,
            provider=status.get("provider", ""),
            model_name=status.get("model", ""),
        )
        db.add(row)
    _event(
        db,
        process,
        "policy",
        "Credit policy pack",
        "worker",
        "scorecard",
        narrative,
        row.artefact_id,
        row.confidence,
        status.get("label", ""),
    )
    _audit(db, process.process_id, "Credit policy pack", "uw.scorecard", "ScorecardResult", action)
    return row


def run_evaluator(db: Session, process: models.Process) -> dict:
    consumer = (
        db.query(models.CreditPull).filter_by(process_id=process.process_id, party_kind="customer").first()
    )
    commercial = (
        db.query(models.CreditPull).filter_by(process_id=process.process_id, party_kind="business").first()
    )
    fraud = db.query(models.SanctionsScreen).filter_by(process_id=process.process_id).first()
    scorecard = db.query(models.ScorecardResult).filter_by(process_id=process.process_id).first()
    issues = []
    if process.current_stage in ("preApplication", "processing", "collateral", "underwriter"):
        if not consumer or not consumer.artefact_id:
            issues.append("Consumer CreditPull missing artefactId")
        if not commercial or not commercial.artefact_id:
            issues.append("Commercial CreditPull missing artefactId")
        if not fraud:
            issues.append("SanctionsScreen not run")
    facts = {
        "stage": process.current_stage,
        "issues": issues,
        "scorecard": scorecard.recommended_action if scorecard else None,
        "consumerArtefact": bool(consumer and consumer.artefact_id),
        "commercialArtefact": bool(commercial and commercial.artefact_id),
        "ofac": fraud.outcome if fraud else None,
    }
    data, status = invoke_json(
        "You are the CygnusX-1 evaluator / critic. Cross-check worker outputs. "
        "Never fill a gate. Return JSON only: "
        '{"outcome": "pass"|"fail", "confidence": 0-1, "summary": string, "issues": string[]}.',
        json.dumps(facts),
    )
    if issues:
        data["issues"] = issues
        data["outcome"] = "fail"
        data["summary"] = "Evaluator rejected ungrounded claims: " + "; ".join(issues)
    summary = data.get("summary") or "Evaluator packaged the stage."
    _event(
        db,
        process,
        "evaluator",
        "Evaluator / critic",
        "evaluator",
        "review",
        summary,
        "",
        float(data.get("confidence") or 0.8),
        status.get("label", ""),
    )
    return data


def run_docs_agent(db: Session, process: models.Process) -> dict:
    docs = db.query(models.DocumentRow).filter_by(process_id=process.process_id).all()
    data, status = invoke_json(
        "You are the CygnusX-1 documentation worker. Return JSON only: "
        '{"outcome": "pass"|"fail", "confidence": 0-1, "summary": string}. A document is not filed without imaging ACK.',
        f"Documents={[d.name + ':' + d.status for d in docs]}",
    )
    summary = data.get("summary") or "Closing package reviewed."
    _event(
        db,
        process,
        "docs",
        "Documentation",
        "worker",
        "package",
        summary,
        "",
        float(data.get("confidence") or 0.7),
        status.get("label", ""),
    )
    return data


def run_funding_agent(db: Session, process: models.Process) -> dict:
    data, status = invoke_json(
        "You are the CygnusX-1 funding / E-Tran worker. Return JSON only: "
        '{"outcome": "pass"|"fail", "confidence": 0-1, "summary": string}. '
        "Never invent a guaranty number. Human-authorized only. Ledger draft is not a post.",
        f"Stage={process.current_stage}. Process={process.process_number}.",
    )
    summary = data.get("summary") or "Funding worker standing by for human authorization."
    _event(
        db,
        process,
        "funding",
        "Funding / E-Tran",
        "worker",
        "etran",
        summary,
        "",
        float(data.get("confidence") or 0.7),
        status.get("label", ""),
    )
    return data
