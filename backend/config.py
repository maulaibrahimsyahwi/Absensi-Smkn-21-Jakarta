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

# Konfigurasi Database Utama: 100% PostgreSQL (Supabase High-Concurrency Pooler)
_raw_db_url = os.environ.get('DATABASE_URL', '').strip()
if not _raw_db_url:
    raise RuntimeError(
        "CRITICAL CONFIG ERROR: DATABASE_URL environment variable is not set! "
        "Pastikan file backend/.env telah dibuat dan memiliki variabel DATABASE_URL."
    )

if _raw_db_url.startswith('postgres://'):
    _raw_db_url = _raw_db_url.replace('postgres://', 'postgresql://', 1)

# Pastikan driver PostgreSQL terpasang (psycopg2 atau pg8000)
if _raw_db_url.startswith('postgresql://') and '+pg8000' not in _raw_db_url and '+psycopg' not in _raw_db_url:
    try:
        import psycopg2  # noqa: F401
    except Exception:
        # Gunakan pg8000 jika psycopg2 tidak tersedia / DLL diblokir oleh OS
        _raw_db_url = _raw_db_url.replace('postgresql://', 'postgresql+pg8000://', 1)

# Jika menggunakan Supabase Pooler pada port 5432 (Session Mode max 15 klien),
# alihkan otomatis ke port 6543 (Transaction Mode) agar anti-freeze dan mendukung ribuan request konkuren
if 'pooler.supabase.com:5432' in _raw_db_url:
    _raw_db_url = _raw_db_url.replace('pooler.supabase.com:5432', 'pooler.supabase.com:6543')

# Larang keras penggunaan SQLite di seluruh level aplikasi
if 'sqlite' in _raw_db_url.lower():
    raise RuntimeError("CRITICAL DATABASE CONFIG ERROR: SQLite telah dihapus dari sistem SMKN 21. Harap gunakan PostgreSQL!")

SQLALCHEMY_DATABASE_URI = _raw_db_url
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Connection Pool untuk PostgreSQL / Supabase PgBouncer (Aman terhadap batas koneksi & anti-freeze)
SQLALCHEMY_ENGINE_OPTIONS = {
    "pool_size": 15,
    "max_overflow": 20,
    "pool_recycle": 300,   # Segarkan koneksi idle setiap 5 menit agar tidak di-drop pooler
    "pool_pre_ping": True,  # Cek keaktifan koneksi sebelum digunakan
    "pool_timeout": 30,    # Batas toleransi antrean koneksi
}


# Pastikan zona waktu proses backend berjalan di Asia/Jakarta (WIB) jika didukung OS
try:
    import time as _py_time
    if hasattr(_py_time, 'tzset'):
        os.environ['TZ'] = 'Asia/Jakarta'
        _py_time.tzset()
except Exception:
    pass

# Kunci Rahasia Keamanan Aplikasi & JWT Signing
_FLASK_ENV = os.environ.get('FLASK_ENV', 'development').lower()
_IS_PROD = _FLASK_ENV == 'production' or os.environ.get('PRODUCTION', '0') == '1'

if _IS_PROD:
    _sec = os.environ.get('SECRET_KEY')
    _jwt_sec = os.environ.get('JWT_SECRET_KEY')
    if not _sec or len(_sec) < 32:
        raise RuntimeError("CRITICAL SECURITY ERROR: SECRET_KEY environment variable (min 32 chars) MUST be set in production mode!")
    if not _jwt_sec or len(_jwt_sec) < 32:
        raise RuntimeError("CRITICAL SECURITY ERROR: JWT_SECRET_KEY environment variable (min 32 chars) MUST be set in production mode!")
    SECRET_KEY = _sec
    JWT_SECRET_KEY = _jwt_sec
else:
    # Mode development / testing lokal
    SECRET_KEY = os.environ.get('SECRET_KEY') or secrets.token_hex(32)
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', SECRET_KEY)

# Konfigurasi Keamanan CORS (Izinkan domain yang ditentukan di .env atau dev server lokal)
_cors_env = os.environ.get('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173')
CORS_ORIGINS = [orig.strip() for orig in _cors_env.split(',') if orig.strip()]

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

