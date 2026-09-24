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

# Konfigurasi Database (Mendukung SQLite lokal & PostgreSQL/MySQL produksi)
DATABASE_PATH = os.path.join(BASE_DIR, 'absensi.db')
SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or ('sqlite:///' + DATABASE_PATH)
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Konfigurasi Concurrency Engine (Mencegah 'database is locked' saat peak hour)
if 'sqlite' in SQLALCHEMY_DATABASE_URI:
    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {
            "timeout": 30,  # Tunggu hingga 30 detik untuk antrean write-lock
            "check_same_thread": False
        },
        "pool_pre_ping": True,
    }
else:
    # Connection Pool untuk PostgreSQL / MySQL Produksi
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 25,
        "max_overflow": 50,
        "pool_recycle": 1800,
        "pool_pre_ping": True,
    }


# Kunci Rahasia Keamanan Aplikasi & JWT Signing
_raw_sec = (os.environ.get('SECRET_KEY') or '').strip()
SECRET_KEY = _raw_sec if _raw_sec else "smkn21_absensi_jwt_secret_key_prod_2026_secured_e8f9b2c3d4a1"

_raw_jwt = (os.environ.get('JWT_SECRET_KEY') or '').strip()
JWT_SECRET_KEY = _raw_jwt if _raw_jwt else SECRET_KEY

# Konfigurasi Keamanan CORS (Hanya izinkan frontend dev server)
CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]

# Titik Koordinat Resmi SMKN 21 Jakarta & Batas Geofencing
SEKOLAH_LATITUDE = -6.1587
SEKOLAH_LONGITUDE = 106.8550
MAX_RADIUS_SEKOLAH = 50  # Radius toleransi cadangan: 50 meter (memperhitungkan GPS drift dalam gedung beton)

# Batas Poligon Pagar Resmi Lahan SMKN 21 Jakarta (Kemayoran, Jakarta Pusat)
# Koordinat poligon berurutan memagari area gerbang, gedung utara, timur, lapangan selatan, dan barat
SEKOLAH_POLYGON = [
    [-6.15820, 106.85470],  # Sudut Barat Laut (Gerbang Utama / Akses Jl. Siaga I)
    [-6.15820, 106.85540],  # Sudut Timur Laut (Batas Gedung Utara)
    [-6.15880, 106.85545],  # Sudut Timur (Batas Lab / Bengkel Kejuruan)
    [-6.15920, 106.85535],  # Sudut Tenggara (Batas Lapangan / Area Belakang)
    [-6.15920, 106.85465],  # Sudut Barat Daya (Batas Gedung Selatan / Gg. Swadaya III)
    [-6.15870, 106.85455],  # Sudut Barat (Batas Parkir / Kelas Barat)
]

SEKOLAH_INFO = {
    "nama": "SMKN 21 Jakarta",
    "alamat": "Jl. Siaga I Gg. Swadaya III, Kebon Kosong, Kemayoran, Jakarta Pusat",
    "latitude": SEKOLAH_LATITUDE,
    "longitude": SEKOLAH_LONGITUDE,
    "radius_meter": MAX_RADIUS_SEKOLAH,
    "polygon": SEKOLAH_POLYGON
}

# Jurusan Resmi SMKN 21 Jakarta (Kurikulum Merdeka)
VALID_JURUSAN_SMKN21 = ['PPLG', 'AKL', 'MPLB', 'BR']

# Jam Operasional Presensi Harian SMKN 21 Jakarta
# 05:00 - 06:30 WIB: Tepat Waktu
# > 06:30 WIB: Terlambat (+5 poin pelanggaran)
# < 05:00 WIB: Belum dibuka
WAKTU_MULAI_MASUK = time(5, 0, 0)
WAKTU_BATAS_MASUK = time(6, 30, 0)

