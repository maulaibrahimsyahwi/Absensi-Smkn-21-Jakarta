import os
import secrets
from datetime import time, timezone, timedelta
from dotenv import load_dotenv

# Zona Waktu Resmi Indonesia Barat (WIB = UTC+7)
WIB = timezone(timedelta(hours=7))

# Direktori dasar backend
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Muat variabel lingkungan dari file .env jika ada
load_dotenv(os.path.join(BASE_DIR, '.env'))

# Konfigurasi Database SQLite
DATABASE_PATH = os.path.join(BASE_DIR, 'absensi.db')
SQLALCHEMY_DATABASE_URI = 'sqlite:///' + DATABASE_PATH
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Kunci Rahasia Keamanan Aplikasi & JWT Signing
# Jika tidak ada di .env, generate random token dinamis untuk sesi berjalan
_DEFAULT_FALLBACK_KEY = os.environ.get('SECRET_KEY') or secrets.token_hex(32)
SECRET_KEY = _DEFAULT_FALLBACK_KEY
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', SECRET_KEY)

# Konfigurasi Keamanan CORS (Hanya izinkan frontend dev server)
CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]

# Titik Koordinat Resmi SMKN 21 Jakarta & Batas Geofencing
SEKOLAH_LATITUDE = -6.1587
SEKOLAH_LONGITUDE = 106.8550
MAX_RADIUS_SEKOLAH = 35  # Batas radius realistis: 35 meter (memperhitungkan GPS drift dalam gedung)

SEKOLAH_INFO = {
    "nama": "SMKN 21 Jakarta",
    "alamat": "Jl. Siaga I Gg. Swadaya III, Kebon Kosong, Kemayoran, Jakarta Pusat",
    "latitude": SEKOLAH_LATITUDE,
    "longitude": SEKOLAH_LONGITUDE,
    "radius_meter": MAX_RADIUS_SEKOLAH
}

# Jurusan Resmi SMKN 21 Jakarta (Kurikulum Merdeka)
VALID_JURUSAN_SMKN21 = ['PPLG', 'AKL', 'MPLB', 'BR']

# Jam Operasional Presensi Harian SMKN 21 Jakarta
# 05:00 - 06:30 WIB: Tepat Waktu
# > 06:30 WIB: Terlambat (+5 poin pelanggaran)
# < 05:00 WIB: Belum dibuka
WAKTU_MULAI_MASUK = time(5, 0, 0)
WAKTU_BATAS_MASUK = time(6, 30, 0)

