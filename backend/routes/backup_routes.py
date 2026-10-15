import os
from flask import Blueprint, jsonify, send_from_directory, request
from utils.auth_middleware import token_required, role_required
from utils.backup_utils import (
    create_db_backup,
    create_full_archive_backup,
    restore_db_from_backup,
    list_db_backups,
    BACKUP_DIR,
    start_auto_backup_scheduler
)
from utils.audit_trail import record_audit_log

backup_bp = Blueprint('backup', __name__)

@backup_bp.route('/api/admin/backup/create', methods=['POST'])
@backup_bp.route('/api/admin/backup', methods=['POST'])
@token_required
@role_required(['admin'])
def trigger_backup():
    """
    Fitur Khusus Admin: Memicu pembuatan cadangan instan database PostgreSQL (Disaster Recovery).
    """
    res = create_db_backup(max_keep=30)
    status_code = 200 if res.get('success') else 500

    if res.get('success'):
        current_u = getattr(request, 'current_user', {})
        record_audit_log(
            user_id=current_u.get('user_id'),
            role='admin',
            user_name=current_u.get('identifier', 'Admin'),
            action='BACKUP_DATABASE',
            target_type='Database',
            target_id=res.get('filename'),
            keterangan=f"Membuat snapshot database PostgreSQL manual: {res.get('filename')} ({res.get('size_kb')} KB)"
        )

    return jsonify(res), status_code


@backup_bp.route('/api/admin/backup/create_archive', methods=['POST'])
@token_required
@role_required(['admin'])
def trigger_archive_backup():
    """
    Fitur Khusus Admin: Membuat arsip sistem penuh (.zip) berisi snapshot database PostgreSQL dan berkas uploads fisik.
    """
    res = create_full_archive_backup(max_keep=10)
    status_code = 200 if res.get('success') else 500

    if res.get('success'):
        current_u = getattr(request, 'current_user', {})
        record_audit_log(
            user_id=current_u.get('user_id'),
            role='admin',
            user_name=current_u.get('identifier', 'Admin'),
            action='BACKUP_SYSTEM_ARCHIVE',
            target_type='System',
            target_id=res.get('filename'),
            keterangan=f"Membuat arsip sistem penuh (Database + Uploads): {res.get('filename')} ({res.get('size_kb')} KB)"
        )

    return jsonify(res), status_code


@backup_bp.route('/api/admin/backup/restore', methods=['POST'])
@token_required
@role_required(['admin'])
def trigger_restore():
    """
    Fitur Khusus Admin: Memulihkan database dari berkas cadangan JSON atau arsip ZIP.
    Mendukung pemilihan nama berkas yang ada di server atau pengunggahan berkas langsung.
    """
    data = request.form.to_dict() if request.form else (request.json or {})
    mode = data.get('mode', 'replace')

    # Periksa apakah ada file diunggah langsung melalui form data
    if 'file' in request.files:
        uploaded_file = request.files['file']
        if uploaded_file.filename:
            safe_fname = os.path.basename(uploaded_file.filename)
            if not safe_fname.endswith(('.json', '.zip')):
                return jsonify({"success": False, "message": "Format berkas harus .json atau .zip"}), 400
            target_path = os.path.join(BACKUP_DIR, f"uploaded_{safe_fname}")
            uploaded_file.save(target_path)
            res = restore_db_from_backup(target_path, mode=mode)
        else:
            return jsonify({"success": False, "message": "Berkas yang diunggah tidak memiliki nama valid."}), 400
    else:
        filename = data.get('filename')
        if not filename:
            return jsonify({"success": False, "message": "Nama berkas cadangan (filename) wajib ditentukan."}), 400
        safe_fname = os.path.basename(filename)
        res = restore_db_from_backup(safe_fname, mode=mode)

    status_code = 200 if res.get('success') else 500

    if res.get('success'):
        current_u = getattr(request, 'current_user', {})
        record_audit_log(
            user_id=current_u.get('user_id'),
            role='admin',
            user_name=current_u.get('identifier', 'Admin'),
            action='RESTORE_DATABASE',
            target_type='Database',
            target_id=res.get('filename'),
            keterangan=f"Memulihkan basis data dari {res.get('filename')}: {res.get('total_restored')} rekaman dipulihkan (mode: {res.get('mode')})"
        )

    return jsonify(res), status_code


@backup_bp.route('/api/admin/backup/list', methods=['GET'])
@backup_bp.route('/api/admin/backup', methods=['GET'])
@token_required
@role_required(['admin'])
def get_backups():
    """
    Fitur Khusus Admin: Melihat daftar riwayat cadangan database.
    """
    res = list_db_backups()
    return jsonify(res)


@backup_bp.route('/api/admin/backup/download/<filename>', methods=['GET'])
@token_required
@role_required(['admin'])
def download_backup(filename):
    """
    Fitur Khusus Admin: Mengunduh berkas cadangan database PostgreSQL secara aman untuk off-site storage.
    """
    # Sanitasi nama berkas (mencegah path traversal)
    safe_filename = os.path.basename(filename)
    filepath = os.path.join(BACKUP_DIR, safe_filename)

    allowed_exts = ('.json', '.zip', '.sql', '.db', '.gz')
    if not os.path.exists(filepath) or not safe_filename.endswith(allowed_exts):
        return jsonify({"success": False, "message": "Berkas cadangan tidak ditemukan."}), 404

    current_u = getattr(request, 'current_user', {})
    record_audit_log(
        user_id=current_u.get('user_id'),
        role='admin',
        user_name=current_u.get('identifier', 'Admin'),
        action='DOWNLOAD_BACKUP',
        target_type='Database',
        target_id=safe_filename,
        keterangan=f"Mengunduh berkas cadangan database {safe_filename} untuk arsip off-site"
    )

    resp = send_from_directory(BACKUP_DIR, safe_filename, as_attachment=True)
    resp.headers['X-Content-Type-Options'] = 'nosniff'
    resp.headers['Cache-Control'] = 'private, no-cache, no-store, must-revalidate'
    return resp


# ================= PEMBERSIHAN STORAGE BERKALA (HOUSEKEEPING & CACHE ROTATION) =================

@backup_bp.route('/api/admin/storage/stats', methods=['GET'])
@token_required
@role_required(['admin'])
def get_storage_stats():
    """
    Mengambil metrik statistik penggunaan ruang penyimpanan (Disk Storage & Database)
    meliputi ukuran basis data PostgreSQL, folder upload surat izin, berkas cadangan, dan log audit.
    """
    from config import BASE_DIR
    from models import db, AuditLog

    # 1. Database Size PostgreSQL
    try:
        res = db.session.execute(db.text("SELECT pg_database_size(current_database());")).scalar()
        db_size = int(res) if res else 0
    except Exception:
        db_size = 0

    # 2. Upload Surat Size
    upload_surat_dir = os.path.join(BASE_DIR, 'static', 'uploads', 'surat')
    surat_count = 0
    surat_size = 0
    if os.path.exists(upload_surat_dir):
        for f in os.listdir(upload_surat_dir):
            fp = os.path.join(upload_surat_dir, f)
            if os.path.isfile(fp):
                surat_count += 1
                surat_size += os.path.getsize(fp)

    # 3. Backups Size
    backup_count = 0
    backup_size = 0
    if os.path.exists(BACKUP_DIR):
        for f in os.listdir(BACKUP_DIR):
            fp = os.path.join(BACKUP_DIR, f)
            if os.path.isfile(fp):
                backup_count += 1
                backup_size += os.path.getsize(fp)

    # 4. Audit Log Count
    from datetime import datetime, timedelta
    old_cutoff = datetime.now() - timedelta(days=90)
    audit_count = AuditLog.query.count()
    audit_old_count = AuditLog.query.filter(AuditLog.created_at < old_cutoff).count()

    def format_size(bytes_val):
        if bytes_val < 1024:
            return f"{bytes_val} B"
        elif bytes_val < 1024 * 1024:
            return f"{bytes_val / 1024:.1f} KB"
        else:
            return f"{bytes_val / (1024 * 1024):.2f} MB"

    db_mb = round(db_size / (1024 * 1024), 2)
    surat_mb = round(surat_size / (1024 * 1024), 2)
    backup_mb = round(backup_size / (1024 * 1024), 2)

    stat_payload = {
        "database_size_mb": db_mb,
        "uploads_size_mb": surat_mb,
        "uploads_file_count": surat_count,
        "backups_size_mb": backup_mb,
        "backups_count": backup_count,
        "audit_logs_count": audit_count,
        "audit_logs_old_count": audit_old_count,
        "database": {
            "size_bytes": db_size,
            "size_formatted": format_size(db_size),
            "engine": "PostgreSQL 17 (Supabase Pooler)"
        },
        "surat_uploads": {
            "count": surat_count,
            "size_bytes": surat_size,
            "size_formatted": format_size(surat_size)
        },
        "backups": {
            "count": backup_count,
            "size_bytes": backup_size,
            "size_formatted": format_size(backup_size)
        },
        "audit_logs": {
            "count": audit_count
        },
        "total_storage_bytes": db_size + surat_size + backup_size,
        "total_storage_formatted": format_size(db_size + surat_size + backup_size)
    }

    return jsonify({
        "success": True,
        "data": stat_payload,
        **stat_payload
    })


@backup_bp.route('/api/admin/storage/cleanup', methods=['POST'])
@token_required
@role_required(['admin'])
def run_storage_cleanup():
    """
    Menjalankan housekeeping dan rotasi cache:
    1. Membersihkan log audit usang (> N hari).
    2. Menjalankan PostgreSQL VACUUM ANALYZE untuk mereklaim ruang storage dan optimasi indeks per tabel.
    """
    from datetime import datetime, timedelta
    from models import db, AuditLog
    data = request.json or {}
    prune_audit = data.get('prune_audit', True)
    vacuum_db = data.get('vacuum_db', data.get('run_vacuum', True))
    # Kepatuhan UU PDP No. 27/2022 Pasal 31 & OWASP A09: Kunci batas retensi minimum 90 hari
    # Mencegah penyerang/akun admin yang terkompromi menghapus jejak audit hari ini (0 hari)
    try:
        days = max(90, int(data.get('audit_days_keep', data.get('days_to_keep', 180))))
    except (ValueError, TypeError):
        days = 180

    cleaned_actions = []
    deleted_audit = 0
    deleted_orphans_count = 0
    reclaimed_bytes = 0

    # 1. Prune audit logs older than N days
    if prune_audit:
        cutoff = datetime.now() - timedelta(days=days)
        deleted_audit = AuditLog.query.filter(AuditLog.created_at < cutoff).delete()
        db.session.commit()
        cleaned_actions.append(f"Membersihkan {deleted_audit} baris log audit (> {days} hari)")

    # 2. Pembersihan berkas fisik orphan (tidak terikat di tabel basis data)
    prune_orphans = data.get('prune_orphans', True)
    if prune_orphans:
        try:
            import time
            from models import Siswa, User, IzinPiket, PengajuanIzin, PelanggaranSiswa
            from utils.file_storage import SURAT_DIR, SIGNATURES_DIR, AVATARS_DIR
            from utils.crypto_utils import decrypt_field

            referenced_files = set()

            def _register_ref(val):
                if val and isinstance(val, str) and not val.startswith('data:'):
                    plain = decrypt_field(val)
                    if plain and isinstance(plain, str) and not plain.startswith('data:'):
                        referenced_files.add(os.path.basename(plain))

            # Kumpulkan berkas yang masih aktif dirujuk oleh basis data
            for s in Siswa.query.with_entities(Siswa.tanda_tangan, Siswa.foto_profil).all():
                for val in s:
                    _register_ref(val)

            for u in User.query.with_entities(User.foto_profil, User.tanda_tangan).all():
                for val in u:
                    _register_ref(val)

            for ip in IzinPiket.query.with_entities(IzinPiket.tanda_tangan_petugas, IzinPiket.tanda_tangan_siswa).all():
                for val in ip:
                    _register_ref(val)

            for pi in PengajuanIzin.query.with_entities(PengajuanIzin.surat_bukti, PengajuanIzin.tanda_tangan_siswa).all():
                for val in pi:
                    _register_ref(val)

            for ps in PelanggaranSiswa.query.with_entities(PelanggaranSiswa.tanda_tangan_siswa).all():
                for val in ps:
                    _register_ref(val)

            # Scan direktori fisik uploads untuk mencari file yang tidak terikat (orphan)
            now_epoch = time.time()
            for d in [SURAT_DIR, SIGNATURES_DIR, AVATARS_DIR]:
                if os.path.exists(d):
                    for fname in os.listdir(d):
                        filepath = os.path.join(d, fname)
                        if os.path.isfile(filepath):
                            file_age = now_epoch - os.path.getmtime(filepath)
                            # Hanya bersihkan file > 1 jam untuk mencegah menghapus file saat transaksi upload
                            if fname not in referenced_files and file_age > 3600:
                                sz = os.path.getsize(filepath)
                                try:
                                    os.remove(filepath)
                                    deleted_orphans_count += 1
                                    reclaimed_bytes += sz
                                except Exception:
                                    pass

            if deleted_orphans_count > 0:
                mb_reclaimed = reclaimed_bytes / (1024 * 1024)
                cleaned_actions.append(f"Menghapus {deleted_orphans_count} berkas lampiran tidak terpakai/orphan ({mb_reclaimed:.2f} MB)")
            else:
                cleaned_actions.append("Penyimpanan fisik lampiran bersih (tidak ada berkas orphan)")
        except Exception as e_orph:
            cleaned_actions.append(f"Pembersihan berkas orphan dilewati ({str(e_orph)})")

    # 3. PostgreSQL VACUUM ANALYZE
    if vacuum_db:
        try:
            with db.engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
                conn.execute(db.text("VACUUM ANALYZE absensi_harian;"))
                conn.execute(db.text("VACUUM ANALYZE audit_logs;"))
                conn.execute(db.text("VACUUM ANALYZE pelanggaran_siswa;"))
                conn.execute(db.text("VACUUM ANALYZE siswa;"))
            cleaned_actions.append("Optimasi basis data PostgreSQL (VACUUM ANALYZE) selesai")
        except Exception as e:
            cleaned_actions.append(f"VACUUM ANALYZE dilewati ({str(e)})")

    current_u = getattr(request, 'current_user', {})
    record_audit_log(
        user_id=current_u.get('user_id'),
        role='admin',
        user_name=current_u.get('identifier', 'Admin'),
        action='STORAGE_HOUSEKEEPING',
        target_type='System',
        target_id='Storage',
        keterangan="; ".join(cleaned_actions)
    )

    return jsonify({
        "success": True,
        "message": "Pembersihan storage & rotasi cache berhasil dijalankan!",
        "pruned_audit_logs": deleted_audit,
        "deleted_orphans_count": deleted_orphans_count,
        "reclaimed_bytes": reclaimed_bytes,
        "actions_taken": cleaned_actions
    })



