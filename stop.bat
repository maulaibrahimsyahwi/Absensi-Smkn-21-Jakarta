@echo off
setlocal
cd /d "%~dp0"
echo Menghentikan Layanan Sistem Absensi SMKN 21...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop.ps1" %*
endlocal

