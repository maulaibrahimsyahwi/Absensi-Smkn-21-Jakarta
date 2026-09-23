import os
import sqlite3
import glob
from datetime import datetime
from config import BASE_DIR, DATABASE_PATH

BACKUP_DIR = os.path.join(BASE_DIR, 'backups')
os.makedirs(BACKUP_DIR, exist_ok=True)

def create_db_backup(max_keep=7):
    """
    Membuat cadangan database SQLite secara aman menggunakan SQLite Online Backup API.
    Aman dijalankan saat mode WAL dan transaksi absensi sedang berjalan (non-blocking).
    
    :param max_keep: Jumlah cadangan maksimal yang dipertahankan (rotasi otomatis)
    :return: dict status keberhasilan, path berkas, ukuran, dan timestamp
    """
    if not os.path.exists(DATABASE_PATH):
        return {
            "success": False,
            "message": f"Database file tidak ditemukan di {DATABASE_PATH}"
        }

    try:
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"absensi_backup_{timestamp_str}.db"
        backup_filepath = os.path.join(BACKUP_DIR, backup_filename)

        # Gunakan native sqlite3 backup API untuk transaksi atomik tanpa lock
        source_conn = sqlite3.connect(DATABASE_PATH)
        dest_conn = sqlite3.connect(backup_filepath)

        with dest_conn:
            source_conn.backup(dest_conn, pages=100)

        dest_conn.close()
        source_conn.close()

        file_size_kb = round(os.path.getsize(backup_filepath) / 1024, 2)

        # Rotasi otomatis: Hapus cadangan lama yang melebihi max_keep
        all_backups = sorted(
            glob.glob(os.path.join(BACKUP_DIR, "absensi_backup_*.db")),
            key=os.path.getmtime,
            reverse=True
        )

        deleted_count = 0
        if len(all_backups) > max_keep:
            for old_backup in all_backups[max_keep:]:
                try:
                    os.remove(old_backup)
                    deleted_count += 1
                except Exception:
                    pass

        return {
            "success": True,
            "filename": backup_filename,
            "filepath": backup_filepath,
            "size_kb": file_size_kb,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_backups": min(len(all_backups), max_keep),
            "rotated_old_backups": deleted_count,
            "message": f"Cadangan database berhasil dibuat ({file_size_kb} KB)."
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Gagal membuat cadangan database: {str(e)}"
        }

def list_db_backups():
    """
    Mengambil daftar seluruh berkas cadangan database yang tersedia beserta ukurannya.
    """
    try:
        all_backups = sorted(
            glob.glob(os.path.join(BACKUP_DIR, "absensi_backup_*.db")),
            key=os.path.getmtime,
            reverse=True
        )
        items = []
        for bp in all_backups:
            items.append({
                "filename": os.path.basename(bp),
                "size_kb": round(os.path.getsize(bp) / 1024, 2),
                "created_at": datetime.fromtimestamp(os.path.getmtime(bp)).strftime("%Y-%m-%d %H:%M:%S")
            })
        return {
            "success": True,
            "count": len(items),
            "backups": items
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Gagal membaca riwayat cadangan: {str(e)}",
            "backups": []
        }

