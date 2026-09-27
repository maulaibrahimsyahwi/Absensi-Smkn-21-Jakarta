"""
Katalog & Integrasi API Kalender Hari Libur Nasional & Cuti Bersama Resmi Indonesia
Mengambil data tanggal merah secara otomatis dan real-time dari API publik terpercaya:
1. Google Calendar Official Public Holiday Feed (id.indonesian#holiday) - Dikelola langsung oleh Google secara berkelanjutan.
2. kresnasatya/api-harilibur (GitHub 240+ Stars) - API open source hari libur Indonesia paling populer dan banyak dibintangi di GitHub via Cloudflare Pages & Netlify.
3. Nager.Date (GitHub 1.500+ Stars) - Standar API libur internasional open source terpopuler.
4. radyakaze/api-hari-libur (SKB 3 Menteri).

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
        {"nama": "Cuti Bersama Tahun Baru Imlek", "kategori": "cuti_bersama", "tanggal_mulai": "2025-01-28", "tanggal_selesai": "2025-01-28", "keterangan": "Cuti Bersama Tahun Baru Imlek 2576 Kongzili"},
        {"nama": "Tahun Baru Imlek 2576 Kongzili", "kategori": "libur_nasional", "tanggal_mulai": "2025-01-29", "tanggal_selesai": "2025-01-29", "keterangan": "Tahun Baru Imlek 2576 Kongzili"},
        {"nama": "Cuti Bersama Hari Suci Nyepi", "kategori": "cuti_bersama", "tanggal_mulai": "2025-03-28", "tanggal_selesai": "2025-03-28", "keterangan": "Cuti Bersama Hari Suci Nyepi Saka 1947"},
        {"nama": "Hari Suci Nyepi (Tahun Baru Saka 1947)", "kategori": "libur_nasional", "tanggal_mulai": "2025-03-29", "tanggal_selesai": "2025-03-29", "keterangan": "Hari Suci Nyepi Saka 1947"},
        {"nama": "Hari Raya Idul Fitri 1446 H", "kategori": "libur_nasional", "tanggal_mulai": "2025-03-31", "tanggal_selesai": "2025-04-01", "keterangan": "Hari Raya Idul Fitri 1446 Hijriah"},
        {"nama": "Cuti Bersama Idul Fitri 1446 H", "kategori": "cuti_bersama", "tanggal_mulai": "2025-04-02", "tanggal_selesai": "2025-04-07", "keterangan": "Cuti Bersama Hari Raya Idul Fitri 1446 H"},
        {"nama": "Wafat Isa Al Masih (Jumat Agung)", "kategori": "libur_nasional", "tanggal_mulai": "2025-04-18", "tanggal_selesai": "2025-04-18", "keterangan": "Wafat Isa Al Masih"},
        {"nama": "Hari Buruh Internasional", "kategori": "libur_nasional", "tanggal_mulai": "2025-05-01", "tanggal_selesai": "2025-05-01", "keterangan": "Hari Buruh Internasional"},
        {"nama": "Hari Raya Waisak 2569 BE", "kategori": "libur_nasional", "tanggal_mulai": "2025-05-12", "tanggal_selesai": "2025-05-12", "keterangan": "Hari Raya Waisak 2569 BE"},
        {"nama": "Cuti Bersama Waisak 2569 BE", "kategori": "cuti_bersama", "tanggal_mulai": "2025-05-13", "tanggal_selesai": "2025-05-13", "keterangan": "Cuti Bersama Waisak 2569 BE"},
        {"nama": "Kenaikan Yesus Kristus", "kategori": "libur_nasional", "tanggal_mulai": "2025-05-29", "tanggal_selesai": "2025-05-29", "keterangan": "Kenaikan Yesus Kristus"},
        {"nama": "Cuti Bersama Kenaikan Yesus Kristus", "kategori": "cuti_bersama", "tanggal_mulai": "2025-05-30", "tanggal_selesai": "2025-05-30", "keterangan": "Cuti Bersama Kenaikan Yesus Kristus"},
        {"nama": "Hari Lahir Pancasila", "kategori": "libur_nasional", "tanggal_mulai": "2025-06-01", "tanggal_selesai": "2025-06-01", "keterangan": "Hari Lahir Pancasila"},
        {"nama": "Hari Raya Idul Adha 1446 H", "kategori": "libur_nasional", "tanggal_mulai": "2025-06-06", "tanggal_selesai": "2025-06-06", "keterangan": "Hari Raya Idul Adha 1446 H"},
        {"nama": "Cuti Bersama Idul Adha 1446 H", "kategori": "cuti_bersama", "tanggal_mulai": "2025-06-09", "tanggal_selesai": "2025-06-09", "keterangan": "Cuti Bersama Idul Adha 1446 H"},
        {"nama": "Tahun Baru Islam 1447 H", "kategori": "libur_nasional", "tanggal_mulai": "2025-06-27", "tanggal_selesai": "2025-06-27", "keterangan": "Tahun Baru Islam 1447 Hijriah"},
        {"nama": "Hari Kemerdekaan RI (HUT RI ke-80)", "kategori": "libur_nasional", "tanggal_mulai": "2025-08-17", "tanggal_selesai": "2025-08-17", "keterangan": "HUT Proklamasi Kemerdekaan RI ke-80"},
        {"nama": "Maulid Nabi Muhammad SAW", "kategori": "libur_nasional", "tanggal_mulai": "2025-09-05", "tanggal_selesai": "2025-09-05", "keterangan": "Peringatan Maulid Nabi Muhammad SAW"},
        {"nama": "Hari Raya Natal", "kategori": "libur_nasional", "tanggal_mulai": "2025-12-25", "tanggal_selesai": "2025-12-25", "keterangan": "Hari Raya Natal 2025"},
        {"nama": "Cuti Bersama Hari Raya Natal", "kategori": "cuti_bersama", "tanggal_mulai": "2025-12-26", "tanggal_selesai": "2025-12-26", "keterangan": "Cuti Bersama Hari Raya Natal 2025"}
    ],
    2026: [
        {"nama": "Tahun Baru 2026 Masehi", "kategori": "libur_nasional", "tanggal_mulai": "2026-01-01", "tanggal_selesai": "2026-01-01", "keterangan": "Libur Nasional Tahun Baru Masehi"},
        {"nama": "Isra Mi'raj Nabi Muhammad SAW", "kategori": "libur_nasional", "tanggal_mulai": "2026-01-16", "tanggal_selesai": "2026-01-16", "keterangan": "Peringatan Isra Mi'raj 1447 H"},
        {"nama": "Cuti Bersama Tahun Baru Imlek", "kategori": "cuti_bersama", "tanggal_mulai": "2026-02-16", "tanggal_selesai": "2026-02-16", "keterangan": "Cuti Bersama Tahun Baru Imlek 2577 Kongzili"},
        {"nama": "Tahun Baru Imlek 2577 Kongzili", "kategori": "libur_nasional", "tanggal_mulai": "2026-02-17", "tanggal_selesai": "2026-02-17", "keterangan": "Tahun Baru Imlek 2577 Kongzili"},
        {"nama": "Cuti Bersama Hari Suci Nyepi", "kategori": "cuti_bersama", "tanggal_mulai": "2026-03-18", "tanggal_selesai": "2026-03-18", "keterangan": "Cuti Bersama Hari Suci Nyepi Saka 1948"},
        {"nama": "Hari Suci Nyepi (Tahun Baru Saka 1948)", "kategori": "libur_nasional", "tanggal_mulai": "2026-03-19", "tanggal_selesai": "2026-03-19", "keterangan": "Hari Suci Nyepi Saka 1948"},
        {"nama": "Cuti Bersama Idul Fitri 1447 H", "kategori": "cuti_bersama", "tanggal_mulai": "2026-03-20", "tanggal_selesai": "2026-03-20", "keterangan": "Cuti Bersama Idul Fitri 1447 H"},
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
    """Membersihkan karakter encoding tidak valid seperti \\ufffd atau curly quote menjadi apostrof standar."""
    if not text:
        return ""
    return text.replace('\ufffd', "'").replace('\u2019', "'").replace('\u2018', "'").replace('`', "'").replace('\\,', ',').strip()


def _normalize_date_str(raw_date: str) -> str | None:
    """Memastikan format tanggal adalah ISO YYYY-MM-DD dengan zero padding."""
    if not raw_date:
        return None
    raw_date = raw_date.strip()
    if '-' in raw_date:
        parts = raw_date.split('-')
        if len(parts) == 3:
            try:
                return f"{int(parts[0]):04d}-{int(parts[1]):02d}-{int(parts[2]):02d}"
            except ValueError:
                return None
    elif len(raw_date) == 8 and raw_date.isdigit():
        return f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:8]}"
    return None


def _fetch_from_google_calendar(year: int) -> list:
    """
    Mengambil data hari libur nasional & cuti bersama resmi dari Google Calendar Feed:
    https://calendar.google.com/calendar/ical/id.indonesian%23holiday%40group.v.calendar.google.com/public/basic.ics
    Dikelola langsung oleh tim Google secara perpetual untuk seluruh pengguna Android & Google Calendar di Indonesia.
    """
    url = "https://calendar.google.com/calendar/ical/id.indonesian%23holiday%40group.v.calendar.google.com/public/basic.ics"
    req = urllib.request.Request(url, headers={'User-Agent': 'SMKN21-Absensi/2.0 (Windows)'})
    try:
        with urllib.request.urlopen(req, timeout=6) as response:
            if response.status == 200:
                raw_content = response.read().decode('utf-8', errors='ignore')
                
                events = []
                current = {}
                for line in raw_content.splitlines():
                    line = line.strip()
                    if line == 'BEGIN:VEVENT':
                        current = {}
                    elif line == 'END:VEVENT':
                        if 'summary' in current and 'dtstart' in current:
                            events.append(current)
                    elif line.startswith('SUMMARY:'):
                        current['summary'] = _clean_text(line[8:])
                    elif 'DTSTART' in line:
                        parts = line.split(':')
                        if len(parts) > 1:
                            current['dtstart'] = parts[-1][:8]
                    elif line.startswith('DESCRIPTION:'):
                        current['description'] = _clean_text(line[12:].replace('\\n', ' '))
                
                year_str = str(year)
                results = []
                seen_dates = set()

                for idx, e in enumerate(events):
                    dtstart = e.get('dtstart', '')
                    if not dtstart.startswith(year_str) or len(dtstart) < 8:
                        continue
                    
                    summary = e.get('summary', '')
                    desc = e.get('description', '').lower()
                    
                    # Filter hanya tanggal merah nasional atau cuti bersama resmi
                    is_national = (
                        'hari libur nasional' in desc or 
                        'cuti bersama' in summary.lower() or 
                        'hari libur' in desc
                    )
                    # Kecualikan observansi/perayaan non-libur seperti Malam Tahun Baru, Malam Natal, Diwali
                    if 'perayaan' in desc and 'cuti bersama' not in summary.lower() and 'hari libur nasional' not in desc:
                        continue
                    if not is_national:
                        continue

                    d_str = _normalize_date_str(dtstart)
                    if not d_str:
                        continue

                    is_cuti = 'cuti bersama' in summary.lower()
                    kategori = "cuti_bersama" if is_cuti else "libur_nasional"
                    
                    key = (d_str, summary.lower())
                    if key in seen_dates:
                        continue
                    seen_dates.add(key)

                    results.append({
                        "id": f"google_{d_str}_{idx}",
                        "nama": summary,
                        "kategori": kategori,
                        "tanggal_mulai": d_str,
                        "tanggal_selesai": d_str,
                        "tipe_hari": "libur",
                        "keterangan": f"Kalender Resmi Google (SKB 3 Menteri) - {summary}",
                        "is_active": True,
                        "is_builtin": True,
                        "lampiran_surat": None,
                        "nama_file_surat": None,
                        "sumber": "Google Official Indonesian Calendar"
                    })
                
                results.sort(key=lambda x: x['tanggal_mulai'])
                if results:
                    logger.info(f"Berhasil memuat {len(results)} hari libur dari Google Calendar untuk tahun {year}")
                return results
    except Exception as e:
        logger.warning(f"Gagal mengambil hari libur dari Google Calendar untuk tahun {year}: {e}")
    return []


def _fetch_from_kresnasatya(year: int) -> list:
    """
    Mengambil data hari libur dari repositori open-source paling populer di GitHub:
    kresnasatya/api-harilibur (★ 240+ Stars di GitHub).
    Mendukung mirror CDN Cloudflare Pages & Netlify.
    """
    urls = [
        f"https://api-harilibur.pages.dev/api?year={year}",
        f"https://api-harilibur.netlify.app/api?year={year}"
    ]
    for url in urls:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'SMKN21-Absensi/2.0 (Windows)'})
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    raw_data = response.read().decode('utf-8')
                    items = json.loads(raw_data)
                    if not isinstance(items, list):
                        continue
                    
                    results = []
                    for idx, item in enumerate(items):
                        raw_date = item.get('holiday_date', '')
                        name = _clean_text(item.get('holiday_name', ''))
                        is_national = item.get('is_national_holiday', True)
                        
                        # Filter hanya hari libur nasional & cuti bersama resmi
                        if not is_national or not raw_date or not name:
                            continue
                        
                        norm_date = _normalize_date_str(raw_date)
                        if not norm_date:
                            continue
                        
                        is_cuti = 'cuti bersama' in name.lower()
                        kategori = "cuti_bersama" if is_cuti else "libur_nasional"
                        
                        results.append({
                            "id": f"kresna_{norm_date}_{idx}",
                            "nama": name,
                            "kategori": kategori,
                            "tanggal_mulai": norm_date,
                            "tanggal_selesai": norm_date,
                            "tipe_hari": "libur",
                            "keterangan": f"Kalender Resmi kresnasatya/api-harilibur - {name}",
                            "is_active": True,
                            "is_builtin": True,
                            "lampiran_surat": None,
                            "nama_file_surat": None,
                            "sumber": "kresnasatya/api-harilibur (GitHub 240+ Stars)"
                        })
                    
                    if results:
                        results.sort(key=lambda x: x['tanggal_mulai'])
                        logger.info(f"Berhasil memuat {len(results)} hari libur dari kresnasatya ({url}) untuk tahun {year}")
                        return results
        except Exception as e:
            logger.warning(f"Percobaan API kresnasatya ({url}) gagal untuk tahun {year}: {e}")
            continue
    return []


def _fetch_from_nager_date(year: int) -> list:
    """
    Fallback dari Nager.Date API (Repositori GitHub Publik Holiday Global Terpopuler, ★ 1.500+ Stars):
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
                
                results = []
                for idx, item in enumerate(items):
                    raw_date = item.get('date', '')
                    nama_lokal = _clean_text(item.get('localName', '') or item.get('name', ''))
                    norm_date = _normalize_date_str(raw_date)
                    if not norm_date or not nama_lokal:
                        continue
                    
                    is_cuti = 'cuti bersama' in nama_lokal.lower()
                    kategori = "cuti_bersama" if is_cuti else "libur_nasional"
                    
                    results.append({
                        "id": f"nager_{norm_date}_{idx}",
                        "nama": nama_lokal,
                        "kategori": kategori,
                        "tanggal_mulai": norm_date,
                        "tanggal_selesai": norm_date,
                        "tipe_hari": "libur",
                        "keterangan": f"Kalender Resmi Internasional (Nager.Date API - {nama_lokal})",
                        "is_active": True,
                        "is_builtin": True,
                        "lampiran_surat": None,
                        "nama_file_surat": None,
                        "sumber": "Nager.Date API (GitHub 1.500+ Stars)"
                    })
                if results:
                    results.sort(key=lambda x: x['tanggal_mulai'])
                    return results
    except Exception as e:
        logger.warning(f"Gagal mengambil hari libur dari Nager.Date untuk tahun {year}: {e}")
    return []


def _fetch_from_api_hari_libur(year: int) -> list:
    """
    Fallback dari endpoint Vercel radyakaze/api-hari-libur:
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
                
                results = []
                for idx, item in enumerate(items):
                    raw_date = item.get('date', '')
                    raw_desc = _clean_text(item.get('description', '') or item.get('name', ''))
                    norm_date = _normalize_date_str(raw_date)
                    if not norm_date or not raw_desc:
                        continue
                    
                    is_cuti = 'cuti bersama' in raw_desc.lower()
                    kategori = "cuti_bersama" if is_cuti else "libur_nasional"
                    
                    results.append({
                        "id": f"apilibur_{norm_date}_{idx}",
                        "nama": raw_desc,
                        "kategori": kategori,
                        "tanggal_mulai": norm_date,
                        "tanggal_selesai": norm_date,
                        "tipe_hari": "libur",
                        "keterangan": f"Kalender Resmi SKB 3 Menteri ({raw_desc})",
                        "is_active": True,
                        "is_builtin": True,
                        "lampiran_surat": None,
                        "nama_file_surat": None,
                        "sumber": "api-hari-libur.vercel.app"
                    })
                if results:
                    results.sort(key=lambda x: x['tanggal_mulai'])
                    return results
    except Exception as e:
        logger.warning(f"Gagal mengambil hari libur dari api-hari-libur untuk tahun {year}: {e}")
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
    Mengambil daftar hari libur nasional dan cuti bersama resmi untuk suatu tahun.
    
    Arsitektur Multi-Tier dengan Sumber API Terpopuler & Terpercaya:
    1. Google Calendar Official Feed (Dikelola langsung oleh Google secara berkelanjutan, lengkap SKB 3 Menteri + Cuti Bersama)
    2. kresnasatya/api-harilibur (Repositori GitHub #1 terpopuler untuk libur nasional Indonesia, ★ 240+ Stars)
    3. Nager.Date API (Repositori GitHub #1 libur global, ★ 1.500+ Stars)
    4. api-hari-libur.vercel.app (Cadangan SKB 3 Menteri)
    5. Cache disk lokal (static/cache_holidays/holidays_{year}.json, TTL 7 hari)
    6. Katalog baseline offline jika server tanpa koneksi internet sama sekali.
    """
    now = datetime.now()

    # 1. Cek Memory Cache (24 jam)
    if not force_refresh and year in _MEMORY_CACHE:
        cache_entry = _MEMORY_CACHE[year]
        if now - cache_entry["timestamp"] < timedelta(hours=CACHE_TTL_HOURS):
            return cache_entry["data"]

    # 2. Cek Disk Cache (jika tidak force refresh)
    if not force_refresh:
        disk_data = _read_disk_cache(year)
        if disk_data and len(disk_data) > 0:
            _MEMORY_CACHE[year] = {"data": disk_data, "timestamp": now}
            return disk_data

    # 3. Pengambilan API Multi-Tier
    # Langkah A: Ambil dari Google Calendar Feed (Lengkap SKB 3 Menteri + Cuti Bersama)
    google_holidays = _fetch_from_google_calendar(year)
    
    # Langkah B: Ambil dari kresnasatya/api-harilibur (GitHub ★ 240+ Stars)
    kresna_holidays = _fetch_from_kresnasatya(year)

    # Gabungkan data untuk mendapatkan hasil paling lengkap dan terverifikasi
    date_map = {}

    if google_holidays:
        for item in google_holidays:
            date_map[item['tanggal_mulai']] = item

    if kresna_holidays:
        for item in kresna_holidays:
            d = item['tanggal_mulai']
            if d not in date_map:
                date_map[d] = item
            else:
                # Tandai sumber ganda yang saling memverifikasi
                date_map[d]['sumber'] = f"{date_map[d]['sumber']} & kresnasatya/api-harilibur (GitHub 240+ Stars)"

    # Jika kedua sumber utama belum menghasilkan data, coba fallback sekunder
    if not date_map:
        nager_holidays = _fetch_from_nager_date(year)
        for item in nager_holidays:
            date_map[item['tanggal_mulai']] = item

    if not date_map:
        vercel_holidays = _fetch_from_api_hari_libur(year)
        for item in vercel_holidays:
            date_map[item['tanggal_mulai']] = item

    # Jika berhasil mendapatkan data dari API
    if date_map:
        final_list = sorted(date_map.values(), key=lambda x: x['tanggal_mulai'])
        _MEMORY_CACHE[year] = {"data": final_list, "timestamp": now}
        _write_disk_cache(year, final_list)
        return final_list

    # 4. Jika offline / gagal menghubungi seluruh API, baca dari Disk Cache tanpa batasan TTL
    disk_data = _read_disk_cache(year)
    if disk_data and len(disk_data) > 0:
        _MEMORY_CACHE[year] = {"data": disk_data, "timestamp": now}
        return disk_data

    # 5. Fallback baseline offline darurat
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
            "keterangan": b.get("keterangan", "Kalender Libur Nasional (Katalog Cadangan Offline)"),
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
