from datetime import datetime
from flask import Blueprint, request, jsonify
from sqlalchemy import extract
from models import db, Siswa, AbsensiHarian, AbsensiPerpustakaan

rekap_bp = Blueprint('rekap', __name__)

# ================= REKAP & MONITORING KEHADIRAN SEMUA SISWA =================

@rekap_bp.route('/api/rekap/harian', methods=['GET'])
@rekap_bp.route('/api/absensi_harian', methods=['GET'])
def get_rekap_harian():
    bulan = request.args.get('bulan')
    tahun = request.args.get('tahun')
    
    query = AbsensiHarian.query
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
        
    rekap = query.order_by(AbsensiHarian.waktu.desc()).all()
    return jsonify([r.to_dict() for r in rekap])


@rekap_bp.route('/api/rekap/perpus', methods=['GET'])
@rekap_bp.route('/api/absensi_perpus', methods=['GET'])
def get_rekap_perpus():
    bulan = request.args.get('bulan')
    tahun = request.args.get('tahun')
    
    query = AbsensiPerpustakaan.query
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
        
    rekap = query.order_by(AbsensiPerpustakaan.waktu.desc()).all()
    return jsonify([r.to_dict() for r in rekap])


@rekap_bp.route('/api/rekap/siswa_periode', methods=['GET'])
@rekap_bp.route('/api/rekap', methods=['GET'])
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

    # Filter query absensi harian
    q_harian = AbsensiHarian.query.filter(extract('year', AbsensiHarian.waktu) == tahun)
    if mode == 'bulan':
        q_harian = q_harian.filter(extract('month', AbsensiHarian.waktu) == bulan)
    harian_records = q_harian.all()

    # Filter query absensi perpustakaan
    q_perpus = AbsensiPerpustakaan.query.filter(extract('year', AbsensiPerpustakaan.waktu) == tahun)
    if mode == 'bulan':
        q_perpus = q_perpus.filter(extract('month', AbsensiPerpustakaan.waktu) == bulan)
    perpus_records = q_perpus.all()

    # Siapkan data setiap siswa
    all_siswa = Siswa.query.order_by(Siswa.kelas.asc(), Siswa.nama.asc()).all()
    siswa_map = {}
    
    for s in all_siswa:
        siswa_map[s.id] = {
            "siswa_id": s.id,
            "nis": s.nis,
            "nama": s.nama,
            "kelas": s.kelas,
            "status": s.status or "Aktif",
            "tepat_waktu": 0,
            "terlambat": 0,
            "sakit": 0,
            "izin": 0,
            "total_hadir": 0,
            "kunjungan_perpus": 0
        }

    total_tepat_waktu = 0
    total_terlambat = 0
    total_sakit = 0
    total_izin = 0
    for h in harian_records:
        if h.siswa_id in siswa_map:
            if h.status == "Tepat Waktu":
                siswa_map[h.siswa_id]["tepat_waktu"] += 1
                siswa_map[h.siswa_id]["total_hadir"] += 1
                total_tepat_waktu += 1
            elif h.status == "Terlambat":
                siswa_map[h.siswa_id]["terlambat"] += 1
                siswa_map[h.siswa_id]["total_hadir"] += 1
                total_terlambat += 1
            elif h.status == "Sakit":
                siswa_map[h.siswa_id]["sakit"] += 1
                total_sakit += 1
            elif h.status == "Izin":
                siswa_map[h.siswa_id]["izin"] += 1
                total_izin += 1

    for p in perpus_records:
        if p.siswa_id in siswa_map:
            siswa_map[p.siswa_id]["kunjungan_perpus"] += 1

    daftar = list(siswa_map.values())

    return jsonify({
        "mode": mode,
        "bulan": bulan,
        "tahun": tahun,
        "statistik": {
            "total_siswa": len(all_siswa),
            "total_presensi_harian": len(harian_records),
            "total_tepat_waktu": total_tepat_waktu,
            "total_terlambat": total_terlambat,
            "total_sakit": total_sakit,
            "total_izin": total_izin,
            "total_perpus": len(perpus_records)
        },
        "daftar": daftar
    })


@rekap_bp.route('/api/rekap/available_years', methods=['GET'])
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

