import os
import base64
import json
import cv2
import numpy as np

# Inisialisasi Model AI OpenCV YuNet (Face Detection) & SFace (Face Recognition)
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
YUNET_PATH = os.path.join(BASE_DIR, "models_weights", "face_detection_yunet_2023mar.onnx")
SFACE_PATH = os.path.join(BASE_DIR, "models_weights", "face_recognition_sface_2021dec.onnx")

detector = None
recognizer = None

try:
    if os.path.exists(YUNET_PATH) and os.path.exists(SFACE_PATH):
        # YuNet: Detektor wajah deep learning ultra cepat & akurat
        detector = cv2.FaceDetectorYN.create(
            model=YUNET_PATH,
            config="",
            input_size=(320, 320),
            score_threshold=0.6,
            nms_threshold=0.3,
            top_k=5000
        )
        # SFace: Model pengenal biometrik wajah (128-dimensi feature embedding)
        recognizer = cv2.FaceRecognizerSF.create(
            model=SFACE_PATH,
            config=""
        )
        print("SUCCESS: OpenCV YuNet & SFace AI models loaded successfully!")
    else:
        print(f"WARNING: Model ONNX tidak ditemukan di {YUNET_PATH} atau {SFACE_PATH}")
except Exception as e:
    print("ERROR loading YuNet/SFace:", e)


def decode_base64_image(base64_string):
    if not base64_string:
        return None
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    try:
        img_data = base64.b64decode(base64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception:
        return None


def get_face_encoding(base64_image):
    """
    Mendeteksi wajah pada foto dan mengekstrak 128-d feature embedding menggunakan SFace.
    Mengembalikan array list 128 float yang siap disimpan di database.
    """
    img = decode_base64_image(base64_image)
    if img is None:
        return None

    if detector is None or recognizer is None:
        print("WARNING: Detektor atau recognizer belum dimuat.")
        return None

    try:
        h, w = img.shape[:2]
        detector.setInputSize((w, h))
        _, faces = detector.detect(img)

        if faces is None or len(faces) == 0:
            return None

        # Pilih wajah dengan skor deteksi tertinggi
        best_face = faces[0]
        if len(faces) > 1:
            best_idx = np.argmax(faces[:, 14])
            best_face = faces[best_idx]

        # Penjajaran wajah (align & crop) berdasarkan 5 landmark wajah (mata, hidung, mulut)
        aligned_face = recognizer.alignCrop(img, best_face)
        # Ekstraksi representasi biometrik 128-dimensi
        feature = recognizer.feature(aligned_face)

        if feature is not None and len(feature) > 0:
            return feature[0].tolist()
        return None
    except Exception as e:
        print("Error get_face_encoding:", e)
        return None


def verify_face(base64_image, known_encodings_list, siswa_ids):
    """
    Mencocokkan wajah dari kamera secara real-time dengan database biometrik siswa.
    Menggunakan Cosine Similarity pada embedding SFace.
    """
    img = decode_base64_image(base64_image)
    if img is None:
        return {"success": False, "message": "Gambar kamera tidak valid atau kosong"}

    if detector is None or recognizer is None:
        return {
            "success": False,
            "message": "Model biometrik AI wajah belum siap di server backend"
        }

    if not known_encodings_list or not siswa_ids:
        return {
            "success": False,
            "message": "Belum ada data biometrik wajah siswa yang terdaftar di database."
        }

    try:
        h, w = img.shape[:2]
        detector.setInputSize((w, h))
        _, faces = detector.detect(img)

        if faces is None or len(faces) == 0:
            return {
                "success": False,
                "message": "Wajah tidak terdeteksi di kamera. Posisikan wajah tegak di depan kamera."
            }

        # Ambil wajah paling dominan
        best_face = faces[0]
        if len(faces) > 1:
            best_idx = np.argmax(faces[:, 14])
            best_face = faces[best_idx]

        aligned_face = recognizer.alignCrop(img, best_face)
        unknown_feature = recognizer.feature(aligned_face)

        # Ambang batas Cosine Similarity SFace standar resmi OpenCV: 0.363
        # Skor > 0.363 menyatakan orang yang sama (identik).
        COSINE_THRESHOLD = 0.363

        best_score = -1.0
        best_siswa_id = None

        for idx, enc in enumerate(known_encodings_list):
            if not enc or len(enc) != 128:
                continue
            enc_np = np.array(enc, dtype=np.float32).reshape(1, 128)
            score = recognizer.match(enc_np, unknown_feature, cv2.FaceRecognizerSF_FR_COSINE)
            if score > best_score:
                best_score = score
                best_siswa_id = siswa_ids[idx]

        if best_siswa_id is not None and best_score >= COSINE_THRESHOLD:
            # Konversi skor cosine ke persentase akurasi (65% - 99.5%)
            norm_conf = (best_score - COSINE_THRESHOLD) / (1.0 - COSINE_THRESHOLD)
            confidence = round(min(99.5, max(65.0, 65.0 + norm_conf * 34.5)), 1)

            return {
                "success": True,
                "siswa_id": best_siswa_id,
                "confidence": confidence,
                "score": round(float(best_score), 4),
                "message": f"Wajah terverifikasi cocok ({confidence}%)"
            }
        else:
            return {
                "success": False,
                "message": "Wajah tidak cocok dengan data siswa terdaftar di database (kemiripan di bawah batas)"
            }
    except Exception as e:
        print("Error verify_face:", e)
        return {
            "success": False,
            "message": f"Terjadi kesalahan saat mencocokkan wajah: {str(e)}"
        }


def check_face_present(base64_image):
    """
    Pengecekan cepat apakah ada wajah di depan kamera untuk presence gating (hitung mundur 3s).
    Menggunakan deteksi resolusi kecil agar sangat ringan dan cepat (<10ms).
    """
    img = decode_base64_image(base64_image)
    if img is None:
        return False

    if detector is None:
        return False

    try:
        h, w = img.shape[:2]
        scale = 320.0 / max(w, h)
        small = cv2.resize(img, (int(w * scale), int(h * scale)))
        sh, sw = small.shape[:2]

        detector.setInputSize((sw, sh))
        _, faces = detector.detect(small)
        return faces is not None and len(faces) > 0
    except Exception:
        return False
