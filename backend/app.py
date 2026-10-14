import os
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
    - Jika siswa/guru sudah login (membawa token JWT), gunakan user_id & role sebagai kunci.
      Ini memastikan setiap siswa memiliki kuota terpisah, meskipun 1000 siswa menggunakan
      Wi-Fi SMKN 21 yang sama (NAT Gateway berbagi 1 IP Publik).
    - Jika request unauthenticated (belum login), gunakan IP asli yang diverifikasi oleh ProxyFix.
    """
    auth = request.headers.get("Authorization")
    if auth and auth.strip().startswith("Bearer "):
        token = auth.strip().split(" ")[1]
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"], options={"verify_exp": False})
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

# Bebaskan endpoint presensi, biometrik, dan realtime agar tidak ada siswa terblokir di jam sibuk 06:15-06:30
limiter.exempt(biometrik_bp)
limiter.exempt(presensi_bp)
limiter.exempt(realtime_bp)

# CLI Command untuk inisialisasi basis data secara eksplisit
@app.cli.command("init-db")
def init_db_command():
    """Inisialisasi basis data PostgreSQL dan jalankan migrasi skema dinamis."""
    run_db_migrations(app)
    print("Inisialisasi basis data PostgreSQL dan migrasi selesai.")

# Inisialisasi basis data PostgreSQL & pastikan seluruh skema dan relasi siap
run_db_migrations(app)


# Middleware: Proteksi Dokumen Medis Sensitif (UU PDP No. 27/2022)
@app.before_request
def protect_medical_records():
    """
    Melindungi berkas surat izin / surat keterangan dokter dari akses langsung tanpa otorisasi (UU PDP).
    Mendukung otorisasi via Header 'Authorization: Bearer <token>' maupun query string '?token=<token>'
    agar tag <img> dan tautan tab baru dapat menampilkan dokumen secara aman dan terverifikasi.
    """
    if request.path.startswith('/static/uploads/surat/'):
        auth = request.headers.get("Authorization")
        token = None
        if auth and auth.strip().startswith("Bearer "):
            token = auth.strip().split(" ")[1]
        elif request.args.get("token"):
            token = request.args.get("token").strip()

        if not token:
            return jsonify({
                "success": False,
                "message": "Akses dokumen medis rahasia wajib menyertakan token otorisasi yang sah."
            }), 403
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
            role = payload.get("role")
            if not role:
                return jsonify({
                    "success": False,
                    "message": "Sesi token tidak memiliki kredensial peran yang sah."
                }), 403
        except Exception:
            return jsonify({
                "success": False,
                "message": "Sesi token tidak valid untuk mengakses dokumen medis ini."
            }), 403


# Middleware: Security Headers
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
    return jsonify({"success": False, "message": "Terjadi kesalahan internal server"}), 500


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    run_db_migrations(app)
    is_debug = os.environ.get('FLASK_DEBUG') == '1'
    app.run(debug=is_debug, host="0.0.0.0", port=int(os.environ.get('PORT', 5000)))
