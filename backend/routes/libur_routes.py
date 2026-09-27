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
