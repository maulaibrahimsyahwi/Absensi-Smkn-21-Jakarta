import os
import json
import glob
from datetime import datetime
from config import BASE_DIR

BACKUP_DIR = os.path.join(BASE_DIR, 'backups')
os.makedirs(BACKUP_DIR, exist_ok=True)


def _serialize_model_instance(obj):
    """Konversi satu baris model SQLAlchemy menjadi dictionary serializable lengkap."""
    row_data = {}
    for c in obj.__table__.columns:
        val = getattr(obj, c.name)
        if hasattr(val, 'isoformat'):
            row_data[c.name] = val.isoformat()
        else:
            row_data[c.name] = val
    return row_data


def create_db_backup(max_keep=30):
    """
    Membuat snapshot cadangan basis data PostgreSQL secara aman (Disaster Recovery).
    Mengekstrak seluruh tabel inti ke dalam berkas JSON terstruktur non-blocking.
    
    :param max_keep: Jumlah cadangan maksimal yang dipertahankan (rotasi otomatis 30 hari)
    :return: dict status keberhasilan, path berkas, ukuran, dan timestamp
    """
    try:
        from models import (
            User, Siswa, AbsensiHarian, AbsensiPerpustakaan,
            PengajuanIzin, IzinPiket, PelanggaranSiswa, HariLibur,
            PengaturanPJJ, PengaturanJadwal, AuditLog
        )

        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"absensi_backup_pg_{timestamp_str}.json"
        backup_filepath = os.path.join(BACKUP_DIR, backup_filename)

        registered_models = [
            ('users', User),
            ('siswa', Siswa),
            ('absensi_harian', AbsensiHarian),
            ('absensi_perpustakaan', AbsensiPerpustakaan),
            ('pengajuan_izin', PengajuanIzin),
            ('izin_piket', IzinPiket),
            ('pelanggaran_siswa', PelanggaranSiswa),
            ('hari_libur', HariLibur),
            ('pengaturan_pjj', PengaturanPJJ),
            ('pengaturan_jadwal', PengaturanJadwal),
            ('audit_logs', AuditLog)
        ]

        data_payload = {}
        total_rows = 0

        for table_name, model_cls in registered_models:
            rows = model_cls.query.all()
            data_payload[table_name] = [_serialize_model_instance(r) for r in rows]
            total_rows += len(rows)

        full_snapshot = {
            "meta": {
                "system": "Sistem Absensi SMKN 21 Jakarta",
                "database_engine": "PostgreSQL 17 (Supabase Pooler)",
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "total_tables": len(registered_models),
                "total_rows": total_rows
            },
            "tables": data_payload
        }

        with open(backup_filepath, 'w', encoding='utf-8') as f:
            json.dump(full_snapshot, f, ensure_ascii=False, indent=2)

        file_size_kb = round(os.path.getsize(backup_filepath) / 1024, 2)

        # Rotasi otomatis: Hapus cadangan lama yang melebihi max_keep
        all_backups = sorted(
            glob.glob(os.path.join(BACKUP_DIR, "absensi_backup_*.*")),
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
            "total_rows": total_rows,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_backups": min(len(all_backups), max_keep),
            "rotated_old_backups": deleted_count,
            "message": f"Snapshot cadangan PostgreSQL berhasil dibuat ({file_size_kb} KB, {total_rows} rekaman)."
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Gagal membuat cadangan database: {str(e)}"
        }


def list_db_backups():
    """
    Mengambil daftar seluruh berkas cadangan database yang tersedia beserta ukurannya.
    Mendukung berkas JSON dan legacy DB.
    """
    try:
        all_backups = sorted(
            glob.glob(os.path.join(BACKUP_DIR, "absensi_backup_*.*")),
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
    Secara berkala memicu cadangan database otomatis jika belum dibuat dalam 20 jam terakhir (retensi 30 hari).
    """
    import threading
    import time
    global _scheduler_started
    if _scheduler_started:
        return
    _scheduler_started = True

    def _worker():
        # Beri jeda 15 detik saat startup aplikasi sebelum evaluasi pertama
        time.sleep(15)
        while True:
            try:
                from app import app
                with app.app_context():
                    backups = list_db_backups().get('backups', [])
                    need_backup = True
                    if backups:
                        latest = backups[0]
                        latest_dt = datetime.strptime(latest['created_at'], "%Y-%m-%d %H:%M:%S")
                        if (datetime.now() - latest_dt).total_seconds() < 20 * 3600:
                            need_backup = False

                    if need_backup:
                        print("[AUTO BACKUP] Memulai pembuatan snapshot otomatis PostgreSQL SMKN 21...")
                        res = create_db_backup(max_keep=30)
                        print(f"[AUTO BACKUP] Selesai: {res.get('message')}")
            except Exception as e:
                print(f"[AUTO BACKUP ERROR] Kendala background scheduler: {e}")

            time.sleep(3600)

    t = threading.Thread(target=_worker, daemon=True)
    t.start()
