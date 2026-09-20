import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_compress import Compress

from config import SQLALCHEMY_DATABASE_URI, SQLALCHEMY_TRACK_MODIFICATIONS, CORS_ORIGINS
from models import db, User

# Import Modular Blueprints
from routes.auth_routes import auth_bp
from routes.siswa_routes import siswa_bp
from routes.biometrik_routes import biometrik_bp
from routes.presensi_routes import presensi_bp
from routes.izin_routes import izin_bp
from routes.piket_routes import piket_bp
from routes.rekap_routes import rekap_bp
from routes.pelanggaran_routes import pelanggaran_bp
from routes.pjj_routes import pjj_bp

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
app.register_blueprint(auth_bp)
app.register_blueprint(siswa_bp)
app.register_blueprint(biometrik_bp)
app.register_blueprint(presensi_bp)
app.register_blueprint(izin_bp)
app.register_blueprint(piket_bp)
app.register_blueprint(rekap_bp)
app.register_blueprint(pelanggaran_bp)
app.register_blueprint(pjj_bp)


def check_and_migrate_db():
    """
    Memastikan seluruh tabel dibuat, kolom baru dimigrasi pada SQLite,
    dan akun default staf (Admin & Guru Piket) tersedia.
    """
    with app.app_context():
        db.create_all()
        try:
            with db.engine.connect() as conn:
                # 1. Cek kolom di tabel siswa
                res_siswa = conn.execute(db.text("PRAGMA table_info(siswa)")).fetchall()
                col_siswa = [row[1] for row in res_siswa]
                if 'status' not in col_siswa:
                    conn.execute(db.text("ALTER TABLE siswa ADD COLUMN status VARCHAR(20) DEFAULT 'Aktif'"))
                if 'password' not in col_siswa:
                    conn.execute(db.text("ALTER TABLE siswa ADD COLUMN password VARCHAR(100)"))
                if 'tanda_tangan' not in col_siswa:
                    conn.execute(db.text("ALTER TABLE siswa ADD COLUMN tanda_tangan TEXT"))
                if 'foto_profil' not in col_siswa:
                    conn.execute(db.text("ALTER TABLE siswa ADD COLUMN foto_profil TEXT"))
                if 'tanggal_lulus' not in col_siswa:
                    conn.execute(db.text("ALTER TABLE siswa ADD COLUMN tanggal_lulus DATETIME"))
                conn.commit()

                # Isi tanggal_lulus otomatis untuk alumni lama yang belum memiliki tanggal
                conn.execute(db.text("UPDATE siswa SET tanggal_lulus = CURRENT_TIMESTAMP WHERE status = 'Alumni' AND (tanggal_lulus IS NULL OR tanggal_lulus = '')"))
                conn.commit()

                # 2. Cek kolom di tabel users (staf)
                res_users = conn.execute(db.text("PRAGMA table_info(users)")).fetchall()
                col_users = [row[1] for row in res_users]
                if 'foto_profil' not in col_users:
                    conn.execute(db.text("ALTER TABLE users ADD COLUMN foto_profil TEXT"))

                # 3. Cek kolom di tabel izin_piket
                res_piket = conn.execute(db.text("PRAGMA table_info(izin_piket)")).fetchall()
                col_piket = [row[1] for row in res_piket]
                if 'tanda_tangan_petugas' not in col_piket:
                    conn.execute(db.text("ALTER TABLE izin_piket ADD COLUMN tanda_tangan_petugas TEXT"))
                if 'tanda_tangan_siswa' not in col_piket:
                    conn.execute(db.text("ALTER TABLE izin_piket ADD COLUMN tanda_tangan_siswa TEXT"))

                # 4. Cek kolom di tabel pengajuan_izin
                res_izin = conn.execute(db.text("PRAGMA table_info(pengajuan_izin)")).fetchall()
                col_izin = [row[1] for row in res_izin]
                if 'tanda_tangan_siswa' not in col_izin:
                    conn.execute(db.text("ALTER TABLE pengajuan_izin ADD COLUMN tanda_tangan_siswa TEXT"))

                conn.commit()

            # 4. Inisialisasi Akun Staf Default (Admin & Guru Piket) dengan password ter-hash aman
            from werkzeug.security import generate_password_hash
            if not User.query.filter_by(username='admin').first():
                admin_user = User(
                    username='admin',
                    password=generate_password_hash('admin123', method='scrypt'),
                    nama='Administrator SMKN 21',
                    role='admin'
                )
                db.session.add(admin_user)

            if not User.query.filter_by(username='piket').first():
                piket_user = User(
                    username='piket',
                    password=generate_password_hash('piket123', method='scrypt'),
                    nama='Guru Piket SMKN 21',
                    role='piket'
                )
                db.session.add(piket_user)

            db.session.commit()
            print("[INIT] Database, skema multi-peran, dan akun staf default siap.")

            # Sinkronisasi otomatis catatan keterlambatan yang ada di absensi_harian ke Buku Saku Pelanggaran
            try:
                from routes.pelanggaran_routes import sync_terlambat_ke_pelanggaran
                synced_count = sync_terlambat_ke_pelanggaran()
                if synced_count > 0:
                    print(f"[SYNC] {synced_count} catatan keterlambatan lama berhasil disinkronkan ke Buku Saku Pelanggaran.")
            except Exception as e_sync:
                print(f"[SYNC WARNING] Kendala sinkronisasi keterlambatan: {e_sync}")
        except Exception as e:
            print(f"[MIGRATION WARNING] Kendala inisialisasi/migrasi: {e}")

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
