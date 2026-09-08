export const MATRIX_STAGES = [
  { id: "01", label: "Intake" },
  { id: "02", label: "Pre-app" },
  { id: "03", label: "Processing" },
  { id: "04", label: "Collateral" },
  { id: "05", label: "Underwriter" },
  { id: "06", label: "Documents" },
  { id: "07", label: "Financing" },
  { id: "08", label: "Closure" },
] as const;

export type CellVerb = "C" | "U" | "A" | "G" | "C/U" | "C/G" | "U/G" | "A/G";

export type MatrixRow = {
  table: string;
  cells: (CellVerb | "")[];
};

export const TABLE_MATRIX: MatrixRow[] = [
  { table: "Process", cells: ["C", "G", "U", "U", "G", "U", "U", "U/G"] },
  { table: "ProcessTeam", cells: ["C", "A", "A", "", "A", "A", "", ""] },
  { table: "Customer", cells: ["C", "", "", "", "", "", "", ""] },
  { table: "ApplicantAccount", cells: ["C/G", "", "", "", "", "", "", ""] },
  { table: "Address", cells: ["C", "", "", "", "", "", "", ""] },
  { table: "Business", cells: ["C", "", "U", "", "", "", "", ""] },
  { table: "ProcessParticipant", cells: ["C", "A", "U", "", "", "", "", ""] },
  { table: "Loan", cells: ["C", "U", "U", "U", "U", "U", "U", "U"] },
  { table: "CreditPull", cells: ["", "C/G", "", "", "", "", "", ""] },
  { table: "SanctionsScreen", cells: ["", "C/G", "", "", "", "", "", ""] },
  { table: "KybReport", cells: ["", "", "C", "", "", "", "", ""] },
  { table: "SbaProfile", cells: ["", "", "C", "", "", "", "", ""] },
  { table: "SpreadPeriod", cells: ["", "", "C/U", "", "", "", "", ""] },
  { table: "DebtObligation", cells: ["", "", "C", "", "", "", "", ""] },
  { table: "CollateralItem", cells: ["", "", "", "C", "", "", "", ""] },
  { table: "CollateralPledge", cells: ["", "", "", "C", "", "", "", ""] },
  { table: "InsurancePolicy", cells: ["", "", "", "C", "", "U", "", ""] },
  { table: "ScorecardResult", cells: ["", "", "", "", "C", "", "", ""] },
  { table: "Decision", cells: ["", "", "", "", "C/G", "", "", ""] },
  { table: "Document", cells: ["", "", "", "", "", "C/U", "", ""] },
  { table: "GuarantySubmission", cells: ["", "", "", "", "", "", "C", ""] },
  { table: "LedgerDraft", cells: ["", "", "", "", "", "", "C", ""] },
  { table: "LedgerPost", cells: ["", "", "", "", "", "", "", "C"] },
  { table: "AuditSeal", cells: ["", "", "", "", "", "", "", "C"] },
  { table: "AuditEvent", cells: ["C", "C", "C", "C", "C", "C", "C", "C"] },
];

export const MATRIX_LEGEND: { code: CellVerb; label: string }[] = [
  { code: "C", label: "Create row" },
  { code: "U", label: "Update columns" },
  { code: "A", label: "Assign FK / staff / roles" },
  { code: "G", label: "Gate on this table" },
];
