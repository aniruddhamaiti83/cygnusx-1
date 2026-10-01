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

/** C create · U update · A assign · G gate. Empty = not touched this stage. */
export type CellVerb = "C" | "U" | "A" | "G" | "C/U" | "C/G" | "U/G" | "A/G";

export type MatrixRow = {
  table: string;
  cells: (CellVerb | "")[];
};

export const TABLE_MATRIX: MatrixRow[] = [
  { table: "Account", cells: ["C", "", "U", "", "", "", "", ""] },
  { table: "Deal", cells: ["C", "G", "U", "U", "G", "U", "U", "U/G"] },
  { table: "LOS Product", cells: ["C", "U", "U", "U", "U", "U", "U", "U"] },
  { table: "Related Party", cells: ["C", "A", "U", "", "", "", "", ""] },
  { table: "Deal Team Member", cells: ["C", "A", "A", "", "A", "A", "", ""] },
  { table: "Related Party Metric", cells: ["", "C/G", "", "", "", "", "", ""] },
  { table: "Metric", cells: ["", "", "C", "U", "U", "", "", ""] },
  { table: "Asset", cells: ["", "", "", "C", "", "", "", ""] },
  { table: "Collateral Pledged", cells: ["", "", "", "C", "", "", "", ""] },
  { table: "Deal Approval", cells: ["", "", "", "", "C/G", "", "", ""] },
  { table: "Requirements", cells: ["", "", "C", "C", "U", "C/U", "U", "U"] },
];

export const MATRIX_LEGEND: { code: CellVerb; label: string }[] = [
  { code: "C", label: "Create row" },
  { code: "U", label: "Update columns" },
  { code: "A", label: "Assign FK / staff / roles" },
  { code: "G", label: "Gate on this table" },
];
