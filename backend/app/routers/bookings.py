from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Booking, Trip, User
from app.routers.trips import load_trip, serialize_trip
from app.schemas import BookingCreate, BookingOut
from app.security import current_user

router = APIRouter(prefix='/api/bookings', tags=['Бронирования'])


def serialize_booking(db: Session, booking: Booking):
    return BookingOut(id=booking.id, seats=booking.seats, created_at=booking.created_at, trip=serialize_trip(load_trip(db, booking.trip_id)))


@router.get('/mine', response_model=list[BookingOut])
def my_bookings(user: User = Depends(current_user), db: Session = Depends(get_db)):
    bookings = db.query(Booking).filter_by(passenger_id=user.id).order_by(Booking.created_at.desc()).all()
    return [serialize_booking(db, booking) for booking in bookings]


@router.post('', response_model=BookingOut, status_code=201, responses={409: {'description': 'Нет мест, повторная бронь или своя поездка'}})
def book(data: BookingCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    trip = db.get(Trip, data.trip_id)
    if trip is None:
        raise HTTPException(status_code=404, detail='Поездка не найдена')
    if trip.driver_id == user.id:
        raise HTTPException(status_code=409, detail='Нельзя бронировать собственную поездку')
    if datetime.combine(trip.departure_date, trip.departure_time) <= datetime.now():
        raise HTTPException(status_code=409, detail='Поездка уже началась')
    if db.query(Booking).filter_by(trip_id=data.trip_id, passenger_id=user.id).first():
        raise HTTPException(status_code=409, detail='Вы уже забронировали эту поездку')
    result = db.execute(update(Trip).where(Trip.id == data.trip_id, Trip.seats_available >= data.seats).values(seats_available=Trip.seats_available - data.seats))
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(status_code=409, detail='Недостаточно свободных мест')
    booking = Booking(trip_id=data.trip_id, passenger_id=user.id, seats=data.seats)
    db.add(booking)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Вы уже забронировали эту поездку')
    db.refresh(booking)
    return serialize_booking(db, booking)


@router.delete('/{booking_id}', status_code=204)
def cancel_booking(booking_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail='Бронирование не найдено')
    if booking.passenger_id != user.id:
        raise HTTPException(status_code=403, detail='Вы не можете отменить чужое бронирование')
    db.execute(update(Trip).where(Trip.id == booking.trip_id).values(seats_available=Trip.seats_available + booking.seats))
    db.delete(booking)
    db.commit()
