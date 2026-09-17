import os
from datetime import time

# Direktori dasar backend
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Konfigurasi Database SQLite
DATABASE_PATH = os.path.join(BASE_DIR, 'absensi.db')
SQLALCHEMY_DATABASE_URI = 'sqlite:///' + DATABASE_PATH
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Konfigurasi Keamanan CORS (Hanya izinkan frontend dev server)
CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]

# Titik Koordinat Resmi SMKN 21 Jakarta & Batas Geofencing
SEKOLAH_LATITUDE = -6.1587
SEKOLAH_LONGITUDE = 106.8550
MAX_RADIUS_SEKOLAH = 10  # Batas radius resmi: 10 meter

SEKOLAH_INFO = {
    "nama": "SMKN 21 Jakarta",
    "alamat": "Jl. Siaga I Gg. Swadaya III, Kebon Kosong, Kemayoran, Jakarta Pusat",
    "latitude": SEKOLAH_LATITUDE,
    "longitude": SEKOLAH_LONGITUDE,
    "radius_meter": MAX_RADIUS_SEKOLAH
}

# Jurusan Resmi SMKN 21 Jakarta (Kurikulum Merdeka)
VALID_JURUSAN_SMKN21 = ['PPLG', 'AKL', 'MPLB', 'BR']

# Jam Batas Keterlambatan Presensi Harian (06:30 WIB)
WAKTU_BATAS_MASUK = time(6, 30, 0)

