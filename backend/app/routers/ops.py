"""Read-only operations dashboard and protected runtime metrics."""
from __future__ import annotations
import hmac
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from ..observability import collect_runtime_metrics
from ..settings import settings

router = APIRouter(tags=["operations"])
_DASHBOARD_FILE = Path(__file__).resolve().parents[1] / "dashboard.html"

def _require_dashboard_token(request: Request) -> None:
    expected = settings.dashboard_token.strip()
    protected = settings.app_env.lower() in {"production", "prod"} or bool(expected)
    if not protected:
        return
    supplied = request.headers.get("x-dashboard-token", "")
    if not expected or not supplied or not hmac.compare_digest(expected, supplied):
        raise HTTPException(status_code=401, detail="Dashboard access token required.")

@router.get("/dashboard", response_class=HTMLResponse, include_in_schema=False)
def dashboard() -> HTMLResponse:
    try:
        html = _DASHBOARD_FILE.read_text(encoding="utf-8")
    except OSError as exc:
        raise HTTPException(status_code=503, detail="Dashboard assets unavailable.") from exc
    return HTMLResponse(html, headers={"Cache-Control":"no-store", "X-Content-Type-Options":"nosniff", "X-Frame-Options":"DENY", "Referrer-Policy":"no-referrer"})

@router.get("/api/cx1/ops/metrics", include_in_schema=False)
def metrics(request: Request) -> JSONResponse:
    _require_dashboard_token(request)
    payload = collect_runtime_metrics()
    code = 200 if payload["status"] == "healthy" else 503
    return JSONResponse(payload, status_code=code, headers={"Cache-Control":"no-store, max-age=0", "Pragma":"no-cache", "X-Content-Type-Options":"nosniff"})
