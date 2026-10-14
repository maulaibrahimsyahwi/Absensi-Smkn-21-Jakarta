import os
import re
import uuid
import base64
from datetime import datetime
from config import BASE_DIR

UPLOADS_BASE = os.path.join(BASE_DIR, 'static', 'uploads')
SIGNATURES_DIR = os.path.join(UPLOADS_BASE, 'signatures')
AVATARS_DIR = os.path.join(UPLOADS_BASE, 'avatars')
SURAT_DIR = os.path.join(UPLOADS_BASE, 'surat')
SURAT_EDARAN_DIR = os.path.join(UPLOADS_BASE, 'surat_edaran')

for d in [UPLOADS_BASE, SIGNATURES_DIR, AVATARS_DIR, SURAT_DIR, SURAT_EDARAN_DIR]:
    os.makedirs(d, exist_ok=True)

ALLOWED_SUBFOLDERS = {
    'signatures': {'max_bytes': 250 * 1024, 'allow_pdf': False},
    'avatars': {'max_bytes': 600 * 1024, 'allow_pdf': False},
    'surat': {'max_bytes': 5 * 1024 * 1024, 'allow_pdf': True},
    'surat_edaran': {'max_bytes': 10 * 1024 * 1024, 'allow_pdf': True},
}

# Daftar tag berbahaya pada dokumen PDF (mencegah PDF XSS / Launch Action / Polyglot)
DANGEROUS_PDF_PATTERNS = re.compile(
    rb'/(JavaScript|JS|Launch|EmbeddedFiles|RichMedia|XFA|AA|OpenAction)\b',
    re.IGNORECASE
)

MAX_IMAGE_DIMENSION = 4096  # Cegah Image Decompression Bomb (Pixel Flood)


def save_base64_file(base64_str, subfolder='signatures', prefix='file', watermark_text=None):
    """
    Menyimpan Data URI Base64 ke disk server dengan validasi keamanan berlapis (OWASP File Upload):
    1. Validasi Subfolder & Ukuran Maksimum per Kategori
    2. Validasi Ketat Magic Bytes (PNG, JPEG, WEBP, dan PDF opsional)
    3. Sanitasi PDF (blokir /JavaScript, /Launch, /OpenAction) & Re-encoding Citra via OpenCV (100% bebas EXIF/Polyglot)
    4. Sanitasi Nama File (UUID + Alphanumeric Prefix) & Proteksi Path Traversal

    Mengembalikan path URL relatif jika sukses, atau None jika tidak valid.
    """
    if not base64_str or not isinstance(base64_str, str):
        return None

    if subfolder not in ALLOWED_SUBFOLDERS:
        print(f"[SECURITY ALERT] Subfolder upload '{subfolder}' tidak diizinkan.")
        return None

    policy = ALLOWED_SUBFOLDERS[subfolder]
    max_bytes = policy['max_bytes']
    allow_pdf = policy['allow_pdf']

    # Wajib berformat Data URI (data:<mime>;base64,<payload>) — menolak path/URL eksternal
    if not base64_str.startswith('data:') or ';base64,' not in base64_str[:100]:
        print(f"[SECURITY ALERT] Format input pada '{subfolder}' bukan Data URI Base64 yang sah.")
        return None

    try:
        header, encoded = base64_str.split(',', 1)

        # Cegah DoS memori sebelum dekode base64 (ukuran base64 ~ 4/3 ukuran biner)
        if len(encoded) > int(max_bytes * 1.4) + 1024:
            print(f"[SECURITY ALERT] Payload Base64 pada '{subfolder}' melebihi batas ukuran ({max_bytes} bytes).")
            return None

        file_bytes = base64.b64decode(encoded, validate=True)
        if len(file_bytes) == 0 or len(file_bytes) > max_bytes:
            print(f"[SECURITY ALERT] Ukuran biner '{subfolder}' ({len(file_bytes)} B) di luar batas.")
            return None

        # 1. Validasi Magic Bytes Biner (File Signature)
        is_png = file_bytes.startswith(b'\x89PNG\r\n\x1a\n')
        is_jpeg = file_bytes.startswith(b'\xff\xd8\xff')
        is_webp = file_bytes.startswith(b'RIFF') and len(file_bytes) >= 12 and file_bytes[8:12] == b'WEBP'
        is_pdf = allow_pdf and file_bytes.startswith(b'%PDF-1.') and (b'%%EOF' in file_bytes[-1024:])

        if not (is_png or is_jpeg or is_webp or is_pdf):
            print(f"[SECURITY ALERT] Magic bytes biner tidak sah pada '{subfolder}'.")
            return None

        target_dir = os.path.realpath(os.path.join(UPLOADS_BASE, subfolder))
        os.makedirs(target_dir, exist_ok=True)

        # 2A. Jika Berkas adalah PDF (Khusus Surat Izin / Surat Dokter / Surat Edaran)
        if is_pdf:
            if DANGEROUS_PDF_PATTERNS.search(file_bytes):
                print("[SECURITY ALERT] Dokumen PDF mengandung objek aktif/script berbahaya. Ditolak!")
                return None
            ext = 'pdf'
        else:
            # 2B. Jika Berkas adalah Citra (PNG / JPEG / WEBP): Dekode & Re-encode via OpenCV
            import cv2
            import numpy as np

            ext = 'jpg' if is_jpeg else ('webp' if is_webp else 'png')
            np_arr = np.frombuffer(file_bytes, np.uint8)
            read_flag = cv2.IMREAD_UNCHANGED if subfolder == 'signatures' else cv2.IMREAD_COLOR
            img = cv2.imdecode(np_arr, read_flag)

            if img is None or img.size == 0:
                print(f"[SECURITY ALERT] Gagal mendekode struktur piksel citra pada '{subfolder}'.")
                return None

            h, w = img.shape[:2]
            if h > MAX_IMAGE_DIMENSION or w > MAX_IMAGE_DIMENSION or (h * w) > 12_000_000:
                print(f"[SECURITY ALERT] Dimensi citra terlalu ekstrem ({w}x{h}). Indikasi Decompression Bomb.")
                return None

            # Watermarking Kontekstual UU PDP untuk Surat Bukti Medis/Izin
            if watermark_text and subfolder == 'surat':
                try:
                    overlay = img.copy()
                    font = cv2.FONT_HERSHEY_SIMPLEX
                    scale = max(0.45, min(w / 750.0, 1.1))
                    thickness = max(1, int(scale * 2))
                    (tw, th), _ = cv2.getTextSize(watermark_text, font, scale, thickness)
                    tx, ty = max(10, (w - tw) // 2), max(th + 10, h // 2)
                    cv2.putText(overlay, watermark_text, (tx, ty), font, scale, (0, 0, 220), thickness, cv2.LINE_AA)

                    # Footer proteksi tambahan
                    footer_text = "VERIFIKASI RESMI SMKN 21 JAKARTA - TIDAK BERLAKU DI LUAR SEKOLAH"
                    f_scale = max(0.35, min(w / 1100.0, 0.75))
                    (fw, fh), _ = cv2.getTextSize(footer_text, font, f_scale, 1)
                    fx = max(10, (w - fw) // 2)
                    fy = h - 12

                    cv2.rectangle(overlay, (0, max(0, h - 30)), (w, h), (20, 20, 20), -1)
                    cv2.putText(overlay, footer_text, (fx, fy), font, f_scale, (255, 255, 255), 1, cv2.LINE_AA)

                    cv2.addWeighted(overlay, 0.32, img, 0.68, 0, img)
                except Exception:
                    pass

            # Re-encode citra: menghancurkan 100% metadata EXIF dan payload poliglot tersembunyi
            encode_ext = f".{ext}"
            encode_params = (
                [cv2.IMWRITE_JPEG_QUALITY, 85] if ext == 'jpg' else
                ([cv2.IMWRITE_WEBP_QUALITY, 85] if ext == 'webp' else [cv2.IMWRITE_PNG_COMPRESSION, 6])
            )
            success, enc_buf = cv2.imencode(encode_ext, img, encode_params)
            if not success:
                return None
            file_bytes = enc_buf.tobytes()

        # 3. Sanitasi Nama File & Verifikasi Kanonik Path Traversal
        clean_prefix = re.sub(r'[^a-zA-Z0-9_-]', '', str(prefix or 'file'))[:40] or 'file'
        filename = f"{clean_prefix}_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:12]}.{ext}"
        filepath = os.path.realpath(os.path.join(target_dir, filename))

        if not filepath.startswith(target_dir + os.sep):
            print("[SECURITY ALERT] Percobaan Path Traversal terdeteksi dan diblokir!")
            return None

        with open(filepath, 'wb') as f:
            f.write(file_bytes)

        return f"/static/uploads/{subfolder}/{filename}"
    except Exception as e:
        print(f"[FILE_STORAGE ERROR] Upload ditolak ({subfolder}): {e}")
        return None


def delete_uploaded_file(relative_url):
    """
    Menghapus berkas fisik di disk jika file tersebut ada di dalam /static/uploads/.
    Mencegah file yatim (orphan files) saat foto profil atau lampiran diperbarui/dihapus.
    """
    if not relative_url or not isinstance(relative_url, str):
        return False

    if not relative_url.startswith('/static/uploads/'):
        return False

    try:
        rel_clean = relative_url.lstrip('/')
        full_path = os.path.realpath(os.path.join(BASE_DIR, rel_clean))
        uploads_root = os.path.realpath(UPLOADS_BASE)
        if not full_path.startswith(uploads_root + os.sep):
            print(f"[SECURITY ALERT] Percobaan path traversal pada penghapusan file ({relative_url}).")
            return False
        if os.path.exists(full_path) and os.path.isfile(full_path):
            os.remove(full_path)
            return True
    except Exception as e:
        print(f"[FILE_STORAGE ERROR] Gagal menghapus file fisik ({relative_url}): {e}")

    return False
