import os
from flask import Blueprint, jsonify, send_from_directory, request
from utils.auth_middleware import token_required, role_required
from utils.backup_utils import create_db_backup, list_db_backups, BACKUP_DIR, start_auto_backup_scheduler
from utils.audit_trail import record_audit_log

backup_bp = Blueprint('backup', __name__)

# Start background auto backup scheduler upon module loading
start_auto_backup_scheduler()

@backup_bp.route('/api/admin/backup/create', methods=['POST'])
@token_required
@role_required(['admin'])
def trigger_backup():
    """
    Fitur Khusus Admin: Memicu pembuatan cadangan instan database SQLite (Disaster Recovery).
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
            keterangan=f"Membuat cadangan database manual: {res.get('filename')} ({res.get('size_kb')} KB)"
        )

    return jsonify(res), status_code


@backup_bp.route('/api/admin/backup/list', methods=['GET'])
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
    Fitur Khusus Admin: Mengunduh berkas cadangan database SQLite secara aman untuk off-site storage.
    """
    # Sanitasi nama berkas (mencegah path traversal)
    safe_filename = os.path.basename(filename)
    filepath = os.path.join(BACKUP_DIR, safe_filename)

    if not os.path.exists(filepath) or not safe_filename.endswith('.db'):
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
    meliputi ukuran database SQLite, folder upload surat izin, berkas cadangan, dan log audit.
    """
    from config import BASE_DIR
    from models import AuditTrail

    # 1. Database Size
    db_path = os.path.join(BASE_DIR, 'sistem_absensi.db')
    db_size = os.path.getsize(db_path) if os.path.exists(db_path) else 0

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
    audit_count = AuditTrail.query.count()

    def format_size(bytes_val):
        if bytes_val < 1024:
            return f"{bytes_val} B"
        elif bytes_val < 1024 * 1024:
            return f"{bytes_val / 1024:.1f} KB"
        else:
            return f"{bytes_val / (1024 * 1024):.2f} MB"

    return jsonify({
        "success": True,
        "database": {
            "size_bytes": db_size,
            "size_formatted": format_size(db_size),
            "file": "sistem_absensi.db"
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
    })


@backup_bp.route('/api/admin/storage/cleanup', methods=['POST'])
@token_required
@role_required(['admin'])
def run_storage_cleanup():
    """
    Menjalankan housekeeping dan rotasi cache:
    1. Membersihkan log audit usang (> 180 hari).
    2. Menjalankan SQLite VACUUM untuk mengklaim ulang ruang disk yang terfragmentasi.
    """
    from datetime import datetime, timedelta
    from models import db, AuditTrail
    data = request.json or {}
    prune_audit = data.get('prune_audit', True)
    vacuum_db = data.get('vacuum_db', True)
    days = int(data.get('audit_days_keep', 180))

    cleaned_actions = []

    # 1. Prune audit logs older than N days
    if prune_audit:
        cutoff = datetime.now() - timedelta(days=days)
        deleted_audit = AuditTrail.query.filter(AuditTrail.timestamp < cutoff).delete()
        db.session.commit()
        cleaned_actions.append(f"Membersihkan {deleted_audit} baris log audit (> {days} hari)")

    # 2. SQLite VACUUM
    if vacuum_db:
        try:
            db.session.execute(db.text("VACUUM;"))
            db.session.commit()
            cleaned_actions.append("Optimasi database VACUUM selesai")
        except Exception as e:
            cleaned_actions.append(f"VACUUM dilewati ({str(e)})")

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
        "actions_taken": cleaned_actions
    })



