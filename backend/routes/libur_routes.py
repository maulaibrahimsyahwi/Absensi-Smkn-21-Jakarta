from flask import Blueprint, request, jsonify
from datetime import datetime, date
from models import db, HariLibur
from utils.auth_middleware import token_required, role_required
from utils.helpers import get_holiday_status, is_school_day

libur_bp = Blueprint('libur', __name__)

@libur_bp.route('/api/hari_libur', methods=['GET'])
@token_required
def get_hari_libur_list():
    """
    Mengambil daftar seluruh jadwal libur dan hari masuk khusus.
    Bisa difilter berdasarkan tahun, bulan, atau status aktif.
    """
    try:
        tahun = request.args.get('tahun')
        active_only = request.args.get('active_only', 'false').lower() == 'true'

        query = HariLibur.query

        if active_only:
            query = query.filter(HariLibur.is_active == True)

        if tahun:
            try:
                tahun_int = int(tahun)
                # Libur yang mulai atau selesai di tahun yang dipilih
                start_year = date(tahun_int, 1, 1)
                end_year = date(tahun_int, 12, 31)
                query = query.filter(
                    (HariLibur.tanggal_mulai <= end_year) & (HariLibur.tanggal_selesai >= start_year)
                )
            except ValueError:
                pass

        records = query.order_by(HariLibur.tanggal_mulai.desc()).all()
        return jsonify([r.to_dict() for r in records]), 200
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


# ================= DATASET RESMI KALENDER LIBUR INDONESIA (SKB 3 MENTERI) =================

INDONESIAN_HOLIDAYS = {
    2025: [
        {"nama": "Tahun Baru 2025 Masehi", "kategori": "libur_nasional", "tanggal_mulai": "2025-01-01", "tanggal_selesai": "2025-01-01", "keterangan": "Libur Nasional Tahun Baru"},
        {"nama": "Isra Mi'raj Nabi Muhammad SAW", "kategori": "libur_nasional", "tanggal_mulai": "2025-01-27", "tanggal_selesai": "2025-01-27", "keterangan": "Libur Nasional Keagamaan"},
        {"nama": "Tahun Baru Imlek 2576 Kongzili", "kategori": "libur_nasional", "tanggal_mulai": "2025-01-29", "tanggal_selesai": "2025-01-29", "keterangan": "Libur Nasional Imlek"},
        {"nama": "Cuti Bersama Tahun Baru Imlek", "kategori": "cuti_bersama", "tanggal_mulai": "2025-01-28", "tanggal_selesai": "2025-01-28", "keterangan": "Cuti Bersama Pemerintah"},
        {"nama": "Hari Suci Nyepi (Tahun Baru Saka 1947)", "kategori": "libur_nasional", "tanggal_mulai": "2025-03-29", "tanggal_selesai": "2025-03-29", "keterangan": "Libur Nasional Nyepi"},
        {"nama": "Hari Raya Idul Fitri 1446 H (Hari 1 & 2)", "kategori": "libur_nasional", "tanggal_mulai": "2025-03-31", "tanggal_selesai": "2025-04-01", "keterangan": "Libur Nasional Idul Fitri"},
        {"nama": "Cuti Bersama Hari Raya Idul Fitri 1446 H", "kategori": "cuti_bersama", "tanggal_mulai": "2025-04-02", "tanggal_selesai": "2025-04-07", "keterangan": "Cuti Bersama Idul Fitri"},
        {"nama": "Wafat Yesus Kristus (Jumat Agung)", "kategori": "libur_nasional", "tanggal_mulai": "2025-04-18", "tanggal_selesai": "2025-04-18", "keterangan": "Libur Nasional Keagamaan"},
        {"nama": "Hari Buruh Internasional", "kategori": "libur_nasional", "tanggal_mulai": "2025-05-01", "tanggal_selesai": "2025-05-01", "keterangan": "Libur Nasional Hari Buruh"},
        {"nama": "Hari Raya Waisak 2569 BE", "kategori": "libur_nasional", "tanggal_mulai": "2025-05-12", "tanggal_selesai": "2025-05-12", "keterangan": "Libur Nasional Waisak"},
        {"nama": "Kenaikan Yesus Kristus", "kategori": "libur_nasional", "tanggal_mulai": "2025-05-29", "tanggal_selesai": "2025-05-29", "keterangan": "Libur Nasional Kenaikan"},
        {"nama": "Hari Lahir Pancasila", "kategori": "libur_nasional", "tanggal_mulai": "2025-06-01", "tanggal_selesai": "2025-06-01", "keterangan": "Libur Nasional Hari Lahir Pancasila"},
        {"nama": "Hari Raya Idul Adha 1446 H", "kategori": "libur_nasional", "tanggal_mulai": "2025-06-06", "tanggal_selesai": "2025-06-06", "keterangan": "Libur Nasional Idul Adha"},
        {"nama": "Cuti Bersama Hari Raya Idul Adha", "kategori": "cuti_bersama", "tanggal_mulai": "2025-06-09", "tanggal_selesai": "2025-06-09", "keterangan": "Cuti Bersama Idul Adha"},
        {"nama": "Tahun Baru Islam 1447 H (1 Muharram)", "kategori": "libur_nasional", "tanggal_mulai": "2025-06-27", "tanggal_selesai": "2025-06-27", "keterangan": "Libur Nasional 1 Muharram"},
        {"nama": "Hari Kemerdekaan RI (HUT RI ke-80)", "kategori": "libur_nasional", "tanggal_mulai": "2025-08-17", "tanggal_selesai": "2025-08-17", "keterangan": "Hari Kemerdekaan Republik Indonesia"},
        {"nama": "Maulid Nabi Muhammad SAW", "kategori": "libur_nasional", "tanggal_mulai": "2025-09-05", "tanggal_selesai": "2025-09-05", "keterangan": "Libur Nasional Maulid Nabi"},
        {"nama": "Hari Raya Natal", "kategori": "libur_nasional", "tanggal_mulai": "2025-12-25", "tanggal_selesai": "2025-12-25", "keterangan": "Hari Raya Natal"},
        {"nama": "Cuti Bersama Hari Raya Natal", "kategori": "cuti_bersama", "tanggal_mulai": "2025-12-26", "tanggal_selesai": "2025-12-26", "keterangan": "Cuti Bersama Natal"},
    ],
    2026: [
        {"nama": "Tahun Baru 2026 Masehi", "kategori": "libur_nasional", "tanggal_mulai": "2026-01-01", "tanggal_selesai": "2026-01-01", "keterangan": "Libur Nasional Tahun Baru Masehi"},
        {"nama": "Isra Mi'raj Nabi Muhammad SAW", "kategori": "libur_nasional", "tanggal_mulai": "2026-01-16", "tanggal_selesai": "2026-01-16", "keterangan": "Libur Nasional Isra Mi'raj 1447 H"},
        {"nama": "Tahun Baru Imlek 2577 Kongzili", "kategori": "libur_nasional", "tanggal_mulai": "2026-02-17", "tanggal_selesai": "2026-02-17", "keterangan": "Libur Nasional Tahun Baru Imlek"},
        {"nama": "Cuti Bersama Tahun Baru Imlek", "kategori": "cuti_bersama", "tanggal_mulai": "2026-02-18", "tanggal_selesai": "2026-02-18", "keterangan": "Cuti Bersama Pemerintah"},
        {"nama": "Hari Suci Nyepi (Tahun Baru Saka 1948)", "kategori": "libur_nasional", "tanggal_mulai": "2026-03-19", "tanggal_selesai": "2026-03-19", "keterangan": "Hari Suci Nyepi Tahun Baru Saka 1948"},
        {"nama": "Hari Raya Idul Fitri 1447 H (Hari 1 & 2)", "kategori": "libur_nasional", "tanggal_mulai": "2026-03-20", "tanggal_selesai": "2026-03-21", "keterangan": "Hari Raya Idul Fitri 1447 Hijriah"},
        {"nama": "Cuti Bersama Hari Raya Idul Fitri 1447 H", "kategori": "cuti_bersama", "tanggal_mulai": "2026-03-23", "tanggal_selesai": "2026-03-24", "keterangan": "Cuti Bersama Idul Fitri 1447 H"},
        {"nama": "Wafat Yesus Kristus (Jumat Agung)", "kategori": "libur_nasional", "tanggal_mulai": "2026-04-03", "tanggal_selesai": "2026-04-03", "keterangan": "Libur Nasional Wafat Yesus Kristus"},
        {"nama": "Hari Buruh Internasional", "kategori": "libur_nasional", "tanggal_mulai": "2026-05-01", "tanggal_selesai": "2026-05-01", "keterangan": "Hari Buruh Internasional (May Day)"},
        {"nama": "Kenaikan Yesus Kristus", "kategori": "libur_nasional", "tanggal_mulai": "2026-05-14", "tanggal_selesai": "2026-05-14", "keterangan": "Libur Nasional Kenaikan Yesus Kristus"},
        {"nama": "Hari Raya Idul Adha 1447 H", "kategori": "libur_nasional", "tanggal_mulai": "2026-05-27", "tanggal_selesai": "2026-05-27", "keterangan": "Hari Raya Idul Adha 1447 Hijriah"},
        {"nama": "Cuti Bersama Hari Raya Idul Adha", "kategori": "cuti_bersama", "tanggal_mulai": "2026-05-28", "tanggal_selesai": "2026-05-28", "keterangan": "Cuti Bersama Hari Raya Idul Adha"},
        {"nama": "Hari Raya Waisak 2570 BE", "kategori": "libur_nasional", "tanggal_mulai": "2026-05-31", "tanggal_selesai": "2026-05-31", "keterangan": "Hari Raya Waisak 2570 BE"},
        {"nama": "Hari Lahir Pancasila", "kategori": "libur_nasional", "tanggal_mulai": "2026-06-01", "tanggal_selesai": "2026-06-01", "keterangan": "Hari Lahir Pancasila"},
        {"nama": "Tahun Baru Islam 1448 H (1 Muharram)", "kategori": "libur_nasional", "tanggal_mulai": "2026-06-16", "tanggal_selesai": "2026-06-16", "keterangan": "Tahun Baru Islam 1448 Hijriah"},
        {"nama": "Hari Kemerdekaan RI (HUT RI ke-81)", "kategori": "libur_nasional", "tanggal_mulai": "2026-08-17", "tanggal_selesai": "2026-08-17", "keterangan": "HUT Proklamasi Kemerdekaan RI ke-81"},
        {"nama": "Maulid Nabi Muhammad SAW", "kategori": "libur_nasional", "tanggal_mulai": "2026-08-25", "tanggal_selesai": "2026-08-25", "keterangan": "Peringatan Maulid Nabi Muhammad SAW"},
        {"nama": "Hari Raya Natal", "kategori": "libur_nasional", "tanggal_mulai": "2026-12-25", "tanggal_selesai": "2026-12-25", "keterangan": "Hari Raya Natal 2026"},
        {"nama": "Cuti Bersama Hari Raya Natal", "kategori": "cuti_bersama", "tanggal_mulai": "2026-12-26", "tanggal_selesai": "2026-12-26", "keterangan": "Cuti Bersama Hari Raya Natal"},
    ],
    2027: [
        {"nama": "Tahun Baru 2027 Masehi", "kategori": "libur_nasional", "tanggal_mulai": "2027-01-01", "tanggal_selesai": "2027-01-01", "keterangan": "Libur Nasional Tahun Baru Masehi"},
        {"nama": "Isra Mi'raj Nabi Muhammad SAW", "kategori": "libur_nasional", "tanggal_mulai": "2027-01-06", "tanggal_selesai": "2027-01-06", "keterangan": "Libur Nasional Isra Mi'raj"},
        {"nama": "Tahun Baru Imlek 2578 Kongzili", "kategori": "libur_nasional", "tanggal_mulai": "2027-02-06", "tanggal_selesai": "2027-02-06", "keterangan": "Libur Nasional Imlek"},
        {"nama": "Hari Suci Nyepi (Tahun Baru Saka 1949)", "kategori": "libur_nasional", "tanggal_mulai": "2027-03-09", "tanggal_selesai": "2027-03-09", "keterangan": "Hari Suci Nyepi Saka 1949"},
        {"nama": "Hari Raya Idul Fitri 1448 H (Hari 1 & 2)", "kategori": "libur_nasional", "tanggal_mulai": "2027-03-10", "tanggal_selesai": "2027-03-11", "keterangan": "Hari Raya Idul Fitri 1448 H"},
        {"nama": "Cuti Bersama Hari Raya Idul Fitri 1448 H", "kategori": "cuti_bersama", "tanggal_mulai": "2027-03-12", "tanggal_selesai": "2027-03-15", "keterangan": "Cuti Bersama Idul Fitri 1448 H"},
        {"nama": "Wafat Yesus Kristus (Jumat Agung)", "kategori": "libur_nasional", "tanggal_mulai": "2027-03-26", "tanggal_selesai": "2027-03-26", "keterangan": "Libur Nasional Wafat Yesus Kristus"},
        {"nama": "Hari Buruh Internasional", "kategori": "libur_nasional", "tanggal_mulai": "2027-05-01", "tanggal_selesai": "2027-05-01", "keterangan": "Hari Buruh Internasional"},
        {"nama": "Kenaikan Yesus Kristus", "kategori": "libur_nasional", "tanggal_mulai": "2027-05-06", "tanggal_selesai": "2027-05-06", "keterangan": "Libur Nasional Kenaikan Yesus Kristus"},
        {"nama": "Hari Raya Idul Adha 1448 H", "kategori": "libur_nasional", "tanggal_mulai": "2027-05-17", "tanggal_selesai": "2027-05-17", "keterangan": "Hari Raya Idul Adha 1448 H"},
        {"nama": "Hari Raya Waisak 2571 BE", "kategori": "libur_nasional", "tanggal_mulai": "2027-05-20", "tanggal_selesai": "2027-05-20", "keterangan": "Hari Raya Waisak 2571 BE"},
        {"nama": "Hari Lahir Pancasila", "kategori": "libur_nasional", "tanggal_mulai": "2027-06-01", "tanggal_selesai": "2027-06-01", "keterangan": "Hari Lahir Pancasila"},
        {"nama": "Tahun Baru Islam 1449 H (1 Muharram)", "kategori": "libur_nasional", "tanggal_mulai": "2027-06-06", "tanggal_selesai": "2027-06-06", "keterangan": "Tahun Baru Islam 1449 H"},
        {"nama": "Hari Kemerdekaan RI (HUT RI ke-82)", "kategori": "libur_nasional", "tanggal_mulai": "2027-08-17", "tanggal_selesai": "2027-08-17", "keterangan": "HUT RI ke-82"},
        {"nama": "Maulid Nabi Muhammad SAW", "kategori": "libur_nasional", "tanggal_mulai": "2027-08-15", "tanggal_selesai": "2027-08-15", "keterangan": "Maulid Nabi Muhammad SAW"},
        {"nama": "Hari Raya Natal", "kategori": "libur_nasional", "tanggal_mulai": "2027-12-25", "tanggal_selesai": "2027-12-25", "keterangan": "Hari Raya Natal 2027"},
    ]
}

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
    Sinkronisasi otomatis seluruh hari libur nasional & cuti bersama resmi SKB 3 Menteri (1-Klik).
    """
    data = request.get_json() or {}
    tahun = data.get('tahun')
    try:
        tahun_int = int(tahun) if tahun else datetime.now().year
    except ValueError:
        tahun_int = datetime.now().year

    holidays = INDONESIAN_HOLIDAYS.get(tahun_int, [])
    if not holidays:
        return jsonify({
            "success": False,
            "message": f"Data libur nasional resmi untuk tahun {tahun_int} belum tersedia dalam katalog sistem."
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
                kategori=item["kategori"],
                tanggal_mulai=tgl_m,
                tanggal_selesai=tgl_s,
                tipe_hari="libur",
                keterangan=item.get("keterangan", "Sinkronisasi SKB 3 Menteri"),
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
