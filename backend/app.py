import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_compress import Compress

from config import SQLALCHEMY_DATABASE_URI, SQLALCHEMY_TRACK_MODIFICATIONS, CORS_ORIGINS
from models import db

# Import Modular Blueprints
from routes.siswa_routes import siswa_bp
from routes.biometrik_routes import biometrik_bp
from routes.presensi_routes import presensi_bp
from routes.izin_routes import izin_bp
from routes.piket_routes import piket_bp
from routes.rekap_routes import rekap_bp

# Inisialisasi Aplikasi Flask
app = Flask(__name__)

# Konfigurasi Database
app.config['SQLALCHEMY_DATABASE_URI'] = SQLALCHEMY_DATABASE_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = SQLALCHEMY_TRACK_MODIFICATIONS

# Inisialisasi Ekstensi
CORS(app, origins=CORS_ORIGINS)
Compress(app)
db.init_app(app)

# Registrasi Blueprints
app.register_blueprint(siswa_bp)
app.register_blueprint(biometrik_bp)
app.register_blueprint(presensi_bp)
app.register_blueprint(izin_bp)
app.register_blueprint(piket_bp)
app.register_blueprint(rekap_bp)


def check_and_migrate_db():
    """
    Memastikan seluruh tabel dibuat dan memeriksa migrasi kolom status siswa pada SQLite.
    """
    with app.app_context():
        db.create_all()
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
    app.run(debug=True, port=5000)
