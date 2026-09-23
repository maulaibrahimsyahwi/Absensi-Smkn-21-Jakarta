import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_compress import Compress
from sqlalchemy import event
from sqlalchemy.engine import Engine

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
from utils.db_migrations import run_db_migrations

# Inisialisasi Aplikasi Flask
app = Flask(__name__)

# Konfigurasi Database
app.config['SQLALCHEMY_DATABASE_URI'] = SQLALCHEMY_DATABASE_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = SQLALCHEMY_TRACK_MODIFICATIONS
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = SQLALCHEMY_ENGINE_OPTIONS

# Event Listener Concurrency SQLite: Mengaktifkan mode WAL dan 30s busy timeout per koneksi worker
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if 'sqlite' in app.config.get('SQLALCHEMY_DATABASE_URI', ''):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode = WAL;")
        cursor.execute("PRAGMA synchronous = NORMAL;")
        cursor.execute("PRAGMA busy_timeout = 30000;")  # 30 detik antrean lock
        cursor.execute("PRAGMA cache_size = -64000;")   # 64MB RAM cache
        cursor.execute("PRAGMA temp_store = MEMORY;")
        cursor.close()

# Inisialisasi Ekstensi
CORS(app, resources={r"/api/*": {"origins": "*"}, r"/static/*": {"origins": "*"}})
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
    - Jika request unauthenticated (belum login), gunakan IP asli dari X-Forwarded-For atau remote_addr.
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

    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
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

# Bebaskan endpoint presensi dan biometrik agar tidak ada siswa terblokir di jam sibuk 06:15-06:30
limiter.exempt(biometrik_bp)
limiter.exempt(presensi_bp)

# Inisialisasi basis data, migrasi kolom dinamis, dan akun staf default
run_db_migrations(app)


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

@app.errorhandler(500)
def internal_error(e):
    return jsonify({"success": False, "message": "Terjadi kesalahan internal server"}), 500


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host="0.0.0.0", port=5000)
