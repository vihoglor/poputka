from contextlib import asynccontextmanager
from datetime import datetime, timedelta
import os
from urllib.parse import urlsplit
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.database import Base, SessionLocal, engine
from app.models import Trip, User
from app.routers import auth, bookings, profile, trips
from app.security import hash_password

FRONTEND = Path(__file__).resolve().parents[2]


def seed_data():
    with SessionLocal() as db:
        if db.query(Trip).first():
            return
        drivers = [
            ('Александр', 'alexander@poputka.example.com', 4.9),
            ('Мария', 'maria@poputka.example.com', 5.0),
            ('Дамир', 'damir@poputka.example.com', 4.8),
            ('Елена', 'elena@poputka.example.com', 5.0),
        ]
        accounts = []
        for name, email, rating in drivers:
            user = db.query(User).filter_by(email=email).first()
            if not user:
                user = User(name=name, email=email, rating=rating, password_hash=hash_password('Demo12345!'))
                db.add(user)
                db.flush()
            accounts.append(user)
        routes = [
            ('Москва', 'Тула', 2, '09:30', 650, 3, 0),
            ('Москва', 'Тверь', 3, '12:15', 540, 2, 1),
            ('Казань', 'Уфа', 4, '08:00', 1100, 3, 2),
            ('Санкт-Петербург', 'Москва', 5, '08:00', 1750, 1, 3),
            ('Уфа', 'Златоуст', 6, '08:00', 800, 2, 3),
        ]
        for source, target, days, time, price, seats, index in routes:
            date = (datetime.now() + timedelta(days=days)).date()
            db.add(Trip(from_city=source, to_city=target, departure_date=date, departure_time=datetime.strptime(time, '%H:%M').time(), price=price, seats_total=seats, seats_available=seats, driver_id=accounts[index].id, description='Комфортная поездка. Детали обсудим перед отправлением.'))
        db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)

    yield


app = FastAPI(title='Попутка API', description='REST API поездок, пользователей и бронирований', version='3.0.0', lifespan=lifespan)
allowed_origins = [origin.strip().rstrip('/') for origin in os.getenv('CORS_ORIGINS', '').split(',') if origin.strip()]
if allowed_origins:
    app.add_middleware(CORSMiddleware, allow_origins=allowed_origins, allow_credentials=True, allow_methods=['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allow_headers=['Content-Type'])


@app.middleware('http')
async def protect_requests(request: Request, call_next):
    if request.method in ('POST', 'PATCH', 'PUT', 'DELETE') and request.url.path.startswith('/api/'):
        origin = request.headers.get('origin')
        if origin and origin.rstrip('/') not in allowed_origins and urlsplit(origin).netloc != request.headers.get('host'):
            return JSONResponse(status_code=403, content={'detail': 'Недопустимый источник запроса'})
    return await call_next(request)


app.include_router(auth.router)
app.include_router(trips.router)
app.include_router(bookings.router)
app.include_router(profile.router)
for asset in ('css', 'js', 'img'):
    app.mount('/' + asset, StaticFiles(directory=FRONTEND / asset), name=asset)


@app.get('/', include_in_schema=False)
def homepage():
    return FileResponse(FRONTEND / 'index.html')


@app.get('/{page_name}.html', include_in_schema=False)
def public_page(page_name: str):
    if page_name not in {'index', 'search', 'auth', 'account', 'create-trip', 'trip'}:
        raise HTTPException(status_code=404, detail='Страница не найдена')
    return FileResponse(FRONTEND / (page_name + '.html'))
