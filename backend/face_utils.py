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
            # Konversi skor cosine ke persentase akurasi (80% - 99.5%)
            norm_conf = (best_score - COSINE_THRESHOLD) / (1.0 - COSINE_THRESHOLD)
            confidence = round(min(99.5, max(80.0, 80.0 + norm_conf * 19.5)), 1)

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
                "message": "Wajah tidak cocok dengan data siswa yang terdaftar di database"
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


def analyze_liveness(base64_image):
    """
    Analisis Keaktifan Wajah Hidup (Eye Blink Liveness Detection).
    Memeriksa apakah mata pengguna terbuka (OPEN) atau tertutup/berkedip (CLOSED)
    menggunakan 5 titik landmark OpenCV YuNet yang dinormalisasi dengan intensitas kulit.
    """
    img = decode_base64_image(base64_image)
    if img is None:
        return {"face_detected": False, "eye_state": "UNKNOWN", "openness_score": 0.0}

    if detector is None:
        return {"face_detected": False, "eye_state": "UNKNOWN", "openness_score": 0.0}

    try:
        h, w = img.shape[:2]
        # Optimasi kecepatan ekstraksi: skala ke max 480px jika gambar resolusi tinggi
        scale = 1.0
        if max(w, h) > 480:
            scale = 480.0 / max(w, h)
            img = cv2.resize(img, (int(w * scale), int(h * scale)))
            h, w = img.shape[:2]

        detector.setInputSize((w, h))
        _, faces = detector.detect(img)

        if faces is None or len(faces) == 0:
            return {"face_detected": False, "eye_state": "UNKNOWN", "openness_score": 0.0}

        # Pilih wajah dengan skor confidence tertinggi
        best_face = faces[0]
        if len(faces) > 1:
            best_idx = np.argmax(faces[:, 14])
            best_face = faces[best_idx]

        fx, fy, fw, fh = best_face[0:4]
        re_x, re_y = int(best_face[4]), int(best_face[5])
        le_x, le_y = int(best_face[6]), int(best_face[7])

        # Radius crop mata proporsional: dipersempit vertikal ke atas agar TIDAK memotong alis
        ew = max(5, int(fw * 0.085))
        eh_top = max(2, int(fh * 0.032))     # Hanya mencakup kelopak mata atas, tidak mencapai alis
        eh_bottom = max(3, int(fh * 0.040))  # Mencakup batas kelopak bawah

        re_patch = img[max(0, re_y - eh_top):min(h, re_y + eh_bottom), max(0, re_x - ew):min(w, re_x + ew)]
        le_patch = img[max(0, le_y - eh_top):min(h, le_y + eh_bottom), max(0, le_x - ew):min(w, le_x + ew)]

        # Ambil sampel kecerahan kulit pipi/dahi sebagai referensi pencahayaan
        skin_y1 = max(0, int(fy + fh * 0.50))
        skin_y2 = min(h, int(fy + fh * 0.65))
        skin_x1 = max(0, int(fx + fw * 0.35))
        skin_x2 = min(w, int(fx + fw * 0.65))
        skin_patch = img[skin_y1:skin_y2, skin_x1:skin_x2]

        if skin_patch.size > 0:
            gray_skin = cv2.cvtColor(skin_patch, cv2.COLOR_BGR2GRAY)
            skin_mean = max(10.0, float(np.mean(gray_skin)))
        else:
            skin_mean = 120.0

        def calc_score(patch):
            if patch is None or patch.size == 0:
                return 0.0
            gray = cv2.cvtColor(patch, cv2.COLOR_BGR2GRAY)
            std_dev = float(np.std(gray))
            sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
            v_grad = float(np.mean(np.abs(sobely)))
            # Normalisasi terhadap kecerahan ruangan/kulit
            return (std_dev / skin_mean * 60.0) + (v_grad / skin_mean * 40.0)

        score_re = calc_score(re_patch)
        score_le = calc_score(le_patch)
        avg_score = (score_re + score_le) / 2.0

        # Ambang batas liveness kedipan yang presisi:
        # Mata terbuka menghasilkan skor ~16 - 55
        # Mata terpejam / berkedip menghasilkan skor ~3 - 10
        BLINK_THRESHOLD = 11.5
        eye_state = "OPEN" if avg_score >= BLINK_THRESHOLD else "CLOSED"

        return {
            "face_detected": True,
            "eye_state": eye_state,
            "openness_score": round(float(avg_score), 2),
            "confidence": round(float(best_face[14]), 3)
        }
    except Exception as e:
        print("Error analyze_liveness:", e)
        return {"face_detected": False, "eye_state": "UNKNOWN", "openness_score": 0.0, "error": str(e)}

