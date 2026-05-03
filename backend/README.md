# OrbiSave Backend

The OrbiSave backend is a robust Django-based financial engine designed to handle secure community savings, loans, and payouts across multiple African regions.

## 🛠️ Technology Stack
- **Framework**: Django 5.0 + Django REST Framework (DRF)
- **Runtime**: Python 3.12
- **Database**: PostgreSQL 16
- **Cache/Broker**: Redis 7
- **Task Queue**: Celery 5 (for background processing, interest calculation, and notifications)
- **Authentication**: Asymmetric RS256 JWT (coupled with Transaction PINs for high-risk operations)
- **API Docs**: DRF Spectacular (OpenAPI 3.0)

## 🏗️ Core Architecture

### Multi-Database Routing
To ensure regional data isolation and compliance, we use a custom database router:
- `default`: Stores platform-wide data (Accounts, Audit Logs, Notifications).
- `kenya`: Isolated financial data for Kenyan groups.
- `rwanda`: Isolated financial data for Rwandan groups.
- `ghana`: Isolated financial data for Ghanaian groups.

### Financial Engine
- **Immutable Ledger**: Append-only ledger system with SHA-256 hash chaining to prevent tampering.
- **Idempotent Webhooks**: Secure handling of payment provider callbacks (M-Pesa, MTN MoMo).
- **Advisory Locks**: `pg_advisory_xact_lock` used on critical financial operations to prevent race conditions.
- **RBAC**: Strict Role-Based Access Control (Chairperson, Treasurer, Member).

## 📂 Project Structure
- `apps/`: 13 domain-driven Django apps:
  - `accounts`: User profiles, KYC, and Auth.
  - `groups`: Chama/Group management and membership.
  - `ledger`: The core immutable double-entry ledger.
  - `contributions`: Savings initiation and tracking.
  - `loans`: Loan application, approval, and repayment.
  - `payouts`: Automated group payout engine.
  - `audit`: Platform-wide security audit trails.
- `config/`: Central settings and routing logic.
- `common/`: Shared middleware, base models, and permissions.

## 🚀 Getting Started

### Local Setup (Non-Docker)
1. **Virtual Environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements/development.txt
   ```
2. **Environment Variables**:
   Create a `.env` file based on the keys in `infrastructure/docker/docker-compose.yml`.
3. **Database Initialization**:
   ```bash
   python manage.py migrate
   ```

### Running the Server
```bash
python manage.py runserver
```

### Background Tasks
```bash
# Start Worker
celery -A celery_app worker -l info

# Start Beat (Scheduler)
celery -A celery_app beat -l info
```

## 🔍 API Documentation
Once the server is running, visit:
- **Swagger UI**: `/api/v1/schema/swagger-ui/`
- **ReDoc**: `/api/v1/schema/redoc/`
