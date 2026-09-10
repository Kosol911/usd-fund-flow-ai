# USD FUND FLOW AI - Install from USB
# รันบนเครื่องปลายทาง (ไม่ต้องมี internet / git)
# Usage: powershell -ExecutionPolicy Bypass -File .\install.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " USD FUND FLOW AI - Install from USB" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# --- ตรวจสอบ Docker ---
Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Yellow

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "  ERROR: Docker Desktop is not installed!" -ForegroundColor Red
    Write-Host "  Download: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    Write-Host "  (ต้องการ internet แค่ครั้งเดียวเพื่อติดตั้ง Docker)" -ForegroundColor Gray
    exit 1
}

# รอ Docker daemon
$retry = 0
do {
    $dockerOk = (docker info 2>$null) -ne $null
    if (-not $dockerOk) {
        if ($retry -eq 0) { Write-Host "  Waiting for Docker Desktop to start..." -ForegroundColor Yellow }
        Start-Sleep -Seconds 3
        $retry++
    }
} while (-not $dockerOk -and $retry -lt 20)

if (-not $dockerOk) {
    Write-Host "  ERROR: Docker Desktop is not running. Please start it and try again." -ForegroundColor Red
    exit 1
}
Write-Host "  OK  Docker is running" -ForegroundColor Green

# --- ติดตั้งโปรเจกต์ ---
Write-Host ""
Write-Host "[2/5] Installing project files..." -ForegroundColor Yellow

$InstallDir = "C:\usd-fund-flow-ai"
if (Test-Path $InstallDir) {
    Write-Host "  Folder $InstallDir already exists - updating files..." -ForegroundColor Gray
} else {
    New-Item -ItemType Directory -Path $InstallDir | Out-Null
}

Copy-Item "$ScriptDir\project\*" $InstallDir -Recurse -Force
Write-Host "  OK  Files copied to $InstallDir" -ForegroundColor Green

# --- Load Docker images ---
Write-Host ""
Write-Host "[3/5] Loading Docker images (offline)..." -ForegroundColor Yellow

$images = @("postgres.tar", "redis.tar", "backend.tar", "frontend.tar")
foreach ($img in $images) {
    $imgPath = "$ScriptDir\images\$img"
    if (Test-Path $imgPath) {
        $size = [math]::Round((Get-Item $imgPath).Length / 1MB, 0)
        Write-Host "  Loading $img ($size MB)..." -ForegroundColor Gray
        docker load -i $imgPath
        if ($?) {
            Write-Host "  OK  $img loaded" -ForegroundColor Green
        } else {
            Write-Host "  WARNING: Failed to load $img" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  SKIP: $img not found" -ForegroundColor Gray
    }
}

# --- สร้าง .env ---
Write-Host ""
Write-Host "[4/5] Setting up configuration..." -ForegroundColor Yellow

Set-Location $InstallDir

if (-not (Test-Path ".\.env")) {
    Copy-Item ".\.env.example" ".\.env"
    Write-Host "  OK  .env created from .env.example" -ForegroundColor Green
    Write-Host ""
    Write-Host "  OPTIONAL API Keys (สามารถใส่ทีหลังได้):" -ForegroundColor Cyan
    Write-Host "    FRED_API_KEY      - ข้อมูลเศรษฐกิจฟรี: https://fred.stlouisfed.org/docs/api/api_key.html" -ForegroundColor Gray
    Write-Host "    ANTHROPIC_API_KEY - AI วิเคราะห์ (optional)" -ForegroundColor Gray
    Write-Host ""
    $edit = Read-Host "  แก้ไข .env ตอนนี้เลย? (y/N)"
    if ($edit -eq "y" -or $edit -eq "Y") {
        notepad ".\.env"
        Read-Host "  กด Enter เมื่อแก้ไขเสร็จแล้ว"
    }
} else {
    Write-Host "  OK  .env already exists" -ForegroundColor Green
}

# --- Start services ---
Write-Host ""
Write-Host "[5/5] Starting services..." -ForegroundColor Yellow

docker compose up -d
if (-not $?) {
    Write-Host "  ERROR: Failed to start services. Check Docker logs." -ForegroundColor Red
    Write-Host "  Run: docker compose logs" -ForegroundColor Yellow
    exit 1
}

Write-Host "  Waiting 20s for database to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 20

Write-Host "  Seeding database with initial data..." -ForegroundColor Gray
docker compose exec -T backend python -m backend.services.data_seeder
if (-not $?) {
    Write-Host "  WARNING: Seed had issues - system may still work. Check: docker compose logs backend" -ForegroundColor Yellow
}

# --- Done ---
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host " Installation Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend  : http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend   : http://localhost:8000" -ForegroundColor Cyan
Write-Host "  API Docs  : http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Project installed at: $InstallDir" -ForegroundColor Gray
Write-Host ""
Write-Host "Commands:" -ForegroundColor Yellow
Write-Host "  cd C:\usd-fund-flow-ai"
Write-Host "  docker compose logs -f      # ดู logs"
Write-Host "  docker compose down         # หยุด"
Write-Host "  docker compose up -d        # เริ่มใหม่"
Write-Host ""

# เปิด browser อัตโนมัติ
$openBrowser = Read-Host "เปิด browser ไปที่ http://localhost:3000 เลยไหม? (Y/n)"
if ($openBrowser -ne "n" -and $openBrowser -ne "N") {
    Start-Process "http://localhost:3000"
}

Write-Host ""
Write-Host "Happy researching!" -ForegroundColor Green
