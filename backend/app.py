import os
import re
import json
import math
from datetime import datetime, time, date, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_compress import Compress
from sqlalchemy import extract
from models import db, Siswa, AbsensiHarian, AbsensiPerpustakaan, PengajuanIzin, IzinPiket
from face_utils import get_face_encoding, verify_face, check_face_present, analyze_liveness

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

def check_and_migrate_db():
    with app.app_context():
        db.create_all()
        # Periksa apakah kolom 'status' sudah ada di tabel siswa (SQLite)
        try:
            with db.engine.connect() as conn:
                result = conn.execute(db.text("PRAGMA table_info(siswa)")).fetchall()
                col_names = [row[1] for row in result]
                if 'status' not in col_names:
                    conn.execute(db.text("ALTER TABLE siswa ADD COLUMN status VARCHAR(20) DEFAULT 'Aktif'"))
                    conn.commit()
                    print("[MIGRATION] Kolom 'status' berhasil ditambahkan ke tabel siswa.")
        except Exception as e:
            print(f"[MIGRATION WARNING] Gagal cek/migrasi kolom status: {e}")

check_and_migrate_db()

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

# Koordinat Resmi SMKN 21 Jakarta & Batas Geofencing
SEKOLAH_LATITUDE = -6.1587
SEKOLAH_LONGITUDE = 106.8550
MAX_RADIUS_SEKOLAH = 10 # meter

def calculate_distance_meters(lat1, lon1, lat2, lon2):
    try:
        lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
    except (TypeError, ValueError):
        return None
    R = 6371000 # meter
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    deltaPhi = math.radians(lat2 - lat1)
    deltaLambda = math.radians(lon2 - lon1)
    a = (math.sin(deltaPhi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(deltaLambda / 2) ** 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c)

# Helper function to check if late
def check_status_kehadiran():
    now = datetime.now()
    waktu_batas = time(6, 30, 0)
    if now.time() <= waktu_batas:
        return "Tepat Waktu"
    return "Terlambat"

# Helper to flatten student encodings (HANYA SISWA AKTIF)
def get_flattened_known_faces():
    siswa_list = Siswa.query.filter(
        Siswa.face_encoding != None,
        (Siswa.status == 'Aktif') | (Siswa.status == None)
    ).all()
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
    status_filter = request.args.get('status')
    query = Siswa.query
    if status_filter and status_filter != 'ALL':
        query = query.filter(Siswa.status == status_filter)
    siswa_list = query.order_by(Siswa.nama.asc()).all()
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

@app.route('/api/siswa/<int:id>', methods=['PUT'])
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
        db.session.commit()
        return jsonify({"success": True, "message": f"Data {siswa.nama} berhasil diperbarui", "siswa": siswa.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/siswa/<int:id>/status', methods=['PATCH'])
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
        db.session.commit()
        status_label = "Alumni / Lulus" if new_status == "Alumni" else "Aktif"
        return jsonify({
            "success": True,
            "message": f"Status {siswa.nama} berhasil diubah menjadi {status_label}.",
            "siswa": siswa.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/siswa/bulk_status', methods=['POST'])
def bulk_update_siswa_status():
    data = request.json or {}
    siswa_ids = data.get('siswa_ids', [])
    new_status = str(data.get('status', '')).strip()
    
    if not siswa_ids or not isinstance(siswa_ids, list):
        return jsonify({"success": False, "message": "Daftar siswa_ids wajib disertakan."}), 400
    if new_status not in ["Aktif", "Alumni"]:
        return jsonify({"success": False, "message": "Status harus 'Aktif' atau 'Alumni'"}), 400

    try:
        updated_count = Siswa.query.filter(Siswa.id.in_(siswa_ids)).update(
            {"status": new_status},
            synchronize_session=False
        )
        db.session.commit()
        status_label = "Alumni / Lulus" if new_status == "Alumni" else "Aktif"
        return jsonify({
            "success": True,
            "count": updated_count,
            "message": f"Berhasil mengubah status {updated_count} siswa menjadi {status_label}."
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/siswa/luluskan_tingkat', methods=['POST'])
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
            
        for s in target_siswa:
            s.status = "Alumni"
            
        db.session.commit()
        return jsonify({
            "success": True,
            "count": target_count,
            "message": f"Selamat! Seluruh {target_count} siswa tingkat {tingkat} berhasil diluluskan menjadi Alumni."
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/siswa/bulk_delete', methods=['POST'])
def bulk_delete_siswa():
    data = request.json or {}
    siswa_ids = data.get('siswa_ids', [])
    
    if not siswa_ids or not isinstance(siswa_ids, list):
        return jsonify({"success": False, "message": "Daftar siswa_ids wajib disertakan."}), 400

    try:
        # Hapus riwayat absensi, perpustakaan, pengajuan izin, dan izin piket terkait terlebih dahulu
        AbsensiHarian.query.filter(AbsensiHarian.siswa_id.in_(siswa_ids)).delete(synchronize_session=False)
        AbsensiPerpustakaan.query.filter(AbsensiPerpustakaan.siswa_id.in_(siswa_ids)).delete(synchronize_session=False)
        PengajuanIzin.query.filter(PengajuanIzin.siswa_id.in_(siswa_ids)).delete(synchronize_session=False)
        IzinPiket.query.filter(IzinPiket.siswa_id.in_(siswa_ids)).delete(synchronize_session=False)
        
        deleted_count = Siswa.query.filter(Siswa.id.in_(siswa_ids)).delete(synchronize_session=False)
        db.session.commit()
        return jsonify({
            "success": True,
            "count": deleted_count,
            "message": f"{deleted_count} data siswa dan seluruh riwayat presensinya berhasil dihapus dari database."
        })
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
        # Hapus riwayat absensi, perpustakaan, pengajuan izin, dan izin piket terkait jika ada
        AbsensiHarian.query.filter_by(siswa_id=id).delete()
        AbsensiPerpustakaan.query.filter_by(siswa_id=id).delete()
        PengajuanIzin.query.filter_by(siswa_id=id).delete()
        IzinPiket.query.filter_by(siswa_id=id).delete()
        db.session.delete(siswa)
        db.session.commit()
        return jsonify({"success": True, "message": f"Siswa {nama_siswa} berhasil dihapus dari database."})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/cek_siswa_nis/<nis>', methods=['GET'])
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

# ================= DETEKSI KEHADIRAN ORANG & LIVENESS KEDIPAN =================

@app.route('/api/detect_face', methods=['POST'])
def detect_face():
    data = request.json or {}
    image_data = data.get('image')
    if not image_data:
        return jsonify({"face_detected": False})
    
    is_present = check_face_present(image_data)
    return jsonify({"face_detected": is_present})


@app.route('/api/detect_liveness', methods=['POST'])
def detect_liveness():
    data = request.json or {}
    image_data = data.get('image')
    if not image_data:
        return jsonify({"face_detected": False, "eye_state": "UNKNOWN", "openness_score": 0.0})
    
    result = analyze_liveness(image_data)
    return jsonify(result)

# ================= VERIFIKASI PRESENSI =================

@app.route('/api/verify_harian', methods=['POST'])
def verify_harian():
    data = request.json or {}
    image_data = data.get('image')
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    accuracy = data.get('accuracy')
    is_mock = data.get('is_mock', False)
    simulated = data.get('simulated', False)

    # Validasi Anti-Fake GPS: Tolak jika terindikasi mock location
    if not simulated:
        if is_mock:
            return jsonify({
                "success": False,
                "message": "Presensi ditolak! Terdeteksi aplikasi lokasi palsu (Fake GPS / Mock Location). Gunakan GPS asli perangkat Anda."
            }), 403
        if accuracy is not None and (accuracy <= 0 or accuracy < 1.8):
            return jsonify({
                "success": False,
                "message": f"Presensi ditolak! Akurasi GPS ({accuracy}m) terindikasi emulator/Fake GPS."
            }), 403

    # Validasi Geofence: Jika bukan simulasi dev, pastikan berada dalam radius 10m
    if not simulated and latitude is not None and longitude is not None:
        dist = calculate_distance_meters(latitude, longitude, SEKOLAH_LATITUDE, SEKOLAH_LONGITUDE)
        if dist is not None and dist > MAX_RADIUS_SEKOLAH:
            return jsonify({
                "success": False,
                "message": f"Presensi ditolak! Posisi Anda terdeteksi di luar radius sekolah SMKN 21 (jarak ~{dist} meter, maksimal {MAX_RADIUS_SEKOLAH}m)."
            }), 403
    
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
            
            confidence_text = f" kecocokan {result.get('confidence', 95)}%" if 'confidence' in result else ""
            return jsonify({
                "success": True,
                "message": f"Berhasil Absen {siswa.nama} - {siswa.kelas} ({status}){confidence_text}"
            })
        else:
            return jsonify(result), 401
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/verify_perpus', methods=['POST'])
def verify_perpus():
    data = request.json or {}
    image_data = data.get('image')
    keperluan = data.get('keperluan')
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    accuracy = data.get('accuracy')
    is_mock = data.get('is_mock', False)
    simulated = data.get('simulated', False)
    
    if not keperluan:
         return jsonify({"success": False, "message": "Keperluan kunjungan belum diisi."}), 400

    # Validasi Anti-Fake GPS: Tolak jika terindikasi mock location
    if not simulated:
        if is_mock:
            return jsonify({
                "success": False,
                "message": "Presensi perpustakaan ditolak! Terdeteksi aplikasi lokasi palsu (Fake GPS / Mock Location). Gunakan GPS asli perangkat Anda."
            }), 403
        if accuracy is not None and (accuracy <= 0 or accuracy < 1.8):
            return jsonify({
                "success": False,
                "message": f"Presensi perpustakaan ditolak! Akurasi GPS ({accuracy}m) terindikasi emulator/Fake GPS."
            }), 403

    # Validasi Geofence: Jika bukan simulasi dev, pastikan berada dalam radius 10m
    if not simulated and latitude is not None and longitude is not None:
        dist = calculate_distance_meters(latitude, longitude, SEKOLAH_LATITUDE, SEKOLAH_LONGITUDE)
        if dist is not None and dist > MAX_RADIUS_SEKOLAH:
            return jsonify({
                "success": False,
                "message": f"Presensi perpustakaan ditolak! Posisi Anda terdeteksi di luar radius sekolah SMKN 21 (jarak ~{dist} meter, maksimal {MAX_RADIUS_SEKOLAH}m)."
            }), 403
    
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

# ================= PENGAJUAN IZIN & SAKIT (PORTAL MANDIRI & VERIFIKASI) =================

@app.route('/api/pengajuan_izin', methods=['POST'])
def submit_pengajuan_izin():
    data = request.json or {}
    nis = str(data.get('nis', '')).strip()
    jenis = str(data.get('jenis', '')).strip() # "Sakit" atau "Izin"
    tgl_mulai_str = str(data.get('tanggal_mulai', '')).strip()
    tgl_selesai_str = str(data.get('tanggal_selesai', '')).strip()
    alasan = str(data.get('alasan', '')).strip()
    surat_bukti = data.get('surat_bukti') # base64 data uri string
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    lokasi_teks = data.get('lokasi_teks')

    try:
        if latitude is not None and latitude != '':
            latitude = float(latitude)
        else:
            latitude = None
        if longitude is not None and longitude != '':
            longitude = float(longitude)
        else:
            longitude = None
    except (ValueError, TypeError):
        latitude = None
        longitude = None

    if not nis:
        return jsonify({"success": False, "message": "NIS siswa wajib diisi."}), 400
    
    siswa = Siswa.query.filter_by(nis=nis).first()
    if not siswa:
        return jsonify({"success": False, "message": f"Siswa dengan NIS '{nis}' tidak ditemukan dalam database."}), 404
    if getattr(siswa, 'status', 'Aktif') == 'Alumni':
        return jsonify({
            "success": False,
            "message": f"Siswa {siswa.nama} ({siswa.kelas}) sudah berstatus Alumni / Lulus dan tidak dapat mengajukan perizinan."
        }), 400

    if jenis not in ["Sakit", "Izin"]:
        return jsonify({"success": False, "message": "Jenis pengajuan harus 'Sakit' atau 'Izin'."}), 400

    if not tgl_mulai_str or not tgl_selesai_str:
        return jsonify({"success": False, "message": "Tanggal mulai dan selesai harus diisi."}), 400

    try:
        tgl_mulai = datetime.strptime(tgl_mulai_str, "%Y-%m-%d").date()
        tgl_selesai = datetime.strptime(tgl_selesai_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"success": False, "message": "Format tanggal tidak valid. Gunakan format YYYY-MM-DD."}), 400

    if tgl_selesai < tgl_mulai:
        return jsonify({"success": False, "message": "Tanggal selesai tidak boleh sebelum tanggal mulai."}), 400

    if not alasan:
        return jsonify({"success": False, "message": "Alasan / keterangan ketidakhadiran wajib diisi."}), 400

    MAX_ALASAN_LENGTH = 200
    if len(alasan) > MAX_ALASAN_LENGTH:
        return jsonify({
            "success": False,
            "message": f"Alasan ketidakhadiran terlalu panjang (maksimal {MAX_ALASAN_LENGTH} karakter, terisi {len(alasan)} karakter)."
        }), 400

    # Validasi Wajib GPS
    if latitude is None or longitude is None:
        return jsonify({
            "success": False,
            "message": "Titik koordinat lokasi GPS wajib disertakan saat mengajukan surat izin / sakit. Harap aktifkan sensor lokasi (GPS) pada perangkat Anda."
        }), 400

    try:
        pengajuan = PengajuanIzin(
            siswa_id=siswa.id,
            jenis=jenis,
            tanggal_mulai=tgl_mulai,
            tanggal_selesai=tgl_selesai,
            alasan=alasan,
            surat_bukti=surat_bukti,
            latitude=latitude,
            longitude=longitude,
            lokasi_teks=lokasi_teks,
            status_pengajuan="Menunggu"
        )
        db.session.add(pengajuan)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Pengajuan {jenis} atas nama {siswa.nama} ({siswa.kelas}) berhasil dikirim dan sedang menunggu verifikasi guru.",
            "data": pengajuan.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/sekolah/lokasi', methods=['GET'])
def get_sekolah_lokasi():
    return jsonify({
        "nama": "SMKN 21 Jakarta",
        "alamat": "Jl. Siaga I Gg. Swadaya III, Kebon Kosong, Kemayoran, Jakarta Pusat",
        "latitude": -6.1587,
        "longitude": 106.8550,
        "radius_meter": 10
    })

@app.route('/api/pengajuan_izin', methods=['GET'])
def get_pengajuan_izin():
    status = request.args.get('status')
    query = PengajuanIzin.query
    if status and status != 'ALL':
        query = query.filter_by(status_pengajuan=status)
    pengajuan_list = query.order_by(PengajuanIzin.created_at.desc()).all()
    return jsonify([p.to_dict() for p in pengajuan_list])

@app.route('/api/pengajuan_izin/<int:id>/verifikasi', methods=['POST'])
def verifikasi_pengajuan_izin(id):
    pengajuan = PengajuanIzin.query.get(id)
    if not pengajuan:
        return jsonify({"success": False, "message": "Data pengajuan tidak ditemukan."}), 404

    data = request.json or {}
    aksi = str(data.get('aksi', '')).strip() # "Disetujui" atau "Ditolak"
    catatan = str(data.get('catatan', '')).strip()

    if aksi not in ["Disetujui", "Ditolak"]:
        return jsonify({"success": False, "message": "Aksi harus 'Disetujui' atau 'Ditolak'."}), 400

    try:
        pengajuan.status_pengajuan = aksi
        pengajuan.catatan_guru = catatan

        # Jika disetujui, generasikan rekaman AbsensiHarian untuk rentang tanggal tersebut
        if aksi == "Disetujui":
            curr = pengajuan.tanggal_mulai
            while curr <= pengajuan.tanggal_selesai:
                start_day = datetime.combine(curr, time.min)
                end_day = datetime.combine(curr, time.max)
                
                # Cek apakah sudah ada presensi harian untuk siswa di hari ini
                existing = AbsensiHarian.query.filter(
                    AbsensiHarian.siswa_id == pengajuan.siswa_id,
                    AbsensiHarian.waktu >= start_day,
                    AbsensiHarian.waktu <= end_day
                ).first()

                if existing:
                    existing.status = pengajuan.jenis
                else:
                    absensi_baru = AbsensiHarian(
                        siswa_id=pengajuan.siswa_id,
                        waktu=datetime.combine(curr, time(7, 0, 0)),
                        status=pengajuan.jenis
                    )
                    db.session.add(absensi_baru)
                
                curr += timedelta(days=1)

        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Pengajuan {pengajuan.jenis} siswa {pengajuan.siswa.nama} berhasil di-{aksi.lower()}.",
            "data": pengajuan.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

# ================= MEJA GURU PIKET (DISPENSASI MASUK / MENINGGALKAN KELAS) =================

@app.route('/api/piket/izin', methods=['POST'])
def create_izin_piket():
    data = request.json or {}
    siswa_id = data.get('siswa_id')
    nis = str(data.get('nis', '')).strip()
    hari = str(data.get('hari', '')).strip()
    tanggal_str = str(data.get('tanggal', '')).strip()
    tipe = str(data.get('tipe', '')).strip() # "Izin Masuk" atau "Izin Meninggalkan Kelas"
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

@app.route('/api/piket/izin', methods=['GET'])
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

@app.route('/api/piket/izin/<int:id>', methods=['DELETE'])
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

@app.route('/api/rekap/available_years', methods=['GET'])
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

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
