from __future__ import annotations

import json
from datetime import datetime, timezone

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

CREDIT_JSON = (
    '{"score": number, "outcome": "pass"|"fail", "confidence": 0-1, "summary": string, '
    '"factors": string[], "scoreType": string, "lastCheckedAt": "YYYY-MM-DD", '
    '"yearsSinceFirstCredit": number, "outstandingAmount": number, '
    '"utilizationPct": number, "openTradelines": number, "pastDueAmount": number}'
)


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


def _pick(data: dict, *keys, default=None):
    for key in keys:
        if key in data and data[key] is not None and data[key] != "":
            return data[key]
    return default


def _as_float(value, default: float | None) -> float | None:
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _as_int(value, default: int | None) -> int | None:
    parsed = _as_float(value, default if default is None else float(default))
    if parsed is None:
        return None
    return int(round(parsed))


def _as_dt(value) -> datetime:
    if not value:
        return utcnow()
    if isinstance(value, datetime):
        return value
    text = str(value).strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(text)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        try:
            return datetime.strptime(str(value)[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            return utcnow()


def _credit_profile(data: dict, score_type: str, kind: str) -> dict:
    if kind == "customer":
        years, outstanding, util, lines, past_due = 14, 18420.0, 31.0, 7, 0.0
    else:
        years, outstanding, util, lines, past_due = 9, 126500.0, 42.0, 11, 0.0
    return {
        "score_type": str(_pick(data, "scoreType", "score_type", default=score_type))[:64],
        "last_checked_at": _as_dt(_pick(data, "lastCheckedAt", "last_checked_at")),
        "years_since_first_credit": _as_int(
            _pick(data, "yearsSinceFirstCredit", "years_since_first_credit"), years
        ),
        "outstanding_amount": _as_float(
            _pick(data, "outstandingAmount", "outstanding_amount"), outstanding
        ),
        "utilization_pct": _as_float(_pick(data, "utilizationPct", "utilization_pct"), util),
        "open_tradelines": _as_int(_pick(data, "openTradelines", "open_tradelines"), lines),
        "past_due_amount": _as_float(_pick(data, "pastDueAmount", "past_due_amount"), past_due),
    }


def _stamp_credit(
    pull: models.CreditPull,
    *,
    source: str,
    product_code: str,
    score: float,
    outcome: str,
    summary: str,
    actor: str,
    provider: str,
    profile: dict,
) -> None:
    pull.source = source
    pull.product_code = product_code
    pull.score = score
    pull.outcome = outcome
    pull.ran_at = utcnow()
    pull.summary = summary
    pull.actor = actor
    pull.provider = provider
    pull.score_type = profile["score_type"]
    pull.last_checked_at = profile["last_checked_at"]
    pull.years_since_first_credit = profile["years_since_first_credit"]
    pull.outstanding_amount = profile["outstanding_amount"]
    pull.utilization_pct = profile["utilization_pct"]
    pull.open_tradelines = profile["open_tradelines"]
    pull.past_due_amount = profile["past_due_amount"]


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
    score_type = _label(CONSUMER_PRODUCTS, product)
    data, status = invoke_json(
        "You are the CygnusX-1 consumer credit worker. Return JSON only: "
        f"{CREDIT_JSON}. "
        "FCRA: one pull keyed (partyId, processId). Score >= 640 is pass. SBSS is not the gate. "
        "lastCheckedAt is the bureau as-of date. yearsSinceFirstCredit is age of oldest tradeline. "
        "outstandingAmount is current revolving + installment balance.",
        f"Consumer credit pull. Customer={name}. Source={source}. Product={product} ({score_type}). "
        f"Process={process.process_id}. Last4={customer.ssn_last4}. DOB year={(customer.dob or '')[:4]}.",
    )
    score = float(data.get("score") or 712)
    outcome = data.get("outcome") or ("pass" if score >= 640 else "fail")
    summary = data.get("summary") or (
        f"{_label(CONSUMER_SOURCES, source)} {score_type} on {name}."
    )
    actor = staff_by_id("cr-marcus")["name"]
    profile = _credit_profile(data, score_type, "customer")
    if existing:
        _stamp_credit(
            existing,
            source=source,
            product_code=product,
            score=score,
            outcome=outcome,
            summary=summary,
            actor=actor,
            provider=status.get("provider", ""),
            profile=profile,
        )
        pull = existing
    else:
        pull = models.CreditPull(
            process_id=process.process_id,
            party_kind="customer",
            party_id=customer.customer_id,
            artefact_id=new_id(),
            fcra_purpose=process.process_id,
        )
        _stamp_credit(
            pull,
            source=source,
            product_code=product,
            score=score,
            outcome=outcome,
            summary=summary,
            actor=actor,
            provider=status.get("provider", ""),
            profile=profile,
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
        f"{CREDIT_JSON}. "
        "This is NOT a consumer CRA. Experian Business / SBFE / D&B PAYDEX. "
        "outstandingAmount is trade credit currently outstanding.",
        f"Commercial pull. Business={business.legal_name}. NAICS={business.naics_code}. "
        f"Source={source}. Product={product_label}. Type={business.business_type}.",
    )
    score = float(data.get("score") or (80 if source == "dnb" else 76))
    outcome = data.get("outcome") or "pass"
    summary = data.get("summary") or (
        f"{_label(BUSINESS_SOURCES, source)} {product_label} on {business.legal_name}."
    )
    actor = staff_by_id("cr-marcus")["name"]
    profile = _credit_profile(data, product_label, "business")
    if existing:
        _stamp_credit(
            existing,
            source=source,
            product_code=product,
            score=score,
            outcome=outcome,
            summary=summary,
            actor=actor,
            provider=status.get("provider", ""),
            profile=profile,
        )
        pull = existing
    else:
        pull = models.CreditPull(
            process_id=process.process_id,
            party_kind="business",
            party_id=business.business_id,
            artefact_id=new_id(),
            fcra_purpose=None,
        )
        _stamp_credit(
            pull,
            source=source,
            product_code=product,
            score=score,
            outcome=outcome,
            summary=summary,
            actor=actor,
            provider=status.get("provider", ""),
            profile=profile,
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
        "OFAC SDN. This is one of three Pre-application qualifying checks "
        "(consumer credit, business credit, or fraud). A hit does not reject the file; "
        "the customer can still qualify on a passing bureau pull. Not a bureau.",
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
            artefact_id=new_id(),
            outcome=outcome,
            actor=actor,
            summary=summary,
            provider=status.get("provider", ""),
        )
        db.add(row)
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
            artefact_id=new_id(),
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


def run_processing_pack(db: Session, process: models.Process, source: str = "sos") -> models.SbaProfile:
    """Mock SOS / SBA size / SAM / franchise / affiliation and persist on SbaProfile."""
    from ..mocks.processing import build_processing_report

    business = db.query(models.Business).filter_by(process_id=process.process_id).first()
    if not business:
        raise ValueError("Business required.")
    customer = db.query(models.Customer).filter_by(process_id=process.process_id).first()
    loan = db.query(models.Loan).filter_by(process_id=process.process_id).first()
    report = build_processing_report(customer, business, loan, source)
    actor = staff_by_id("pr-jordan")["name"]
    artefact = new_id()

    sos = next((c for c in report["checks"] if c["api"] == "sos.kyb"), None)
    kyb_status = "clear" if not sos or sos["status"] in ("clear", "pass", "n/a") else "fail"
    kyb_summary = sos["detail"] if sos else f"{business.legal_name} — mock KYB."
    existing_kyb = db.query(models.KybReport).filter_by(process_id=process.process_id).first()
    if existing_kyb:
        existing_kyb.source = source
        existing_kyb.status = kyb_status
        existing_kyb.ran_at = utcnow()
        existing_kyb.summary = kyb_summary
        existing_kyb.actor = actor
        existing_kyb.provider = "mock"
        kyb = existing_kyb
    else:
        kyb = models.KybReport(
            process_id=process.process_id,
            business_id=business.business_id,
            source=source,
            status=kyb_status,
            actor=actor,
            summary=kyb_summary,
            provider="mock",
            artefact_id=new_id(),
        )
        db.add(kyb)

    inputs = report.get("inputs") or {}
    row = db.query(models.SbaProfile).filter_by(process_id=process.process_id).first()
    if not row:
        row = models.SbaProfile(process_id=process.process_id, business_id=business.business_id)
        db.add(row)
    row.business_id = business.business_id
    row.naics_code = (business.naics_code or inputs.get("naicsCode") or "")[:6]
    row.employee_count = str(inputs.get("employeeCount") or "")
    row.annual_receipts = f"{inputs.get('annualReceipts') or ''}"
    row.is_franchise = bool(report.get("isFranchise"))
    row.size_standard_met = bool(report.get("sizeStandardMet", True))
    row.notes = report.get("notes") or ""
    row.mock_report_json = json.dumps(report)
    row.sam_status = str(report.get("samStatus") or "")
    row.size_standard = str(inputs.get("sizeStandard") or "")
    row.eligibility_status = str(report.get("eligibility") or "eligible")
    row.ran_at = utcnow()
    row.actor = actor
    row.artefact_id = artefact
    row.provider = "mock"

    summary = (
        f"Mock Processing pack for {business.legal_name}: {row.eligibility_status}. "
        f"KYB {kyb_status}. Size standard {'met' if row.size_standard_met else 'not met'}."
    )
    _event(
        db,
        process,
        "processing",
        "Spreading / KYB",
        "worker",
        "pack",
        summary,
        artefact,
        0.9,
        "mock",
    )
    _audit(db, process.process_id, actor, "processing.pack", "SbaProfile", artefact)
    return row


def run_collateral_agent(db: Session, process: models.Process) -> dict:
    items = db.query(models.CollateralItem).filter_by(process_id=process.process_id).all()
    pledges = db.query(models.CollateralPledge).filter_by(process_id=process.process_id).all()
    policies = db.query(models.InsurancePolicy).filter_by(process_id=process.process_id).all()
    loan = db.query(models.Loan).filter_by(process_id=process.process_id).first()

    def _num(raw: str) -> float:
        try:
            return float(str(raw or "").replace(",", "").replace("$", "") or 0)
        except ValueError:
            return 0.0

    pledged_total = sum(_num(p.pledged_value) for p in pledges) or sum(_num(i.value) for i in items)
    loan_amt = _num(loan.loan_amount if loan else "")
    coverage = (pledged_total / loan_amt) if loan_amt else 0
    uninsured = [i.label for i in items if not any(p.item_id == i.item_id and p.carrier for p in policies)]
    payload = [
        {
            "label": i.label,
            "kind": i.kind,
            "value": i.value,
            "location": i.location,
            "lien": next((p.lien_position for p in pledges if p.item_id == i.item_id), None),
        }
        for i in items
    ]
    data, status = invoke_json(
        "You are the CygnusX-1 collateral worker. Return JSON only: "
        '{"outcome": "pass"|"fail", "confidence": 0-1, "summary": string, "lienNotes": string, "insuranceRequired": true}. '
        "Mock UCC-1 / mortgage search. Do not decide credit.",
        json.dumps(
            {
                "items": payload,
                "pledges": len(pledges),
                "policies": len(policies),
                "loanAmount": loan_amt,
                "pledgedTotal": pledged_total,
                "coverage": round(coverage, 3),
                "uninsured": uninsured,
            }
        ),
    )
    lien_notes = data.get("lienNotes") or (
        "Mock UCC-1 / lien search: no conflicting senior filings on pledged items. Confirm at documentation."
    )
    summary = data.get("summary") or (
        f"Collateral package: {len(items)} item(s), {len(pledges)} pledge(s), "
        f"coverage {coverage:.0%} of the facility. {lien_notes}"
    )
    if uninsured:
        summary += f" Insurance outstanding on: {', '.join(uninsured)}."
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
        status.get("label", "") or "mock",
    )
    _audit(db, process.process_id, staff_by_id("pr-jordan")["name"], "collateral.review", "CollateralItem", summary)
    return data


def _pull_facts(row: models.CreditPull | None) -> dict | None:
    if not row:
        return None
    return {
        "score": row.score,
        "scoreType": row.score_type,
        "outcome": row.outcome,
        "lastCheckedAt": row.last_checked_at.isoformat() if row.last_checked_at else None,
        "yearsSinceFirstCredit": row.years_since_first_credit,
        "outstandingAmount": row.outstanding_amount,
        "utilizationPct": row.utilization_pct,
        "openTradelines": row.open_tradelines,
        "pastDueAmount": row.past_due_amount,
    }


def run_credit_decision(db: Session, process: models.Process) -> models.ScorecardResult:
    """LangGraph: credit, collateral, and statement agents, then a grounded proposal."""
    from .credit_graph import invoke_credit_graph

    customer = db.query(models.Customer).filter_by(process_id=process.process_id).first()
    business = db.query(models.Business).filter_by(process_id=process.process_id).first()
    loan = db.query(models.Loan).filter_by(process_id=process.process_id).first()
    pulls = db.query(models.CreditPull).filter_by(process_id=process.process_id).all()
    fraud = db.query(models.SanctionsScreen).filter_by(process_id=process.process_id).first()
    items = db.query(models.CollateralItem).filter_by(process_id=process.process_id).all()
    pledges = db.query(models.CollateralPledge).filter_by(process_id=process.process_id).all()
    policies = db.query(models.InsurancePolicy).filter_by(process_id=process.process_id).all()
    sba = db.query(models.SbaProfile).filter_by(process_id=process.process_id).first()
    item_by_id = {i.item_id: i for i in items}
    statements: list[dict] = []
    if sba and sba.mock_report_json:
        try:
            report = json.loads(sba.mock_report_json)
            statements = list(report.get("statements") or [])
        except json.JSONDecodeError:
            statements = []
    evidence = {
        "processNumber": process.process_number,
        "customer": f"{customer.first_name} {customer.last_name}".strip() if customer else None,
        "business": business.legal_name if business else None,
        "amount": loan.loan_amount if loan else None,
        "product": loan.product_id if loan else None,
        "pulls": [
            {
                "partyKind": p.party_kind,
                "score": p.score,
                "scoreType": p.score_type,
                "outcome": p.outcome,
                "lastCheckedAt": p.last_checked_at.isoformat() if p.last_checked_at else None,
                "yearsSinceFirstCredit": p.years_since_first_credit,
                "outstandingAmount": p.outstanding_amount,
                "utilizationPct": p.utilization_pct,
                "openTradelines": p.open_tradelines,
                "pastDueAmount": p.past_due_amount,
                "artefactId": p.artefact_id,
            }
            for p in pulls
        ],
        "fraud": None
        if not fraud
        else {"outcome": fraud.outcome, "artefactId": fraud.artefact_id},
        "pledges": [
            {
                "label": (item_by_id.get(p.item_id).label if item_by_id.get(p.item_id) else ""),
                "kind": (item_by_id.get(p.item_id).kind if item_by_id.get(p.item_id) else ""),
                "value": (item_by_id.get(p.item_id).value if item_by_id.get(p.item_id) else ""),
                "location": (item_by_id.get(p.item_id).location if item_by_id.get(p.item_id) else ""),
                "lienPosition": p.lien_position,
                "pledgedValue": p.pledged_value,
            }
            for p in pledges
        ],
        "insurance": [
            {
                "carrier": pol.carrier,
                "coverageAmount": pol.coverage_amount,
                "expiresOn": pol.expires_on,
            }
            for pol in policies
        ],
        "statements": statements,
    }
    result = invoke_credit_graph(evidence)
    critic = result.get("critic") or {}
    proposal = result.get("proposal") or {}
    agents = []
    for key in ("credit", "collateral", "statements"):
        block = result.get(key) or {}
        agents.append(
            {
                "id": block.get("agent") or key,
                "name": block.get("name") or key,
                "summary": block.get("summary") or "",
            }
        )
        _event(
            db,
            process,
            block.get("agent") or key,
            block.get("name") or key,
            "worker",
            "read",
            block.get("summary") or "",
            "",
            float(critic.get("confidence") or 0),
            "langgraph",
        )
    narrative = critic.get("narrative") or proposal.get("groundedMemo") or ""
    action = critic.get("recommendedAction") or "hold"
    confidence = float(critic.get("confidence") or 0)
    hallucination = float(critic.get("hallucination") or 1)
    releasable = bool(critic.get("releasable"))
    brief = {
        "agents": agents,
        "gaps": critic.get("gaps") or [],
        "langsmith": bool(result.get("langsmith")),
    }
    existing = db.query(models.ScorecardResult).filter_by(process_id=process.process_id).first()
    if existing:
        row = existing
    else:
        row = models.ScorecardResult(process_id=process.process_id)
        db.add(row)
    row.recommended_action = action
    row.confidence = confidence
    row.factors_json = json.dumps(critic.get("gaps") or [])
    row.narrative = narrative
    row.provider = "langgraph"
    row.model_name = proposal.get("model") or proposal.get("label") or "langgraph"
    row.actor = "Credit decision"
    row.hallucination = hallucination
    row.releasable = releasable
    row.trace_id = result.get("traceId") or ""
    row.brief_json = json.dumps(brief)
    row.ran_at = utcnow()
    trace = "LangSmith" if result.get("langsmith") else "local trace"
    _event(
        db,
        process,
        "critic",
        "Proposal critic",
        "evaluator",
        "proposal",
        (
            f"{'Releasable' if releasable else 'Held'} · confidence {confidence:.0%} · "
            f"hallucination {hallucination:.1%} · {trace}."
        ),
        row.artefact_id,
        confidence,
        proposal.get("label") or "langgraph",
    )
    _audit(db, process.process_id, "Credit decision", "uw.proposal", "ScorecardResult", action)
    return row


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
        "consumerCredit": _pull_facts(consumer),
        "commercialCredit": _pull_facts(commercial),
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
        "Do not invent a guaranty number. SBSS is not the gate. One passing credit score is enough.",
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
    if process.current_stage == "preApplication":
        qualified = (
            (consumer and consumer.outcome == "pass" and consumer.artefact_id)
            or (commercial and commercial.outcome == "pass" and commercial.artefact_id)
            or (fraud and fraud.outcome == "pass")
        )
        if not qualified:
            issues.append(
                "Need one passing qualification: consumer credit, business credit, or fraud history"
            )
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
