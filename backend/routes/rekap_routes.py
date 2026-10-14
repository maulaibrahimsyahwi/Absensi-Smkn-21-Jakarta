from datetime import datetime, date, time, timedelta
import calendar
from flask import Blueprint, request, jsonify
from sqlalchemy import extract
from sqlalchemy.orm import joinedload
from models import db, Siswa, AbsensiHarian, AbsensiPerpustakaan, PengajuanIzin, PelanggaranSiswa, AuditLog, PengaturanJadwal
from utils.auth_middleware import token_required, role_required
from utils.helpers import get_holiday_status, get_date_range
from utils.realtime_bus import notify_data_changed

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
    start_dt, end_dt = get_date_range(tahun, bulan)
    if start_dt and end_dt:
        query = query.filter(AbsensiHarian.waktu >= start_dt, AbsensiHarian.waktu <= end_dt)
        
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
    start_dt, end_dt = get_date_range(tahun, bulan)
    if start_dt and end_dt:
        query = query.filter(AbsensiPerpustakaan.waktu >= start_dt, AbsensiPerpustakaan.waktu <= end_dt)
        
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

    # 1. Ambil kolom esensial data siswa aktif (bukan soft-deleted)
    all_siswa = db.session.query(
        Siswa.id, Siswa.nis, Siswa.nama, Siswa.kelas, Siswa.status
    ).filter(Siswa.is_deleted == False).order_by(Siswa.kelas.asc(), Siswa.nama.asc()).all()

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
            "pjj": 0,
            "pkl": 0,
            "dispensasi": 0,
            "sakit": 0,
            "izin": 0,
            "alpa": 0,
            "total_hadir": 0,
            "kunjungan_perpus": 0
        }

    # 2. Agregasi presensi harian langsung di level database via SQL GROUP BY (Sargable Query)
    start_dt, end_dt = get_date_range(tahun, bulan if mode == 'bulan' else None)
    q_harian_agg = db.session.query(
        AbsensiHarian.siswa_id,
        AbsensiHarian.status,
        db.func.count(AbsensiHarian.id)
    )
    if start_dt and end_dt:
        q_harian_agg = q_harian_agg.filter(AbsensiHarian.waktu >= start_dt, AbsensiHarian.waktu <= end_dt)
    harian_agg_results = q_harian_agg.group_by(AbsensiHarian.siswa_id, AbsensiHarian.status).all()

    total_tepat_waktu = 0
    total_terlambat = 0
    total_pjj = 0
    total_pkl = 0
    total_dispensasi = 0
    total_sakit = 0
    total_izin = 0
    total_presensi_harian = 0

    for sid, status_str, count_val in harian_agg_results:
        total_presensi_harian += count_val
        status_clean = status_str or ""
        if sid in siswa_map:
            if "(PJJ)" in status_clean:
                siswa_map[sid]["pjj"] += count_val
                total_pjj += count_val
            elif "(PKL)" in status_clean:
                siswa_map[sid]["pkl"] += count_val
                total_pkl += count_val

            if "Tepat Waktu" in status_clean:
                siswa_map[sid]["tepat_waktu"] += count_val
                siswa_map[sid]["total_hadir"] += count_val
                total_tepat_waktu += count_val
            elif "Terlambat" in status_clean:
                siswa_map[sid]["terlambat"] += count_val
                siswa_map[sid]["total_hadir"] += count_val
                total_terlambat += count_val
            elif "Dispensasi" in status_clean:
                siswa_map[sid]["dispensasi"] += count_val
                siswa_map[sid]["total_hadir"] += count_val
                total_dispensasi += count_val
            elif "Sakit" in status_clean:
                siswa_map[sid]["sakit"] += count_val
                total_sakit += count_val
            elif "Izin" in status_clean:
                siswa_map[sid]["izin"] += count_val
                total_izin += count_val
            elif "Alpa" in status_clean:
                siswa_map[sid]["alpa"] += count_val

    # 3. Agregasi kunjungan perpustakaan langsung di database via SQL GROUP BY (Sargable Query)
    q_perpus_agg = db.session.query(
        AbsensiPerpustakaan.siswa_id,
        db.func.count(AbsensiPerpustakaan.id)
    )
    if start_dt and end_dt:
        q_perpus_agg = q_perpus_agg.filter(AbsensiPerpustakaan.waktu >= start_dt, AbsensiPerpustakaan.waktu <= end_dt)
    perpus_agg_results = q_perpus_agg.group_by(AbsensiPerpustakaan.siswa_id).all()

    total_perpus = 0
    for sid, count_val in perpus_agg_results:
        total_perpus += count_val
        if sid in siswa_map:
            siswa_map[sid]["kunjungan_perpus"] += count_val

    # 4. Hitung Hari Sekolah Efektif untuk Mengkalkulasi Alpa Otomatis (Batch In-Memory Optimizer)
    from models import HariLibur
    from utils.national_holidays import get_national_holiday_on_date
    import calendar

    now = datetime.now()
    today_date = now.date()
    effective_school_days = 0

    if mode == 'bulan':
        _, num_days = calendar.monthrange(tahun, bulan)
        start_d = date(tahun, bulan, 1)
        max_d = min(num_days, today_date.day) if (tahun == today_date.year and bulan == today_date.month) else num_days
        if tahun > today_date.year or (tahun == today_date.year and bulan > today_date.month):
            max_d = 0
        end_d = date(tahun, bulan, max_d) if max_d > 0 else start_d
    else:
        start_d = date(tahun, 1, 1)
        max_month = today_date.month if tahun == today_date.year else 12
        if tahun > today_date.year:
            max_month = 0
            end_d = start_d
        else:
            _, num_days = calendar.monthrange(tahun, max_month)
            max_d = min(num_days, today_date.day) if (tahun == today_date.year and max_month == today_date.month) else num_days
            end_d = date(tahun, max_month, max_d)

    # 1 Batch Query untuk mengeliminasi ratusan network round-trips ke PostgreSQL Cloud
    holidays_in_period = HariLibur.query.filter(
        HariLibur.is_active == True,
        HariLibur.tanggal_mulai <= end_d,
        HariLibur.tanggal_selesai >= start_d
    ).all()

    special_days_set = set()
    holiday_days_set = set()
    for h in holidays_in_period:
        cur_t = h.tanggal_mulai
        while cur_t <= h.tanggal_selesai:
            if h.tipe_hari == "masuk_khusus":
                special_days_set.add(cur_t)
            elif h.tipe_hari == "libur":
                holiday_days_set.add(cur_t)
            cur_t += timedelta(days=1)

    if mode == 'bulan':
        for d in range(1, max_d + 1):
            cur_dt = date(tahun, bulan, d)
            if cur_dt in special_days_set:
                effective_school_days += 1
            elif cur_dt in holiday_days_set:
                continue
            elif cur_dt.weekday() >= 5:
                continue
            elif get_national_holiday_on_date(cur_dt):
                continue
            else:
                effective_school_days += 1
    else:
        for m in range(1, max_month + 1):
            _, num_days = calendar.monthrange(tahun, m)
            m_max_d = min(num_days, today_date.day) if (tahun == today_date.year and m == today_date.month) else num_days
            for d in range(1, m_max_d + 1):
                cur_dt = date(tahun, m, d)
                if cur_dt in special_days_set:
                    effective_school_days += 1
                elif cur_dt in holiday_days_set:
                    continue
                elif cur_dt.weekday() >= 5:
                    continue
                elif get_national_holiday_on_date(cur_dt):
                    continue
                else:
                    effective_school_days += 1

    # Kalkulasi Alpa otomatis untuk setiap siswa aktif:
    # Alpa = Hari Sekolah Efektif - (Total Hadir + Sakit + Izin)
    total_alpa = 0
    for sid, sdata in siswa_map.items():
        if sdata["status"] == "Aktif" and effective_school_days > 0:
            total_accounted = sdata["total_hadir"] + sdata["sakit"] + sdata["izin"]
            auto_alpa = max(0, effective_school_days - total_accounted)
            sdata["alpa"] = max(sdata["alpa"], auto_alpa)
        total_alpa += sdata["alpa"]

    daftar = list(siswa_map.values())

    return jsonify({
        "mode": mode,
        "bulan": bulan,
        "tahun": tahun,
        "effective_school_days": effective_school_days,
        "statistik": {
            "total_siswa": len(all_siswa),
            "effective_school_days": effective_school_days,
            "total_presensi_harian": total_presensi_harian,
            "total_tepat_waktu": total_tepat_waktu,
            "total_terlambat": total_terlambat,
            "total_pjj": total_pjj,
            "total_pkl": total_pkl,
            "total_dispensasi": total_dispensasi,
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

        # 2. Kehadiran Hari Ini (Sargable Date Range)
        start_of_today = datetime.combine(today, time.min)
        end_of_today = datetime.combine(today, time.max)
        presensi_today = AbsensiHarian.query.filter(
            AbsensiHarian.waktu >= start_of_today,
            AbsensiHarian.waktu <= end_of_today
        ).all()
        tepat_waktu = sum(1 for p in presensi_today if 'Tepat Waktu' in (p.status or ''))
        terlambat = sum(1 for p in presensi_today if 'Terlambat' in (p.status or ''))
        pjj_count = sum(1 for p in presensi_today if '(PJJ)' in (p.status or ''))
        sakit = sum(1 for p in presensi_today if p.status == 'Sakit')
        izin = sum(1 for p in presensi_today if p.status == 'Izin')
        alpa = sum(1 for p in presensi_today if p.status == 'Alpa')
        total_hadir_today = tepat_waktu + terlambat
        belum_absen = max(0, siswa_aktif - (tepat_waktu + terlambat + sakit + izin + alpa))

        persentase_kehadiran = round((total_hadir_today / siswa_aktif * 100), 1) if siswa_aktif > 0 else 0

        # 3. Pengajuan Izin Menunggu
        izin_menunggu = PengajuanIzin.query.filter(PengajuanIzin.status_pengajuan == 'Menunggu').count()

        # 4. Pelanggaran Bulan Ini (Sargable Range Query)
        now = datetime.now()
        m_start, m_end = get_date_range(now.year, now.month)
        pelanggaran_bulan_ini = PelanggaranSiswa.query.filter(
            PelanggaranSiswa.tanggal_waktu >= m_start,
            PelanggaranSiswa.tanggal_waktu <= m_end
        ).count() if m_start and m_end else 0

        # 5. Aktivitas Presensi Terbaru Hari Ini (Sargable Range Query + Eager Loading)
        today_start = datetime.combine(today, time.min)
        today_end = datetime.combine(today, time.max)
        recent_presensi = AbsensiHarian.query.options(joinedload(AbsensiHarian.siswa))\
            .filter(AbsensiHarian.waktu >= today_start, AbsensiHarian.waktu <= today_end)\
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
                "pjj": pjj_count,
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


def execute_daily_alpa_generation():
    """
    Menjalankan proses pencatatan Alpa otomatis harian untuk siswa aktif yang belum absen
    dan tidak memiliki izin/sakit sah pada hari aktif sekolah.
    Dapat dipanggil via endpoint manual Admin maupun background auto-scheduler (15:30 WIB).
    """
    today = date.today()
    today_start = datetime.combine(today, time.min)
    today_end = datetime.combine(today, time.max)

    now_dt = datetime.now()
    h_status = get_holiday_status(now_dt)
    if not h_status["is_school_day"]:
        return False, f"Pencatatan Alpa otomatis dibatalkan! {h_status['message']}", 0

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

        cfg = PengaturanJadwal.query.first()
        curr_ta = cfg.tahun_ajaran if cfg and cfg.tahun_ajaran else "2026/2027"
        curr_sem = cfg.semester if cfg and cfg.semester else "Ganjil"

        created_count = 0
        for s in siswa_aktif:
            if s.id not in siswa_absen_ids and s.id not in siswa_izin_ids:
                alpa_record = AbsensiHarian(
                    siswa_id=s.id,
                    kelas=s.kelas,
                    status="Alpa",
                    waktu=now_dt,
                    tahun_ajaran=curr_ta,
                    semester=curr_sem,
                    sumber="auto_alpa"
                )
                db.session.add(alpa_record)
                created_count += 1

        db.session.commit()
        if created_count > 0:
            notify_data_changed("presensi")
        return True, f"Berhasil mencatat status Alpa untuk {created_count} siswa aktif yang tidak hadir hari ini.", created_count
    except Exception as e:
        db.session.rollback()
        return False, str(e), 0


@rekap_bp.route('/api/rekap/generate_alpa_today', methods=['POST'])
@token_required
@role_required(['admin'])
def generate_alpa_today():
    """
    Otomatis mencatat status 'Alpa' (Tidak Hadir) untuk seluruh siswa aktif
    yang belum memiliki catatan presensi harian (dan tidak memiliki Izin/Sakit disetujui) hari ini.
    """
    success, message, count = execute_daily_alpa_generation()
    if not success and count == 0 and "dibatalkan" in message:
        return jsonify({"success": False, "message": message}), 400
    if not success:
        return jsonify({"success": False, "message": message}), 500
    return jsonify({
        "success": True,
        "message": message,
        "alpa_count": count
    })


@rekap_bp.route('/api/audit_logs', methods=['GET'])
@token_required
@role_required(['admin'])
def get_audit_logs():
    """
    Mengambil jejak audit trail seluruh aktivitas operasional admin dan guru piket.
    Filter yang didukung:
    - action: Jenis aksi (e.g. 'VERIFIKASI_IZIN', 'HAPUS_PELANGGARAN', 'RESET_PASSWORD_SISWA')
    - limit: Jumlah catatan maksimal (default 100)
    """
    action = request.args.get('action')
    limit = request.args.get('limit', 100, type=int)

    query = AuditLog.query
    if action and action != 'ALL':
        query = query.filter_by(action=action)

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return jsonify({
        "success": True,
        "total": len(logs),
        "data": [l.to_dict() for l in logs]
    })


@rekap_bp.route('/api/rekap/laporan_sudin', methods=['GET'])
@token_required
@role_required(['piket', 'admin'])
def get_laporan_sudin():
    """
    Menyusun laporan bulanan berformat standar resmi Suku Dinas Pendidikan DKI Jakarta.
    Parameter Query:
    - bulan: int (1-12)
    - tahun: int (e.g. 2026)
    - hari_efektif: int (default 22)
    - kelas: str (opsional filter per rombel)
    """
    now = datetime.now()
    try:
        bulan = int(request.args.get('bulan', now.month))
    except (ValueError, TypeError):
        bulan = now.month

    try:
        tahun = int(request.args.get('tahun', now.year))
    except (ValueError, TypeError):
        tahun = now.year

    try:
        hari_efektif = int(request.args.get('hari_efektif', 22))
        if hari_efektif <= 0:
            hari_efektif = 22
    except (ValueError, TypeError):
        hari_efektif = 22

    kelas_filter = request.args.get('kelas')

    nama_bulan_map = [
        "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ]
    nama_bulan = nama_bulan_map[bulan] if 1 <= bulan <= 12 else str(bulan)

    # 1. Ambil seluruh siswa aktif
    query_siswa = Siswa.query.filter((Siswa.status == 'Aktif') | (Siswa.status == None))
    if kelas_filter and kelas_filter != 'ALL':
        query_siswa = query_siswa.filter(Siswa.kelas == kelas_filter)
    all_siswa = query_siswa.all()

    siswa_stats = {}
    kelas_siswa_map = {}
    for s in all_siswa:
        k = s.kelas or "Tanpa Kelas"
        if k not in kelas_siswa_map:
            kelas_siswa_map[k] = []
        kelas_siswa_map[k].append(s.id)
        siswa_stats[s.id] = {
            "hadir": 0,
            "sakit": 0,
            "izin": 0,
            "alpa": 0
        }

    # 2. Agregasi Absensi Harian via SQL GROUP BY (Sargable date range filter)
    start_dt, end_dt = get_date_range(tahun, bulan)
    q_harian = db.session.query(
        AbsensiHarian.siswa_id,
        AbsensiHarian.status,
        db.func.count(AbsensiHarian.id)
    ).filter(
        AbsensiHarian.waktu >= start_dt,
        AbsensiHarian.waktu <= end_dt
    ).group_by(AbsensiHarian.siswa_id, AbsensiHarian.status).all()


    for sid, status_str, count_val in q_harian:
        if sid in siswa_stats:
            st = status_str or ""
            if any(term in st for term in ["Hadir", "Tepat Waktu", "Terlambat", "Dispensasi", "(PJJ)", "(PKL)"]):
                siswa_stats[sid]["hadir"] += count_val
            elif "Sakit" in st:
                siswa_stats[sid]["sakit"] += count_val
            elif "Izin" in st:
                siswa_stats[sid]["izin"] += count_val
            elif "Alpa" in st:
                siswa_stats[sid]["alpa"] += count_val

    # 3. Hitung auto-alpa per siswa jika total hari tercatat kurang dari hari efektif
    for sid, st in siswa_stats.items():
        total_accounted = st["hadir"] + st["sakit"] + st["izin"]
        if hari_efektif > total_accounted:
            auto_alpa = hari_efektif - total_accounted
            st["alpa"] = max(st["alpa"], auto_alpa)

    # 4. Susun matriks rekapitulasi per kelas
    rekap_per_kelas = []
    tot_siswa = 0
    tot_hadir = 0
    tot_sakit = 0
    tot_izin = 0
    tot_alpa = 0
    tot_absen = 0

    for k in sorted(kelas_siswa_map.keys()):
        s_ids = kelas_siswa_map[k]
        k_siswa_count = len(s_ids)
        k_hadir = sum(siswa_stats[sid]["hadir"] for sid in s_ids)
        k_sakit = sum(siswa_stats[sid]["sakit"] for sid in s_ids)
        k_izin = sum(siswa_stats[sid]["izin"] for sid in s_ids)
        k_alpa = sum(siswa_stats[sid]["alpa"] for sid in s_ids)
        k_absen = k_sakit + k_izin + k_alpa

        target_total = k_siswa_count * hari_efektif
        k_persen = round((k_hadir / target_total) * 100, 2) if target_total > 0 else 100.0

        rekap_per_kelas.append({
            "kelas": k,
            "total_siswa": k_siswa_count,
            "hari_efektif": hari_efektif,
            "hadir": k_hadir,
            "sakit": k_sakit,
            "izin": k_izin,
            "alpa": k_alpa,
            "total_absen": k_absen,
            "persentase_kehadiran": k_persen
        })

        tot_siswa += k_siswa_count
        tot_hadir += k_hadir
        tot_sakit += k_sakit
        tot_izin += k_izin
        tot_alpa += k_alpa
        tot_absen += k_absen

    tot_target = tot_siswa * hari_efektif
    overall_persen = round((tot_hadir / tot_target) * 100, 2) if tot_target > 0 else 100.0

    ringkasan_sekolah = {
        "total_siswa": tot_siswa,
        "total_kelas": len(kelas_siswa_map),
        "total_hadir": tot_hadir,
        "total_sakit": tot_sakit,
        "total_izin": tot_izin,
        "total_alpa": tot_alpa,
        "total_absen": tot_absen,
        "persentase_kehadiran": overall_persen
    }

    meta = {
        "pemerintah": "PEMERINTAH PROVINSI DAERAH KHUSUS IBUKOTA JAKARTA",
        "dinas": "DINAS PENDIDIKAN",
        "sudin": "SUKU DINAS PENDIDIKAN WILAYAH II KOTA ADMINISTRASI JAKARTA PUSAT",
        "sekolah": "SMK NEGERI 21 JAKARTA",
        "npsn": "20101569",
        "alamat": "Jl. Siaga I No. 2, Kemayoran, Jakarta Pusat",
        "nama_bulan": nama_bulan,
        "tahun": tahun,
        "hari_efektif": hari_efektif
    }

    return jsonify({
        "success": True,
        "meta": meta,
        "ringkasan_sekolah": ringkasan_sekolah,
        "rekap_per_kelas": rekap_per_kelas
    })




