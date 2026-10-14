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


def save_base64_file(base64_str, subfolder='signatures', prefix='file'):
    """
    Menyimpan data URI Base64 ke berkas fisik disk server secara aman.
    Mencegah membengkaknya basis data PostgreSQL akibat string Base64 yang masif.
    
    :param base64_str: String data URI base64 (e.g. data:image/png;base64,...) atau path yang sudah tersimpan
    :param subfolder: Subdirektori di dalam /static/uploads (e.g. 'signatures', 'avatars', 'surat')
    :param prefix: Prefix nama berkas
    :return: Path URL relatif (e.g. /static/uploads/signatures/sig_123.png) atau string asli jika bukan base64
    """
    if not base64_str or not isinstance(base64_str, str):
        return None

    # Jika sudah berupa path file di server atau URL, kembalikan langsung
    if not base64_str.startswith('data:image'):
        return base64_str

    try:
        header, encoded = base64_str.split(',', 1)
        ext = 'png'
        if 'jpeg' in header or 'jpg' in header:
            ext = 'jpg'
        elif 'webp' in header:
            ext = 'webp'

        target_dir = os.path.join(UPLOADS_BASE, subfolder)
        os.makedirs(target_dir, exist_ok=True)

        file_bytes = base64.b64decode(encoded)
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

