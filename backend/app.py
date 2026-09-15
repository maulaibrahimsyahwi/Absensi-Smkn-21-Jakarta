import os
import re
import json
from datetime import datetime, time, date
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_compress import Compress
from sqlalchemy import extract
from models import db, Siswa, AbsensiHarian, AbsensiPerpustakaan
from face_utils import get_face_encoding, verify_face, check_face_present

VALID_JURUSAN_SMKN21 = ['PPLG', 'AKL', 'MPLB', 'BR']

def validate_siswa_input(nis, nama, kelas):
    nis = str(nis or '').strip()
    nama = str(nama or '').strip()
    kelas = str(kelas or '').strip().upper()

    if not nis:
        return False, "Nomor Induk Siswa (NIS) wajib diisi"
    if not re.match(r'^\d{4,18}$', nis):
        return False, "NIS harus berupa angka antara 4 sampai 18 digit"

    if not nama:
        return False, "Nama lengkap siswa wajib diisi"
    if len(nama) < 3:
        return False, "Nama lengkap siswa minimal 3 karakter"
    if not re.match(r"^[a-zA-Z\s\.\',\-]+$", nama):
        return False, "Nama hanya boleh mengandung huruf, spasi, titik, atau tanda petik"

    if not kelas:
        return False, "Kelas dan jurusan wajib dipilih"
    
    # Validasi jurusan resmi SMKN 21: PPLG, AKL, MPLB, BR
    kelas_pattern = r'^(X|XI|XII)\s+(PPLG|AKL|MPLB|BR)(\s+\d+)?$'
    if not re.match(kelas_pattern, kelas):
        return False, "Jurusan tidak valid! Jurusan resmi SMKN 21: PPLG, AKL, MPLB, atau BR (Tingkat X, XI, XII). Contoh: X PPLG 1"

    return True, ""

app = Flask(__name__)

# CORS: Restrict to frontend origins only
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"])

# Response Compression (Gzip/Brotli)
Compress(app)

# Database Configuration
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'absensi.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Security Headers
@app.after_request
def set_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response

# Global JSON Error Handlers
@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "message": "Endpoint tidak ditemukan"}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"success": False, "message": "Metode HTTP tidak diizinkan"}), 405

@app.errorhandler(500)
def internal_error(e):
    return jsonify({"success": False, "message": "Terjadi kesalahan internal server"}), 500

# Helper function to check if late
def check_status_kehadiran():
    now = datetime.now()
    waktu_batas = time(6, 30, 0)
    if now.time() <= waktu_batas:
        return "Tepat Waktu"
    return "Terlambat"

# Helper to flatten student encodings
def get_flattened_known_faces():
    siswa_list = Siswa.query.filter(Siswa.face_encoding != None).all()
    encodings = []
    siswa_ids = []
    for s in siswa_list:
        try:
            raw = json.loads(s.face_encoding)
            # Check if multi-sample (list of lists)
            if isinstance(raw, list) and len(raw) > 0 and isinstance(raw[0], list):
                for enc in raw:
                    encodings.append(enc)
                    siswa_ids.append(s.id)
            elif isinstance(raw, list):
                encodings.append(raw)
                siswa_ids.append(s.id)
        except Exception:
            continue
    return encodings, siswa_ids

# ================= ROUTES SISWA (CRUD) =================

@app.route('/api/siswa', methods=['GET'])
def get_siswa():
    siswa_list = Siswa.query.order_by(Siswa.nama.asc()).all()
    return jsonify([s.to_dict() for s in siswa_list])

@app.route('/api/siswa', methods=['POST'])
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

        baru = Siswa(nis=nis, nama=nama, kelas=kelas)
        db.session.add(baru)
        db.session.commit()
        return jsonify({"success": True, "message": f"Siswa {nama} ({kelas}) berhasil didaftarkan", "id": baru.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 400

@app.route('/api/siswa/<int:id>', methods=['PUT'])
def update_siswa(id):
    siswa = Siswa.query.get(id)
    if not siswa:
        return jsonify({"success": False, "message": "Siswa tidak ditemukan"}), 404
    data = request.json or {}
    nis = str(data.get('nis', siswa.nis)).strip()
    nama = str(data.get('nama', siswa.nama)).strip()
    kelas = str(data.get('kelas', siswa.kelas)).strip().upper()

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
        db.session.commit()
        return jsonify({"success": True, "message": f"Data {siswa.nama} berhasil diperbarui", "siswa": siswa.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/siswa/<int:id>', methods=['DELETE'])
def delete_siswa(id):
    siswa = Siswa.query.get(id)
    if not siswa:
        return jsonify({"success": False, "message": "Siswa tidak ditemukan"}), 404
    try:
        nama_siswa = siswa.nama
        # Hapus riwayat absensi terkait jika ada
        AbsensiHarian.query.filter_by(siswa_id=id).delete()
        AbsensiPerpustakaan.query.filter_by(siswa_id=id).delete()
        db.session.delete(siswa)
        db.session.commit()
        return jsonify({"success": True, "message": f"Siswa {nama_siswa} berhasil dihapus dari database."})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

# ================= REGISTRASI SAMPEL WAJAH (MULTI-SAMPLE) =================

@app.route('/api/register_face', methods=['POST'])
def register_face():
    data = request.json
    siswa_id = data.get('siswa_id')
    
    # Mendukung array beberapa foto sampel (images) atau single (image)
    images = data.get('images', [])
    if not images and data.get('image'):
        images = [data.get('image')]
        
    siswa = Siswa.query.get(siswa_id)
    if not siswa:
        return jsonify({"success": False, "message": "Siswa tidak ditemukan"}), 404
        
    try:
        encodings = []
        for idx, img_data in enumerate(images):
            enc = get_face_encoding(img_data)
            if enc is not None:
                encodings.append(enc)
                
        if not encodings:
            return jsonify({
                "success": False, 
                "message": "Tidak ada wajah terdeteksi pada foto yang diambil. Pastikan pencahayaan cukup dan wajah menghadap kamera."
            }), 400
            
        # Simpan array multi-sample biometrik wajah ke database
        siswa.face_encoding = json.dumps(encodings)
        db.session.commit()
        return jsonify({
            "success": True, 
            "message": f"Berhasil menyimpan {len(encodings)} sampel biometrik wajah untuk {siswa.nama}."
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

# ================= DETEKSI KEHADIRAN ORANG DI KAMERA =================

@app.route('/api/detect_face', methods=['POST'])
def detect_face():
    data = request.json
    image_data = data.get('image')
    if not image_data:
        return jsonify({"face_detected": False})
    
    is_present = check_face_present(image_data)
    return jsonify({"face_detected": is_present})

# ================= VERIFIKASI PRESENSI =================

@app.route('/api/verify_harian', methods=['POST'])
def verify_harian():
    data = request.json
    image_data = data.get('image')
    
    encodings, siswa_ids = get_flattened_known_faces()
    if not encodings:
        return jsonify({"success": False, "message": "Belum ada data wajah siswa yang terdaftar di sistem."}), 400
        
    try:
        result = verify_face(image_data, encodings, siswa_ids)
        if result['success']:
            siswa_id = result['siswa_id']
            siswa = Siswa.query.get(siswa_id)
            status = check_status_kehadiran()
            
            # Cek apakah siswa sudah presensi hari ini
            today_start = datetime.combine(date.today(), time.min)
            today_end = datetime.combine(date.today(), time.max)
            sudah_absen = AbsensiHarian.query.filter(
                AbsensiHarian.siswa_id == siswa_id,
                AbsensiHarian.waktu >= today_start,
                AbsensiHarian.waktu <= today_end
            ).first()

            if sudah_absen:
                return jsonify({
                    "success": True,
                    "message": f"{siswa.nama} ({siswa.kelas}) sudah tercatat presensi hari ini pukul {sudah_absen.waktu.strftime('%H:%M:%S')} WIB."
                })

            absen = AbsensiHarian(siswa_id=siswa_id, status=status)
            db.session.add(absen)
            db.session.commit()
            
            confidence_text = f" (Akurasi: {result.get('confidence', 95)}%)" if 'confidence' in result else ""
            return jsonify({
                "success": True,
                "message": f"Berhasil Absen: {siswa.nama} - {siswa.kelas} ({status}){confidence_text}"
            })
        else:
            return jsonify(result), 401
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/verify_perpus', methods=['POST'])
def verify_perpus():
    data = request.json
    image_data = data.get('image')
    keperluan = data.get('keperluan')
    
    if not keperluan:
         return jsonify({"success": False, "message": "Keperluan kunjungan belum diisi."}), 400
    
    encodings, siswa_ids = get_flattened_known_faces()
    if not encodings:
        return jsonify({"success": False, "message": "Belum ada data wajah siswa yang terdaftar di sistem."}), 400
        
    try:
        result = verify_face(image_data, encodings, siswa_ids)
        if result['success']:
            siswa_id = result['siswa_id']
            kunjungan = AbsensiPerpustakaan(siswa_id=siswa_id, keperluan=keperluan)
            db.session.add(kunjungan)
            db.session.commit()
            
            siswa = Siswa.query.get(siswa_id)
            return jsonify({
                "success": True,
                "message": f"Kunjungan Tercatat: {siswa.nama} ({siswa.kelas}) - {keperluan}"
            })
        else:
            return jsonify(result), 401
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

# ================= REKAP & MONITORING KEHADIRAN SEMUA SISWA =================

@app.route('/api/rekap/harian', methods=['GET'])
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

@app.route('/api/rekap/perpus', methods=['GET'])
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

@app.route('/api/rekap/siswa_periode', methods=['GET'])
def get_rekap_siswa_periode():
    # Menampilkan akumulasi kehadiran setiap siswa dalam kurun waktu Bulan atau Tahun yang dipilih
    mode = request.args.get('mode', 'bulan') # 'bulan' atau 'tahun'
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
            "tepat_waktu": 0,
            "terlambat": 0,
            "total_hadir": 0,
            "kunjungan_perpus": 0
        }

    total_tepat_waktu = 0
    total_terlambat = 0
    for h in harian_records:
        if h.siswa_id in siswa_map:
            if h.status == "Tepat Waktu":
                siswa_map[h.siswa_id]["tepat_waktu"] += 1
                total_tepat_waktu += 1
            else:
                siswa_map[h.siswa_id]["terlambat"] += 1
                total_terlambat += 1
            siswa_map[h.siswa_id]["total_hadir"] += 1

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
            "total_perpus": len(perpus_records)
        },
        "daftar": daftar
    })

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
