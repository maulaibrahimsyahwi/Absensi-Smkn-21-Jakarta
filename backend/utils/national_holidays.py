"""
Katalog & Integrasi API Kalender Hari Libur Nasional & Cuti Bersama Resmi Indonesia
Mengambil data tanggal merah secara otomatis dan real-time dari API publik (SKB 3 Menteri).
Dilengkapi caching memori & berkas lokal untuk performa tinggi dan fallback offline.
"""

import os
import json
import logging
import urllib.request
import urllib.error
from datetime import datetime, date, timedelta

logger = logging.getLogger(__name__)

# Direktori Cache Berkas Lokal
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CACHE_DIR = os.path.join(BASE_DIR, 'static', 'cache_holidays')
os.makedirs(CACHE_DIR, exist_ok=True)

# Memory Cache: {year: {"data": list, "timestamp": datetime}}
_MEMORY_CACHE = {}
CACHE_TTL_HOURS = 24

# Fallback dasar offline jika server sama sekali tidak terhubung internet & belum ada cache
OFFLINE_BASELINE_HOLIDAYS = {
    2025: [
        {"nama": "Tahun Baru 2025 Masehi", "kategori": "libur_nasional", "tanggal_mulai": "2025-01-01", "tanggal_selesai": "2025-01-01", "keterangan": "Libur Nasional Tahun Baru Masehi"},
        {"nama": "Isra Mi'raj Nabi Muhammad SAW", "kategori": "libur_nasional", "tanggal_mulai": "2025-01-27", "tanggal_selesai": "2025-01-27", "keterangan": "Peringatan Isra Mi'raj 1446 H"},
        {"nama": "Tahun Baru Imlek 2576 Kongzili", "kategori": "libur_nasional", "tanggal_mulai": "2025-01-29", "tanggal_selesai": "2025-01-29", "keterangan": "Tahun Baru Imlek 2576 Kongzili"},
        {"nama": "Hari Suci Nyepi (Tahun Baru Saka 1947)", "kategori": "libur_nasional", "tanggal_mulai": "2025-03-29", "tanggal_selesai": "2025-03-29", "keterangan": "Hari Suci Nyepi Saka 1947"},
        {"nama": "Hari Raya Idul Fitri 1446 H", "kategori": "libur_nasional", "tanggal_mulai": "2025-03-31", "tanggal_selesai": "2025-04-01", "keterangan": "Hari Raya Idul Fitri 1446 Hijriah"},
        {"nama": "Hari Buruh Internasional", "kategori": "libur_nasional", "tanggal_mulai": "2025-05-01", "tanggal_selesai": "2025-05-01", "keterangan": "Hari Buruh Internasional"},
        {"nama": "Hari Raya Waisak 2569 BE", "kategori": "libur_nasional", "tanggal_mulai": "2025-05-12", "tanggal_selesai": "2025-05-12", "keterangan": "Hari Raya Waisak 2569 BE"},
        {"nama": "Kenaikan Yesus Kristus", "kategori": "libur_nasional", "tanggal_mulai": "2025-05-29", "tanggal_selesai": "2025-05-29", "keterangan": "Kenaikan Yesus Kristus"},
        {"nama": "Hari Lahir Pancasila", "kategori": "libur_nasional", "tanggal_mulai": "2025-06-01", "tanggal_selesai": "2025-06-01", "keterangan": "Hari Lahir Pancasila"},
        {"nama": "Hari Raya Idul Adha 1446 H", "kategori": "libur_nasional", "tanggal_mulai": "2025-06-06", "tanggal_selesai": "2025-06-06", "keterangan": "Hari Raya Idul Adha 1446 H"},
        {"nama": "Tahun Baru Islam 1447 H", "kategori": "libur_nasional", "tanggal_mulai": "2025-06-27", "tanggal_selesai": "2025-06-27", "keterangan": "Tahun Baru Islam 1447 Hijriah"},
        {"nama": "Hari Kemerdekaan RI (HUT RI ke-80)", "kategori": "libur_nasional", "tanggal_mulai": "2025-08-17", "tanggal_selesai": "2025-08-17", "keterangan": "HUT Proklamasi Kemerdekaan RI ke-80"},
        {"nama": "Maulid Nabi Muhammad SAW", "kategori": "libur_nasional", "tanggal_mulai": "2025-09-05", "tanggal_selesai": "2025-09-05", "keterangan": "Peringatan Maulid Nabi Muhammad SAW"},
        {"nama": "Hari Raya Natal", "kategori": "libur_nasional", "tanggal_mulai": "2025-12-25", "tanggal_selesai": "2025-12-25", "keterangan": "Hari Raya Natal 2025"}
    ],
    2026: [
        {"nama": "Tahun Baru 2026 Masehi", "kategori": "libur_nasional", "tanggal_mulai": "2026-01-01", "tanggal_selesai": "2026-01-01", "keterangan": "Libur Nasional Tahun Baru Masehi"},
        {"nama": "Isra Mi'raj Nabi Muhammad SAW", "kategori": "libur_nasional", "tanggal_mulai": "2026-01-16", "tanggal_selesai": "2026-01-16", "keterangan": "Peringatan Isra Mi'raj 1447 H"},
        {"nama": "Tahun Baru Imlek 2577 Kongzili", "kategori": "libur_nasional", "tanggal_mulai": "2026-02-17", "tanggal_selesai": "2026-02-17", "keterangan": "Tahun Baru Imlek 2577 Kongzili"},
        {"nama": "Hari Suci Nyepi (Tahun Baru Saka 1948)", "kategori": "libur_nasional", "tanggal_mulai": "2026-03-19", "tanggal_selesai": "2026-03-19", "keterangan": "Hari Suci Nyepi Saka 1948"},
        {"nama": "Hari Raya Idul Fitri 1447 H", "kategori": "libur_nasional", "tanggal_mulai": "2026-03-21", "tanggal_selesai": "2026-03-22", "keterangan": "Hari Raya Idul Fitri 1447 Hijriah"},
        {"nama": "Wafat Yesus Kristus (Jumat Agung)", "kategori": "libur_nasional", "tanggal_mulai": "2026-04-03", "tanggal_selesai": "2026-04-03", "keterangan": "Wafat Yesus Kristus"},
        {"nama": "Hari Buruh Internasional", "kategori": "libur_nasional", "tanggal_mulai": "2026-05-01", "tanggal_selesai": "2026-05-01", "keterangan": "Hari Buruh Internasional"},
        {"nama": "Kenaikan Yesus Kristus", "kategori": "libur_nasional", "tanggal_mulai": "2026-05-14", "tanggal_selesai": "2026-05-14", "keterangan": "Kenaikan Yesus Kristus"},
        {"nama": "Hari Raya Idul Adha 1447 H", "kategori": "libur_nasional", "tanggal_mulai": "2026-05-27", "tanggal_selesai": "2026-05-27", "keterangan": "Hari Raya Idul Adha 1447 H"},
        {"nama": "Hari Raya Waisak 2570 BE", "kategori": "libur_nasional", "tanggal_mulai": "2026-05-31", "tanggal_selesai": "2026-05-31", "keterangan": "Hari Raya Waisak 2570 BE"},
        {"nama": "Hari Lahir Pancasila", "kategori": "libur_nasional", "tanggal_mulai": "2026-06-01", "tanggal_selesai": "2026-06-01", "keterangan": "Hari Lahir Pancasila"},
        {"nama": "Tahun Baru Islam 1448 H", "kategori": "libur_nasional", "tanggal_mulai": "2026-06-16", "tanggal_selesai": "2026-06-16", "keterangan": "Tahun Baru Islam 1448 Hijriah"},
        {"nama": "Hari Kemerdekaan RI (HUT RI ke-81)", "kategori": "libur_nasional", "tanggal_mulai": "2026-08-17", "tanggal_selesai": "2026-08-17", "keterangan": "HUT Proklamasi Kemerdekaan RI ke-81"},
        {"nama": "Maulid Nabi Muhammad SAW", "kategori": "libur_nasional", "tanggal_mulai": "2026-08-25", "tanggal_selesai": "2026-08-25", "keterangan": "Peringatan Maulid Nabi Muhammad SAW"},
        {"nama": "Hari Raya Natal", "kategori": "libur_nasional", "tanggal_mulai": "2026-12-25", "tanggal_selesai": "2026-12-25", "keterangan": "Hari Raya Natal 2026"}
    ]
}


def _clean_text(text: str) -> str:
    """Membersihkan karakter encoding tidak valid seperti \ufffd atau curly quote menjadi apostrof standar."""
    if not text:
        return ""
    return text.replace('\ufffd', "'").replace('\u2019', "'").replace('\u2018', "'").replace('`', "'").strip()


def _fetch_from_api_hari_libur(year: int) -> list:
    """
    Mengambil data hari libur nasional & cuti bersama resmi dari endpoint:
    https://api-hari-libur.vercel.app/api?year={year}
    """
    url = f"https://api-hari-libur.vercel.app/api?year={year}"
    req = urllib.request.Request(url, headers={'User-Agent': 'SMKN21-Absensi/2.0 (Windows)'})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                raw_data = response.read().decode('utf-8')
                parsed = json.loads(raw_data)
                items = parsed.get('data', []) if isinstance(parsed, dict) else (parsed if isinstance(parsed, list) else [])
                
                result = []
                for idx, item in enumerate(items):
                    d_str = item.get('date', '')
                    raw_desc = _clean_text(item.get('description', '') or item.get('name', ''))
                    if not d_str or not raw_desc:
                        continue
                    
                    is_cuti = 'cuti bersama' in raw_desc.lower()
                    kategori = "cuti_bersama" if is_cuti else "libur_nasional"
                    
                    result.append({
                        "id": f"api_{d_str}_{idx}",
                        "nama": raw_desc,
                        "kategori": kategori,
                        "tanggal_mulai": d_str,
                        "tanggal_selesai": d_str,
                        "tipe_hari": "libur",
                        "keterangan": f"Kalender Resmi API SKB 3 Menteri ({raw_desc})",
                        "is_active": True,
                        "is_builtin": True,
                        "lampiran_surat": None,
                        "nama_file_surat": None,
                        "sumber": "API api-hari-libur.vercel.app"
                    })
                return result
    except Exception as e:
        logger.warning(f"Gagal mengambil hari libur dari api-hari-libur untuk tahun {year}: {e}")
    return []


def _fetch_from_nager_date(year: int) -> list:
    """
    Fallback sekunder dari Nager.Date API (Internasional & stabil):
    https://date.nager.at/api/v3/PublicHolidays/{year}/ID
    """
    url = f"https://date.nager.at/api/v3/PublicHolidays/{year}/ID"
    req = urllib.request.Request(url, headers={'User-Agent': 'SMKN21-Absensi/2.0 (Windows)'})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                raw_data = response.read().decode('utf-8')
                items = json.loads(raw_data)
                if not isinstance(items, list):
                    return []
                
                result = []
                for idx, item in enumerate(items):
                    d_str = item.get('date', '')
                    nama_lokal = _clean_text(item.get('localName', '') or item.get('name', ''))
                    if not d_str or not nama_lokal:
                        continue
                    
                    is_cuti = 'cuti bersama' in nama_lokal.lower()
                    kategori = "cuti_bersama" if is_cuti else "libur_nasional"
                    
                    result.append({
                        "id": f"nager_{d_str}_{idx}",
                        "nama": nama_lokal,
                        "kategori": kategori,
                        "tanggal_mulai": d_str,
                        "tanggal_selesai": d_str,
                        "tipe_hari": "libur",
                        "keterangan": f"Kalender Nasional Resmi (Nager.Date API: {nama_lokal})",
                        "is_active": True,
                        "is_builtin": True,
                        "lampiran_surat": None,
                        "nama_file_surat": None,
                        "sumber": "API Nager.Date"
                    })
                return result
    except Exception as e:
        logger.warning(f"Gagal mengambil hari libur dari Nager.Date untuk tahun {year}: {e}")
    return []


def _read_disk_cache(year: int) -> list | None:
    cache_file = os.path.join(CACHE_DIR, f"holidays_{year}.json")
    if not os.path.exists(cache_file):
        return None
    try:
        with open(cache_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Cek apakah cache belum kedaluwarsa (maks 7 hari)
            saved_at = data.get("cached_at")
            if saved_at:
                saved_dt = datetime.fromisoformat(saved_at)
                if datetime.now() - saved_dt < timedelta(days=7):
                    return data.get("holidays", [])
            return data.get("holidays", [])
    except Exception as e:
        logger.warning(f"Gagal membaca cache berkas hari libur {year}: {e}")
        return None


def _write_disk_cache(year: int, holidays: list):
    cache_file = os.path.join(CACHE_DIR, f"holidays_{year}.json")
    try:
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump({
                "year": year,
                "cached_at": datetime.now().isoformat(),
                "total": len(holidays),
                "holidays": holidays
            }, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"Gagal menyimpan cache berkas hari libur {year}: {e}")


def get_national_holidays_for_year(year: int, force_refresh: bool = False) -> list:
    """
    Mengambil daftar hari libur nasional resmi untuk suatu tahun.
    Alur prioritas:
    1. Memory Cache (jika belum kedaluwarsa & tidak force_refresh)
    2. API Publik Utama (api-hari-libur.vercel.app)
    3. API Publik Sekunder (date.nager.at)
    4. Disk Cache lokal (static/cache_holidays/holidays_{year}.json)
    5. Fallback baseline offline
    """
    now = datetime.now()

    # 1. Cek Memory Cache
    if not force_refresh and year in _MEMORY_CACHE:
        cache_entry = _MEMORY_CACHE[year]
        if now - cache_entry["timestamp"] < timedelta(hours=CACHE_TTL_HOURS):
            return cache_entry["data"]

    holidays = []

    # 2. Coba fetch dari API Publik Utama
    try:
        holidays = _fetch_from_api_hari_libur(year)
    except Exception as e:
        logger.warning(f"Error fetch API utama: {e}")

    # 3. Jika API utama kosong / gagal, coba API sekunder
    if not holidays:
        try:
            holidays = _fetch_from_nager_date(year)
        except Exception as e:
            logger.warning(f"Error fetch API sekunder: {e}")

    # Jika berhasil dari API, simpan ke cache memori dan disk
    if holidays:
        _MEMORY_CACHE[year] = {"data": holidays, "timestamp": now}
        _write_disk_cache(year, holidays)
        return holidays

    # 4. Jika offline / API gagal, coba baca dari Disk Cache
    disk_data = _read_disk_cache(year)
    if disk_data:
        _MEMORY_CACHE[year] = {"data": disk_data, "timestamp": now}
        return disk_data

    # 5. Fallback baseline offline jika ada di katalog dasar
    baseline = OFFLINE_BASELINE_HOLIDAYS.get(year, [])
    fallback_result = []
    for idx, b in enumerate(baseline):
        fallback_result.append({
            "id": f"offline_{year}_{idx}",
            "nama": b["nama"],
            "kategori": b.get("kategori", "libur_nasional"),
            "tanggal_mulai": b["tanggal_mulai"],
            "tanggal_selesai": b["tanggal_selesai"],
            "tipe_hari": "libur",
            "keterangan": b.get("keterangan", "Kalender Libur Nasional (Katalog Offline)"),
            "is_active": True,
            "is_builtin": True,
            "lampiran_surat": None,
            "nama_file_surat": None,
            "sumber": "Katalog Cadangan Offline"
        })

    if fallback_result:
        _MEMORY_CACHE[year] = {"data": fallback_result, "timestamp": now}
        return fallback_result

    return []


def get_national_holiday_on_date(target_date) -> dict | None:
    """
    Mengecek apakah tanggal tertentu merupakan hari libur nasional atau cuti bersama resmi.
    target_date dapat berupa datetime.date, datetime.datetime, atau string 'YYYY-MM-DD'.
    Mengembalikan dict data hari libur jika cocok, atau None jika bukan hari libur.
    """
    if target_date is None:
        return None

    if isinstance(target_date, datetime):
        cur_date = target_date.date()
    elif isinstance(target_date, str):
        try:
            cur_date = datetime.strptime(target_date[:10], "%Y-%m-%d").date()
        except Exception:
            return None
    elif isinstance(target_date, date):
        cur_date = target_date
    else:
        return None

    cur_date_str = cur_date.strftime("%Y-%m-%d")
    year = cur_date.year

    holidays = get_national_holidays_for_year(year)
    for h in holidays:
        tgl_m = h.get("tanggal_mulai")
        tgl_s = h.get("tanggal_selesai") or tgl_m
        if tgl_m and tgl_s:
            if tgl_m <= cur_date_str <= tgl_s:
                return h

    return None
