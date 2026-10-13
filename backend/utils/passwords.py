"""
Modul Utilitas Kebijakan Kata Sandi dan Validasi Tanda Tangan SMKN 21 Jakarta.
Menerapkan standar keamanan UU PDP:
- Kebijakan kompleksitas kata sandi terpadu (panjang min 8, huruf besar, huruf kecil, angka).
- Generator kata sandi acak awal untuk reset staf/siswa.
- Pengecekan kewajiban ganti kata sandi bawaan (default/first login).
- Validasi integritas dan keamanan berkas tanda tangan digital PNG (magic bytes, batas ukuran).
"""

import re
import secrets
import string
import base64

COMMON_WEAK_PASSWORDS = {
    "password", "password123", "admin123", "piket123", "smkn21jakarta",
    "12345678", "123456789", "qwertyuiop", "smkn21bisa", "indonesia"
}

PNG_MAGIC_BYTES = b"\x89PNG\r\n\x1a\n"
MAX_SIGNATURE_BYTES = 200 * 1024  # Maksimal 200 KB


def generate_initial_password(length: int = 10) -> str:
    """
    Menghasilkan kata sandi awal acak yang aman dan mudah dibaca.
    Mengandung kombinasi huruf besar, huruf kecil, dan angka.
    """
    length = max(8, length)
    chars_upper = string.ascii_uppercase
    chars_lower = string.ascii_lowercase
    chars_digits = string.digits
    
    # Pastikan setidaknya ada 1 huruf besar, 1 huruf kecil, 1 angka
    password_chars = [
        secrets.choice(chars_upper),
        secrets.choice(chars_lower),
        secrets.choice(chars_digits),
        secrets.choice(chars_digits)
    ]
    
    # Sisa karakter
    all_chars = chars_upper + chars_lower + chars_digits
    for _ in range(length - len(password_chars)):
        password_chars.append(secrets.choice(all_chars))
        
    secrets.SystemRandom().shuffle(password_chars)
    return "".join(password_chars)


def validate_new_password(
    new_pw: str,
    old_pw: str = None,
    username: str = None,
    nis: str = None
) -> tuple[bool, str | None]:
    """
    Memvalidasi kata sandi baru terhadap kebijakan keamanan SMKN 21:
    - Minimal 8 karakter
    - Wajib mengandung huruf besar, huruf kecil, dan angka
    - Tidak boleh sama dengan kata sandi lama
    - Tidak boleh mengandung username, NIP, atau NIS
    - Tidak boleh menggunakan kata sandi lemah umum
    """
    if not new_pw:
        return False, "Kata sandi baru tidak boleh kosong."
        
    pw = new_pw.strip()
    if len(pw) < 8:
        return False, "Kata sandi baru minimal harus 8 karakter."
    if len(pw) > 128:
        return False, "Kata sandi baru maksimal 128 karakter."

    if not re.search(r'[A-Z]', pw):
        return False, "Kata sandi harus mengandung setidaknya satu huruf besar (A-Z)."
    if not re.search(r'[a-z]', pw):
        return False, "Kata sandi harus mengandung setidaknya satu huruf kecil (a-z)."
    if not re.search(r'\d', pw):
        return False, "Kata sandi harus mengandung setidaknya satu angka (0-9)."

    if old_pw and pw == old_pw.strip():
        return False, "Kata sandi baru tidak boleh sama dengan kata sandi saat ini."

    if username and len(username.strip()) >= 3:
        u_clean = username.strip().lower()
        if u_clean in pw.lower():
            return False, "Kata sandi tidak boleh mengandung username atau NIP Anda."

    if nis and len(str(nis).strip()) >= 3:
        nis_clean = str(nis).strip().lower()
        if nis_clean in pw.lower():
            return False, "Kata sandi tidak boleh mengandung NIS Anda."

    if pw.lower() in COMMON_WEAK_PASSWORDS:
        return False, "Kata sandi terlalu mudah ditebak. Gunakan kombinasi yang lebih kuat."

    return True, None


def needs_password_change(account) -> bool:
    """
    Mengecek apakah akun wajib mengganti kata sandinya (login pertama / kata sandi bawaan).
    """
    if not account:
        return False

    # Jika flag eksplisit aktif pada model User atau Siswa
    if bool(getattr(account, 'must_change_password', False)):
        return True

    # Khusus akun Siswa: jika belum memiliki password kustom (password is None),
    # maka akun masih menggunakan NIS default dan wajib mengubah kata sandi.
    from models import Siswa
    if isinstance(account, Siswa):
        if not getattr(account, 'password', None):
            return True

    return False


def validate_signature_png(signature_data: str) -> tuple[bool, str | None, bytes | None]:
    """
    Memvalidasi data URI tanda tangan digital:
    - Harus berupa PNG data URI (data:image/png;base64,...)
    - Ukuran binary tidak boleh melebihi 200 KB
    - Harus memiliki magic bytes berkas PNG yang valid
    """
    if not signature_data or not isinstance(signature_data, str):
        return False, "Data tanda tangan digital wajib disertakan.", None

    signature_data = signature_data.strip()
    if not signature_data.startswith("data:image/png;base64,"):
        return False, "Format tanda tangan digital tidak valid (wajib format PNG).", None

    base64_part = signature_data.split("data:image/png;base64,")[1].strip()
    try:
        raw_bytes = base64.b64decode(base64_part, validate=True)
    except Exception:
        return False, "Data base64 tanda tangan rusak atau tidak valid.", None

    if len(raw_bytes) > MAX_SIGNATURE_BYTES:
        return False, f"Ukuran berkas tanda tangan terlalu besar (maksimal {MAX_SIGNATURE_BYTES // 1024} KB).", None

    if len(raw_bytes) < len(PNG_MAGIC_BYTES) or not raw_bytes.startswith(PNG_MAGIC_BYTES):
        return False, "Header berkas tanda tangan tidak valid (bukan berkas PNG murni).", None

    return True, None, raw_bytes

