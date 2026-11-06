from datetime import date, datetime, time, timezone

from sqlalchemy import CheckConstraint, Date, DateTime, Float, ForeignKey, Integer, LargeBinary, String, Text, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    rating: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    trips: Mapped[list['Trip']] = relationship(back_populates='driver')
    bookings: Mapped[list['Booking']] = relationship(back_populates='passenger')
    avatar: Mapped['UserAvatar | None'] = relationship(back_populates='user', uselist=False, cascade='all, delete-orphan')

    @property
    def avatar_url(self):
        return f'/api/users/{self.id}/avatar' if self.avatar is not None else None


class UserAvatar(Base):
    __tablename__ = 'user_avatars'

    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    jpeg_data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    user: Mapped[User] = relationship(back_populates='avatar')


class Session(Base):
    __tablename__ = 'sessions'

    id: Mapped[int] = mapped_column(primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class Trip(Base):
    __tablename__ = 'trips'
    __table_args__ = (
        CheckConstraint('price >= 0 AND price <= 1000000', name='ck_trip_price'),
        CheckConstraint('seats_total BETWEEN 1 AND 8', name='ck_trip_seats'),
        CheckConstraint('seats_available >= 0 AND seats_available <= seats_total', name='ck_trip_available'),
        CheckConstraint('from_city <> to_city', name='ck_trip_distinct_cities'),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    from_city: Mapped[str] = mapped_column(String(60), nullable=False)
    to_city: Mapped[str] = mapped_column(String(60), nullable=False)
    departure_date: Mapped[date] = mapped_column(Date, nullable=False)
    departure_time: Mapped[time] = mapped_column(Time, nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)
    seats_total: Mapped[int] = mapped_column(Integer, nullable=False)
    seats_available: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(Text, default='', nullable=False)
    driver_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='RESTRICT'), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    driver: Mapped[User] = relationship(back_populates='trips')
    bookings: Mapped[list['Booking']] = relationship(back_populates='trip', cascade='all, delete-orphan')


class Booking(Base):
    __tablename__ = 'bookings'
    __table_args__ = (
        UniqueConstraint('trip_id', 'passenger_id', name='uq_booking_trip_passenger'),
        CheckConstraint('seats BETWEEN 1 AND 8', name='ck_booking_seats'),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey('trips.id', ondelete='CASCADE'), nullable=False, index=True)
    passenger_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    seats: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    trip: Mapped[Trip] = relationship(back_populates='bookings')
    passenger: Mapped[User] = relationship(back_populates='bookings')
