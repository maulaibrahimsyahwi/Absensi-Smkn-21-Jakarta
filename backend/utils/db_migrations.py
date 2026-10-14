"""
Modul Inisialisasi & Migrasi Skema Basis Data PostgreSQL SMKN 21 Jakarta.
Menangani pembuatan tabel otomatis, migrasi kolom dinamis berstandar PostgreSQL,
akun staf default, serta sinkronisasi data awal.
"""

from werkzeug.security import generate_password_hash
from models import db, User


def migrate_postgres_columns(conn):
    """Menambahkan kolom baru secara dinamis untuk basis data PostgreSQL jika belum ada."""
    pg_commands = [
        # Siswa
        "ALTER TABLE siswa ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Aktif';",
        "ALTER TABLE siswa ADD COLUMN IF NOT EXISTS password VARCHAR(255);",
        "ALTER TABLE siswa ALTER COLUMN password TYPE VARCHAR(255);",
        "ALTER TABLE siswa ADD COLUMN IF NOT EXISTS tanda_tangan TEXT;",
        "ALTER TABLE siswa ADD COLUMN IF NOT EXISTS foto_profil TEXT;",
        "ALTER TABLE siswa ADD COLUMN IF NOT EXISTS tanggal_lulus TIMESTAMP;",
        "ALTER TABLE siswa ADD COLUMN IF NOT EXISTS jenis_kelamin VARCHAR(20) DEFAULT 'Laki-laki';",
        "ALTER TABLE siswa ADD COLUMN IF NOT EXISTS active_session_token VARCHAR(128);",
        "ALTER TABLE siswa ALTER COLUMN active_session_token TYPE VARCHAR(128);",
        "ALTER TABLE siswa ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE siswa ADD COLUMN IF NOT EXISTS nisn VARCHAR(20);",
        "ALTER TABLE siswa ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE siswa ADD COLUMN IF NOT EXISTS medical_exemption_until DATE;",
        "ALTER TABLE siswa ADD COLUMN IF NOT EXISTS medical_exemption_alasan VARCHAR(255);",
        "ALTER TABLE siswa ADD COLUMN IF NOT EXISTS last_totp_step BIGINT;",
        "ALTER TABLE siswa ALTER COLUMN two_factor_secret TYPE TEXT;",
        # Users
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS foto_profil TEXT;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS active_session_token VARCHAR(128);",
        "ALTER TABLE users ALTER COLUMN active_session_token TYPE VARCHAR(128);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_totp_step BIGINT;",
        "ALTER TABLE users ALTER COLUMN two_factor_secret TYPE TEXT;",
        # Izin Piket
        "ALTER TABLE izin_piket ADD COLUMN IF NOT EXISTS kelas VARCHAR(50);",
        "ALTER TABLE izin_piket ADD COLUMN IF NOT EXISTS tanda_tangan_petugas TEXT;",
        "ALTER TABLE izin_piket ADD COLUMN IF NOT EXISTS tanda_tangan_siswa TEXT;",
        # Pengajuan Izin
        "ALTER TABLE pengajuan_izin ADD COLUMN IF NOT EXISTS kelas VARCHAR(50);",
        "ALTER TABLE pengajuan_izin ADD COLUMN IF NOT EXISTS tanda_tangan_siswa TEXT;",
        # Pelanggaran Siswa
        "ALTER TABLE pelanggaran_siswa ADD COLUMN IF NOT EXISTS status_verifikasi VARCHAR(30) DEFAULT 'Disetujui';",
        "ALTER TABLE pelanggaran_siswa ADD COLUMN IF NOT EXISTS kategori VARCHAR(20) DEFAULT 'Pelanggaran';",
        "ALTER TABLE pelanggaran_siswa ADD COLUMN IF NOT EXISTS tahun_ajaran VARCHAR(20) DEFAULT '2026/2027';",
        "ALTER TABLE pelanggaran_siswa ADD COLUMN IF NOT EXISTS semester VARCHAR(10) DEFAULT 'Ganjil';",
        # Absensi Harian
        "ALTER TABLE absensi_harian ADD COLUMN IF NOT EXISTS kelas VARCHAR(50);",
        "ALTER TABLE absensi_harian ADD COLUMN IF NOT EXISTS device_id VARCHAR(64);",
        "ALTER TABLE absensi_harian ADD COLUMN IF NOT EXISTS is_flagged_proxy BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE absensi_harian ADD COLUMN IF NOT EXISTS proxy_note VARCHAR(255);",
        "ALTER TABLE absensi_harian ADD COLUMN IF NOT EXISTS tahun_ajaran VARCHAR(20) DEFAULT '2026/2027';",
        "ALTER TABLE absensi_harian ADD COLUMN IF NOT EXISTS semester VARCHAR(10) DEFAULT 'Ganjil';",
        "ALTER TABLE absensi_harian ADD COLUMN IF NOT EXISTS latitude FLOAT;",
        "ALTER TABLE absensi_harian ADD COLUMN IF NOT EXISTS longitude FLOAT;",
        "ALTER TABLE absensi_harian ADD COLUMN IF NOT EXISTS sumber VARCHAR(20) DEFAULT 'online';",
        # Absensi Perpustakaan
        "ALTER TABLE absensi_perpustakaan ADD COLUMN IF NOT EXISTS kelas VARCHAR(50);",
        # Pengaturan Jadwal
        "ALTER TABLE pengaturan_jadwal ADD COLUMN IF NOT EXISTS tahun_ajaran VARCHAR(20) DEFAULT '2026/2027';",
        "ALTER TABLE pengaturan_jadwal ADD COLUMN IF NOT EXISTS semester VARCHAR(10) DEFAULT 'Ganjil';",
        # Backfill snapshot kelas jika masih NULL
        "UPDATE absensi_harian ah SET kelas = s.kelas FROM siswa s WHERE ah.siswa_id = s.id AND (ah.kelas IS NULL OR ah.kelas = '');",
        "UPDATE absensi_perpustakaan ap SET kelas = s.kelas FROM siswa s WHERE ap.siswa_id = s.id AND (ap.kelas IS NULL OR ap.kelas = '');",
        "UPDATE pengajuan_izin pi SET kelas = s.kelas FROM siswa s WHERE pi.siswa_id = s.id AND (pi.kelas IS NULL OR pi.kelas = '');",
        "UPDATE izin_piket ip SET kelas = s.kelas FROM siswa s WHERE ip.siswa_id = s.id AND (ip.kelas IS NULL OR ip.kelas = '');",
        # Anti-Duplikasi Presensi: Hapus duplikat harian lama lalu pasang Unique Index
        "DELETE FROM absensi_harian a USING absensi_harian b WHERE a.id > b.id AND a.siswa_id = b.siswa_id AND CAST(a.waktu AS DATE) = CAST(b.waktu AS DATE);",
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_absensi_harian_siswa_tanggal ON absensi_harian (siswa_id, (CAST(waktu AS DATE)));",
    ]
    for cmd in pg_commands:
        try:
            conn.execute(db.text(cmd))
        except Exception as e:
            print(f"[PG MIGRATION] Notice on '{cmd}': {e}")
    conn.commit()


def seed_default_staff():
    """Inisialisasi akun admin default secara aman dengan hash scrypt dan bendera must_change_password."""
    import os
    from utils.passwords import generate_initial_password

    if not User.query.filter_by(username='admin').first():
        init_pass = os.environ.get('INITIAL_ADMIN_PASSWORD') or generate_initial_password(length=12)
        admin_user = User(
            username='admin',
            password=generate_password_hash(init_pass, method='scrypt'),
            nama='Administrator SMKN 21',
            role='admin',
            must_change_password=True
        )
        db.session.add(admin_user)
        db.session.commit()
        print(f"[SECURITY ALERT] Akun admin baru dibuat dengan username: admin, password: {init_pass}")
        print("[SECURITY ALERT] Wajib segera login dan ganti password!")
    else:
        print("[INIT] Database PostgreSQL dan akun staf siap.")


def seed_default_schedule():
    """Inisialisasi konfigurasi jam operasional sekolah jika belum ada."""
    try:
        from models import PengaturanJadwal
        if not PengaturanJadwal.query.first():
            jadwal = PengaturanJadwal(
                jam_mulai_masuk="05:00:00",
                jam_batas_masuk="06:30:00",
                jam_batas_jumat="06:30:00",
                mode_darurat_jaringan=False,
                toleransi_darurat_menit=15,
                keterangan="Jadwal Normal SMKN 21 Jakarta",
                updated_by="Sistem"
            )
            db.session.add(jadwal)
            db.session.commit()
            print("[INIT] Pengaturan jadwal operasional default berhasil diinisiasi di PostgreSQL.")
    except Exception as e:
        print(f"[INIT WARNING] Gagal inisiasi jadwal default: {e}")


def sync_legacy_data():
    """Sinkronisasi otomatis catatan keterlambatan presensi harian ke Buku Pelanggaran."""
    try:
        from routes.pelanggaran_routes import sync_terlambat_ke_pelanggaran
        synced_count = sync_terlambat_ke_pelanggaran()
        if synced_count > 0:
            print(f"[SYNC] {synced_count} catatan keterlambatan berhasil disinkronkan ke Buku Saku Pelanggaran.")
    except Exception as e_sync:
        print(f"[SYNC WARNING] Kendala sinkronisasi keterlambatan: {e_sync}")


def migrate_encrypt_sensitive_data():
    """
    Kepatuhan UU PDP No. 27/2022 Pasal 35:
    Mengenkripsi rekaman data biometrik (face_encoding), kunci TOTP (two_factor_secret),
    dan tanda tangan digital yang masih tersimpan dalam format teks biasa (plaintext) di PostgreSQL.
    """
    try:
        from utils.crypto_utils import encrypt_field, CIPHER_PREFIX
        from models import Siswa, User

        updated_siswa = 0
        siswa_list = Siswa.query.filter(
            (Siswa.face_encoding != None) |
            (Siswa.two_factor_secret != None) |
            (Siswa.tanda_tangan != None)
        ).all()
        for s in siswa_list:
            changed = False
            if s.face_encoding and not s.face_encoding.startswith(CIPHER_PREFIX):
                s.face_encoding = encrypt_field(s.face_encoding)
                changed = True
            if s.two_factor_secret and not s.two_factor_secret.startswith(CIPHER_PREFIX):
                s.two_factor_secret = encrypt_field(s.two_factor_secret)
                changed = True
            if s.tanda_tangan and not s.tanda_tangan.startswith(CIPHER_PREFIX):
                s.tanda_tangan = encrypt_field(s.tanda_tangan)
                changed = True
            if changed:
                updated_siswa += 1

        updated_users = 0
        user_list = User.query.filter(
            (User.two_factor_secret != None) |
            (User.tanda_tangan != None)
        ).all()
        for u in user_list:
            changed = False
            if u.two_factor_secret and not u.two_factor_secret.startswith(CIPHER_PREFIX):
                u.two_factor_secret = encrypt_field(u.two_factor_secret)
                changed = True
            if u.tanda_tangan and not u.tanda_tangan.startswith(CIPHER_PREFIX):
                u.tanda_tangan = encrypt_field(u.tanda_tangan)
                changed = True
            if changed:
                updated_users += 1

        if updated_siswa > 0 or updated_users > 0:
            db.session.commit()
            print(f"[SECURITY ENCRYPTION] Berhasil mengamankan data sensitif at-rest: {updated_siswa} siswa, {updated_users} staf.")
    except Exception as e_crypto:
        db.session.rollback()
        print(f"[SECURITY WARNING] Kendala migrasi enkripsi at-rest: {e_crypto}")


def run_db_migrations(app):
    """
    Menjalankan seluruh tahapan migrasi dan inisialisasi basis data PostgreSQL secara terstruktur.
    """
    with app.app_context():
        try:
            db.create_all()
            with db.engine.connect() as conn:
                migrate_postgres_columns(conn)

            seed_default_staff()
            seed_default_schedule()
            sync_legacy_data()
            migrate_encrypt_sensitive_data()
        except Exception as e:
            print(f"[MIGRATION WARNING] Kendala inisialisasi/migrasi PostgreSQL: {e}")
