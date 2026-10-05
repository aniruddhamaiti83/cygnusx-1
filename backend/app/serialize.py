import json
from datetime import datetime

from sqlalchemy.orm import Session

from . import models
from .catalog import STAFF, desk_label, staff_by_id


def iso(dt: datetime | None) -> str | None:
    if not dt:
        return None
    return dt.isoformat()


def _json_obj(raw: str | None):
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


def address_dict(row: models.Address | None) -> dict:
    if not row:
        return {"line1": "", "line2": "", "city": "", "state": "", "postalCode": ""}
    return {
        "addressId": row.address_id,
        "line1": row.line1,
        "line2": row.line2,
        "city": row.city,
        "state": row.state,
        "postalCode": row.postal_code,
    }


def load_address(db: Session, address_id: str | None) -> models.Address | None:
    if not address_id:
        return None
    return db.get(models.Address, address_id)


def customer_dict(db: Session, row: models.Customer | None) -> dict | None:
    if not row:
        return None
    return {
        "customerId": row.customer_id,
        "firstName": row.first_name,
        "lastName": row.last_name,
        "email": row.email,
        "phone": row.phone,
        "emailConfirmed": row.email_confirmed,
        "emailVerified": row.email_verified,
        "authUserId": row.auth_user_id,
        "ssnLast4": row.ssn_last4,
        "dob": row.dob,
        "gender": row.gender,
        "race": row.race,
        "ethnicity": row.ethnicity,
        "roles": [r for r in (row.roles or "borrower").split(",") if r],
        "primary": address_dict(load_address(db, row.primary_address_id)),
        "mailing": address_dict(load_address(db, row.mailing_address_id)),
        "mailingSameAsPrimary": row.mailing_same_as_primary,
    }


def business_dict(db: Session, row: models.Business | None) -> dict | None:
    if not row:
        return None
    return {
        "businessId": row.business_id,
        "legalName": row.legal_name,
        "taxIdLast4": row.tax_id_last4,
        "businessType": row.business_type,
        "incorporatedOn": row.incorporated_on,
        "naicsCode": row.naics_code,
        "address": address_dict(load_address(db, row.address_id)),
        "loanAmount": row.loan_amount,
        "loanPurpose": row.loan_purpose,
    }


def loan_dict(row: models.Loan | None) -> dict | None:
    if not row:
        return None
    return {
        "loanId": row.loan_id,
        "processId": row.process_id,
        "borrowerRef": row.borrower_ref,
        "productId": row.product_id,
        "interestRate": row.interest_rate,
        "loanAmount": row.loan_amount,
        "basis": row.basis,
        "indexRate": row.index_rate,
        "interestOnlyPayment": row.interest_only_payment,
        "spread": row.spread,
        "status": row.status,
        "closingDate": row.closing_date,
        "balloon": row.balloon,
        "afsPurposeCode": row.afs_purpose_code,
        "firstPrinPaymentDate": row.first_prin_payment_date,
        "prinFrequency": row.prin_frequency,
        "primaryCollateralId": row.primary_collateral_id,
        "primaryClientId": row.primary_client_id,
        "primaryBorrowerRef": row.primary_borrower_ref,
        "primaryBusinessId": row.primary_business_id,
        "guarantorId": row.guarantor_id,
        "coborrowerId": row.coborrower_id,
        "purposeId": row.purpose_id,
        "guarantyPercent": row.guaranty_percent,
        "guarantyNumber": row.guaranty_number,
        "guarantyStatus": row.guaranty_status,
        "fundedOn": row.funded_on,
        "saved": row.saved,
    }


def pull_dict(row: models.CreditPull | None) -> dict | None:
    if not row:
        return None
    return {
        "pullId": row.pull_id,
        "processId": row.process_id,
        "partyKind": row.party_kind,
        "partyId": row.party_id,
        "source": row.source,
        "productCode": row.product_code,
        "score": row.score,
        "scoreType": row.score_type or "",
        "lastCheckedAt": iso(row.last_checked_at) or iso(row.ran_at),
        "yearsSinceFirstCredit": row.years_since_first_credit,
        "outstandingAmount": row.outstanding_amount,
        "utilizationPct": row.utilization_pct,
        "openTradelines": row.open_tradelines,
        "pastDueAmount": row.past_due_amount,
        "artefactId": row.artefact_id,
        "fcraPurpose": row.fcra_purpose,
        "outcome": row.outcome,
        "ranAt": iso(row.ran_at),
        "actor": row.actor,
        "summary": row.summary,
        "provider": row.provider,
    }


def screen_dict(row: models.SanctionsScreen | None) -> dict | None:
    if not row:
        return None
    return {
        "screenId": row.screen_id,
        "processId": row.process_id,
        "artefactId": row.artefact_id,
        "outcome": row.outcome,
        "ranAt": iso(row.ran_at),
        "actor": row.actor,
        "summary": row.summary,
        "provider": row.provider,
    }


def team_dict(rows: list[models.ProcessTeam]) -> list[dict]:
    by_desk = {r.desk: r for r in rows}
    out = []
    for person in STAFF:
        desk = person["desk"]
        row = by_desk.get(desk)
        staff_id = row.staff_id if row else (person["id"] if desk == "rm" else None)
        out.append(
            {
                "desk": desk,
                "title": desk_label(desk),
                "staffId": staff_id,
                "name": staff_by_id(staff_id)["name"] if staff_id else None,
                "assignedAtStage": row.assigned_at_stage if row else ("intake" if desk == "rm" else None),
            }
        )
    return out


def file_dict(db: Session, process: models.Process) -> dict:
    customer = db.query(models.Customer).filter_by(process_id=process.process_id).first()
    business = db.query(models.Business).filter_by(process_id=process.process_id).first()
    loan = db.query(models.Loan).filter_by(process_id=process.process_id).first()
    team = db.query(models.ProcessTeam).filter_by(process_id=process.process_id).all()
    pulls = db.query(models.CreditPull).filter_by(process_id=process.process_id).all()
    consumer = next((p for p in pulls if p.party_kind == "customer"), None)
    commercial = next((p for p in pulls if p.party_kind == "business"), None)
    fraud = db.query(models.SanctionsScreen).filter_by(process_id=process.process_id).first()
    kyb = db.query(models.KybReport).filter_by(process_id=process.process_id).first()
    sba = db.query(models.SbaProfile).filter_by(process_id=process.process_id).first()
    items = db.query(models.CollateralItem).filter_by(process_id=process.process_id).all()
    pledges = db.query(models.CollateralPledge).filter_by(process_id=process.process_id).all()
    policies = db.query(models.InsurancePolicy).filter_by(process_id=process.process_id).all()
    scorecard = db.query(models.ScorecardResult).filter_by(process_id=process.process_id).first()
    decision = db.query(models.Decision).filter_by(process_id=process.process_id).first()
    docs = db.query(models.DocumentRow).filter_by(process_id=process.process_id).all()
    guaranty = db.query(models.GuarantySubmission).filter_by(process_id=process.process_id).first()
    ledger = db.query(models.LedgerPost).filter_by(process_id=process.process_id).first()
    events = (
        db.query(models.AgentEvent)
        .filter_by(process_id=process.process_id)
        .order_by(models.AgentEvent.created_at.desc())
        .limit(40)
        .all()
    )

    return {
        "processId": process.process_id,
        "processNumber": process.process_number,
        "currentStage": process.current_stage,
        "stageStatus": process.stage_status,
        "step": process.step,
        "userId": process.user_id,
        "ownerRmId": process.owner_rm_id,
        "createdAt": iso(process.created_at),
        "customer": customer_dict(db, customer),
        "business": business_dict(db, business),
        "loan": loan_dict(loan),
        "loanSaved": bool(loan and loan.saved),
        "team": team_dict(team),
        "consumerPull": pull_dict(consumer),
        "businessPull": pull_dict(commercial),
        "fraudCheck": screen_dict(fraud),
        "kybReport": None
        if not kyb
        else {
            "kybId": kyb.kyb_id,
            "processId": kyb.process_id,
            "businessId": kyb.business_id,
            "source": kyb.source,
            "status": kyb.status,
            "ranAt": iso(kyb.ran_at),
            "actor": kyb.actor,
            "summary": kyb.summary,
            "artefactId": kyb.artefact_id,
            "provider": kyb.provider,
        },
        "sbaProfile": None
        if not sba
        else {
            "sbaProfileId": sba.sba_profile_id,
            "processId": sba.process_id,
            "businessId": sba.business_id,
            "naicsCode": sba.naics_code,
            "employeeCount": sba.employee_count,
            "annualReceipts": sba.annual_receipts,
            "isFranchise": sba.is_franchise,
            "sizeStandardMet": sba.size_standard_met,
            "notes": sba.notes,
            "mockReport": _json_obj(sba.mock_report_json),
            "samStatus": sba.sam_status,
            "sizeStandard": sba.size_standard,
            "eligibilityStatus": sba.eligibility_status,
            "ranAt": iso(sba.ran_at),
            "actor": sba.actor,
            "artefactId": sba.artefact_id,
            "provider": sba.provider or "mock",
        },
        "collaterals": [
            {
                "itemId": i.item_id,
                "kind": i.kind,
                "label": i.label,
                "description": i.description,
                "value": i.value,
                "location": i.location,
                "ownerRef": i.owner_ref,
            }
            for i in items
        ],
        "pledges": [
            {
                "pledgeId": p.pledge_id,
                "itemId": p.item_id,
                "loanId": p.loan_id,
                "lienPosition": p.lien_position,
                "pledgedValue": p.pledged_value,
                "exceptionNote": p.exception_note,
            }
            for p in pledges
        ],
        "insurance": [
            {
                "policyId": p.policy_id,
                "itemId": p.item_id,
                "carrier": p.carrier,
                "policyNumber": p.policy_number,
                "coverageAmount": p.coverage_amount,
                "expiresOn": p.expires_on,
            }
            for p in policies
        ],
        "scorecard": None
        if not scorecard
        else {
            "scorecardId": scorecard.scorecard_id,
            "recommendedAction": scorecard.recommended_action,
            "confidence": scorecard.confidence,
            "hallucination": scorecard.hallucination if scorecard.hallucination is not None else 1,
            "releasable": bool(scorecard.releasable),
            "traceId": scorecard.trace_id or "",
            "factors": json.loads(scorecard.factors_json or "[]"),
            "narrative": scorecard.narrative,
            "agents": (json.loads(scorecard.brief_json or "{}").get("agents") or []),
            "gaps": (json.loads(scorecard.brief_json or "{}").get("gaps") or []),
            "langsmith": bool(json.loads(scorecard.brief_json or "{}").get("langsmith")),
            "artefactId": scorecard.artefact_id,
            "provider": scorecard.provider,
            "modelName": scorecard.model_name,
            "ranAt": iso(scorecard.ran_at),
            "actor": scorecard.actor,
        },
        "decision": None
        if not decision
        else {
            "decisionId": decision.decision_id,
            "action": decision.action,
            "rationale": decision.rationale,
            "decidedBy": decision.decided_by,
            "decidedAt": iso(decision.decided_at),
        },
        "documents": [
            {
                "documentId": d.document_id,
                "name": d.name,
                "status": d.status,
                "imagedAck": d.imaged_ack,
                "reviewed": d.reviewed,
            }
            for d in docs
        ],
        "guaranty": None
        if not guaranty
        else {
            "submissionId": guaranty.submission_id,
            "status": guaranty.status,
            "guarantyNumber": guaranty.guaranty_number,
            "submittedAt": iso(guaranty.submitted_at),
            "summary": guaranty.summary,
        },
        "ledger": None
        if not ledger
        else {
            "postId": ledger.post_id,
            "status": ledger.status,
            "dualControl": ledger.dual_control,
            "sealed": ledger.sealed,
            "summary": ledger.summary,
            "postedAt": iso(ledger.posted_at),
        },
        "agentEvents": [
            {
                "eventId": e.event_id,
                "stage": e.stage,
                "agentId": e.agent_id,
                "agentName": e.agent_name,
                "kind": e.kind,
                "action": e.action,
                "detail": e.detail,
                "artefactId": e.artefact_id,
                "confidence": e.confidence,
                "provider": e.provider,
                "createdAt": iso(e.created_at),
            }
            for e in events
        ],
    }
