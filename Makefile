.PHONY: help install up down logs seed test clean

help:
	@echo "USD Fund Flow AI - Makefile Commands"
	@echo ""
	@echo "  make install    - Install dependencies"
	@echo "  make up         - Start all services"
	@echo "  make down       - Stop all services"
	@echo "  make logs       - View logs"
	@echo "  make seed       - Seed database with initial data"
	@echo "  make test       - Run tests"
	@echo "  make clean      - Clean up containers and volumes"
	@echo ""

install:
	@echo "Installing dependencies..."
	cd backend && pip install -r requirements.txt
	cd frontend && npm install
	@echo "Dependencies installed!"

up:
	@echo "Starting USD Fund Flow AI..."
	docker compose up -d
	@echo "Services started!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend API: http://localhost:8000"
	@echo "API Docs: http://localhost:8000/docs"

down:
	@echo "Stopping services..."
	docker compose down
	@echo "Services stopped!"

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

seed:
	@echo "Seeding database..."
	docker compose exec backend python -m backend.services.data_seeder
	@echo "Database seeded!"

test:
	@echo "Running tests..."
	docker compose exec backend pytest
	@echo "Tests completed!"

clean:
	@echo "Cleaning up..."
	docker compose down -v
	@echo "Cleanup completed!"

rebuild:
	@echo "Rebuilding containers..."
	docker compose down
	docker compose build --no-cache
	docker compose up -d
	@echo "Rebuild completed!"

shell-backend:
	docker compose exec backend /bin/bash

shell-frontend:
	docker compose exec frontend /bin/sh

db-shell:
	docker compose exec db psql -U usd_user -d usd_fund_flow
