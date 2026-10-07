@echo off
setlocal
cd /d "%~dp0"
echo Menjalankan Sistem Absensi SMKN 21 Jakarta...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" %*
endlocal

