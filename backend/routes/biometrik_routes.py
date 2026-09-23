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

    # Proteksi Anti-Hijacking / IDOR: Siswa hanya boleh merekam sampel wajah untuk akunnya sendiri
    if not is_admin:
        if current_user.get('role') == 'siswa' and str(current_user.get('user_id')) != str(siswa_id):
            return jsonify({
                "success": False,
                "message": "Akses ditolak: Anda hanya dapat merekam biometrik wajah untuk akun Anda sendiri."
            }), 403
        elif current_user.get('role') != 'siswa':
            return jsonify({
                "success": False,
                "message": "Akses ditolak: Hanya Administrator yang berwenang merekam/mereset biometrik siswa."
            }), 403

    # Proteksi Anti-Penyalahgunaan: Jika wajah sudah pernah terdaftar, tolak timpa data
    # KECUALI jika pemanggil terverifikasi sebagai Administrator
    if siswa.face_encoding and not is_admin:
        return jsonify({
            "success": False,
            "message": "Data wajah Anda sudah terdaftar dan terkunci demi keamanan presensi sekolah. Untuk merekam ulang foto wajah, silakan hubungi Admin Sekolah untuk melakukan reset biometrik."
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
    
    result = analyze_liveness(image_data)
    return jsonify(result)

