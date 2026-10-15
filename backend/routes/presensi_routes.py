import json
import time as time_module
from datetime import datetime, time, date, timedelta, timezone
from flask import Blueprint, request, jsonify
from sqlalchemy.exc import IntegrityError
from config import SEKOLAH_LATITUDE, SEKOLAH_LONGITUDE, MAX_RADIUS_SEKOLAH, SEKOLAH_POLYGON, SEKOLAH_INFO, WAKTU_MULAI_MASUK, WAKTU_BATAS_MASUK
from models import db, Siswa, AbsensiHarian, AbsensiPerpustakaan, PengaturanJadwal
from face_utils import verify_face
from utils.helpers import (
    calculate_distance_meters,
    is_point_in_polygon,
    verify_anti_fake_gps,
    check_status_kehadiran,
    is_presensi_open,
    is_school_day,
    is_kelas_pjj,
    get_flattened_known_faces,
    get_student_decrypted_encodings,
    get_holiday_status,
    get_active_schedule,
    get_cached_school_context,
    now_wib,
    today_wib,
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
    current_user = getattr(request, 'current_user', {})
    user_role = str(current_user.get('role', '')).lower()
    user_id = current_user.get('user_id')
    if user_role == 'siswa':
        siswa_id = user_id
    else:
        siswa_id = request.args.get('siswa_id')

    now_dt = now_wib()
    now_epoch_ms = int(time_module.time() * 1000)
    ctx = get_cached_school_context(now_dt)
    h_status = ctx.get("holiday_status") or get_holiday_status(now_dt)
    nama_hari = h_status["nama_hari"]
    is_school_day_today = h_status["is_school_day"]

    active_sched = get_active_schedule(now_dt)
    jam_buka_str = f"{active_sched['jam_buka'].strftime('%H:%M')} WIB"
    jam_batas_str = f"{active_sched['jam_batas'].strftime('%H:%M')} WIB"
    is_darurat = active_sched.get("mode_darurat", False)

    j_dict = ctx.get("jadwal_dict") or {}
    curr_ta = j_dict.get("tahun_ajaran") or "2026/2027"
    curr_sem = j_dict.get("semester") or "Ganjil"

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
            "server_epoch_ms": now_epoch_ms,
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
            "server_epoch_ms": now_epoch_ms,
            "tahun_ajaran": curr_ta,
            "semester": curr_sem,
            "message": h_status["message"],
            "data": None
        })

    siswa = Siswa.query.get(siswa_id)
    if not siswa:
        return jsonify({"success": False, "message": "Data siswa tidak ditemukan."}), 404

    pjj_active, pjj_info = is_kelas_pjj(siswa.kelas, now_dt)

    today_start = datetime.combine(now_dt.date(), time.min)
    today_end = datetime.combine(now_dt.date(), time.max)
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
            "server_epoch_ms": now_epoch_ms,
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
            "server_epoch_ms": now_epoch_ms,
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

    now_dt = now_wib()
    server_epoch = time_module.time()

    # Validasi Anti-NTP Time Tampering (Mendeteksi manipulasi jam HP)
    if client_timestamp is not None:
        try:
            client_epoch = None
            if isinstance(client_timestamp, (int, float)):
                client_epoch = float(client_timestamp) / 1000.0 if client_timestamp > 1e11 else float(client_timestamp)
            elif isinstance(client_timestamp, str):
                client_epoch = datetime.fromisoformat(client_timestamp.replace('Z', '+00:00')).timestamp()

            if client_epoch is not None:
                drift_sec = abs(server_epoch - client_epoch)
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
        is_med_pass = bool(target_siswa.medical_exemption_until and target_siswa.medical_exemption_until >= now_dt.date())
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
        is_med_exempt_early = bool(
            target_siswa.medical_exemption_until and
            target_siswa.medical_exemption_until >= now_dt.date()
        )

        # Validasi Liveness Token (Anti-Tembak API / Celah Foto Statis)
        # Khusus presensi mandiri siswa, wajib menyertakan token verifikasi kedipan aktif yang sah dari server
        # Pengecualian: Siswa dengan dispensasi khusus medis biometrik (cedera/perban wajah)
        if user_role == 'siswa' and not is_med_exempt_early:
            liveness_token = data.get('liveness_token')
            session_tok = current_user.get('session_token', '')
            is_token_valid, token_msg = verify_liveness_token(liveness_token, expected_siswa_id, session_token=session_tok)
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
            # Validasi Anti-Fake GPS & Mock Location (Server-Side)
            gps_samples = data.get('gps_samples')
            is_valid_gps, gps_msg = verify_anti_fake_gps(
                siswa_id=expected_siswa_id,
                latitude=latitude,
                longitude=longitude,
                accuracy=accuracy,
                is_mock=is_mock,
                gps_samples=gps_samples,
                now_dt=now_dt,
                is_kiosk=is_admin_or_piket
            )
            if not is_valid_gps:
                return jsonify({
                    "success": False,
                    "message": f"Presensi ditolak! {gps_msg}"
                }), 403

            in_polygon = is_point_in_polygon(latitude, longitude, SEKOLAH_POLYGON)
            dist = calculate_distance_meters(latitude, longitude, SEKOLAH_LATITUDE, SEKOLAH_LONGITUDE)
            is_valid_loc = in_polygon or (dist is not None and dist <= MAX_RADIUS_SEKOLAH)
            if not is_valid_loc:
                return jsonify({
                    "success": False,
                    "message": f"Presensi ditolak! Posisi Anda terdeteksi di luar area lingkungan resmi SMKN 21 Jakarta (jarak ~{dist}m dari titik pusat sekolah). Pastikan Anda berada di dalam lingkungan sekolah"
                }), 403

    today_start = datetime.combine(now_dt.date(), time.min)
    today_end = datetime.combine(now_dt.date(), time.max)

    # 1. Jika Presensi Mandiri Siswa (expected_siswa_id ditentukan)
    is_medical_exempt = bool(
        target_siswa and 
        target_siswa.medical_exemption_until and 
        target_siswa.medical_exemption_until >= now_dt.date()
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

        # Ambil sampel biometrik wajah khusus siswa ini dari cache RAM terdekripsi (<0.01ms)
        encodings, is_medical_exempt = get_student_decrypted_encodings(expected_siswa_id)
        if not encodings and not is_medical_exempt:
            return jsonify({
                "success": False,
                "message": f"Presensi ditolak: Akun Anda ({target_siswa.nama}) belum terdaftar biometrik wajah resmi. Perekaman biometrik wajah wajib dilakukan melalui Administrator / Tata Usaha Sekolah terlebih dahulu."
            }), 403
        siswa_ids = [expected_siswa_id] * len(encodings)
    else:
        # 2. Mode Kiosk / Guru Piket (Pemindaian seluruh siswa aktif)
        encodings, siswa_ids = get_flattened_known_faces()
        if not encodings:
            return jsonify({"success": False, "message": "Belum ada data wajah siswa yang terdaftar di sistem."}), 400

    target_siswa_info = {
        "id": target_siswa.id,
        "nama": target_siswa.nama,
        "nis": target_siswa.nis,
        "kelas": target_siswa.kelas,
        "medical_exemption_alasan": target_siswa.medical_exemption_alasan
    } if target_siswa else None

    # DE-HOLDING KONEKSI DATABASE:
    # Kembalikan koneksi PostgreSQL ke pool Supabase selama inferensi CPU verify_face berjalan!
    # Mencegah connection pool exhaustion (pool_size=20) saat 80-100 siswa presensi bersamaan
    db.session.remove()

    try:
        result = verify_face(image_data, encodings, siswa_ids) if encodings else {"success": False, "message": "Biometrik wajah dibypass"}
        medical_bypass_applied = False

        # Pengecualian Medis Khusus Biometrik (Medical Exemption Pass)
        if not result.get('success') and is_medical_exempt and expected_siswa_id:
            result['success'] = True
            result['siswa_id'] = expected_siswa_id
            medical_bypass_applied = True

        if result['success']:
            siswa_id = result['siswa_id']
            siswa = Siswa.query.get(siswa_id)
            if not siswa:
                return jsonify({"success": False, "message": "Data siswa tidak ditemukan."}), 404

            # Jika presensi mandiri, pastikan ID hasil deteksi sama dengan akun siswa yang login
            if expected_siswa_id and siswa_id != expected_siswa_id:
                nama_target = target_siswa_info["nama"] if target_siswa_info else "Siswa"
                return jsonify({
                    "success": False,
                    "message": f"Wajah yang terdeteksi tidak cocok dengan akun Anda ({nama_target})! Presensi harian wajib dilakukan oleh pemilik akun sendiri."
                }), 400

            # Cek apakah siswa sudah presensi hari ini (Hanya untuk Kiosk mode; Mandiri sudah diverifikasi di awal)
            if not expected_siswa_id:
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
                        keterangan=f"Terdeteksi titip absen / 1 HP bergantian: {proxy_note}",
                        auto_commit=False
                    )

            ctx = get_cached_school_context(now_dt)
            j_dict = ctx.get("jadwal_dict") or {}
            curr_ta = j_dict.get("tahun_ajaran") or "2026/2027"
            curr_sem = j_dict.get("semester") or "Ganjil"

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

            lat_val = None
            lon_val = None
            try:
                if latitude is not None and str(latitude).strip() != '':
                    lat_val = float(latitude)
                if longitude is not None and str(longitude).strip() != '':
                    lon_val = float(longitude)
            except (ValueError, TypeError):
                pass

            absen = AbsensiHarian(
                siswa_id=siswa_id,
                kelas=siswa.kelas,
                status=status,
                waktu=now_dt,
                latitude=lat_val,
                longitude=lon_val,
                sumber="kiosk" if is_admin_or_piket else "online",
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

            try:
                db.session.commit()
            except IntegrityError:
                db.session.rollback()
                return jsonify({
                    "success": False,
                    "already_present": True,
                    "message": f"{siswa.nama} ({siswa.kelas}) sudah tercatat presensi untuk hari ini. Presensi ganda tidak diperkenankan.",
                    "status_harian": "Sudah Absen"
                }), 409

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
    now_dt = now_wib()
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
            siswa = Siswa.query.get(siswa_id)
            if not siswa:
                return jsonify({"success": False, "message": "Siswa tidak ditemukan."}), 404

            # Jika request dari sesi login siswa, pastikan wajah sesuai akun yang login
            current_u = getattr(request, 'current_user', {})
            role = current_u.get('role')
            if role == 'siswa' and current_u.get('user_id') != siswa_id:
                return jsonify({
                    "success": False, 
                    "message": "Presensi perpustakaan ditolak: Wajah yang terdeteksi tidak sesuai dengan akun siswa yang sedang login."
                }), 403

            # Cegah spam pencatatan ganda dalam 5 menit terakhir
            five_mins_ago = now_dt - timedelta(minutes=5)
            duplicate_visit = AbsensiPerpustakaan.query.filter(
                AbsensiPerpustakaan.siswa_id == siswa_id,
                AbsensiPerpustakaan.waktu >= five_mins_ago
            ).first()
            if duplicate_visit:
                return jsonify({
                    "success": True,
                    "already_recorded": True,
                    "message": f"Kunjungan {siswa.nama} ({siswa.kelas}) sudah tercatat baru saja ({duplicate_visit.waktu.strftime('%H:%M WIB')})."
                })

            kunjungan = AbsensiPerpustakaan(
                siswa_id=siswa_id,
                kelas=siswa.kelas if siswa else None,
                keperluan=keperluan
            )
            db.session.add(kunjungan)
            db.session.commit()
            notify_data_changed("presensi")
            
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
    Endpoint Buffer Darurat Pemadaman Internet & Listrik Total (Offline Emergency Kiosk/Client Sync).
    Menerima batch bukti transaksi presensi lokal yang tersimpan di browser kiosk/klien saat offline.
    Server memverifikasi biometrik wajah, menghitung waktu WIB, memvalidasi geofence & jadwal,
    menentukan status kehadiran, dan mengembalikan hasil per-item.
    """
    data = request.json or {}
    records = data.get('records', [])
    if not isinstance(records, list) or len(records) == 0:
        return jsonify({"success": False, "message": "Tidak ada data antrean presensi offline yang dikirim."}), 400
    if len(records) > 10:
        return jsonify({
            "success": False,
            "message": "Batas antrean offline maksimal 10 rekaman per batch untuk menjaga kestabilan server."
        }), 400

    current_u = getattr(request, 'current_user', {})
    user_role = str(getattr(request, 'user_role', current_u.get('role', ''))).lower()
    user_id = getattr(request, 'user_id', current_u.get('user_id'))

    now_wib_val = now_wib()
    ctx = get_cached_school_context(now_wib_val)
    j_dict = ctx.get("jadwal_dict") or {}
    curr_ta = j_dict.get("tahun_ajaran") or "2026/2027"
    curr_sem = j_dict.get("semester") or "Ganjil"

    wib_tz = timezone(timedelta(hours=7))
    synced_count = 0
    updated_earlier_count = 0
    duplicate_count = 0
    failed_count = 0
    results = []

    # Cache known faces untuk efisiensi jika ada banyak record kiosk dalam batch
    cached_encodings = None
    cached_siswa_ids = None

    for item in records:
        item_id = item.get('id')
        try:
            with db.session.begin_nested():
                mode = item.get('mode', 'kiosk')
                tipe = item.get('tipe', 'harian')
                keperluan = item.get('keperluan', 'Kunjungan Perpustakaan')
                image_data = item.get('image')
                expected_siswa_id = item.get('expected_siswa_id') or item.get('siswa_id')
                device_id = item.get('device_id')
                latitude = item.get('latitude')
                longitude = item.get('longitude')
                raw_waktu = item.get('captured_at') or item.get('waktu')

                # Otorisasi peran: Siswa hanya boleh menyinkronkan rekaman mandiri saat Mode Darurat aktif (AUTH-02)
                if user_role == 'siswa':
                    if mode != 'mandiri' or str(expected_siswa_id) != str(user_id):
                        failed_count += 1
                        results.append({
                            "id": item_id,
                            "status": "rejected",
                            "reason": "Siswa hanya diizinkan menyinkronkan presensi mandiri akun sendiri."
                        })
                        continue

                    # AUTH-02: Cegah pengiriman foto statis jika sekolah tidak dalam Mode Darurat Jaringan
                    active_now = get_active_schedule(now_wib_val)
                    if not active_now.get('mode_darurat', False):
                        failed_count += 1
                        results.append({
                            "id": item_id,
                            "status": "rejected",
                            "reason": "Presensi offline mandiri siswa hanya diizinkan saat Mode Darurat Jaringan diaktifkan pihak sekolah."
                        })
                        continue

                # Konversi waktu captured_at (UTC ISO / String) ke WIB
                record_dt = None
                if raw_waktu:
                    try:
                        if isinstance(raw_waktu, str) and (raw_waktu.endswith('Z') or '+' in raw_waktu or 'T' in raw_waktu):
                            parsed_utc = datetime.fromisoformat(raw_waktu.replace('Z', '+00:00'))
                            if parsed_utc.tzinfo is not None:
                                record_dt = parsed_utc.astimezone(wib_tz).replace(tzinfo=None)
                            else:
                                record_dt = parsed_utc
                        elif isinstance(raw_waktu, str):
                            record_dt = datetime.strptime(raw_waktu, "%Y-%m-%d %H:%M:%S")
                    except Exception:
                        pass

                if not record_dt:
                    record_dt = now_wib_val

                # Batas umur rekaman: maksimal 48 jam dan tidak boleh di masa depan (> 5 menit toleransi drift)
                if record_dt > now_wib_val + timedelta(minutes=5):
                    failed_count += 1
                    results.append({
                        "id": item_id,
                        "status": "rejected",
                        "reason": "Waktu rekaman berada di masa depan (indikasi manipulasi jam perangkat)."
                    })
                    continue

                if now_wib_val - record_dt > timedelta(hours=48):
                    failed_count += 1
                    results.append({
                        "id": item_id,
                        "status": "rejected",
                        "reason": "Catatan presensi offline telah kedaluwarsa (> 48 jam). Harap laporkan ke Guru Piket."
                    })
                    continue

                # Validasi hari sekolah resmi
                h_status = get_holiday_status(record_dt)
                if not h_status.get("is_school_day", True):
                    failed_count += 1
                    results.append({
                        "id": item_id,
                        "status": "rejected",
                        "reason": f"Hari tersebut bukan hari sekolah resmi ({h_status.get('message', 'Hari Libur')})."
                    })
                    continue

                # Validasi jam operasional sekolah dibuka
                active_sched = get_active_schedule(record_dt)
                if record_dt.time() < active_sched['jam_buka']:
                    failed_count += 1
                    results.append({
                        "id": item_id,
                        "status": "rejected",
                        "reason": f"Presensi offline tercatat sebelum jam operasional sekolah dibuka ({active_sched['jam_buka'].strftime('%H:%M')} WIB)."
                    })
                    continue

                rec_date = record_dt.date()
                t_start = datetime.combine(rec_date, time.min)
                t_end = datetime.combine(rec_date, time.max)

                siswa = None
                # 1. Verifikasi Biometrik Wajah Server-Side (WAJIB ADA FOTO)
                if not image_data:
                    failed_count += 1
                    results.append({
                        "id": item_id,
                        "status": "rejected",
                        "reason": "Bukti foto biometrik wajah wajib disertakan pada sinkronisasi offline."
                    })
                    continue

                if mode == 'mandiri' and expected_siswa_id:
                    target = Siswa.query.get(expected_siswa_id)
                    if target and target.face_encoding:
                        try:
                            stored = target.get_encoding()
                            encs = stored if isinstance(stored, list) else []
                            ids = [target.id] * len(encs)
                            match = verify_face(image_data, encs, ids)
                            if match.get('success'):
                                siswa = target
                        except Exception:
                            pass
                    # Dispensasi medis
                    if not siswa and target and target.medical_exemption_until and target.medical_exemption_until >= rec_date:
                        siswa = target
                else:
                    # Kiosk mode: cari kecocokan wajah terhadap seluruh siswa SMKN 21
                    if cached_encodings is None:
                        cached_encodings, cached_siswa_ids = get_flattened_known_faces()
                    if cached_encodings is not None and len(cached_encodings) > 0:
                        match = verify_face(image_data, cached_encodings, cached_siswa_ids)
                        if match.get('success'):
                            siswa = Siswa.query.get(match.get('siswa_id'))

                    if not siswa and expected_siswa_id:
                        target = Siswa.query.get(expected_siswa_id)
                        if target and target.medical_exemption_until and target.medical_exemption_until >= rec_date:
                            siswa = target

                if not siswa:
                    failed_count += 1
                    results.append({
                        "id": item_id,
                        "status": "rejected",
                        "reason": "Siswa tidak ditemukan atau biometrik wajah tidak cocok."
                    })
                    continue

                if getattr(siswa, 'status', 'Aktif') != 'Aktif':
                    failed_count += 1
                    results.append({
                        "id": item_id,
                        "status": "rejected",
                        "reason": f"Siswa {siswa.nama} berstatus {siswa.status} dan tidak dapat melakukan presensi."
                    })
                    continue

                # 2. Validasi Geofencing untuk Presensi Mandiri (Bypass jika PJJ / PKL)
                pjj_active, pjj_info = is_kelas_pjj(siswa.kelas, record_dt)
                if mode == 'mandiri' and not pjj_active:
                    if latitude is None or longitude is None:
                        failed_count += 1
                        results.append({
                            "id": item_id,
                            "status": "rejected",
                            "reason": "Koordinat GPS lokasi wajib disertakan untuk presensi mandiri."
                        })
                        continue

                    in_polygon = is_point_in_polygon(latitude, longitude, SEKOLAH_POLYGON)
                    dist = calculate_distance_meters(latitude, longitude, SEKOLAH_LATITUDE, SEKOLAH_LONGITUDE)
                    is_valid_loc = in_polygon or (dist is not None and dist <= MAX_RADIUS_SEKOLAH)
                    if not is_valid_loc:
                        failed_count += 1
                        results.append({
                            "id": item_id,
                            "status": "rejected",
                            "reason": f"Lokasi presensi berada di luar kawasan sekolah ({int(dist) if dist else '?'}m dari pusat SMKN 21)."
                        })
                        continue

                # 3. Jalur Khusus Sinkronisasi Kunjungan Perpustakaan
                if tipe == 'perpustakaan':
                    window_start = record_dt - timedelta(minutes=5)
                    window_end = record_dt + timedelta(minutes=5)
                    existing_perpus = AbsensiPerpustakaan.query.filter(
                        AbsensiPerpustakaan.siswa_id == siswa.id,
                        AbsensiPerpustakaan.waktu >= window_start,
                        AbsensiPerpustakaan.waktu <= window_end
                    ).first()

                    if existing_perpus:
                        duplicate_count += 1
                        results.append({
                            "id": item_id,
                            "status": "duplicate",
                            "siswa_id": siswa.id,
                            "nama": siswa.nama,
                            "message": f"Kunjungan perpustakaan {siswa.nama} sudah tercatat pada {existing_perpus.waktu.strftime('%H:%M:%S')} WIB."
                        })
                        continue

                    kunjungan = AbsensiPerpustakaan(
                        siswa_id=siswa.id,
                        kelas=siswa.kelas,
                        waktu=record_dt,
                        keperluan=keperluan
                    )
                    db.session.add(kunjungan)
                    synced_count += 1
                    results.append({
                        "id": item_id,
                        "status": "synced",
                        "siswa_id": siswa.id,
                        "nama": siswa.nama,
                        "status_kehadiran": "Perpustakaan",
                        "message": f"Kunjungan perpustakaan {siswa.nama} berhasil disinkronkan ({keperluan})."
                    })
                    continue

                # 4. Hitung status kehadiran resmi (Tepat Waktu / Terlambat) oleh server berbasis waktu kejadian WIB
                base_status = check_status_kehadiran(record_dt)
                if pjj_active and "PKL" in (pjj_info or "").upper():
                    clean_status = f"{base_status} (PKL)"
                elif pjj_active:
                    clean_status = f"{base_status} (PJJ)"
                else:
                    clean_status = base_status

                # 5. Cek Duplikasi Presensi Harian pada Tanggal Kejadian (Resolusi Konflik Earliest-Verified-Timestamp-Wins)
                existing = AbsensiHarian.query.filter(
                    AbsensiHarian.siswa_id == siswa.id,
                    AbsensiHarian.waktu >= t_start,
                    AbsensiHarian.waktu <= t_end
                ).first()

                if existing:
                    # Resolusi Konflik Timestamp: Jika bukti offline (terutama dari Kiosk) tercatat LEBIH PAGI
                    # daripada presensi yang sudah masuk, perbarui ke waktu paling awal yang sah!
                    if record_dt < existing.waktu and "Alpa" not in (existing.status or ""):
                        was_late = "Terlambat" in (existing.status or "")
                        is_now_ontime = "Tepat Waktu" in clean_status
                        existing.waktu = record_dt
                        existing.status = clean_status if mode == "kiosk" else f"{clean_status} (Perlu Verifikasi Piket)"
                        if mode == "kiosk":
                            existing.sumber = "offline_kiosk"
                            existing.is_flagged_proxy = False
                            existing.proxy_note = "(Sync Offline Kiosk Terverifikasi - Update Lebih Pagi)"

                        # Jika sebelumnya sempat kena penalti Terlambat padahal bukti offline-nya Tepat Waktu, hapus penalti!
                        if was_late and is_now_ontime and mode == "kiosk":
                            from models import PelanggaranSiswa
                            PelanggaranSiswa.query.filter(
                                PelanggaranSiswa.siswa_id == siswa.id,
                                PelanggaranSiswa.jenis_pelanggaran.ilike("%Terlambat%"),
                                PelanggaranSiswa.tanggal_waktu >= t_start,
                                PelanggaranSiswa.tanggal_waktu <= t_end
                            ).delete(synchronize_session=False)

                        synced_count += 1
                        updated_earlier_count += 1
                        results.append({
                            "id": item_id,
                            "status": "synced",
                            "updated_earlier": True,
                            "siswa_id": siswa.id,
                            "nama": siswa.nama,
                            "status_kehadiran": existing.status,
                            "message": f"Waktu presensi {siswa.nama} diperbarui ke rekaman lebih awal ({record_dt.strftime('%H:%M:%S')} WIB)."
                        })
                        continue

                    duplicate_count += 1
                    results.append({
                        "id": item_id,
                        "status": "duplicate",
                        "siswa_id": siswa.id,
                        "nama": siswa.nama,
                        "message": f"{siswa.nama} sudah tercatat presensi lebih awal pada {existing.waktu.strftime('%H:%M:%S')} WIB."
                    })
                    continue

                sumber_label = "offline_kiosk" if mode == "kiosk" else "offline_mandiri"
                is_student_mandiri = (user_role == 'siswa' or mode != "kiosk")

                if is_student_mandiri:
                    clean_status_final = f"{clean_status} (Perlu Verifikasi Piket)"
                    is_flagged = True
                    proxy_label = "(Sync Offline Mandiri - Menunggu Verifikasi Guru Piket)"
                else:
                    clean_status_final = clean_status
                    is_flagged = False
                    proxy_label = "(Sync Offline Kiosk Terverifikasi)"

                absen = AbsensiHarian(
                    siswa_id=siswa.id,
                    kelas=siswa.kelas,
                    status=clean_status_final,
                    waktu=record_dt,
                    latitude=latitude,
                    longitude=longitude,
                    sumber=sumber_label,
                    device_id=device_id or None,
                    is_flagged_proxy=is_flagged,
                    proxy_note=proxy_label,
                    tahun_ajaran=curr_ta,
                    semester=curr_sem
                )
                db.session.add(absen)

                if "Terlambat" in clean_status:
                    catat_pelanggaran_terlambat(
                        siswa=siswa,
                        waktu=record_dt,
                        sumber="Sync Offline",
                        petugas=f"Sistem {'Kiosk' if mode == 'kiosk' else 'Mandiri'} Offline SMKN 21",
                        alasan=f"Presensi offline tersinkronisasi ({record_dt.strftime('%H:%M:%S')} WIB)"
                    )

                synced_count += 1
                results.append({
                    "id": item_id,
                    "status": "synced",
                    "siswa_id": siswa.id,
                    "nama": siswa.nama,
                    "status_kehadiran": clean_status
                })
        except Exception as e:
            failed_count += 1
            results.append({
                "id": item_id,
                "status": "error",
                "message": f"Terjadi kendala saat memproses entri presensi ini: {str(e)}"
            })

    try:
        db.session.commit()
        if synced_count > 0:
            notify_data_changed("presensi")
        return jsonify({
            "success": True,
            "synced": synced_count,
            "updated_earlier": updated_earlier_count,
            "duplicates": duplicate_count,
            "failed": failed_count,
            "results": results,
            "message": f"Sinkronisasi Buffer Selesai: {synced_count} berhasil disimpan ({updated_earlier_count} diperbarui lebih awal), {duplicate_count} sudah ada (duplikat), {failed_count} gagal."
        })
    except Exception:
        db.session.rollback()
        return jsonify({"success": False, "message": "Gagal menyimpan transaksi sinkronisasi offline ke basis data."}), 500

