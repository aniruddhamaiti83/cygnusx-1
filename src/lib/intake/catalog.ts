export const PRODUCTS = [
  { id: "drawToTerm", label: "Draw-To-Term" },
  { id: "leverage", label: "Leverage" },
  { id: "termLoan", label: "Term Loan" },
  { id: "lineOfCredit", label: "Line of Credit" },
  { id: "sba7a", label: "SBA 7(a)" },
  { id: "sbaExpress", label: "SBA Express" },
  { id: "sba504", label: "SBA 504" },
] as const;

export const LOAN_PURPOSES = [
  { id: "workingCapital", label: "Working capital" },
  { id: "equipment", label: "Equipment" },
  { id: "realEstate", label: "Owner-occupied real estate" },
  { id: "refinance", label: "Refinance" },
  { id: "acquisition", label: "Business acquisition" },
  { id: "startup", label: "Start-up / expansion" },
  { id: "other", label: "Other" },
] as const;

export const AFS_PURPOSE_CODES = [
  { id: "WC", label: "WC — Working capital" },
  { id: "EQ", label: "EQ — Equipment" },
  { id: "RE", label: "RE — Real estate" },
  { id: "RF", label: "RF — Refinance" },
  { id: "AQ", label: "AQ — Acquisition" },
  { id: "OT", label: "OT — Other" },
] as const;

export const LOAN_STATUSES = [
  { id: "processing", label: "Processing" },
  { id: "submitted", label: "Submitted" },
  { id: "accepted", label: "Accepted" },
  { id: "rejected", label: "Rejected" },
] as const;

export const RATE_BASES = [
  { id: "actual360", label: "Actual / 360" },
  { id: "thirty360", label: "30 / 360" },
  { id: "actual365", label: "Actual / 365" },
] as const;

export const INDEX_RATES = [
  { id: "fixed", label: "Fixed" },
  { id: "prime", label: "Prime" },
  { id: "wsjPrime", label: "WSJ Prime" },
  { id: "sofr", label: "SOFR" },
] as const;

export const PRIN_FREQUENCIES = [
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "semiannual", label: "Semi-annual" },
  { id: "annual", label: "Annual" },
] as const;

export type ProductId = (typeof PRODUCTS)[number]["id"];
export type LoanPurposeId = (typeof LOAN_PURPOSES)[number]["id"];
export type LoanStatusId = (typeof LOAN_STATUSES)[number]["id"];
