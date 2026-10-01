export type OemTable = {
  name: string;
  pk: string;
  stage: string;
  purpose: string;
  columns: [string, string][];
};

export const OEM_TABLES: OemTable[] = [
  {
    name: "Account",
    pk: "accountId",
    stage: "01",
    purpose: "Customer. Person Account is the individual. Business Account is the company. Roles are not stored here.",
    columns: [
      ["accountId", "PK"],
      ["name / recordType", "Person Account | Business Account"],
      ["taxIdLast4 / email / phone", "CIP. Full tax id is tokenized off this row"],
      ["naicsCode / annualReceipts / employeeCount", "Size inputs on a Business Account"],
    ],
  },
  {
    name: "Deal",
    pk: "dealId",
    stage: "01",
    purpose: "The Process. One origination file and its stage. Master-detail child of the borrower Account. Holds many loans.",
    columns: [
      ["dealId / dealNumber", "PK and file number"],
      ["accountId", "Master-detail → Account, required"],
      ["stage / stageStatus / status", "File lifecycle, not facility terms"],
      ["ownerId / openedOn", "RM and open date"],
    ],
  },
  {
    name: "LOS Product",
    pk: "losProductId",
    stage: "01",
    purpose: "The loan. Many per Deal. Amount, rate, term, purpose, product type, and guaranty live here.",
    columns: [
      ["losProductId", "PK"],
      ["dealId / accountId", "Lookups. One deal, many loans"],
      ["productType / purpose / amount", "7(a), 504, Express"],
      ["interestRate / termMonths / sbaGuarantyPct", "Facility terms"],
    ],
  },
  {
    name: "Related Party",
    pk: "relatedPartyId",
    stage: "01",
    purpose: "A party on one loan. Borrower, co-borrower, guarantor, authorized signor, or owner. Points at an Account.",
    columns: [
      ["relatedPartyId", "PK"],
      ["losProductId / accountId", "Loan and the person or business"],
      ["role / ownershipPct / guaranteeType", "Role on that loan only"],
      ["ofacResult / creditOutcome", "Qualifying checks"],
    ],
  },
  {
    name: "Deal Team Member",
    pk: "memberId",
    stage: "01",
    purpose: "Bank seat on the file. RM, processor, underwriter, closer.",
    columns: [
      ["memberId", "PK"],
      ["dealId / role / userName", "Who is on the Deal"],
      ["isPrimary / assignedAtStage", "Seat"],
    ],
  },
  {
    name: "Related Party Metric",
    pk: "partyMetricId",
    stage: "02",
    purpose: "Credit or fraud snapshot for a Related Party on a loan. One passing score qualifies Pre-application.",
    columns: [
      ["partyMetricId", "PK"],
      ["relatedPartyId / losProductId / accountId", "Lookups"],
      ["metricType / score / lastCheckedAt", "FICO, SBSS, Paynet, OFAC"],
      ["yearsSinceFirstCredit / outstandingAmount / utilizationPct", "Tradeline facts"],
    ],
  },
  {
    name: "Metric",
    pk: "metricId",
    stage: "03",
    purpose: "Ratio for one loan. DSCR, global cash flow, size standard, LTV.",
    columns: [
      ["metricId", "PK"],
      ["losProductId / accountId", "Lookups"],
      ["metricType / value / asOf / outcome", "Measured result"],
    ],
  },
  {
    name: "Asset",
    pk: "assetId",
    stage: "04",
    purpose: "Something an Account owns. Not itself a lien.",
    columns: [
      ["assetId", "PK"],
      ["accountId", "Lookup → owner"],
      ["assetType / location / appraisedValue", "RE, equipment, deposit, vehicle"],
    ],
  },
  {
    name: "Collateral Pledged",
    pk: "pledgeId",
    stage: "04",
    purpose: "Lien of an Asset onto one loan (LOS Product). Coverage and lien position live here.",
    columns: [
      ["pledgeId", "PK"],
      ["losProductId / assetId / accountId", "Lookups"],
      ["lienPosition / pledgeAmount / lendableValue", "Coverage"],
    ],
  },
  {
    name: "Deal Approval",
    pk: "approvalId",
    stage: "05",
    purpose: "Human credit action for one loan. A Deal with several loans has one approval per loan.",
    columns: [
      ["approvalId", "PK"],
      ["losProductId / dealId", "Loan first, file second"],
      ["approverName / level / decision / riskGrade", "Action of record"],
    ],
  },
  {
    name: "Requirements",
    pk: "requirementId",
    stage: "06",
    purpose: "Condition or document for one loan. May also point at a party or a pledge.",
    columns: [
      ["requirementId", "PK"],
      ["losProductId / relatedPartyId / pledgeId", "Lookups"],
      ["category / status / dueStage", "Document, condition, policy, insurance"],
    ],
  },
];

export const OEM_EDGES: [string, string, string][] = [
  ["Deal", "Account", "accountId — master-detail, required"],
  ["LOS Product", "Deal", "dealId — lookup, many loans per file"],
  ["LOS Product", "Account", "accountId — borrower on that loan"],
  ["Related Party", "LOS Product", "losProductId — role on that loan"],
  ["Related Party", "Account", "accountId — Person or Business Account"],
  ["Deal Team Member", "Deal", "dealId — lookup"],
  ["Related Party Metric", "Related Party", "relatedPartyId — lookup"],
  ["Metric", "LOS Product", "losProductId — per loan"],
  ["Asset", "Account", "accountId — owner"],
  ["Collateral Pledged", "LOS Product", "losProductId — lien on that loan"],
  ["Collateral Pledged", "Asset", "assetId — lookup"],
  ["Deal Approval", "LOS Product", "losProductId — per loan"],
  ["Requirements", "LOS Product", "losProductId — per loan"],
];
