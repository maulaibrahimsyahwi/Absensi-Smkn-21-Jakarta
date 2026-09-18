from datetime import datetime, date
from flask import Blueprint, request, jsonify
from models import db, Siswa, IzinPiket, AbsensiHarian, PengajuanIzin, PelanggaranSiswa
from routes.pelanggaran_routes import catat_pelanggaran_terlambat

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

    # Validasi tanggal: hanya hari ini dan setelahnya (tidak dapat memilih hari sebelumnya)
    if tgl < date.today():
        return jsonify({"success": False, "message": "Surat izin piket hanya dapat diterbitkan untuk hari ini atau setelahnya (tidak dapat memilih tanggal yang telah lewat)."}), 400

    if not hari:
        nama_hari = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
        hari = nama_hari[tgl.weekday()]

    tanda_tangan_petugas = data.get('tanda_tangan_petugas')
    tanda_tangan_siswa = data.get('tanda_tangan_siswa')

    if not tanda_tangan_petugas:
        return jsonify({
            "success": False,
            "message": "Guru Piket wajib menyertakan tanda tangan digital sebelum menerbitkan surat izin."
        }), 400

    try:
        baru = IzinPiket(
            siswa_id=siswa.id,
            hari=hari,
            tanggal=tgl,
            tipe=tipe,
            jam_ke=jam_ke,
            alasan=alasan,
            petugas_piket=petugas_piket,
            tanda_tangan_petugas=tanda_tangan_petugas,
            tanda_tangan_siswa=tanda_tangan_siswa
        )
        db.session.add(baru)

        # Jika tipe izin adalah "Izin Masuk" (terlambat), otomatis catat ke Buku Saku Pelanggaran Siswa (+5 poin)
        if tipe == "Izin Masuk":
            waktu_izin = datetime.combine(tgl, datetime.now().time())
            catat_pelanggaran_terlambat(
                siswa=siswa,
                waktu=waktu_izin,
                sumber="Meja Guru Piket (Surat Izin Masuk)",
                petugas=petugas_piket or "Guru Piket SMKN 21",
                alasan=alasan or f"Terlambat hadir di sekolah (Jam ke-{jam_ke or '-'})",
                tanda_tangan_siswa=tanda_tangan_siswa
            )

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


@piket_bp.route('/api/piket/summary_today', methods=['GET'])
def get_piket_summary_today():
    """
    Mengambil ringkasan data operasional hari ini untuk Beranda Guru Piket.
    """
    today = date.today()
    try:
        # 1. Izin Piket Hari Ini
        izin_hari_ini = IzinPiket.query.filter(IzinPiket.tanggal == today).all()
        total_izin = len(izin_hari_ini)
        izin_masuk = sum(1 for i in izin_hari_ini if i.tipe == "Izin Masuk")
        izin_keluar = sum(1 for i in izin_hari_ini if i.tipe == "Izin Meninggalkan Kelas")

        # 2. Siswa Terlambat Hari Ini (dari AbsensiHarian & Izin Masuk)
        terlambat_presensi = AbsensiHarian.query.filter(
            db.func.date(AbsensiHarian.waktu) == today,
            AbsensiHarian.status == 'Terlambat'
        ).count()
        total_terlambat = max(terlambat_presensi, izin_masuk)

        # 3. Pengajuan Izin Siswa Online yang Menunggu Verifikasi
        izin_menunggu = PengajuanIzin.query.filter(PengajuanIzin.status_pengajuan == 'Menunggu').count()

        # 4. Pelanggaran Siswa Tercatat Hari Ini
        pelanggaran_today = PelanggaranSiswa.query.filter(
            db.func.date(PelanggaranSiswa.tanggal_waktu) == today
        ).count()

        # 5. Daftar 6 surat izin piket terbaru hari ini
        recent_records = IzinPiket.query.join(Siswa, IzinPiket.siswa_id == Siswa.id)\
            .filter(IzinPiket.tanggal == today)\
            .order_by(IzinPiket.created_at.desc())\
            .limit(6).all()

        return jsonify({
            "success": True,
            "data": {
                "tanggal": today.strftime("%Y-%m-%d"),
                "total_izin_hari_ini": total_izin,
                "izin_masuk_hari_ini": izin_masuk,
                "izin_keluar_hari_ini": izin_keluar,
                "total_terlambat_hari_ini": total_terlambat,
                "pengajuan_izin_menunggu": izin_menunggu,
                "pelanggaran_hari_ini": pelanggaran_today,
                "recent_izin": [r.to_dict() for r in recent_records]
            }
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

