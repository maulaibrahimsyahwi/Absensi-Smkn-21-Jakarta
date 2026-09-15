Write-Host "Menjalankan Sistem Absensi SMKN 21 di latar belakang..." -ForegroundColor Green

# Jalankan Backend secara tersembunyi (tanpa jendela PowerShell baru)
Start-Process -FilePath "powershell.exe" -ArgumentList "-WindowStyle Hidden", "-Command", "Set-Location '$PSScriptRoot\backend'; .\venv\Scripts\Activate.ps1; python app.py" -WindowStyle Hidden

# Jalankan Frontend secara tersembunyi (tanpa jendela PowerShell baru)
Start-Process -FilePath "powershell.exe" -ArgumentList "-WindowStyle Hidden", "-Command", "Set-Location '$PSScriptRoot\frontend'; npm run dev" -WindowStyle Hidden

# Tunggu 2 detik lalu buka browser otomatis
Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"

Write-Host "Selesai! Sistem berjalan di latar belakang dan browser telah terbuka di http://localhost:5173" -ForegroundColor Cyan
