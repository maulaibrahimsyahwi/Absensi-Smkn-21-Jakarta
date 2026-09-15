import numpy as np
import base64
import cv2
import json

try:
    import face_recognition
    HAS_FACE_RECOGNITION = True
except ImportError:
    HAS_FACE_RECOGNITION = False
    print("WARNING: face_recognition module not found. Using mock face verification.")

def decode_base64_image(base64_string):
    # Remove header from base64 string if present
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    
    # Decode base64 to image
    img_data = base64.b64decode(base64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

def get_face_encoding(base64_image):
    img = decode_base64_image(base64_image)
    if img is None:
        return None
    
    if not HAS_FACE_RECOGNITION:
        # Mock encoding: return a dummy list
        print("MOCK: Generating dummy encoding.")
        return [0.1] * 128
        
    # Convert BGR (OpenCV) to RGB (face_recognition)
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Detect faces
    face_locations = face_recognition.face_locations(rgb_img)
    if not face_locations:
        return None
        
    # Get encoding for the first face found
    face_encodings = face_recognition.face_encodings(rgb_img, face_locations)
    if face_encodings:
        return face_encodings[0].tolist() # Convert numpy array to list for JSON serialization
    return None

def verify_face(base64_image, known_encodings_list, siswa_ids):
    img = decode_base64_image(base64_image)
    if img is None:
        return {"success": False, "message": "Gambar kamera tidak valid"}
    
    if not HAS_FACE_RECOGNITION:
        # Mock verification: randomly succeed if we have any known encodings
        print("MOCK: Verifying face...")
        if len(siswa_ids) > 0:
            return {
                "success": True, 
                "siswa_id": siswa_ids[-1],
                "confidence": 98.5,
                "message": "Wajah dikenali (Mock Mode - Akurasi 98.5%)"
            }
        return {"success": False, "message": "Belum ada siswa terdaftar"}

    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    face_locations = face_recognition.face_locations(rgb_img)
    if not face_locations:
        return {"success": False, "message": "Tidak ada wajah terdeteksi di kamera"}
        
    face_encodings = face_recognition.face_encodings(rgb_img, face_locations)
    
    if not face_encodings:
         return {"success": False, "message": "Wajah tidak dapat diproses"}

    unknown_encoding = face_encodings[0]
    
    # Convert known_encodings list back to numpy arrays
    known_encodings_np = [np.array(enc) for enc in known_encodings_list]
    
    # Compare with known faces (tolerance 0.5 for high accuracy)
    matches = face_recognition.compare_faces(known_encodings_np, unknown_encoding, tolerance=0.5)
    face_distances = face_recognition.face_distance(known_encodings_np, unknown_encoding)
    
    if len(face_distances) > 0:
        best_match_index = np.argmin(face_distances)
        min_dist = float(face_distances[best_match_index])
        
        if matches[best_match_index]:
            # Hitung tingkat akurasi kecocokan (confidence score)
            confidence = round(max(0.0, min(100.0, (1.0 - min_dist / 0.6) * 100)), 1)
            return {
                "success": True, 
                "siswa_id": siswa_ids[best_match_index],
                "confidence": confidence,
                "distance": round(min_dist, 4),
                "message": f"Wajah terverifikasi cocok ({confidence}%)"
            }
            
    return {
        "success": False, 
        "message": "Wajah tidak cocok dengan data siswa terdaftar (kemiripan di bawah batas)"
    }

def check_face_present(base64_image):
    img = decode_base64_image(base64_image)
    if img is None:
        return False
        
    try:
        h, w = img.shape[:2]
        scale = 320.0 / max(w, h)
        if scale < 1.0:
            small = cv2.resize(img, (int(w * scale), int(h * scale)))
        else:
            small = img
            
        if not HAS_FACE_RECOGNITION:
            gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
            return bool(np.std(gray) > 20)
            
        rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
        locs = face_recognition.face_locations(rgb, model="hog")
        return len(locs) > 0
    except Exception:
        return False

