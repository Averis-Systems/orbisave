# OrbiSave Infrastructure: Docker Orchestration

This directory contains the containerization logic for the OrbiSave platform.

## 🏗️ Services
The `docker-compose.yml` orchestrates the following services:

- **`db`**: PostgreSQL 16 with multi-database initialization.
- **`redis`**: Cache and Celery message broker.
- **`backend`**: Django API (Daphne/ASGI).
- **`celery`**: Background task worker.
- **`celery-beat`**: Periodic task scheduler.
- **`flower`**: Celery monitoring dashboard ([http://localhost:5555](http://localhost:5555)).
- **`web`**: Next.js frontend ([http://localhost:3001](http://localhost:3001)).

## 🚀 Usage

### Start everything
```bash
docker-compose up -d
```

### Build images
```bash
docker-compose build
```

### View logs
```bash
docker-compose logs -f web
```

## 🛠️ Configuration
- **Network**: All containers run on an internal bridge network.
- **Persistence**: Database data is stored in the `postgres_data` volume.
- **Port Mapping**:
  - Host 8000 -> Backend 8000
  - Host 3001 -> Frontend 3000 (Prevents conflict with local `npm run dev`)
  - Host 5432 -> Postgres 5432
  - Host 5555 -> Flower 5555
