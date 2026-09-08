from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import init_db
from .routers import auth, cx1


def create_app() -> FastAPI:
    app = FastAPI(title="CygnusX-1", version="0.2.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth.router)
    app.include_router(cx1.router)

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
