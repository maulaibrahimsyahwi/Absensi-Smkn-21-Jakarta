from flask import Blueprint, jsonify
from utils.auth_middleware import token_required, role_required
from utils.backup_utils import create_db_backup, list_db_backups

backup_bp = Blueprint('backup', __name__)

@backup_bp.route('/api/admin/backup/create', methods=['POST'])
@token_required
@role_required(['admin'])
def trigger_backup():
    """
    Fitur Khusus Admin: Memicu pembuatan cadangan instan file database SQLite.
    """
    res = create_db_backup(max_keep=7)
    status_code = 200 if res.get('success') else 500
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

