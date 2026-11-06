from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class UserRegister(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator('name')
    @classmethod
    def clean_name(cls, value):
        value = value.strip()
        if len(value) < 2:
            raise ValueError('Введите имя длиной от двух символов')
        return value


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: EmailStr
    avatar_url: str | None = None


class TripCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={'examples': [{'from_city': 'Москва', 'to_city': 'Казань', 'departure_date': '2027-06-15', 'departure_time': '09:30', 'price': 1250, 'seats_total': 3, 'description': 'Еду без большого багажа'}]})
    from_city: str = Field(min_length=2, max_length=60)
    to_city: str = Field(min_length=2, max_length=60)
    departure_date: date
    departure_time: time
    price: int = Field(ge=0, le=1000000)
    seats_total: int = Field(ge=1, le=8)
    description: str = Field(default='', max_length=1000)

    @field_validator('from_city', 'to_city')
    @classmethod
    def clean_city(cls, value):
        value = value.strip()
        if len(value) < 2:
            raise ValueError('Введите название города')
        return value

    @model_validator(mode='after')
    def valid_route(self):
        if self.from_city.casefold() == self.to_city.casefold():
            raise ValueError('Города отправления и прибытия должны различаться')
        if datetime.combine(self.departure_date, self.departure_time) <= datetime.now():
            raise ValueError('Дата и время поездки должны быть в будущем')
        return self


class TripUpdate(BaseModel):
    from_city: str | None = Field(default=None, min_length=2, max_length=60)
    to_city: str | None = Field(default=None, min_length=2, max_length=60)
    departure_date: date | None = None
    departure_time: time | None = None
    price: int | None = Field(default=None, ge=0, le=1000000)
    seats_total: int | None = Field(default=None, ge=1, le=8)
    description: str | None = Field(default=None, max_length=1000)


class PassengerOut(BaseModel):
    id: int
    name: str
    seats: int


class TripOut(BaseModel):
    model_config = ConfigDict(json_schema_extra={'examples': [{'id': 1, 'from_city': 'Москва', 'to_city': 'Тула', 'departure_date': '2027-06-15', 'departure_time': '09:30:00', 'price': 650, 'seats_total': 3, 'seats_available': 3, 'description': 'Есть место для багажа', 'driver_id': 1, 'driver_name': 'Александр', 'driver_rating': 4.9, 'created_at': '2026-11-06T12:00:00', 'passengers': []}]})
    id: int
    from_city: str
    to_city: str
    departure_date: date
    departure_time: time
    price: int
    seats_total: int
    seats_available: int
    description: str
    driver_id: int
    driver_name: str
    driver_rating: float
    driver_avatar_url: str | None = None
    created_at: datetime
    passengers: list[PassengerOut]


class BookingCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={'examples': [{'trip_id': 1, 'seats': 1}]})
    trip_id: int = Field(gt=0)
    seats: int = Field(default=1, ge=1, le=8)


class BookingOut(BaseModel):
    id: int
    seats: int
    created_at: datetime
    trip: TripOut
