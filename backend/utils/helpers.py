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
    
    # Validasi jurusan resmi SMKN 21: PPLG, AKL, MPLB, BR
    kelas_pattern = r'^(X|XI|XII)\s+(PPLG|AKL|MPLB|BR)(\s+\d+)?$'
    if not re.match(kelas_pattern, kelas):
        return False, "Jurusan tidak valid! Jurusan resmi SMKN 21: PPLG, AKL, MPLB, atau BR (Tingkat X, XI, XII). Contoh: X PPLG 1"

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


def is_presensi_open(dt=None):
    """
    Mengecek apakah presensi harian sudah dibuka (mulai pukul 05:00 WIB).
    Jika sebelum pukul 05:00 WIB, presensi belum dibuka.
    """
    now = dt if dt is not None else datetime.now()
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


def get_flattened_known_faces():
    """
    Mengambil dan meratakan seluruh sampel biometrik wajah siswa yang berstatus 'Aktif'
    untuk pencocokan real-time pada detektor SFace.
    """
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
    return encodings, siswa_ids

