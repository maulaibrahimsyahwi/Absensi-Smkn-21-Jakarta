from datetime import datetime, time, date, timedelta
from flask import Blueprint, request, jsonify
from config import SEKOLAH_LATITUDE, SEKOLAH_LONGITUDE, MAX_RADIUS_SEKOLAH, SEKOLAH_POLYGON, SEKOLAH_INFO, WAKTU_MULAI_MASUK, WAKTU_BATAS_MASUK
from models import db, Siswa, AbsensiHarian, AbsensiPerpustakaan, PengaturanJadwal
from face_utils import verify_face
from utils.helpers import (
    calculate_distance_meters,
    is_point_in_polygon,
    check_status_kehadiran,
    is_presensi_open,
    is_school_day,
    is_kelas_pjj,
    get_flattened_known_faces,
    get_holiday_status,
    get_active_schedule,
)
from routes.pelanggaran_routes import catat_pelanggaran_terlambat
from routes.biometrik_routes import verify_liveness_token
from utils.auth_middleware import token_required
from utils.audit_trail import record_audit_log
from utils.realtime_bus import notify_data_changed

presensi_bp = Blueprint('presensi', __name__)

# ================= VERIFIKASI PRESENSI & LOKASI SEKOLAH =================

@presensi_bp.route('/api/presensi/status_today', methods=['GET'])
@token_required
def get_status_today():
    """
    Memeriksa apakah siswa sudah melakukan presensi harian pada hari ini.
    Menyertakan server_timestamp untuk sinkronisasi Anti-NTP serta info Tahun Ajaran dan Semester aktif.
    """
    siswa_id = request.args.get('siswa_id')
    now_dt = datetime.now()
    h_status = get_holiday_status(now_dt)
    nama_hari = h_status["nama_hari"]
    is_school_day_today = h_status["is_school_day"]

    active_sched = get_active_schedule(now_dt)
    jam_buka_str = f"{active_sched['jam_buka'].strftime('%H:%M')} WIB"
    jam_batas_str = f"{active_sched['jam_batas'].strftime('%H:%M')} WIB"
    is_darurat = active_sched.get("mode_darurat", False)

    cfg = PengaturanJadwal.query.first()
    curr_ta = cfg.tahun_ajaran if cfg and cfg.tahun_ajaran else "2026/2027"
    curr_sem = cfg.semester if cfg and cfg.semester else "Ganjil"

    if not is_school_day_today:
        h_event = h_status["holiday_event"]
        return jsonify({
            "success": True,
            "already_attended": False,
            "is_weekend": h_status["is_weekend"],
            "is_holiday": h_status["is_holiday"],
            "holiday_name": h_event["nama"] if h_event else "",
            "holiday_info": h_event,
            "is_special_school_day": False,
            "is_pjj": False,
            "pjj_info": "",
            "is_presensi_open": False,
            "hari": nama_hari,
            "jam_buka": jam_buka_str,
            "jam_batas": jam_batas_str,
            "mode_darurat": is_darurat,
            "server_timestamp": now_dt.isoformat(),
            "server_epoch_ms": int(now_dt.timestamp() * 1000),
            "tahun_ajaran": curr_ta,
            "semester": curr_sem,
            "message": h_status["message"],
            "data": None
        })

    # Jika hari sekolah tapi siswa_id tidak diberikan (misal kiosk mode umum)
    if not siswa_id:
        is_special = h_status.get("is_special_school_day", False)
        holiday_evt = h_status.get("holiday_event")
        return jsonify({
            "success": True,
            "already_attended": False,
            "is_weekend": False,
            "is_holiday": False,
            "is_special_school_day": is_special,
            "holiday_name": holiday_evt["nama"] if (is_special and holiday_evt) else "",
            "holiday_info": holiday_evt,
            "is_pjj": False,
            "pjj_info": "",
            "is_presensi_open": is_presensi_open(now_dt),
            "hari": nama_hari,
            "jam_buka": jam_buka_str,
            "jam_batas": jam_batas_str,
            "mode_darurat": is_darurat,
            "server_timestamp": now_dt.isoformat(),
            "server_epoch_ms": int(now_dt.timestamp() * 1000),
            "tahun_ajaran": curr_ta,
            "semester": curr_sem,
            "message": h_status["message"],
            "data": None
        })

    siswa = Siswa.query.get(siswa_id)
    if not siswa:
        return jsonify({"success": False, "message": "Data siswa tidak ditemukan."}), 404

    pjj_active, pjj_info = is_kelas_pjj(siswa.kelas, now_dt)

    today_start = datetime.combine(date.today(), time.min)
    today_end = datetime.combine(date.today(), time.max)
    absen_today = AbsensiHarian.query.filter(
        AbsensiHarian.siswa_id == siswa_id,
        AbsensiHarian.waktu >= today_start,
        AbsensiHarian.waktu <= today_end
    ).first()

    is_special = h_status.get("is_special_school_day", False)
    holiday_evt = h_status.get("holiday_event")

    if absen_today:
        return jsonify({
            "success": True,
            "already_attended": True,
            "is_weekend": False,
            "is_holiday": False,
            "is_special_school_day": is_special,
            "holiday_name": holiday_evt["nama"] if (is_special and holiday_evt) else "",
            "holiday_info": holiday_evt,
            "is_pjj": pjj_active,
            "pjj_info": pjj_info,
            "is_presensi_open": is_presensi_open(now_dt),
            "hari": nama_hari,
            "jam_buka": jam_buka_str,
            "jam_batas": jam_batas_str,
            "mode_darurat": is_darurat,
            "server_timestamp": now_dt.isoformat(),
            "server_epoch_ms": int(now_dt.timestamp() * 1000),
            "tahun_ajaran": curr_ta,
            "semester": curr_sem,
            "message": h_status["message"],
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
            "is_holiday": False,
            "is_special_school_day": is_special,
            "holiday_name": holiday_evt["nama"] if (is_special and holiday_evt) else "",
            "holiday_info": holiday_evt,
            "is_pjj": pjj_active,
            "pjj_info": pjj_info,
            "is_presensi_open": is_presensi_open(now_dt),
            "hari": nama_hari,
            "jam_buka": jam_buka_str,
            "jam_batas": jam_batas_str,
            "mode_darurat": is_darurat,
            "server_timestamp": now_dt.isoformat(),
            "server_epoch_ms": int(now_dt.timestamp() * 1000),
            "tahun_ajaran": curr_ta,
            "semester": curr_sem,
            "message": h_status["message"],
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
    device_id = str(data.get('device_id', '')).strip()
    client_timestamp = data.get('client_timestamp')

    now_dt = datetime.now()

    # Validasi Anti-NTP Time Tampering (Mendeteksi manipulasi jam HP)
    if client_timestamp is not None:
        try:
            client_epoch = None
            if isinstance(client_timestamp, (int, float)):
                client_epoch = float(client_timestamp) / 1000.0 if client_timestamp > 1e11 else float(client_timestamp)
            elif isinstance(client_timestamp, str):
                client_epoch = datetime.fromisoformat(client_timestamp.replace('Z', '+00:00')).timestamp()

            if client_epoch is not None:
                drift_sec = abs(now_dt.timestamp() - client_epoch)
                if drift_sec > 120:  # Selisih jam lebih dari 2 menit
                    return jsonify({
                        "success": False,
                        "time_tampered": True,
                        "drift_seconds": int(drift_sec),
                        "message": f"Presensi ditolak! Terdeteksi selisih waktu jam perangkat Anda ({int(drift_sec)} detik) dari jam resmi server SMKN 21. Silakan aktifkan 'Setel Waktu Otomatis' (NTP) di setelan HP Anda sebelum presensi."
                    }), 403
        except Exception:
            pass

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

        # Jika belum punya encoding wajah, periksa apakah ada dispensasi medis aktif
        is_med_pass = bool(target_siswa.medical_exemption_until and target_siswa.medical_exemption_until >= date.today())
        if not target_siswa.face_encoding and not is_med_pass:
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

    # Validasi Hari Operasional: Presensi hanya aktif pada hari sekolah
    h_status = get_holiday_status(now_dt)
    if not h_status["is_school_day"]:
        return jsonify({
            "success": False,
            "is_weekend": h_status["is_weekend"],
            "is_holiday": h_status["is_holiday"],
            "message": f"Presensi harian ditolak! {h_status['message']}"
        }), 400

    # Validasi Jam Operasional: Presensi baru dibuka sesuai jadwal aktif
    if not is_presensi_open(now_dt):
        active_sched = get_active_schedule(now_dt)
        jam_buka_s = active_sched['jam_buka'].strftime('%H:%M')
        jam_batas_s = active_sched['jam_batas'].strftime('%H:%M')
        return jsonify({
            "success": False,
            "message": f"Presensi harian belum dibuka! Presensi kehadiran SMKN 21 dibuka mulai pukul {jam_buka_s} WIB ({jam_buka_s} - {jam_batas_s} WIB Tepat Waktu, lewat {jam_batas_s} WIB Terlambat). Jam saat ini: {now_dt.strftime('%H:%M:%S')} WIB."
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
    is_medical_exempt = bool(
        target_siswa and 
        target_siswa.medical_exemption_until and 
        target_siswa.medical_exemption_until >= date.today()
    )

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
        if not target_siswa.face_encoding and not is_medical_exempt:
            return jsonify({
                "success": False,
                "message": f"Presensi ditolak: Akun Anda ({target_siswa.nama}) belum terdaftar biometrik wajah resmi. Perekaman biometrik wajah wajib dilakukan melalui Administrator / Tata Usaha Sekolah terlebih dahulu."
            }), 403

        try:
            stored_encodings = json.loads(target_siswa.face_encoding) if target_siswa.face_encoding else []
            if not isinstance(stored_encodings, list) or len(stored_encodings) == 0:
                if not is_medical_exempt:
                    raise ValueError("Encoding kosong")
                encodings = []
                siswa_ids = []
            else:
                encodings = stored_encodings
                siswa_ids = [target_siswa.id] * len(stored_encodings)
        except Exception:
            if not is_medical_exempt:
                return jsonify({
                    "success": False,
                    "message": "Data biometrik wajah Anda tidak valid. Silakan hubungi Admin Sekolah untuk melakukan reset wajah."
                }), 400
            encodings = []
            siswa_ids = []
    else:
        # 2. Mode Kiosk / Guru Piket (Pemindaian seluruh siswa aktif)
        encodings, siswa_ids = get_flattened_known_faces()
        if not encodings:
            return jsonify({"success": False, "message": "Belum ada data wajah siswa yang terdaftar di sistem."}), 400

    try:
        result = verify_face(image_data, encodings, siswa_ids) if encodings else {"success": False, "message": "Biometrik wajah dibypass"}
        medical_bypass_applied = False

        # Pengecualian Medis Khusus Biometrik (Medical Exemption Pass)
        if not result.get('success') and is_medical_exempt and expected_siswa_id:
            result['success'] = True
            result['siswa_id'] = target_siswa.id
            medical_bypass_applied = True

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

            # Deteksi Titip Absen / 1 HP Bergantian (Proxy Detection & Hardware Binding)
            is_flagged_proxy = False
            proxy_note = None
            if device_id:
                ten_mins_ago = now_dt - timedelta(minutes=10)
                prev_proxy = AbsensiHarian.query.filter(
                    AbsensiHarian.device_id == device_id,
                    AbsensiHarian.siswa_id != siswa_id,
                    AbsensiHarian.waktu >= ten_mins_ago
                ).order_by(AbsensiHarian.waktu.desc()).first()

                if prev_proxy:
                    is_flagged_proxy = True
                    delta_sec = int((now_dt - prev_proxy.waktu).total_seconds())
                    proxy_note = f"Peringatan: 1 HP terdeteksi bergantian dengan {prev_proxy.nis} ({prev_proxy.nama}) selang {delta_sec} detik lalu."
                    record_audit_log(
                        user_id=siswa_id,
                        role='siswa',
                        user_name=f"{siswa.nama} ({siswa.nis})",
                        action='FLAG_PROXY_DEVICE',
                        target_type='AbsensiHarian',
                        target_id=str(device_id),
                        keterangan=f"Terdeteksi titip absen / 1 HP bergantian: {proxy_note}"
                    )

            cfg = PengaturanJadwal.query.first()
            curr_ta = cfg.tahun_ajaran if cfg and cfg.tahun_ajaran else "2026/2027"
            curr_sem = cfg.semester if cfg and cfg.semester else "Ganjil"

            pjj_active, pjj_info = is_kelas_pjj(siswa.kelas, now_dt)
            base_status = check_status_kehadiran(now_dt)
            is_pkl = pjj_active and "PKL" in (pjj_info or "").upper()

            if medical_bypass_applied:
                status = f"{base_status} (Dispensasi Medis)"
            elif is_pkl:
                status = f"{base_status} (PKL)"
            elif pjj_active:
                status = f"{base_status} (PJJ)"
            else:
                status = base_status

            absen = AbsensiHarian(
                siswa_id=siswa_id,
                status=status,
                waktu=now_dt,
                device_id=device_id or None,
                is_flagged_proxy=is_flagged_proxy,
                proxy_note=proxy_note,
                tahun_ajaran=curr_ta,
                semester=curr_sem
            )
            db.session.add(absen)

            # Jika siswa terlambat, otomatis catat ke Buku Saku Pelanggaran Siswa (+5 poin)
            if "Terlambat" in status:
                active_sched = get_active_schedule(now_dt)
                jam_batas_s = active_sched['jam_batas'].strftime('%H:%M')
                catat_pelanggaran_terlambat(
                    siswa=siswa,
                    waktu=now_dt,
                    sumber=f"Presensi Harian {'(Dispensasi Medis)' if medical_bypass_applied else ('(PKL)' if is_pkl else ('(PJJ)' if pjj_active else '(Wajah & GPS)'))}",
                    petugas="Sistem Presensi SMKN 21",
                    alasan=f"Presensi mandiri tercatat pukul {now_dt.strftime('%H:%M:%S')} WIB (Batas: {jam_batas_s} WIB)"
                )

            db.session.commit()
            notify_data_changed("presensi")

            confidence_text = f" kecocokan {result.get('confidence', 95)}%" if ('confidence' in result and not medical_bypass_applied) else ""
            if medical_bypass_applied:
                pesan_sukses = f"Berhasil Absen: {siswa.nama} ({siswa.kelas}) - {status} [Pengecualian Medis Biometrik Aktif: {siswa.medical_exemption_alasan or 'Kondisi Medis'}]"
            else:
                pesan_sukses = f"Berhasil Absen: {siswa.nama} ({siswa.kelas}) - {status}{confidence_text}"

            return jsonify({
                "success": True,
                "is_pjj": pjj_active,
                "pjj_info": pjj_info,
                "is_medical_exempt": medical_bypass_applied,
                "is_flagged_proxy": is_flagged_proxy,
                "proxy_note": proxy_note,
                "siswa": {
                    "id": siswa.id,
                    "nama": siswa.nama,
                    "nis": siswa.nis,
                    "kelas": siswa.kelas
                },
                "status": status,
                "waktu": now_dt.strftime("%H:%M:%S"),
                "message": pesan_sukses
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
    
    # Validasi Hari Operasional: Perpustakaan hanya melayani presensi pada hari sekolah aktif
    now_dt = datetime.now()
    h_status = get_holiday_status(now_dt)
    if not h_status["is_school_day"]:
        return jsonify({
            "success": False,
            "is_weekend": h_status["is_weekend"],
            "is_holiday": h_status["is_holiday"],
            "message": f"Presensi perpustakaan ditolak! {h_status['message']}"
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
            notify_data_changed("presensi")
            
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


@presensi_bp.route('/api/presensi/sync_offline', methods=['POST'])
@token_required
def sync_offline():
    """
    Endpoint Buffer Darurat Pemadaman Internet & Listrik Total (Offline Emergency Kiosk Sync).
    Menerima batch transaksi presensi lokal yang tersimpan di browser kiosk saat offline dan menyinkronkannya ke server.
    """
    data = request.json or {}
    records = data.get('records', [])
    if not isinstance(records, list) or len(records) == 0:
        return jsonify({"success": False, "message": "Tidak ada data antrean presensi offline yang dikirim."}), 400

    cfg = PengaturanJadwal.query.first()
    curr_ta = cfg.tahun_ajaran if cfg and cfg.tahun_ajaran else "2026/2027"
    curr_sem = cfg.semester if cfg and cfg.semester else "Ganjil"

    synced_count = 0
    duplicate_count = 0
    failed_count = 0

    for item in records:
        try:
            siswa_id = item.get('siswa_id')
            nis = item.get('nis')
            device_id = item.get('device_id')
            waktu_str = item.get('waktu') or item.get('captured_at')
            raw_status = item.get('status', 'Tepat Waktu')

            siswa = None
            if siswa_id:
                siswa = Siswa.query.get(siswa_id)
            elif nis:
                siswa = Siswa.query.filter_by(nis=str(nis).strip()).first()

            if not siswa:
                failed_count += 1
                continue

            try:
                record_dt = datetime.strptime(waktu_str, "%Y-%m-%d %H:%M:%S")
            except Exception:
                try:
                    record_dt = datetime.fromisoformat(waktu_str.replace('Z', '+00:00'))
                except Exception:
                    record_dt = datetime.now()

            rec_date = record_dt.date()
            t_start = datetime.combine(rec_date, time.min)
            t_end = datetime.combine(rec_date, time.max)

            # Cek apakah sudah pernah presensi pada tanggal tersebut
            existing = AbsensiHarian.query.filter(
                AbsensiHarian.siswa_id == siswa.id,
                AbsensiHarian.waktu >= t_start,
                AbsensiHarian.waktu <= t_end
            ).first()

            if existing:
                duplicate_count += 1
                continue

            clean_status = "Terlambat" if "Terlambat" in raw_status else "Tepat Waktu"
            absen = AbsensiHarian(
                siswa_id=siswa.id,
                status=clean_status,
                waktu=record_dt,
                device_id=device_id or None,
                is_flagged_proxy=False,
                proxy_note="(Sync Offline Kiosk)",
                tahun_ajaran=curr_ta,
                semester=curr_sem
            )
            db.session.add(absen)

            if "Terlambat" in clean_status:
                catat_pelanggaran_terlambat(
                    siswa=siswa,
                    waktu=record_dt,
                    sumber="Sync Offline Kiosk",
                    petugas="Sistem Kiosk Offline SMKN 21",
                    alasan=f"Presensi offline tersinkronisasi ({record_dt.strftime('%H:%M:%S')} WIB)"
                )

            synced_count += 1
        except Exception:
            failed_count += 1

    try:
        db.session.commit()
        notify_data_changed("presensi")
        return jsonify({
            "success": True,
            "synced": synced_count,
            "duplicates": duplicate_count,
            "failed": failed_count,
            "message": f"Sinkronisasi Buffer Kiosk Selesai: {synced_count} berhasil disimpan, {duplicate_count} sudah ada (duplikat), {failed_count} gagal."
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Gagal memproses sinkronisasi offline: {str(e)}"}), 500

