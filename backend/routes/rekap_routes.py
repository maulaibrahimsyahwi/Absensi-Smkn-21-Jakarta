from datetime import datetime, date, time
from flask import Blueprint, request, jsonify
from sqlalchemy import extract
from sqlalchemy.orm import joinedload
from models import db, Siswa, AbsensiHarian, AbsensiPerpustakaan, PengajuanIzin, PelanggaranSiswa
from utils.auth_middleware import token_required, role_required

rekap_bp = Blueprint('rekap', __name__)

# ================= REKAP & MONITORING KEHADIRAN SEMUA SISWA =================

@rekap_bp.route('/api/rekap/harian', methods=['GET'])
@rekap_bp.route('/api/absensi_harian', methods=['GET'])
@token_required
@role_required(['piket', 'admin'])
def get_rekap_harian():
    bulan = request.args.get('bulan')
    tahun = request.args.get('tahun')
    page = request.args.get('page', type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    # Gunakan joinedload untuk mengeliminasi N+1 SQL query pada relasi siswa
    query = AbsensiHarian.query.options(joinedload(AbsensiHarian.siswa))
    if tahun and tahun != 'ALL':
        try:
            query = query.filter(extract('year', AbsensiHarian.waktu) == int(tahun))
        except Exception:
            pass
    if bulan and bulan != 'ALL':
        try:
            query = query.filter(extract('month', AbsensiHarian.waktu) == int(bulan))
        except Exception:
            pass
        
    query = query.order_by(AbsensiHarian.waktu.desc())

    if page:
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        return jsonify({
            "items": [r.to_dict() for r in paginated.items],
            "total": paginated.total,
            "pages": paginated.pages,
            "page": paginated.page,
            "per_page": per_page
        })

    rekap = query.all()
    return jsonify([r.to_dict() for r in rekap])


@rekap_bp.route('/api/rekap/perpus', methods=['GET'])
@rekap_bp.route('/api/absensi_perpus', methods=['GET'])
@token_required
@role_required(['piket', 'admin'])
def get_rekap_perpus():
    bulan = request.args.get('bulan')
    tahun = request.args.get('tahun')
    page = request.args.get('page', type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    # Gunakan joinedload untuk mengeliminasi N+1 SQL query
    query = AbsensiPerpustakaan.query.options(joinedload(AbsensiPerpustakaan.siswa))
    if tahun and tahun != 'ALL':
        try:
            query = query.filter(extract('year', AbsensiPerpustakaan.waktu) == int(tahun))
        except Exception:
            pass
    if bulan and bulan != 'ALL':
        try:
            query = query.filter(extract('month', AbsensiPerpustakaan.waktu) == int(bulan))
        except Exception:
            pass
        
    query = query.order_by(AbsensiPerpustakaan.waktu.desc())

    if page:
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        return jsonify({
            "items": [r.to_dict() for r in paginated.items],
            "total": paginated.total,
            "pages": paginated.pages,
            "page": paginated.page,
            "per_page": per_page
        })

    rekap = query.all()
    return jsonify([r.to_dict() for r in rekap])


@rekap_bp.route('/api/rekap/siswa_periode', methods=['GET'])
@rekap_bp.route('/api/rekap', methods=['GET'])
@token_required
@role_required(['piket', 'admin'])
def get_rekap_siswa_periode():
    # Menampilkan akumulasi kehadiran setiap siswa dalam kurun waktu Bulan atau Tahun yang dipilih
    mode = request.args.get('mode', 'bulan')  # 'bulan' atau 'tahun'
    bulan = request.args.get('bulan', datetime.now().month)
    tahun = request.args.get('tahun', datetime.now().year)
    
    try:
        tahun = int(tahun)
    except Exception:
        tahun = datetime.now().year
        
    try:
        bulan = int(bulan)
    except Exception:
        bulan = datetime.now().month

    # 1. Ambil kolom esensial data siswa tanpa memuat blob gambar Base64 ke memori
    all_siswa = db.session.query(
        Siswa.id, Siswa.nis, Siswa.nama, Siswa.kelas, Siswa.status
    ).order_by(Siswa.kelas.asc(), Siswa.nama.asc()).all()

    siswa_map = {}
    for s_id, s_nis, s_nama, s_kelas, s_status in all_siswa:
        siswa_map[s_id] = {
            "siswa_id": s_id,
            "nis": s_nis,
            "nama": s_nama,
            "kelas": s_kelas,
            "status": s_status or "Aktif",
            "tepat_waktu": 0,
            "terlambat": 0,
            "sakit": 0,
            "izin": 0,
            "alpa": 0,
            "total_hadir": 0,
            "kunjungan_perpus": 0
        }

    # 2. Agregasi presensi harian langsung di level database via SQL GROUP BY
    q_harian_agg = db.session.query(
        AbsensiHarian.siswa_id,
        AbsensiHarian.status,
        db.func.count(AbsensiHarian.id)
    ).filter(extract('year', AbsensiHarian.waktu) == tahun)
    if mode == 'bulan':
        q_harian_agg = q_harian_agg.filter(extract('month', AbsensiHarian.waktu) == bulan)
    harian_agg_results = q_harian_agg.group_by(AbsensiHarian.siswa_id, AbsensiHarian.status).all()

    total_tepat_waktu = 0
    total_terlambat = 0
    total_sakit = 0
    total_izin = 0
    total_alpa = 0
    total_presensi_harian = 0

    for sid, status_str, count_val in harian_agg_results:
        total_presensi_harian += count_val
        if sid in siswa_map:
            if status_str == "Tepat Waktu":
                siswa_map[sid]["tepat_waktu"] += count_val
                siswa_map[sid]["total_hadir"] += count_val
                total_tepat_waktu += count_val
            elif status_str == "Terlambat":
                siswa_map[sid]["terlambat"] += count_val
                siswa_map[sid]["total_hadir"] += count_val
                total_terlambat += count_val
            elif status_str == "Sakit":
                siswa_map[sid]["sakit"] += count_val
                total_sakit += count_val
            elif status_str == "Izin":
                siswa_map[sid]["izin"] += count_val
                total_izin += count_val
            elif status_str == "Alpa":
                siswa_map[sid]["alpa"] += count_val
                total_alpa += count_val

    # 3. Agregasi kunjungan perpustakaan langsung di database via SQL GROUP BY
    q_perpus_agg = db.session.query(
        AbsensiPerpustakaan.siswa_id,
        db.func.count(AbsensiPerpustakaan.id)
    ).filter(extract('year', AbsensiPerpustakaan.waktu) == tahun)
    if mode == 'bulan':
        q_perpus_agg = q_perpus_agg.filter(extract('month', AbsensiPerpustakaan.waktu) == bulan)
    perpus_agg_results = q_perpus_agg.group_by(AbsensiPerpustakaan.siswa_id).all()

    total_perpus = 0
    for sid, count_val in perpus_agg_results:
        total_perpus += count_val
        if sid in siswa_map:
            siswa_map[sid]["kunjungan_perpus"] += count_val

    daftar = list(siswa_map.values())

    return jsonify({
        "mode": mode,
        "bulan": bulan,
        "tahun": tahun,
        "statistik": {
            "total_siswa": len(all_siswa),
            "total_presensi_harian": total_presensi_harian,
            "total_tepat_waktu": total_tepat_waktu,
            "total_terlambat": total_terlambat,
            "total_sakit": total_sakit,
            "total_izin": total_izin,
            "total_alpa": total_alpa,
            "total_perpus": total_perpus
        },
        "daftar": daftar
    })


@rekap_bp.route('/api/rekap/available_years', methods=['GET'])
@token_required
def get_available_years():
    try:
        years_set = set()
        current_year = datetime.now().year
        years_set.add(current_year)

        # Selalu sertakan minimal 5 tahun terakhir
        for i in range(5):
            years_set.add(current_year - i)

        # Ambil tahun unik dari riwayat presensi harian
        harian_years = db.session.query(extract('year', AbsensiHarian.waktu)).distinct().all()
        for (y,) in harian_years:
            if y:
                years_set.add(int(y))

        # Ambil tahun unik dari riwayat kunjungan perpustakaan
        perpus_years = db.session.query(extract('year', AbsensiPerpustakaan.waktu)).distinct().all()
        for (y,) in perpus_years:
            if y:
                years_set.add(int(y))

        sorted_years = sorted(list(years_set), reverse=True)
        return jsonify(sorted_years)
    except Exception as e:
        return jsonify([datetime.now().year - i for i in range(5)])


@rekap_bp.route('/api/rekap/admin_summary', methods=['GET'])
@token_required
@role_required(['admin', 'piket'])
def get_admin_summary():
    """
    Mengambil statistik komprehensif seluruh sekolah untuk Beranda Administrator.
    """
    today = date.today()
    try:
        # 1. Data Siswa
        total_siswa = Siswa.query.count()
        siswa_aktif = Siswa.query.filter((Siswa.status == 'Aktif') | (Siswa.status == None)).count()
        siswa_alumni = Siswa.query.filter(Siswa.status == 'Alumni').count()
        siswa_biometrik = Siswa.query.filter(Siswa.face_encoding.isnot(None), Siswa.face_encoding != '').count()

        # 2. Kehadiran Hari Ini
        presensi_today = AbsensiHarian.query.filter(db.func.date(AbsensiHarian.waktu) == today).all()
        tepat_waktu = sum(1 for p in presensi_today if p.status == 'Tepat Waktu')
        terlambat = sum(1 for p in presensi_today if p.status == 'Terlambat')
        sakit = sum(1 for p in presensi_today if p.status == 'Sakit')
        izin = sum(1 for p in presensi_today if p.status == 'Izin')
        alpa = sum(1 for p in presensi_today if p.status == 'Alpa')
        total_hadir_today = tepat_waktu + terlambat
        belum_absen = max(0, siswa_aktif - (tepat_waktu + terlambat + sakit + izin + alpa))

        persentase_kehadiran = round((total_hadir_today / siswa_aktif * 100), 1) if siswa_aktif > 0 else 0

        # 3. Pengajuan Izin Menunggu
        izin_menunggu = PengajuanIzin.query.filter(PengajuanIzin.status_pengajuan == 'Menunggu').count()

        # 4. Pelanggaran Bulan Ini
        now = datetime.now()
        pelanggaran_bulan_ini = PelanggaranSiswa.query.filter(
            extract('year', PelanggaranSiswa.tanggal_waktu) == now.year,
            extract('month', PelanggaranSiswa.tanggal_waktu) == now.month
        ).count()

        # 5. Aktivitas Presensi Terbaru Hari Ini
        recent_presensi = AbsensiHarian.query.filter(db.func.date(AbsensiHarian.waktu) == today)\
            .order_by(AbsensiHarian.waktu.desc()).limit(6).all()

        return jsonify({
            "success": True,
            "data": {
                "total_siswa": total_siswa,
                "siswa_aktif": siswa_aktif,
                "siswa_alumni": siswa_alumni,
                "siswa_biometrik": siswa_biometrik,
                "persentase_biometrik": round((siswa_biometrik / siswa_aktif * 100), 1) if siswa_aktif > 0 else 0,
                "total_hadir_today": total_hadir_today,
                "tepat_waktu": tepat_waktu,
                "terlambat": terlambat,
                "sakit": sakit,
                "izin": izin,
                "alpa": alpa,
                "belum_absen": belum_absen,
                "persentase_kehadiran": persentase_kehadiran,
                "izin_menunggu": izin_menunggu,
                "pelanggaran_bulan_ini": pelanggaran_bulan_ini,
                "recent_presensi": [r.to_dict() for r in recent_presensi]
            }
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@rekap_bp.route('/api/rekap/generate_alpa_today', methods=['POST'])
@token_required
@role_required(['admin'])
def generate_alpa_today():
    """
    Otomatis mencatat status 'Alpa' (Tidak Hadir) untuk seluruh siswa aktif
    yang belum memiliki catatan presensi harian (dan tidak memiliki Izin/Sakit disetujui) hari ini.
    """
    today = date.today()
    today_start = datetime.combine(today, time.min)
    today_end = datetime.combine(today, time.max)

    try:
        siswa_aktif = Siswa.query.filter((Siswa.status == 'Aktif') | (Siswa.status == None)).all()
        
        absen_today = AbsensiHarian.query.filter(
            AbsensiHarian.waktu >= today_start,
            AbsensiHarian.waktu <= today_end
        ).all()
        siswa_absen_ids = set(a.siswa_id for a in absen_today)

        izin_disetujui = PengajuanIzin.query.filter(
            PengajuanIzin.status_pengajuan == 'Disetujui',
            PengajuanIzin.tanggal_mulai <= today,
            PengajuanIzin.tanggal_selesai >= today
        ).all()
        siswa_izin_ids = set(i.siswa_id for i in izin_disetujui)

        created_count = 0
        now_dt = datetime.now()
        for s in siswa_aktif:
            if s.id not in siswa_absen_ids and s.id not in siswa_izin_ids:
                alpa_record = AbsensiHarian(
                    siswa_id=s.id,
                    status="Alpa",
                    waktu=now_dt
                )
                db.session.add(alpa_record)
                created_count += 1

        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Berhasil mencatat status Alpa untuk {created_count} siswa aktif yang tidak hadir hari ini.",
            "alpa_count": created_count
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


