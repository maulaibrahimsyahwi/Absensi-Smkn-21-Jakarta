from flask import Blueprint, request, jsonify
from datetime import datetime, time, date
from models import db, Siswa, AbsensiHarian, AbsensiPerpustakaan, PengajuanIzin, IzinPiket, PelanggaranSiswa, PengaturanPJJ
from utils.helpers import validate_siswa_input, invalidate_face_cache, is_kelas_pjj, is_school_day, is_presensi_open
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


# ================= NOTIFIKASI TERPADU SISWA =================

@siswa_bp.route('/api/siswa/notifikasi', methods=['GET'])
@token_required
def get_siswa_notifikasi():
    """
    Mengambil daftar notifikasi terpadu untuk siswa (PJJ, Pelanggaran, E-Slip Meja Piket,
    Kunjungan Perpustakaan, Status Surat Izin/Sakit, Pengingat Presensi Pagi, Keamanan Akun/Wajah).
    """
    current_user = getattr(request, 'current_user', {})
    user_role = current_user.get('role')
    user_id = current_user.get('user_id')

    siswa = None
    if user_role == 'siswa':
        siswa = Siswa.query.get(user_id)
    else:
        siswa_id = request.args.get('siswa_id', type=int)
        nis = request.args.get('nis')
        if siswa_id:
            siswa = Siswa.query.get(siswa_id)
        elif nis:
            siswa = Siswa.query.filter_by(nis=nis).first()

    if not siswa:
        return jsonify({"success": False, "message": "Data siswa tidak ditemukan."}), 404

    now_dt = datetime.now()
    cur_date = now_dt.date()
    cur_date_str = cur_date.strftime("%Y-%m-%d")
    notifikasi = []

    # 1. Mode Pembelajaran Jarak Jauh (PJJ)
    try:
        pjj_active, pjj_info = is_kelas_pjj(siswa.kelas, now_dt)
        if pjj_active:
            cfg = PengaturanPJJ.query.first()
            pjj_id_part = cfg.id if cfg else 1
            waktu_pjj = cfg.updated_at.strftime("%Y-%m-%d %H:%M:%S") if (cfg and cfg.updated_at) else now_dt.strftime("%Y-%m-%d %H:%M:%S")
            notifikasi.append({
                "id": f"pjj-{pjj_id_part}-{cur_date_str}",
                "type": "pjj",
                "category": "info",
                "judul": "Mode Daring (PJJ) Sedang Aktif",
                "pesan": f"Kelas Anda ({siswa.kelas}) terjadwal PJJ ({pjj_info or 'Belajar Dari Rumah'}). Anda diizinkan melakukan presensi mandiri dari rumah tanpa batasan radius sekolah.",
                "waktu": waktu_pjj,
                "badge": "PJJ Aktif",
                "action_url": "/absensi-harian",
                "action_label": "Buka Presensi"
            })
    except Exception:
        pass

    # 2. Pengingat Presensi Masuk Pagi (Hari Sekolah, Jam 05:00 - 06:30 WIB)
    try:
        if is_school_day(now_dt) and now_dt.time() >= time(5, 0) and now_dt.time() <= time(7, 30):
            today_start = datetime.combine(cur_date, time.min)
            today_end = datetime.combine(cur_date, time.max)
            absen_today = AbsensiHarian.query.filter(
                AbsensiHarian.siswa_id == siswa.id,
                AbsensiHarian.waktu >= today_start,
                AbsensiHarian.waktu <= today_end
            ).first()

            if not absen_today:
                is_past_gate = now_dt.time() > time(6, 30)
                notifikasi.append({
                    "id": f"reminder-presensi-{cur_date_str}",
                    "type": "presensi",
                    "category": "danger" if is_past_gate else "warning",
                    "judul": "Presensi Masuk Telah Lewat Batas" if is_past_gate else "Pengingat Presensi Pagi",
                    "pesan": "Gerbang batas tepat waktu telah ditutup pukul 06:30 WIB. Segera lakukan presensi kehadiran sekarang." if is_past_gate else "Presensi kehadiran pagi telah dibuka (05:00 - 06:30 WIB). Segera scan wajah sebelum pukul 06:30 WIB agar tidak tercatat terlambat.",
                    "waktu": now_dt.strftime("%Y-%m-%d %H:%M:%S"),
                    "badge": "Terlambat" if is_past_gate else "Presensi Pagi",
                    "action_url": "/absensi-harian",
                    "action_label": "Absen Sekarang"
                })
    except Exception:
        pass

    # 3. Catatan Pelanggaran Siswa (Buku Saku) & Milestone Poin (Hanya 7 Hari Terakhir)
    try:
        seven_days_ago = now_dt - timedelta(days=7)
        pelanggaran_records = PelanggaranSiswa.query.filter(
            ((PelanggaranSiswa.siswa_id == siswa.id) | (PelanggaranSiswa.nis == siswa.nis)),
            PelanggaranSiswa.tanggal_waktu >= seven_days_ago
        ).order_by(PelanggaranSiswa.tanggal_waktu.desc()).limit(5).all()

        total_poin = 0
        all_pelanggaran = PelanggaranSiswa.query.filter(
            (PelanggaranSiswa.siswa_id == siswa.id) | (PelanggaranSiswa.nis == siswa.nis)
        ).all()
        for p in all_pelanggaran:
            total_poin += int(p.poin or 0)

        # Milestone akumulasi poin jika >= 25 (Peringatan Aktif)
        if total_poin >= 75:
            notifikasi.append({
                "id": f"milestone-sp-75-{siswa.id}",
                "type": "milestone",
                "category": "danger",
                "judul": f"Peringatan Kritis: Akumulasi {total_poin} Poin (SP / Pleno)",
                "pesan": f"Total akumulasi poin pelanggaran Anda telah mencapai {total_poin} poin. Diwajibkan segera melapor ke Guru BK dan Wali Kelas untuk penanganan khusus.",
                "waktu": pelanggaran_records[0].tanggal_waktu.strftime("%Y-%m-%d %H:%M:%S") if pelanggaran_records else now_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "badge": "SP Pleno"
            })
        elif total_poin >= 50:
            notifikasi.append({
                "id": f"milestone-sp-50-{siswa.id}",
                "type": "milestone",
                "category": "danger",
                "judul": f"Peringatan: Akumulasi {total_poin} Poin (Panggilan Orang Tua / BK)",
                "pesan": f"Akumulasi poin kedisiplinan Anda mencapai {total_poin} poin. Menunggu jadwal pemanggilan orang tua dan bimbingan konseling.",
                "waktu": pelanggaran_records[0].tanggal_waktu.strftime("%Y-%m-%d %H:%M:%S") if pelanggaran_records else now_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "badge": "Panggilan BK"
            })
        elif total_poin >= 25:
            notifikasi.append({
                "id": f"milestone-sp-25-{siswa.id}",
                "type": "milestone",
                "category": "warning",
                "judul": f"Perhatian: Akumulasi {total_poin} Poin (Peringatan Wali Kelas)",
                "pesan": f"Akumulasi pelanggaran Anda telah mencapai {total_poin} poin. Harap lebih berhati-hati dan menjaga tata tertib sekolah.",
                "waktu": pelanggaran_records[0].tanggal_waktu.strftime("%Y-%m-%d %H:%M:%S") if pelanggaran_records else now_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "badge": "Peringatan"
            })

        for pel in pelanggaran_records:
            is_terlambat = "terlambat" in (pel.jenis_pelanggaran or "").lower()
            notifikasi.append({
                "id": f"pelanggaran-{pel.id}",
                "type": "pelanggaran",
                "category": "danger" if pel.poin >= 25 else "warning",
                "judul": f"Keterlambatan Tercatat (+{pel.poin} Poin)" if is_terlambat else f"Catatan Pelanggaran (+{pel.poin} Poin)",
                "pesan": f"{pel.jenis_pelanggaran}. Dicatat oleh {pel.nama_penanggung_jawab}." + (f" Catatan: \"{pel.keterangan}\"" if pel.keterangan else ""),
                "waktu": pel.tanggal_waktu.strftime("%Y-%m-%d %H:%M:%S"),
                "badge": f"+{pel.poin} Poin",
                "poin": pel.poin,
                "petugas": pel.nama_penanggung_jawab
            })
    except Exception:
        pass

    # 4. Dispensasi Meja Guru Piket Terbaru (3 Hari Terakhir)
    try:
        three_days_ago = now_dt - timedelta(days=3)
        piket_records = IzinPiket.query.filter(
            IzinPiket.siswa_id == siswa.id,
            IzinPiket.created_at >= three_days_ago
        ).order_by(IzinPiket.created_at.desc()).limit(3).all()

        for ip in piket_records:
            notifikasi.append({
                "id": f"piket-{ip.id}",
                "type": "piket",
                "category": "info",
                "judul": f"E-Slip {ip.tipe} Diterbitkan",
                "pesan": f"Surat {ip.tipe} untuk jam pelajaran ke-{ip.jam_ke} (\"{ip.alasan}\") telah disahkan oleh Guru Piket ({ip.petugas_piket}).",
                "waktu": ip.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "badge": ip.tipe,
                "petugas": ip.petugas_piket
            })
    except Exception:
        pass

    # 5. Status Surat Izin / Sakit Mandiri (Aktif / 7 Hari Terakhir)
    try:
        pengajuan_records = PengajuanIzin.query.filter(
            PengajuanIzin.siswa_id == siswa.id,
            (PengajuanIzin.created_at >= seven_days_ago) | (PengajuanIzin.status_pengajuan == 'Menunggu')
        ).order_by(PengajuanIzin.created_at.desc()).limit(5).all()

        for p in pengajuan_records:
            status = p.status_pengajuan
            if status == "Disetujui":
                cat = "success"
                judul = f"Surat {p.jenis} DISETUJUI"
                pesan = f"Pengajuan surat {p.jenis} periode {p.tanggal_mulai.strftime('%d/%m/%Y')} s/d {p.tanggal_selesai.strftime('%d/%m/%Y')} telah diverifikasi dan disetujui pihak sekolah."
            elif status == "Ditolak":
                cat = "danger"
                judul = f"Surat {p.jenis} DITOLAK"
                pesan = f"Pengajuan surat {p.jenis} periode {p.tanggal_mulai.strftime('%d/%m/%Y')} s/d {p.tanggal_selesai.strftime('%d/%m/%Y')} ditolak oleh pihak sekolah."
            else:
                cat = "warning"
                judul = f"Surat {p.jenis} Menunggu Verifikasi"
                pesan = f"Pengajuan surat {p.jenis} periode {p.tanggal_mulai.strftime('%d/%m/%Y')} s/d {p.tanggal_selesai.strftime('%d/%m/%Y')} sedang dalam proses verifikasi pihak sekolah."

            notifikasi.append({
                "id": f"izin-{p.id}",
                "type": "izin",
                "category": cat,
                "judul": judul,
                "pesan": pesan,
                "catatan": p.catatan_guru,
                "waktu": p.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "badge": p.jenis,
                "status_pengajuan": p.status_pengajuan,
                "tanggal_mulai": p.tanggal_mulai.strftime("%Y-%m-%d"),
                "tanggal_selesai": p.tanggal_selesai.strftime("%Y-%m-%d"),
                "alasan": p.alasan
            })
    except Exception:
        pass

    # 7. Keamanan Akun / Pendaftaran Wajah
    try:
        if not siswa.face_encoding:
            notifikasi.append({
                "id": "akun-face-unregistered",
                "type": "akun",
                "category": "warning",
                "judul": "Data Wajah Belum Terdaftar",
                "pesan": "Wajah Anda belum terdaftar di sistem presensi. Silakan daftarkan sampel wajah mandiri agar dapat melakukan presensi kehadiran harian.",
                "waktu": now_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "badge": "Biometrik",
                "action_url": "modal_face",
                "action_label": "Daftar Wajah"
            })
    except Exception:
        pass

    # Urutkan notifikasi dari yang terbaru ke terlama
    notifikasi.sort(key=lambda x: x.get('waktu', ''), reverse=True)

    return jsonify({
        "success": True,
        "total": len(notifikasi),
        "notifikasi": notifikasi
    })

