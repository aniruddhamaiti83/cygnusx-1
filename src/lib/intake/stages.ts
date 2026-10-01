export const PROCESS_STAGES = [
  { id: "intake", n: "01", label: "Intake", owner: "Relationship manager" },
  { id: "preApplication", n: "02", label: "Pre-application", owner: "Credit / Fraud" },
  { id: "processing", n: "03", label: "Processing", owner: "Processor" },
  { id: "collateral", n: "04", label: "Collateral", owner: "Processor" },
  { id: "underwriter", n: "05", label: "Underwriter", owner: "Underwriter" },
  { id: "documents", n: "06", label: "Documents", owner: "Closer" },
  { id: "financing", n: "07", label: "Funding", owner: "Funding ops" },
  { id: "closure", n: "08", label: "Closure", owner: "Funding ops" },
] as const;

export type ProcessStageId = (typeof PROCESS_STAGES)[number]["id"];

export const STAFF = [
  { id: "rm-elena", name: "Elena Voss", title: "Relationship manager", desk: "rm" },
  { id: "cr-marcus", name: "Marcus Hale", title: "Credit officer", desk: "credit" },
  { id: "fr-priya", name: "Priya Shah", title: "Fraud analyst", desk: "fraud" },
  { id: "pr-jordan", name: "Jordan Kim", title: "Processor", desk: "processor" },
  { id: "uw-diana", name: "Diana Okonkwo", title: "Underwriter", desk: "underwriter" },
  { id: "cl-sam", name: "Sam Ruiz", title: "Closer", desk: "closer" },
] as const;

export type StaffId = (typeof STAFF)[number]["id"];
export type Desk = (typeof STAFF)[number]["desk"];

export const RM_STAFF_ID: StaffId = "rm-elena";

export type TeamSeat = {
  desk: Desk;
  staffId: StaffId | null;
  assignedAtStage: ProcessStageId | null;
};

export function defaultTeam(): TeamSeat[] {
  return [
    { desk: "rm", staffId: RM_STAFF_ID, assignedAtStage: "intake" },
    { desk: "credit", staffId: null, assignedAtStage: null },
    { desk: "fraud", staffId: null, assignedAtStage: null },
    { desk: "processor", staffId: null, assignedAtStage: null },
    { desk: "underwriter", staffId: null, assignedAtStage: null },
    { desk: "closer", staffId: null, assignedAtStage: null },
  ];
}

export function staffById(id: string) {
  return STAFF.find((s) => s.id === id) ?? { id, name: "Unassigned", title: "", desk: "rm" as const };
}

export function deskLabel(desk: string): string {
  return STAFF.find((s) => s.desk === desk)?.title ?? desk;
}
