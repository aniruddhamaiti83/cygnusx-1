import { create } from "zustand";
import { cx1, type LlmStatus, type OriginationFile } from "@/lib/api";
import { newId, type AccountRole, type PostalAddress } from "./model";
import type { LoanPurposeId, LoanStatusId, ProductId } from "./catalog";
import { defaultTeam, type ProcessStageId, type TeamSeat } from "./stages";

export type Customer = {
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  emailConfirmed: boolean;
  emailVerified: boolean;
  authUserId: string | null;
  ssnToken: string;
  ssnLast4: string;
  dob: string;
  gender: string;
  race: string;
  ethnicity: string;
  roles: AccountRole[];
  primary: PostalAddress;
  mailing: PostalAddress;
  mailingSameAsPrimary: boolean;
};

export type Business = {
  businessId: string;
  legalName: string;
  taxIdToken: string;
  taxIdLast4: string;
  businessType: string;
  incorporatedOn: string;
  naicsCode: string;
  address: PostalAddress;
  loanAmount: string;
  loanPurpose: LoanPurposeId | "";
};

export type Loan = {
  loanId: string;
  processId: string;
  borrowerRef: string;
  productId: ProductId | "";
  interestRate: string;
  loanAmount: string;
  basis: string;
  indexRate: string;
  interestOnlyPayment: string;
  spread: string;
  status: LoanStatusId;
  closingDate: string;
  balloon: boolean;
  afsPurposeCode: string;
  firstPrinPaymentDate: string;
  prinFrequency: string;
  primaryCollateralId: string;
  primaryClientId: string;
  primaryBorrowerRef: string;
  primaryBusinessId: string;
  guarantorId: string;
  coborrowerId: string;
  purposeId: LoanPurposeId | "";
};

export type Step = "customer" | "account" | "business" | "loan";

export type Collateral = {
  itemId: string;
  kind?: string;
  label: string;
  description?: string;
  value?: string;
  ownerRef?: string;
};

export type Pledge = {
  pledgeId: string;
  itemId: string;
  loanId: string;
  lienPosition: number;
  pledgedValue: string;
  exceptionNote: string;
};

export type Insurance = {
  policyId: string;
  itemId: string;
  carrier: string;
  policyNumber: string;
  coverageAmount: string;
  expiresOn: string;
};

export type CreditPull = {
  pullId: string;
  processId: string;
  partyKind: "customer" | "business";
  partyId: string;
  source: string;
  productCode: string;
  score: number;
  artefactId: string;
  fcraPurpose: string | null;
  outcome: "pass" | "fail";
  ranAt: string;
  actor: string;
  summary: string;
  provider?: string;
};

export type ScreenCheck = {
  screenId?: string;
  artefactId?: string;
  ranAt: string;
  actor: string;
  outcome: "pass" | "fail";
  summary: string;
  provider?: string;
};

export type KybReport = {
  kybId: string;
  processId: string;
  businessId: string;
  source: string;
  status: "clear" | "review" | "fail";
  ranAt: string;
  actor: string;
  summary: string;
  artefactId?: string;
  provider?: string;
};

export type SbaProfile = {
  sbaProfileId: string;
  processId: string;
  businessId: string;
  naicsCode: string;
  employeeCount: string;
  annualReceipts: string;
  isFranchise: boolean;
  sizeStandardMet: boolean;
  notes: string;
};

export type Scorecard = {
  scorecardId: string;
  recommendedAction: "approve" | "pend" | "reject";
  confidence: number;
  factors: string[];
  narrative: string;
  artefactId: string;
  provider: string;
  modelName: string;
  ranAt: string;
  actor: string;
};

export type Decision = {
  decisionId: string;
  action: "approve" | "pend" | "reject";
  rationale: string;
  decidedBy: string;
  decidedAt: string;
};

export type ClosingDoc = {
  documentId: string;
  name: string;
  status: string;
  imagedAck: boolean;
  reviewed: boolean;
};

export type Guaranty = {
  submissionId: string;
  status: string;
  guarantyNumber: string;
  submittedAt: string | null;
  summary: string;
};

export type Ledger = {
  postId: string;
  status: string;
  dualControl: boolean;
  sealed: boolean;
  summary: string;
  postedAt: string | null;
};

export type AgentEvent = {
  eventId: string;
  stage: string;
  agentId: string;
  agentName: string;
  kind: string;
  action: string;
  detail: string;
  artefactId: string;
  confidence: number;
  provider: string;
  createdAt: string;
};

const PID_KEY = "cx1-process-id";

function readPid(): string {
  try {
    return localStorage.getItem(PID_KEY) || "";
  } catch {
    return "";
  }
}

function writePid(id: string) {
  try {
    if (id) localStorage.setItem(PID_KEY, id);
    else localStorage.removeItem(PID_KEY);
  } catch {
    /* ignore */
  }
}

type OriginationState = {
  hydrated: boolean;
  apiError: string;
  llm: LlmStatus | null;
  step: Step;
  currentStage: ProcessStageId;
  stageStatus: string;
  processId: string;
  processNumber: string;
  customer: Customer | null;
  business: Business | null;
  loan: Loan | null;
  loanSaved: boolean;
  collaterals: Collateral[];
  pledges: Pledge[];
  insurance: Insurance[];
  team: TeamSeat[];
  consumerPull: CreditPull | null;
  businessPull: CreditPull | null;
  fraudCheck: ScreenCheck | null;
  kybReport: KybReport | null;
  sbaProfile: SbaProfile | null;
  scorecard: Scorecard | null;
  decision: Decision | null;
  documents: ClosingDoc[];
  guaranty: Guaranty | null;
  ledger: Ledger | null;
  agentEvents: AgentEvent[];
  applyFile: (file: OriginationFile) => void;
  hydrate: () => Promise<void>;
  saveCustomer: (payload: Record<string, unknown>) => Promise<void>;
  confirmEmail: (email: string, phoneLast4: string) => Promise<void>;
  completeAccount: (password: string, name: string) => Promise<void>;
  saveBusiness: (payload: Record<string, unknown>) => Promise<void>;
  saveLoan: (payload: Record<string, unknown>) => Promise<void>;
  advanceStage: () => Promise<void>;
  runConsumer: (source: string, product: string) => Promise<void>;
  runCommercial: (source: string, product: string) => Promise<void>;
  runFraud: () => Promise<void>;
  runKyb: (source: string) => Promise<void>;
  saveSbaProfile: (payload: Record<string, unknown>) => Promise<void>;
  addCollateral: (payload: Record<string, unknown>) => Promise<void>;
  runStageAgents: (extra?: Record<string, unknown>) => Promise<void>;
  recordDecision: (action: string, rationale: string) => Promise<void>;
  updateDocument: (payload: Record<string, unknown>) => Promise<void>;
  authorizeGuaranty: () => Promise<void>;
  postLedger: () => Promise<void>;
  resetFile: () => void;
  setStep: (step: Step) => void;
};

const emptyFile = {
  step: "customer" as Step,
  currentStage: "intake" as ProcessStageId,
  stageStatus: "open",
  processId: "",
  processNumber: "",
  customer: null as Customer | null,
  business: null as Business | null,
  loan: null as Loan | null,
  loanSaved: false,
  collaterals: [] as Collateral[],
  pledges: [] as Pledge[],
  insurance: [] as Insurance[],
  team: defaultTeam(),
  consumerPull: null as CreditPull | null,
  businessPull: null as CreditPull | null,
  fraudCheck: null as ScreenCheck | null,
  kybReport: null as KybReport | null,
  sbaProfile: null as SbaProfile | null,
  scorecard: null as Scorecard | null,
  decision: null as Decision | null,
  documents: [] as ClosingDoc[],
  guaranty: null as Guaranty | null,
  ledger: null as Ledger | null,
  agentEvents: [] as AgentEvent[],
};

function asStep(value: string | undefined): Step {
  if (value === "account" || value === "business" || value === "loan" || value === "customer") return value;
  return "customer";
}

function asStage(value: string | undefined): ProcessStageId {
  const ids: ProcessStageId[] = [
    "intake",
    "preApplication",
    "processing",
    "collateral",
    "underwriter",
    "documents",
    "financing",
    "closure",
  ];
  return ids.includes(value as ProcessStageId) ? (value as ProcessStageId) : "intake";
}

export function customerRef(id: string) {
  return `customer:${id}`;
}
export function businessRef(id: string) {
  return `business:${id}`;
}
export function parseRef(ref: string): { kind: "customer" | "business"; id: string } | null {
  const [kind, id] = ref.split(":");
  if ((kind === "customer" || kind === "business") && id) return { kind, id };
  return null;
}

export const useOrigination = create<OriginationState>((set, get) => ({
  hydrated: false,
  apiError: "",
  llm: null,
  ...emptyFile,
  setStep: (step) => set({ step }),
  applyFile: (file) => {
    writePid(file.processId);
    set({
      apiError: "",
      processId: file.processId,
      processNumber: file.processNumber,
      currentStage: asStage(file.currentStage),
      stageStatus: file.stageStatus || "open",
      step: asStep(file.step),
      customer: (file.customer as Customer | null) ?? null,
      business: (file.business as Business | null) ?? null,
      loan: (file.loan as Loan | null) ?? null,
      loanSaved: Boolean(file.loanSaved),
      team: (file.team as TeamSeat[])?.length ? (file.team as TeamSeat[]) : defaultTeam(),
      consumerPull: (file.consumerPull as CreditPull | null) ?? null,
      businessPull: (file.businessPull as CreditPull | null) ?? null,
      fraudCheck: (file.fraudCheck as ScreenCheck | null) ?? null,
      kybReport: (file.kybReport as KybReport | null) ?? null,
      sbaProfile: (file.sbaProfile as SbaProfile | null) ?? null,
      collaterals: (file.collaterals as Collateral[]) ?? [],
      pledges: (file.pledges as Pledge[]) ?? [],
      insurance: (file.insurance as Insurance[]) ?? [],
      scorecard: (file.scorecard as Scorecard | null) ?? null,
      decision: (file.decision as Decision | null) ?? null,
      documents: (file.documents as ClosingDoc[]) ?? [],
      guaranty: (file.guaranty as Guaranty | null) ?? null,
      ledger: (file.ledger as Ledger | null) ?? null,
      agentEvents: (file.agentEvents as AgentEvent[]) ?? [],
    });
  },
  hydrate: async () => {
    try {
      const llm = await cx1.llm().catch(() => null);
      const pid = readPid();
      if (pid) {
        const file = await cx1.getProcess(pid);
        get().applyFile(file);
        set({ hydrated: true, llm });
        return;
      }
      set({ hydrated: true, llm, ...emptyFile, team: defaultTeam() });
    } catch {
      writePid("");
      set({ hydrated: true, ...emptyFile, team: defaultTeam() });
    }
  },
  saveCustomer: async (payload) => {
    let id = get().processId;
    if (!id) {
      const created = await cx1.createProcess();
      id = created.processId;
      writePid(id);
    }
    const file = await cx1.saveCustomer(id, payload);
    get().applyFile(file);
  },
  confirmEmail: async (email, phoneLast4) => {
    const file = await cx1.confirmEmail(get().processId, { email, phoneLast4 });
    get().applyFile(file);
  },
  completeAccount: async (password, name) => {
    const file = await cx1.bindAccount(get().processId, { password, name });
    get().applyFile(file);
  },
  saveBusiness: async (payload) => {
    const file = await cx1.saveBusiness(get().processId, payload);
    get().applyFile(file);
  },
  saveLoan: async (payload) => {
    const file = await cx1.saveLoan(get().processId, payload);
    get().applyFile(file);
  },
  advanceStage: async () => {
    const file = await cx1.advance(get().processId);
    get().applyFile(file);
  },
  runConsumer: async (source, product) => {
    const file = await cx1.consumerCredit(get().processId, { consumerSource: source, consumerProduct: product });
    get().applyFile(file);
  },
  runCommercial: async (source, product) => {
    const file = await cx1.commercialCredit(get().processId, { businessSource: source, businessProduct: product });
    get().applyFile(file);
  },
  runFraud: async () => {
    const file = await cx1.sanctions(get().processId);
    get().applyFile(file);
  },
  runKyb: async (source) => {
    const file = await cx1.kyb(get().processId, { kybSource: source });
    get().applyFile(file);
  },
  saveSbaProfile: async (payload) => {
    const file = await cx1.saveSba(get().processId, payload);
    get().applyFile(file);
  },
  addCollateral: async (payload) => {
    const file = await cx1.addCollateral(get().processId, payload);
    get().applyFile(file);
  },
  runStageAgents: async (extra) => {
    const file = await cx1.runAgents(get().processId, extra ?? {});
    get().applyFile(file);
  },
  recordDecision: async (action, rationale) => {
    const file = await cx1.decide(get().processId, { action, rationale });
    get().applyFile(file);
  },
  updateDocument: async (payload) => {
    const file = await cx1.updateDocument(get().processId, payload);
    get().applyFile(file);
  },
  authorizeGuaranty: async () => {
    const file = await cx1.guaranty(get().processId, true);
    get().applyFile(file);
  },
  postLedger: async () => {
    const file = await cx1.ledger(get().processId, true);
    get().applyFile(file);
  },
  resetFile: () => {
    writePid("");
    set({ ...emptyFile, team: defaultTeam(), apiError: "", hydrated: true });
  },
}));

export function emptyLoan(processId: string): Loan {
  return {
    loanId: newId(),
    processId,
    borrowerRef: "",
    productId: "",
    interestRate: "",
    loanAmount: "",
    basis: "actual360",
    indexRate: "prime",
    interestOnlyPayment: "",
    spread: "",
    status: "processing",
    closingDate: "",
    balloon: false,
    afsPurposeCode: "",
    firstPrinPaymentDate: "",
    prinFrequency: "monthly",
    primaryCollateralId: "",
    primaryClientId: "",
    primaryBorrowerRef: "",
    primaryBusinessId: "",
    guarantorId: "",
    coborrowerId: "",
    purposeId: "",
  };
}
