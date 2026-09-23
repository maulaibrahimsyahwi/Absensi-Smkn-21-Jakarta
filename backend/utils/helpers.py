import re
import math
import json
from datetime import datetime
from config import WAKTU_MULAI_MASUK, WAKTU_BATAS_MASUK
from models import Siswa

def validate_siswa_input(nis, nama, kelas):
    """
    Validasi data input siswa: NIS, Nama, dan Kelas/Jurusan resmi SMKN 21.
    """
    nis = str(nis or '').strip()
    nama = str(nama or '').strip()
    kelas = str(kelas or '').strip().upper()

    if not nis:
        return False, "Nomor Induk Siswa (NIS) wajib diisi"
    if not re.match(r'^\d{4,18}$', nis):
        return False, "NIS harus berupa angka antara 4 sampai 18 digit"

    if not nama:
        return False, "Nama lengkap siswa wajib diisi"
    if len(nama) < 3:
        return False, "Nama lengkap siswa minimal 3 karakter"
    if not re.match(r"^[a-zA-Z\s\.\',\-]+$", nama):
        return False, "Nama hanya boleh mengandung huruf, spasi, titik, atau tanda petik"

    if not kelas:
        return False, "Kelas dan jurusan wajib dipilih"
    
    # Validasi format kelas: Wajib diawali tingkat X, XI, atau XII dan nama jurusan/rombel
    kelas_pattern = r'^(X|XI|XII)\s+[A-Za-z0-9\s\-]+$'
    if not re.match(kelas_pattern, kelas):
        return False, "Format kelas tidak valid! Wajib diawali tingkat X, XI, atau XII dan nama jurusan/rombel (Contoh: X PPLG 1 atau X PPLG)."

    return True, ""


def calculate_distance_meters(lat1, lon1, lat2, lon2):
    """
    Menghitung jarak jarak garis lurus antara dua titik GPS (dalam meter) dengan formula Haversine.
    """
    try:
        lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
    except (TypeError, ValueError):
        return None
    R = 6371000  # Radius bumi dalam meter
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    deltaPhi = math.radians(lat2 - lat1)
    deltaLambda = math.radians(lon2 - lon1)
    a = (math.sin(deltaPhi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(deltaLambda / 2) ** 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c)


def is_school_day(dt=None):
    """
    Mengecek apakah hari ini adalah hari operasional sekolah SMKN 21 (Senin s/d Jumat).
    Sabtu (weekday 5) dan Minggu (weekday 6) adalah hari libur sekolah.
    """
    now = dt if dt is not None else datetime.now()
    return now.weekday() < 5  # 0..4 = Senin s/d Jumat


def is_presensi_open(dt=None):
    """
    Mengecek apakah presensi harian sudah dibuka (mulai pukul 05:00 WIB pada hari sekolah aktif).
    Jika akhir pekan (Sabtu/Minggu) atau sebelum pukul 05:00 WIB, presensi belum dibuka.
    """
    now = dt if dt is not None else datetime.now()
    if not is_school_day(now):
        return False
    return now.time() >= WAKTU_MULAI_MASUK


def check_status_kehadiran(dt=None):
    """
    Menentukan status kehadiran harian siswa ('Tepat Waktu' atau 'Terlambat')
    berdasarkan batas jam masuk SMKN 21:
    - 05:00 - 06:30 WIB: Tepat Waktu
    - Lewat 06:30 WIB: Terlambat
    """
    now = dt if dt is not None else datetime.now()
    if now.time() <= WAKTU_BATAS_MASUK:
        return "Tepat Waktu"
    return "Terlambat"


def is_kelas_pjj(kelas_str, dt=None):
    """
    Mengecek apakah kelas siswa tertentu sedang dalam Mode PJJ (Pembelajaran Jarak Jauh).
    Mengembalikan tuple: (is_pjj: bool, keterangan: str)
    """
    if not kelas_str:
        return False, ""
    
    try:
        from models import PengaturanPJJ
        cfg = PengaturanPJJ.query.first()
        if not cfg or not cfg.is_active:
            return False, ""

        now = dt if dt is not None else datetime.now()
        cur_date = now.date() if isinstance(now, datetime) else now

        # Validasi rentang tanggal jika disetel
        if cfg.tanggal_mulai and cur_date < cfg.tanggal_mulai:
            return False, ""
        if cfg.tanggal_selesai and cur_date > cfg.tanggal_selesai:
            return False, ""

        # 1. Jika lingkup PJJ adalah seluruh sekolah
        if cfg.tipe_lingkup == "semua":
            ket = cfg.keterangan or "PJJ Seluruh Sekolah"
            return True, ket

        kelas_upper = str(kelas_str).strip().upper()

        # Ekstrak tingkatan siswa (X, XI, atau XII)
        tingkat = None
        if kelas_upper.startswith("XII ") or kelas_upper == "XII":
            tingkat = "XII"
        elif kelas_upper.startswith("XI ") or kelas_upper == "XI":
            tingkat = "XI"
        elif kelas_upper.startswith("X ") or kelas_upper == "X":
            tingkat = "X"

        # 2. Jika lingkup PJJ berbasis tingkat
        if cfg.tipe_lingkup == "tingkat":
            try:
                tingkat_list = json.loads(cfg.tingkat_aktif or "[]")
            except Exception:
                tingkat_list = []
            
            if tingkat and tingkat in tingkat_list:
                ket = cfg.keterangan or f"PJJ Tingkat {tingkat}"
                return True, ket
            return False, ""

        # 3. Jika lingkup PJJ berbasis kelas spesifik
        if cfg.tipe_lingkup == "kelas":
            try:
                kelas_list = json.loads(cfg.kelas_aktif or "[]")
            except Exception:
                kelas_list = []
            
            if kelas_upper in [k.upper() for k in kelas_list]:
                ket = cfg.keterangan or f"PJJ Kelas {kelas_upper}"
                return True, ket
            return False, ""

        return False, ""
    except Exception as e:
        print(f"[PJJ HELPER WARNING] Gagal mengecek status PJJ: {e}")
        return False, ""


# Cache in-memory biometrik wajah siswa untuk mitigasi lonjakan jam 05:00-06:30 WIB
_FACE_CACHE = {
    "encodings": [],
    "siswa_ids": [],
    "last_updated": 0,
    "ttl": 60  # simpan di RAM selama 60 detik
}

def invalidate_face_cache():
    """Memaksa reload cache biometrik pada saat ada siswa baru mendaftar atau reset wajah."""
    _FACE_CACHE["last_updated"] = 0

def get_flattened_known_faces():
    """
    Mengambil dan meratakan seluruh sampel biometrik wajah siswa yang berstatus 'Aktif'
    menggunakan in-memory cache cepat untuk performa tinggi tanpa query ulang database SQLite.
    """
    import time
    now = time.time()
    if _FACE_CACHE["encodings"] and (now - _FACE_CACHE["last_updated"] < _FACE_CACHE["ttl"]):
        return _FACE_CACHE["encodings"], _FACE_CACHE["siswa_ids"]

    siswa_list = Siswa.query.filter(
        Siswa.face_encoding != None,
        (Siswa.status == 'Aktif') | (Siswa.status == None)
    ).all()
    encodings = []
    siswa_ids = []
    for s in siswa_list:
        try:
            raw = json.loads(s.face_encoding)
            # Check if multi-sample (list of lists)
            if isinstance(raw, list) and len(raw) > 0 and isinstance(raw[0], list):
                for enc in raw:
                    encodings.append(enc)
                    siswa_ids.append(s.id)
            elif isinstance(raw, list):
                encodings.append(raw)
                siswa_ids.append(s.id)
        except Exception:
            continue

    _FACE_CACHE["encodings"] = encodings
    _FACE_CACHE["siswa_ids"] = siswa_ids
    _FACE_CACHE["last_updated"] = now
    return encodings, siswa_ids

