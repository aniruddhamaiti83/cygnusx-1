from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from time import perf_counter

from .db import init_db
from .routers import auth, cx1, ops
from .observability import METRICS
from .settings import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title="CygnusX-1",
        version="0.3.0",
        description="Origination API. Bound files require the owning session.",
        docs_url="/api/cx1/docs",
        redoc_url="/api/cx1/redoc",
        openapi_url="/api/cx1/openapi.json",
    )
    origins = [item.strip() for item in settings.cors_origins.split(",") if item.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
    app.include_router(auth.router)
    app.include_router(cx1.router)
    app.include_router(ops.router)

    @app.middleware("http")
    async def request_metrics(request, call_next):
        started = perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        finally:
            route = request.scope.get("route")
            # A route template (not the raw URL) limits metric cardinality and avoids IDs in telemetry.
            route_name = getattr(route, "path", request.url.path)
            METRICS.record(request.method, route_name, status_code, (perf_counter() - started) * 1000.0)

    @app.get("/api/cx1/ready", include_in_schema=False)
    def ready():
        from sqlalchemy import text
        from .db import engine
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
        except Exception as exc:
            from fastapi import HTTPException
            raise HTTPException(status_code=503, detail="Database is not ready.") from exc
        return {"ready": True, "service": "cygnusx1"}

    @app.on_event("startup")
    def _startup():
        init_db()

    @app.get("/api/cx1/health")
    def health():
        from .agents.llm import llm_status
        from .settings import settings

        return {
            "ok": True,
            "database": settings.database_url.split("://", 1)[0],
            "llm": llm_status(),
        }

    return app


app = create_app()
