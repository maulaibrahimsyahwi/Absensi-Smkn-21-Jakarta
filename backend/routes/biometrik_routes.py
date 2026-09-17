import json
from flask import Blueprint, request, jsonify
from models import db, Siswa
from face_utils import get_face_encoding, check_face_present, analyze_liveness

biometrik_bp = Blueprint('biometrik', __name__)

# ================= REGISTRASI SAMPEL WAJAH (MULTI-SAMPLE) =================

@biometrik_bp.route('/api/register_face', methods=['POST'])
def register_face():
    data = request.json or {}
    siswa_id = data.get('siswa_id')
    
    # Mendukung array beberapa foto sampel (images) atau single (image)
    images = data.get('images', [])
    if not images and data.get('image'):
        images = [data.get('image')]
        
    siswa = Siswa.query.get(siswa_id)
    if not siswa:
        return jsonify({"success": False, "message": "Siswa tidak ditemukan"}), 404
        
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
        return jsonify({
            "success": True, 
            "message": f"Berhasil menyimpan {len(encodings)} sampel biometrik wajah untuk {siswa.nama}."
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


# ================= DETEKSI KEHADIRAN ORANG & LIVENESS KEDIPAN =================

@biometrik_bp.route('/api/detect_face', methods=['POST'])
def detect_face():
    data = request.json or {}
    image_data = data.get('image')
    if not image_data:
        return jsonify({"face_detected": False})
    
    is_present = check_face_present(image_data)
    return jsonify({"face_detected": is_present})


@biometrik_bp.route('/api/detect_liveness', methods=['POST'])
def detect_liveness():
    data = request.json or {}
    image_data = data.get('image')
    if not image_data:
        return jsonify({"face_detected": False, "eye_state": "UNKNOWN", "openness_score": 0.0})
    
    result = analyze_liveness(image_data)
    return jsonify(result)

