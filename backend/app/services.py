from datetime import date

from fastapi import HTTPException
from sqlalchemy.orm import Session

from . import models
from .catalog import STAGE_STAFF, next_stage
from .models import new_id, utcnow
from .security import digits_only, tokenize_tax_id


CLOSING_DOCS = [
    "Note",
    "SBA authorization",
    "Unconditional guarantee",
    "Security agreement",
    "Insurance certificate",
    "Settlement statement",
]


def adult_on(dob: str) -> bool:
    if not dob:
        return False
    try:
        born = date.fromisoformat(dob)
    except ValueError:
        return False
    today = date.today()
    age = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
    return age >= 18


def complete_address(addr: dict | None) -> bool:
    if not addr:
        return False
    return bool(
        (addr.get("line1") or "").strip()
        and (addr.get("city") or "").strip()
        and addr.get("state")
        and len(digits_only(addr.get("postalCode") or "")) == 5
    )


def get_process(db: Session, process_id: str) -> models.Process:
    row = db.get(models.Process, process_id)
    if not row:
        raise HTTPException(status_code=404, detail="Process not found.")
    return row


def assert_can_write(process: models.Process, user) -> None:
    if process.stage_status in ("rejected", "sealed"):
        raise HTTPException(status_code=409, detail="Process is closed.")
    # Bound files reject a *different* signed-in applicant. Desk staff
    # (no FastAPI session) can still work the file.
    if process.user_id and user and user.id != process.user_id:
        raise HTTPException(status_code=403, detail="This file is bound to another account.")


def seed_team(db: Session, process: models.Process) -> None:
    existing = {t.desk: t for t in db.query(models.ProcessTeam).filter_by(process_id=process.process_id)}
    desks = ["rm", "credit", "fraud", "processor", "underwriter", "closer"]
    for desk in desks:
        if desk in existing:
            continue
        staff_id = "rm-elena" if desk == "rm" else None
        db.add(
            models.ProcessTeam(
                process_id=process.process_id,
                desk=desk,
                staff_id=staff_id,
                assigned_at_stage="intake" if desk == "rm" else None,
            )
        )


def assign_stage_staff(db: Session, process: models.Process, stage: str) -> None:
    mapping = STAGE_STAFF.get(stage, {})
    seats = db.query(models.ProcessTeam).filter_by(process_id=process.process_id).all()
    by_desk = {s.desk: s for s in seats}
    for desk, staff_id in mapping.items():
        seat = by_desk.get(desk)
        if seat:
            if not seat.staff_id:
                seat.staff_id = staff_id
                seat.assigned_at_stage = stage
        else:
            db.add(
                models.ProcessTeam(
                    process_id=process.process_id,
                    desk=desk,
                    staff_id=staff_id,
                    assigned_at_stage=stage,
                )
            )


def upsert_address(
    db: Session, existing_id: str | None, kind: str, parent_kind: str, parent_id: str, data: dict
) -> str:
    if existing_id:
        row = db.get(models.Address, existing_id)
    else:
        row = None
    if not row:
        row = models.Address(kind=kind, parent_kind=parent_kind, parent_id=parent_id)
        db.add(row)
        db.flush()
    row.kind = kind
    row.line1 = (data.get("line1") or "").strip()
    row.line2 = (data.get("line2") or "").strip()
    row.city = (data.get("city") or "").strip()
    row.state = (data.get("state") or "").strip()
    row.postal_code = digits_only(data.get("postalCode") or "")[:5]
    row.parent_kind = parent_kind
    row.parent_id = parent_id
    return row.address_id


def create_process(db: Session, user_id: str | None = None) -> models.Process:
    pid = new_id()
    year = utcnow().year
    number = f"CX1-{year}-{pid[:5].upper()}"
    process = models.Process(
        process_id=pid,
        process_number=number,
        current_stage="intake",
        stage_status="open",
        step="customer",
        user_id=user_id,
        owner_rm_id="rm-elena",
    )
    db.add(process)
    db.flush()
    seed_team(db, process)
    db.add(
        models.AuditEvent(
            process_id=pid, actor="Elena Voss", action="process.open", entity="Process", detail=number
        )
    )
    db.commit()
    db.refresh(process)
    return process


def save_customer(db: Session, process: models.Process, payload: dict, user=None) -> models.Customer:
    assert_can_write(process, user)
    if process.current_stage != "intake":
        raise HTTPException(status_code=409, detail="Customer CIP is locked after Intake.")
    first = (payload.get("firstName") or "").strip()
    last = (payload.get("lastName") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    phone = payload.get("phone") or ""
    dob = payload.get("dob") or ""
    if not first or not last:
        raise HTTPException(status_code=400, detail="First and last name are required.")
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Enter a valid email.")
    if len(digits_only(phone)) != 10:
        raise HTTPException(status_code=400, detail="Enter a 10-digit phone number.")
    if not adult_on(dob):
        raise HTTPException(status_code=400, detail="Applicant must be 18 or older.")
    for key, label in (("gender", "Gender"), ("race", "Race"), ("ethnicity", "Ethnicity")):
        if not payload.get(key):
            raise HTTPException(status_code=400, detail=f"{label} is required.")
    if not complete_address(payload.get("primary")):
        raise HTTPException(status_code=400, detail="Complete the primary address.")
    same = bool(payload.get("mailingSameAsPrimary", True))
    mailing = payload.get("primary") if same else payload.get("mailing")
    if not complete_address(mailing):
        raise HTTPException(status_code=400, detail="Complete the mailing address.")

    row = db.query(models.Customer).filter_by(process_id=process.process_id).first()
    ssn_raw = payload.get("ssn") or ""
    if row:
        token, last4 = row.ssn_token, row.ssn_last4
        if digits_only(ssn_raw) == 9 or (digits_only(ssn_raw) and "•" not in ssn_raw):
            if len(digits_only(ssn_raw)) != 9:
                raise HTTPException(status_code=400, detail="Enter a 9-digit SSN.")
            token, last4 = tokenize_tax_id(ssn_raw)
        email_changed = row.email != email
    else:
        if len(digits_only(ssn_raw)) != 9:
            raise HTTPException(status_code=400, detail="Enter a 9-digit SSN.")
        token, last4 = tokenize_tax_id(ssn_raw)
        email_changed = True
        row = models.Customer(
            process_id=process.process_id,
            first_name=first,
            last_name=last,
            email=email,
            phone=phone,
        )
        db.add(row)
        db.flush()

    row.first_name = first
    row.last_name = last
    row.email = email
    row.phone = phone
    row.dob = dob
    row.gender = payload.get("gender") or ""
    row.race = payload.get("race") or ""
    row.ethnicity = payload.get("ethnicity") or ""
    row.roles = "borrower"
    row.ssn_token = token
    row.ssn_last4 = last4
    if email_changed:
        row.email_confirmed = False
        row.email_verified = False
        row.auth_user_id = None
    row.mailing_same_as_primary = same
    row.primary_address_id = upsert_address(
        db, row.primary_address_id, "primary", "customer", row.customer_id, payload.get("primary") or {}
    )
    row.mailing_address_id = upsert_address(
        db, row.mailing_address_id, "mailing", "customer", row.customer_id, mailing or {}
    )
    process.customer_id = row.customer_id
    process.step = "business" if row.email_verified else "account"
    db.add(
        models.AuditEvent(
            process_id=process.process_id,
            actor="Elena Voss",
            action="customer.save",
            entity="Customer",
            detail=row.customer_id,
        )
    )
    db.commit()
    db.refresh(row)
    return row


def confirm_email(db: Session, process: models.Process, email: str, phone_last4: str, user=None) -> models.Customer:
    assert_can_write(process, user)
    row = db.query(models.Customer).filter_by(process_id=process.process_id).first()
    if not row:
        raise HTTPException(status_code=400, detail="Save the Customer first.")
    if (email or "").strip().lower() != row.email:
        raise HTTPException(status_code=400, detail="Must match the email on the Customer record.")
    if digits_only(phone_last4) != digits_only(row.phone)[-4:]:
        raise HTTPException(status_code=400, detail="Does not match the phone on file.")
    row.email_confirmed = True
    process.step = "account"
    db.add(
        models.AuditEvent(
            process_id=process.process_id,
            actor="Applicant",
            action="email.confirm",
            entity="Customer",
            detail=row.email,
        )
    )
    db.commit()
    return row


def bind_account(db: Session, process: models.Process, user: models.User) -> models.Customer:
    row = db.query(models.Customer).filter_by(process_id=process.process_id).first()
    if not row:
        raise HTTPException(status_code=400, detail="Save the Customer first.")
    if not row.email_confirmed:
        raise HTTPException(status_code=400, detail="Confirm the email first.")
    if user.email.lower() != row.email.lower():
        raise HTTPException(status_code=400, detail="Login email must match the Customer email.")
    row.email_verified = True
    row.auth_user_id = user.id
    process.user_id = user.id
    process.step = "business"
    user.email_verified = True
    user.name = user.name or f"{row.first_name} {row.last_name}"
    db.add(
        models.AuditEvent(
            process_id=process.process_id,
            actor="Applicant",
            action="account.bind",
            entity="ApplicantAccount",
            detail=user.id,
        )
    )
    db.commit()
    return row


def save_business(db: Session, process: models.Process, payload: dict, user=None) -> models.Business:
    assert_can_write(process, user)
    customer = db.query(models.Customer).filter_by(process_id=process.process_id).first()
    if not customer or not customer.email_verified:
        raise HTTPException(status_code=409, detail="Verify email and create the login first.")
    legal = (payload.get("legalName") or "").strip()
    if not legal:
        raise HTTPException(status_code=400, detail="Legal name is required.")
    if not payload.get("businessType"):
        raise HTTPException(status_code=400, detail="Business type is required.")
    if not payload.get("incorporatedOn"):
        raise HTTPException(status_code=400, detail="Formation date is required.")
    if len(digits_only(payload.get("naicsCode") or "")) != 6:
        raise HTTPException(status_code=400, detail="Enter a 6-digit NAICS code.")
    if not complete_address(payload.get("address")):
        raise HTTPException(status_code=400, detail="Complete the business address.")
    amount = payload.get("loanAmount") or ""
    try:
        if float(amount) <= 0:
            raise ValueError
    except ValueError:
        raise HTTPException(status_code=400, detail="Enter the requested amount.")
    if not payload.get("loanPurpose"):
        raise HTTPException(status_code=400, detail="Select a loan purpose.")

    row = db.query(models.Business).filter_by(process_id=process.process_id).first()
    tax_raw = payload.get("taxId") or ""
    if row:
        token, last4 = row.tax_id_token, row.tax_id_last4
        if "•" not in tax_raw and digits_only(tax_raw):
            if len(digits_only(tax_raw)) != 9:
                raise HTTPException(status_code=400, detail="Enter a 9-digit EIN or SSN.")
            token, last4 = tokenize_tax_id(tax_raw)
    else:
        if len(digits_only(tax_raw)) != 9:
            raise HTTPException(status_code=400, detail="Enter a 9-digit EIN or SSN.")
        token, last4 = tokenize_tax_id(tax_raw)
        row = models.Business(
            process_id=process.process_id,
            legal_name=legal,
        )
        db.add(row)
        db.flush()

    row.legal_name = legal
    row.business_type = payload.get("businessType") or ""
    row.incorporated_on = payload.get("incorporatedOn") or ""
    row.naics_code = digits_only(payload.get("naicsCode") or "")[:6]
    row.loan_amount = str(amount)
    row.loan_purpose = payload.get("loanPurpose") or ""
    row.tax_id_token = token
    row.tax_id_last4 = last4
    row.address_id = upsert_address(
        db, row.address_id, "primary", "business", row.business_id, payload.get("address") or {}
    )
    process.business_id = row.business_id
    process.step = "loan"
    db.add(
        models.AuditEvent(
            process_id=process.process_id,
            actor="Elena Voss",
            action="business.save",
            entity="Business",
            detail=row.business_id,
        )
    )
    db.commit()
    db.refresh(row)
    return row


def save_loan(db: Session, process: models.Process, payload: dict, user=None) -> models.Loan:
    assert_can_write(process, user)
    customer = db.query(models.Customer).filter_by(process_id=process.process_id).first()
    business = db.query(models.Business).filter_by(process_id=process.process_id).first()
    if not customer or not business:
        raise HTTPException(status_code=409, detail="Customer and Business are required.")
    if not payload.get("productId"):
        raise HTTPException(status_code=400, detail="Select a product.")
    if not payload.get("borrowerRef"):
        raise HTTPException(status_code=400, detail="Select the borrower.")
    try:
        if float(payload.get("loanAmount") or 0) <= 0:
            raise ValueError
    except ValueError:
        raise HTTPException(status_code=400, detail="Enter the loan amount.")

    row = db.query(models.Loan).filter_by(process_id=process.process_id).first()
    if not row:
        row = models.Loan(process_id=process.process_id)
        db.add(row)
        db.flush()
    row.borrower_ref = payload.get("borrowerRef") or ""
    row.product_id = payload.get("productId") or ""
    row.interest_rate = str(payload.get("interestRate") or "")
    row.loan_amount = str(payload.get("loanAmount") or "")
    row.basis = payload.get("basis") or "actual360"
    row.index_rate = payload.get("indexRate") or "prime"
    row.interest_only_payment = str(payload.get("interestOnlyPayment") or "")
    row.spread = str(payload.get("spread") or "")
    row.status = payload.get("status") or "processing"
    row.closing_date = payload.get("closingDate") or ""
    row.balloon = bool(payload.get("balloon"))
    row.afs_purpose_code = payload.get("afsPurposeCode") or ""
    row.first_prin_payment_date = payload.get("firstPrinPaymentDate") or ""
    row.prin_frequency = payload.get("prinFrequency") or "monthly"
    row.primary_collateral_id = payload.get("primaryCollateralId") or ""
    row.primary_client_id = payload.get("primaryClientId") or customer.customer_id
    row.primary_borrower_ref = payload.get("primaryBorrowerRef") or row.borrower_ref
    row.primary_business_id = payload.get("primaryBusinessId") or business.business_id
    row.guarantor_id = payload.get("guarantorId") or ""
    row.coborrower_id = payload.get("coborrowerId") or ""
    row.purpose_id = payload.get("purposeId") or business.loan_purpose
    row.saved = True
    process.loan_id = row.loan_id
    process.step = "loan"
    db.add(
        models.AuditEvent(
            process_id=process.process_id,
            actor="Elena Voss",
            action="loan.save",
            entity="Loan",
            detail=row.loan_id,
        )
    )
    db.commit()
    db.refresh(row)
    return row


def advance(db: Session, process: models.Process, user=None) -> models.Process:
    assert_can_write(process, user)
    stage = process.current_stage
    if stage == "intake":
        customer = db.query(models.Customer).filter_by(process_id=process.process_id).first()
        business = db.query(models.Business).filter_by(process_id=process.process_id).first()
        loan = db.query(models.Loan).filter_by(process_id=process.process_id).first()
        if not (customer and customer.email_verified and business and loan and loan.saved):
            raise HTTPException(
                status_code=409,
                detail="Complete Customer, email verification, Business, and save Loan details first.",
            )
    elif stage == "preApplication":
        consumer = (
            db.query(models.CreditPull)
            .filter_by(process_id=process.process_id, party_kind="customer")
            .first()
        )
        commercial = (
            db.query(models.CreditPull)
            .filter_by(process_id=process.process_id, party_kind="business")
            .first()
        )
        fraud = db.query(models.SanctionsScreen).filter_by(process_id=process.process_id).first()
        if not (
            consumer
            and commercial
            and fraud
            and consumer.outcome == "pass"
            and commercial.outcome == "pass"
            and fraud.outcome == "pass"
        ):
            raise HTTPException(
                status_code=409,
                detail="Consumer credit, business credit, and fraud must pass.",
            )
    elif stage == "processing":
        kyb = db.query(models.KybReport).filter_by(process_id=process.process_id).first()
        sba = db.query(models.SbaProfile).filter_by(process_id=process.process_id).first()
        if not kyb or not sba:
            raise HTTPException(status_code=409, detail="KYB and SBA profile are required.")
        if kyb.status == "fail":
            raise HTTPException(status_code=409, detail="KYB failed. Override must be logged.")
    elif stage == "collateral":
        items = db.query(models.CollateralItem).filter_by(process_id=process.process_id).count()
        pledges = db.query(models.CollateralPledge).filter_by(process_id=process.process_id).count()
        if items < 1 or pledges < 1:
            raise HTTPException(status_code=409, detail="Add at least one collateral item and pledge.")
    elif stage == "underwriter":
        decision = db.query(models.Decision).filter_by(process_id=process.process_id).first()
        if not decision or decision.action != "approve":
            raise HTTPException(status_code=409, detail="Human Decision must approve before documents.")
    elif stage == "documents":
        docs = db.query(models.DocumentRow).filter_by(process_id=process.process_id).all()
        if not docs or any(not d.imaged_ack or not d.reviewed for d in docs):
            raise HTTPException(status_code=409, detail="Required package must be imaged (ACK) and reviewed.")
    elif stage == "financing":
        g = db.query(models.GuarantySubmission).filter_by(process_id=process.process_id).first()
        if not g or g.status != "accepted":
            raise HTTPException(status_code=409, detail="Guaranty must be accepted.")
    elif stage == "closure":
        raise HTTPException(status_code=409, detail="Use dual-control post to seal.")

    nxt = next_stage(stage)
    if not nxt:
        raise HTTPException(status_code=409, detail="Already at the last stage.")
    process.current_stage = nxt
    assign_stage_staff(db, process, nxt)
    if nxt == "documents":
        ensure_documents(db, process)
    db.add(
        models.AuditEvent(
            process_id=process.process_id,
            actor="Stage owner",
            action="stage.advance",
            entity="Process",
            detail=f"{stage}->{nxt}",
        )
    )
    db.commit()
    db.refresh(process)
    return process


def ensure_documents(db: Session, process: models.Process) -> None:
    existing = db.query(models.DocumentRow).filter_by(process_id=process.process_id).count()
    if existing:
        return
    for name in CLOSING_DOCS:
        db.add(models.DocumentRow(process_id=process.process_id, name=name, status="required"))


def save_sba_profile(db: Session, process: models.Process, payload: dict, user=None) -> models.SbaProfile:
    assert_can_write(process, user)
    business = db.query(models.Business).filter_by(process_id=process.process_id).first()
    if not business:
        raise HTTPException(status_code=400, detail="Business required.")
    row = db.query(models.SbaProfile).filter_by(process_id=process.process_id).first()
    if not row:
        row = models.SbaProfile(process_id=process.process_id, business_id=business.business_id)
        db.add(row)
    row.business_id = business.business_id
    row.naics_code = digits_only(payload.get("naicsCode") or business.naics_code)[:6]
    row.employee_count = str(payload.get("employeeCount") or "")
    row.annual_receipts = str(payload.get("annualReceipts") or "")
    row.is_franchise = bool(payload.get("isFranchise"))
    row.size_standard_met = bool(payload.get("sizeStandardMet", True))
    row.notes = payload.get("notes") or ""
    db.add(
        models.AuditEvent(
            process_id=process.process_id,
            actor="Jordan Kim",
            action="sba.save",
            entity="SbaProfile",
            detail=row.sba_profile_id,
        )
    )
    db.commit()
    db.refresh(row)
    return row


def add_collateral(db: Session, process: models.Process, payload: dict, user=None) -> models.CollateralItem:
    assert_can_write(process, user)
    label = (payload.get("label") or "").strip()
    kind = payload.get("kind") or "other"
    if not label:
        raise HTTPException(status_code=400, detail="Describe the collateral.")
    item = models.CollateralItem(
        process_id=process.process_id,
        kind=kind,
        label=label,
        description=(payload.get("description") or "").strip(),
        value=str(payload.get("value") or ""),
        owner_ref=payload.get("ownerRef") or "",
    )
    db.add(item)
    db.flush()
    loan = db.query(models.Loan).filter_by(process_id=process.process_id).first()
    if payload.get("pledge", True) and loan:
        db.add(
            models.CollateralPledge(
                process_id=process.process_id,
                item_id=item.item_id,
                loan_id=loan.loan_id,
                lien_position=int(payload.get("lienPosition") or 1),
                pledged_value=str(payload.get("value") or ""),
            )
        )
        if not loan.primary_collateral_id:
            loan.primary_collateral_id = item.item_id
    if payload.get("carrier") or payload.get("policyNumber"):
        db.add(
            models.InsurancePolicy(
                process_id=process.process_id,
                item_id=item.item_id,
                carrier=payload.get("carrier") or "",
                policy_number=payload.get("policyNumber") or "",
                coverage_amount=payload.get("coverageAmount") or payload.get("value") or "",
                expires_on=payload.get("expiresOn") or "",
            )
        )
    db.add(
        models.AuditEvent(
            process_id=process.process_id,
            actor="Jordan Kim",
            action="collateral.add",
            entity="CollateralItem",
            detail=item.item_id,
        )
    )
    db.commit()
    db.refresh(item)
    return item


def record_decision(db: Session, process: models.Process, action: str, rationale: str, user=None) -> models.Decision:
    assert_can_write(process, user)
    if process.current_stage != "underwriter":
        raise HTTPException(status_code=409, detail="Decision is recorded at Underwriter.")
    if action not in ("approve", "pend", "reject"):
        raise HTTPException(status_code=400, detail="Action must be approve, pend, or reject.")
    scorecard = db.query(models.ScorecardResult).filter_by(process_id=process.process_id).first()
    if not scorecard:
        raise HTTPException(status_code=409, detail="Run the policy pack before deciding.")
    row = db.query(models.Decision).filter_by(process_id=process.process_id).first()
    if not row:
        row = models.Decision(process_id=process.process_id)
        db.add(row)
    row.action = action
    row.rationale = (rationale or "").strip()
    row.decided_by = "Diana Okonkwo"
    row.decided_at = utcnow()
    if action == "reject":
        process.stage_status = "rejected"
    elif action == "approve":
        process.current_stage = "documents"
        assign_stage_staff(db, process, "documents")
        ensure_documents(db, process)
    db.add(
        models.AuditEvent(
            process_id=process.process_id,
            actor="Diana Okonkwo",
            action="uw.decision",
            entity="Decision",
            detail=action,
        )
    )
    db.commit()
    db.refresh(row)
    return row


def update_document(db: Session, process: models.Process, payload: dict, user=None) -> models.DocumentRow:
    assert_can_write(process, user)
    if process.current_stage != "documents":
        raise HTTPException(status_code=409, detail="Documents are worked at the Documents stage.")
    row = db.get(models.DocumentRow, payload.get("documentId"))
    if not row or row.process_id != process.process_id:
        raise HTTPException(status_code=404, detail="Document not found.")
    row.imaged_ack = bool(payload.get("imagedAck"))
    row.reviewed = bool(payload.get("reviewed"))
    if row.imaged_ack and row.reviewed:
        row.status = "filed"
    elif row.imaged_ack:
        row.status = "imaged"
    db.add(
        models.AuditEvent(
            process_id=process.process_id,
            actor="Sam Ruiz",
            action="document.update",
            entity="Document",
            detail=row.name,
        )
    )
    db.commit()
    db.refresh(row)
    return row


def submit_guaranty(db: Session, process: models.Process, authorize: bool, user=None) -> models.GuarantySubmission:
    assert_can_write(process, user)
    if process.current_stage != "financing":
        raise HTTPException(status_code=409, detail="Guaranty is submitted at Financing.")
    loan = db.query(models.Loan).filter_by(process_id=process.process_id).first()
    row = db.query(models.GuarantySubmission).filter_by(process_id=process.process_id).first()
    if not row:
        row = models.GuarantySubmission(process_id=process.process_id)
        db.add(row)
    if authorize:
        row.status = "accepted"
        if not row.guaranty_number:
            row.guaranty_number = f"SBA-{process.process_number.replace('CX1-', '')}"
        row.submitted_at = utcnow()
        row.summary = "Human-authorized E-Tran accepted. Guaranty number stored on Loan."
        if loan:
            loan.guaranty_number = row.guaranty_number
            loan.guaranty_status = "accepted"
            loan.funded_on = utcnow().date().isoformat()
    else:
        row.status = "draft"
        row.summary = "E-Tran draft. Waiting for human authorization. No guaranty number yet."
    db.add(
        models.AuditEvent(
            process_id=process.process_id,
            actor="Sam Ruiz",
            action="etran.authorize" if authorize else "etran.draft",
            entity="GuarantySubmission",
            detail=row.status,
        )
    )
    db.commit()
    db.refresh(row)
    return row


def post_ledger(db: Session, process: models.Process, dual_control: bool, user=None) -> models.LedgerPost:
    assert_can_write(process, user)
    if process.current_stage != "closure":
        raise HTTPException(status_code=409, detail="Ledger post is at Closure.")
    g = db.query(models.GuarantySubmission).filter_by(process_id=process.process_id).first()
    if not g or g.status != "accepted":
        raise HTTPException(status_code=409, detail="Guaranty must be accepted before posting.")
    row = db.query(models.LedgerPost).filter_by(process_id=process.process_id).first()
    if not row:
        row = models.LedgerPost(process_id=process.process_id)
        db.add(row)
    if not dual_control:
        row.status = "draft"
        row.dual_control = False
        row.sealed = False
        row.summary = "Ledger draft. Dual-control required to seal."
    else:
        row.status = "posted"
        row.dual_control = True
        row.sealed = True
        row.posted_at = utcnow()
        row.summary = "Dual-control post. Process sealed."
        process.stage_status = "sealed"
        process.sealed_at = utcnow()
    db.add(
        models.AuditEvent(
            process_id=process.process_id,
            actor="Sam Ruiz",
            action="ledger.post" if dual_control else "ledger.draft",
            entity="LedgerPost",
            detail=row.status,
        )
    )
    db.commit()
    db.refresh(row)
    return row
