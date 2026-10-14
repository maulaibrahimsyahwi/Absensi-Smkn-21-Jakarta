import os
import base64
import json
import struct
import threading
import cv2
import numpy as np

# Wajib: Cegah OpenCV membuat thread pool internal (OpenMP/TBB) di dalam worker thread Waitress
# Menghindari CPU thrashing dan perebutan Python GIL saat 16 thread aktif bersamaan
cv2.setNumThreads(1)
try:
    cv2.ocl.setUseOpenCL(False)
except Exception:
    pass

# Inisialisasi Model AI OpenCV YuNet (Face Detection) & SFace (Face Recognition)
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
YUNET_PATH = os.path.join(BASE_DIR, "models_weights", "face_detection_yunet_2023mar.onnx")
SFACE_PATH = os.path.join(BASE_DIR, "models_weights", "face_recognition_sface_2021dec.onnx")

# Thread-Local Storage (TLS) untuk isolasi model AI per Worker Thread (Multi-threading safe)
_tls = threading.local()

def get_detector():
    """Mengembalikan instance FaceDetectorYN unik per worker thread agar thread-safe tanpa race condition."""
    if not hasattr(_tls, 'detector') or _tls.detector is None:
        if os.path.exists(YUNET_PATH):
            _tls.detector = cv2.FaceDetectorYN.create(
                model=YUNET_PATH,
                config="",
                input_size=(320, 320),
                score_threshold=0.6,
                nms_threshold=0.3,
                top_k=5000
            )
        else:
            _tls.detector = None
    return _tls.detector

def get_recognizer():
    """Mengembalikan instance FaceRecognizerSF unik per worker thread agar thread-safe tanpa race condition."""
    if not hasattr(_tls, 'recognizer') or _tls.recognizer is None:
        if os.path.exists(SFACE_PATH):
            _tls.recognizer = cv2.FaceRecognizerSF.create(
                model=SFACE_PATH,
                config=""
            )
        else:
            _tls.recognizer = None
    return _tls.recognizer

# Inisialisasi awal & verifikasi model saat modul diimpor
try:
    if os.path.exists(YUNET_PATH) and os.path.exists(SFACE_PATH):
        get_detector()
        get_recognizer()
        print("SUCCESS: OpenCV YuNet & SFace AI models loaded successfully (Thread-Isolated Ready)!")
    else:
        print(f"WARNING: Model ONNX tidak ditemukan di {YUNET_PATH} atau {SFACE_PATH}")
except Exception as e:
    print("ERROR loading YuNet/SFace:", e)


MAX_IMAGE_B64_LEN = 2 * 1024 * 1024  # Batas maksimal 2 MB string base64 untuk mencegah DoS/OOM
MAX_PIXELS_ALLOWED = 2560 * 1920     # ~5 Megapixels (Mencegah Decompression Bomb)
MAX_DIM_ALLOWED = 4096
MAX_DETECT_DIM = 640  # Batas dimensi deteksi YuNet agar waktu inferensi konsisten <15ms

# Adaptive Histogram Equalization untuk normalisasi pencahayaan wajah remang-remang/backlight
_clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8))
_GAMMA_BASE = np.arange(256, dtype=np.float32) / 255.0

def preprocess_illumination(img):
    """
    Normalisasi pencahayaan adaptif (Adaptive CLAHE + Low-Light Gamma Boost).
    Menyeimbangkan pencahayaan pada kondisi pagi hari remang-remang (05:00-06:00 WIB),
    backlight (silau dari belakang), serta memitigasi bayangan tajam pada wajah (<10ms).
    """
    if img is None or img.size == 0:
        return img
    try:
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        mean_l = float(np.mean(l))
        
        # Jika cahaya sangat minim (mean luminance < 55), terapkan gamma boost
        if mean_l < 55.0:
            gamma = max(0.65, min(0.9, (mean_l / 55.0) ** 0.5))
            table = (_GAMMA_BASE ** gamma * 255.0).astype(np.uint8)
            l = cv2.LUT(l, table)
            
        l_clahe = _clahe.apply(l)
        lab_clahe = cv2.merge((l_clahe, a, b))
        return cv2.cvtColor(lab_clahe, cv2.COLOR_LAB2BGR)
    except Exception:
        return img

# Pre-warm kernel CLAHE & OpenCV LAB color space agar inferensi pertama tidak cold-start
try:
    _dummy = np.zeros((64, 64, 3), dtype=np.uint8)
    preprocess_illumination(_dummy)
except Exception:
    pass

def _detect_best_face_fast(img, detector):
    """
    Mendeteksi wajah pada citra yang dinormalisasi ukurannya, lalu mengembalikan
    koordinat bounding box & 5 landmark (indeks 0..13) yang dipetakan kembali ke skala gambar asli
    untuk proses alignCrop SFace.
    """
    h, w = img.shape[:2]
    scale = 1.0
    if max(w, h) > MAX_DETECT_DIM:
        scale = MAX_DETECT_DIM / float(max(w, h))
        det_img = cv2.resize(img, (int(w * scale), int(h * scale)))
    else:
        det_img = img

    dh, dw = det_img.shape[:2]
    detector.setInputSize((dw, dh))
    _, faces = detector.detect(det_img)

    if faces is None or len(faces) == 0:
        return None

    # Kembalikan koordinat bounding box & 5 landmark (indeks 0..13) ke skala gambar asli untuk alignCrop SFace
    if scale != 1.0:
        faces = faces.copy()
        faces[:, :14] /= scale
    return faces

def decode_base64_image(base64_string):
    if not base64_string or not isinstance(base64_string, str):
        return None
    if len(base64_string) > MAX_IMAGE_B64_LEN:
        return None
    comma_idx = base64_string.find(',')
    if comma_idx != -1:
        base64_string = base64_string[comma_idx + 1:]
    try:
        img_data = base64.b64decode(base64_string)
        if len(img_data) < 16:
            return None

        # Cek Decompression Bomb via Header Bytes:
        # 1. Deteksi PNG: Signature 8 bytes (\x89PNG\r\n\x1a\n) diikuti IHDR chunk
        if img_data.startswith(b'\x89PNG\r\n\x1a\n') and len(img_data) >= 24:
            w, h = struct.unpack('>II', img_data[16:24])
            if w > MAX_DIM_ALLOWED or h > MAX_DIM_ALLOWED or (w * h) > MAX_PIXELS_ALLOWED:
                return None
        # 2. Deteksi JPEG: Signature \xff\xd8, periksa frame marker SOF0 (\xff\xc0) atau SOF2 (\xff\xc2)
        elif img_data.startswith(b'\xff\xd8'):
            idx = 2
            data_len = len(img_data)
            while idx + 9 < data_len:
                if img_data[idx] != 0xFF:
                    break
                marker = img_data[idx + 1]
                if marker in (0xC0, 0xC1, 0xC2):
                    h, w = struct.unpack('>HH', img_data[idx + 5:idx + 9])
                    if w > MAX_DIM_ALLOWED or h > MAX_DIM_ALLOWED or (w * h) > MAX_PIXELS_ALLOWED:
                        return None
                    break
                elif marker in (0xD9, 0xDA):
                    break
                else:
                    segment_len = struct.unpack('>H', img_data[idx + 2:idx + 4])[0]
                    idx += 2 + segment_len

        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        del img_data, nparr  # Segera bebaskan buffer biner dari memori

        if img is None:
            return None

        ih, iw = img.shape[:2]
        if iw > MAX_DIM_ALLOWED or ih > MAX_DIM_ALLOWED or (iw * ih) > MAX_PIXELS_ALLOWED:
            del img
            return None

        # Downscale langsung jika resolusi lebih besar dari 640px untuk menghemat memori runtime
        if max(iw, ih) > MAX_DETECT_DIM:
            scale = MAX_DETECT_DIM / float(max(iw, ih))
            img = cv2.resize(img, (int(iw * scale), int(ih * scale)), interpolation=cv2.INTER_AREA)

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

    detector = get_detector()
    recognizer = get_recognizer()
    if detector is None or recognizer is None:
        print("WARNING: Detektor atau recognizer belum dimuat.")
        return None

    try:
        faces = _detect_best_face_fast(img, detector)
        if faces is None or len(faces) == 0:
            proc_img = preprocess_illumination(img)
            faces = _detect_best_face_fast(proc_img, detector)

        if faces is None or len(faces) == 0:
            return None

        # Pilih wajah dengan skor deteksi tertinggi
        best_face = faces[0]
        if len(faces) > 1:
            best_idx = np.argmax(faces[:, 14])
            best_face = faces[best_idx]

        # Penjajaran wajah (align & crop) berdasarkan 5 landmark wajah (mata, hidung, mulut)
        crop_source = preprocess_illumination(img) if float(np.mean(img)) < 55.0 else img
        aligned_face = recognizer.alignCrop(crop_source, best_face)
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
    Menggunakan operasi perkalian matriks vektorisasi NumPy (BLAS) berkecepatan tinggi (<1ms)
    dan Centroid Matching untuk stabilitas terhadap variasi penampilan (rambut/hijab).
    """
    img = decode_base64_image(base64_image)
    if img is None:
        return {"success": False, "message": "Gambar kamera tidak valid atau kosong"}

    detector = get_detector()
    recognizer = get_recognizer()
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
        faces = _detect_best_face_fast(img, detector)
        if faces is None or len(faces) == 0:
            proc_img = preprocess_illumination(img)
            faces = _detect_best_face_fast(proc_img, detector)

        if faces is None or len(faces) == 0:
            return {
                "success": False,
                "message": "Wajah tidak terdeteksi di kamera. Posisikan wajah tegak di depan kamera"
            }

        # Anti-proxy: Tolak jika terdeteksi lebih dari satu wajah signifikan di depan kamera
        if len(faces) > 1:
            areas = faces[:, 2] * faces[:, 3]
            max_idx = int(np.argmax(areas))
            max_area = float(areas[max_idx])
            significant_other_faces = [a for idx, a in enumerate(areas) if idx != max_idx and a >= 0.35 * max_area]
            if len(significant_other_faces) > 0:
                return {
                    "success": False,
                    "message": "Terdeteksi lebih dari satu wajah di depan kamera. Pastikan hanya ada satu siswa di dalam frame."
                }
            best_face = faces[max_idx]
        else:
            best_face = faces[0]

        crop_source = preprocess_illumination(img) if float(np.mean(img)) < 55.0 else img
        aligned_face = recognizer.alignCrop(crop_source, best_face)
        unknown_feature = recognizer.feature(aligned_face)

        # Ambang batas Cosine Similarity SFace standar resmi OpenCV: 0.363
        COSINE_THRESHOLD = 0.363

        # Vektorisasi Matriks Cosine Similarity untuk 1:N Super Cepat
        q = unknown_feature.flatten().astype(np.float32)
        norm_q = np.linalg.norm(q)
        if norm_q > 0:
            q = q / norm_q

        if isinstance(known_encodings_list, np.ndarray) and getattr(known_encodings_list, '_is_normalized', False):
            known_mat = known_encodings_list
        else:
            known_mat = np.array(known_encodings_list, dtype=np.float32)
            norms = np.linalg.norm(known_mat, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            known_mat = known_mat / norms

        scores = np.dot(known_mat, q)
        best_idx = int(np.argmax(scores))
        best_score = float(scores[best_idx])
        best_siswa_id = siswa_ids[best_idx]

        # Centroid matching untuk siswa dengan multiple samples (variasi hijab/rambut/pencahayaan)
        matching_indices = [i for i, sid in enumerate(siswa_ids) if sid == best_siswa_id]
        if len(matching_indices) > 1:
            student_samples = known_mat[matching_indices]
            centroid = np.mean(student_samples, axis=0)
            norm_c = np.linalg.norm(centroid)
            if norm_c > 0:
                centroid = centroid / norm_c
            centroid_score = float(np.dot(centroid, q))
            effective_score = max(best_score, 0.75 * best_score + 0.25 * centroid_score)
        else:
            effective_score = best_score

        # Hitung margin pemisahan terhadap siswa lain untuk mencegah false positive ambigu
        other_scores = [float(scores[i]) for i in range(len(scores)) if siswa_ids[i] != best_siswa_id]
        second_best_score = max(other_scores) if other_scores else -1.0
        margin = effective_score - second_best_score

        if effective_score >= COSINE_THRESHOLD:
            if second_best_score >= COSINE_THRESHOLD and margin < 0.04:
                return {
                    "success": False,
                    "message": "Wajah terdeteksi memiliki kemiripan tinggi dengan dua siswa berbeda. Posisikan wajah lebih dekat ke kamera."
                }

            # Konversi skor cosine ke persentase akurasi (80% - 99.5%)
            norm_conf = (effective_score - COSINE_THRESHOLD) / (1.0 - COSINE_THRESHOLD)
            confidence = round(min(99.5, max(80.0, 80.0 + norm_conf * 19.5)), 1)

            return {
                "success": True,
                "siswa_id": best_siswa_id,
                "confidence": confidence,
                "score": round(effective_score, 4),
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

    detector = get_detector()
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


def analyze_liveness(base64_image, baseline_open=None):
    """
    Analisis Keaktifan Wajah Hidup (Eye Blink Liveness Detection & Anti-Spoofing ISO 30107-3).
    Memeriksa:
    1. Passive Screen-Spoof Filter: Menolak replay video/foto layar HP (specular glare ratio > 0.18).
    2. Motion Blur Gate: Menolak kedipan palsu foto digoyang / Warped Print (Laplacian variance < 7.5).
    3. Eyeglasses Glare Clipping: Menghapus pantulan silau lensa kacamata agar tidak menahan status 'OPEN'.
    4. Adaptive CLAHE & Low-Light Boost: Menormalkan pencahayaan remang-remang (05:00-06:00 WIB).
    5. Geometri 3D & Rasio Yaw 5-Landmark YuNet: Memverifikasi sudut orientasi wajah.
    6. Sinkronisasi Ambang Kedipan: Ambang relatif (<= 0.72 * baseline_open) + absolut (< 11.5).
    """
    img = decode_base64_image(base64_image)
    if img is None:
        return {"face_detected": False, "eye_state": "UNKNOWN", "openness_score": 0.0}

    detector = get_detector()
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

        proc_img = preprocess_illumination(img)

        detector.setInputSize((w, h))
        _, faces = detector.detect(proc_img)
        if faces is None or len(faces) == 0:
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
        nose_x, nose_y = int(best_face[8]), int(best_face[9])

        # Radius crop mata proporsional: dipersempit vertikal ke atas agar TIDAK memotong alis
        ew = max(5, int(fw * 0.085))
        eh_top = max(2, int(fh * 0.032))     # Hanya mencakup kelopak mata atas, tidak mencapai alis
        eh_bottom = max(3, int(fh * 0.040))  # Mencakup batas kelopak bawah

        re_patch = proc_img[max(0, re_y - eh_top):min(h, re_y + eh_bottom), max(0, re_x - ew):min(w, re_x + ew)]
        le_patch = proc_img[max(0, le_y - eh_top):min(h, le_y + eh_bottom), max(0, le_x - ew):min(w, le_x + ew)]

        # Ambil sampel kecerahan kulit pipi/dahi sebagai referensi pencahayaan (dari citra asli untuk deteksi glare layar)
        skin_y1 = max(0, int(fy + fh * 0.50))
        skin_y2 = min(h, int(fy + fh * 0.65))
        skin_x1 = max(0, int(fx + fw * 0.35))
        skin_x2 = min(w, int(fx + fw * 0.65))
        raw_skin_patch = img[skin_y1:skin_y2, skin_x1:skin_x2]

        if raw_skin_patch.size > 0:
            gray_raw_skin = cv2.cvtColor(raw_skin_patch, cv2.COLOR_BGR2GRAY)
            skin_mean = max(10.0, float(np.mean(gray_raw_skin)))

            # 1. Anti-Spoofing: Passive Screen-Spoof / Specular Screen Glare Filter
            glare_pixels = int(np.sum(gray_raw_skin >= 250))
            glare_ratio = float(glare_pixels) / float(gray_raw_skin.size)
            if glare_ratio > 0.18:
                return {
                    "face_detected": True,
                    "eye_state": "SPOOF_SCREEN_GLARE",
                    "openness_score": 0.0,
                    "is_spoof": True,
                    "message": "Terdeteksi pantulan layar digital (Screen Spoof). Gunakan wajah asli langsung di depan kamera."
                }

            # 2. Anti-Spoofing: Motion Blur Gate (Mencegah kedipan palsu foto digoyang / Warped Print)
            face_sharpness = float(cv2.Laplacian(gray_raw_skin, cv2.CV_64F).var())
        else:
            skin_mean = 120.0
            face_sharpness = 25.0
            glare_ratio = 0.0

        is_motion_blurred = face_sharpness < 7.5

        # 3. 3D Head Geometry & Yaw Ratio dari 5 Landmark YuNet
        eye_dist = float(np.hypot(le_x - re_x, le_y - re_y))
        d_r = float(np.hypot(nose_x - re_x, nose_y - re_y))
        d_l = float(np.hypot(nose_x - le_x, nose_y - le_y))
        yaw_ratio = round(d_r / max(1.0, d_l), 3)

        def calc_score(patch):
            if patch is None or patch.size == 0:
                return 0.0
            gray = cv2.cvtColor(patch, cv2.COLOR_BGR2GRAY)
            # Supresi noise sensor kamera di ruang gelap
            gray = cv2.GaussianBlur(gray, (3, 3), 0)

            # Supresi pantulan silau lensa kacamata (Eyeglasses glare clipping)
            glare_thresh = min(235.0, max(120.0, skin_mean * 1.75))
            glare_mask = gray > glare_thresh
            if np.any(glare_mask):
                med_val = np.median(gray[~glare_mask]) if np.any(~glare_mask) else skin_mean
                gray = gray.copy()
                gray[glare_mask] = int(med_val)

            std_dev = float(np.std(gray))
            sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
            v_grad = float(np.mean(np.abs(sobely)))
            effective_skin = max(45.0, skin_mean)
            return (std_dev / effective_skin * 60.0) + (v_grad / effective_skin * 40.0)

        score_re = calc_score(re_patch)
        score_le = calc_score(le_patch)
        avg_score = (score_re + score_le) / 2.0

        # Sinkronisasi Ambang Batas Kedipan (Frontend & Backend)
        BLINK_THRESHOLD = 11.5
        is_closed_abs = avg_score < BLINK_THRESHOLD
        is_closed_rel = (
            baseline_open is not None and
            baseline_open >= 13.0 and
            avg_score <= baseline_open * 0.72
        )

        # Evaluasi Keadaan Mata dengan Filter Anti-Spoof
        if is_motion_blurred and (is_closed_abs or is_closed_rel):
            # Tolak kedipan palsu yang disebabkan oleh motion blur (foto cetak digoyang)
            eye_state = "MOTION_BLUR"
        elif is_closed_abs or is_closed_rel:
            eye_state = "CLOSED"
        else:
            eye_state = "OPEN"

        return {
            "face_detected": True,
            "eye_state": eye_state,
            "openness_score": round(float(avg_score), 2),
            "confidence": round(float(best_face[14]), 3),
            "yaw_ratio": yaw_ratio,
            "eye_distance": round(eye_dist, 1),
            "face_sharpness": round(face_sharpness, 1),
            "is_spoof": False
        }
    except Exception as e:
        print("Error analyze_liveness:", e)
        return {"face_detected": False, "eye_state": "UNKNOWN", "openness_score": 0.0, "error": str(e)}

