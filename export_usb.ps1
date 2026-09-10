# USD FUND FLOW AI - Export to USB
# รันบนเครื่องนี้ก่อน copy ลง USB
# Usage: powershell -ExecutionPolicy Bypass -File .\export_usb.ps1

param(
    [string]$OutputPath = "C:\USD-FUNDFLOW-USB"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " USD FUND FLOW AI - Export to USB" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ExportDir = $OutputPath

# สร้างโฟลเดอร์ปลายทาง
if (Test-Path $ExportDir) { Remove-Item $ExportDir -Recurse -Force }
New-Item -ItemType Directory -Path $ExportDir | Out-Null
New-Item -ItemType Directory -Path "$ExportDir\images" | Out-Null

Write-Host "Export destination: $ExportDir" -ForegroundColor Yellow
Write-Host ""

# --- 1. Copy source code (ยกเว้น node_modules, __pycache__, .git) ---
Write-Host "[1/3] Copying project files..." -ForegroundColor Yellow

$Exclude = @('.git', '__pycache__', 'node_modules', '.next', 'postgres_data', 'redis_data', '*.pyc', '*.log')

Get-ChildItem $ProjectDir | Where-Object {
    $_.Name -notin @('.git', '__pycache__', 'node_modules', '.next')
} | ForEach-Object {
    $dest = Join-Path "$ExportDir\project" $_.Name
    if ($_.PSIsContainer) {
        Copy-Item $_.FullName $dest -Recurse -Force -Exclude @('__pycache__', 'node_modules', '.next', '*.pyc')
    } else {
        Copy-Item $_.FullName $dest -Force
    }
}

# ลบ __pycache__ ที่อาจหลุดมา
Get-ChildItem "$ExportDir\project" -Filter "__pycache__" -Recurse | Remove-Item -Recurse -Force

Write-Host "  OK  Project files copied" -ForegroundColor Green

# --- 2. Build + Save Docker images ---
Write-Host ""
Write-Host "[2/3] Building and saving Docker images..." -ForegroundColor Yellow
Write-Host "  (First build may take 5-10 min)" -ForegroundColor Gray

Set-Location $ProjectDir

# Build images
docker compose build
if (-not $?) {
    Write-Host "  ERROR: docker compose build failed" -ForegroundColor Red
    exit 1
}

# Save แต่ละ image
$images = @(
    @{ name = "usd-fund-flow-ai-backend"; file = "backend.tar" },
    @{ name = "usd-fund-flow-ai-frontend"; file = "frontend.tar" },
    @{ name = "postgres:16-alpine"; file = "postgres.tar" },
    @{ name = "redis:7-alpine"; file = "redis.tar" }
)

foreach ($img in $images) {
    Write-Host "  Saving $($img.name) ..." -ForegroundColor Gray
    docker save -o "$ExportDir\images\$($img.file)" $img.name
    if ($?) {
        $size = [math]::Round((Get-Item "$ExportDir\images\$($img.file)").Length / 1MB, 0)
        Write-Host "  OK  $($img.file) ($size MB)" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: Could not save $($img.name) - may not exist yet" -ForegroundColor Yellow
    }
}

# --- 3. Copy install script ---
Write-Host ""
Write-Host "[3/3] Preparing install script..." -ForegroundColor Yellow
Copy-Item "$ProjectDir\install.ps1" "$ExportDir\install.ps1" -Force
Write-Host "  OK  install.ps1 copied" -ForegroundColor Green

# --- Summary ---
$totalSize = [math]::Round((Get-ChildItem $ExportDir -Recurse | Measure-Object Length -Sum).Sum / 1GB, 2)

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host " Export Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Folder : $ExportDir" -ForegroundColor Cyan
Write-Host "  Size   : $totalSize GB" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "  1. Copy folder '$ExportDir' ทั้งหมดลง USB"
Write-Host "  2. บนเครื่องปลายทาง เปิด PowerShell แล้วรัน:"
Write-Host ""
Write-Host "     powershell -ExecutionPolicy Bypass -File X:\install.ps1" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host ""
Write-Host "  (แทน X: ด้วยตัวอักษร drive ของ USB)"
