/** Salesforce-style LOS schema.
 * Account = customer (Person Account or Business Account).
 * Deal = the origination file (Process). Many loans per deal.
 * LOS Product = the loan. Approval, requirements, parties, collateral, and metrics are per loan.
 */

export type RelKind = "lookup" | "masterDetail";
export type FieldType =
  | "Id"
  | "Text"
  | "Email"
  | "Phone"
  | "Date"
  | "Date/Time"
  | "Number"
  | "Percent"
  | "Checkbox"
  | "Picklist"
  | "Long Text";

export type SchemaField = {
  api: string;
  type: FieldType | `Lookup(${string})` | `Master-Detail(${string})`;
  required?: boolean;
  relatedTo?: string;
  relKind?: RelKind;
};

export type SchemaRel = {
  from: string;
  to: string;
  field: string;
  kind: RelKind;
  cardinality: "1:N" | "1:1";
};

export const SCHEMA_CORE = [
  "Deal Approval",
  "Deal",
  "LOS Product",
  "Account",
  "Metric",
  "Related Party Metric",
  "Collateral Pledged",
  "Asset",
  "Deal Team Member",
  "Requirements",
  "Related Party",
] as const;

export const SCHEMA_FIELDS: Record<string, SchemaField[]> = {
  "Deal Approval": [
    { api: "approvalId", type: "Id", required: true },
    { api: "losProductId", type: "Lookup(LOS Product)", required: true, relatedTo: "LOS Product", relKind: "lookup" },
    { api: "dealId", type: "Lookup(Deal)", relatedTo: "Deal", relKind: "lookup" },
    { api: "approverName", type: "Text", required: true },
    { api: "level", type: "Picklist", required: true },
    { api: "status", type: "Picklist", required: true },
    { api: "decision", type: "Picklist" },
    { api: "riskGrade", type: "Picklist" },
    { api: "conditions", type: "Long Text" },
    { api: "decidedOn", type: "Date" },
  ],
  Deal: [
    { api: "dealId", type: "Id", required: true },
    { api: "dealNumber", type: "Text", required: true },
    { api: "name", type: "Text", required: true },
    { api: "accountId", type: "Master-Detail(Account)", required: true, relatedTo: "Account", relKind: "masterDetail" },
    { api: "stage", type: "Picklist", required: true },
    { api: "stageStatus", type: "Picklist", required: true },
    { api: "status", type: "Picklist", required: true },
    { api: "ownerId", type: "Text" },
    { api: "openedOn", type: "Date", required: true },
  ],
  "LOS Product": [
    { api: "losProductId", type: "Id", required: true },
    { api: "name", type: "Text", required: true },
    { api: "dealId", type: "Lookup(Deal)", required: true, relatedTo: "Deal", relKind: "lookup" },
    { api: "accountId", type: "Lookup(Account)", required: true, relatedTo: "Account", relKind: "lookup" },
    { api: "productType", type: "Picklist", required: true },
    { api: "purpose", type: "Picklist" },
    { api: "amount", type: "Number", required: true },
    { api: "interestRate", type: "Percent" },
    { api: "spread", type: "Percent" },
    { api: "indexRate", type: "Picklist" },
    { api: "termMonths", type: "Number" },
    { api: "status", type: "Picklist", required: true },
    { api: "closeDate", type: "Date" },
    { api: "sbaGuarantyPct", type: "Percent" },
    { api: "guarantyNumber", type: "Text" },
  ],
  Account: [
    { api: "accountId", type: "Id", required: true },
    { api: "name", type: "Text", required: true },
    { api: "recordType", type: "Picklist", required: true },
    { api: "legalName", type: "Text" },
    { api: "taxIdLast4", type: "Text" },
    { api: "email", type: "Email" },
    { api: "phone", type: "Phone" },
    { api: "naicsCode", type: "Text" },
    { api: "businessType", type: "Picklist" },
    { api: "incorporatedOn", type: "Date" },
    { api: "billingCity", type: "Text" },
    { api: "billingState", type: "Picklist" },
    { api: "annualReceipts", type: "Number" },
    { api: "employeeCount", type: "Number" },
  ],
  Metric: [
    { api: "metricId", type: "Id", required: true },
    { api: "losProductId", type: "Lookup(LOS Product)", required: true, relatedTo: "LOS Product", relKind: "lookup" },
    { api: "accountId", type: "Lookup(Account)", relatedTo: "Account", relKind: "lookup" },
    { api: "metricType", type: "Picklist", required: true },
    { api: "value", type: "Number" },
    { api: "asOf", type: "Date", required: true },
    { api: "source", type: "Picklist" },
    { api: "outcome", type: "Picklist" },
  ],
  "Related Party Metric": [
    { api: "partyMetricId", type: "Id", required: true },
    { api: "relatedPartyId", type: "Lookup(Related Party)", required: true, relatedTo: "Related Party", relKind: "lookup" },
    { api: "losProductId", type: "Lookup(LOS Product)", relatedTo: "LOS Product", relKind: "lookup" },
    { api: "accountId", type: "Lookup(Account)", relatedTo: "Account", relKind: "lookup" },
    { api: "metricType", type: "Picklist", required: true },
    { api: "score", type: "Number" },
    { api: "outstandingAmount", type: "Number" },
    { api: "utilizationPct", type: "Percent" },
    { api: "yearsSinceFirstCredit", type: "Number" },
    { api: "pastDueAmount", type: "Number" },
    { api: "lastCheckedAt", type: "Date" },
    { api: "outcome", type: "Picklist" },
  ],
  "Collateral Pledged": [
    { api: "pledgeId", type: "Id", required: true },
    { api: "losProductId", type: "Lookup(LOS Product)", required: true, relatedTo: "LOS Product", relKind: "lookup" },
    { api: "assetId", type: "Lookup(Asset)", required: true, relatedTo: "Asset", relKind: "lookup" },
    { api: "accountId", type: "Lookup(Account)", relatedTo: "Account", relKind: "lookup" },
    { api: "lienPosition", type: "Number", required: true },
    { api: "pledgeAmount", type: "Number" },
    { api: "lendableValue", type: "Number" },
    { api: "advanceRate", type: "Percent" },
    { api: "coveragePct", type: "Percent" },
  ],
  Asset: [
    { api: "assetId", type: "Id", required: true },
    { api: "accountId", type: "Lookup(Account)", required: true, relatedTo: "Account", relKind: "lookup" },
    { api: "name", type: "Text", required: true },
    { api: "assetType", type: "Picklist", required: true },
    { api: "location", type: "Text" },
    { api: "appraisedValue", type: "Number" },
    { api: "appraisalDate", type: "Date" },
    { api: "advanceRate", type: "Percent" },
    { api: "insured", type: "Checkbox" },
  ],
  "Deal Team Member": [
    { api: "memberId", type: "Id", required: true },
    { api: "dealId", type: "Lookup(Deal)", required: true, relatedTo: "Deal", relKind: "lookup" },
    { api: "role", type: "Picklist", required: true },
    { api: "userName", type: "Text", required: true },
    { api: "isPrimary", type: "Checkbox" },
    { api: "assignedAtStage", type: "Picklist" },
    { api: "assignedOn", type: "Date" },
  ],
  Requirements: [
    { api: "requirementId", type: "Id", required: true },
    { api: "losProductId", type: "Lookup(LOS Product)", required: true, relatedTo: "LOS Product", relKind: "lookup" },
    { api: "relatedPartyId", type: "Lookup(Related Party)", relatedTo: "Related Party", relKind: "lookup" },
    { api: "pledgeId", type: "Lookup(Collateral Pledged)", relatedTo: "Collateral Pledged", relKind: "lookup" },
    { api: "accountId", type: "Lookup(Account)", relatedTo: "Account", relKind: "lookup" },
    { api: "name", type: "Text", required: true },
    { api: "category", type: "Picklist", required: true },
    { api: "status", type: "Picklist", required: true },
    { api: "dueStage", type: "Picklist" },
    { api: "satisfiedOn", type: "Date" },
  ],
  "Related Party": [
    { api: "relatedPartyId", type: "Id", required: true },
    { api: "losProductId", type: "Lookup(LOS Product)", required: true, relatedTo: "LOS Product", relKind: "lookup" },
    { api: "accountId", type: "Lookup(Account)", required: true, relatedTo: "Account", relKind: "lookup" },
    { api: "role", type: "Picklist", required: true },
    { api: "ownershipPct", type: "Percent" },
    { api: "guaranteeType", type: "Picklist" },
    { api: "isPrimary", type: "Checkbox" },
    { api: "ofacResult", type: "Picklist" },
    { api: "creditOutcome", type: "Picklist" },
  ],
};

export const SCHEMA_OBJECTS = Object.keys(SCHEMA_FIELDS);

/** Child → parent. Red line is Deal → Account. Loans and loan children are lookups. */
export const SCHEMA_RELS: SchemaRel[] = [
  { from: "Deal", to: "Account", field: "accountId", kind: "masterDetail", cardinality: "1:N" },
  { from: "LOS Product", to: "Deal", field: "dealId", kind: "lookup", cardinality: "1:N" },
  { from: "LOS Product", to: "Account", field: "accountId", kind: "lookup", cardinality: "1:N" },
  { from: "Related Party", to: "LOS Product", field: "losProductId", kind: "lookup", cardinality: "1:N" },
  { from: "Related Party", to: "Account", field: "accountId", kind: "lookup", cardinality: "1:N" },
  { from: "Deal Approval", to: "LOS Product", field: "losProductId", kind: "lookup", cardinality: "1:N" },
  { from: "Deal Approval", to: "Deal", field: "dealId", kind: "lookup", cardinality: "1:N" },
  { from: "Requirements", to: "LOS Product", field: "losProductId", kind: "lookup", cardinality: "1:N" },
  { from: "Requirements", to: "Related Party", field: "relatedPartyId", kind: "lookup", cardinality: "1:N" },
  { from: "Requirements", to: "Collateral Pledged", field: "pledgeId", kind: "lookup", cardinality: "1:N" },
  { from: "Requirements", to: "Account", field: "accountId", kind: "lookup", cardinality: "1:N" },
  { from: "Metric", to: "LOS Product", field: "losProductId", kind: "lookup", cardinality: "1:N" },
  { from: "Metric", to: "Account", field: "accountId", kind: "lookup", cardinality: "1:N" },
  { from: "Related Party Metric", to: "Related Party", field: "relatedPartyId", kind: "lookup", cardinality: "1:N" },
  { from: "Related Party Metric", to: "LOS Product", field: "losProductId", kind: "lookup", cardinality: "1:N" },
  { from: "Related Party Metric", to: "Account", field: "accountId", kind: "lookup", cardinality: "1:N" },
  { from: "Collateral Pledged", to: "LOS Product", field: "losProductId", kind: "lookup", cardinality: "1:N" },
  { from: "Collateral Pledged", to: "Asset", field: "assetId", kind: "lookup", cardinality: "1:N" },
  { from: "Collateral Pledged", to: "Account", field: "accountId", kind: "lookup", cardinality: "1:N" },
  { from: "Asset", to: "Account", field: "accountId", kind: "lookup", cardinality: "1:N" },
  { from: "Deal Team Member", to: "Deal", field: "dealId", kind: "lookup", cardinality: "1:N" },
];

export const SCHEMA_LAYOUT: Record<string, { x: number; y: number }> = {
  "Deal Approval": { x: 20, y: 28 },
  Deal: { x: 400, y: 8 },
  "LOS Product": { x: 210, y: 340 },
  Account: { x: 700, y: 180 },
  Metric: { x: 1060, y: 36 },
  "Related Party Metric": { x: 1400, y: 16 },
  "Collateral Pledged": { x: 20, y: 760 },
  Asset: { x: 250, y: 1080 },
  "Deal Team Member": { x: 540, y: 1100 },
  Requirements: { x: 760, y: 780 },
  "Related Party": { x: 1140, y: 700 },
};

export const SCHEMA_CANVAS = { w: 1720, h: 1460 };

export const CARD_W = 248;
export const HEADER_H = 34;
export const ROW_H = 22;
export const FOOTER_H = 26;
export const COLLAPSED_ROWS = 10;

export function cardHeight(fieldCount: number, expanded: boolean): number {
  const shown = expanded ? fieldCount : Math.min(COLLAPSED_ROWS, fieldCount);
  const footer = fieldCount > COLLAPSED_ROWS ? FOOTER_H : 4;
  return HEADER_H + shown * ROW_H + footer;
}

export function fieldAnchorY(fieldIndex: number): number {
  return HEADER_H + fieldIndex * ROW_H + ROW_H / 2;
}

export type HeaderTone = "master" | "party" | "child";

export function headerTone(name: string): HeaderTone {
  if (name === "Account" || name === "Deal") return "master";
  if (name === "LOS Product" || name === "Related Party") return "party";
  return "child";
}

export function typeLabel(type: SchemaField["type"]): string {
  if (type.startsWith("Lookup(")) return "Lookup";
  if (type.startsWith("Master-Detail(")) return "Master-Detail";
  return type;
}
