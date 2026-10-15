import os
import json
import glob
import zipfile
import shutil
from datetime import datetime, date
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


def _deserialize_row(model_cls, row_dict):
    """Mengonversi dictionary snapshot kembali ke tipe data native SQLAlchemy model."""
    cleaned = {}
    col_map = {c.name: c for c in model_cls.__table__.columns}
    for k, v in row_dict.items():
        if k not in col_map:
            continue
        col = col_map[k]
        if v is None:
            cleaned[k] = None
            continue

        type_str = str(col.type).upper()
        if 'DATETIME' in type_str:
            if isinstance(v, str):
                try:
                    cleaned[k] = datetime.fromisoformat(v)
                except Exception:
                    cleaned[k] = v
            else:
                cleaned[k] = v
        elif 'DATE' in type_str:
            if isinstance(v, str):
                try:
                    cleaned[k] = date.fromisoformat(v[:10])
                except Exception:
                    cleaned[k] = v
            else:
                cleaned[k] = v
        elif 'BOOLEAN' in type_str:
            cleaned[k] = bool(v)
        elif 'INTEGER' in type_str:
            try:
                cleaned[k] = int(v)
            except Exception:
                cleaned[k] = v
        elif 'FLOAT' in type_str:
            try:
                cleaned[k] = float(v)
            except Exception:
                cleaned[k] = v
        else:
            cleaned[k] = v
    return cleaned


def _get_ordered_models():
    """
    Mengembalikan daftar tuple (table_name, model_class) yang terurut berdasarkan
    hierarki ketergantungan relasi Foreign Key (Topological Order).
    Tabel induk diurutkan pertama, tabel anak/transaksi berikutnya.
    """
    from models import (
        User, Siswa, HariLibur, PengaturanJadwal, PengaturanPJJ,
        AbsensiHarian, AbsensiPerpustakaan, PengajuanIzin, IzinPiket,
        PelanggaranSiswa, AuditLog
    )
    return [
        ('users', User),
        ('siswa', Siswa),
        ('hari_libur', HariLibur),
        ('pengaturan_jadwal', PengaturanJadwal),
        ('pengaturan_pjj', PengaturanPJJ),
        ('absensi_harian', AbsensiHarian),
        ('absensi_perpustakaan', AbsensiPerpustakaan),
        ('pengajuan_izin', PengajuanIzin),
        ('izin_piket', IzinPiket),
        ('pelanggaran_siswa', PelanggaranSiswa),
        ('audit_logs', AuditLog)
    ]


def create_db_backup(max_keep=30):
    """
    Membuat snapshot cadangan basis data PostgreSQL secara aman (Disaster Recovery).
    Mengekstrak seluruh tabel inti ke dalam berkas JSON terstruktur non-blocking.
    
    :param max_keep: Jumlah cadangan maksimal yang dipertahankan (rotasi otomatis 30 hari)
    :return: dict status keberhasilan, path berkas, ukuran, dan timestamp
    """
    try:
        registered_models = _get_ordered_models()
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"absensi_backup_pg_{timestamp_str}.json"
        backup_filepath = os.path.join(BACKUP_DIR, backup_filename)

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

        from utils.crypto_utils import encrypt_json_payload
        encrypted_backup_payload = encrypt_json_payload(full_snapshot)

        with open(backup_filepath, 'w', encoding='utf-8') as f:
            f.write(encrypted_backup_payload)

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


def create_full_archive_backup(max_keep=10):
    """
    Membuat arsip sistem penuh (.zip) yang mencakup:
    1. Snapshot basis data PostgreSQL (.json)
    2. Berkas fisik upload surat (/static/uploads/surat)
    3. Berkas surat edaran (/static/uploads/surat_edaran)
    4. Tanda tangan & avatar digital (/static/uploads/signatures, /static/uploads/avatars)
    """
    try:
        # Buat snapshot DB terlebih dahulu
        db_res = create_db_backup(max_keep=max_keep * 3)
        if not db_res.get('success'):
            return db_res

        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        zip_filename = f"absensi_full_archive_{timestamp_str}.zip"
        zip_filepath = os.path.join(BACKUP_DIR, zip_filename)

        with zipfile.ZipFile(zip_filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # 1. Masukkan berkas snapshot JSON database
            zipf.write(db_res['filepath'], arcname="database_snapshot.json")

            # 2. Masukkan folder uploads fisik jika ada
            uploads_dir = os.path.join(BASE_DIR, 'static', 'uploads')
            if os.path.exists(uploads_dir):
                for root, _, files in os.walk(uploads_dir):
                    for file in files:
                        full_p = os.path.join(root, file)
                        rel_p = os.path.relpath(full_p, BASE_DIR)
                        zipf.write(full_p, arcname=rel_p)

        file_size_kb = round(os.path.getsize(zip_filepath) / 1024, 2)
        return {
            "success": True,
            "filename": zip_filename,
            "filepath": zip_filepath,
            "size_kb": file_size_kb,
            "message": f"Arsip sistem penuh (Database + Uploads) berhasil dibuat ({file_size_kb} KB)."
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Gagal membuat arsip sistem penuh: {str(e)}"
        }


def restore_db_from_backup(backup_target, mode='replace'):
    """
    Memulihkan (restore) basis data dari berkas snapshot JSON atau arsip ZIP.
    Menghormati urutan foreign-key (FK dependencies) dan mereset sequence ID PostgreSQL.
    
    :param backup_target: Nama berkas di folder backups atau path absolut berkas .json / .zip
    :param mode: 'replace' (hapus data lama lalu isi ulang) atau 'merge' (tambah baris baru)
    :return: dict status keberhasilan dan ringkasan pemulihan per tabel
    """
    from models import db
    from utils.helpers import invalidate_face_cache

    try:
        if not os.path.isabs(backup_target):
            filepath = os.path.join(BACKUP_DIR, os.path.basename(backup_target))
        else:
            filepath = backup_target

        if not os.path.exists(filepath):
            return {
                "success": False,
                "message": f"Berkas cadangan '{os.path.basename(backup_target)}' tidak ditemukan."
            }

        extracted_uploads = 0
        snapshot_json_data = None

        # 1. Evaluasi apakah berkas berbentuk ZIP atau JSON murni
        if zipfile.is_zipfile(filepath):
            with zipfile.ZipFile(filepath, 'r') as zipf:
                # Cari berkas snapshot json di dalam zip
                json_candidates = [n for n in zipf.namelist() if n.endswith('.json')]
                if not json_candidates:
                    return {
                        "success": False,
                        "message": "Arsip ZIP tidak memuat berkas snapshot database (.json)."
                    }
                from utils.crypto_utils import decrypt_json_payload
                target_json_name = "database_snapshot.json" if "database_snapshot.json" in json_candidates else json_candidates[0]
                with zipf.open(target_json_name) as jf:
                    raw_text = jf.read().decode('utf-8')
                    snapshot_json_data = decrypt_json_payload(raw_text)

                # Ekstrak berkas uploads jika ada dengan mitigasi Zip Slip
                allowed_uploads_dir = os.path.realpath(os.path.join(BASE_DIR, 'static', 'uploads'))
                for item in zipf.namelist():
                    if item.startswith('static/uploads/') and not item.endswith('/'):
                        dest_path = os.path.join(BASE_DIR, item)
                        real_dest = os.path.realpath(dest_path)
                        # Validasi bahwa path absolut tujuan berada di dalam folder static/uploads
                        if not real_dest.startswith(allowed_uploads_dir + os.sep) and real_dest != allowed_uploads_dir:
                            continue
                        os.makedirs(os.path.dirname(real_dest), exist_ok=True)
                        with zipf.open(item) as sf, open(real_dest, 'wb') as df:
                            shutil.copyfileobj(sf, df)
                        extracted_uploads += 1
        else:
            from utils.crypto_utils import decrypt_json_payload
            with open(filepath, 'r', encoding='utf-8') as f:
                raw_text = f.read()
                snapshot_json_data = decrypt_json_payload(raw_text)

        if not snapshot_json_data or 'tables' not in snapshot_json_data:
            return {
                "success": False,
                "message": "Format berkas cadangan tidak valid (kunci 'tables' tidak ditemukan)."
            }

        tables_data = snapshot_json_data['tables']
        ordered_models = _get_ordered_models()

        # 2. Jika mode replace: Bersihkan tabel dengan urutan terbalik (Anak dahulu -> Induk terakhir)
        if mode == 'replace':
            for table_name, model_cls in reversed(ordered_models):
                db.session.query(model_cls).delete()
            db.session.flush()

        # 3. Masukkan baris data baru dengan urutan ketergantungan (Induk dahulu -> Anak terakhir)
        restored_counts = {}
        total_restored = 0

        for table_name, model_cls in ordered_models:
            table_rows = tables_data.get(table_name, [])
            count_table = 0
            if not table_rows:
                continue

            existing_map = {}
            if mode == 'merge':
                incoming_ids = [r.get('id') for r in table_rows if r.get('id') is not None]
                if incoming_ids and hasattr(model_cls, 'id'):
                    existing_objs = model_cls.query.filter(model_cls.id.in_(incoming_ids)).all()
                    existing_map = {obj.id: obj for obj in existing_objs}

            for row_dict in table_rows:
                cleaned = _deserialize_row(model_cls, row_dict)
                row_id = cleaned.get('id')
                if mode == 'merge' and row_id in existing_map:
                    existing = existing_map[row_id]
                    for col, val in cleaned.items():
                        if col != 'id':
                            setattr(existing, col, val)
                else:
                    instance = model_cls(**cleaned)
                    db.session.add(instance)
                count_table += 1
            db.session.flush()
            restored_counts[table_name] = count_table
            total_restored += count_table

        db.session.commit()

        # 4. Reset PostgreSQL Auto-Increment Sequences agar penambahan baris baru tidak konflik ID
        seq_resets = 0
        if db.engine.dialect.name == 'postgresql':
            for table_name, model_cls in ordered_models:
                col_names = [c.name for c in model_cls.__table__.columns]
                if 'id' in col_names:
                    try:
                        sql = db.text(f"""
                            SELECT setval(
                                pg_get_serial_sequence('{table_name}', 'id'),
                                COALESCE((SELECT MAX(id) FROM {table_name}), 1),
                                (SELECT MAX(id) FROM {table_name}) IS NOT NULL
                            );
                        """)
                        db.session.execute(sql)
                        seq_resets += 1
                    except Exception:
                        pass
            db.session.commit()

        # 5. Invalidate face recognition cache in memory
        try:
            invalidate_face_cache()
        except Exception:
            pass

        return {
            "success": True,
            "filename": os.path.basename(filepath),
            "mode": mode,
            "total_restored": total_restored,
            "restored_tables": restored_counts,
            "extracted_uploads": extracted_uploads,
            "sequences_reset": seq_resets,
            "message": f"Pemulihan basis data berhasil ({total_restored} baris dipulihkan pada {len(restored_counts)} tabel)."
        }

    except Exception as e:
        db.session.rollback()
        return {
            "success": False,
            "message": f"Gagal memulihkan database: {str(e)}"
        }


def list_db_backups():
    """
    Mengambil daftar seluruh berkas cadangan database yang tersedia beserta ukurannya.
    Mendukung berkas JSON dan ZIP.
    """
    try:
        all_backups = sorted(
            glob.glob(os.path.join(BACKUP_DIR, "absensi_*.*")),
            key=os.path.getmtime,
            reverse=True
        )
        items = []
        for bp in all_backups:
            items.append({
                "filename": os.path.basename(bp),
                "is_archive": bp.endswith('.zip'),
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
        from datetime import time as dt_time
        # Beri jeda 15 detik saat startup aplikasi sebelum evaluasi pertama
        time.sleep(15)
        last_backup_check = 0
        last_alpa_date = None

        while True:
            now_dt = datetime.now()
            today_date = now_dt.date()

            # 1. Otomasi Pencatatan Alpa Harian Siswa (Setiap Hari Sekolah pukul >= 15:30 WIB)
            if last_alpa_date != today_date and now_dt.time() >= dt_time(15, 30):
                try:
                    from app import app
                    with app.app_context():
                        from routes.rekap_routes import execute_daily_alpa_generation
                        success, msg, count = execute_daily_alpa_generation()
                        last_alpa_date = today_date
                        if success and count > 0:
                            print(f"[AUTO ALPA SCHEDULER] {msg}")
                        elif not success and "dibatalkan" in msg:
                            print(f"[AUTO ALPA SCHEDULER] Dilewati hari ini ({msg})")
                except Exception as e_alpa:
                    print(f"[AUTO ALPA SCHEDULER ERROR] Kendala eksekusi alpa harian: {e_alpa}")

            # 2. Otomasi Cadangan Database (Disaster Recovery harian setiap ~20 jam)
            if time.time() - last_backup_check > 3600:
                last_backup_check = time.time()
                try:
                    from app import app
                    with app.app_context():
                        backups = list_db_backups().get('backups', [])
                        need_backup = True
                        if backups:
                            latest = backups[0]
                            latest_dt = datetime.strptime(latest['created_at'], "%Y-%m-%d %H:%M:%S")
                            if (now_dt - latest_dt).total_seconds() < 20 * 3600:
                                need_backup = False

                        if need_backup:
                            print("[AUTO BACKUP] Memulai pembuatan snapshot otomatis PostgreSQL SMKN 21...")
                            res = create_db_backup(max_keep=30)
                            print(f"[AUTO BACKUP] Selesai: {res.get('message')}")
                except Exception as e_bk:
                    print(f"[AUTO BACKUP ERROR] Kendala background scheduler: {e_bk}")

            time.sleep(60)

    t = threading.Thread(target=_worker, daemon=True)
    t.start()

