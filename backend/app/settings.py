import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SQLITE = f"sqlite:///{(BACKEND_ROOT / 'data' / 'cygnusx1.db').as_posix()}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    database_url: str = DEFAULT_SQLITE
    secret_key: str = "cygnusx-1-dev-secret-change-me"
    llm_base_url: str = ""
    llm_api_key: str = "ollama"
    llm_model: str = "llama3.1"
    llm_timeout: float = 60.0
    xai_api_key: str = ""
    session_days: int = 14


settings = Settings()

if not settings.xai_api_key:
    settings.xai_api_key = os.environ.get("XAI_API_KEY", "")
