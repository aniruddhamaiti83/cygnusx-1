PROCESS_STAGES = [
    {"id": "intake", "n": "01", "label": "Intake", "owner": "Relationship manager"},
    {"id": "preApplication", "n": "02", "label": "Pre-application", "owner": "Credit / Fraud"},
    {"id": "processing", "n": "03", "label": "Processing", "owner": "Processor"},
    {"id": "collateral", "n": "04", "label": "Collateral", "owner": "Processor"},
    {"id": "underwriter", "n": "05", "label": "Underwriter", "owner": "Underwriter"},
    {"id": "documents", "n": "06", "label": "Documents", "owner": "Closer"},
    {"id": "financing", "n": "07", "label": "Funding", "owner": "Funding ops"},
    {"id": "closure", "n": "08", "label": "Closure", "owner": "Funding ops"},
]

STAGE_ORDER = [s["id"] for s in PROCESS_STAGES]

STAFF = [
    {"id": "rm-elena", "name": "Elena Voss", "title": "Relationship manager", "desk": "rm"},
    {"id": "cr-marcus", "name": "Marcus Hale", "title": "Credit officer", "desk": "credit"},
    {"id": "fr-priya", "name": "Priya Shah", "title": "Fraud analyst", "desk": "fraud"},
    {"id": "pr-jordan", "name": "Jordan Kim", "title": "Processor", "desk": "processor"},
    {"id": "uw-diana", "name": "Diana Okonkwo", "title": "Underwriter", "desk": "underwriter"},
    {"id": "cl-sam", "name": "Sam Ruiz", "title": "Closer", "desk": "closer"},
]

DESK_ON_STAGE = {
    "intake": {"rm"},
    "preApplication": {"rm", "credit", "fraud"},
    "processing": {"rm", "processor"},
    "collateral": {"rm", "processor"},
    "underwriter": {"rm", "underwriter"},
    "documents": {"rm", "closer"},
    "financing": {"rm", "closer"},
    "closure": {"rm", "closer"},
}

STAGE_STAFF = {
    "intake": {"rm": "rm-elena"},
    "preApplication": {"credit": "cr-marcus", "fraud": "fr-priya"},
    "processing": {"processor": "pr-jordan"},
    "collateral": {"processor": "pr-jordan"},
    "underwriter": {"underwriter": "uw-diana"},
    "documents": {"closer": "cl-sam"},
    "financing": {"closer": "cl-sam"},
    "closure": {"closer": "cl-sam"},
}

ACCOUNT_ROLES = [
    {"id": "borrower", "label": "Borrower"},
    {"id": "coborrower", "label": "Co-borrower"},
    {"id": "signor", "label": "Signor"},
    {"id": "guarantor", "label": "Guarantor"},
    {"id": "relatedParty", "label": "Related party"},
]

GENDERS = [
    {"id": "female", "label": "Female"},
    {"id": "male", "label": "Male"},
    {"id": "other", "label": "Other"},
    {"id": "preferNotToSay", "label": "Prefer not to say"},
]

RACES = [
    {"id": "americanIndian", "label": "American Indian or Alaska Native"},
    {"id": "asian", "label": "Asian"},
    {"id": "black", "label": "Black or African American"},
    {"id": "pacificIslander", "label": "Native Hawaiian or Other Pacific Islander"},
    {"id": "white", "label": "White"},
    {"id": "preferNotToSay", "label": "Prefer not to say"},
]

ETHNICITIES = [
    {"id": "hispanic", "label": "Hispanic or Latino"},
    {"id": "notHispanic", "label": "Not Hispanic or Latino"},
    {"id": "preferNotToSay", "label": "Prefer not to say"},
]

BUSINESS_TYPES = [
    {"id": "soleProp", "label": "Sole proprietorship"},
    {"id": "llc", "label": "LLC"},
    {"id": "corp", "label": "Corporation"},
    {"id": "lp", "label": "Limited partnership"},
    {"id": "gp", "label": "General partnership"},
    {"id": "nonprofit", "label": "Nonprofit"},
    {"id": "trust", "label": "Trust"},
    {"id": "other", "label": "Other"},
]

PRODUCTS = [
    {"id": "drawToTerm", "label": "Draw-To-Term"},
    {"id": "leverage", "label": "Leverage"},
    {"id": "termLoan", "label": "Term Loan"},
    {"id": "lineOfCredit", "label": "Line of Credit"},
    {"id": "sba7a", "label": "SBA 7(a)"},
    {"id": "sbaExpress", "label": "SBA Express"},
    {"id": "sba504", "label": "SBA 504"},
]

LOAN_PURPOSES = [
    {"id": "workingCapital", "label": "Working capital"},
    {"id": "equipment", "label": "Equipment"},
    {"id": "realEstate", "label": "Owner-occupied real estate"},
    {"id": "refinance", "label": "Refinance"},
    {"id": "acquisition", "label": "Business acquisition"},
    {"id": "startup", "label": "Start-up / expansion"},
    {"id": "other", "label": "Other"},
]

AFS_PURPOSE_CODES = [
    {"id": "WC", "label": "WC — Working capital"},
    {"id": "EQ", "label": "EQ — Equipment"},
    {"id": "RE", "label": "RE — Real estate"},
    {"id": "RF", "label": "RF — Refinance"},
    {"id": "AQ", "label": "AQ — Acquisition"},
    {"id": "OT", "label": "OT — Other"},
]

LOAN_STATUSES = [
    {"id": "processing", "label": "Processing"},
    {"id": "submitted", "label": "Submitted"},
    {"id": "accepted", "label": "Accepted"},
    {"id": "rejected", "label": "Rejected"},
]

RATE_BASES = [
    {"id": "actual360", "label": "Actual / 360"},
    {"id": "thirty360", "label": "30 / 360"},
    {"id": "actual365", "label": "Actual / 365"},
]

INDEX_RATES = [
    {"id": "fixed", "label": "Fixed"},
    {"id": "prime", "label": "Prime"},
    {"id": "wsjPrime", "label": "WSJ Prime"},
    {"id": "sofr", "label": "SOFR"},
]

PRIN_FREQUENCIES = [
    {"id": "monthly", "label": "Monthly"},
    {"id": "quarterly", "label": "Quarterly"},
    {"id": "semiannual", "label": "Semi-annual"},
    {"id": "annual", "label": "Annual"},
]

CONSUMER_SOURCES = [
    {"id": "equifax", "label": "Equifax"},
    {"id": "experian", "label": "Experian"},
    {"id": "transunion", "label": "TransUnion"},
]

CONSUMER_PRODUCTS = [
    {"id": "fico8", "label": "FICO Score 8"},
    {"id": "fico9", "label": "FICO Score 9"},
    {"id": "fico10", "label": "FICO Score 10"},
    {"id": "vantage4", "label": "VantageScore 4.0"},
]

BUSINESS_SOURCES = [
    {"id": "experianBusiness", "label": "Experian Business"},
    {"id": "equifaxBusiness", "label": "Equifax Business (SBFE)"},
    {"id": "dnb", "label": "Dun & Bradstreet"},
]

BUSINESS_PRODUCTS = {
    "experianBusiness": [
        {"id": "intelliscorePlus", "label": "Intelliscore Plus"},
        {"id": "fsr", "label": "Financial Stability Risk"},
    ],
    "equifaxBusiness": [
        {"id": "oneScore", "label": "OneScore for Commercial"},
        {"id": "sbfeBlend", "label": "SBFE blended delinquency"},
    ],
    "dnb": [
        {"id": "paydex", "label": "PAYDEX"},
        {"id": "dnbRating", "label": "D&B Rating"},
    ],
}

COLLATERAL_TYPES = [
    {"id": "realEstate", "label": "Real estate"},
    {"id": "equipment", "label": "Equipment"},
    {"id": "accountsReceivable", "label": "Accounts receivable"},
    {"id": "vehicle", "label": "Vehicle"},
    {"id": "inventory", "label": "Inventory"},
    {"id": "other", "label": "Other"},
]

KYB_SOURCES = [
    {"id": "sos", "label": "Secretary of State"},
    {"id": "middesk", "label": "Middesk"},
    {"id": "lexis", "label": "LexisNexis"},
]

US_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL",
    "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE",
    "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD",
    "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
]

SWARM_AGENTS = [
    {
        "id": "supervisor",
        "name": "Supervisor / planner",
        "kind": "supervisor",
        "stage": "all",
        "writes": ["AuditEvent"],
    },
    {"id": "cip", "name": "CIP / identity", "kind": "worker", "stage": "01"},
    {"id": "facility", "name": "Facility keepers", "kind": "worker", "stage": "01"},
    {"id": "consumerCredit", "name": "Consumer credit", "kind": "worker", "stage": "02"},
    {"id": "commercialCredit", "name": "Commercial credit", "kind": "worker", "stage": "02"},
    {"id": "sanctions", "name": "Sanctions / fraud", "kind": "worker", "stage": "02"},
    {"id": "processing", "name": "Spreading / KYB", "kind": "worker", "stage": "03"},
    {"id": "collateral", "name": "Collateral", "kind": "worker", "stage": "04"},
    {"id": "policy", "name": "Credit policy pack", "kind": "worker", "stage": "05"},
    {"id": "evaluator", "name": "Evaluator / critic", "kind": "evaluator", "stage": "all"},
    {"id": "docs", "name": "Documentation", "kind": "worker", "stage": "06"},
    {"id": "funding", "name": "Funding / E-Tran", "kind": "worker", "stage": "07"},
]

STAGE_WORKERS = {
    "intake": ["cip", "facility"],
    "preApplication": ["consumerCredit", "commercialCredit", "sanctions"],
    "processing": ["processing"],
    "collateral": ["collateral"],
    "underwriter": ["creditDecision"],
    "documents": ["docs"],
    "financing": ["funding"],
    "closure": ["funding", "evaluator"],
}


def staff_by_id(staff_id: str) -> dict:
    return next(s for s in STAFF if s["id"] == staff_id)


def desk_label(desk: str) -> str:
    return next(s["title"] for s in STAFF if s["desk"] == desk)


def next_stage(current: str) -> str | None:
    try:
        i = STAGE_ORDER.index(current)
    except ValueError:
        return None
    if i + 1 >= len(STAGE_ORDER):
        return None
    return STAGE_ORDER[i + 1]


def catalog_payload() -> dict:
    return {
        "stages": PROCESS_STAGES,
        "staff": STAFF,
        "roles": ACCOUNT_ROLES,
        "genders": GENDERS,
        "races": RACES,
        "ethnicities": ETHNICITIES,
        "businessTypes": BUSINESS_TYPES,
        "products": PRODUCTS,
        "loanPurposes": LOAN_PURPOSES,
        "afsPurposeCodes": AFS_PURPOSE_CODES,
        "loanStatuses": LOAN_STATUSES,
        "rateBases": RATE_BASES,
        "indexRates": INDEX_RATES,
        "prinFrequencies": PRIN_FREQUENCIES,
        "consumerSources": CONSUMER_SOURCES,
        "consumerProducts": CONSUMER_PRODUCTS,
        "businessSources": BUSINESS_SOURCES,
        "businessProducts": BUSINESS_PRODUCTS,
        "collateralTypes": COLLATERAL_TYPES,
        "kybSources": KYB_SOURCES,
        "usStates": US_STATES,
        "swarmAgents": SWARM_AGENTS,
    }
