import os
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

from fastapi.testclient import TestClient

os.environ['DATABASE_URL'] = f'sqlite:///{Path(tempfile.mkdtemp()) / "test.db"}'

from app.main import app


def register(client, email, name):
    response = client.post('/api/auth/register', json={'email': email, 'name': name, 'password': 'Secret12345!'})
    assert response.status_code == 201, response.text
    return response.json()


def sample_trip():
    date = datetime.now() + timedelta(days=5)
    return {'from_city': 'Самара', 'to_city': 'Казань', 'departure_date': date.date().isoformat(), 'departure_time': '15:30', 'price': 500, 'seats_total': 2, 'description': 'Выезжаю после обеда'}


def test_auth_trips_and_bookings():
    with TestClient(app) as owner, TestClient(app) as traveler, TestClient(app) as stranger:
        assert owner.get('/api/trips').status_code == 200
        assert traveler.get('/api/trips').json()
        assert owner.post('/api/trips', json=sample_trip()).status_code == 401
        register(owner, 'owner@example.com', 'Водитель')
        assert owner.get('/api/auth/me').status_code == 200
        assert owner.post('/api/auth/register', json={'email': 'owner@example.com', 'name': 'Новый', 'password': 'Secret12345!'}).status_code == 409
        trip = owner.post('/api/trips', json=sample_trip())
        assert trip.status_code == 201, trip.text
        trip_id = trip.json()['id']
        assert owner.get(f'/api/trips/{trip_id}').json()['seats_available'] == 2
        assert traveler.get(f'/api/trips/{trip_id}').status_code == 200
        assert owner.post('/api/bookings', json={'trip_id': trip_id, 'seats': 1}).status_code == 409
        register(traveler, 'passenger@example.com', 'Пассажир')
        booked = traveler.post('/api/bookings', json={'trip_id': trip_id, 'seats': 1})
        assert booked.status_code == 201, booked.text
        booking_id = booked.json()['id']
        assert owner.get(f'/api/trips/{trip_id}').json()['seats_available'] == 1
        assert traveler.post('/api/bookings', json={'trip_id': trip_id, 'seats': 1}).status_code == 409
        assert owner.delete(f'/api/trips/{trip_id}').status_code == 409
        assert traveler.patch(f'/api/trips/{trip_id}', json={'price': 555}).status_code == 403
        assert owner.patch(f'/api/trips/{trip_id}', json={'seats_total': 1}).status_code == 200
        assert owner.patch(f'/api/trips/{trip_id}', json={'seats_total': 0}).status_code == 422
        assert owner.patch(f'/api/trips/{trip_id}', json={'price': 550}).json()['price'] == 550
        assert traveler.get('/api/bookings/mine').json()[0]['trip']['id'] == trip_id
        register(stranger, 'stranger@example.com', 'Другой')
        assert stranger.delete(f'/api/bookings/{booking_id}').status_code == 403
        assert stranger.post('/api/bookings', json={'trip_id': trip_id, 'seats': 1}).status_code == 409
        assert traveler.delete(f'/api/bookings/{booking_id}').status_code == 204
        assert owner.get(f'/api/trips/{trip_id}').json()['seats_available'] == 1
        assert owner.delete(f'/api/trips/{trip_id}').status_code == 204
        assert owner.get(f'/api/trips/{trip_id}').status_code == 404
        assert owner.get('/openapi.json').status_code == 200
        assert owner.get('/docs').status_code == 200
        for name in ('index.html', 'search.html', 'auth.html', 'account.html', 'create-trip.html', 'trip.html'):
            page = owner.get('/' + name)
            assert page.status_code == 200
            assert '<html lang="ru">' in page.text
        assert owner.get('/js/app.js').status_code == 200
        assert owner.get('/css/pages.css').status_code == 200
        assert owner.post('/api/auth/logout').status_code == 204
        assert owner.get('/api/auth/me').status_code == 401
        assert owner.post('/api/auth/login', json={'email': 'owner@example.com', 'password': 'wrongpassword'}).status_code == 401
        assert owner.post('/api/auth/login', json={'email': 'owner@example.com', 'password': 'Secret12345!'}).status_code == 200


def test_invalid_trip():
    with TestClient(app) as client:
        register(client, 'validation@example.com', 'Проверка')
        trip = sample_trip()
        trip['to_city'] = trip['from_city']
        assert client.post('/api/trips', json=trip).status_code == 422
        trip = sample_trip()
        trip['price'] = -5
        assert client.post('/api/trips', json=trip).status_code == 422


def test_avatar_upload_and_public_assets():
    from io import BytesIO
    from PIL import Image
    with TestClient(app) as client, TestClient(app) as other:
        assert client.get('/backend/.env.example').status_code == 404
        assert client.get('/backend/app/main.py').status_code == 404
        assert client.get('/README.md').status_code == 404
        assert client.get('/api/users/1000000/avatar').status_code == 404
        register(client, 'photo@example.com', 'Фото')
        registered = client.get('/api/auth/me').json()
        assert registered['avatar_url'] is None
        data = BytesIO()
        Image.new('RGB', (640, 420), (30, 90, 160)).save(data, 'PNG')
        upload = client.post('/api/users/me/avatar', files={'photo': ('portrait.png', data.getvalue(), 'image/png')})
        assert upload.status_code == 200, upload.text
        avatar_url = upload.json()['avatar_url']
        assert avatar_url == f"/api/users/{registered['id']}/avatar"
        saved = other.get(avatar_url)
        assert saved.status_code == 200
        assert saved.headers['content-type'] == 'image/jpeg'
        assert saved.content[:2] == b'\xff\xd8'
        wrong = client.post('/api/users/me/avatar', files={'photo': ('bad.png', b'not-an-image', 'image/png')})
        assert wrong.status_code == 400
        too_large = client.post('/api/users/me/avatar', files={'photo': ('too-big.png', b'x' * (2*1024*1024+1), 'image/png')})
        assert too_large.status_code == 413
        assert other.delete('/api/users/me/avatar').status_code == 401
        assert client.delete('/api/users/me/avatar').status_code == 204
        assert client.get(avatar_url).status_code == 404
        assert client.get('/api/auth/me').json()['avatar_url'] is None
