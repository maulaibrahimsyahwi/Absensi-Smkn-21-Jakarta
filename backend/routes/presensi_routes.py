from datetime import datetime, time, date
from flask import Blueprint, request, jsonify
from config import SEKOLAH_LATITUDE, SEKOLAH_LONGITUDE, MAX_RADIUS_SEKOLAH, SEKOLAH_INFO
from models import db, Siswa, AbsensiHarian, AbsensiPerpustakaan
from face_utils import verify_face
from utils.helpers import calculate_distance_meters, check_status_kehadiran, get_flattened_known_faces

presensi_bp = Blueprint('presensi', __name__)

# ================= VERIFIKASI PRESENSI & LOKASI SEKOLAH =================

@presensi_bp.route('/api/verify_harian', methods=['POST'])
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


@presensi_bp.route('/api/verify_perpus', methods=['POST'])
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


@presensi_bp.route('/api/sekolah/lokasi', methods=['GET'])
def get_sekolah_lokasi():
    return jsonify(SEKOLAH_INFO)

