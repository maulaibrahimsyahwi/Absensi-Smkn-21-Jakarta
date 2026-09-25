from datetime import datetime, time, date
from flask import Blueprint, request, jsonify
from config import SEKOLAH_LATITUDE, SEKOLAH_LONGITUDE, MAX_RADIUS_SEKOLAH, SEKOLAH_POLYGON, SEKOLAH_INFO, WAKTU_MULAI_MASUK, WAKTU_BATAS_MASUK
from models import db, Siswa, AbsensiHarian, AbsensiPerpustakaan
from face_utils import verify_face
from utils.helpers import calculate_distance_meters, is_point_in_polygon, check_status_kehadiran, is_presensi_open, is_school_day, is_kelas_pjj, get_flattened_known_faces
from routes.pelanggaran_routes import catat_pelanggaran_terlambat
from routes.biometrik_routes import verify_liveness_token
from utils.auth_middleware import token_required

presensi_bp = Blueprint('presensi', __name__)

# ================= VERIFIKASI PRESENSI & LOKASI SEKOLAH =================

@presensi_bp.route('/api/presensi/status_today', methods=['GET'])
@token_required
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

    now_dt = datetime.now()
    nama_hari = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"][now_dt.weekday()]
    is_weekend = not is_school_day(now_dt)
    pjj_active, pjj_info = is_kelas_pjj(siswa.kelas, now_dt)

    if is_weekend:
        return jsonify({
            "success": True,
            "already_attended": False,
            "is_weekend": True,
            "is_pjj": False,
            "pjj_info": "",
            "is_presensi_open": False,
            "hari": nama_hari,
            "jam_buka": "05:00 WIB",
            "jam_batas": "06:30 WIB",
            "message": f"Hari ini adalah hari {nama_hari} (Libur Akhir Pekan). Presensi kehadiran dibuka kembali hari Senin pukul 05:00 WIB.",
            "data": None
        })

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
            "is_weekend": False,
            "is_pjj": pjj_active,
            "pjj_info": pjj_info,
            "is_presensi_open": is_presensi_open(now_dt),
            "jam_buka": "05:00 WIB",
            "jam_batas": "06:30 WIB",
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
            "is_weekend": False,
            "is_pjj": pjj_active,
            "pjj_info": pjj_info,
            "is_presensi_open": is_presensi_open(now_dt),
            "jam_buka": "05:00 WIB",
            "jam_batas": "06:30 WIB",
            "data": None
        })


@presensi_bp.route('/api/verify_harian', methods=['POST'])
@token_required
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

    current_user = getattr(request, 'current_user', {})
    user_role = current_user.get('role')
    user_id = current_user.get('user_id')

    target_siswa = None
    is_pjj_user = False
    pjj_label_user = ""

    # Jika pemanggil adalah siswa, kunci expected_siswa_id ke ID miliknya sendiri (mencegah impersonasi)
    if user_role == 'siswa':
        expected_siswa_id = user_id
        target_siswa = Siswa.query.get(expected_siswa_id)
        if not target_siswa:
            return jsonify({"success": False, "message": "Akun siswa tidak ditemukan."}), 404
        if getattr(target_siswa, 'status', 'Aktif') == 'Alumni':
            return jsonify({"success": False, "message": f"Siswa {target_siswa.nama} sudah berstatus Alumni/Lulus."}), 403
        if not target_siswa.face_encoding:
            return jsonify({
                "success": False,
                "message": f"Presensi ditolak: Akun Anda ({target_siswa.nama}) belum terdaftar biometrik wajah resmi. Perekaman biometrik wajah wajib dilakukan melalui Administrator / Tata Usaha Sekolah terlebih dahulu."
            }), 403
    elif expected_siswa_id:
        try:
            expected_siswa_id = int(expected_siswa_id)
            target_siswa = Siswa.query.get(expected_siswa_id)
        except (ValueError, TypeError):
            expected_siswa_id = None

    # Validasi Hari Operasional: Presensi hanya aktif pada hari sekolah (Senin s/d Jumat)
    now_dt = datetime.now()
    if not is_school_day(now_dt):
        nama_hari = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"][now_dt.weekday()]
        return jsonify({
            "success": False,
            "is_weekend": True,
            "message": f"Presensi harian ditolak! Sistem presensi SMKN 21 hanya beroperasi pada hari Senin s/d Jumat. Hari ini adalah hari {nama_hari} (Libur Akhir Pekan)."
        }), 400

    # Validasi Jam Operasional: Presensi baru dibuka mulai pukul 05:00 WIB
    if not is_presensi_open(now_dt):
        return jsonify({
            "success": False,
            "message": f"Presensi harian belum dibuka! Presensi kehadiran SMKN 21 dibuka mulai pukul 05:00 WIB (05:00 - 06:30 WIB Tepat Waktu, lewat 06:30 WIB Terlambat). Jam saat ini: {now_dt.strftime('%H:%M:%S')} WIB."
        }), 400

    # Validasi Anti-Fake GPS: Tolak jika terindikasi mock location
    if is_mock:
        return jsonify({
            "success": False,
            "message": "Presensi ditolak! Terdeteksi lokasi palsu. Gunakan Lokasi asli Anda"
        }), 403
    if accuracy is not None and (accuracy <= 0 or accuracy < 1.8):
        return jsonify({
            "success": False,
            "message": f"Presensi ditolak! Akurasi GPS ({accuracy}m) terindikasi emulator/Fake GPS."
        }), 403

    # Periksa target siswa dan status PJJ jika presensi mandiri
    if target_siswa:
        is_pjj_user, pjj_label_user = is_kelas_pjj(target_siswa.kelas, now_dt)

        # Validasi Liveness Token (Anti-Tembak API / Celah Foto Statis)
        # Khusus presensi mandiri siswa, wajib menyertakan token verifikasi kedipan aktif yang sah dari server
        if user_role == 'siswa':
            liveness_token = data.get('liveness_token')
            is_token_valid, token_msg = verify_liveness_token(liveness_token, expected_siswa_id)
            if not is_token_valid:
                return jsonify({
                    "success": False,
                    "message": f"Presensi ditolak! {token_msg} Lakukan pemindaian wajah dan kedipan mata langsung di kamera aplikasi"
                }), 403

    # Validasi Geofence:
    # Untuk presensi mandiri siswa atau perangkat non-admin/piket, koordinat GPS WAJIB disertakan
    is_admin_or_piket = user_role in ['admin', 'piket']
    if expected_siswa_id or not is_admin_or_piket:
        if latitude is None or longitude is None:
            return jsonify({
                "success": False,
                "message": "Presensi ditolak! Akses lokasi wajib diaktifkan untuk mencatat titik lokasi presensi Anda"
            }), 403

    # Validasi Geofence (Poligon Lahan Pagar SMKN 21 + Toleransi Radius Cadangan 50m)
    # Bypass batasan jika siswa berstatus PJJ (Belajar dari Rumah / PKL)
    if not is_pjj_user:
        if latitude is not None and longitude is not None:
            in_polygon = is_point_in_polygon(latitude, longitude, SEKOLAH_POLYGON)
            dist = calculate_distance_meters(latitude, longitude, SEKOLAH_LATITUDE, SEKOLAH_LONGITUDE)
            is_valid_loc = in_polygon or (dist is not None and dist <= MAX_RADIUS_SEKOLAH)
            if not is_valid_loc:
                return jsonify({
                    "success": False,
                    "message": f"Presensi ditolak! Posisi Anda terdeteksi di luar area lingkungan resmi SMKN 21 Jakarta (jarak ~{dist}m dari titik pusat sekolah). Pastikan Anda berada di dalam lingkungan sekolah"
                }), 403

    today_start = datetime.combine(date.today(), time.min)
    today_end = datetime.combine(date.today(), time.max)

    # 1. Jika Presensi Mandiri Siswa (expected_siswa_id ditentukan)
    if expected_siswa_id:
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
                "message": f"Presensi ditolak! Anda ({target_siswa.nama}) sudah melakukan presensi hari ini pada pukul {sudah_absen.waktu.strftime('%H:%M:%S')} WIB ({sudah_absen.status})"
            }), 400

        # Ambil sampel biometrik wajah khusus siswa ini
        if not target_siswa.face_encoding:
            return jsonify({
                "success": False,
                "message": f"Presensi ditolak: Akun Anda ({target_siswa.nama}) belum terdaftar biometrik wajah resmi. Perekaman biometrik wajah wajib dilakukan melalui Administrator / Tata Usaha Sekolah terlebih dahulu."
            }), 403

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
                }), 400

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
                    "siswa": {
                        "id": siswa.id,
                        "nama": siswa.nama,
                        "nis": siswa.nis,
                        "kelas": siswa.kelas
                    },
                    "waktu": sudah_absen.waktu.strftime('%H:%M:%S'),
                    "status": sudah_absen.status,
                    "message": f"{siswa.nama} ({siswa.kelas}) sudah tercatat presensi hari ini pada pukul {sudah_absen.waktu.strftime('%H:%M:%S')} WIB ({sudah_absen.status}). Presensi harian hanya diizinkan 1 kali per hari."
                }), 400

            now_dt = datetime.now()
            pjj_active, pjj_info = is_kelas_pjj(siswa.kelas, now_dt)
            base_status = check_status_kehadiran(now_dt)
            status = f"{base_status} (PJJ)" if pjj_active else base_status

            absen = AbsensiHarian(siswa_id=siswa_id, status=status, waktu=now_dt)
            db.session.add(absen)

            # Jika siswa terlambat, otomatis catat ke Buku Saku Pelanggaran Siswa (+5 poin)
            if "Terlambat" in status:
                catat_pelanggaran_terlambat(
                    siswa=siswa,
                    waktu=now_dt,
                    sumber=f"Presensi Harian {'(PJJ)' if pjj_active else '(Wajah & GPS)'}",
                    petugas="Sistem Presensi SMKN 21",
                    alasan=f"Presensi mandiri {'PJJ ' if pjj_active else ''}tercatat pukul {now_dt.strftime('%H:%M:%S')} WIB (Batas: 06:30 WIB)"
                )

            db.session.commit()

            confidence_text = f" kecocokan {result.get('confidence', 95)}%" if 'confidence' in result else ""
            return jsonify({
                "success": True,
                "is_pjj": pjj_active,
                "pjj_info": pjj_info,
                "siswa": {
                    "id": siswa.id,
                    "nama": siswa.nama,
                    "nis": siswa.nis,
                    "kelas": siswa.kelas
                },
                "status": status,
                "waktu": now_dt.strftime("%H:%M:%S"),
                "message": f"Berhasil Absen: {siswa.nama} ({siswa.kelas}) - {status}{confidence_text}"
            })
        else:
            if expected_siswa_id:
                return jsonify({
                    "success": False,
                    "message": f"Wajah tidak cocok dengan akun Anda ({target_siswa.nama}). Pastikan wajah menghadap lurus ke kamera dengan pencahayaan yang cukup."
                }), 400
            return jsonify(result), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@presensi_bp.route('/api/verify_perpus', methods=['POST'])
@token_required
def verify_perpus():
    data = request.json or {}
    image_data = data.get('image')
    keperluan = data.get('keperluan')
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    accuracy = data.get('accuracy')
    is_mock = data.get('is_mock', False)
    simulated = data.get('simulated', False)
    
    # Validasi Hari Operasional: Perpustakaan hanya melayani presensi pada hari sekolah (Senin s/d Jumat)
    now_dt = datetime.now()
    if not is_school_day(now_dt):
        nama_hari = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"][now_dt.weekday()]
        return jsonify({
            "success": False,
            "is_weekend": True,
            "message": f"Presensi perpustakaan ditolak! Layanan perpustakaan SMKN 21 hanya beroperasi pada hari Senin s/d Jumat. Hari ini adalah hari {nama_hari} (Libur Akhir Pekan)."
        }), 400

    if not keperluan:
        return jsonify({"success": False, "message": "Keperluan kunjungan belum diisi."}), 400

    # Validasi Anti-Fake GPS: Tolak jika terindikasi mock location
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

    # Validasi Geofence: Pastikan siswa berada dalam area resmi sekolah (Poligon / Radius 50m)
    if latitude is not None and longitude is not None:
        in_polygon = is_point_in_polygon(latitude, longitude, SEKOLAH_POLYGON)
        dist = calculate_distance_meters(latitude, longitude, SEKOLAH_LATITUDE, SEKOLAH_LONGITUDE)
        is_valid_loc = in_polygon or (dist is not None and dist <= MAX_RADIUS_SEKOLAH)
        if not is_valid_loc:
            return jsonify({
                "success": False,
                "message": f"Presensi perpustakaan ditolak! Posisi Anda terdeteksi di luar area resmi lingkungan SMKN 21 (jarak ~{dist}m dari pusat sekolah)."
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
            return jsonify(result), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@presensi_bp.route('/api/sekolah/lokasi', methods=['GET'])
def get_sekolah_lokasi():
    return jsonify(SEKOLAH_INFO)

