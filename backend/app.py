import os
import time as time_module
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_compress import Compress

from config import (
    SQLALCHEMY_DATABASE_URI,
    SQLALCHEMY_TRACK_MODIFICATIONS,
    SQLALCHEMY_ENGINE_OPTIONS,
    CORS_ORIGINS,
    JWT_SECRET_KEY,
)
from models import db, User

# Import Modular Blueprints
from routes.auth_routes import auth_bp
from routes.staf_routes import staf_bp
from routes.backup_routes import backup_bp
from routes.siswa_routes import siswa_bp
from routes.biometrik_routes import biometrik_bp
from routes.presensi_routes import presensi_bp
from routes.izin_routes import izin_bp
from routes.piket_routes import piket_bp
from routes.rekap_routes import rekap_bp
from routes.pelanggaran_routes import pelanggaran_bp
from routes.pjj_routes import pjj_bp
from routes.libur_routes import libur_bp
from routes.realtime_routes import realtime_bp
from utils.db_migrations import run_db_migrations

# Inisialisasi Aplikasi Flask
app = Flask(__name__)

# Konfigurasi Reverse Proxy (Nginx) agar Flask membaca IP & Protokol HTTPS Asli
from werkzeug.middleware.proxy_fix import ProxyFix
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

# Konfigurasi Database & Batas Muatan Berkas (12MB)
app.config['MAX_CONTENT_LENGTH'] = 12 * 1024 * 1024
app.config['SQLALCHEMY_DATABASE_URI'] = SQLALCHEMY_DATABASE_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = SQLALCHEMY_TRACK_MODIFICATIONS
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = SQLALCHEMY_ENGINE_OPTIONS

# Inisialisasi Ekstensi Keamanan & CORS
CORS(app, resources={r"/api/*": {"origins": CORS_ORIGINS}}, supports_credentials=True)
Compress(app)
db.init_app(app)

# Rate Limiter Cerdas: Mencegah 'School Wi-Fi NAT Trap'
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import jwt

def get_smart_limiter_key():
    """
    Kunci Rate Limiting Cerdas:
    - Khusus endpoint login (/api/auth/login): Kunci berdasarkan IP dan username/nis target.
      Mencegah bypass limitasi login dengan menyertakan Authorization header sembarang (AUTH-BYPASS)
      serta mencegah DoS lockout massal terhadap siswa lain yang berbagi NAT IP sekolah.
    - Jika siswa/guru sudah login pada endpoint lain (membawa token JWT valid dan belum kedaluwarsa),
      gunakan user_id & role sebagai kunci.
    - Jika token expired, manipulatif, atau request unauthenticated (belum login), gunakan IP asli yang diverifikasi oleh ProxyFix.
    """
    if request.endpoint == 'auth.login' or request.path == '/api/auth/login':
        data = request.get_json(silent=True) or {}
        target_user = str(data.get('username') or data.get('nis') or '').strip().lower()[:40]
        return f"login:{get_remote_address()}:{target_user}"

    auth = request.headers.get("Authorization")
    if auth and auth.strip().startswith("Bearer "):
        token = auth.strip().split(" ")[1]
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
            uid = payload.get("user_id")
            role = payload.get("role", "user")
            if uid:
                return f"usr:{role}:{uid}"
        except Exception:
            pass

    return get_remote_address()

limiter = Limiter(
    get_smart_limiter_key,
    app=app,
    default_limits=["300 per minute"],
    storage_uri="memory://",
)
app.limiter = limiter  # Expose agar bisa diakses dari blueprint

# Registrasi Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(staf_bp)
app.register_blueprint(backup_bp)
app.register_blueprint(siswa_bp)
app.register_blueprint(biometrik_bp)
app.register_blueprint(presensi_bp)
app.register_blueprint(izin_bp)
app.register_blueprint(piket_bp)
app.register_blueprint(rekap_bp)
app.register_blueprint(pelanggaran_bp)
app.register_blueprint(pjj_bp)
app.register_blueprint(libur_bp)
app.register_blueprint(realtime_bp)

# Batasi percobaan login maksimal 10 per menit untuk mencegah brute-force kata sandi
if 'auth.login' in app.view_functions:
    limiter.limit("10 per minute")(app.view_functions['auth.login'])

# Bebaskan endpoint pulse realtime agar polling dashboard tidak terhambat
if 'realtime.get_pulse' in app.view_functions:
    limiter.exempt(app.view_functions['realtime.get_pulse'])

# Terapkan kuota rate limit presensi aman dari DoS namun lapang untuk jam sibuk
if 'presensi.verify_presensi' in app.view_functions:
    limiter.limit("60 per minute")(app.view_functions['presensi.verify_presensi'])
if 'presensi.sync_offline' in app.view_functions:
    limiter.limit("15 per minute")(app.view_functions['presensi.sync_offline'])
if 'presensi.verify_presensi_perpus' in app.view_functions:
    limiter.limit("30 per minute")(app.view_functions['presensi.verify_presensi_perpus'])

# Terapkan kuota rate limit terukur pada endpoint biometrik untuk mencegah DoS inferensi AI (BIO-03)
if 'biometrik.detect_liveness' in app.view_functions:
    limiter.limit("120 per minute")(app.view_functions['biometrik.detect_liveness'])
if 'biometrik.register_face' in app.view_functions:
    limiter.limit("20 per minute")(app.view_functions['biometrik.register_face'])

# CLI Command untuk inisialisasi basis data secara eksplisit
@app.cli.command("init-db")
def init_db_command():
    """Inisialisasi basis data PostgreSQL dan jalankan migrasi skema dinamis."""
    run_db_migrations(app)
    print("Inisialisasi basis data PostgreSQL dan migrasi selesai.")

# Inisialisasi basis data PostgreSQL & pastikan seluruh skema dan relasi siap
run_db_migrations(app)


# Middleware: Proteksi Dokumen Medis Sensitif & Tanda Tangan Digital (UU PDP No. 27/2022 & IDOR-02/03)
@app.before_request
def protect_sensitive_static_files():
    """
    Melindungi berkas surat izin dokter (/static/uploads/surat/) dan tanda tangan digital
    (/static/uploads/signatures/) dari akses langsung tanpa otorisasi sah dan verifikasi kepemilikan.
    Menolak token via query string '?token=' untuk mencegah kebocoran kredensial ke server log (AUTH-03).
    """
    norm_path = os.path.normpath(request.path).replace('\\', '/')
    if norm_path.startswith('/static/uploads/surat/') or norm_path.startswith('/static/uploads/signatures/'):
        auth = request.headers.get("Authorization")
        token = None
        if auth and auth.strip().startswith("Bearer "):
            token = auth.strip().split(" ")[1]
        elif request.args.get("token"):
            token = request.args.get("token").strip()

        if not token:
            return jsonify({
                "success": False,
                "message": "Akses langsung ke berkas sensitif memerlukan header Authorization Bearer yang sah atau parameter token."
            }), 401

        token = token.strip()
        try:
            import secrets
            from utils.auth_middleware import decode_token
            from models import Siswa, PengajuanIzin, User, PelanggaranSiswa, IzinPiket
            from utils.crypto_utils import decrypt_field
            payload = decode_token(token)
            role = str(payload.get("role", "")).lower()
            user_id = payload.get("user_id")
            session_token = payload.get("session_token")
            fname = os.path.basename(norm_path)

            if role in ["admin", "piket", "staf"]:
                user_obj = User.query.get(user_id)
                if not user_obj or not user_obj.active_session_token or not session_token or not secrets.compare_digest(str(session_token), str(user_obj.active_session_token)):
                    return jsonify({"success": False, "message": "Sesi tidak lagi aktif."}), 401
                return None

            if role == "siswa":
                siswa = Siswa.query.get(user_id)
                if not siswa or not siswa.active_session_token or not session_token or not secrets.compare_digest(str(session_token), str(siswa.active_session_token)):
                    return jsonify({"success": False, "message": "Sesi siswa tidak lagi aktif."}), 401

                if norm_path.startswith('/static/uploads/surat/'):
                    owned = PengajuanIzin.query.filter_by(
                        siswa_id=siswa.id,
                        surat_bukti=f"/static/uploads/surat/{fname}"
                    ).first()
                    if not owned:
                        return jsonify({"success": False, "message": "Akses ditolak: Anda bukan pemilik dokumen medis ini."}), 403
                elif norm_path.startswith('/static/uploads/signatures/'):
                    expected_sig_url = f"/static/uploads/signatures/{fname}"
                    owns_profile_sig = (decrypt_field(siswa.tanda_tangan) == expected_sig_url)
                    owns_other_sig = False
                    for pi in PengajuanIzin.query.filter_by(siswa_id=siswa.id).all():
                        if decrypt_field(pi.tanda_tangan_siswa) == expected_sig_url:
                            owns_other_sig = True
                            break
                    if not owns_other_sig:
                        for ps in PelanggaranSiswa.query.filter_by(siswa_id=siswa.id).all():
                            if decrypt_field(ps.tanda_tangan_siswa) == expected_sig_url:
                                owns_other_sig = True
                                break
                    if not (owns_profile_sig or owns_other_sig):
                        return jsonify({"success": False, "message": "Akses ditolak: Anda bukan pemilik tanda tangan digital ini."}), 403
                return None

            return jsonify({"success": False, "message": "Peran tidak memiliki otorisasi."}), 403
        except Exception:
            return jsonify({"success": False, "message": "Token otorisasi tidak valid atau kedaluwarsa."}), 401


# Server Start Time untuk pelacakan Uptime
SERVER_START_TIME = datetime.now()

@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Endpoint healthcheck komprehensif untuk memantau status operasional server:
    - Konektivitas ke basis data PostgreSQL (Supabase Pooler)
    - Kesiapan model biometrik wajah OpenCV (YuNet & SFace)
    - Waktu aktif (uptime) server
    """
    t0 = time_module.time()
    db_ok = False
    db_latency_ms = None
    db_error = None

    try:
        from sqlalchemy import text
        db.session.execute(text("SELECT 1")).scalar()
        db_latency_ms = round((time_module.time() - t0) * 1000, 2)
        db_ok = True
    except Exception as e:
        db_error = str(e)

    ai_ok = False
    try:
        from face_utils import get_detector, get_recognizer
        det = get_detector()
        rec = get_recognizer()
        ai_ok = bool(det is not None and rec is not None)
    except Exception:
        ai_ok = False

    uptime_sec = int((datetime.now() - SERVER_START_TIME).total_seconds())

    health_status = {
        "status": "healthy" if db_ok else "degraded",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "uptime_seconds": uptime_sec,
        "checks": {
            "database": {
                "status": "connected" if db_ok else "error",
                "latency_ms": db_latency_ms,
                "error": db_error
            },
            "biometric_ai": {
                "status": "ready" if ai_ok else "unavailable",
                "models": "OpenCV YuNet + SFace (ONNX)"
            }
        },
        "version": "1.0.0"
    }

    return jsonify(health_status), (200 if db_ok else 503)


# Middleware: Security Headers
@app.after_request
def set_security_headers(response):
    # 1. Cegah MIME-sniffing & Clickjacking
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    # Nonaktifkan XSS Auditor lawas yang rentan XS-Leaks; andalkan CSP modern
    response.headers['X-XSS-Protection'] = '0'

    # 2. Isolasi Cross-Origin & Proteksi Sensor Hardware (Kamera & GPS hanya untuk origin sekolah)
    response.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
    response.headers['Cross-Origin-Resource-Policy'] = 'same-origin'
    response.headers['Permissions-Policy'] = (
        "camera=(self), "
        "geolocation=(self), "
        "microphone=(), "
        "usb=(), "
        "payment=(), "
        "accelerometer=(), "
        "gyroscope=(), "
        "magnetometer=()"
    )

    # 3. Aktifkan HSTS jika koneksi berjalan di atas HTTPS (Reverse Proxy Nginx / Production)
    if request.is_secure or request.headers.get('X-Forwarded-Proto', '').lower() == 'https':
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'

    # 4. Content-Security-Policy (CSP):
    # Jangan timpa jika endpoint dokumen/lampiran sudah menyetel CSP ketat (misal "default-src 'none'")
    if 'Content-Security-Policy' not in response.headers:
        if request.path.startswith('/static/uploads/') or '/lampiran' in request.path or '/dokumen/' in request.path:
            # Sandbox ketat untuk semua berkas unggahan (gambar/PDF tidak boleh menjalankan script)
            response.headers['Content-Security-Policy'] = (
                "default-src 'none'; "
                "img-src 'self' data:; "
                "style-src 'unsafe-inline'; "
                "sandbox;"
            )
            response.headers['Content-Disposition'] = response.headers.get(
                'Content-Disposition', 'inline'
            )
        else:
            # CSP Utama Aplikasi PWA React/Vite (Tanpa 'unsafe-eval', mengunci object-src & base-uri)
            script_src = "'self' 'unsafe-inline'" if app.debug else "'self'"
            response.headers['Content-Security-Policy'] = (
                "default-src 'self'; "
                f"script-src {script_src}; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' data: https://fonts.gstatic.com; "
                "img-src 'self' data: blob:; "
                "media-src 'self' blob: mediastream:; "
                "connect-src 'self' https://*.supabase.co wss://*.supabase.co; "
                "worker-src 'self' blob:; "
                "manifest-src 'self'; "
                "object-src 'none'; "
                "base-uri 'self'; "
                "form-action 'self'; "
                "frame-ancestors 'self';"
            )
    return response


# Global JSON Error Handlers
@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "message": "Endpoint tidak ditemukan"}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"success": False, "message": "Metode HTTP tidak diizinkan"}), 405

@app.errorhandler(413)
def request_entity_too_large(e):
    return jsonify({
        "success": False,
        "message": "Ukuran data atau berkas melebihi batas maksimum 12MB."
    }), 413

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({
        "success": False,
        "error_code": "RATE_LIMIT_EXCEEDED",
        "message": f"Terlalu banyak permintaan ke server. Silakan tunggu beberapa saat ({e.description})."
    }), 429

@app.errorhandler(500)
def internal_error(e):
    try:
        db.session.rollback()
    except Exception:
        pass
    return jsonify({"success": False, "message": "Terjadi kesalahan internal server"}), 500


@app.teardown_request
def teardown_db_session(exception=None):
    """
    Menjamin pembersihan koneksi pool PostgreSQL jika terjadi unhandled exception
    sehingga tidak meninggalkan transaksi macet (InFailedSqlTransaction) di pooler.
    """
    if exception:
        try:
            db.session.rollback()
        except Exception:
            pass


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    run_db_migrations(app)
    try:
        from utils.backup_utils import start_auto_backup_scheduler
        start_auto_backup_scheduler()
    except Exception as e_sched:
        app.logger.warning(f"Gagal memulai auto-backup scheduler: {e_sched}")
    is_debug = os.environ.get('FLASK_DEBUG') == '1'
    app.run(debug=is_debug, host="0.0.0.0", port=int(os.environ.get('PORT', 5000)))
