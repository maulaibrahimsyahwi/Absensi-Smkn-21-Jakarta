from datetime import datetime, date
from flask import Blueprint, request, jsonify
from models import db, Siswa, IzinPiket, AbsensiHarian, PengajuanIzin, PelanggaranSiswa, PengaturanJadwal
from routes.pelanggaran_routes import catat_pelanggaran_terlambat
from utils.auth_middleware import token_required, role_required
from utils.audit_trail import record_audit_log
from config import SEKOLAH_POLYGON, SEKOLAH_LATITUDE, SEKOLAH_LONGITUDE, MAX_RADIUS_SEKOLAH
from utils.helpers import is_point_in_polygon, calculate_distance_meters
from utils.realtime_bus import notify_data_changed

piket_bp = Blueprint('piket', __name__)

# ================= MEJA GURU PIKET (DISPENSASI MASUK / MENINGGALKAN KELAS) =================

@piket_bp.route('/api/piket/izin', methods=['POST'])
@token_required
@role_required(['piket', 'admin'])
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

    # Validasi Geofence Guru Piket: Hanya boleh diterbitkan jika perangkat piket berada di lingkungan SMKN 21
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    if latitude is not None and longitude is not None:
        try:
            lat = float(latitude)
            lon = float(longitude)
            in_poly = is_point_in_polygon(lat, lon, SEKOLAH_POLYGON)
            dist = calculate_distance_meters(lat, lon, SEKOLAH_LATITUDE, SEKOLAH_LONGITUDE)
            if not (in_poly or (dist is not None and dist <= MAX_RADIUS_SEKOLAH)):
                return jsonify({
                    "success": False,
                    "message": f"Penerbitan surat izin piket ditolak! Perangkat Guru Piket terdeteksi di luar area resmi SMKN 21 Jakarta (jarak ~{dist}m dari sekolah). Surat izin hanya dapat diterbitkan di meja piket sekolah."
                }), 403
        except (ValueError, TypeError):
            pass

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
        notify_data_changed("piket")
        return jsonify({
            "success": True,
            "message": f"Surat {tipe} untuk {siswa.nama} ({siswa.kelas}) berhasil diterbitkan.",
            "data": baru.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@piket_bp.route('/api/piket/izin', methods=['GET'])
@token_required
@role_required(['piket', 'admin'])
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
@token_required
@role_required(['admin'])
def delete_izin_piket(id):
    izin = IzinPiket.query.get(id)
    if not izin:
        return jsonify({"success": False, "message": "Data izin piket tidak ditemukan."}), 404
    try:
        db.session.delete(izin)
        db.session.commit()
        notify_data_changed("piket")
        return jsonify({"success": True, "message": "Surat izin piket berhasil dihapus."})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@piket_bp.route('/api/piket/summary_today', methods=['GET'])
@token_required
@role_required(['piket', 'admin'])
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


# ================= PUSAT NOTIFIKASI GURU PIKET (EVENT-DRIVEN & ACTIONABLE) =================

@piket_bp.route('/api/piket/notifikasi', methods=['GET'])
@token_required
@role_required(['piket', 'admin'])
def get_piket_notifikasi():
    """
    Mengambil daftar notifikasi terpadu untuk Guru Piket sesuai kaidah notifikasi:
    1. Surat Pengajuan Izin/Sakit Siswa yang MENUNGGU VERIFIKASI (Perlu Tindakan).
    2. Siswa yang Tercatat Terlambat Hari Ini (Kejadian Presensi Pagi Hari Ini).
    3. Dispensasi Masuk/Meninggalkan Kelas (E-Slip) yang diterbitkan hari ini.
    """
    today = date.today()
    notifikasi = []

    try:
        # 1. Pengajuan Izin Siswa yang Masih Menunggu Persetujuan Guru Piket (Prioritas Utama)
        pending_izin = PengajuanIzin.query.filter_by(status_pengajuan='Menunggu')\
            .order_by(PengajuanIzin.created_at.desc()).limit(15).all()

        for p in pending_izin:
            siswa = Siswa.query.get(p.siswa_id)
            nama_siswa = siswa.nama if siswa else "Siswa"
            kelas_siswa = siswa.kelas if siswa else "-"

            notifikasi.append({
                "id": f"piket-izin-pending-{p.id}",
                "type": "izin_menunggu",
                "category": "warning",
                "judul": f"Pengajuan {p.jenis}: {nama_siswa}",
                "pesan": f"{nama_siswa} ({kelas_siswa}) mengajukan surat {p.jenis} periode {p.tanggal_mulai.strftime('%d/%m')} s/d {p.tanggal_selesai.strftime('%d/%m')}. Alasan: \"{p.alasan}\"",
                "waktu": p.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "badge": "Perlu Verifikasi",
                "nama": nama_siswa,
                "kelas": kelas_siswa,
                "status_pengajuan": "Menunggu",
                "action_url": "/dashboard?tab=verifikasi_izin",
                "action_label": "Verifikasi"
            })
    except Exception:
        pass

    try:
        # 2. Siswa yang Terlambat Hari Ini (Informasi Operasional Pagi Ini)
        terlambat_today = AbsensiHarian.query.filter(
            db.func.date(AbsensiHarian.waktu) == today,
            AbsensiHarian.status == 'Terlambat'
        ).order_by(AbsensiHarian.waktu.desc()).limit(15).all()

        for ab in terlambat_today:
            siswa = Siswa.query.get(ab.siswa_id)
            nama_siswa = siswa.nama if siswa else "Siswa"
            kelas_siswa = siswa.kelas if siswa else "-"

            notifikasi.append({
                "id": f"piket-terlambat-{ab.id}",
                "type": "terlambat",
                "category": "danger",
                "judul": f"Keterlambatan: {nama_siswa}",
                "pesan": f"{nama_siswa} ({kelas_siswa}) melakukan presensi pada {ab.waktu.strftime('%H:%M:%S')} WIB (melewati batas 06:30 WIB).",
                "waktu": ab.waktu.strftime("%Y-%m-%d %H:%M:%S"),
                "badge": "Terlambat",
                "nama": nama_siswa,
                "kelas": kelas_siswa,
                "action_url": "/dashboard?tab=buku_pelanggaran",
                "action_label": "Lihat Pelanggaran"
            })
    except Exception:
        pass

    try:
        # 3. E-Slip Dispensasi Meja Piket Hari Ini
        piket_today = IzinPiket.query.filter(IzinPiket.tanggal == today)\
            .order_by(IzinPiket.created_at.desc()).limit(10).all()

        for ip in piket_today:
            siswa = Siswa.query.get(ip.siswa_id)
            nama_siswa = siswa.nama if siswa else "Siswa"
            kelas_siswa = siswa.kelas if siswa else "-"

            notifikasi.append({
                "id": f"piket-slip-{ip.id}",
                "type": "piket",
                "category": "info",
                "judul": f"E-Slip {ip.tipe}: {nama_siswa}",
                "pesan": f"{nama_siswa} ({kelas_siswa}) izin jam ke-{ip.jam_ke} (\"{ip.alasan}\"). Disahkan oleh {ip.petugas_piket}.",
                "waktu": ip.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "badge": ip.tipe,
                "nama": nama_siswa,
                "kelas": kelas_siswa,
                "action_url": "/dashboard?tab=manajemen_piket",
                "action_label": "Buka Meja Piket"
            })
    except Exception:
        pass

    # Urutkan dari notifikasi yang paling baru
    notifikasi.sort(key=lambda x: x.get('waktu', ''), reverse=True)

    return jsonify({
        "success": True,
        "total": len(notifikasi),
        "notifikasi": notifikasi
    })


# ================= MODE DARURAT JARINGAN & PENGATURAN JADWAL OPERASIONAL =================

@piket_bp.route('/api/piket/mode_darurat', methods=['GET'])
@token_required
def get_mode_darurat():
    """Mengambil status Mode Darurat Jaringan terkini."""
    cfg = PengaturanJadwal.query.first()
    if not cfg:
        cfg = PengaturanJadwal()
        db.session.add(cfg)
        db.session.commit()
    return jsonify({
        "success": True,
        "data": cfg.to_dict()
    })


@piket_bp.route('/api/piket/mode_darurat', methods=['POST'])
@token_required
@role_required(['piket', 'admin'])
def toggle_mode_darurat():
    """
    Mengaktifkan atau menonaktifkan Mode Darurat Jaringan oleh Guru Piket / Admin.
    Memberikan toleransi waktu keterlambatan otomatis (default +15 menit).
    """
    data = request.json or {}
    aktif = data.get('status', data.get('aktif', True))
    toleransi = data.get('toleransi_menit', 15)

    cfg = PengaturanJadwal.query.first()
    if not cfg:
        cfg = PengaturanJadwal()
        db.session.add(cfg)

    cfg.mode_darurat_jaringan = bool(aktif)
    if toleransi is not None:
        try:
            cfg.toleransi_darurat_menit = max(5, min(60, int(toleransi)))
        except (ValueError, TypeError):
            pass

    current_u = getattr(request, 'current_user', {})
    cfg.updated_by = current_u.get('identifier', 'Guru Piket')
    db.session.commit()
    notify_data_changed("piket")
    notify_data_changed("presensi")

    status_str = f"diaktifkan (+{cfg.toleransi_darurat_menit} menit toleransi)" if cfg.mode_darurat_jaringan else "dinonaktifkan"
    record_audit_log(
        user_id=current_u.get('user_id'),
        role=current_u.get('role', 'piket'),
        user_name=current_u.get('identifier', 'Guru Piket'),
        action='MODE_DARURAT_JARINGAN',
        target_type='PengaturanJadwal',
        target_id=cfg.id,
        keterangan=f"Mode Darurat Jaringan {status_str}"
    )

    return jsonify({
        "success": True,
        "message": f"Mode Darurat Jaringan berhasil {status_str}.",
        "mode_darurat": cfg.mode_darurat_jaringan,
        "toleransi_menit": cfg.toleransi_darurat_menit,
        "data": cfg.to_dict()
    })


@piket_bp.route('/api/jadwal', methods=['GET'])
def get_jadwal():
    """Mengambil konfigurasi jadwal operasional sekolah."""
    cfg = PengaturanJadwal.query.first()
    if not cfg:
        cfg = PengaturanJadwal()
        db.session.add(cfg)
        db.session.commit()
    return jsonify({
        "success": True,
        "data": cfg.to_dict()
    })


@piket_bp.route('/api/jadwal', methods=['PUT'])
@token_required
@role_required(['admin'])
def update_jadwal():
    """Memperbarui jam masuk operasional sekolah (Normal, Ramadhan, Ujian, Jumat)."""
    data = request.json or {}
    cfg = PengaturanJadwal.query.first()
    if not cfg:
        cfg = PengaturanJadwal()
        db.session.add(cfg)

    if data.get('jam_mulai_masuk'):
        cfg.jam_mulai_masuk = str(data['jam_mulai_masuk']).strip()
    if data.get('jam_batas_masuk'):
        cfg.jam_batas_masuk = str(data['jam_batas_masuk']).strip()
    if data.get('jam_batas_jumat'):
        cfg.jam_batas_jumat = str(data['jam_batas_jumat']).strip()
    if data.get('keterangan'):
        cfg.keterangan = str(data['keterangan']).strip()
    if data.get('tahun_ajaran'):
        cfg.tahun_ajaran = str(data['tahun_ajaran']).strip()
    if data.get('semester'):
        cfg.semester = str(data['semester']).strip()

    current_u = getattr(request, 'current_user', {})
    cfg.updated_by = current_u.get('identifier', 'Admin')
    db.session.commit()
    notify_data_changed("piket")
    notify_data_changed("presensi")

    return jsonify({
        "success": True,
        "message": "Pengaturan jadwal operasional & tahun ajaran presensi berhasil diperbarui!",
        "data": cfg.to_dict()
    })



