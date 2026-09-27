import os
import io
import csv
import uuid
import openpyxl
from datetime import datetime, date, timedelta
from flask import Blueprint, request, jsonify, send_file, send_from_directory
from config import BASE_DIR
from models import db, HariLibur, AuditLog
from utils.auth_middleware import token_required, role_required
from utils.helpers import get_holiday_status, is_school_day
from utils.national_holidays import get_national_holidays_for_year

libur_bp = Blueprint('libur', __name__)

UPLOAD_EDARAN_DIR = os.path.join(BASE_DIR, 'static', 'uploads', 'surat_edaran')
os.makedirs(UPLOAD_EDARAN_DIR, exist_ok=True)

def parse_date_flexible(val):
    if val is None or val == '':
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    if isinstance(val, (int, float)):
        try:
            # Excel serial date (Windows 1900 date system)
            return (date(1899, 12, 30) + timedelta(days=int(val)))
        except Exception:
            pass

    val_str = str(val).strip()
    if not val_str:
        return None

    # Handle string with time part or ISO 'T': "2026-06-23 00:00:00" or "2026-06-23T00:00:00"
    date_part = val_str.split()[0].split('T')[0].strip()

    formats = [
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%d-%m-%Y",
        "%Y/%m/%d",
        "%d.%m.%Y",
        "%Y.%m.%d",
        "%d/%m/%y",
        "%d-%m-%y",
        "%m/%d/%Y",
        "%m-%d-%Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_part, fmt).date()
        except ValueError:
            pass

    full_formats = [
        "%Y-%m-%d %H:%M:%S",
        "%d/%m/%Y %H:%M:%S",
        "%d-%m-%Y %H:%M:%S",
        "%Y/%m/%d %H:%M:%S",
    ]
    for fmt in full_formats:
        try:
            return datetime.strptime(val_str, fmt).date()
        except ValueError:
            pass

    # Support Indonesian month names: "23 Juni 2026", "23 Jun 2026", "23-Juni-2026"
    bulan_map = {
        'januari': '01', 'jan': '01',
        'februari': '02', 'feb': '02',
        'maret': '03', 'mar': '03',
        'april': '04', 'apr': '04',
        'mei': '05', 'may': '05',
        'juni': '06', 'jun': '06',
        'juli': '07', 'jul': '07',
        'agustus': '08', 'agu': '08', 'ags': '08',
        'september': '09', 'sep': '09',
        'oktober': '10', 'okt': '10', 'oct': '10',
        'november': '11', 'nov': '11',
        'desember': '12', 'des': '12', 'dec': '12',
    }
    cleaned_lower = val_str.lower().replace('-', ' ').replace('/', ' ')
    parts = cleaned_lower.split()
    if len(parts) >= 3 and parts[0].isdigit() and parts[2].isdigit():
        d_val = parts[0].zfill(2)
        m_word = parts[1]
        y_val = parts[2]
        if m_word in bulan_map:
            m_val = bulan_map[m_word]
            try:
                return datetime.strptime(f"{y_val}-{m_val}-{d_val}", "%Y-%m-%d").date()
            except Exception:
                pass

    return None

@libur_bp.route('/api/hari_libur', methods=['GET'])
@token_required
def get_hari_libur_list():
    """
    Mengambil daftar seluruh jadwal libur dan hari masuk khusus.
    Otomatis menyertakan tanggal merah libur nasional resmi (SKB 3 Menteri)
    untuk tahun yang dipilih tanpa perlu sinkronisasi manual.
    """
    try:
        tahun = request.args.get('tahun')
        active_only = request.args.get('active_only', 'false').lower() == 'true'

        current_year = datetime.now().year
        try:
            tahun_int = int(tahun) if tahun else current_year
        except ValueError:
            tahun_int = current_year

        query = HariLibur.query

        if active_only:
            query = query.filter(HariLibur.is_active == True)

        start_year = date(tahun_int, 1, 1)
        end_year = date(tahun_int, 12, 31)
        query = query.filter(
            (HariLibur.tanggal_mulai <= end_year) & (HariLibur.tanggal_selesai >= start_year)
        )

        db_records = query.order_by(HariLibur.tanggal_mulai.asc()).all()
        db_list = [r.to_dict() for r in db_records]

        # Ambil tanggal merah nasional bawaan untuk tahun terpilih
        builtin_holidays = get_national_holidays_for_year(tahun_int)

        # Cek tanggal yang sudah terdaftar di database sekolah agar tidak dobel
        existing_covered_dates = set()
        for r in db_list:
            t_m = r.get("tanggal_mulai")
            if t_m:
                existing_covered_dates.add(t_m)

        merged_list = list(db_list)
        for idx, item in enumerate(builtin_holidays):
            tgl_m = item.get("tanggal_mulai")
            if tgl_m not in existing_covered_dates:
                merged_list.append({
                    "id": f"auto_{tahun_int}_{idx}",
                    "nama": item["nama"],
                    "kategori": item.get("kategori", "libur_nasional"),
                    "tanggal_mulai": item["tanggal_mulai"],
                    "tanggal_selesai": item["tanggal_selesai"],
                    "tipe_hari": "libur",
                    "keterangan": item.get("keterangan", "Kalender Nasional Resmi (SKB 3 Menteri)"),
                    "is_active": True,
                    "is_builtin": True,
                    "lampiran_surat": None,
                    "nama_file_surat": None,
                    "created_by": "Kalender Nasional Otomatis"
                })

        # Urutkan berdasarkan tanggal mulai
        merged_list.sort(key=lambda x: str(x.get("tanggal_mulai", "")))
        return jsonify(merged_list), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Gagal mengambil kalender libur: {str(e)}"}), 500


@libur_bp.route('/api/hari_libur/status_today', methods=['GET'])
@token_required
def check_status_today():
    """
    Mengambil status operasional sekolah untuk hari ini (apakah libur semester,
    libur nasional, akhir pekan, atau hari sekolah aktif).
    """
    try:
        now_dt = datetime.now()
        status = get_holiday_status(now_dt)
        return jsonify({
            "success": True,
            "tanggal": now_dt.strftime("%Y-%m-%d"),
            **status
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@libur_bp.route('/api/hari_libur', methods=['POST'])
@token_required
@role_required(['admin'])
def create_hari_libur():
    """
    Menambahkan agenda hari libur baru atau hari masuk khusus (Admin Only).
    """
    data = request.get_json() or {}
    nama = str(data.get('nama', '')).strip()
    kategori = str(data.get('kategori', 'libur_semester')).strip()
    tgl_mulai_str = data.get('tanggal_mulai')
    tgl_selesai_str = data.get('tanggal_selesai') or tgl_mulai_str
    tipe_hari = str(data.get('tipe_hari', 'libur')).strip()
    keterangan = str(data.get('keterangan', '')).strip()
    lampiran_surat = data.get('lampiran_surat')
    nama_file_surat = data.get('nama_file_surat')
    is_active = data.get('is_active', True)

    if not nama:
        return jsonify({"success": False, "message": "Nama hari libur / kegiatan wajib diisi."}), 400

    if not tgl_mulai_str:
        return jsonify({"success": False, "message": "Tanggal mulai wajib ditentukan."}), 400

    try:
        tgl_mulai = datetime.strptime(tgl_mulai_str, "%Y-%m-%d").date()
        tgl_selesai = datetime.strptime(tgl_selesai_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"success": False, "message": "Format tanggal harus YYYY-MM-DD."}), 400

    if tgl_selesai < tgl_mulai:
        return jsonify({"success": False, "message": "Tanggal selesai tidak boleh lebih awal dari tanggal mulai."}), 400

    current_u = getattr(request, 'current_user', {})
    admin_name = current_u.get('nama', 'Administrator')

    try:
        new_libur = HariLibur(
            nama=nama,
            kategori=kategori,
            tanggal_mulai=tgl_mulai,
            tanggal_selesai=tgl_selesai,
            tipe_hari=tipe_hari,
            keterangan=keterangan,
            lampiran_surat=lampiran_surat,
            nama_file_surat=nama_file_surat,
            is_active=bool(is_active),
            created_by=admin_name
        )
        db.session.add(new_libur)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Berhasil menambahkan '{nama}' ke kalender sekolah.",
            "data": new_libur.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Gagal menyimpan data libur: {str(e)}"}), 500


@libur_bp.route('/api/hari_libur/<int:id>', methods=['PUT'])
@token_required
@role_required(['admin'])
def update_hari_libur(id):
    """
    Mengubah atau menggeser tanggal hari libur (Admin Only).
    """
    record = HariLibur.query.get(id)
    if not record:
        return jsonify({"success": False, "message": "Data hari libur tidak ditemukan."}), 404

    data = request.get_json() or {}
    nama = data.get('nama')
    kategori = data.get('kategori')
    tgl_mulai_str = data.get('tanggal_mulai')
    tgl_selesai_str = data.get('tanggal_selesai')
    tipe_hari = data.get('tipe_hari')
    keterangan = data.get('keterangan')
    is_active = data.get('is_active')

    if 'lampiran_surat' in data:
        record.lampiran_surat = data.get('lampiran_surat')
    if 'nama_file_surat' in data:
        record.nama_file_surat = data.get('nama_file_surat')

    if nama is not None:
        nama = str(nama).strip()
        if not nama:
            return jsonify({"success": False, "message": "Nama hari libur tidak boleh kosong."}), 400
        record.nama = nama

    if kategori is not None:
        record.kategori = str(kategori).strip()

    if tipe_hari is not None:
        record.tipe_hari = str(tipe_hari).strip()

    if keterangan is not None:
        record.keterangan = str(keterangan).strip()

    if is_active is not None:
        record.is_active = bool(is_active)

    try:
        if tgl_mulai_str:
            record.tanggal_mulai = datetime.strptime(tgl_mulai_str, "%Y-%m-%d").date()
        if tgl_selesai_str:
            record.tanggal_selesai = datetime.strptime(tgl_selesai_str, "%Y-%m-%d").date()
        elif tgl_mulai_str and not tgl_selesai_str and record.tanggal_selesai < record.tanggal_mulai:
            record.tanggal_selesai = record.tanggal_mulai

        if record.tanggal_selesai < record.tanggal_mulai:
            return jsonify({"success": False, "message": "Tanggal selesai tidak boleh mendahului tanggal mulai."}), 400

        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Data hari libur '{record.nama}' berhasil diperbarui.",
            "data": record.to_dict()
        }), 200
    except ValueError:
        return jsonify({"success": False, "message": "Format tanggal harus YYYY-MM-DD."}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Gagal memperbarui data: {str(e)}"}), 500


@libur_bp.route('/api/hari_libur/<int:id>', methods=['DELETE'])
@token_required
@role_required(['admin'])
def delete_hari_libur(id):
    """
    Menghapus agenda hari libur dari kalender sekolah (Admin Only).
    """
    record = HariLibur.query.get(id)
    if not record:
        return jsonify({"success": False, "message": "Data hari libur tidak ditemukan."}), 404

    try:
        nama = record.nama
        db.session.delete(record)
        db.session.commit()
        return jsonify({"success": True, "message": f"Hari libur '{nama}' berhasil dihapus dari sistem."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Gagal menghapus data: {str(e)}"}), 500


@libur_bp.route('/api/hari_libur/quick_override_today', methods=['POST'])
@token_required
@role_required(['admin'])
def quick_override_today():
    """
    Tombol Cepat Override Hari Ini:
    - 'libur': Meliburkan sekolah hari ini (tutup presensi instan).
    - 'masuk_khusus': Mewajibkan hadir hari ini (misal upacara di tanggal merah/weekend).
    - 'reset': Mengembalikan status hari ini ke jadwal kalender normal.
    """
    data = request.get_json() or {}
    action = data.get('action')  # "libur", "masuk_khusus", "reset"
    nama = data.get('nama')
    keterangan = data.get('keterangan', '')

    today_date = date.today()
    current_u = getattr(request, 'current_user', {})
    admin_name = current_u.get('nama', 'Administrator')

    try:
        # Cek apakah sudah ada override hari ini
        today_record = HariLibur.query.filter(
            HariLibur.tanggal_mulai == today_date,
            HariLibur.tanggal_selesai == today_date
        ).first()

        if action == 'reset':
            if today_record:
                db.session.delete(today_record)
                db.session.commit()
            return jsonify({
                "success": True,
                "message": "Status hari ini telah dikembalikan ke kalender operasional normal."
            }), 200

        elif action in ['libur', 'masuk_khusus']:
            default_nama = "Diliburkan Khusus Hari Ini" if action == 'libur' else "Kegiatan Wajib Masuk Hari Ini"
            final_nama = nama.strip() if (nama and nama.strip()) else default_nama

            if today_record:
                today_record.nama = final_nama
                today_record.tipe_hari = action
                today_record.kategori = "khusus"
                today_record.keterangan = keterangan
                today_record.is_active = True
                today_record.created_by = admin_name
            else:
                new_override = HariLibur(
                    nama=final_nama,
                    kategori="khusus",
                    tanggal_mulai=today_date,
                    tanggal_selesai=today_date,
                    tipe_hari=action,
                    keterangan=keterangan,
                    is_active=True,
                    created_by=admin_name
                )
                db.session.add(new_override)

            db.session.commit()
            return jsonify({
                "success": True,
                "message": f"Berhasil mengatur status hari ini: {final_nama}."
            }), 200

        else:
            return jsonify({"success": False, "message": "Aksi tidak valid. Pilih 'libur', 'masuk_khusus', atau 'reset'."}), 400

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Gagal mengubah status hari ini: {str(e)}"}), 500


ACADEMIC_PRESETS = {
    2025: [
        {"nama": "Libur Kenaikan Kelas / Akhir TA 2024/2025", "kategori": "libur_semester", "tanggal_mulai": "2025-06-23", "tanggal_selesai": "2025-07-12", "keterangan": "Libur kenaikan kelas semester genap resmi Dinas Pendidikan DKI Jakarta"},
        {"nama": "Libur Semester Ganjil TA 2025/2026", "kategori": "libur_semester", "tanggal_mulai": "2025-12-22", "tanggal_selesai": "2026-01-03", "keterangan": "Libur akhir semester ganjil SMKN 21 Jakarta"},
    ],
    2026: [
        {"nama": "Libur Awal Ramadhan 1447 H", "kategori": "khusus", "tanggal_mulai": "2026-02-18", "tanggal_selesai": "2026-02-21", "keterangan": "Libur awal puasa Ramadhan peserta didik"},
        {"nama": "Libur Kenaikan Kelas / Akhir TA 2025/2026", "kategori": "libur_semester", "tanggal_mulai": "2026-06-22", "tanggal_selesai": "2026-07-11", "keterangan": "Libur kenaikan kelas semester genap resmi Dinas Pendidikan DKI Jakarta"},
        {"nama": "Libur Semester Ganjil TA 2026/2027", "kategori": "libur_semester", "tanggal_mulai": "2026-12-21", "tanggal_selesai": "2027-01-02", "keterangan": "Libur akhir semester ganjil SMKN 21 Jakarta"},
    ],
    2027: [
        {"nama": "Libur Kenaikan Kelas / Akhir TA 2026/2027", "kategori": "libur_semester", "tanggal_mulai": "2027-06-21", "tanggal_selesai": "2027-07-10", "keterangan": "Libur kenaikan kelas semester genap resmi Dinas Pendidikan DKI Jakarta"},
        {"nama": "Libur Semester Ganjil TA 2027/2028", "kategori": "libur_semester", "tanggal_mulai": "2027-12-20", "tanggal_selesai": "2028-01-02", "keterangan": "Libur akhir semester ganjil SMKN 21 Jakarta"},
    ]
}


@libur_bp.route('/api/hari_libur/sync_national', methods=['POST'])
@token_required
@role_required(['admin'])
def sync_national_holidays():
    """
    Sinkronisasi seluruh hari libur nasional & cuti bersama resmi SKB 3 Menteri (Mendukung 2024 - 2030+).
    """
    data = request.get_json() or {}
    tahun = data.get('tahun')
    try:
        tahun_int = int(tahun) if tahun else datetime.now().year
    except ValueError:
        tahun_int = datetime.now().year

    holidays = get_national_holidays_for_year(tahun_int)
    if not holidays:
        return jsonify({
            "success": False,
            "message": f"Data libur nasional resmi untuk tahun {tahun_int} belum tersedia."
        }), 404

    current_u = getattr(request, 'current_user', {})
    admin_name = current_u.get('nama', 'Administrator')

    added_count = 0
    skipped_count = 0

    try:
        for item in holidays:
            tgl_m = datetime.strptime(item["tanggal_mulai"], "%Y-%m-%d").date()
            tgl_s = datetime.strptime(item["tanggal_selesai"], "%Y-%m-%d").date()

            # Cek apakah libur dengan tanggal yang sama sudah ada di database
            exists = HariLibur.query.filter(
                HariLibur.tanggal_mulai == tgl_m,
                HariLibur.tanggal_selesai == tgl_s
            ).first()

            if exists:
                skipped_count += 1
                continue

            new_h = HariLibur(
                nama=item["nama"],
                kategori=item.get("kategori", "libur_nasional"),
                tanggal_mulai=tgl_m,
                tanggal_selesai=tgl_s,
                tipe_hari="libur",
                keterangan=item.get("keterangan", "Kalender Nasional Resmi (SKB 3 Menteri)"),
                is_active=True,
                created_by=f"Auto-Sync ({admin_name})"
            )
            db.session.add(new_h)
            added_count += 1

        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Berhasil menyinkronkan {added_count} hari libur nasional & cuti bersama tahun {tahun_int} ({skipped_count} dilewati karena sudah ada).",
            "tahun": tahun_int,
            "added": added_count,
            "skipped": skipped_count,
            "total": len(holidays)
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Gagal menyinkronkan libur nasional: {str(e)}"}), 500


@libur_bp.route('/api/hari_libur/sync_academic', methods=['POST'])
@token_required
@role_required(['admin'])
def sync_academic_calendar():
    """
    Menambahkan jadwal libur semester (Ganjil & Genap / Kenaikan Kelas) berdasarkan kalender pendidikan resmi DKI Jakarta (1-Klik).
    """
    data = request.get_json() or {}
    tahun = data.get('tahun')
    try:
        tahun_int = int(tahun) if tahun else datetime.now().year
    except ValueError:
        tahun_int = datetime.now().year

    academic_items = ACADEMIC_PRESETS.get(tahun_int, [])
    if not academic_items:
        return jsonify({
            "success": False,
            "message": f"Preset kalender pendidikan untuk tahun {tahun_int} belum tersedia."
        }), 404

    current_u = getattr(request, 'current_user', {})
    admin_name = current_u.get('nama', 'Administrator')

    added_count = 0
    skipped_count = 0

    try:
        for item in academic_items:
            tgl_m = datetime.strptime(item["tanggal_mulai"], "%Y-%m-%d").date()
            tgl_s = datetime.strptime(item["tanggal_selesai"], "%Y-%m-%d").date()

            exists = HariLibur.query.filter(
                HariLibur.tanggal_mulai == tgl_m,
                HariLibur.tanggal_selesai == tgl_s
            ).first()

            if exists:
                skipped_count += 1
                continue

            new_h = HariLibur(
                nama=item["nama"],
                kategori=item["kategori"],
                tanggal_mulai=tgl_m,
                tanggal_selesai=tgl_s,
                tipe_hari="libur",
                keterangan=item.get("keterangan", "Kalender Pendidikan Disdik DKI Jakarta"),
                is_active=True,
                created_by=f"Preset Disdik ({admin_name})"
            )
            db.session.add(new_h)
            added_count += 1

        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Berhasil menambahkan {added_count} jadwal libur semester resmi Dinas Pendidikan untuk tahun {tahun_int}.",
            "tahun": tahun_int,
            "added": added_count,
            "skipped": skipped_count
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Gagal menambahkan libur semester: {str(e)}"}), 500


@libur_bp.route('/api/hari_libur/quick_se', methods=['POST'])
@token_required
@role_required(['admin'])
def quick_surat_edaran():
    """
    Aksi Cepat Surat Edaran Dadakan:
    Menerapkan libur/kegiatan khusus langsung berdasarkan Surat Edaran (Disdik/Kemenag/Kepsek).
    Mendukung opsi target:
    - 'hari_ini': Libur / Masuk khusus hari ini
    - 'besok': Libur / Masuk khusus besok
    - 'rentang': Rentang tanggal sesuai isi surat edaran
    """
    data = request.get_json() or {}
    target = data.get('target', 'hari_ini')
    tipe_hari = data.get('tipe_hari', 'libur')
    kategori = data.get('kategori', 'khusus')
    judul = str(data.get('judul', '')).strip()
    nomor_se = str(data.get('nomor_se', '')).strip()
    keterangan = str(data.get('keterangan', '')).strip()

    today = date.today()
    if target == 'hari_ini':
        tgl_mulai = today
        tgl_selesai = today
        default_judul = "Diliburkan Khusus Hari Ini" if tipe_hari == 'libur' else "Kegiatan Wajib Masuk Hari Ini"
    elif target == 'besok':
        tgl_mulai = today + timedelta(days=1)
        tgl_selesai = tgl_mulai
        default_judul = "Diliburkan Khusus Besok" if tipe_hari == 'libur' else "Kegiatan Wajib Masuk Besok"
    elif target == 'rentang':
        tgl_m_str = data.get('tanggal_mulai')
        tgl_s_str = data.get('tanggal_selesai') or tgl_m_str
        if not tgl_m_str:
            return jsonify({"success": False, "message": "Tanggal mulai wajib ditentukan untuk rentang tanggal."}), 400
        try:
            tgl_mulai = datetime.strptime(tgl_m_str, "%Y-%m-%d").date()
            tgl_selesai = datetime.strptime(tgl_s_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"success": False, "message": "Format tanggal harus YYYY-MM-DD."}), 400
        if tgl_selesai < tgl_mulai:
            return jsonify({"success": False, "message": "Tanggal selesai tidak boleh sebelum tanggal mulai."}), 400
        default_judul = "Surat Edaran Disdik / Sekolah"
    else:
        return jsonify({"success": False, "message": "Target tidak valid. Pilih 'hari_ini', 'besok', atau 'rentang'."}), 400

    nama_bersih = judul or default_judul
    if nomor_se:
        final_nama = f"[SE] {nama_bersih} ({nomor_se})"
    else:
        final_nama = f"[SE] {nama_bersih}"

    current_u = getattr(request, 'current_user', {})
    admin_name = current_u.get('nama', 'Administrator')
    full_keterangan = keterangan
    if nomor_se and nomor_se not in full_keterangan:
        full_keterangan = f"Dasar: {nomor_se}. {keterangan}".strip()

    try:
        existing = HariLibur.query.filter(
            HariLibur.tanggal_mulai == tgl_mulai,
            HariLibur.tanggal_selesai == tgl_selesai
        ).first()

        if existing:
            existing.nama = final_nama
            existing.kategori = kategori
            existing.tipe_hari = tipe_hari
            existing.keterangan = full_keterangan
            existing.is_active = True
            existing.created_by = f"Surat Edaran ({admin_name})"
        else:
            new_libur = HariLibur(
                nama=final_nama,
                kategori=kategori,
                tanggal_mulai=tgl_mulai,
                tanggal_selesai=tgl_selesai,
                tipe_hari=tipe_hari,
                keterangan=full_keterangan,
                is_active=True,
                created_by=f"Surat Edaran ({admin_name})"
            )
            db.session.add(new_libur)

        # Audit log
        audit = AuditLog(
            user_id=current_u.get('id'),
            role=current_u.get('role', 'admin'),
            user_name=admin_name,
            action='AKSI_CEPAT_SE',
            target_type='HariLibur',
            target_id=str(final_nama),
            keterangan=f"Aksi cepat SE: {final_nama} ({tgl_mulai} s/d {tgl_selesai}, presensi={tipe_hari})",
            ip_address=request.remote_addr
        )
        db.session.add(audit)
        db.session.commit()

        action_label = "Diliburkan (Presensi Ditutup)" if tipe_hari == 'libur' else "Wajib Masuk (Presensi Dibuka)"
        return jsonify({
            "success": True,
            "message": f"Berhasil menerapkan '{final_nama}' untuk tanggal {tgl_mulai} s/d {tgl_selesai}. Status: {action_label}.",
            "data": {
                "nama": final_nama,
                "tanggal_mulai": tgl_mulai.strftime("%Y-%m-%d"),
                "tanggal_selesai": tgl_selesai.strftime("%Y-%m-%d"),
                "tipe_hari": tipe_hari
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Gagal menerapkan Surat Edaran: {str(e)}"}), 500


@libur_bp.route('/api/hari_libur/upload_surat', methods=['POST'])
@token_required
@role_required(['admin'])
def upload_surat_edaran():
    """
    Mengunggah berkas resmi Surat Edaran (PDF / Foto Dokumen).
    """
    if 'file' not in request.files:
        return jsonify({"success": False, "message": "File surat edaran tidak ditemukan."}), 400
    file = request.files['file']
    if not file or not file.filename:
        return jsonify({"success": False, "message": "File tidak valid atau kosong."}), 400

    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in ['pdf', 'jpg', 'jpeg', 'png', 'webp']:
        return jsonify({"success": False, "message": "Format file tidak didukung. Harap unggah berkas PDF, PNG, atau JPG."}), 400

    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)
    if size > 10 * 1024 * 1024:
        return jsonify({"success": False, "message": "Ukuran file surat edaran melebihi batas 10MB."}), 400

    unique_name = f"se_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(UPLOAD_EDARAN_DIR, unique_name)
    file.save(filepath)

    return jsonify({
        "success": True,
        "url": f"/api/hari_libur/dokumen/{unique_name}",
        "filename": file.filename
    }), 200


@libur_bp.route('/api/hari_libur/dokumen/<path:filename>', methods=['GET'])
def get_dokumen_edaran(filename):
    """
    Menampilkan dan preview berkas Surat Edaran resmi (PDF/gambar) untuk siswa, guru, staf, atau admin.
    """
    return send_from_directory(UPLOAD_EDARAN_DIR, filename)


@libur_bp.route('/api/hari_libur/import_file', methods=['POST'])
@token_required
@role_required(['admin'])
def import_file_libur():
    """
    Mengimpor jadwal kalender libur/akademik dari file Excel (.xlsx) atau CSV (.csv).
    Sangat toleran terhadap format file, encoding Windows/Excel, serial date, dan variasi nama kolom.
    """
    if 'file' not in request.files:
        return jsonify({"success": False, "message": "File kalender tidak ditemukan dalam permintaan."}), 400

    file = request.files['file']
    filename = (file.filename or '').lower()

    if not (filename.endswith('.xlsx') or filename.endswith('.csv') or filename.endswith('.xls')):
        return jsonify({"success": False, "message": "Format file tidak didukung. Harap unggah file Excel (.xlsx) atau CSV (.csv)."}), 400

    file_bytes = file.read()
    if not file_bytes:
        return jsonify({"success": False, "message": "File kosong atau tidak terbaca."}), 400

    raw_rows = []

    try:
        if filename.endswith('.xlsx') or filename.endswith('.xls'):
            try:
                wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
                ws = wb.active
                for row in ws.iter_rows(values_only=True):
                    if any(c is not None and str(c).strip() != '' for c in row):
                        raw_rows.append([c if c is not None else '' for c in row])
            except Exception as e_xlsx:
                return jsonify({"success": False, "message": f"Gagal membaca file Excel (.xlsx): {str(e_xlsx)}"}), 400
        else:
            csv_text = None
            for enc in ['utf-8-sig', 'utf-8', 'cp1252', 'latin1']:
                try:
                    csv_text = file_bytes.decode(enc)
                    break
                except UnicodeDecodeError:
                    continue
            if not csv_text:
                csv_text = file_bytes.decode('utf-8', errors='ignore')

            sample = csv_text[:4096]
            delims = [';', ',', '\t', '|']
            delim_counts = {d: sample.count(d) for d in delims}
            chosen_delim = max(delim_counts, key=delim_counts.get)
            if delim_counts[chosen_delim] == 0:
                chosen_delim = ','

            reader = csv.reader(io.StringIO(csv_text), delimiter=chosen_delim)
            for row in reader:
                if any(c.strip() != '' for c in row):
                    raw_rows.append([c.strip() for c in row])

        if len(raw_rows) < 1:
            return jsonify({"success": False, "message": "File kosong atau tidak memiliki baris data kalender."}), 400

        # Cari baris header di 5 baris pertama
        header_idx = -1
        col_nama = -1
        col_mulai = -1
        col_selesai = -1
        col_kategori = -1
        col_tipe = -1
        col_ket = -1

        for r_i, row in enumerate(raw_rows[:5]):
            h_strs = [str(c).lower().strip() for c in row]
            c_nama = -1
            c_mulai = -1
            c_selesai = -1
            c_kategori = -1
            c_tipe = -1
            c_ket = -1
            for idx, h in enumerate(h_strs):
                # Prioritaskan Nama Agenda / Kegiatan terlebih dahulu (kecuali jika mengandung kata tanggal)
                if any(k in h for k in ['nama', 'agenda', 'kegiatan', 'judul', 'event', 'deskripsi', 'uraian']) and not any(t in h for t in ['tanggal', 'tgl']):
                    if c_nama == -1: c_nama = idx
                elif any(k in h for k in ['selesai', 'sampai', 'akhir', 's/d', 'tgl_selesai', 'end_date', 'to_date']):
                    if c_selesai == -1: c_selesai = idx
                elif any(k in h for k in ['mulai', 'start', 'dari', 'tgl_mulai', 'from_date']):
                    if c_mulai == -1: c_mulai = idx
                elif any(k in h for k in ['tanggal', 'tgl', 'date']):
                    if c_mulai == -1: c_mulai = idx
                elif any(k in h for k in ['kategori', 'jenis', 'tipe_libur']):
                    if c_kategori == -1: c_kategori = idx
                elif any(k in h for k in ['tipe', 'dampak', 'presensi', 'status_hadir']):
                    if c_tipe == -1: c_tipe = idx
                elif any(k in h for k in ['keterangan', 'catatan', 'edaran', 'nomor', 'ket', 'dasar']):
                    if c_ket == -1: c_ket = idx

            if c_nama != -1 and c_mulai != -1:
                header_idx = r_i
                col_nama, col_mulai, col_selesai, col_kategori, col_tipe, col_ket = (
                    c_nama, c_mulai, c_selesai, c_kategori, c_tipe, c_ket
                )
                break

        # Fallback jika tidak ada baris header eksplisit
        if col_nama == -1 or col_mulai == -1:
            first_row = raw_rows[0]
            if len(first_row) >= 2:
                if parse_date_flexible(first_row[1]):
                    header_idx = -1
                    col_nama = 0
                    col_mulai = 1
                    col_selesai = 2 if len(first_row) > 2 else -1
                    col_kategori = 3 if len(first_row) > 3 else -1
                    col_tipe = 4 if len(first_row) > 4 else -1
                    col_ket = 5 if len(first_row) > 5 else -1
                elif parse_date_flexible(first_row[0]):
                    header_idx = -1
                    col_mulai = 0
                    col_nama = 1
                    col_selesai = 2 if len(first_row) > 2 else -1
                    col_kategori = 3 if len(first_row) > 3 else -1
                    col_tipe = 4 if len(first_row) > 4 else -1
                    col_ket = 5 if len(first_row) > 5 else -1

        if col_nama == -1 or col_mulai == -1:
            return jsonify({
                "success": False,
                "message": "Format kolom file tidak sesuai. Pastikan file memiliki kolom Nama Agenda ('Nama' / 'Kegiatan') dan Tanggal ('Tanggal Mulai' / 'Tanggal')."
            }), 400

        current_u = getattr(request, 'current_user', {})
        admin_name = current_u.get('nama', 'Administrator')

        added_count = 0
        skipped_count = 0
        errors = []

        data_rows = raw_rows[header_idx + 1:] if header_idx >= 0 else raw_rows

        for r_idx, r in enumerate(data_rows, start=(header_idx + 2 if header_idx >= 0 else 1)):
            if len(r) <= max(col_nama, col_mulai):
                continue
            nama = str(r[col_nama]).strip()
            if not nama:
                continue

            raw_mulai = r[col_mulai]
            raw_selesai = r[col_selesai] if (col_selesai != -1 and len(r) > col_selesai and r[col_selesai] != '') else raw_mulai

            tgl_m = parse_date_flexible(raw_mulai)
            tgl_s = parse_date_flexible(raw_selesai) if raw_selesai else tgl_m

            if not tgl_m:
                errors.append(f"Baris {r_idx} ('{nama}'): Tanggal mulai '{raw_mulai}' tidak valid.")
                continue
            if not tgl_s:
                tgl_s = tgl_m
            if tgl_s < tgl_m:
                errors.append(f"Baris {r_idx} ('{nama}'): Tanggal selesai ({tgl_s}) lebih awal dari tanggal mulai ({tgl_m}).")
                continue

            kat = "libur_semester"
            if col_kategori != -1 and len(r) > col_kategori and r[col_kategori]:
                val_k = str(r[col_kategori]).lower()
                if "nasional" in val_k: kat = "libur_nasional"
                elif "cuti" in val_k: kat = "cuti_bersama"
                elif "khusus" in val_k or "kegiatan" in val_k: kat = "khusus"
                elif "semester" in val_k: kat = "libur_semester"

            tipe_h = "libur"
            if col_tipe != -1 and len(r) > col_tipe and r[col_tipe]:
                val_t = str(r[col_tipe]).lower()
                if any(w in val_t for w in ["masuk", "hadir", "upacara", "buka"]):
                    tipe_h = "masuk_khusus"

            ket = "Impor File Kalender"
            if col_ket != -1 and len(r) > col_ket and r[col_ket]:
                ket = str(r[col_ket]).strip() or ket

            exists = HariLibur.query.filter(
                HariLibur.tanggal_mulai == tgl_m,
                HariLibur.tanggal_selesai == tgl_s,
                HariLibur.nama == nama
            ).first()

            if exists:
                skipped_count += 1
                continue

            new_libur = HariLibur(
                nama=nama,
                kategori=kat,
                tanggal_mulai=tgl_m,
                tanggal_selesai=tgl_s,
                tipe_hari=tipe_h,
                keterangan=ket,
                is_active=True,
                created_by=f"Import File ({admin_name})"
            )
            db.session.add(new_libur)
            added_count += 1

        db.session.commit()

        audit = AuditLog(
            user_id=current_u.get('id'),
            role=current_u.get('role', 'admin'),
            user_name=admin_name,
            action='IMPORT_FILE_LIBUR',
            target_type='HariLibur',
            target_id=filename,
            keterangan=f"Impor file kalender '{filename}': {added_count} ditambahkan, {skipped_count} dilewati.",
            ip_address=request.remote_addr
        )
        db.session.add(audit)
        db.session.commit()

        if added_count == 0 and len(errors) > 0:
            return jsonify({
                "success": False,
                "message": f"Tidak ada data yang berhasil diimpor. {len(errors)} baris mengalami kesalahan format tanggal.",
                "errors": errors[:10]
            }), 400

        return jsonify({
            "success": True,
            "message": f"Berhasil mengimpor {added_count} agenda ke kalender sekolah. {skipped_count} data sudah ada/dilewati.",
            "added": added_count,
            "skipped": skipped_count,
            "errors": errors[:5]
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Gagal membaca file kalender: {str(e)}"}), 500


@libur_bp.route('/api/hari_libur/template_file', methods=['GET'])
@token_required
def download_template_libur():
    """
    Mengunduh template file Excel (.xlsx) resmi untuk pengisian dan impor kalender libur sekolah.
    """
    try:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Template Kalender SMKN 21"

        headers = [
            "Nama Agenda / Kegiatan",
            "Tanggal Mulai (YYYY-MM-DD)",
            "Tanggal Selesai (YYYY-MM-DD)",
            "Kategori (libur_semester / libur_nasional / cuti_bersama / khusus)",
            "Dampak Presensi (libur / masuk_khusus)",
            "Keterangan / Nomor SE"
        ]
        ws.append(headers)

        current_year = datetime.now().year
        samples = [
            ["Libur Semester Ganjil TA 2026/2027", f"{current_year}-12-21", f"{current_year+1}-01-02", "libur_semester", "libur", "Kalender Pendidikan Disdik DKI Jakarta"],
            ["Libur Awal Bulan Ramadhan 1447 H", f"{current_year}-03-02", f"{current_year}-03-04", "khusus", "libur", "Surat Edaran Disdik No. 12/2026"],
            ["Upacara Hari Kemerdekaan RI", f"{current_year}-08-17", f"{current_year}-08-17", "khusus", "masuk_khusus", "Wajib hadir upacara bendera di sekolah"],
            ["Libur Kenaikan Kelas (Genap)", f"{current_year}-06-22", f"{current_year}-07-06", "libur_semester", "libur", "Akhir Tahun Ajaran SMKN 21"]
        ]
        for s in samples:
            ws.append(s)

        for col_letter in ['A', 'B', 'C', 'D', 'E', 'F']:
            ws.column_dimensions[col_letter].width = 32

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)

        return send_file(
            buf,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            as_attachment=True,
            download_name=f"Template_Impor_Kalender_Libur_SMKN21_{current_year}.xlsx"
        )
    except Exception as e:
        return jsonify({"success": False, "message": f"Gagal membuat template: {str(e)}"}), 500
