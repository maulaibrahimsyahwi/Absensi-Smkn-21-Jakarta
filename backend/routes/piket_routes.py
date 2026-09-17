from datetime import datetime, date
from flask import Blueprint, request, jsonify
from models import db, Siswa, IzinPiket

piket_bp = Blueprint('piket', __name__)

# ================= MEJA GURU PIKET (DISPENSASI MASUK / MENINGGALKAN KELAS) =================

@piket_bp.route('/api/piket/izin', methods=['POST'])
def create_izin_piket():
    data = request.json or {}
    siswa_id = data.get('siswa_id')
    nis = str(data.get('nis', '')).strip()
    hari = str(data.get('hari', '')).strip()
    tanggal_str = str(data.get('tanggal', '')).strip()
    tipe = str(data.get('tipe', '')).strip()  # "Izin Masuk" atau "Izin Meninggalkan Kelas"
    jam_ke = str(data.get('jam_ke', '')).strip()
    alasan = str(data.get('alasan', '')).strip()
    petugas_piket = str(data.get('petugas_piket', '')).strip()

    if not siswa_id and nis:
        siswa_obj = Siswa.query.filter_by(nis=nis).first()
        if siswa_obj:
            siswa_id = siswa_obj.id

    if not siswa_id:
        return jsonify({"success": False, "message": "Siswa wajib dipilih."}), 400

    siswa = Siswa.query.get(siswa_id)
    if not siswa:
        return jsonify({"success": False, "message": "Data siswa tidak ditemukan."}), 404

    if getattr(siswa, 'status', 'Aktif') == 'Alumni':
        return jsonify({"success": False, "message": f"Siswa {siswa.nama} sudah berstatus Alumni / Lulus."}), 400

    if tipe not in ["Izin Masuk", "Izin Meninggalkan Kelas"]:
        return jsonify({"success": False, "message": "Keperluan harus 'Izin Masuk' atau 'Izin Meninggalkan Kelas'."}), 400

    if not jam_ke:
        return jsonify({"success": False, "message": "Jam pelajaran ke- wajib diisi."}), 400

    if not alasan:
        return jsonify({"success": False, "message": "Alasan izin wajib diisi."}), 400

    if len(alasan) > 80:
        return jsonify({"success": False, "message": "Alasan izin maksimal 70-80 karakter agar pas pada lembar format E-Slip."}), 400

    if not petugas_piket:
        return jsonify({"success": False, "message": "Nama petugas piket wajib diisi."}), 400

    try:
        if tanggal_str:
            tgl = datetime.strptime(tanggal_str, "%Y-%m-%d").date()
        else:
            tgl = date.today()
    except ValueError:
        tgl = date.today()

    # Validasi hari libur sekolah (Sabtu & Minggu)
    if tgl.weekday() in [5, 6]:
        return jsonify({"success": False, "message": "Surat izin piket tidak dapat diterbitkan pada hari Sabtu atau Minggu (hari libur sekolah)."}), 400

    if not hari:
        nama_hari = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
        hari = nama_hari[tgl.weekday()]

    try:
        baru = IzinPiket(
            siswa_id=siswa.id,
            hari=hari,
            tanggal=tgl,
            tipe=tipe,
            jam_ke=jam_ke,
            alasan=alasan,
            petugas_piket=petugas_piket
        )
        db.session.add(baru)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Surat {tipe} untuk {siswa.nama} ({siswa.kelas}) berhasil diterbitkan.",
            "data": baru.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@piket_bp.route('/api/piket/izin', methods=['GET'])
def get_izin_piket():
    tanggal_param = request.args.get('tanggal')
    search = request.args.get('search', '').strip()
    
    query = IzinPiket.query.join(Siswa, IzinPiket.siswa_id == Siswa.id)
    
    if tanggal_param and tanggal_param != 'ALL':
        try:
            tgl = datetime.strptime(tanggal_param, "%Y-%m-%d").date()
            query = query.filter(IzinPiket.tanggal == tgl)
        except Exception:
            pass
            
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Siswa.nama.ilike(search_term)) |
            (Siswa.nis.ilike(search_term)) |
            (Siswa.kelas.ilike(search_term)) |
            (IzinPiket.alasan.ilike(search_term))
        )
        
    records = query.order_by(IzinPiket.created_at.desc()).all()
    return jsonify([r.to_dict() for r in records])


@piket_bp.route('/api/piket/izin/<int:id>', methods=['DELETE'])
def delete_izin_piket(id):
    izin = IzinPiket.query.get(id)
    if not izin:
        return jsonify({"success": False, "message": "Data izin piket tidak ditemukan."}), 404
    try:
        db.session.delete(izin)
        db.session.commit()
        return jsonify({"success": True, "message": "Surat izin piket berhasil dihapus."})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

