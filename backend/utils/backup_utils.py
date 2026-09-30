import os
import sqlite3
import glob
from datetime import datetime
from config import BASE_DIR, DATABASE_PATH

BACKUP_DIR = os.path.join(BASE_DIR, 'backups')
os.makedirs(BACKUP_DIR, exist_ok=True)

def create_db_backup(max_keep=30):
    """
    Membuat cadangan database SQLite secara aman menggunakan SQLite Online Backup API.
    Aman dijalankan saat mode WAL dan transaksi absensi sedang berjalan (non-blocking).
    
    :param max_keep: Jumlah cadangan maksimal yang dipertahankan (rotasi otomatis 30 hari)
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


_scheduler_started = False

def start_auto_backup_scheduler():
    """
    Menjalankan scheduler cadangan otomatis (Disaster Recovery) di background thread.
    Secara berkala memicu cadangan database otomatis jika belum dibuat hari ini (retensi 30 hari).
    """
    import threading
    import time
    global _scheduler_started
    if _scheduler_started:
        return
    _scheduler_started = True

    def _worker():
        # Beri jeda 10 detik saat startup aplikasi sebelum evaluasi pertama
        time.sleep(10)
        while True:
            try:
                backups = list_db_backups().get('backups', [])
                need_backup = True
                if backups:
                    latest = backups[0]
                    latest_dt = datetime.strptime(latest['created_at'], "%Y-%m-%d %H:%M:%S")
                    if (datetime.now() - latest_dt).total_seconds() < 20 * 3600:
                        need_backup = False

                if need_backup:
                    print("[AUTO BACKUP] Memulai pembuatan cadangan otomatis database SMKN 21...")
                    res = create_db_backup(max_keep=30)
                    print(f"[AUTO BACKUP] Selesai: {res.get('message')}")
            except Exception as e:
                print(f"[AUTO BACKUP ERROR] Kendala background scheduler: {e}")

            time.sleep(3600)

    t = threading.Thread(target=_worker, daemon=True)
    t.start()

