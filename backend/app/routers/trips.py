from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.database import get_db
from app.models import Booking, Trip, User
from app.schemas import PassengerOut, TripCreate, TripOut, TripUpdate
from app.security import current_user

router = APIRouter(prefix='/api/trips', tags=['Поездки'])


def load_trip(db: Session, trip_id: int):
    return db.scalar(select(Trip).options(joinedload(Trip.driver), selectinload(Trip.bookings).joinedload(Booking.passenger)).where(Trip.id == trip_id))


def serialize_trip(trip: Trip) -> TripOut:
    return TripOut(id=trip.id, from_city=trip.from_city, to_city=trip.to_city, departure_date=trip.departure_date, departure_time=trip.departure_time, price=trip.price, seats_total=trip.seats_total, seats_available=trip.seats_available, description=trip.description, driver_id=trip.driver_id, driver_name=trip.driver.name, driver_rating=trip.driver.rating, driver_avatar_url=trip.driver.avatar_url, created_at=trip.created_at, passengers=[PassengerOut(id=booking.passenger_id, name=booking.passenger.name, seats=booking.seats) for booking in trip.bookings])


def require_owner(trip: Trip, user: User):
    if trip.driver_id != user.id:
        raise HTTPException(status_code=403, detail='Изменять поездку может только её водитель')


@router.get('', response_model=list[TripOut])
def list_trips(db: Session = Depends(get_db)):
    trips = db.scalars(select(Trip).options(joinedload(Trip.driver), selectinload(Trip.bookings).joinedload(Booking.passenger)).order_by(Trip.departure_date, Trip.departure_time)).all()
    return [serialize_trip(trip) for trip in trips]


@router.post('', response_model=TripOut, status_code=201, responses={401: {'description': 'Требуется вход'}})
def create_trip(data: TripCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    trip = Trip(**data.model_dump(), seats_available=data.seats_total, driver_id=user.id)
    db.add(trip)
    db.commit()
    return serialize_trip(load_trip(db, trip.id))


@router.get('/{trip_id}', response_model=TripOut, responses={404: {'description': 'Поездка не найдена'}})
def get_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = load_trip(db, trip_id)
    if trip is None:
        raise HTTPException(status_code=404, detail='Поездка не найдена')
    return serialize_trip(trip)


@router.patch('/{trip_id}', response_model=TripOut, responses={403: {'description': 'Нет прав'}, 409: {'description': 'Мест меньше количества броней'}})
def patch_trip(trip_id: int, data: TripUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    trip = load_trip(db, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail='Поездка не найдена')
    require_owner(trip, user)
    updates = data.model_dump(exclude_unset=True)
    if any(value is None for value in updates.values()):
        raise HTTPException(status_code=400, detail='Нельзя передавать пустое значение')
    final = {key: updates.get(key, getattr(trip, key)) for key in ('from_city', 'to_city', 'departure_date', 'departure_time', 'price', 'seats_total', 'description')}
    validated = TripCreate.model_validate(final)
    reserved = trip.seats_total - trip.seats_available
    if validated.seats_total < reserved:
        raise HTTPException(status_code=409, detail='Нельзя уменьшить число мест ниже количества забронированных')
    for key, value in validated.model_dump().items():
        setattr(trip, key, value)
    trip.seats_available = validated.seats_total - reserved
    db.commit()
    return serialize_trip(load_trip(db, trip_id))


@router.delete('/{trip_id}', status_code=204, responses={403: {'description': 'Нет прав'}, 409: {'description': 'Есть бронирования'}})
def delete_trip(trip_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    trip = load_trip(db, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail='Поездка не найдена')
    require_owner(trip, user)
    if trip.bookings:
        raise HTTPException(status_code=409, detail='Сначала пассажиры должны отменить бронирования')
    db.delete(trip)
    db.commit()
