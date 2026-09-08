export type RecordAction = {
  verb: "create" | "assign" | "update" | "gate";
  record: string;
  detail: string;
};

export type StageFlow = {
  id: string;
  n: string;
  name: string;
  purpose: string;
  gate: string;
  records: RecordAction[];
};

export const STAGE_FLOWS: StageFlow[] = [
  {
    id: "01",
    n: "01",
    name: "Initial Application",
    purpose: "Open the origination file. Identity and login first, then Business, then Loan keepers.",
    gate: "Customer email verified, ApplicantAccount bound, Business and Loan saved. Incomplete work loops here.",
    records: [
      {
        verb: "create",
        record: "Process",
        detail:
          "Parent of the file. processId, processNumber (CX1-YYYY-nnnnn), currentStage = 01, stageStatus = open.",
      },
      {
        verb: "create",
        record: "Customer",
        detail:
          "Person: firstName, lastName, email, phone, ssnToken + ssnLast4, dob, gender, race, ethnicity. Role defaults to borrower.",
      },
      {
        verb: "create",
        record: "ApplicantAccount",
        detail:
          "Email confirmation (re-enter email + last four of phone) then password login. Sets Customer.emailVerified and authUserId. Business stays locked until this row exists.",
      },
      {
        verb: "create",
        record: "Address",
        detail: "Rows kind = primary and mailing, linked to the Customer (and later the Business).",
      },
      {
        verb: "create",
        record: "Business",
        detail:
          "Operating company: legalName, taxIdToken, businessType, incorporatedOn, naicsCode, primary address, requested amount and purpose.",
      },
      {
        verb: "create",
        record: "Loan",
        detail:
          "1:1 facility on this Process. productId, loanAmount, rate, basis, index, spread, IO, status, dates, collateral/client/borrower/business/guarantor/coborrower lookups.",
      },
      {
        verb: "assign",
        record: "ProcessTeam",
        detail: "Elena Voss (RM) assigned at intake. Other desks remain unassigned.",
      },
      {
        verb: "assign",
        record: "ProcessParticipant",
        detail:
          "Business is typically primary borrower; Customer is guarantor (roles is a set). borrowerRef on Loan may switch to Customer.",
      },
      {
        verb: "gate",
        record: "Process",
        detail: "RM moves the file to Pre-application only after Customer, verified login, Business, and Loan are saved.",
      },
    ],
  },
  {
    id: "02",
    n: "02",
    name: "Pre-Application",
    purpose: "Consumer CRA on the liable person, commercial bureau on the Business, OFAC on every participant.",
    gate: "Consumer pull, commercial pull, and OFAC must pass. Fail closes the process. Incomplete checks loop here.",
    records: [
      {
        verb: "assign",
        record: "ProcessTeam",
        detail: "Marcus Hale (credit) and Priya Shah (fraud) assigned at preApplication.",
      },
      {
        verb: "create",
        record: "CreditPull (consumer)",
        detail:
          "partyKind = customer. Equifax / Experian / TransUnion. FCRA purpose = this processId. artefactId stored. No re-pull on retry.",
      },
      {
        verb: "create",
        record: "CreditPull (commercial)",
        detail:
          "partyKind = business. Experian Business, Equifax SBFE, or D&B PAYDEX. Not a consumer FICO and not SBSS (sunset 1 Mar 2026).",
      },
      {
        verb: "create",
        record: "SanctionsScreen",
        detail: "OFAC / SDN on each participant. Hit → process rejected. Fraud is not a bureau.",
      },
      {
        verb: "gate",
        record: "Process",
        detail: "All three pass → currentStage = 03. Any fail → stageStatus = rejected.",
      },
    ],
  },
  {
    id: "03",
    n: "03",
    name: "Processing",
    purpose: "Spread statements, KYB, size/eligibility, debts. Still inside origination.",
    gate: "Spreads and KYB accepted (or logged override). Incomplete activities loop here.",
    records: [
      {
        verb: "assign",
        record: "ProcessTeam",
        detail: "Jordan Kim (processor) assigned at processing.",
      },
      {
        verb: "create",
        record: "KybReport",
        detail: "Vendor-agnostic KYB on the Business. Source stored on the row.",
      },
      {
        verb: "create",
        record: "SbaProfile",
        detail: "Size standard, NAICS eligibility, franchise flag, receipts and employees on the org.",
      },
      {
        verb: "create",
        record: "SpreadPeriod",
        detail: "Period headers and line items, confidence score. Override is logged, not silent.",
      },
      {
        verb: "create",
        record: "DebtObligation",
        detail: "Business and personal liabilities used in global cash flow.",
      },
      {
        verb: "update",
        record: "Loan",
        detail: "Working terms refined from spreading — loanAmount, purposeId.",
      },
    ],
  },
  {
    id: "04",
    n: "04",
    name: "Collateral",
    purpose: "Typed collateral on this loan. Nothing pledged without an item.",
    gate: "At least one validated CollateralItem + Pledge, or a documented exception.",
    records: [
      {
        verb: "create",
        record: "CollateralItem",
        detail: "kind = realEstate | vehicle | equipment | ag | general | liquid. Payload per type.",
      },
      {
        verb: "create",
        record: "CollateralPledge",
        detail: "Links the item to this process’s Loan. Lien position, pledgeValue.",
      },
      {
        verb: "create",
        record: "InsurancePolicy",
        detail: "Required coverage on pledged items or the company.",
      },
      {
        verb: "update",
        record: "Loan",
        detail: "primaryCollateralId set from the pledge.",
      },
    ],
  },
  {
    id: "05",
    n: "05",
    name: "Underwriter",
    purpose: "Human of record. Scorecard recommends; it does not decide.",
    gate: "Approve → stage 06. Pend → loop in 05. Reject → process closed.",
    records: [
      {
        verb: "assign",
        record: "ProcessTeam",
        detail: "Diana Okonkwo (underwriter) assigned.",
      },
      {
        verb: "create",
        record: "ScorecardResult",
        detail: "Policy engine output. Child of the forthcoming Decision — never a substitute.",
      },
      {
        verb: "create",
        record: "Decision",
        detail: "Human approve / pend / reject, actor, riskGrade, conditions.",
      },
      {
        verb: "update",
        record: "Loan",
        detail: "On approve: interestRate, guarantyPercent, closingDate, installment fields.",
      },
      {
        verb: "gate",
        record: "Process",
        detail: "Reject → stageStatus = rejected. Approve → currentStage = 06.",
      },
    ],
  },
  {
    id: "06",
    n: "06",
    name: "Document Processing",
    purpose: "Closing package. A document is not filed without imaging ACK.",
    gate: "Required package imaged and reviewed. Incomplete docs loop here.",
    records: [
      {
        verb: "assign",
        record: "ProcessTeam",
        detail: "Sam Ruiz (closer) assigned.",
      },
      {
        verb: "create",
        record: "Document",
        detail: "Checklist items (note, guaranty, corporate docs, insurance). Status = received | imaged | filed.",
      },
      {
        verb: "update",
        record: "Document",
        detail: "Imaging ACK required before filed = true. Retention class set.",
      },
      {
        verb: "update",
        record: "Loan",
        detail: "closingDate when package is complete and executed.",
      },
    ],
  },
  {
    id: "07",
    n: "07",
    name: "Financing",
    purpose: "SBA guaranty and bank funding. Human-authorized E-Tran only.",
    gate: "Guaranty accepted and ledger draft ready. Incomplete funding loops here.",
    records: [
      {
        verb: "create",
        record: "GuarantySubmission",
        detail: "E-Tran payload. Human-authorized. Sets guarantyNumber only from the agency response.",
      },
      {
        verb: "update",
        record: "Loan",
        detail: "guarantyNumber, guarantyStatus, guarantyAmount, fundedOn.",
      },
      {
        verb: "create",
        record: "LedgerDraft",
        detail: "Core booking draft. Dual-control — not a post.",
      },
    ],
  },
  {
    id: "08",
    n: "08",
    name: "Closure",
    purpose: "Final ledger post. Origination writes end. Loan available to the customer.",
    gate: "Dual-control post and seal. Incomplete closure loops here.",
    records: [
      {
        verb: "create",
        record: "LedgerPost",
        detail: "Dual-control post of the draft. Core refs stored. Draft is never replayed.",
      },
      {
        verb: "create",
        record: "AuditSeal",
        detail: "Package locator for the sealed file.",
      },
      {
        verb: "update",
        record: "Process",
        detail: "stageStatus = sealed. Origination writes stop. Servicing owns the facility thereafter.",
      },
      {
        verb: "update",
        record: "Loan",
        detail: "Facility is available to the Customer. firstPrinPaymentDate and maturesOn are live servicing dates.",
      },
    ],
  },
];
