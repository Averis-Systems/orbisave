FROM python:3.12-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (cache layer)
COPY requirements/ requirements/
RUN pip install --no-cache-dir -r requirements/development.txt

# Copy source
COPY . .

# Create media/static directories
RUN mkdir -p /app/media /app/staticfiles

EXPOSE 8000
