export type AgentKind = "supervisor" | "worker" | "evaluator" | "human";

export type SwarmAgent = {
  id: string;
  name: string;
  kind: AgentKind;
  stage: string;
  desk: string;
  mission: string;
  tools: string[];
  writes: string[];
  humanSeat: string;
};

export const SWARM_AGENTS: SwarmAgent[] = [
  {
    id: "supervisor",
    name: "Supervisor / planner",
    kind: "supervisor",
    stage: "all",
    desk: "Orchestration",
    mission: "Reads Process.currentStage, decomposes the stage into workers, merges results, never writes credit terms.",
    tools: ["process.read", "dispatch.worker", "audit.append"],
    writes: ["AuditEvent"],
    humanSeat: "—",
  },
  {
    id: "cip",
    name: "CIP / identity",
    kind: "worker",
    stage: "01",
    desk: "Intake",
    mission: "Capture Customer CIP, verify email, bind ApplicantAccount, then Business + Address.",
    tools: ["cip.tokenizeTaxId", "auth.signUpEmail", "address.normalize"],
    writes: ["Customer", "ApplicantAccount", "Address", "Business", "Process"],
    humanSeat: "Elena Voss — RM",
  },
  {
    id: "facility",
    name: "Facility keepers",
    kind: "worker",
    stage: "01",
    desk: "Intake",
    mission: "Create the 1:1 Loan on this Process after Business is saved. Lookups only — no credit decision.",
    tools: ["product.catalog", "loan.draft"],
    writes: ["Loan", "ProcessParticipant", "ProcessTeam"],
    humanSeat: "Elena Voss — RM",
  },
  {
    id: "consumerCredit",
    name: "Consumer credit",
    kind: "worker",
    stage: "02",
    desk: "Credit",
    mission: "FCRA pull on the liable Customer. One of three Pre-application qualifying checks. Keyed (partyId, processId). Stores score type, last checked, years on file, outstanding.",
    tools: ["cra.equifax", "cra.experian", "cra.transunion"],
    writes: ["CreditPull"],
    humanSeat: "Marcus Hale — Credit",
  },
  {
    id: "commercialCredit",
    name: "Commercial credit",
    kind: "worker",
    stage: "02",
    desk: "Credit",
    mission: "Commercial bureau on the Business. One of three Pre-application qualifying checks. Stores the same score snapshot. Not a consumer score.",
    tools: ["biz.experian", "biz.sbfe", "biz.dnb"],
    writes: ["CreditPull"],
    humanSeat: "Marcus Hale — Credit",
  },
  {
    id: "sanctions",
    name: "Sanctions / fraud",
    kind: "worker",
    stage: "02",
    desk: "Fraud",
    mission: "OFAC / SDN on every participant. One of three Pre-application qualifying checks — a hit does not reject the file. Not a bureau.",
    tools: ["ofac.sdn"],
    writes: ["SanctionsScreen"],
    humanSeat: "Priya Shah — Fraud",
  },
  {
    id: "processing",
    name: "Spreading / KYB",
    kind: "worker",
    stage: "03",
    desk: "Processing",
    mission: "Mock SOS / SBA size / SAM / franchise pack. Writes KybReport + SbaProfile.mockReport. Live APIs deferred.",
    tools: ["kyb.vendor", "sba.sizeStandard", "ocr.statements", "spread.coa"],
    writes: ["KybReport", "SbaProfile", "SpreadPeriod", "DebtObligation", "Loan"],
    humanSeat: "Jordan Kim — Processor",
  },
  {
    id: "collateral",
    name: "Collateral",
    kind: "worker",
    stage: "04",
    desk: "Processing",
    mission: "Typed CollateralItem, lien position, location, then Pledge. Mock UCC-1 / insurance review. Does not decide credit.",
    tools: ["collateral.ingest", "lien.search", "insurance.policy"],
    writes: ["CollateralItem", "CollateralPledge", "InsurancePolicy"],
    humanSeat: "Jordan Kim — Processor",
  },
  {
    id: "policy",
    name: "Credit policy pack",
    kind: "worker",
    stage: "05",
    desk: "Underwriting",
    mission: "Scorecard recommends. It does not decide. Package goes to the human of record.",
    tools: ["policy.scorecard", "memo.draft"],
    writes: ["ScorecardResult"],
    humanSeat: "Diana Okonkwo — Underwriter",
  },
  {
    id: "docs",
    name: "Documentation",
    kind: "worker",
    stage: "06",
    desk: "Closing",
    mission: "Closing package. A document is not filed without imaging ACK.",
    tools: ["dms.receive", "imaging.ack"],
    writes: ["Document", "Loan"],
    humanSeat: "Sam Ruiz — Closer",
  },
  {
    id: "funding",
    name: "Funding / E-Tran",
    kind: "worker",
    stage: "07–08",
    desk: "Funding ops",
    mission: "Human-authorized E-Tran. Ledger draft is not a post. Dual-control post then seal.",
    tools: ["sba.etran", "ledger.draft", "ledger.post"],
    writes: ["GuarantySubmission", "LedgerDraft", "LedgerPost", "AuditSeal", "Loan", "Process"],
    humanSeat: "Sam Ruiz — Closer",
  },
  {
    id: "evaluator",
    name: "Evaluator / critic",
    kind: "evaluator",
    stage: "all",
    desk: "Control",
    mission: "Cross-checks worker outputs for grounding, policy conflicts, and confidence before the human package.",
    tools: ["eval.consistency", "eval.grounding", "audit.append"],
    writes: ["AuditEvent"],
    humanSeat: "Stage owner",
  },
];

export const ORCHESTRATION_RULES = [
  "Supervisor dispatches only workers allowed for Process.currentStage. A documentation worker cannot call E-Tran.",
  "Each worker has a service identity and a tool allowlist. Tokens are short-lived and tagged with processId.",
  "Workers write canonical tables — they do not keep private shadow copies of Customer, Business, or Loan.",
  "Evaluator rejects ungrounded claims (no artefactId) and low-confidence extraction. It never fills a gate.",
  "Pre-application qualifies the customer: any one passing check (consumer credit, business credit, or fraud history) advances the file. The swarm cannot infer a pass.",
  "ScorecardResult is advisory. Decision is a human row (Diana Okonkwo). guarantyNumber is written only from E-Tran.",
  "Every message, tool call, and confidence score appends AuditEvent under processId. That spine is the replay log.",
];

export const ORCHESTRATION_SEQUENCE: { step: string; actor: string; action: string }[] = [
  { step: "1", actor: "Elena Voss (RM)", action: "Opens Process. CIP worker writes Customer, ApplicantAccount, Address, Business, then Loan." },
  { step: "2", actor: "Supervisor", action: "On RM advance, currentStage = 02. Assigns Marcus Hale (credit) and Priya Shah (fraud)." },
  { step: "3", actor: "Credit + Fraud workers", action: "Consumer CreditPull, commercial CreditPull, and/or SanctionsScreen. Any one passing check qualifies the customer." },
  { step: "4", actor: "Evaluator", action: "Confirms a qualifying artefact exists. Does not require the other two checks. Packages the stage." },
  { step: "5", actor: "Stage owner", action: "Human gate. One pass advances currentStage. Incomplete loops. A failed check does not reject if another path still qualifies." },
  { step: "6", actor: "Supervisor", action: "Repeats 3–5 for stages 03–08 with the stage’s worker and desk (processor, UW, closer)." },
];

export type StageOrchestration = {
  stage: string;
  name: string;
  agents: string[];
  creates: string[];
  updates: string[];
  human: string;
  gate: string;
};

export const STAGE_ORCHESTRATION: StageOrchestration[] = [
  {
    stage: "01",
    name: "Intake",
    agents: ["CIP / identity", "Facility keepers"],
    creates: ["Process", "Customer", "ApplicantAccount", "Address", "Business", "Loan", "ProcessTeam", "ProcessParticipant"],
    updates: ["Process.currentStage"],
    human: "Elena Voss — RM",
    gate: "emailVerified + Business + Loan saved",
  },
  {
    stage: "02",
    name: "Pre-application",
    agents: ["Consumer credit", "Commercial credit", "Sanctions / fraud"],
    creates: ["CreditPull (optional)", "SanctionsScreen (optional)"],
    updates: ["ProcessTeam", "Process.currentStage"],
    human: "Marcus Hale — Credit · Priya Shah — Fraud",
    gate: "Any one pass: consumer credit, business credit, or fraud.",
  },
  {
    stage: "03",
    name: "Processing",
    agents: ["Spreading / KYB"],
    creates: ["KybReport", "SbaProfile (mockReport)"],
    updates: ["Loan", "Business"],
    human: "Jordan Kim — Processor",
    gate: "Mock processing pack: KYB + SBA profile",
  },
  {
    stage: "04",
    name: "Collateral",
    agents: ["Collateral"],
    creates: ["CollateralItem", "CollateralPledge", "InsurancePolicy"],
    updates: ["Loan.primaryCollateralId"],
    human: "Jordan Kim — Processor",
    gate: "Pledged item + insurance/lien review (mock UCC)",
  },
  {
    stage: "05",
    name: "Underwriter",
    agents: ["Credit policy pack"],
    creates: ["ScorecardResult", "Decision"],
    updates: ["Loan (rate, guarantyPercent, dates)", "Process.currentStage"],
    human: "Diana Okonkwo — Underwriter",
    gate: "Human Decision: approve → 06, pend → loop, reject → close",
  },
  {
    stage: "06",
    name: "Documents",
    agents: ["Documentation"],
    creates: ["Document"],
    updates: ["Document.status", "Loan.closingDate", "InsurancePolicy"],
    human: "Sam Ruiz — Closer",
    gate: "Required package imaged (ACK) and reviewed",
  },
  {
    stage: "07",
    name: "Financing",
    agents: ["Funding / E-Tran"],
    creates: ["GuarantySubmission", "LedgerDraft"],
    updates: ["Loan.guarantyNumber / guarantyStatus / fundedOn"],
    human: "Sam Ruiz — Closer",
    gate: "Guaranty accepted + ledger draft ready",
  },
  {
    stage: "08",
    name: "Closure",
    agents: ["Funding / E-Tran"],
    creates: ["LedgerPost", "AuditSeal"],
    updates: ["Process.stageStatus = sealed", "Loan servicing dates"],
    human: "Sam Ruiz — Closer",
    gate: "Dual-control post + seal. Origination writes stop.",
  },
];
