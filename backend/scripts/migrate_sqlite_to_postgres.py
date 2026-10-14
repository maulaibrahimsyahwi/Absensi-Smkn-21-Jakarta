"""
Skrip Migrasi Penuh Data SMKN 21: SQLite (absensi.db) -> PostgreSQL
Menyalin seluruh tabel, menjaga Foreign Key integrity,
mereset PostgreSQL ID sequences, dan memvalidasi jumlah data.
"""

import os
import sys
import json
import sqlite3
from datetime import datetime, date, time

# Tambahkan direktori backend ke sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, BASE_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(BASE_DIR, '.env'))

# Path berkas SQLite sumber (jika masih ada berkas lama)
DATABASE_PATH = os.environ.get('SQLITE_DATABASE_PATH', os.path.join(BASE_DIR, 'absensi.db'))
import sqlalchemy as sa
from sqlalchemy.orm import sessionmaker
from models import (
    db,
    User,
    Siswa,
    AbsensiHarian,
    AbsensiPerpustakaan,
    PengajuanIzin,
    IzinPiket,
    PelanggaranSiswa,
    PengaturanPJJ,
    AuditLog,
    HariLibur,
    PengaturanJadwal
)

# Urutan tabel berdasarkan relasi dependensi (Parent -> Child)
TABLE_MODELS = [
    ("users", User),
    ("pengaturan_jadwal", PengaturanJadwal),
    ("pengaturan_pjj", PengaturanPJJ),
    ("hari_libur", HariLibur),
    ("audit_logs", AuditLog),
    ("siswa", Siswa),
    ("absensi_harian", AbsensiHarian),
    ("absensi_perpustakaan", AbsensiPerpustakaan),
    ("pengajuan_izin", PengajuanIzin),
    ("izin_piket", IzinPiket),
    ("pelanggaran_siswa", PelanggaranSiswa),
]


def normalize_postgres_url(url: str) -> str:
    url = url.strip()
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


def ensure_postgres_database(pg_url: str):
    """
    Memastikan database target di PostgreSQL sudah dibuat.
    Jika belum ada, coba buatkan secara otomatis via koneksi 'postgres'.
    """
    from urllib.parse import urlparse, urlunparse
    parsed = urlparse(pg_url)
    target_dbname = parsed.path.lstrip('/')
    
    if not target_dbname or target_dbname == 'postgres':
        return  # Menggunakan default db 'postgres'

    # Buat connection url sementara ke database 'postgres' default
    maintenance_url = urlunparse(parsed._replace(path='/postgres'))
    try:
        temp_engine = sa.create_engine(maintenance_url, isolation_level="AUTOCOMMIT")
        with temp_engine.connect() as conn:
            exists = conn.execute(
                sa.text(f"SELECT 1 FROM pg_database WHERE datname = :dbname"),
                {"dbname": target_dbname}
            ).fetchone()
            if not exists:
                print(f"[POSTGRES] Membuat database baru '{target_dbname}'...")
                conn.execute(sa.text(f'CREATE DATABASE "{target_dbname}";'))
                print(f"[POSTGRES] Database '{target_dbname}' berhasil dibuat!")
        temp_engine.dispose()
    except Exception as e:
        print(f"[INFO] Pengecekan database otomatis dilewati ({e}). Melanjutkan koneksi langsung...")


def migrate_data(target_pg_url: str):
    target_pg_url = normalize_postgres_url(target_pg_url)
    print("=================================================================")
    print("       MIGRASI PENUH BASIS DATA SMKN 21: SQLITE -> POSTGRESQL    ")
    print("=================================================================")
    print(f"[SOURCE] SQLite Path : {DATABASE_PATH}")
    print(f"[TARGET] PostgreSQL  : {target_pg_url.split('@')[-1] if '@' in target_pg_url else target_pg_url}")
    print("-----------------------------------------------------------------")

    if not os.path.exists(DATABASE_PATH):
        print(f"[ERROR] Berkas SQLite {DATABASE_PATH} tidak ditemukan!")
        return False

    # 1. Pastikan database target tersedia
    ensure_postgres_database(target_pg_url)

    # 2. Inisialisasi Engine & Koneksi PostgreSQL
    pg_engine = sa.create_engine(target_pg_url, pool_pre_ping=True)
    
    # 3. Buat skema tabel di PostgreSQL
    print("[POSTGRES] Membersihkan & membuat ulang seluruh tabel di PostgreSQL...")
    db.metadata.drop_all(pg_engine)
    db.metadata.create_all(pg_engine)
    print("[POSTGRES] Seluruh skema tabel siap di PostgreSQL.")

    # 4. Buka koneksi SQLite
    sqlite_conn = sqlite3.connect(DATABASE_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    PgSession = sessionmaker(bind=pg_engine)
    pg_session = PgSession()

    results = []

    try:
        for table_name, model_class in TABLE_MODELS:
            # Hitung data di SQLite
            sqlite_cur.execute(f"SELECT count(*) FROM {table_name}")
            sqlite_count = sqlite_cur.fetchone()[0]

            if sqlite_count == 0:
                results.append((table_name, 0, 0, "Kosong (Dilewati)"))
                continue

            # Ambil semua data baris dari SQLite
            sqlite_cur.execute(f"SELECT * FROM {table_name}")
            rows = sqlite_cur.fetchall()

            # Bersihkan data di PostgreSQL jika sudah ada data lama di tabel tsb
            pg_session.query(model_class).delete()
            pg_session.commit()

            # Mapping kolom model SQLAlchemy
            columns = [c.name for c in model_class.__table__.columns]
            
            inserted_count = 0
            for row in rows:
                row_dict = dict(row)
                data_to_insert = {}
                for col in columns:
                    if col in row_dict:
                        val = row_dict[col]
                        # Penyesuaian tipe data SQLite -> PostgreSQL
                        col_type = model_class.__table__.columns[col].type
                        
                        if isinstance(col_type, sa.Boolean) and val is not None:
                            val = bool(val)
                        elif isinstance(col_type, sa.DateTime) and isinstance(val, str) and val:
                            try:
                                val = datetime.fromisoformat(val.replace('Z', ''))
                            except Exception:
                                try:
                                    val = datetime.strptime(val, "%Y-%m-%d %H:%M:%S")
                                except Exception:
                                    pass
                        elif isinstance(col_type, sa.Date) and isinstance(val, str) and val:
                            try:
                                val = date.fromisoformat(val.split()[0])
                            except Exception:
                                pass
                        
                        data_to_insert[col] = val

                instance = model_class(**data_to_insert)
                pg_session.add(instance)
                inserted_count += 1

            pg_session.commit()

            # Reset sequence PostgreSQL untuk auto-increment ID
            if "id" in columns:
                try:
                    with pg_engine.connect() as conn:
                        conn.execute(sa.text(
                            f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), "
                            f"COALESCE((SELECT max(id) FROM {table_name}), 1));"
                        ))
                        conn.commit()
                except Exception as seq_err:
                    # Lewati jika bukan sequence standar
                    pass

            # Verifikasi jumlah data di Postgres
            pg_count = pg_session.query(model_class).count()
            status = "SEMPURNA" if pg_count == sqlite_count else f"SELISIH ({sqlite_count} -> {pg_count})"
            results.append((table_name, sqlite_count, pg_count, status))

        print("\n=================================================================")
        print("                 HASIL VERIFIKASI MIGRASI DATA                   ")
        print("=================================================================")
        print(f"{'Nama Tabel':<25} | {'SQLite':<8} | {'Postgres':<8} | {'Status'}")
        print("-" * 65)
        for tbl, sq_c, pg_c, st in results:
            print(f"{tbl:<25} | {sq_c:<8} | {pg_c:<8} | {st}")
        print("=================================================================")

        # 5. Otomatis perbarui file .env dengan DATABASE_URL baru
        env_path = os.path.join(BASE_DIR, '.env')
        env_lines = []
        if os.path.exists(env_path):
            with open(env_path, 'r', encoding='utf-8') as f:
                env_lines = f.readlines()

        has_db_url = False
        new_lines = []
        for line in env_lines:
            if line.strip().startswith('DATABASE_URL='):
                new_lines.append(f'DATABASE_URL={target_pg_url}\n')
                has_db_url = True
            else:
                new_lines.append(line)

        if not has_db_url:
            new_lines.append(f'\n# PostgreSQL Connection URL SMKN 21\nDATABASE_URL={target_pg_url}\n')

        with open(env_path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)

        print("\n[SUKSES] Konfigurasi DATABASE_URL di file .env berhasil diperbarui!")
        print("[SUKSES] Sistem Presensi SMKN 21 Jakarta kini resmi berjalan di PostgreSQL.")
        return True

    except Exception as e:
        pg_session.rollback()
        print(f"\n[ERROR MIGRASI] Terjadi kegagalan saat migrasi data: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        pg_session.close()
        sqlite_conn.close()
        pg_engine.dispose()


if __name__ == '__main__':
    url_arg = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('DATABASE_URL')
    if not url_arg:
        print("[INPUT DIBUTUHKAN] Masukkan connection string PostgreSQL.")
        print("Contoh: python migrate_sqlite_to_postgres.py postgresql://postgres:password@localhost:5432/absensi_smkn21")
        sys.exit(1)
    
    success = migrate_data(url_arg)
    sys.exit(0 if success else 1)
