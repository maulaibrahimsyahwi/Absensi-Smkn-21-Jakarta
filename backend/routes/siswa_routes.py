from flask import Blueprint, request, jsonify
from datetime import datetime
from models import db, Siswa, AbsensiHarian, AbsensiPerpustakaan, PengajuanIzin, IzinPiket, PelanggaranSiswa
from utils.helpers import validate_siswa_input, invalidate_face_cache
from utils.auth_middleware import token_required, role_required

siswa_bp = Blueprint('siswa', __name__)

# ================= ROUTES SISWA (CRUD & STATUS) =================

@siswa_bp.route('/api/siswa', methods=['GET'])
@token_required
@role_required(['admin', 'piket'])
def get_siswa():
    status_filter = request.args.get('status')
    query = Siswa.query
    if status_filter and status_filter != 'ALL':
        query = query.filter(Siswa.status == status_filter)
    siswa_list = query.order_by(Siswa.nama.asc()).all()
    return jsonify([s.to_dict() for s in siswa_list])


@siswa_bp.route('/api/siswa', methods=['POST'])
@token_required
@role_required(['admin'])
def add_siswa():
    data = request.json or {}
    nis = str(data.get('nis', '')).strip()
    nama = str(data.get('nama', '')).strip()
    kelas = str(data.get('kelas', '')).strip().upper()

    valid, err_msg = validate_siswa_input(nis, nama, kelas)
    if not valid:
        return jsonify({"success": False, "message": err_msg}), 400

    try:
        # Cek NIS unik
        existing = Siswa.query.filter_by(nis=nis).first()
        if existing:
            return jsonify({"success": False, "message": f"NIS {nis} sudah digunakan oleh {existing.nama} ({existing.kelas})"}), 400

        status_input = str(data.get('status', 'Aktif')).strip()
        if status_input not in ["Aktif", "Alumni"]:
            status_input = "Aktif"

        baru = Siswa(nis=nis, nama=nama, kelas=kelas, status=status_input)
        db.session.add(baru)
        db.session.commit()
        return jsonify({"success": True, "message": f"Siswa {nama} ({kelas}) berhasil didaftarkan", "id": baru.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 400


@siswa_bp.route('/api/siswa/<int:id>', methods=['PUT'])
@token_required
@role_required(['admin'])
def update_siswa(id):
    siswa = Siswa.query.get(id)
    if not siswa:
        return jsonify({"success": False, "message": "Siswa tidak ditemukan"}), 404
    data = request.json or {}
    nis = str(data.get('nis', siswa.nis)).strip()
    nama = str(data.get('nama', siswa.nama)).strip()
    kelas = str(data.get('kelas', siswa.kelas)).strip().upper()
    status_input = data.get('status')

    valid, err_msg = validate_siswa_input(nis, nama, kelas)
    if not valid:
        return jsonify({"success": False, "message": err_msg}), 400

    try:
        if nis != siswa.nis:
            existing = Siswa.query.filter_by(nis=nis).first()
            if existing and existing.id != id:
                return jsonify({"success": False, "message": f"NIS {nis} sudah terdaftar untuk siswa lain: {existing.nama}"}), 400
            siswa.nis = nis
        siswa.nama = nama
        siswa.kelas = kelas
        if status_input and status_input in ["Aktif", "Alumni"]:
            siswa.status = status_input
            if status_input == "Alumni" and not siswa.tanggal_lulus:
                siswa.tanggal_lulus = datetime.now()
            elif status_input == "Aktif":
                siswa.tanggal_lulus = None
        db.session.commit()
        invalidate_face_cache()
        return jsonify({"success": True, "message": f"Data {siswa.nama} berhasil diperbarui", "siswa": siswa.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@siswa_bp.route('/api/siswa/<int:id>/status', methods=['PATCH'])
@token_required
@role_required(['admin'])
def update_siswa_status(id):
    siswa = Siswa.query.get(id)
    if not siswa:
        return jsonify({"success": False, "message": "Siswa tidak ditemukan"}), 404
    data = request.json or {}
    new_status = str(data.get('status', '')).strip()
    if new_status not in ["Aktif", "Alumni"]:
        return jsonify({"success": False, "message": "Status harus 'Aktif' atau 'Alumni'"}), 400
    try:
        siswa.status = new_status
        if new_status == "Alumni" and not siswa.tanggal_lulus:
            siswa.tanggal_lulus = datetime.now()
        elif new_status == "Aktif":
            siswa.tanggal_lulus = None
        db.session.commit()
        invalidate_face_cache()
        status_label = "Alumni / Lulus" if new_status == "Alumni" else "Aktif"
        return jsonify({
            "success": True,
            "message": f"Status {siswa.nama} berhasil diubah menjadi {status_label}.",
            "siswa": siswa.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@siswa_bp.route('/api/siswa/bulk_status', methods=['POST'])
@token_required
@role_required(['admin'])
def bulk_update_siswa_status():
    data = request.json or {}
    siswa_ids = data.get('siswa_ids', [])
    new_status = str(data.get('status', '')).strip()
    
    if not siswa_ids or not isinstance(siswa_ids, list):
        return jsonify({"success": False, "message": "Daftar siswa_ids wajib disertakan."}), 400
    if new_status not in ["Aktif", "Alumni"]:
        return jsonify({"success": False, "message": "Status harus 'Aktif' atau 'Alumni'"}), 400

    try:
        now = datetime.now()
        target_records = Siswa.query.filter(Siswa.id.in_(siswa_ids)).all()
        for s in target_records:
            s.status = new_status
            if new_status == "Alumni" and not s.tanggal_lulus:
                s.tanggal_lulus = now
            elif new_status == "Aktif":
                s.tanggal_lulus = None
        db.session.commit()
        invalidate_face_cache()
        updated_count = len(target_records)
        status_label = "Alumni / Lulus" if new_status == "Alumni" else "Aktif"
        return jsonify({
            "success": True,
            "count": updated_count,
            "message": f"Berhasil mengubah status {updated_count} siswa menjadi {status_label}."
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@siswa_bp.route('/api/siswa/luluskan_tingkat', methods=['POST'])
@token_required
@role_required(['admin'])
def luluskan_tingkat():
    data = request.json or {}
    tingkat = str(data.get('tingkat', 'XII')).strip().upper()
    
    try:
        # Cari semua siswa aktif di tingkat tertentu (misal kelas berawalan 'XII ')
        query = Siswa.query.filter(
            Siswa.kelas.like(f"{tingkat}%"),
            (Siswa.status == 'Aktif') | (Siswa.status == None)
        )
        target_siswa = query.all()
        target_count = len(target_siswa)
        
        if target_count == 0:
            return jsonify({
                "success": True,
                "count": 0,
                "message": f"Tidak ditemukan siswa aktif di tingkat {tingkat}."
            })
            
        now = datetime.now()
        for s in target_siswa:
            s.status = "Alumni"
            if not s.tanggal_lulus:
                s.tanggal_lulus = now
            
        db.session.commit()
        invalidate_face_cache()
        return jsonify({
            "success": True,
            "count": target_count,
            "message": f"Selamat! Seluruh {target_count} siswa tingkat {tingkat} berhasil diluluskan menjadi Alumni."
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@siswa_bp.route('/api/siswa/bulk_delete', methods=['POST'])
@token_required
@role_required(['admin'])
def bulk_delete_siswa():
    data = request.json or {}
    siswa_ids = data.get('siswa_ids', [])
    
    if not siswa_ids or not isinstance(siswa_ids, list):
        return jsonify({"success": False, "message": "Daftar siswa_ids wajib disertakan."}), 400

    try:
        # Hapus riwayat absensi, perpustakaan, pengajuan izin, izin piket, dan pelanggaran siswa terkait
        AbsensiHarian.query.filter(AbsensiHarian.siswa_id.in_(siswa_ids)).delete(synchronize_session=False)
        AbsensiPerpustakaan.query.filter(AbsensiPerpustakaan.siswa_id.in_(siswa_ids)).delete(synchronize_session=False)
        PengajuanIzin.query.filter(PengajuanIzin.siswa_id.in_(siswa_ids)).delete(synchronize_session=False)
        IzinPiket.query.filter(IzinPiket.siswa_id.in_(siswa_ids)).delete(synchronize_session=False)
        PelanggaranSiswa.query.filter(PelanggaranSiswa.siswa_id.in_(siswa_ids)).delete(synchronize_session=False)
        
        deleted_count = Siswa.query.filter(Siswa.id.in_(siswa_ids)).delete(synchronize_session=False)
        db.session.commit()
        invalidate_face_cache()
        return jsonify({
            "success": True,
            "count": deleted_count,
            "message": f"{deleted_count} data siswa dan seluruh riwayat presensinya berhasil dihapus dari database."
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@siswa_bp.route('/api/siswa/<int:id>', methods=['DELETE'])
@token_required
@role_required(['admin'])
def delete_siswa(id):
    siswa = Siswa.query.get(id)
    if not siswa:
        return jsonify({"success": False, "message": "Siswa tidak ditemukan"}), 404
    try:
        nama_siswa = siswa.nama
        # Hapus seluruh riwayat terkait termasuk pelanggaran siswa
        AbsensiHarian.query.filter_by(siswa_id=id).delete()
        AbsensiPerpustakaan.query.filter_by(siswa_id=id).delete()
        PengajuanIzin.query.filter_by(siswa_id=id).delete()
        IzinPiket.query.filter_by(siswa_id=id).delete()
        PelanggaranSiswa.query.filter_by(siswa_id=id).delete()
        db.session.delete(siswa)
        db.session.commit()
        invalidate_face_cache()
        return jsonify({"success": True, "message": f"Siswa {nama_siswa} berhasil dihapus dari database."})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@siswa_bp.route('/api/cek_siswa_nis/<nis>', methods=['GET'])
@token_required
def cek_siswa_nis(nis):
    nis = str(nis or '').strip()
    siswa = Siswa.query.filter_by(nis=nis).first()
    if not siswa:
        return jsonify({"success": False, "message": f"Siswa dengan NIS '{nis}' tidak ditemukan."}), 404
    if getattr(siswa, 'status', 'Aktif') == 'Alumni':
        return jsonify({
            "success": False,
            "message": f"Siswa {siswa.nama} ({siswa.kelas}) sudah berstatus Alumni / Lulus dan tidak dapat melakukan presensi atau perizinan."
        }), 400
    return jsonify({
        "success": True,
        "siswa": {
            "id": siswa.id,
            "nis": siswa.nis,
            "nama": siswa.nama,
            "kelas": siswa.kelas,
            "status": siswa.status or "Aktif"
        }
    })

