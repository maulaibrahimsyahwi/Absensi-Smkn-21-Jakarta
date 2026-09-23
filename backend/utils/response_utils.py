from flask import jsonify

def api_success(data=None, message="Berhasil", status_code=200, **kwargs):
    """
    Standarisasi format respons JSON berhasil.
    Mempertahankan kunci 'success': True, 'message', dan 'data'.
    """
    payload = {
        "success": True,
        "message": message
    }
    if data is not None:
        payload["data"] = data
    if kwargs:
        payload.update(kwargs)
    return jsonify(payload), status_code


def api_error(message="Terjadi kesalahan", status_code=400, error_code=None, **kwargs):
    """
    Standarisasi format respons JSON error/gagal.
    Mempertahankan kunci 'success': False dan 'message'.
    """
    payload = {
        "success": False,
        "message": message
    }
    if error_code:
        payload["error_code"] = error_code
    if kwargs:
        payload.update(kwargs)
    return jsonify(payload), status_code

