"""
Script Migrasi Database: SQLite ke PostgreSQL
SMKN 21 Jakarta - Sistem Presensi & Kedisiplinan

Cara Penggunaan:
1. Pastikan PostgreSQL server aktif dan database target sudah dibuat (misal: createdb absensi_smkn21)
2. Install driver PostgreSQL jika belum ada:
   pip install psycopg2-binary
3. Jalankan script dengan argumen URL PostgreSQL target:
   python backend/scripts/migrate_to_postgres.py postgresql://postgres:password@localhost:5432/absensi_smkn21
   atau atur environment variable TARGET_DATABASE_URL
"""

import os
import sys
from datetime import datetime
from sqlalchemy import create_engine, MetaData, Table, select, func

# Tambahkan direktori root backend ke sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from models import db
from app import app

def run_migration(target_db_url):
    print("=" * 65)
    print("MIGRASI DATA: SQLITE -> POSTGRESQL (SMKN 21 JAKARTA)")
    print("=" * 65)
    print(f"Target DB: {target_db_url}")

    with app.app_context():
        sqlite_engine = db.engine
        print(f"Source DB: {sqlite_engine.url}")

        target_engine = create_engine(target_db_url)

        # 1. Buat seluruh tabel di database PostgreSQL target sesuai model SQLAlchemy
        print("\n[1/3] Membuat struktur tabel pada PostgreSQL...")
        try:
            db.metadata.create_all(bind=target_engine)
            print("  --> Struktur tabel berhasil dibuat di PostgreSQL.")
        except Exception as e:
            print(f"  [ERROR] Gagal membuat tabel di PostgreSQL: {e}")
            return False

        # Urutan tabel yang aman dari foreign key dependency
        table_order = [
            "users",
            "siswa",
            "pengaturan_pjj",
            "pengaturan_jadwal",
            "absensi_harian",
            "absensi_perpustakaan",
            "pengajuan_izin",
            "izin_piket",
            "pelanggaran_siswa"
        ]

        src_meta = MetaData()
        src_meta.reflect(bind=sqlite_engine)

        target_meta = MetaData()
        target_meta.reflect(bind=target_engine)

        print("\n[2/3] Menyalin data per tabel...")
        total_rows_migrated = 0

        with sqlite_engine.connect() as src_conn, target_engine.connect() as tgt_conn:
            for tbl_name in table_order:
                if tbl_name not in src_meta.tables:
                    print(f"  - Tabel '{tbl_name}' tidak ditemukan di SQLite sumber. Dilewati.")
                    continue

                src_tbl = src_meta.tables[tbl_name]
                tgt_tbl = target_meta.tables.get(tbl_name)

                if tgt_tbl is None:
                    print(f"  - Tabel '{tbl_name}' tidak ditemukan di PostgreSQL target. Dilewati.")
                    continue

                # Baca semua baris dari SQLite
                rows = src_conn.execute(select(src_tbl)).mappings().all()
                count = len(rows)

                if count == 0:
                    print(f"  - Tabel '{tbl_name}': 0 baris (kosong).")
                    continue

                print(f"  - Menyalin tabel '{tbl_name}' ({count} baris)...", end="", flush=True)

                # Siapkan batch insert
                row_dicts = [dict(r) for r in rows]

                # Bersihkan tabel target jika ada data sisa
                tgt_conn.execute(tgt_tbl.delete())
                tgt_conn.execute(tgt_tbl.insert(), row_dicts)
                tgt_conn.commit()

                print(" [OK]")
                total_rows_migrated += count

        # 3. Reset Postgres serial sequence ID untuk auto-increment
        print("\n[3/3] Menyesuaikan sequence ID auto-increment PostgreSQL...")
        with target_engine.connect() as tgt_conn:
            for tbl_name in table_order:
                try:
                    seq_query = f"""
                    SELECT setval(pg_get_serial_sequence('{tbl_name}', 'id'), 
                                  COALESCE((SELECT MAX(id) FROM {tbl_name}), 1), 
                                  true);
                    """
                    tgt_conn.execute(db.text(seq_query))
                    tgt_conn.commit()
                except Exception:
                    # Lewati jika tabel tidak memiliki sequence 'id'
                    pass

        print("  --> Sequence auto-increment disesuaikan.")
        print("\n" + "=" * 65)
        print(f"MIGRASI SUKSES! Total {total_rows_migrated} data baris berhasil dipindahkan.")
        print("Untuk mengaktifkan PostgreSQL di aplikasi:")
        print("Atur environment variable di .env backend:")
        print(f"DATABASE_URL={target_db_url}")
        print("=" * 65)
        return True

if __name__ == "__main__":
    target_url = None
    if len(sys.path) > 1 and len(sys.argv) > 1:
        target_url = sys.argv[1]
    else:
        target_url = os.environ.get("TARGET_DATABASE_URL")

    if not target_url:
        print("Harap berikan target PostgreSQL URL:")
        print("Contoh:")
        print("  python backend/scripts/migrate_to_postgres.py postgresql://postgres:password@localhost:5432/absensi_smkn21")
        sys.exit(1)

    success = run_migration(target_url)
    sys.exit(0 if success else 1)
