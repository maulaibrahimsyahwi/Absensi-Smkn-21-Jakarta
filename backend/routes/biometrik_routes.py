import json
from flask import Blueprint, request, jsonify
from models import db, Siswa
from face_utils import get_face_encoding, check_face_present, analyze_liveness

biometrik_bp = Blueprint('biometrik', __name__)

from utils.auth_middleware import decode_token, token_required, role_required

def is_admin_caller():
    """
    Memeriksa apakah pemanggil adalah Admin HANYA melalui token JWT valid.
    Header spoofing ditolak sepenuhnya.
    """
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.strip().startswith('Bearer '):
        try:
            token = auth_header.strip().split(' ')[1]
            payload = decode_token(token)
            return payload.get('role', '').lower() == 'admin'
        except Exception:
            return False
    return False


from utils.helpers import invalidate_face_cache

@biometrik_bp.route('/api/register_face', methods=['POST'])
@token_required
def register_face():
    data = request.json or {}
    siswa_id = data.get('siswa_id')
    
    # Mendukung array beberapa foto sampel (images) atau single (image)
    images = data.get('images', [])
    if not images and data.get('image'):
        images = [data.get('image')]
        
    # Batasi sampel maksimal 5 foto untuk mencegah DoS beban inferensi neural network
    if len(images) > 5:
        images = images[:5]
        
    siswa = Siswa.query.get(siswa_id)
    if not siswa:
        return jsonify({"success": False, "message": "Siswa tidak ditemukan"}), 404

    current_user = getattr(request, 'current_user', {})
    is_admin = is_admin_caller() or current_user.get('role') == 'admin'

    # Perekaman biometrik wajah siswa HANYA DAPAT DILAKUKAN OLEH ADMINISTRATOR SEKOLAH
    if not is_admin:
        return jsonify({
            "success": False,
            "message": "Akses ditolak: Perekaman dan pembaruan biometrik wajah siswa hanya dapat dilakukan secara resmi oleh Administrator Sekolah melalui menu Pendaftaran Siswa."
        }), 403
        
    try:
        encodings = []
        for idx, img_data in enumerate(images):
            enc = get_face_encoding(img_data)
            if enc is not None:
                encodings.append(enc)
                
        if not encodings:
            return jsonify({
                "success": False, 
                "message": "Tidak ada wajah terdeteksi pada foto yang diambil. Pastikan pencahayaan cukup dan wajah menghadap kamera."
            }), 400
            
        # Simpan array multi-sample biometrik wajah ke database
        siswa.face_encoding = json.dumps(encodings)
        db.session.commit()
        invalidate_face_cache()
        return jsonify({
            "success": True, 
            "message": f"Berhasil menyimpan {len(encodings)} sampel biometrik wajah untuk {siswa.nama}."
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Gagal menyimpan data biometrik: {str(e)}"}), 500


@biometrik_bp.route('/api/siswa/<int:id>/reset_face', methods=['POST'])
@token_required
@role_required(['admin'])
def reset_siswa_face(id):
    """
    Fitur khusus Admin: Mereset data biometrik wajah siswa agar siswa dapat mendaftarkan ulang sampel wajahnya.
    """
    try:
        siswa = Siswa.query.get(id)
        if not siswa:
            return jsonify({"success": False, "message": "Data siswa tidak ditemukan."}), 404
        
        siswa.face_encoding = None
        db.session.commit()
        invalidate_face_cache()
        return jsonify({
            "success": True, 
            "message": f"Biometrik wajah {siswa.nama} ({siswa.kelas}) berhasil direset. Siswa kini dapat mendaftarkan ulang wajahnya."
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Gagal mereset biometrik wajah: {str(e)}"}), 500


# ================= DETEKSI KEHADIRAN ORANG & LIVENESS KEDIPAN =================

import hmac
import hashlib
import time as time_module
from collections import defaultdict
from config import SECRET_KEY

# Pelacak sesi liveness kedipan server-side {user_id: {"last_closed": float, "last_open": float, "last_update": float}}
_liveness_tracker = defaultdict(dict)

def create_liveness_token(user_id):
    """
    Membuat token tantangan liveness terenkripsi (HMAC-SHA256) berdurasi 60 detik.
    Hanya dapat diterbitkan jika server memvalidasi transisi kedipan mata asli.
    """
    ts = int(time_module.time())
    raw = f"{user_id}:{ts}"
    sig = hmac.new(SECRET_KEY.encode(), raw.encode(), hashlib.sha256).hexdigest()[:32]
    return f"{user_id}:{ts}:{sig}"

def verify_liveness_token(token, expected_user_id, max_age_seconds=60):
    """
    Memverifikasi keabsahan dan masa berlaku liveness token dari kamera.
    """
    if not token or not isinstance(token, str):
        return False, "Token verifikasi liveness tidak ditemukan."
    parts = token.split(":")
    if len(parts) != 3:
        return False, "Format token liveness tidak valid."
    uid, ts_str, sig = parts
    try:
        ts = int(ts_str)
    except ValueError:
        return False, "Timestamp token liveness tidak valid."
    
    now = int(time_module.time())
    if now - ts > max_age_seconds or ts > now + 10:
        return False, "Sesi verifikasi wajah telah kedaluwarsa (> 60 detik). Mohon ulangi kedipan di depan kamera."
    
    if str(uid) != str(expected_user_id):
        return False, "Token liveness tidak cocok dengan identitas akun siswa."
    
    expected_raw = f"{uid}:{ts}"
    expected_sig = hmac.new(SECRET_KEY.encode(), expected_raw.encode(), hashlib.sha256).hexdigest()[:32]
    if not hmac.compare_digest(sig, expected_sig):
        return False, "Tanda tangan token liveness tidak valid (terindikasi pemalsuan)."
    
    return True, "Valid"


@biometrik_bp.route('/api/detect_face', methods=['POST'])
@token_required
def detect_face():
    data = request.json or {}
    image_data = data.get('image')
    if not image_data:
        return jsonify({"face_detected": False})
    
    is_present = check_face_present(image_data)
    return jsonify({"face_detected": is_present})


@biometrik_bp.route('/api/detect_liveness', methods=['POST'])
@token_required
def detect_liveness():
    data = request.json or {}
    image_data = data.get('image')
    if not image_data:
        return jsonify({"face_detected": False, "eye_state": "UNKNOWN", "openness_score": 0.0})
    
    current_user = getattr(request, 'current_user', {})
    user_id = current_user.get('user_id', 0)

    result = analyze_liveness(image_data)
    now_t = time_module.time()

    if result.get('face_detected'):
        eye_state = result.get('eye_state')
        user_state = _liveness_tracker[user_id]

        # Reset jika jeda antar-frame melebihi 15 detik
        if now_t - user_state.get('last_update', 0) > 15:
            user_state.clear()
        user_state['last_update'] = now_t

        if eye_state == 'CLOSED':
            user_state['last_closed'] = now_t
        elif eye_state == 'OPEN':
            user_state['last_open'] = now_t
            # Verifikasi transisi siklus kedipan: CLOSED dalam rentang 0.2s s/d 5.0s yang lalu
            if 'last_closed' in user_state and (now_t - user_state['last_closed'] <= 5.0):
                # Terbitkan Liveness Challenge Token resmi
                token = create_liveness_token(user_id)
                result['liveness_token'] = token
                result['liveness_verified'] = True

    return jsonify(result)


