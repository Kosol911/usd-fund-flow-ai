# Installation Guide

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose
- At least 4GB RAM available
- Ports 3000, 8000, 5432, 6379 available

## Quick Start

### Option 1: Using Setup Script (Recommended)

```bash
# Clone or navigate to project directory
cd usd-fund-flow-ai

# Run setup script
bash scripts/setup.sh
```

This will:
1. Create `.env` file
2. Build Docker containers
3. Start all services
4. Seed database with initial data

### Option 2: Manual Setup

```bash
# 1. Create environment file
cp .env.example .env

# 2. Edit .env and add API keys (optional)
# FRED_API_KEY=your_fred_api_key
# TREASURY_API_KEY=your_treasury_api_key

# 3. Build and start containers
docker compose up -d

# 4. Wait for services to be ready (about 30 seconds)
# Check logs: docker compose logs -f

# 5. Seed database
docker compose exec backend python -m backend.services.data_seeder
```

## Accessing the Application

Once running:
- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Database**: localhost:5432 (postgres)
- **Redis**: localhost:6379

## Configuration

### API Keys (Optional)

The system works with mock data by default. To use real data:

1. **FRED API Key**: 
   - Get free key from https://fred.stlouisfed.org/docs/api/api_key.html
   - Add to `.env`: `FRED_API_KEY=your_key`

2. **Treasury API**:
   - No key required (public API)

### Environment Variables

Edit `.env` file:

```bash
# Force mock mode (even with API keys)
MOCK_MODE=false

# Debug mode
DEBUG=true

# Database
DATABASE_URL=postgresql://usd_user:usd_password@db:5432/usd_fund_flow

# API URLs
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Verifying Installation

### 1. Check Services Status

```bash
docker compose ps
```

All services should show "Up" status.

### 2. Check Backend Health

```bash
curl http://localhost:8000/health
```

Should return: `{"status":"healthy"}`

### 3. Check Frontend

Open http://localhost:3000 in browser. You should see the dashboard.

### 4. Check API Documentation

Open http://localhost:8000/docs for interactive API documentation.

## Common Issues

### Port Already in Use

If ports 3000, 8000, 5432, or 6379 are already in use:

1. Stop conflicting services
2. Or modify ports in `docker-compose.yml`

### Database Connection Error

Wait 30 seconds after `docker compose up` before seeding data. Database needs time to initialize.

### Frontend Can't Connect to Backend

Check that `NEXT_PUBLIC_API_URL` in `.env` is correct and backend is running.

### Mock Data vs Real Data

System uses mock data by default. Check logs:

```bash
docker compose logs backend | grep MOCK
```

If you see "Using MOCK data provider", it's running in demo mode.

## Development Setup

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Running Tests

```bash
# In Docker
docker compose exec backend pytest

# Locally
cd backend
pytest
```

## Stopping the Application

```bash
# Stop services
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v
```

## Updating

```bash
# Pull latest changes
git pull

# Rebuild containers
docker compose down
docker compose build --no-cache
docker compose up -d

# Re-seed if needed
docker compose exec backend python -m backend.services.data_seeder
```

## Data Persistence

- **Database data**: Persisted in Docker volume `postgres_data`
- **Redis cache**: Persisted in Docker volume `redis_data`
- **To reset**: `docker compose down -v` (removes volumes)

## Next Steps

After installation:
1. Explore the dashboard at http://localhost:3000
2. Check API documentation at http://localhost:8000/docs
3. View annual timeline
4. Review liquidity analysis
5. Customize configuration files in `config/`

## Support

For issues:
1. Check logs: `docker compose logs -f`
2. Review this guide
3. Check README.md
4. Open an issue on GitHub
