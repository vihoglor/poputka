import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Session as AuthSession, User

COOKIE_NAME = 'poputka_session'


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    derived = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 310000)
    return f'pbkdf2_sha256$310000${salt.hex()}${derived.hex()}'


def verify_password(password: str, stored: str) -> bool:
    try:
        _, rounds, salt, digest = stored.split('$')
        actual = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), int(rounds))
        return hmac.compare_digest(actual, bytes.fromhex(digest))
    except (ValueError, TypeError):
        return False


def create_session(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(36)
    db.add(AuthSession(token_hash=hashlib.sha256(token.encode()).hexdigest(), user_id=user.id, expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=7)))
    db.commit()
    return token


def set_auth_cookie(response, token: str):
    response.set_cookie(COOKIE_NAME, token, max_age=604800, httponly=True, secure=os.getenv('COOKIE_SECURE', 'false').lower() == 'true' or os.getenv('COOKIE_SAMESITE', 'lax').lower() == 'none', samesite=os.getenv('COOKIE_SAMESITE', 'lax').lower(), path='/')


def find_session(db: Session, request: Request):
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    session = db.query(AuthSession).filter_by(token_hash=hashlib.sha256(token.encode()).hexdigest()).first()
    if not session or session.expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
        return None
    return session


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    session = find_session(db, request)
    if not session:
        raise HTTPException(status_code=401, detail='Необходимо войти в аккаунт')
    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(status_code=401, detail='Сессия недействительна')
    return user
