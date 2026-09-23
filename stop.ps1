# ====================================================================
# Script Penghenti Otomatis Layanan Sistem Absensi SMKN 21 Jakarta
# ====================================================================

Write-Host "================================================================" -ForegroundColor Yellow
Write-Host "   MENGHENTIKAN LAYANAN SISTEM ABSENSI SMKN 21" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Yellow

$ports = @(5000, 5173)
$stoppedCount = 0

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections.OwningProcess | Select-Object -Unique
        foreach ($p in $pids) {
            try {
                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
                Write-Host "[OK] Berhasil menghentikan proses pada port $port (PID: $p)" -ForegroundColor Green
                $stoppedCount++
            } catch {
                # Abaikan jika proses sudah keluar
            }
        }
    }
}

if ($stoppedCount -eq 0) {
    Write-Host "[INFO] Tidak ada proses yang sedang berjalan pada port 5000 atau 5173." -ForegroundColor Gray
} else {
    Write-Host "`n[SELESAI] Semua proses backend dan frontend telah dihentikan dengan aman." -ForegroundColor Cyan
}
