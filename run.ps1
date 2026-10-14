# ====================================================================
# Script Peluncur Otomatis Sistem Absensi SMKN 21 Jakarta
# Menjalankan Backend dan Frontend di latar belakang (Tanpa Jendela Terminal Tambahan)
# ====================================================================

param(
    [ValidateSet("prod", "dev", "production", "development")]
    [string]$Mode = "prod",
    [switch]$Visible,
    [switch]$NoBrowser
)

if (-not $PSScriptRoot -or $PSScriptRoot -eq "") {
    if ($MyInvocation.MyCommand.Path) {
        $PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
    } else {
        $PSScriptRoot = (Get-Location).Path
    }
}

# Tentukan mode peluncuran backend dan frontend
$isProd = $Mode -notin @("dev", "development")
$backendScript = if ($isProd) { "run_production.py" } else { "app.py" }
$frontendCmd = if ($isProd) { "npm run preview" } else { "npm run dev" }
$modeLabel = if ($isProd) { "PRODUKSI (Waitress WSGI + Vite Production Preview Bundle)" } else { "DEVELOPMENT (Flask Debug & Vite Dev Server Auto-Reload)" }

$backendExe = Join-Path $PSScriptRoot "backend\venv\Scripts\python.exe"
$backendDir = Join-Path $PSScriptRoot "backend"
$frontendDir = Join-Path $PSScriptRoot "frontend"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   SISTEM ABSENSI & MONITORING SMKN 21 JAKARTA" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Mode Peluncuran: $modeLabel" -ForegroundColor Green
Write-Host "Status Tampilan: $(if ($Visible) { 'Jendela Terminal Terbuka' } else { 'Latar Belakang (Tanpa Jendela PowerShell Tambahan)' })" -ForegroundColor Gray
Write-Host "Script Backend : backend\$backendScript" -ForegroundColor Gray
Write-Host "Script Frontend: $frontendCmd" -ForegroundColor Gray
Write-Host "----------------------------------------------------------------" -ForegroundColor DarkGray

# 1. Bersihkan proses lama yang menggunakan port 5000 / 5173
$portsToCheck = @(5000, 5173)
foreach ($port in $portsToCheck) {
    $existing = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($existing) {
        $pids = $existing.OwningProcess | Select-Object -Unique
        foreach ($pidToKill in $pids) {
            Write-Host "[CLEANUP] Menghentikan proses lama pada port $port (PID: $pidToKill)..." -ForegroundColor Yellow
            Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
        }
    }
}

# Bersihkan juga orphan python backend jika ada
$oldPythons = Get-CimInstance Win32_Process -Filter "Name LIKE 'python%'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match "sistem_absensi_smkn21\\backend" }
foreach ($oldPy in $oldPythons) {
    Stop-Process -Id $oldPy.ProcessId -Force -ErrorAction SilentlyContinue
}

# 2. Deteksi Alamat IP Lokal untuk akses Smartphone / Tablet
$localIp = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { 
    $_.InterfaceAlias -notmatch 'Loopback|vEthernet' -and $_.IPAddress -notmatch '^169\.254\.' 
} | Select-Object -First 1).IPAddress

if (-not $localIp) {
    $localIp = "127.0.0.1"
}

# Jika mode produksi, pastikan folder frontend/dist tersedia
if ($isProd) {
    $distPath = Join-Path $frontendDir "dist"
    if (-not (Test-Path $distPath)) {
        Write-Host "[BUILD] Membangun bundle frontend produksi pertama kali (npm run build)..." -ForegroundColor Yellow
        $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run build" -WorkingDirectory $frontendDir -Wait -NoNewWindow -PassThru
        if ($proc.ExitCode -ne 0) {
            Write-Host "[WARN] Gagal build bundle frontend, kembali ke mode dev server..." -ForegroundColor Red
            $frontendCmd = "npm run dev"
        }
    }
}

# 3. Jalankan Backend & Frontend
if ($Visible) {
    Write-Host "[1/2] Menjalankan Backend ($backendScript) dengan jendela terlihat..." -ForegroundColor Green
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "`$host.ui.RawUI.WindowTitle = 'Backend SMKN 21 ($backendScript)'; Set-Location '$backendDir'; .\venv\Scripts\python.exe $backendScript"

    Write-Host "[2/2] Menjalankan Frontend ($frontendCmd) dengan jendela terlihat..." -ForegroundColor Green
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "`$host.ui.RawUI.WindowTitle = 'Frontend SMKN 21 ($frontendCmd)'; Set-Location '$frontendDir'; $frontendCmd"
} else {
    # Mode Latar Belakang MURNI (CreateNoWindow = True, Tanpa PowerShell Tambahan)
    Write-Host "[1/2] Menjalankan Backend ($backendScript) di latar belakang..." -ForegroundColor Green
    $backendPsi = New-Object System.Diagnostics.ProcessStartInfo
    $backendPsi.FileName = $backendExe
    $backendPsi.Arguments = "-u $backendScript"
    $backendPsi.WorkingDirectory = $backendDir
    $backendPsi.CreateNoWindow = $true
    $backendPsi.UseShellExecute = $false
    $backendPsi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
    $null = [System.Diagnostics.Process]::Start($backendPsi)

    Write-Host "[2/2] Menjalankan Frontend ($frontendCmd) di latar belakang..." -ForegroundColor Green
    $frontendPsi = New-Object System.Diagnostics.ProcessStartInfo
    $frontendPsi.FileName = "cmd.exe"
    $frontendPsi.Arguments = "/c $frontendCmd"
    $frontendPsi.WorkingDirectory = $frontendDir
    $frontendPsi.CreateNoWindow = $true
    $frontendPsi.UseShellExecute = $false
    $frontendPsi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
    $null = [System.Diagnostics.Process]::Start($frontendPsi)
}

# 4. Tunggu hingga layanan siap (Polling Port dengan Indikator)
Write-Host "----------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "Menunggu inisialisasi server & basis data..." -ForegroundColor Yellow

$maxWaitSeconds = 40
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$backendReady = $false
$frontendReady = $false

while ($sw.Elapsed.TotalSeconds -lt $maxWaitSeconds) {
    if (-not $frontendReady) {
        $fConn = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
        if ($fConn) {
            $frontendReady = $true
            Write-Host "[OK] Frontend siap di https://localhost:5173" -ForegroundColor Green
        }
    }
    if (-not $backendReady) {
        $bConn = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
        if ($bConn) {
            $backendReady = $true
            Write-Host "[OK] Backend siap di http://127.0.0.1:5000" -ForegroundColor Green
        }
    }
    if ($backendReady -and $frontendReady) {
        break
    }
    Start-Sleep -Milliseconds 800
}

# 5. Informasi URL Akses
Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "   SISTEM BERHASIL BERJALAN DI LATAR BELAKANG!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Akses Laptop / Komputer : https://localhost:5173" -ForegroundColor White
Write-Host "Akses HP / Tablet (Wi-Fi): https://$($localIp):5173" -ForegroundColor Yellow
Write-Host "API Backend Langsung     : http://127.0.0.1:5000" -ForegroundColor Gray
Write-Host "----------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "Tips Menghentikan: Jalankan '.\stop.ps1' untuk mematikan semua layanan." -ForegroundColor Gray
Write-Host "Tips Mode Dev    : Jalankan '.\run.ps1 -Mode dev' jika ingin Flask auto-reload." -ForegroundColor Gray
Write-Host "================================================================`n" -ForegroundColor Cyan

# 6. Buka browser otomatis jika tidak dinonaktifkan
if (-not $NoBrowser) {
    Write-Host "Membuka browser ke https://localhost:5173..." -ForegroundColor Cyan
    Start-Process "https://localhost:5173"
}
