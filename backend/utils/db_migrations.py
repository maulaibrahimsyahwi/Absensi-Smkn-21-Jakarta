"""
Modul Inisialisasi & Migrasi Skema Basis Data SQLite SMKN 21.
Menangani pembuatan tabel otomatis, migrasi kolom dinamis, akun staf default,
serta sinkronisasi data awal.
"""

from werkzeug.security import generate_password_hash
from models import db, User


def apply_sqlite_pragmas(conn):
    """Mengaktifkan konfigurasi SQLite berkecepatan tinggi & anti-lock."""
    conn.execute(db.text("PRAGMA journal_mode=WAL;"))
    conn.execute(db.text("PRAGMA synchronous=NORMAL;"))
    conn.execute(db.text("PRAGMA busy_timeout=5000;"))
    conn.execute(db.text("PRAGMA cache_size=-64000;"))
    conn.commit()


def migrate_table_columns(conn):
    """Menambahkan kolom baru secara dinamis jika belum ada pada tabel SQLite."""
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
    if 'jenis_kelamin' not in col_siswa:
        conn.execute(db.text("ALTER TABLE siswa ADD COLUMN jenis_kelamin VARCHAR(20) DEFAULT 'Laki-laki'"))
    conn.commit()

    # Isi tanggal_lulus otomatis untuk alumni lama yang belum memiliki tanggal
    conn.execute(db.text(
        "UPDATE siswa SET tanggal_lulus = CURRENT_TIMESTAMP "
        "WHERE status = 'Alumni' AND (tanggal_lulus IS NULL OR tanggal_lulus = '')"
    ))
    conn.commit()

    # 2. Cek kolom di tabel users (staf)
    res_users = conn.execute(db.text("PRAGMA table_info(users)")).fetchall()
    col_users = [row[1] for row in res_users]
    if 'foto_profil' not in col_users:
        conn.execute(db.text("ALTER TABLE users ADD COLUMN foto_profil TEXT"))
    conn.commit()

    # 3. Cek kolom di tabel izin_piket
    res_piket = conn.execute(db.text("PRAGMA table_info(izin_piket)")).fetchall()
    col_piket = [row[1] for row in res_piket]
    if 'tanda_tangan_petugas' not in col_piket:
        conn.execute(db.text("ALTER TABLE izin_piket ADD COLUMN tanda_tangan_petugas TEXT"))
    if 'tanda_tangan_siswa' not in col_piket:
        conn.execute(db.text("ALTER TABLE izin_piket ADD COLUMN tanda_tangan_siswa TEXT"))
    conn.commit()

    # 4. Cek kolom di tabel pengajuan_izin
    res_izin = conn.execute(db.text("PRAGMA table_info(pengajuan_izin)")).fetchall()
    col_izin = [row[1] for row in res_izin]
    if 'tanda_tangan_siswa' not in col_izin:
        conn.execute(db.text("ALTER TABLE pengajuan_izin ADD COLUMN tanda_tangan_siswa TEXT"))
    conn.commit()


def seed_default_staff():
    """Inisialisasi akun staf default (Admin & Guru Piket) dengan hash scrypt aman."""
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


def sync_legacy_data():
    """Sinkronisasi otomatis catatan keterlambatan presensi harian ke Buku Pelanggaran."""
    try:
        from routes.pelanggaran_routes import sync_terlambat_ke_pelanggaran
        synced_count = sync_terlambat_ke_pelanggaran()
        if synced_count > 0:
            print(f"[SYNC] {synced_count} catatan keterlambatan lama berhasil disinkronkan ke Buku Saku Pelanggaran.")
    except Exception as e_sync:
        print(f"[SYNC WARNING] Kendala sinkronisasi keterlambatan: {e_sync}")


def run_db_migrations(app):
    """
    Menjalankan seluruh tahapan migrasi dan inisialisasi basis data secara terstruktur.
    """
    with app.app_context():
        db.create_all()
        try:
            with db.engine.connect() as conn:
                apply_sqlite_pragmas(conn)
                migrate_table_columns(conn)

            seed_default_staff()
            sync_legacy_data()
        except Exception as e:
            print(f"[MIGRATION WARNING] Kendala inisialisasi/migrasi: {e}")

