# ====================================================================
# Script Peluncur Otomatis Sistem Absensi SMKN 21 Jakarta
# Menjalankan Backend dan Frontend di latar belakang (Tanpa Jendela Terminal)
# ====================================================================

param(
    [ValidateSet("prod", "dev", "production", "development")]
    [string]$Mode = "prod",
    [switch]$Visible
)

# Tentukan script backend yang akan dijalankan
$backendScript = if ($Mode -in @("dev", "development")) { "app.py" } else { "run_production.py" }
$modeLabel = if ($Mode -in @("dev", "development")) { "DEVELOPMENT (Flask Debug & Auto-Reload)" } else { "PRODUKSI (Waitress WSGI High-Concurrency)" }

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   SISTEM ABSENSI & MONITORING SMKN 21 JAKARTA" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Mode Peluncuran: $modeLabel" -ForegroundColor Green
Write-Host "Status Tampilan: $(if ($Visible) { 'Jendela Terminal Terbuka' } else { 'Latar Belakang (Hidden - Tanpa Terminal)' })" -ForegroundColor Gray
Write-Host "Script Backend : backend\$backendScript" -ForegroundColor Gray
Write-Host "----------------------------------------------------------------" -ForegroundColor DarkGray

# 1. Bersihkan port jika masih ada proses lama yang menggantung (Anti-Port Collision)
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

# 2. Deteksi Alamat IP Lokal untuk akses Smartphone / Tablet
$localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.InterfaceAlias -notmatch 'Loopback|vEthernet' -and $_.IPAddress -notmatch '^169\.254\.' 
} | Select-Object -First 1).IPAddress

if (-not $localIp) {
    $localIp = "127.0.0.1"
}

# 3. Jalankan Backend
Write-Host "[1/2] Menjalankan Backend ($backendScript)..." -ForegroundColor Green
if ($Visible) {
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "`$host.ui.RawUI.WindowTitle = 'Backend SMKN 21 ($backendScript)'; Set-Location '$PSScriptRoot\backend'; .\venv\Scripts\python.exe $backendScript"
} else {
    Start-Process -FilePath "$PSScriptRoot\backend\venv\Scripts\python.exe" -ArgumentList "$backendScript" -WorkingDirectory "$PSScriptRoot\backend" -WindowStyle Hidden
}

# 4. Jalankan Frontend
Write-Host "[2/2] Menjalankan Frontend (Vite)..." -ForegroundColor Green
if ($Visible) {
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "`$host.ui.RawUI.WindowTitle = 'Frontend SMKN 21 (Vite)'; Set-Location '$PSScriptRoot\frontend'; npm run dev"
} else {
    Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory "$PSScriptRoot\frontend" -WindowStyle Hidden
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

# Tunggu sejenak agar server Vite & Backend siap, lalu buka browser otomatis
Start-Sleep -Seconds 3
Start-Process "https://localhost:5173"
