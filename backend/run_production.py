"""
Production WSGI Server Runner (Waitress)
Dirancang untuk menangani beban tinggi ribuan siswa saat peak hour (05:00 - 06:30 WIB).
Mendukung multi-threading, connection pooling, dan anti-freeze.
"""
import os
import sys

# Konfigurasi encoding stdout/stderr agar aman dari crash charmap/cp1252 di Windows
if sys.platform.startswith("win") and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Tambahkan direktori backend ke sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import app
from waitress import serve

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    threads = int(os.environ.get("THREADS", 16))

    print("================================================================")
    print(f"[START] MENJALANKAN SERVER PRODUKSI SMKN 21 (Waitress WSGI)")
    print(f"[CONFIG] Host: {host} | Port: {port}")
    print(f"[WORKER] Threads: {threads} (Parallel Request Processing)")
    print(f"[READY] Concurrency Ready: Multi-Core OpenCV + WAL Mode SQLite")
    print("================================================================")

    serve(
        app,
        host=host,
        port=port,
        threads=threads,
        connection_limit=1000,
        channel_timeout=30,
        cleanup_interval=30
    )
