"""
Production WSGI Server Runner (Waitress)
Dirancang untuk menangani beban tinggi ribuan siswa saat peak hour (05:00 - 06:30 WIB).
Mendukung multi-threading, connection pooling, anti-freeze, dan rotasi log berkas otomatis.
"""
import os
import sys
import logging
from logging.handlers import RotatingFileHandler

# Konfigurasi encoding stdout/stderr agar aman dari crash charmap/cp1252 di Windows
if sys.platform.startswith("win") and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Simpan stream sistem asli sebelum redirection
_original_stdout = sys.__stdout__ or sys.stdout
_original_stderr = sys.__stderr__ or sys.stderr

# Tambahkan direktori backend ke sys.path
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, BASE_DIR)

# Konfigurasi Rotasi Berkas Log (backend/logs/server.log)
LOG_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "server.log")

log_formatter = logging.Formatter(
    "[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

# File Handler: Rotasi otomatis setiap 5MB, maksimal simpan 5 arsip cadangan
file_handler = RotatingFileHandler(
    LOG_FILE,
    maxBytes=5 * 1024 * 1024,
    backupCount=5,
    encoding="utf-8"
)
file_handler.setFormatter(log_formatter)
file_handler.setLevel(logging.INFO)

# Console Handler: Output langsung ke terminal jika jendela aktif
console_handler = logging.StreamHandler(_original_stdout)
console_handler.setFormatter(log_formatter)
console_handler.setLevel(logging.INFO)

# Setup Root Logger
root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
root_logger.addHandler(file_handler)
root_logger.addHandler(console_handler)

# Konfigurasi Logger Waitress
waitress_logger = logging.getLogger("waitress")
waitress_logger.setLevel(logging.INFO)

# Redirection stdout/stderr agar print() dan unhandled traceback tercatat di server.log saat background
class StreamToLogger:
    def __init__(self, logger, level):
        self.logger = logger
        self.level = level

    def write(self, buf):
        text = buf.rstrip()
        if text:
            for line in text.splitlines():
                self.logger.log(self.level, line)

    def flush(self):
        pass

sys.stdout = StreamToLogger(logging.getLogger("STDOUT"), logging.INFO)
sys.stderr = StreamToLogger(logging.getLogger("STDERR"), logging.ERROR)

from app import app
from models import db
from utils.db_migrations import run_db_migrations
from waitress import serve

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    threads = int(os.environ.get("THREADS", 16))

    logging.info("================================================================")
    logging.info("[START] MENJALANKAN SERVER PRODUKSI SMKN 21 (Waitress WSGI)")
    logging.info(f"[CONFIG] Host: {host} | Port: {port}")
    logging.info(f"[WORKER] Threads: {threads} (Parallel Request Processing)")
    logging.info(f"[LOGGING] File Log Aktif: {LOG_FILE} (Rotasi 5MB x 5 backups)")
    logging.info("[READY] Concurrency Ready: Multi-Core OpenCV + High-Performance PostgreSQL (Supabase Pooler)")
    logging.info("================================================================")

    # Pastikan skema tabel & migrasi basis data dieksekusi sebelum menerima request
    try:
        with app.app_context():
            db.create_all()
        run_db_migrations(app)
        logging.info("[DB] Sinkronisasi skema & migrasi database selesai.")
    except Exception as e:
        logging.error(f"[DB] Peringatan saat inisialisasi basis data: {e}")

    serve(
        app,
        host=host,
        port=port,
        threads=threads,
        connection_limit=1000,
        channel_timeout=30,
        cleanup_interval=30
    )
