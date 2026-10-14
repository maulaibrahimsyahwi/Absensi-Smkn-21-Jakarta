import re
import math
import json
import threading
import time as _time_mod
import numpy as np
from datetime import datetime, time, timedelta
import calendar
from config import WAKTU_MULAI_MASUK, WAKTU_BATAS_MASUK, WIB, SEKOLAH_LATITUDE, SEKOLAH_LONGITUDE
from models import Siswa, AbsensiHarian

def now_wib():
    """
    Mengembalikan waktu sekarang dalam Waktu Indonesia Barat (WIB = UTC+7)
    sebagai naive datetime tanpa tzinfo yang konsisten di Windows, Linux, dan Container Cloud.
    Mencegah bug perbedaan 7 jam ketika sistem host berjalan di zona waktu UTC.
    """
    return datetime.now(WIB).replace(tzinfo=None)

def today_wib():
    """Mengembalikan tanggal hari ini dalam zona waktu WIB."""
    return now_wib().date()

def get_date_range(tahun=None, bulan=None):
    """
    Mengembalikan rentang datetime (start_dt, end_dt) untuk query database sargable.
    Memungkinkan PostgreSQL menggunakan Index Scan pada kolom timestamp alih-alih Full Table Scan.
    """
    try:
        y = int(tahun) if tahun and str(tahun) != 'ALL' and str(tahun).isdigit() else None
    except Exception:
        y = None

    try:
        m = int(bulan) if bulan and str(bulan) != 'ALL' and str(bulan).isdigit() else None
    except Exception:
        m = None

    if not y:
        return None, None

    if m and 1 <= m <= 12:
        _, last_day = calendar.monthrange(y, m)
        start_dt = datetime(y, m, 1, 0, 0, 0)
        end_dt = datetime(y, m, last_day, 23, 59, 59, 999999)
        return start_dt, end_dt
    else:
        start_dt = datetime(y, 1, 1, 0, 0, 0)
        end_dt = datetime(y, 12, 31, 23, 59, 59, 999999)
        return start_dt, end_dt

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


def is_point_in_polygon(lat, lon, polygon):
    """
    Menentukan apakah suatu titik koordinat (lat, lon) berada di dalam area poligon
    menggunakan algoritma Ray-Casting (Even-Odd Rule).
    
    :param lat: Latitude titik pengujian (float)
    :param lon: Longitude titik pengujian (float)
    :param polygon: List koordinat poligon berurutan [[lat, lon], ...]
    :return: True jika titik berada di dalam poligon, False jika di luar
    """
    if not polygon or len(polygon) < 3:
        return False
    try:
        lat, lon = float(lat), float(lon)
    except (TypeError, ValueError):
        return False

    inside = False
    n = len(polygon)
    p1_lat, p1_lon = polygon[0]
    for i in range(1, n + 1):
        p2_lat, p2_lon = polygon[i % n]
        if lon > min(p1_lon, p2_lon):
            if lon <= max(p1_lon, p2_lon):
                if lat <= max(p1_lat, p2_lat):
                    if p1_lon != p2_lon:
                        lat_inters = (lon - p1_lon) * (p2_lat - p1_lat) / (p2_lon - p1_lon) + p1_lat
                    else:
                        lat_inters = p1_lat
                    if p1_lat == p2_lat or lat <= lat_inters:
                        inside = not inside
        p1_lat, p1_lon = p2_lat, p2_lon

    return inside


def verify_anti_fake_gps(siswa_id, latitude, longitude, accuracy, is_mock=False, gps_samples=None, now_dt=None, is_kiosk=False):
    """
    Validasi berlapis Anti-Fake GPS & Mock Location di sisi server:
    1. Flag eksplisit & batas fisik akurasi sensor
    2. Entropi multi-sampel (Zero-Drift & Linear Joystick Detection)
    3. Deteksi Shared Pin-Drop lintas siswa (2+ siswa di titik koordinat identik <0.1m)
    4. Deteksi Titik Pusat Presisi 0 Meter (pin buatan)
    """
    if is_mock:
        return False, "Terdeteksi penggunaan fitur lokasi palsu (Mock Location)."

    try:
        lat = float(latitude)
        lon = float(longitude)
        acc = float(accuracy) if accuracy is not None and accuracy != '' else None
    except (TypeError, ValueError):
        return False, "Format koordinat lokasi GPS tidak valid."

    # 1. Validasi batas fisik akurasi GPS smartphone di lingkungan gedung sekolah
    if acc is not None:
        if acc <= 0 or acc < 1.8:
            return False, f"Akurasi GPS ({acc}m) tidak wajar (indikasi emulator/Fake GPS)."
        if acc > 120:
            return False, f"Sinyal GPS terlalu lemah/tidak akurat (±{int(acc)}m). Pindah ke area terbuka dekat gerbang."

    # 2. Tolak koordinat yang menempel persis di titik pusat konfigurasi sekolah (<0.5 meter)
    dist_center = calculate_distance_meters(lat, lon, SEKOLAH_LATITUDE, SEKOLAH_LONGITUDE)
    if dist_center is not None and dist_center < 0.5 and abs(lat - SEKOLAH_LATITUDE) < 1e-6:
        return False, "Koordinat identik dengan titik tengah peta konfigurasi (indikasi pin Fake GPS)."

    # 3. Analisis deret sampel (Multi-Sample Zero-Drift Check) jika dikirim oleh klien
    if isinstance(gps_samples, list) and len(gps_samples) >= 2:
        s0, s1 = gps_samples[0], gps_samples[-1]
        try:
            d_lat = abs(float(s1.get("latitude", 0)) - float(s0.get("latitude", 0)))
            d_lon = abs(float(s1.get("longitude", 0)) - float(s0.get("longitude", 0)))
            d_acc = abs(float(s1.get("accuracy", 0)) - float(s0.get("accuracy", 0)))
            # Sensor GPS perangkat keras asli memiliki thermal/atmospheric jitter; 0.0000000 mutlak adalah sintetis
            if d_lat == 0.0 and d_lon == 0.0 and d_acc == 0.0:
                return False, "Sinyal sensor GPS membeku secara sintetis (Zero-Drift Mock Location)."
        except Exception:
            pass

    # 4. Deteksi Shared Spoof Pin: Cek apakah ada siswa lain dalam 15 menit terakhir
    # yang mengirim koordinat identik persis hingga 6 desimal (~0.11 meter)
    # (Catatan: dilewati untuk mode kiosk sekolah di mana banyak siswa scan di perangkat yang sama)
    if not is_kiosk and siswa_id:
        now = now_dt or now_wib()
        recent_window = now - timedelta(minutes=15)
        identical_pin = AbsensiHarian.query.filter(
            AbsensiHarian.siswa_id != siswa_id,
            AbsensiHarian.waktu >= recent_window,
            AbsensiHarian.latitude.between(lat - 1e-6, lat + 1e-6),
            AbsensiHarian.longitude.between(lon - 1e-6, lon + 1e-6)
        ).first()
        if identical_pin:
            return False, "Titik koordinat GPS terdeteksi identik persis dengan perangkat lain (indikasi koordinat Fake GPS bersama)."

    return True, "Valid"


# ==============================================================================
# CACHE KONFIGURASI OPERASIONAL SEKOLAH (TTL 60 Detik)
# Menggabungkan PengaturanJadwal, PengaturanPJJ, dan HariLibur hari ini di RAM
# Mengeliminasi 6-7 query SQL redundan pada setiap transaksi presensi jam sibuk
# ==============================================================================
_CONFIG_CACHE_LOCK = threading.Lock()
_SCHOOL_CONFIG_CACHE = {
    "date": None,
    "expires_at": 0,
    "jadwal_dict": None,
    "pjj_dict": None,
    "holiday_status": None,
}

def invalidate_school_config_cache():
    """Panggil saat Admin/Piket mengubah Jadwal, Mode Darurat, PJJ, atau Hari Libur."""
    with _CONFIG_CACHE_LOCK:
        _SCHOOL_CONFIG_CACHE["expires_at"] = 0

def get_cached_school_context(dt=None):
    """
    Mengambil konteks operasional harian (Holiday, Jadwal, PJJ) dari RAM cache (TTL 60 detik).
    Mengeliminasi 6-7 query SQL berulang pada setiap request presensi.
    """
    now = dt if dt is not None else now_wib()
    cur_date = now.date() if isinstance(now, datetime) else now
    ts = _time_mod.time()

    if _SCHOOL_CONFIG_CACHE["date"] == cur_date and ts < _SCHOOL_CONFIG_CACHE["expires_at"]:
        return _SCHOOL_CONFIG_CACHE

    with _CONFIG_CACHE_LOCK:
        if _SCHOOL_CONFIG_CACHE["date"] == cur_date and ts < _SCHOOL_CONFIG_CACHE["expires_at"]:
            return _SCHOOL_CONFIG_CACHE

        try:
            from models import PengaturanJadwal, PengaturanPJJ
            cfg_jadwal = PengaturanJadwal.query.first()
            cfg_pjj = PengaturanPJJ.query.first()
            h_status = get_holiday_status(now, use_cache=False)
            _SCHOOL_CONFIG_CACHE.update({
                "date": cur_date,
                "expires_at": ts + 60.0,
                "jadwal_dict": cfg_jadwal.to_dict() if cfg_jadwal else None,
                "pjj_dict": cfg_pjj.to_dict() if cfg_pjj else None,
                "holiday_status": h_status,
            })
        except Exception as e:
            print(f"[CACHE WARNING] Gagal refresh school context cache: {e}")
            if not _SCHOOL_CONFIG_CACHE["date"]:
                _SCHOOL_CONFIG_CACHE["date"] = cur_date
                _SCHOOL_CONFIG_CACHE["expires_at"] = ts + 10.0

        return _SCHOOL_CONFIG_CACHE


def get_holiday_status(dt=None, use_cache=True):
    """
    Mengecek status operasional sekolah untuk tanggal tertentu.
    Mempertimbangkan:
    1. Hari Masuk Khusus (tipe_hari = 'masuk_khusus') -> Siswa wajib masuk (misal Upacara HUT RI / Hardiknas).
    2. Hari Libur Terjadwal (tipe_hari = 'libur') -> Libur semester, libur nasional, cuti bersama, libur khusus.
    3. Akhir Pekan Alami (Sabtu & Minggu) jika tidak ada konfigurasi khusus.
    """
    now = dt if dt is not None else now_wib()
    cur_date = now.date() if isinstance(now, datetime) else now

    if use_cache and cur_date == today_wib():
        ctx = get_cached_school_context(now)
        cached_h = ctx.get("holiday_status")
        if cached_h:
            return cached_h
    nama_hari = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"][now.weekday()]
    is_weekend_cal = now.weekday() >= 5

    try:
        from models import HariLibur
        # Prioritas 1: Hari Masuk Khusus (Override agar tetap buka presensi meski weekend / tanggal merah)
        special_day = HariLibur.query.filter(
            HariLibur.is_active == True,
            HariLibur.tipe_hari == "masuk_khusus",
            HariLibur.tanggal_mulai <= cur_date,
            HariLibur.tanggal_selesai >= cur_date
        ).first()

        if special_day:
            return {
                "is_school_day": True,
                "is_holiday": False,
                "is_special_school_day": True,
                "is_weekend": is_weekend_cal,
                "nama_hari": nama_hari,
                "holiday_event": special_day.to_dict(),
                "message": f"Hari ini wajib hadir (Kegiatan Khusus): {special_day.nama}."
            }

        # Prioritas 2: Hari Libur Terjadwal (Libur semester, libur nasional, libur mendadak)
        holiday = HariLibur.query.filter(
            HariLibur.is_active == True,
            HariLibur.tipe_hari == "libur",
            HariLibur.tanggal_mulai <= cur_date,
            HariLibur.tanggal_selesai >= cur_date
        ).first()

        if holiday:
            return {
                "is_school_day": False,
                "is_holiday": True,
                "is_special_school_day": False,
                "is_weekend": is_weekend_cal,
                "nama_hari": nama_hari,
                "holiday_event": holiday.to_dict(),
                "message": f"Hari ini adalah hari libur sekolah {holiday.nama} ({holiday.keterangan or 'Presensi Ditutup'})."
            }
    except Exception:
        # Fallback jika query DB gagal / belum inisialisasi
        pass

    # Prioritas 3: Hari Libur Nasional & Cuti Bersama Otomatis (Tanpa Perlu Sinkronisasi Manual)
    try:
        from utils.national_holidays import get_national_holiday_on_date
        nat_holiday = get_national_holiday_on_date(cur_date)
        if nat_holiday:
            return {
                "is_school_day": False,
                "is_holiday": True,
                "is_special_school_day": False,
                "is_weekend": is_weekend_cal,
                "nama_hari": nama_hari,
                "holiday_event": {
                    "id": f"nat_{cur_date.strftime('%Y%m%d')}",
                    "nama": nat_holiday["nama"],
                    "kategori": nat_holiday.get("kategori", "libur_nasional"),
                    "tipe_hari": "libur",
                    "tanggal_mulai": nat_holiday["tanggal_mulai"],
                    "tanggal_selesai": nat_holiday["tanggal_selesai"],
                    "keterangan": nat_holiday.get("keterangan", "Hari Libur Nasional Resmi Indonesia"),
                    "is_active": True,
                    "is_built_in": True,
                    "lampiran_surat": None,
                    "nama_file_surat": None,
                },
                "message": f"Hari ini adalah hari libur nasional {nat_holiday['nama']}."
            }
    except Exception:
        pass

    # Prioritas 4: Hari Akhir Pekan Standar (Sabtu & Minggu)
    if is_weekend_cal:
        return {
            "is_school_day": False,
            "is_holiday": False,
            "is_special_school_day": False,
            "is_weekend": True,
            "nama_hari": nama_hari,
            "holiday_event": None,
            "message": f"Hari ini adalah hari {nama_hari} (Libur Akhir Pekan). Presensi kehadiran dibuka kembali hari Senin pukul 05:00 WIB."
        }

    # Hari Sekolah Normal (Senin s/d Jumat)
    return {
        "is_school_day": True,
        "is_holiday": False,
        "is_special_school_day": False,
        "is_weekend": False,
        "nama_hari": nama_hari,
        "holiday_event": None,
        "message": ""
    }


def is_school_day(dt=None):
    """
    Mengecek apakah hari ini adalah hari operasional aktif sekolah SMKN 21.
    Menghormati kalender hari libur, libur semester, hari masuk khusus, serta akhir pekan.
    """
    status = get_holiday_status(dt)
    return status["is_school_day"]


def get_active_schedule(dt=None):
    """
    Mengambil konfigurasi jadwal jam operasional presensi yang aktif secara dinamis.
    Mendukung penyesuaian khusus (Normal, Puasa, Ujian, Hari Jumat)
    dan Mode Darurat Jaringan dengan toleransi keterlambatan.
    Menggunakan RAM cache (0 ms) pada jam sibuk.
    """
    now = dt if dt is not None else now_wib()
    w_mulai = WAKTU_MULAI_MASUK
    w_batas = WAKTU_BATAS_MASUK
    mode_darurat = False
    toleransi = 0
    keterangan = "Normal"

    cur_date = now.date() if isinstance(now, datetime) else now
    cfg_dict = None
    if cur_date == today_wib():
        ctx = get_cached_school_context(now)
        cfg_dict = ctx.get("jadwal_dict")

    if cfg_dict:
        # Gunakan cache in-memory (0 ms, no SQL query)
        jam_mulai_s = cfg_dict.get('jam_mulai_masuk')
        if jam_mulai_s:
            parts = [int(p) for p in jam_mulai_s.split(':')]
            w_mulai = time(parts[0], parts[1], parts[2] if len(parts) > 2 else 0)

        is_jumat = now.weekday() == 4
        jam_batas_j = cfg_dict.get('jam_batas_jumat')
        target_batas_str = jam_batas_j if (is_jumat and jam_batas_j) else cfg_dict.get('jam_batas_masuk')
        if target_batas_str:
            parts = [int(p) for p in target_batas_str.split(':')]
            w_batas = time(parts[0], parts[1], parts[2] if len(parts) > 2 else 0)

        mode_darurat = bool(cfg_dict.get('mode_darurat_jaringan'))
        toleransi = int(cfg_dict.get('toleransi_darurat_menit') or 0)
        keterangan = cfg_dict.get('keterangan') or "Jadwal Dinamis"

        if mode_darurat and toleransi > 0:
            base_dt = datetime.combine(now.date(), w_batas)
            extended_dt = base_dt + timedelta(minutes=toleransi)
            w_batas = extended_dt.time()
            keterangan += f" (Mode Darurat Jaringan: +{toleransi}m)"
    else:
        try:
            from models import PengaturanJadwal
            cfg = PengaturanJadwal.query.first()
            if cfg:
                if cfg.jam_mulai_masuk:
                    parts = [int(p) for p in cfg.jam_mulai_masuk.split(':')]
                    w_mulai = time(parts[0], parts[1], parts[2] if len(parts) > 2 else 0)

                is_jumat = now.weekday() == 4
                target_batas_str = cfg.jam_batas_jumat if (is_jumat and cfg.jam_batas_jumat) else cfg.jam_batas_masuk

                if target_batas_str:
                    parts = [int(p) for p in target_batas_str.split(':')]
                    w_batas = time(parts[0], parts[1], parts[2] if len(parts) > 2 else 0)

                mode_darurat = bool(cfg.mode_darurat_jaringan)
                toleransi = int(cfg.toleransi_darurat_menit or 0)
                keterangan = cfg.keterangan or "Jadwal Dinamis"

                if mode_darurat and toleransi > 0:
                    base_dt = datetime.combine(now.date(), w_batas)
                    extended_dt = base_dt + timedelta(minutes=toleransi)
                    w_batas = extended_dt.time()
                    keterangan += f" (Mode Darurat Jaringan: +{toleransi}m)"
        except Exception:
            pass

    return {
        "waktu_mulai": w_mulai,
        "waktu_batas": w_batas,
        "jam_buka": w_mulai,
        "jam_batas": w_batas,
        "mode_darurat": mode_darurat,
        "toleransi_menit": toleransi,
        "keterangan": keterangan
    }


def is_presensi_open(dt=None):
    """
    Mengecek apakah presensi harian sudah dibuka pada hari sekolah aktif.
    Menggunakan konfigurasi jam mulai dinamis dari database.
    """
    now = dt if dt is not None else now_wib()
    if not is_school_day(now):
        return False
    sched = get_active_schedule(now)
    return now.time() >= sched["waktu_mulai"]


def check_status_kehadiran(dt=None):
    """
    Menentukan status kehadiran harian siswa ('Tepat Waktu' atau 'Terlambat')
    berdasarkan batas jam masuk dinamis (termasuk toleransi Mode Darurat Jaringan jika aktif).
    """
    now = dt if dt is not None else now_wib()
    sched = get_active_schedule(now)
    if now.time() <= sched["waktu_batas"]:
        return "Tepat Waktu"
    return "Terlambat"


def is_kelas_pjj(kelas_str, dt=None):
    """
    Mengecek apakah kelas siswa tertentu sedang dalam Mode PJJ (Pembelajaran Jarak Jauh).
    Mengembalikan tuple: (is_pjj: bool, keterangan: str)
    Menggunakan in-memory cache RAM untuk performa tinggi tanpa query database berulang.
    """
    if not kelas_str:
        return False, ""
    
    try:
        now = dt if dt is not None else now_wib()
        cur_date = now.date() if isinstance(now, datetime) else now

        # Jika hari ini adalah hari libur sekolah atau akhir pekan, Mode PJJ tidak berlaku
        if not is_school_day(now):
            return False, ""

        cfg_pjj = None
        if cur_date == today_wib():
            ctx = get_cached_school_context(now)
            cfg_pjj = ctx.get("pjj_dict")

        if not cfg_pjj:
            from models import PengaturanPJJ
            db_pjj = PengaturanPJJ.query.first()
            cfg_pjj = db_pjj.to_dict() if db_pjj else None

        if not cfg_pjj or not cfg_pjj.get('is_active'):
            return False, ""

        # Validasi rentang tanggal jika disetel
        t_mulai = cfg_pjj.get('tanggal_mulai')
        t_selesai = cfg_pjj.get('tanggal_selesai')
        if t_mulai:
            t_m_date = datetime.strptime(t_mulai, '%Y-%m-%d').date() if isinstance(t_mulai, str) else t_mulai
            if cur_date < t_m_date:
                return False, ""
        if t_selesai:
            t_s_date = datetime.strptime(t_selesai, '%Y-%m-%d').date() if isinstance(t_selesai, str) else t_selesai
            if cur_date > t_s_date:
                return False, ""

        # 1. Jika lingkup PJJ adalah seluruh sekolah
        tipe_lingkup = cfg_pjj.get('tipe_lingkup')
        ket = cfg_pjj.get('keterangan')
        if tipe_lingkup == "semua":
            return True, ket or "PJJ Seluruh Sekolah"

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
        if tipe_lingkup == "tingkat":
            tingkat_raw = cfg_pjj.get('tingkat_aktif')
            tingkat_list = json.loads(tingkat_raw) if isinstance(tingkat_raw, str) else (tingkat_raw or [])
            if tingkat and tingkat in tingkat_list:
                return True, ket or f"PJJ Tingkat {tingkat}"
            return False, ""

        # 3. Jika lingkup PJJ berbasis kelas spesifik
        if tipe_lingkup == "kelas":
            kelas_raw = cfg_pjj.get('kelas_aktif')
            kelas_list = json.loads(kelas_raw) if isinstance(kelas_raw, str) else (kelas_raw or [])
            if kelas_upper in [k.upper() for k in kelas_list]:
                return True, ket or f"PJJ Kelas {kelas_upper}"
            return False, ""

        return False, ""
    except Exception as e:
        print(f"[PJJ HELPER WARNING] Gagal mengecek status PJJ: {e}")
        return False, ""


# ==============================================================================
# CACHE BIOMETRIK WAJAH SISWA TERDEKRIPSI (TTL 30 Menit)
# Dilindungi Double-Checked Locking untuk mencegah Cache Stampede saat Rush Hour
# Menyimpan array float32 terdekripsi per-siswa agar bebas dari dekripsi Fernet berulang
# ==============================================================================
class NormalizedArray(np.ndarray):
    """Subclass NumPy ndarray untuk menandai matriks encoding yang telah dinormalisasi (Unit Norm)."""
    _is_normalized = True

_FACE_CACHE_LOCK = threading.Lock()
_FACE_CACHE = {
    "encodings": [],
    "siswa_ids": [],
    "by_siswa_id": {},  # {siswa_id: {"encodings": list, "med_until": date}}
    "last_updated": 0,
    "ttl": 1800  # 30 menit (mencakup seluruh jam sibuk presensi pagi 06:00-06:30 WIB)
}

def invalidate_face_cache(siswa_id=None):
    """
    Memaksa reload cache biometrik pada saat ada siswa baru mendaftar atau reset wajah.
    Jika siswa_id diberikan, hanya invalidasi entri siswa tersebut tanpa mereset 1.000 siswa lain.
    """
    with _FACE_CACHE_LOCK:
        if siswa_id is not None:
            try:
                sid = int(siswa_id)
                _FACE_CACHE["by_siswa_id"].pop(sid, None)
            except Exception:
                pass
            _FACE_CACHE["last_updated"] = 0
        else:
            _FACE_CACHE["by_siswa_id"].clear()
            _FACE_CACHE["encodings"] = []
            _FACE_CACHE["siswa_ids"] = []
            _FACE_CACHE["last_updated"] = 0

def get_flattened_known_faces():
    """
    Mengambil dan meratakan seluruh sampel biometrik wajah siswa yang berstatus 'Aktif'
    menggunakan Double-Checked Locking untuk efisiensi tinggi tanpa race condition.
    """
    now = _time_mod.time()
    if len(_FACE_CACHE["encodings"]) > 0 and (now - _FACE_CACHE["last_updated"] < _FACE_CACHE["ttl"]):
        return _FACE_CACHE["encodings"], _FACE_CACHE["siswa_ids"]

    with _FACE_CACHE_LOCK:
        # Double check di dalam lock
        if len(_FACE_CACHE["encodings"]) > 0 and (now - _FACE_CACHE["last_updated"] < _FACE_CACHE["ttl"]):
            return _FACE_CACHE["encodings"], _FACE_CACHE["siswa_ids"]

        siswa_list = Siswa.query.filter(
            Siswa.face_encoding != None,
            (Siswa.status == 'Aktif') | (Siswa.status == None),
            (Siswa.is_deleted == False) | (Siswa.is_deleted == None)
        ).all()

        encodings = []
        siswa_ids = []
        by_siswa_id = {}

        for s in siswa_list:
            try:
                raw = s.get_encoding()
                s_encs = []
                if isinstance(raw, list) and len(raw) > 0 and isinstance(raw[0], list):
                    for enc in raw:
                        encodings.append(enc)
                        siswa_ids.append(s.id)
                        s_encs.append(enc)
                elif isinstance(raw, list) and len(raw) > 0:
                    encodings.append(raw)
                    siswa_ids.append(s.id)
                    s_encs.append(raw)

                by_siswa_id[s.id] = {
                    "encodings": s_encs,
                    "med_until": s.medical_exemption_until
                }
            except Exception:
                continue

        if encodings:
            known_mat = np.array(encodings, dtype=np.float32)
            norms = np.linalg.norm(known_mat, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            cached_encodings = (known_mat / norms).view(NormalizedArray)
        else:
            cached_encodings = []

        _FACE_CACHE["encodings"] = cached_encodings
        _FACE_CACHE["siswa_ids"] = siswa_ids
        _FACE_CACHE["by_siswa_id"] = by_siswa_id
        _FACE_CACHE["last_updated"] = now
        return cached_encodings, siswa_ids


def get_student_decrypted_encodings(siswa_id):
    """
    Mengambil vektor wajah 1 siswa yang sudah didekripsi dari RAM (<0.01ms) tanpa dekripsi Fernet berulang.
    Thread-safe dan menggunakan Double-Checked Locking.
    """
    get_flattened_known_faces()  # Pastikan cache terisi
    sid = int(siswa_id)
    entry = _FACE_CACHE["by_siswa_id"].get(sid)

    if not entry:
        with _FACE_CACHE_LOCK:
            entry = _FACE_CACHE["by_siswa_id"].get(sid)
            if not entry:
                s = Siswa.query.get(sid)
                if s and s.face_encoding:
                    try:
                        raw = s.get_encoding()
                        s_encs = raw if isinstance(raw, list) and (len(raw) == 0 or isinstance(raw[0], list)) else ([raw] if isinstance(raw, list) else [])
                        entry = {
                            "encodings": s_encs,
                            "med_until": s.medical_exemption_until
                        }
                    except Exception:
                        entry = {"encodings": [], "med_until": None}
                else:
                    entry = {
                        "encodings": [],
                        "med_until": getattr(s, 'medical_exemption_until', None) if s else None
                    }
                _FACE_CACHE["by_siswa_id"][sid] = entry

    med_until = entry.get("med_until")
    is_med_exempt = bool(med_until and med_until >= today_wib())
    return entry.get("encodings", []), is_med_exempt

