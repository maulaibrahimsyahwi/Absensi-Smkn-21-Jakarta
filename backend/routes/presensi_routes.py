from datetime import datetime, time, date
from flask import Blueprint, request, jsonify
from config import SEKOLAH_LATITUDE, SEKOLAH_LONGITUDE, MAX_RADIUS_SEKOLAH, SEKOLAH_INFO
from models import db, Siswa, AbsensiHarian, AbsensiPerpustakaan
from face_utils import verify_face
from utils.helpers import calculate_distance_meters, check_status_kehadiran, get_flattened_known_faces
from routes.pelanggaran_routes import catat_pelanggaran_terlambat

presensi_bp = Blueprint('presensi', __name__)

# ================= VERIFIKASI PRESENSI & LOKASI SEKOLAH =================

@presensi_bp.route('/api/presensi/status_today', methods=['GET'])
def get_status_today():
    """
    Memeriksa apakah siswa sudah melakukan presensi harian pada hari ini.
    """
    siswa_id = request.args.get('siswa_id')
    if not siswa_id:
        return jsonify({"success": False, "message": "ID siswa diperlukan."}), 400
    
    siswa = Siswa.query.get(siswa_id)
    if not siswa:
        return jsonify({"success": False, "message": "Data siswa tidak ditemukan."}), 404

    today_start = datetime.combine(date.today(), time.min)
    today_end = datetime.combine(date.today(), time.max)
    absen_today = AbsensiHarian.query.filter(
        AbsensiHarian.siswa_id == siswa_id,
        AbsensiHarian.waktu >= today_start,
        AbsensiHarian.waktu <= today_end
    ).first()

    if absen_today:
        return jsonify({
            "success": True,
            "already_attended": True,
            "data": {
                "id": absen_today.id,
                "nama": siswa.nama,
                "kelas": siswa.kelas,
                "waktu": absen_today.waktu.strftime('%H:%M:%S'),
                "status": absen_today.status
            }
        })
    else:
        return jsonify({
            "success": True,
            "already_attended": False,
            "data": None
        })


@presensi_bp.route('/api/verify_harian', methods=['POST'])
def verify_harian():
    import json
    data = request.json or {}
    image_data = data.get('image')
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    accuracy = data.get('accuracy')
    is_mock = data.get('is_mock', False)
    simulated = data.get('simulated', False)
    expected_siswa_id = data.get('expected_siswa_id')

    if expected_siswa_id:
        try:
            expected_siswa_id = int(expected_siswa_id)
        except (ValueError, TypeError):
            expected_siswa_id = None

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

    today_start = datetime.combine(date.today(), time.min)
    today_end = datetime.combine(date.today(), time.max)

    # 1. Jika Presensi Mandiri Siswa (expected_siswa_id ditentukan)
    if expected_siswa_id:
        target_siswa = Siswa.query.get(expected_siswa_id)
        if not target_siswa:
            return jsonify({"success": False, "message": "Akun siswa tidak ditemukan."}), 404

        if getattr(target_siswa, 'status', 'Aktif') == 'Alumni':
            return jsonify({"success": False, "message": f"Siswa {target_siswa.nama} sudah berstatus Alumni/Lulus."}), 403

        # Cek apakah siswa sudah presensi hari ini
        sudah_absen = AbsensiHarian.query.filter(
            AbsensiHarian.siswa_id == expected_siswa_id,
            AbsensiHarian.waktu >= today_start,
            AbsensiHarian.waktu <= today_end
        ).first()

        if sudah_absen:
            return jsonify({
                "success": False,
                "already_attended": True,
                "waktu": sudah_absen.waktu.strftime('%H:%M:%S'),
                "status": sudah_absen.status,
                "message": f"Presensi ditolak! Anda ({target_siswa.nama}) sudah melakukan presensi hari ini pada pukul {sudah_absen.waktu.strftime('%H:%M:%S')} WIB ({sudah_absen.status}). Presensi harian hanya diizinkan 1 kali per hari."
            }), 400

        # Ambil sampel biometrik wajah khusus siswa ini
        if not target_siswa.face_encoding:
            return jsonify({
                "success": False,
                "message": f"Data biometrik wajah Anda ({target_siswa.nama}) belum terdaftar. Silakan daftarkan sampel wajah Anda terlebih dahulu di Portal Siswa."
            }), 400

        try:
            stored_encodings = json.loads(target_siswa.face_encoding)
            if not isinstance(stored_encodings, list) or len(stored_encodings) == 0:
                raise ValueError("Encoding kosong")
            encodings = stored_encodings
            siswa_ids = [target_siswa.id] * len(stored_encodings)
        except Exception:
            return jsonify({
                "success": False,
                "message": "Data biometrik wajah Anda tidak valid. Silakan hubungi Admin Sekolah untuk melakukan reset wajah."
            }), 400
    else:
        # 2. Mode Kiosk / Guru Piket (Pemindaian seluruh siswa aktif)
        encodings, siswa_ids = get_flattened_known_faces()
        if not encodings:
            return jsonify({"success": False, "message": "Belum ada data wajah siswa yang terdaftar di sistem."}), 400

    try:
        result = verify_face(image_data, encodings, siswa_ids)
        if result['success']:
            siswa_id = result['siswa_id']
            siswa = Siswa.query.get(siswa_id)
            if not siswa:
                return jsonify({"success": False, "message": "Data siswa tidak ditemukan."}), 404

            # Jika presensi mandiri, pastikan ID hasil deteksi sama dengan akun siswa yang login
            if expected_siswa_id and siswa_id != expected_siswa_id:
                return jsonify({
                    "success": False,
                    "message": f"Wajah yang terdeteksi tidak cocok dengan akun Anda ({target_siswa.nama})! Presensi harian wajib dilakukan oleh pemilik akun sendiri."
                }), 401

            # Cek apakah siswa sudah presensi hari ini
            sudah_absen = AbsensiHarian.query.filter(
                AbsensiHarian.siswa_id == siswa_id,
                AbsensiHarian.waktu >= today_start,
                AbsensiHarian.waktu <= today_end
            ).first()

            if sudah_absen:
                return jsonify({
                    "success": False,
                    "already_attended": True,
                    "waktu": sudah_absen.waktu.strftime('%H:%M:%S'),
                    "status": sudah_absen.status,
                    "message": f"{siswa.nama} ({siswa.kelas}) sudah tercatat presensi hari ini pada pukul {sudah_absen.waktu.strftime('%H:%M:%S')} WIB ({sudah_absen.status}). Presensi harian hanya diizinkan 1 kali per hari."
                }), 400

            status = check_status_kehadiran()
            now_dt = datetime.now()
            absen = AbsensiHarian(siswa_id=siswa_id, status=status, waktu=now_dt)
            db.session.add(absen)

            # Jika siswa terlambat, otomatis catat ke Buku Saku Pelanggaran Siswa (+5 poin)
            if status == "Terlambat":
                catat_pelanggaran_terlambat(
                    siswa=siswa,
                    waktu=now_dt,
                    sumber="Presensi Harian (Wajah & GPS)",
                    petugas="Sistem Presensi SMKN 21",
                    alasan=f"Presensi mandiri tercatat pukul {now_dt.strftime('%H:%M:%S')} WIB (Batas: 06:30 WIB)"
                )

            db.session.commit()

            confidence_text = f" kecocokan {result.get('confidence', 95)}%" if 'confidence' in result else ""
            return jsonify({
                "success": True,
                "message": f"Berhasil Absen {siswa.nama} - {siswa.kelas} ({status}){confidence_text}"
            })
        else:
            if expected_siswa_id:
                return jsonify({
                    "success": False,
                    "message": f"Wajah tidak cocok dengan akun Anda ({target_siswa.nama}). Pastikan wajah menghadap lurus ke kamera dengan pencahayaan yang cukup."
                }), 401
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

