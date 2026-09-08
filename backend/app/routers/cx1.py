from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .. import services
from ..agents import supervisor, workers
from ..agents.llm import llm_status
from ..catalog import catalog_payload
from ..db import get_db
from ..models import User
from ..security import current_user_optional
from ..serialize import file_dict

router = APIRouter(prefix="/api/cx1", tags=["origination"])


class CustomerBody(BaseModel):
    firstName: str = ""
    lastName: str = ""
    email: str = ""
    phone: str = ""
    ssn: str = ""
    dob: str = ""
    gender: str = ""
    race: str = ""
    ethnicity: str = ""
    primary: dict = Field(default_factory=dict)
    mailing: dict = Field(default_factory=dict)
    mailingSameAsPrimary: bool = True


class ConfirmBody(BaseModel):
    email: str
    phoneLast4: str


class AccountBody(BaseModel):
    password: str = Field(min_length=8)
    name: str = ""


class BusinessBody(BaseModel):
    legalName: str = ""
    taxId: str = ""
    businessType: str = ""
    incorporatedOn: str = ""
    naicsCode: str = ""
    address: dict = Field(default_factory=dict)
    loanAmount: str = ""
    loanPurpose: str = ""


class LoanBody(BaseModel):
    model_config = {"extra": "allow"}

    borrowerRef: str = ""
    productId: str = ""
    interestRate: str = ""
    loanAmount: str = ""
    basis: str = "actual360"
    indexRate: str = "prime"
    interestOnlyPayment: str = ""
    spread: str = ""
    status: str = "processing"
    closingDate: str = ""
    balloon: bool = False
    afsPurposeCode: str = ""
    firstPrinPaymentDate: str = ""
    prinFrequency: str = "monthly"
    primaryCollateralId: str = ""
    primaryClientId: str = ""
    primaryBorrowerRef: str = ""
    primaryBusinessId: str = ""
    guarantorId: str = ""
    coborrowerId: str = ""
    purposeId: str = ""


class SbaBody(BaseModel):
    naicsCode: str = ""
    employeeCount: str = ""
    annualReceipts: str = ""
    isFranchise: bool = False
    sizeStandardMet: bool = True
    notes: str = ""


class CollateralBody(BaseModel):
    kind: str = "other"
    label: str = ""
    description: str = ""
    value: str = ""
    ownerRef: str = ""
    pledge: bool = True
    lienPosition: int = 1
    carrier: str = ""
    policyNumber: str = ""
    coverageAmount: str = ""
    expiresOn: str = ""


class DecisionBody(BaseModel):
    action: str
    rationale: str = ""


class AgentBody(BaseModel):
    consumerSource: str = "equifax"
    consumerProduct: str = "fico9"
    businessSource: str = "experianBusiness"
    businessProduct: str = "intelliscorePlus"
    kybSource: str = "sos"


class DocumentBody(BaseModel):
    documentId: str
    imagedAck: bool = False
    reviewed: bool = False


class GuarantyBody(BaseModel):
    authorize: bool = False


class LedgerBody(BaseModel):
    dualControl: bool = False


def _file(db: Session, process):
    return file_dict(db, process)


@router.get("/catalog")
def catalog():
    return catalog_payload()


@router.get("/llm")
def llm():
    return llm_status()


@router.post("/processes")
def create_process(db: Session = Depends(get_db), user: User | None = Depends(current_user_optional)):
    process = services.create_process(db, user.id if user else None)
    return _file(db, process)


@router.get("/processes/{process_id}")
def get_process(process_id: str, db: Session = Depends(get_db)):
    process = services.get_process(db, process_id)
    return _file(db, process)


@router.put("/processes/{process_id}/customer")
def save_customer(
    process_id: str,
    body: CustomerBody,
    db: Session = Depends(get_db),
    user: User | None = Depends(current_user_optional),
):
    process = services.get_process(db, process_id)
    services.save_customer(db, process, body.model_dump(), user)
    db.refresh(process)
    return _file(db, process)


@router.post("/processes/{process_id}/confirm-email")
def confirm_email(
    process_id: str,
    body: ConfirmBody,
    db: Session = Depends(get_db),
    user: User | None = Depends(current_user_optional),
):
    process = services.get_process(db, process_id)
    services.confirm_email(db, process, body.email, body.phoneLast4, user)
    db.refresh(process)
    return _file(db, process)


@router.post("/processes/{process_id}/account")
def bind_account(
    process_id: str,
    body: AccountBody,
    response: Response,
    db: Session = Depends(get_db),
    user: User | None = Depends(current_user_optional),
):
    from .. import models
    from ..routers.auth import _issue
    from ..security import hash_password, verify_password

    process = services.get_process(db, process_id)
    customer = db.query(models.Customer).filter_by(process_id=process.process_id).first()
    if not customer:
        raise HTTPException(status_code=400, detail="Save the Customer first.")
    if not customer.email_confirmed:
        raise HTTPException(status_code=400, detail="Confirm the email first.")

    account = user if user and user.email.lower() == customer.email.lower() else None
    if not account:
        account = db.query(models.User).filter(models.User.email == customer.email).first()
        if account:
            if not verify_password(body.password, account.password_hash):
                raise HTTPException(status_code=401, detail="Email or password is incorrect.")
        else:
            account = models.User(
                email=customer.email,
                name=body.name or f"{customer.first_name} {customer.last_name}",
                password_hash=hash_password(body.password),
                email_verified=True,
            )
            db.add(account)
            db.flush()
    services.bind_account(db, process, account)
    _issue(db, account, response)
    db.refresh(process)
    return _file(db, process)


@router.put("/processes/{process_id}/business")
def save_business(
    process_id: str,
    body: BusinessBody,
    db: Session = Depends(get_db),
    user: User | None = Depends(current_user_optional),
):
    process = services.get_process(db, process_id)
    services.save_business(db, process, body.model_dump(), user)
    db.refresh(process)
    return _file(db, process)


@router.put("/processes/{process_id}/loan")
def save_loan(
    process_id: str,
    body: LoanBody,
    db: Session = Depends(get_db),
    user: User | None = Depends(current_user_optional),
):
    process = services.get_process(db, process_id)
    services.save_loan(db, process, body.model_dump(), user)
    db.refresh(process)
    return _file(db, process)


@router.post("/processes/{process_id}/advance")
def advance(
    process_id: str,
    db: Session = Depends(get_db),
    user: User | None = Depends(current_user_optional),
):
    process = services.get_process(db, process_id)
    services.advance(db, process, user)
    db.refresh(process)
    return _file(db, process)


@router.post("/processes/{process_id}/agents/run")
def run_stage_agents(
    process_id: str,
    body: AgentBody | None = None,
    db: Session = Depends(get_db),
    user: User | None = Depends(current_user_optional),
):
    process = services.get_process(db, process_id)
    services.assert_can_write(process, user)
    extra = body.model_dump() if body else {}
    try:
        supervisor.dispatch(db, process, extra)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    db.refresh(process)
    return _file(db, process)


@router.post("/processes/{process_id}/agents/consumer-credit")
def consumer_credit(
    process_id: str,
    body: AgentBody,
    db: Session = Depends(get_db),
    user: User | None = Depends(current_user_optional),
):
    process = services.get_process(db, process_id)
    services.assert_can_write(process, user)
    try:
        workers.run_consumer_credit(db, process, body.consumerSource, body.consumerProduct)
        db.commit()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    db.refresh(process)
    return _file(db, process)


@router.post("/processes/{process_id}/agents/commercial-credit")
def commercial_credit(
    process_id: str,
    body: AgentBody,
    db: Session = Depends(get_db),
    user: User | None = Depends(current_user_optional),
):
    process = services.get_process(db, process_id)
    services.assert_can_write(process, user)
    try:
        workers.run_commercial_credit(db, process, body.businessSource, body.businessProduct)
        db.commit()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    db.refresh(process)
    return _file(db, process)


@router.post("/processes/{process_id}/agents/sanctions")
def sanctions(
    process_id: str,
    db: Session = Depends(get_db),
    user: User | None = Depends(current_user_optional),
):
    process = services.get_process(db, process_id)
    services.assert_can_write(process, user)
    workers.run_sanctions(db, process)
    db.commit()
    db.refresh(process)
    return _file(db, process)


@router.post("/processes/{process_id}/agents/kyb")
def kyb(
    process_id: str,
    body: AgentBody,
    db: Session = Depends(get_db),
    user: User | None = Depends(current_user_optional),
):
    process = services.get_process(db, process_id)
    services.assert_can_write(process, user)
    try:
        workers.run_kyb(db, process, body.kybSource)
        db.commit()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    db.refresh(process)
    return _file(db, process)


@router.put("/processes/{process_id}/sba-profile")
def sba_profile(
    process_id: str,
    body: SbaBody,
    db: Session = Depends(get_db),
    user: User | None = Depends(current_user_optional),
):
    process = services.get_process(db, process_id)
    services.save_sba_profile(db, process, body.model_dump(), user)
    db.refresh(process)
    return _file(db, process)


@router.post("/processes/{process_id}/collateral")
def add_collateral(
    process_id: str,
    body: CollateralBody,
    db: Session = Depends(get_db),
    user: User | None = Depends(current_user_optional),
):
    process = services.get_process(db, process_id)
    services.add_collateral(db, process, body.model_dump(), user)
    db.refresh(process)
    return _file(db, process)


@router.post("/processes/{process_id}/decision")
def decision(
    process_id: str,
    body: DecisionBody,
    db: Session = Depends(get_db),
    user: User | None = Depends(current_user_optional),
):
    process = services.get_process(db, process_id)
    services.record_decision(db, process, body.action, body.rationale, user)
    db.refresh(process)
    return _file(db, process)


@router.post("/processes/{process_id}/documents")
def update_document(
    process_id: str,
    body: DocumentBody,
    db: Session = Depends(get_db),
    user: User | None = Depends(current_user_optional),
):
    process = services.get_process(db, process_id)
    services.update_document(db, process, body.model_dump(), user)
    db.refresh(process)
    return _file(db, process)


@router.post("/processes/{process_id}/guaranty")
def guaranty(
    process_id: str,
    body: GuarantyBody,
    db: Session = Depends(get_db),
    user: User | None = Depends(current_user_optional),
):
    process = services.get_process(db, process_id)
    services.submit_guaranty(db, process, body.authorize, user)
    db.refresh(process)
    return _file(db, process)


@router.post("/processes/{process_id}/ledger")
def ledger(
    process_id: str,
    body: LedgerBody,
    db: Session = Depends(get_db),
    user: User | None = Depends(current_user_optional),
):
    process = services.get_process(db, process_id)
    services.post_ledger(db, process, body.dualControl, user)
    db.refresh(process)
    return _file(db, process)
