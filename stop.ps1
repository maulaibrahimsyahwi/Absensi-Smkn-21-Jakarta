Write-Host "Menghentikan layanan backend dan frontend..." -ForegroundColor Yellow

$connections = Get-NetTCPConnection -LocalPort 5000, 5173 -State Listen -ErrorAction SilentlyContinue
foreach ($conn in $connections) {
    try {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host "Berhasil menghentikan proses pada port $($conn.LocalPort) (PID: $($conn.OwningProcess))" -ForegroundColor Green
    } catch {
        # Abaikan jika sudah berhenti
    }
}

Write-Host "Semua proses Sistem Absensi telah dihentikan." -ForegroundColor Cyan

