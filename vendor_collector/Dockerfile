FROM python:3.12-slim

# Prevent Python from writing .pyc files and buffering stdout.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first to leverage Docker layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application source.
COPY . .

# Data and logs are written at runtime; mount volumes to persist them.
VOLUME ["/app/data", "/app/logs"]

ENTRYPOINT ["python", "app.py"]
