const BASE = "/api/cx1";

export type ApiError = Error & { status?: number };

function detail(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const d = (data as { detail?: unknown; message?: unknown }).detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    return d
      .map((item) => (item && typeof item === "object" && "msg" in item ? String((item as { msg: string }).msg) : String(item)))
      .join(" ");
  }
  const message = (data as { message?: unknown }).message;
  if (typeof message === "string") return message;
  return fallback;
}

export async function api<T = unknown>(
  path: string,
  opts: Omit<RequestInit, "body"> & { body?: unknown } = {},
): Promise<T> {
  const { body, headers: hdrs, ...rest } = opts;
  const headers = new Headers(hdrs);
  if (body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    credentials: "include",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: ApiError = new Error(detail(data, res.statusText || "Request failed."));
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export const cx1 = {
  health: () => api<{ ok: boolean; database: string; llm: LlmStatus }>("/health"),
  llm: () => api<LlmStatus>("/llm"),
  createProcess: () => api<OriginationFile>("/processes", { method: "POST" }),
  getProcess: (id: string) => api<OriginationFile>(`/processes/${id}`),
  saveCustomer: (id: string, body: unknown) => api<OriginationFile>(`/processes/${id}/customer`, { method: "PUT", body }),
  confirmEmail: (id: string, body: { email: string; phoneLast4: string }) =>
    api<OriginationFile>(`/processes/${id}/confirm-email`, { method: "POST", body }),
  bindAccount: (id: string, body: { password: string; name?: string }) =>
    api<OriginationFile>(`/processes/${id}/account`, { method: "POST", body }),
  saveBusiness: (id: string, body: unknown) => api<OriginationFile>(`/processes/${id}/business`, { method: "PUT", body }),
  saveLoan: (id: string, body: unknown) => api<OriginationFile>(`/processes/${id}/loan`, { method: "PUT", body }),
  advance: (id: string) => api<OriginationFile>(`/processes/${id}/advance`, { method: "POST" }),
  runAgents: (id: string, body?: unknown) => api<OriginationFile>(`/processes/${id}/agents/run`, { method: "POST", body: body ?? {} }),
  consumerCredit: (id: string, body: unknown) =>
    api<OriginationFile>(`/processes/${id}/agents/consumer-credit`, { method: "POST", body }),
  commercialCredit: (id: string, body: unknown) =>
    api<OriginationFile>(`/processes/${id}/agents/commercial-credit`, { method: "POST", body }),
  sanctions: (id: string) => api<OriginationFile>(`/processes/${id}/agents/sanctions`, { method: "POST" }),
  kyb: (id: string, body: unknown) => api<OriginationFile>(`/processes/${id}/agents/kyb`, { method: "POST", body }),
  saveSba: (id: string, body: unknown) => api<OriginationFile>(`/processes/${id}/sba-profile`, { method: "PUT", body }),
  addCollateral: (id: string, body: unknown) => api<OriginationFile>(`/processes/${id}/collateral`, { method: "POST", body }),
  decide: (id: string, body: { action: string; rationale: string }) =>
    api<OriginationFile>(`/processes/${id}/decision`, { method: "POST", body }),
  updateDocument: (id: string, body: unknown) => api<OriginationFile>(`/processes/${id}/documents`, { method: "POST", body }),
  guaranty: (id: string, authorize: boolean) =>
    api<OriginationFile>(`/processes/${id}/guaranty`, { method: "POST", body: { authorize } }),
  ledger: (id: string, dualControl: boolean) =>
    api<OriginationFile>(`/processes/${id}/ledger`, { method: "POST", body: { dualControl } }),
};

export type LlmStatus = {
  provider: string;
  label: string;
  model: string;
  baseUrl: string;
  configured: boolean;
};

export type OriginationFile = {
  processId: string;
  processNumber: string;
  currentStage: string;
  stageStatus: string;
  step: string;
  userId: string | null;
  ownerRmId: string;
  createdAt: string | null;
  customer: Record<string, unknown> | null;
  business: Record<string, unknown> | null;
  loan: Record<string, unknown> | null;
  loanSaved: boolean;
  team: unknown[];
  consumerPull: Record<string, unknown> | null;
  businessPull: Record<string, unknown> | null;
  fraudCheck: Record<string, unknown> | null;
  kybReport: Record<string, unknown> | null;
  sbaProfile: Record<string, unknown> | null;
  collaterals: unknown[];
  pledges: unknown[];
  insurance: unknown[];
  scorecard: Record<string, unknown> | null;
  decision: Record<string, unknown> | null;
  documents: unknown[];
  guaranty: Record<string, unknown> | null;
  ledger: Record<string, unknown> | null;
  agentEvents: unknown[];
};
