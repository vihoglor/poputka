FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install backend dependencies first so Docker can cache this layer.
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Backend code and frontend files are kept in their original structure.
COPY backend/app /app/backend/app
COPY index.html search.html auth.html account.html create-trip.html trip.html /app/
COPY css /app/css
COPY js /app/js
COPY img /app/img

RUN mkdir -p /app/backend/data

WORKDIR /app/backend
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
