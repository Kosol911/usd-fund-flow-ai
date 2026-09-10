# USD FUND FLOW AI - Windows Setup Script
# Run: powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " USD FUND FLOW AI - Setup Script (Windows)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Docker is not installed." -ForegroundColor Red
    Write-Host "  Download: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

try {
    docker info 2>$null | Out-Null
    if (-not $?) { throw }
} catch {
    Write-Host "ERROR: Docker Desktop is not running. Please start it first." -ForegroundColor Red
    exit 1
}

Write-Host "OK  Docker is running" -ForegroundColor Green

# Check Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Git is not installed." -ForegroundColor Red
    Write-Host "  Download: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}
Write-Host "OK  Git is available" -ForegroundColor Green
Write-Host ""

# .env file
if (-not (Test-Path ".\.env")) {
    Write-Host "Creating .env from .env.example ..." -ForegroundColor Yellow
    Copy-Item ".\.env.example" ".\.env"
    Write-Host "OK  .env created" -ForegroundColor Green
    Write-Host ""
    Write-Host "OPTIONAL: Edit .env to add your API keys:" -ForegroundColor Cyan
    Write-Host "  FRED_API_KEY        - https://fred.stlouisfed.org/docs/api/api_key.html (free)" -ForegroundColor Gray
    Write-Host "  ANTHROPIC_API_KEY   - AI analysis (optional)" -ForegroundColor Gray
    Write-Host "  OPENAI_API_KEY      - AI analysis (optional)" -ForegroundColor Gray
    Write-Host ""
    $edit = Read-Host "Edit .env now? (y/N)"
    if ($edit -eq "y" -or $edit -eq "Y") {
        notepad ".\.env"
        Read-Host "Press Enter when done editing .env"
    }
} else {
    Write-Host "OK  .env already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "Building Docker containers (first time may take 5-10 min)..." -ForegroundColor Yellow
docker compose build
if (-not $?) {
    Write-Host "ERROR: Docker build failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Yellow
docker compose up -d
if (-not $?) {
    Write-Host "ERROR: Failed to start services." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Waiting 15s for database to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "Seeding database with initial data..." -ForegroundColor Yellow
docker compose exec -T backend python -m backend.services.data_seeder
if (-not $?) {
    Write-Host "WARNING: Seed may have failed - check logs with: docker compose logs backend" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host " Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend  : http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend   : http://localhost:8000" -ForegroundColor Cyan
Write-Host "  API Docs  : http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  docker compose logs -f      # View live logs"
Write-Host "  docker compose down         # Stop"
Write-Host "  docker compose up -d        # Start again"
Write-Host ""
Write-Host "Happy researching!" -ForegroundColor Green
