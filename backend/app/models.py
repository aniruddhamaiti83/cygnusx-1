import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    password_hash: Mapped[str] = mapped_column(String(255))
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    sessions: Mapped[list["Session"]] = relationship(back_populates="user")


class Session(Base):
    __tablename__ = "sessions"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    user: Mapped[User] = relationship(back_populates="sessions")


class Address(Base):
    __tablename__ = "addresses"

    address_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    kind: Mapped[str] = mapped_column(String(32))
    line1: Mapped[str] = mapped_column(String(255), default="")
    line2: Mapped[str] = mapped_column(String(255), default="")
    city: Mapped[str] = mapped_column(String(128), default="")
    state: Mapped[str] = mapped_column(String(8), default="")
    postal_code: Mapped[str] = mapped_column(String(16), default="")
    parent_kind: Mapped[str] = mapped_column(String(32), default="")
    parent_id: Mapped[str] = mapped_column(String(36), default="", index=True)


class Process(Base):
    __tablename__ = "processes"

    process_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    process_number: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    current_stage: Mapped[str] = mapped_column(String(32), default="intake")
    stage_status: Mapped[str] = mapped_column(String(32), default="open")
    step: Mapped[str] = mapped_column(String(32), default="customer")
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    customer_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    business_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    loan_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    owner_rm_id: Mapped[str] = mapped_column(String(32), default="rm-elena")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    sealed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    customer: Mapped["Customer | None"] = relationship(
        back_populates="process", uselist=False, foreign_keys="Customer.process_id"
    )
    business: Mapped["Business | None"] = relationship(
        back_populates="process", uselist=False, foreign_keys="Business.process_id"
    )
    loan: Mapped["Loan | None"] = relationship(
        back_populates="process", uselist=False, foreign_keys="Loan.process_id"
    )
    team: Mapped[list["ProcessTeam"]] = relationship(back_populates="process")


class Customer(Base):
    __tablename__ = "customers"

    customer_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    process_id: Mapped[str] = mapped_column(ForeignKey("processes.process_id"), unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(128), default="")
    last_name: Mapped[str] = mapped_column(String(128), default="")
    email: Mapped[str] = mapped_column(String(255), index=True, default="")
    phone: Mapped[str] = mapped_column(String(32), default="")
    email_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    auth_user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    ssn_token: Mapped[str] = mapped_column(String(64), default="")
    ssn_last4: Mapped[str] = mapped_column(String(4), default="")
    dob: Mapped[str] = mapped_column(String(16), default="")
    gender: Mapped[str] = mapped_column(String(32), default="")
    race: Mapped[str] = mapped_column(String(32), default="")
    ethnicity: Mapped[str] = mapped_column(String(32), default="")
    roles: Mapped[str] = mapped_column(String(255), default="borrower")
    primary_address_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    mailing_address_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    mailing_same_as_primary: Mapped[bool] = mapped_column(Boolean, default=True)

    process: Mapped[Process] = relationship(back_populates="customer", foreign_keys=[process_id])


class Business(Base):
    __tablename__ = "businesses"

    business_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    process_id: Mapped[str] = mapped_column(ForeignKey("processes.process_id"), unique=True, index=True)
    legal_name: Mapped[str] = mapped_column(String(255), default="")
    tax_id_token: Mapped[str] = mapped_column(String(64), default="")
    tax_id_last4: Mapped[str] = mapped_column(String(4), default="")
    business_type: Mapped[str] = mapped_column(String(32), default="")
    incorporated_on: Mapped[str] = mapped_column(String(16), default="")
    naics_code: Mapped[str] = mapped_column(String(8), default="")
    address_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    loan_amount: Mapped[str] = mapped_column(String(32), default="")
    loan_purpose: Mapped[str] = mapped_column(String(32), default="")

    process: Mapped[Process] = relationship(back_populates="business", foreign_keys=[process_id])


class Loan(Base):
    __tablename__ = "loans"

    loan_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    process_id: Mapped[str] = mapped_column(ForeignKey("processes.process_id"), unique=True, index=True)
    borrower_ref: Mapped[str] = mapped_column(String(64), default="")
    product_id: Mapped[str] = mapped_column(String(32), default="")
    interest_rate: Mapped[str] = mapped_column(String(16), default="")
    loan_amount: Mapped[str] = mapped_column(String(32), default="")
    basis: Mapped[str] = mapped_column(String(32), default="actual360")
    index_rate: Mapped[str] = mapped_column(String(32), default="prime")
    interest_only_payment: Mapped[str] = mapped_column(String(32), default="")
    spread: Mapped[str] = mapped_column(String(16), default="")
    status: Mapped[str] = mapped_column(String(32), default="processing")
    closing_date: Mapped[str] = mapped_column(String(16), default="")
    balloon: Mapped[bool] = mapped_column(Boolean, default=False)
    afs_purpose_code: Mapped[str] = mapped_column(String(8), default="")
    first_prin_payment_date: Mapped[str] = mapped_column(String(16), default="")
    prin_frequency: Mapped[str] = mapped_column(String(32), default="monthly")
    primary_collateral_id: Mapped[str] = mapped_column(String(36), default="")
    primary_client_id: Mapped[str] = mapped_column(String(36), default="")
    primary_borrower_ref: Mapped[str] = mapped_column(String(64), default="")
    primary_business_id: Mapped[str] = mapped_column(String(36), default="")
    guarantor_id: Mapped[str] = mapped_column(String(36), default="")
    coborrower_id: Mapped[str] = mapped_column(String(36), default="")
    purpose_id: Mapped[str] = mapped_column(String(32), default="")
    guaranty_percent: Mapped[str] = mapped_column(String(16), default="")
    guaranty_number: Mapped[str] = mapped_column(String(64), default="")
    guaranty_status: Mapped[str] = mapped_column(String(32), default="")
    funded_on: Mapped[str] = mapped_column(String(16), default="")
    saved: Mapped[bool] = mapped_column(Boolean, default=False)

    process: Mapped[Process] = relationship(back_populates="loan", foreign_keys=[process_id])


class ProcessTeam(Base):
    __tablename__ = "process_team"
    __table_args__ = (UniqueConstraint("process_id", "desk", name="uq_team_desk"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    process_id: Mapped[str] = mapped_column(ForeignKey("processes.process_id"), index=True)
    desk: Mapped[str] = mapped_column(String(32))
    staff_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    assigned_at_stage: Mapped[str | None] = mapped_column(String(32), nullable=True)

    process: Mapped[Process] = relationship(back_populates="team")


class CreditPull(Base):
    __tablename__ = "credit_pulls"
    __table_args__ = (UniqueConstraint("process_id", "party_kind", name="uq_pull_party"),)

    pull_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    process_id: Mapped[str] = mapped_column(ForeignKey("processes.process_id"), index=True)
    party_kind: Mapped[str] = mapped_column(String(16))
    party_id: Mapped[str] = mapped_column(String(36))
    source: Mapped[str] = mapped_column(String(32))
    product_code: Mapped[str] = mapped_column(String(32))
    score: Mapped[float] = mapped_column(Float, default=0)
    artefact_id: Mapped[str] = mapped_column(String(36), default=new_id)
    fcra_purpose: Mapped[str | None] = mapped_column(String(36), nullable=True)
    outcome: Mapped[str] = mapped_column(String(16), default="fail")
    ran_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    actor: Mapped[str] = mapped_column(String(128), default="")
    summary: Mapped[str] = mapped_column(Text, default="")
    provider: Mapped[str] = mapped_column(String(64), default="")


class SanctionsScreen(Base):
    __tablename__ = "sanctions_screens"

    screen_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    process_id: Mapped[str] = mapped_column(ForeignKey("processes.process_id"), unique=True, index=True)
    artefact_id: Mapped[str] = mapped_column(String(36), default=new_id)
    outcome: Mapped[str] = mapped_column(String(16), default="fail")
    ran_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    actor: Mapped[str] = mapped_column(String(128), default="")
    summary: Mapped[str] = mapped_column(Text, default="")
    provider: Mapped[str] = mapped_column(String(64), default="")


class KybReport(Base):
    __tablename__ = "kyb_reports"

    kyb_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    process_id: Mapped[str] = mapped_column(ForeignKey("processes.process_id"), unique=True, index=True)
    business_id: Mapped[str] = mapped_column(String(36))
    source: Mapped[str] = mapped_column(String(32), default="sos")
    status: Mapped[str] = mapped_column(String(16), default="clear")
    ran_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    actor: Mapped[str] = mapped_column(String(128), default="")
    summary: Mapped[str] = mapped_column(Text, default="")
    artefact_id: Mapped[str] = mapped_column(String(36), default=new_id)
    provider: Mapped[str] = mapped_column(String(64), default="")


class SbaProfile(Base):
    __tablename__ = "sba_profiles"

    sba_profile_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    process_id: Mapped[str] = mapped_column(ForeignKey("processes.process_id"), unique=True, index=True)
    business_id: Mapped[str] = mapped_column(String(36))
    naics_code: Mapped[str] = mapped_column(String(8), default="")
    employee_count: Mapped[str] = mapped_column(String(16), default="")
    annual_receipts: Mapped[str] = mapped_column(String(32), default="")
    is_franchise: Mapped[bool] = mapped_column(Boolean, default=False)
    size_standard_met: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str] = mapped_column(Text, default="")


class CollateralItem(Base):
    __tablename__ = "collateral_items"

    item_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    process_id: Mapped[str] = mapped_column(ForeignKey("processes.process_id"), index=True)
    kind: Mapped[str] = mapped_column(String(32))
    label: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    value: Mapped[str] = mapped_column(String(32), default="")
    owner_ref: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class CollateralPledge(Base):
    __tablename__ = "collateral_pledges"

    pledge_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    process_id: Mapped[str] = mapped_column(ForeignKey("processes.process_id"), index=True)
    item_id: Mapped[str] = mapped_column(ForeignKey("collateral_items.item_id"))
    loan_id: Mapped[str] = mapped_column(String(36))
    lien_position: Mapped[int] = mapped_column(Integer, default=1)
    pledged_value: Mapped[str] = mapped_column(String(32), default="")
    exception_note: Mapped[str] = mapped_column(Text, default="")


class InsurancePolicy(Base):
    __tablename__ = "insurance_policies"

    policy_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    process_id: Mapped[str] = mapped_column(ForeignKey("processes.process_id"), index=True)
    item_id: Mapped[str] = mapped_column(String(36), default="")
    carrier: Mapped[str] = mapped_column(String(128), default="")
    policy_number: Mapped[str] = mapped_column(String(64), default="")
    coverage_amount: Mapped[str] = mapped_column(String(32), default="")
    expires_on: Mapped[str] = mapped_column(String(16), default="")


class ScorecardResult(Base):
    __tablename__ = "scorecard_results"

    scorecard_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    process_id: Mapped[str] = mapped_column(ForeignKey("processes.process_id"), unique=True, index=True)
    recommended_action: Mapped[str] = mapped_column(String(16), default="pend")
    confidence: Mapped[float] = mapped_column(Float, default=0.5)
    factors_json: Mapped[str] = mapped_column(Text, default="[]")
    narrative: Mapped[str] = mapped_column(Text, default="")
    artefact_id: Mapped[str] = mapped_column(String(36), default=new_id)
    provider: Mapped[str] = mapped_column(String(64), default="")
    model_name: Mapped[str] = mapped_column(String(64), default="")
    ran_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    actor: Mapped[str] = mapped_column(String(128), default="Credit policy pack")


class Decision(Base):
    __tablename__ = "decisions"

    decision_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    process_id: Mapped[str] = mapped_column(ForeignKey("processes.process_id"), unique=True, index=True)
    action: Mapped[str] = mapped_column(String(16))
    rationale: Mapped[str] = mapped_column(Text, default="")
    decided_by: Mapped[str] = mapped_column(String(128), default="Diana Okonkwo")
    decided_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class DocumentRow(Base):
    __tablename__ = "documents"

    document_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    process_id: Mapped[str] = mapped_column(ForeignKey("processes.process_id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(32), default="required")
    imaged_ack: Mapped[bool] = mapped_column(Boolean, default=False)
    reviewed: Mapped[bool] = mapped_column(Boolean, default=False)


class GuarantySubmission(Base):
    __tablename__ = "guaranty_submissions"

    submission_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    process_id: Mapped[str] = mapped_column(ForeignKey("processes.process_id"), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(32), default="draft")
    guaranty_number: Mapped[str] = mapped_column(String(64), default="")
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    summary: Mapped[str] = mapped_column(Text, default="")


class LedgerPost(Base):
    __tablename__ = "ledger_posts"

    post_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    process_id: Mapped[str] = mapped_column(ForeignKey("processes.process_id"), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(32), default="draft")
    dual_control: Mapped[bool] = mapped_column(Boolean, default=False)
    sealed: Mapped[bool] = mapped_column(Boolean, default=False)
    summary: Mapped[str] = mapped_column(Text, default="")
    posted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class AgentEvent(Base):
    __tablename__ = "agent_events"

    event_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    process_id: Mapped[str] = mapped_column(ForeignKey("processes.process_id"), index=True)
    stage: Mapped[str] = mapped_column(String(32), default="")
    agent_id: Mapped[str] = mapped_column(String(64), default="")
    agent_name: Mapped[str] = mapped_column(String(128), default="")
    kind: Mapped[str] = mapped_column(String(16), default="worker")
    action: Mapped[str] = mapped_column(String(64), default="")
    detail: Mapped[str] = mapped_column(Text, default="")
    artefact_id: Mapped[str] = mapped_column(String(36), default="")
    confidence: Mapped[float] = mapped_column(Float, default=0)
    provider: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    audit_id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    process_id: Mapped[str] = mapped_column(String(36), index=True, default="")
    actor: Mapped[str] = mapped_column(String(128), default="")
    action: Mapped[str] = mapped_column(String(64), default="")
    entity: Mapped[str] = mapped_column(String(64), default="")
    detail: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
