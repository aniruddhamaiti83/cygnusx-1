from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Session as AuthSession
from ..models import User, new_id
from ..settings import settings
from ..security import (
    COOKIE,
    current_user_optional,
    hash_password,
    new_session_token,
    session_expiry,
    verify_password,
)

router = APIRouter(prefix="/api/cx1/auth", tags=["auth"])


class AuthBody(BaseModel):
    email: str
    password: str = Field(min_length=8)
    name: str = ""


def _set_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        COOKIE,
        token,
        httponly=True,
        samesite="lax",
        secure=settings.app_env.strip().lower() in {"production", "prod"},
        max_age=settings.session_days * 24 * 3600,
        path="/",
    )


def _issue(db: Session, user: User, response: Response) -> dict:
    token = new_session_token()
    db.add(AuthSession(token=token, user_id=user.id, expires_at=session_expiry()))
    db.commit()
    _set_cookie(response, token)
    return {
        "user": {"id": user.id, "email": user.email, "name": user.name, "emailVerified": user.email_verified},
    }


@router.post("/signup")
def signup(body: AuthBody, response: Response, db: Session = Depends(get_db)):
    email = body.email.lower().strip()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Enter a valid email.")
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        if not verify_password(body.password, existing.password_hash):
            raise HTTPException(status_code=409, detail="An account with this email already exists.")
        return _issue(db, existing, response)
    user = User(
        id=new_id(),
        email=email,
        name=(body.name or "").strip(),
        password_hash=hash_password(body.password),
        email_verified=False,
    )
    db.add(user)
    db.flush()
    return _issue(db, user, response)


@router.post("/login")
def login(body: AuthBody, response: Response, db: Session = Depends(get_db)):
    email = body.email.lower().strip()
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    return _issue(db, user, response)


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    from ..security import read_token

    token = read_token(request)
    if token:
        row = db.get(AuthSession, token)
        if row:
            db.delete(row)
            db.commit()
    response.delete_cookie(
        COOKIE,
        path="/",
        secure=settings.app_env.strip().lower() in {"production", "prod"},
        httponly=True,
        samesite="lax",
    )
    return {"ok": True}


@router.get("/me")
def me(user: User | None = Depends(current_user_optional)):
    if not user:
        return {"user": None}
    return {"user": {"id": user.id, "email": user.email, "name": user.name, "emailVerified": user.email_verified}}
