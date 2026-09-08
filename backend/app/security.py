import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session as DbSession

from .db import get_db
from .models import Session, User
from .settings import settings

COOKIE = "cx1_session"
PBKDF2_ROUNDS = 260_000


def digits_only(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def tokenize_tax_id(raw: str) -> tuple[str, str]:
    digits = digits_only(raw)
    token = hashlib.sha256(f"cx1.tax:{digits}".encode()).hexdigest()
    return token, digits[-4:] if digits else ""


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), PBKDF2_ROUNDS)
    return f"pbkdf2_sha256${PBKDF2_ROUNDS}${salt}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, rounds, salt, digest = stored.split("$", 3)
        if algo != "pbkdf2_sha256":
            return False
        dk = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt.encode("utf-8"), int(rounds)
        )
        return hmac.compare_digest(dk.hex(), digest)
    except Exception:
        return False


def new_session_token() -> str:
    return secrets.token_hex(32)


def session_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=settings.session_days)


def _aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def read_token(request: Request) -> Optional[str]:
    auth = request.headers.get("authorization") or ""
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip() or None
    return request.cookies.get(COOKIE)


def current_user_optional(request: Request, db: DbSession = Depends(get_db)) -> Optional[User]:
    token = read_token(request)
    if not token:
        return None
    row = db.get(Session, token)
    if not row:
        return None
    if _aware(row.expires_at) < datetime.now(timezone.utc):
        db.delete(row)
        db.commit()
        return None
    return db.get(User, row.user_id)


def require_user(user: Optional[User] = Depends(current_user_optional)) -> User:
    if not user:
        raise HTTPException(status_code=401, detail="Sign in required.")
    return user
