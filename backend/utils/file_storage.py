import os
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


def save_base64_file(base64_str, subfolder='signatures', prefix='file', watermark_text=None):
    """
    Menyimpan data URI Base64 ke berkas fisik disk server secara aman.
    Mencegah membengkaknya basis data PostgreSQL akibat string Base64 yang masif.
    
    :param base64_str: String data URI base64 (e.g. data:image/png;base64,...) atau path yang sudah tersimpan
    :param subfolder: Subdirektori di dalam /static/uploads (e.g. 'signatures', 'avatars', 'surat')
    :param prefix: Prefix nama berkas
    :param watermark_text: Teks watermark kontekstual untuk mencegah penyalahgunaan dokumen (UU PDP)
    :return: Path URL relatif (e.g. /static/uploads/signatures/sig_123.png) atau string asli jika bukan base64
    """
    if not base64_str or not isinstance(base64_str, str):
        return None

    # Jika sudah berupa path file di server atau URL, kembalikan langsung
    if not base64_str.startswith('data:image'):
        return base64_str

    try:
        header, encoded = base64_str.split(',', 1)
        file_bytes = base64.b64decode(encoded)

        # 1. Validasi Magic Bytes (A05 & A08 OWASP Top 10)
        is_png = file_bytes.startswith(b'\x89PNG\r\n\x1a\n')
        is_jpeg = file_bytes.startswith(b'\xff\xd8\xff')
        is_webp = file_bytes.startswith(b'RIFF') and len(file_bytes) >= 12 and file_bytes[8:12] == b'WEBP'

        if not (is_png or is_jpeg or is_webp):
            print(f"[SECURITY ALERT] Magic bytes biner tidak valid pada berkas {subfolder}. Ditolak demi integritas sistem.")
            return None

        # Sinkronisasi ekstensi dengan magic bytes terverifikasi
        if is_jpeg:
            ext = 'jpg'
        elif is_webp:
            ext = 'webp'
        else:
            ext = 'png'

        target_dir = os.path.join(UPLOADS_BASE, subfolder)
        os.makedirs(target_dir, exist_ok=True)

        # 2. Sanitasi & Pembersihan 100% Metadata EXIF via OpenCV (UU PDP No. 27/2022 Pasal 35)
        import cv2
        import numpy as np

        np_arr = np.frombuffer(file_bytes, np.uint8)
        read_flag = cv2.IMREAD_UNCHANGED if subfolder == 'signatures' else cv2.IMREAD_COLOR
        img = cv2.imdecode(np_arr, read_flag)

        if img is None:
            print(f"[SECURITY ALERT] Gagal mendekode citra biner {subfolder}. File kemungkinan korup.")
            return None

        # Kepatuhan UU PDP No. 27/2022: Watermarking Dokumen Medis & Surat Izin
        if watermark_text:
            try:
                h, w = img.shape[:2]
                overlay = img.copy()

                font = cv2.FONT_HERSHEY_SIMPLEX
                scale = max(0.45, min(w / 750.0, 1.1))
                thickness = max(1, int(scale * 2))

                (tw, th), _ = cv2.getTextSize(watermark_text, font, scale, thickness)
                tx = max(10, (w - tw) // 2)
                ty = max(th + 10, h // 2)

                # Watermark teks di tengah
                cv2.putText(overlay, watermark_text, (tx, ty), font, scale, (0, 0, 220), thickness, cv2.LINE_AA)

                # Footer proteksi tambahan
                footer_text = "VERIFIKASI RESMI SMKN 21 JAKARTA - TIDAK BERLAKU DI LUAR SEKOLAH"
                f_scale = max(0.35, min(w / 1100.0, 0.75))
                (fw, fh), _ = cv2.getTextSize(footer_text, font, f_scale, 1)
                fx = max(10, (w - fw) // 2)
                fy = h - 12

                cv2.rectangle(overlay, (0, max(0, h - 30)), (w, h), (20, 20, 20), -1)
                cv2.putText(overlay, footer_text, (fx, fy), font, f_scale, (255, 255, 255), 1, cv2.LINE_AA)

                # Alpha blend overlay 30% ke gambar asli
                alpha = 0.32
                cv2.addWeighted(overlay, alpha, img, 1.0 - alpha, 0, img)
            except Exception as e_wm:
                print(f"[WATERMARK WARNING] Gagal memberi watermark dokumen: {e_wm}")

        # Re-encode biner: Membuang 100% metadata EXIF (GPS, informasi kamera, serial, timestamp kamera)
        encode_ext = '.jpg' if ext == 'jpg' else ('.webp' if ext == 'webp' else '.png')
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, 85] if ext == 'jpg' else ([cv2.IMWRITE_WEBP_QUALITY, 85] if ext == 'webp' else [cv2.IMWRITE_PNG_COMPRESSION, 6])
        success, enc_buf = cv2.imencode(encode_ext, img, encode_params)
        if success:
            file_bytes = enc_buf.tobytes()

        filename = f"{prefix}_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:8]}.{ext}"
        filepath = os.path.join(target_dir, filename)

        with open(filepath, 'wb') as f:
            f.write(file_bytes)

        return f"/static/uploads/{subfolder}/{filename}"
    except Exception as e:
        print(f"[FILE_STORAGE ERROR] Gagal menyimpan file base64 ke disk ({subfolder}): {e}")
        return base64_str


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
        full_path = os.path.join(BASE_DIR, rel_clean)
        if os.path.exists(full_path) and os.path.isfile(full_path):
            os.remove(full_path)
            return True
    except Exception as e:
        print(f"[FILE_STORAGE ERROR] Gagal menghapus file fisik ({relative_url}): {e}")

    return False

