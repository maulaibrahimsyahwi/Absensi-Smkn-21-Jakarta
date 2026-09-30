from flask import Blueprint, jsonify, request
from utils.realtime_bus import get_realtime_state, notify_data_changed

realtime_bp = Blueprint('realtime', __name__)


@realtime_bp.route('/api/realtime/pulse', methods=['GET'])
def get_pulse():
    """
    Endpoint super ringan (<1ms) untuk deteksi perubahan data realtime lintas perangkat & browser.
    Membaca state in-memory tanpa query SQL database.
    """
    state = get_realtime_state()
    return jsonify({
        "success": True,
        "version": state["version"],
        "timestamp": state["timestamp"],
        "modules": state["modules"]
    }), 200


@realtime_bp.route('/api/realtime/notify', methods=['POST'])
def trigger_notify():
    """
    Endpoint pemantik sinkronisasi ketika suatu aksi mutasi data dieksekusi.
    """
    try:
        body = request.get_json(silent=True) or {}
        module_name = body.get("module", "all")
        new_version = notify_data_changed(module_name)
        return jsonify({
            "success": True,
            "version": new_version,
            "module": module_name
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
