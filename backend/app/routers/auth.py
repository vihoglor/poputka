from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Session as AuthSession, User
from app.schemas import UserLogin, UserOut, UserRegister
from app.security import COOKIE_NAME, create_session, current_user, find_session, hash_password, set_auth_cookie, verify_password

router = APIRouter(prefix='/api/auth', tags=['Авторизация'])


@router.post('/register', response_model=UserOut, status_code=201, responses={409: {'description': 'Email уже занят'}})
def register(data: UserRegister, response: Response, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.query(User).filter_by(email=email).first():
        raise HTTPException(status_code=409, detail='Такой email уже зарегистрирован')
    user = User(name=data.name.strip(), email=email, password_hash=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    set_auth_cookie(response, create_session(db, user))
    return user


@router.post('/login', response_model=UserOut, responses={401: {'description': 'Неверные учётные данные'}})
def login(data: UserLogin, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=data.email.lower()).first()
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail='Неправильный email или пароль')
    set_auth_cookie(response, create_session(db, user))
    return user


@router.get('/me', response_model=UserOut, responses={401: {'description': 'Требуется вход'}})
def me(user: User = Depends(current_user)):
    return user


@router.post('/logout', status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    session = find_session(db, request)
    if session:
        db.delete(session)
        db.commit()
    response.delete_cookie(COOKIE_NAME, path='/')
