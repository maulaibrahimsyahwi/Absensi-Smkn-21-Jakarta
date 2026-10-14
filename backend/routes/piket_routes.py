from datetime import datetime, date, time
from flask import Blueprint, request, jsonify
from sqlalchemy.orm import joinedload
from models import db, Siswa, IzinPiket, AbsensiHarian, PengajuanIzin, PelanggaranSiswa, PengaturanJadwal
from routes.pelanggaran_routes import catat_pelanggaran_terlambat
from utils.auth_middleware import token_required, role_required
from utils.audit_trail import record_audit_log
from config import SEKOLAH_POLYGON, SEKOLAH_LATITUDE, SEKOLAH_LONGITUDE, MAX_RADIUS_SEKOLAH
from utils.helpers import is_point_in_polygon, calculate_distance_meters
from utils.realtime_bus import notify_data_changed
from utils.file_storage import save_base64_file

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

    raw_petugas_sig = data.get('tanda_tangan_petugas')
    raw_siswa_sig = data.get('tanda_tangan_siswa')

    if not raw_petugas_sig:
        return jsonify({
            "success": False,
            "message": "Guru Piket wajib menyertakan tanda tangan digital sebelum menerbitkan surat izin."
        }), 400

    tanda_tangan_petugas = save_base64_file(raw_petugas_sig, subfolder='signatures', prefix="sig_piket_petugas")
    tanda_tangan_siswa = save_base64_file(raw_siswa_sig, subfolder='signatures', prefix=f"sig_piket_{siswa.nis}") if raw_siswa_sig else None


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
            kelas=siswa.kelas,
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
    
    query = IzinPiket.query.options(joinedload(IzinPiket.siswa)).join(Siswa, IzinPiket.siswa_id == Siswa.id)
    
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
        # Jika tipe izin adalah "Izin Masuk", batalkan juga poin pelanggaran terlambat (+5 poin) yang otomatis tercatat
        if izin.tipe == "Izin Masuk":
            start_of_day = datetime.combine(izin.tanggal, time.min)
            end_of_day = datetime.combine(izin.tanggal, time.max)
            pelanggaran_terkait = PelanggaranSiswa.query.filter(
                PelanggaranSiswa.siswa_id == izin.siswa_id,
                PelanggaranSiswa.jenis_pelanggaran == "Terlambat masuk sekolah",
                PelanggaranSiswa.tanggal_waktu >= start_of_day,
                PelanggaranSiswa.tanggal_waktu <= end_of_day
            ).first()
            if pelanggaran_terkait:
                db.session.delete(pelanggaran_terkait)
                notify_data_changed("pelanggaran")

        db.session.delete(izin)
        db.session.commit()
        notify_data_changed("piket")
        return jsonify({"success": True, "message": "Surat izin piket dan catatan keterlambatan terkait (jika ada) berhasil dihapus."})
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

        # 2. Siswa Terlambat Hari Ini (dari AbsensiHarian & Izin Masuk - Sargable Date Range)
        start_of_today = datetime.combine(today, time.min)
        end_of_today = datetime.combine(today, time.max)

        terlambat_presensi = AbsensiHarian.query.filter(
            AbsensiHarian.waktu >= start_of_today,
            AbsensiHarian.waktu <= end_of_today,
            AbsensiHarian.status == 'Terlambat'
        ).count()
        total_terlambat = max(terlambat_presensi, izin_masuk)

        # 3. Pengajuan Izin Siswa Online yang Menunggu Verifikasi
        izin_menunggu = PengajuanIzin.query.filter(PengajuanIzin.status_pengajuan == 'Menunggu').count()

        # 4. Pelanggaran Siswa Tercatat Hari Ini (Sargable Date Range)
        pelanggaran_today = PelanggaranSiswa.query.filter(
            PelanggaranSiswa.tanggal_waktu >= start_of_today,
            PelanggaranSiswa.tanggal_waktu <= end_of_today
        ).count()

        # 5. Daftar 6 surat izin piket terbaru hari ini
        recent_records = IzinPiket.query.options(joinedload(IzinPiket.siswa))\
            .join(Siswa, IzinPiket.siswa_id == Siswa.id)\
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
    start_of_today = datetime.combine(today, time.min)
    end_of_today = datetime.combine(today, time.max)
    notifikasi = []

    try:
        # 1. Pengajuan Izin Siswa yang Masih Menunggu Persetujuan Guru Piket (Prioritas Utama)
        pending_izin = PengajuanIzin.query.options(joinedload(PengajuanIzin.siswa))\
            .filter_by(status_pengajuan='Menunggu')\
            .order_by(PengajuanIzin.created_at.desc()).limit(15).all()

        for p in pending_izin:
            siswa = p.siswa
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
        # 2. Siswa yang Terlambat Hari Ini (Informasi Operasional Pagi Ini - Sargable & Eager Loaded)
        terlambat_today = AbsensiHarian.query.options(joinedload(AbsensiHarian.siswa)).filter(
            AbsensiHarian.waktu >= start_of_today,
            AbsensiHarian.waktu <= end_of_today,
            AbsensiHarian.status == 'Terlambat'
        ).order_by(AbsensiHarian.waktu.desc()).limit(15).all()

        for ab in terlambat_today:
            siswa = ab.siswa
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
        # 3. E-Slip Dispensasi Meja Piket Hari Ini (Eager Loaded)
        piket_today = IzinPiket.query.options(joinedload(IzinPiket.siswa))\
            .filter(IzinPiket.tanggal == today)\
            .order_by(IzinPiket.created_at.desc()).limit(10).all()

        for ip in piket_today:
            siswa = ip.siswa
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


# ================= MEJA PIKET SUITE (PRESENSI MANUAL, FORCE MAJEURE, DISPENSASI MASSAL) =================

@piket_bp.route('/api/piket/presensi_manual', methods=['POST'])
@token_required
@role_required(['piket', 'admin'])
def record_presensi_manual():
    """
    Fitur Guru Piket: Mencatat presensi kehadiran siswa darurat secara manual di meja piket
    (misal: kamera/HP siswa rusak, kendala aplikasi, atau verifikasi langsung tatap muka).
    """
    data = request.json or {}
    siswa_id = data.get('siswa_id')
    nis = str(data.get('nis', '')).strip()
    status_input = str(data.get('status', 'Hadir (Tepat Waktu)')).strip()
    alasan = str(data.get('alasan_override', 'Verifikasi Tatap Muka Meja Piket')).strip()
    catatan = str(data.get('catatan', '')).strip()

    siswa = None
    if siswa_id:
        siswa = Siswa.query.get(siswa_id)
    elif nis:
        siswa = Siswa.query.filter_by(nis=nis).first()

    if not siswa:
        return jsonify({"success": False, "message": "Siswa tidak ditemukan."}), 404

    now_dt = datetime.now()
    today_val = now_dt.date()
    start_today = datetime.combine(today_val, time.min)
    end_today = datetime.combine(today_val, time.max)

    current_u = getattr(request, 'current_user', {})
    officer_name = current_u.get('identifier', 'Guru Piket')

    cfg = PengaturanJadwal.query.first()
    curr_ta = cfg.tahun_ajaran if cfg and cfg.tahun_ajaran else "2026/2027"
    curr_sem = cfg.semester if cfg and cfg.semester else "Ganjil"

    # Cek apakah sudah ada catatan presensi hari ini
    existing = AbsensiHarian.query.filter(
        AbsensiHarian.siswa_id == siswa.id,
        AbsensiHarian.waktu >= start_today,
        AbsensiHarian.waktu <= end_today
    ).first()

    note_text = f"Manual oleh {officer_name}: {alasan}"
    if catatan:
        note_text += f" ({catatan})"

    if existing:
        existing.status = status_input
        existing.proxy_note = note_text
        existing.sumber = "manual_piket"
        db.session.commit()
    else:
        new_absen = AbsensiHarian(
            siswa_id=siswa.id,
            kelas=siswa.kelas,
            status=status_input,
            waktu=now_dt,
            sumber="manual_piket",
            is_flagged_proxy=False,
            proxy_note=note_text,
            tahun_ajaran=curr_ta,
            semester=curr_sem
        )
        db.session.add(new_absen)
        db.session.commit()

    if "Terlambat" in status_input:
        catat_pelanggaran_terlambat(
            siswa=siswa,
            waktu=now_dt,
            sumber="Manual Meja Piket",
            petugas=officer_name,
            alasan=note_text
        )

    record_audit_log(
        user_id=current_u.get('user_id'),
        role=current_u.get('role', 'piket'),
        user_name=officer_name,
        action='PRESENSI_MANUAL',
        target_type='AbsensiHarian',
        target_id=siswa.id,
        keterangan=f"Presensi manual {siswa.nama} ({siswa.kelas}) status '{status_input}' oleh {officer_name}"
    )

    notify_data_changed("presensi")
    notify_data_changed("piket")

    return jsonify({
        "success": True,
        "message": f"Presensi manual untuk {siswa.nama} berhasil dicatat dengan status: {status_input}."
    })


@piket_bp.route('/api/piket/force_majeure', methods=['POST'])
@token_required
@role_required(['piket', 'admin'])
def apply_force_majeure():
    """
    Fitur Guru Piket: Menerapkan dispensasi massal / pemutihan keterlambatan akibat kejadian force majeure
    (hujan badai, banjir, keterlambatan armada KRL/Transjakarta, dsb).
    Mengubah status 'Terlambat' menjadi 'Tepat Waktu (Dispensasi Force Majeure)' dan membatalkan poin pelanggarannya.
    """
    data = request.json or {}
    tanggal_str = data.get('tanggal')
    alasan = str(data.get('alasan', 'Force Majeure')).strip()

    target_date = date.today()
    if tanggal_str:
        try:
            target_date = datetime.strptime(str(tanggal_str).strip(), "%Y-%m-%d").date()
        except Exception:
            pass

    start_day = datetime.combine(target_date, time.min)
    end_day = datetime.combine(target_date, time.max)

    current_u = getattr(request, 'current_user', {})
    officer_name = current_u.get('identifier', 'Guru Piket')

    # Ambil seluruh presensi terlambat pada hari tersebut
    records_terlambat = AbsensiHarian.query.filter(
        AbsensiHarian.waktu >= start_day,
        AbsensiHarian.waktu <= end_day,
        AbsensiHarian.status.like('%Terlambat%')
    ).all()

    total_terdampak = len(records_terlambat)
    siswa_ids = [r.siswa_id for r in records_terlambat]

    for rec in records_terlambat:
        rec.status = "Tepat Waktu (Dispensasi Force Majeure)"
        rec.proxy_note = f"Pemutihan Force Majeure oleh {officer_name}: {alasan}"

    # Batalkan/hapus catatan pelanggaran terlambat otomatis pada tanggal tersebut
    if siswa_ids:
        PelanggaranSiswa.query.filter(
            PelanggaranSiswa.siswa_id.in_(siswa_ids),
            PelanggaranSiswa.tanggal_waktu >= start_day,
            PelanggaranSiswa.tanggal_waktu <= end_day,
            PelanggaranSiswa.jenis_pelanggaran == "Terlambat masuk sekolah"
        ).delete(synchronize_session=False)

    db.session.commit()

    record_audit_log(
        user_id=current_u.get('user_id'),
        role=current_u.get('role', 'piket'),
        user_name=officer_name,
        action='FORCE_MAJEURE_DISPENSATION',
        target_type='AbsensiHarian',
        target_id=target_date.isoformat(),
        keterangan=f"Pemutihan keterlambatan {total_terdampak} siswa akibat {alasan} oleh {officer_name}"
    )

    notify_data_changed("presensi")
    notify_data_changed("pelanggaran")
    notify_data_changed("piket")

    return jsonify({
        "success": True,
        "message": f"Dispensasi Force Majeure berhasil diterapkan. Sebanyak {total_terdampak} siswa terlambat telah diputihkan.",
        "total_terdampak": total_terdampak
    })


@piket_bp.route('/api/piket/dispensasi_massal', methods=['POST'])
@token_required
@role_required(['piket', 'admin'])
def apply_dispensasi_massal():
    """
    Fitur Guru Piket: Menerbitkan dispensasi kegiatan perwakilan/delegasi sekolah massal
    (lomba kejuruan, petugas upacara, OSIS, aksi sosial, atau acara dinas).
    """
    data = request.json or {}
    siswa_ids = data.get('siswa_ids', [])
    nama_kegiatan = str(data.get('nama_kegiatan', '')).strip()
    tipe = str(data.get('tipe', 'Dispensasi Kegiatan Sekolah')).strip()
    jam_ke = str(data.get('jam_ke', 'Sepanjang Hari Sekolah')).strip()
    guru_pendamping = str(data.get('guru_pendamping', '')).strip()
    keterangan = str(data.get('keterangan', '')).strip()

    if not isinstance(siswa_ids, list) or len(siswa_ids) == 0:
        return jsonify({"success": False, "message": "Pilih minimal satu siswa delegasi."}), 400

    if not nama_kegiatan:
        return jsonify({"success": False, "message": "Nama kegiatan atau delegasi wajib diisi."}), 400

    current_u = getattr(request, 'current_user', {})
    officer_name = current_u.get('identifier', 'Guru Piket')

    now_dt = datetime.now()
    today_val = now_dt.date()
    nama_hari = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"][today_val.weekday()]
    start_today = datetime.combine(today_val, time.min)
    end_today = datetime.combine(today_val, time.max)

    cfg = PengaturanJadwal.query.first()
    curr_ta = cfg.tahun_ajaran if cfg and cfg.tahun_ajaran else "2026/2027"
    curr_sem = cfg.semester if cfg and cfg.semester else "Ganjil"

    # Batch load seluruh siswa & catatan absensi hari ini (mengeliminasi 160+ N+1 queries)
    siswa_list = Siswa.query.filter(Siswa.id.in_(siswa_ids)).all()
    siswa_map = {s.id: s for s in siswa_list}

    absen_today_list = AbsensiHarian.query.filter(
        AbsensiHarian.siswa_id.in_(siswa_ids),
        AbsensiHarian.waktu >= start_today,
        AbsensiHarian.waktu <= end_today
    ).all()
    absen_map = {a.siswa_id: a for a in absen_today_list}

    created_count = 0
    for s_id in siswa_ids:
        siswa = siswa_map.get(s_id)
        if not siswa:
            continue

        # 1. Catat surat izin dispensasi piket
        izin = IzinPiket(
            siswa_id=siswa.id,
            kelas=siswa.kelas,
            hari=nama_hari,
            tanggal=today_val,
            tipe="Izin Masuk" if "Masuk" in tipe else "Izin Meninggalkan Kelas",
            jam_ke=jam_ke,
            alasan=f"Dispensasi: {nama_kegiatan}" + (f" ({keterangan})" if keterangan else "") + (f" - Pendamping: {guru_pendamping}" if guru_pendamping else ""),
            petugas_piket=officer_name
        )
        db.session.add(izin)

        # 2. Jika siswa belum absensi hari ini, otomatis berikan status Dispensasi resmi
        if s_id not in absen_map:
            new_absen = AbsensiHarian(
                siswa_id=siswa.id,
                kelas=siswa.kelas,
                status="Dispensasi",
                waktu=now_dt,
                sumber="dispensasi_massal",
                is_flagged_proxy=False,
                proxy_note=f"Dispensasi {nama_kegiatan} oleh {officer_name}",
                tahun_ajaran=curr_ta,
                semester=curr_sem
            )
            db.session.add(new_absen)
            absen_map[s_id] = new_absen

        created_count += 1

    db.session.commit()

    record_audit_log(
        user_id=current_u.get('user_id'),
        role=current_u.get('role', 'piket'),
        user_name=officer_name,
        action='DISPENSASI_MASSAL',
        target_type='IzinPiket',
        target_id=str(created_count),
        keterangan=f"Dispensasi massal '{nama_kegiatan}' untuk {created_count} siswa oleh {officer_name}"
    )

    notify_data_changed("piket")
    notify_data_changed("presensi")

    return jsonify({
        "success": True,
        "message": f"Berhasil menerbitkan dispensasi massal '{nama_kegiatan}' untuk {created_count} siswa.",
        "total": created_count
    })



