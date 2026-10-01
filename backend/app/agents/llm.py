"""LangChain LLM router: local OpenAI-compatible first, then xAI, then heuristic."""

from __future__ import annotations

import json
import re
from typing import Any

from ..settings import settings

XAI_BASE = "https://api.x.ai/v1"
XAI_MODEL = "grok-4.5"


class HeuristicLLM:
    """Deterministic stand-in so origination works when no LLM endpoint is configured."""

    def invoke(self, messages: list[Any], **_: Any) -> Any:
        text = ""
        for m in messages:
            content = getattr(m, "content", m if isinstance(m, str) else "")
            text += str(content) + "\n"
        payload = heuristic_payload(text)
        return type("Msg", (), {"content": json.dumps(payload)})()


def llm_status() -> dict:
    if settings.llm_base_url.strip():
        return {
            "provider": "local",
            "label": f"Local · {settings.llm_model}",
            "model": settings.llm_model,
            "baseUrl": settings.llm_base_url.rstrip("/"),
            "configured": True,
        }
    if settings.xai_api_key:
        return {
            "provider": "xai",
            "label": f"xAI · {XAI_MODEL}",
            "model": XAI_MODEL,
            "baseUrl": XAI_BASE,
            "configured": True,
        }
    return {
        "provider": "heuristic",
        "label": "Heuristic (no LLM)",
        "model": "heuristic",
        "baseUrl": "",
        "configured": False,
    }


def get_chat_model():
    status = llm_status()
    if status["provider"] == "heuristic":
        return HeuristicLLM(), status
    try:
        from langchain_openai import ChatOpenAI

        if status["provider"] == "local":
            llm = ChatOpenAI(
                base_url=settings.llm_base_url.rstrip("/"),
                api_key=settings.llm_api_key or "ollama",
                model=settings.llm_model,
                temperature=0,
                max_tokens=700,
                timeout=settings.llm_timeout,
            )
        else:
            llm = ChatOpenAI(
                base_url=XAI_BASE,
                api_key=settings.xai_api_key,
                model=XAI_MODEL,
                temperature=0,
                max_tokens=700,
                timeout=settings.llm_timeout,
            )
        return llm, status
    except Exception:
        return HeuristicLLM(), {**status, "provider": "heuristic", "label": "Heuristic (LLM error)", "configured": False}


def extract_json(text: str) -> dict:
    raw = (text or "").strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    if fence:
        raw = fence.group(1).strip()
    start = raw.find("{")
    end = raw.rfind("}")
    if start >= 0 and end > start:
        return json.loads(raw[start : end + 1])
    raise ValueError("no json")


def invoke_json(system: str, user: str) -> tuple[dict, dict]:
    from langchain_core.messages import HumanMessage, SystemMessage

    llm, status = get_chat_model()
    try:
        msg = llm.invoke(
            [
                SystemMessage(content=system),
                HumanMessage(content=user),
            ]
        )
        content = getattr(msg, "content", "") or ""
        if isinstance(content, list):
            content = "".join(
                part.get("text", "") if isinstance(part, dict) else str(part) for part in content
            )
        data = extract_json(str(content))
        return data, status
    except Exception:
        return heuristic_payload(system + "\n" + user), {
            **status,
            "provider": "heuristic",
            "label": "Heuristic (parse fallback)",
        }


def heuristic_payload(prompt: str) -> dict:
    p = prompt.lower()
    if "consumer credit" in p or "fico" in p:
        return {
            "score": 712,
            "outcome": "pass",
            "confidence": 0.72,
            "summary": "Consumer bureau pull on the liable individual. FCRA purpose bound to this process. Score is advisory of capacity, not a substitute for commercial analysis.",
            "factors": ["Thin but clean revolving history", "No recent charge-offs", "Utilization moderate"],
            "scoreType": "FICO Score 9",
            "lastCheckedAt": "2026-09-08",
            "yearsSinceFirstCredit": 14,
            "outstandingAmount": 18420,
            "utilizationPct": 31,
            "openTradelines": 7,
            "pastDueAmount": 0,
        }
    if "commercial" in p or "paydex" in p or "intelliscore" in p:
        score = 80 if "dnb" in p or "paydex" in p else 76
        return {
            "score": score,
            "outcome": "pass",
            "confidence": 0.7,
            "summary": "Commercial bureau on the operating company. Not a consumer CRA. Tradeline / PAYDEX-style pay habits used.",
            "factors": ["Trade experiences current", "No open collections on the business"],
            "scoreType": "PAYDEX" if "dnb" in p or "paydex" in p else "Intelliscore Plus",
            "lastCheckedAt": "2026-09-08",
            "yearsSinceFirstCredit": 9,
            "outstandingAmount": 126500,
            "utilizationPct": 42,
            "openTradelines": 11,
            "pastDueAmount": 0,
        }
    if "ofac" in p or "sanctions" in p or "sdn" in p:
        hit = any(k in p for k in ("blocked", "osama", "cartel", "sdn-hit"))
        return {
            "outcome": "fail" if hit else "pass",
            "confidence": 0.9,
            "summary": "OFAC SDN name screen on Customer and Business. Hit recorded; Pre-application still qualifies on a passing credit pull."
            if hit
            else "OFAC / SDN and internal fraud on Customer and Business. No match. This screen is one of three qualifying checks at Pre-application.",
            "matches": [],
        }
    if "kyb" in p or "secretary of state" in p:
        return {
            "status": "clear",
            "outcome": "pass",
            "confidence": 0.74,
            "summary": "Secretary of State / KYB: active entity, formation date consistent with intake, no status flags.",
        }
    if "collateral" in p:
        return {
            "outcome": "pass",
            "confidence": 0.68,
            "summary": "Collateral package: typed item, pledge to this Loan, insurance required on pledged items. Lien search recommended before closing.",
            "lienNotes": "Run UCC-1 / mortgage search at documentation.",
            "insuranceRequired": True,
        }
    if "scorecard" in p or "underwrit" in p or "policy pack" in p:
        return {
            "recommendedAction": "approve",
            "confidence": 0.66,
            "narrative": "Policy pack is advisory. Consumer FICO, commercial bureau, KYB, and collateral coverage support an approve recommendation for SBA 7(a)-style credit, subject to the human of record. SBSS is not the gate (sunset 1 Mar 2026).",
            "factors": [
                "Consumer credit pass with artefact",
                "Commercial bureau pass — not a consumer score",
                "OFAC clear",
                "KYB active",
                "At least one pledged collateral item or documented exception",
            ],
        }
    if "evaluator" in p or "critic" in p:
        return {
            "outcome": "pass",
            "confidence": 0.8,
            "summary": "Evaluator: a qualifying artefact is present, scorecard does not decide. Package ready for the human of record.",
            "issues": [],
        }
    if "document" in p:
        return {
            "outcome": "pass",
            "confidence": 0.7,
            "summary": "Closing package checklist. A document is not filed without imaging ACK.",
        }
    if "etran" in p or "funding" in p or "ledger" in p:
        return {
            "outcome": "pass",
            "confidence": 0.7,
            "summary": "Human-authorized E-Tran. Ledger draft is not a post. Dual-control required to seal.",
        }
    return {
        "outcome": "pass",
        "confidence": 0.5,
        "summary": "Stage worker completed with heuristic output. Configure LLM_BASE_URL to use a local LangChain model.",
    }
