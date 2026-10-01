"""Mock Processing APIs — SOS/KYB, SBA size, SAM.gov, franchise, affiliation.

Returns a customer-facing report that is persisted on SbaProfile.mock_report_json.
Replace these functions with live vendors later; the saved shape stays the same.
"""

from __future__ import annotations

from datetime import datetime, timezone

from .. import models

# Simplified SBA size standards (receipts in USD, employee cap). Live table TBD.
_SIZE = {
    "23": {"receipts": 45_000_000, "employees": None, "label": "$45 million receipts (construction)"},
    "31": {"receipts": None, "employees": 500, "label": "500 employees (manufacturing)"},
    "32": {"receipts": None, "employees": 500, "label": "500 employees (manufacturing)"},
    "33": {"receipts": None, "employees": 500, "label": "500 employees (manufacturing)"},
    "44": {"receipts": 47_000_000, "employees": None, "label": "$47 million receipts (retail)"},
    "48": {"receipts": 34_000_000, "employees": None, "label": "$34 million receipts"},
    "54": {"receipts": 34_000_000, "employees": None, "label": "$34 million receipts (professional services)"},
    "72": {"receipts": 12_000_000, "employees": None, "label": "$12 million receipts (food services)"},
}
_DEFAULT_SIZE = {"receipts": 34_000_000, "employees": 500, "label": "$34 million receipts / 500 employees"}


def _iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _employees_for(business: models.Business) -> int:
    name = (business.legal_name or "").lower()
    if "holdings" in name or "group" in name:
        return 86
    if "llc" in (business.business_type or "").lower() or "llc" in name:
        return 14
    return 22


def _receipts_for(business: models.Business, loan: models.Loan | None) -> float:
    amount = 0.0
    raw = (loan.loan_amount if loan else "") or business.loan_amount or ""
    try:
        amount = float(str(raw).replace(",", "").replace("$", "") or 0)
    except ValueError:
        amount = 0.0
    return max(amount * 1.8, 1_250_000.0)


def build_processing_report(
    customer: models.Customer | None,
    business: models.Business,
    loan: models.Loan | None,
    source: str = "sos",
) -> dict:
    """Deterministic mock of the Processing vendor calls."""
    naics = (business.naics_code or "541511")[:6]
    size = _SIZE.get(naics[:2], _DEFAULT_SIZE)
    employees = _employees_for(business)
    receipts = _receipts_for(business, loan)
    emp_ok = size["employees"] is None or employees <= size["employees"]
    rec_ok = size["receipts"] is None or receipts <= size["receipts"]
    size_ok = emp_ok and rec_ok
    franchise = "franchise" in (business.legal_name or "").lower()
    name = f"{customer.first_name} {customer.last_name}".strip() if customer else "Customer"

    sos = {
        "api": "sos.kyb",
        "vendor": "Secretary of State (mock)",
        "status": "clear",
        "detail": f"{business.legal_name} is active / in good standing. Formation {business.incorporated_on or 'on file'}.",
    }
    size_check = {
        "api": "sba.sizeStandard",
        "vendor": "SBA Size Standards (mock)",
        "status": "pass" if size_ok else "fail",
        "detail": (
            f"NAICS {naics or '—'} · {employees} employees · "
            f"${receipts:,.0f} receipts vs {size['label']}."
        ),
    }
    sam = {
        "api": "sam.gov",
        "vendor": "SAM.gov exclusions (mock)",
        "status": "clear",
        "detail": f"No active SAM exclusions on {business.legal_name} or {name}.",
    }
    fran = {
        "api": "sba.franchise",
        "vendor": "SBA Franchise Directory (mock)",
        "status": "review" if franchise else "n/a",
        "detail": (
            "Name suggests a franchise — confirm SBA directory listing."
            if franchise
            else "Not flagged as a franchise."
        ),
    }
    aff = {
        "api": "sba.affiliation",
        "vendor": "Affiliation screen (mock)",
        "status": "clear",
        "detail": "No affiliation or common-control flags on this mock pass.",
    }
    owner = {
        "api": "sba.ownerEligibility",
        "vendor": "Owner eligibility (mock)",
        "status": "pass",
        "detail": f"{name} — mock 7(a) owner eligibility (citizenship / 51% ownership assumed).",
    }

    checks = [sos, size_check, sam, fran, aff, owner]
    failed = [c for c in checks if c["status"] == "fail"]
    eligibility = "ineligible" if failed else "eligible"

    year = datetime.now(timezone.utc).year
    statements = [
        {"year": year - 1, "revenue": round(receipts), "netIncome": round(receipts * 0.08), "source": "processing"},
        {"year": year - 2, "revenue": round(receipts * 0.92), "netIncome": round(receipts * 0.07), "source": "processing"},
        {"year": year - 3, "revenue": round(receipts * 0.86), "netIncome": round(receipts * 0.06), "source": "processing"},
    ]

    return {
        "mocked": True,
        "ranAt": _iso(),
        "source": source,
        "customer": {
            "name": name,
            "ssnLast4": customer.ssn_last4 if customer else "",
            "dob": customer.dob if customer else "",
        },
        "business": {
            "legalName": business.legal_name,
            "taxIdLast4": business.tax_id_last4,
            "businessType": business.business_type,
            "naicsCode": naics,
            "incorporatedOn": business.incorporated_on,
        },
        "inputs": {
            "employeeCount": employees,
            "annualReceipts": round(receipts),
            "sizeStandard": size["label"],
        },
        "statements": statements,
        "checks": checks,
        "eligibility": eligibility,
        "sizeStandardMet": size_ok,
        "isFranchise": franchise,
        "samStatus": sam["status"],
        "notes": "Mock Processing pack. Live SOS / SBA / SAM integrations are deferred.",
    }
