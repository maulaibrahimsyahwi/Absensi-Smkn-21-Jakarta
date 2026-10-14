import time as time_module
from collections import defaultdict
from werkzeug.security import generate_password_hash, check_password_hash
from models import db

# Account lockout tracking (in-memory, reset saat restart server)
_login_attempts = defaultdict(list)  # {f"{username}:{ip_address}": [timestamp, ...]}
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 900  # 15 menit


def _get_lockout_key(username, ip_address=None):
    """Membuat kunci unik berbasis username dan IP address agar mencegah DoS lockout antar perangkat."""
    u = str(username).strip().lower()
    if ip_address:
        return f"{u}:{str(ip_address).strip()}"
    return u


def check_account_locked(username, ip_address=None):
    """
    Memeriksa apakah akun/IP terkunci akibat terlalu banyak percobaan login gagal berturut-turut.
    Mengembalikan tuple: (is_locked: bool, remaining_seconds: int)
    """
    now = time_module.time()
    key = _get_lockout_key(username, ip_address)
    # Bersihkan percobaan yang sudah melebihi durasi batas kunci
    _login_attempts[key] = [
        t for t in _login_attempts[key] if now - t < LOCKOUT_DURATION_SECONDS
    ]
    if len(_login_attempts[key]) >= MAX_LOGIN_ATTEMPTS:
        remaining = int(LOCKOUT_DURATION_SECONDS - (now - _login_attempts[key][0]))
        return True, remaining
    return False, 0


def _prune_expired_attempts():
    """Membersihkan entri percobaan login yang sudah kedaluwarsa untuk mencegah kebocoran memori RAM."""
    now = time_module.time()
    keys_to_remove = []
    for k, timestamps in list(_login_attempts.items()):
        valid = [t for t in timestamps if now - t < LOCKOUT_DURATION_SECONDS]
        if not valid:
            keys_to_remove.append(k)
        else:
            _login_attempts[k] = valid
    for k in keys_to_remove:
        _login_attempts.pop(k, None)


def record_failed_attempt(username, ip_address=None):
    """Mencatat stempel waktu percobaan login yang gagal untuk pasangan username dan IP."""
    if len(_login_attempts) > 1000:
        _prune_expired_attempts()
    key = _get_lockout_key(username, ip_address)
    _login_attempts[key].append(time_module.time())


def clear_login_attempts(username, ip_address=None):
    """Menghapus seluruh rekaman percobaan gagal setelah login berhasil."""
    key = _get_lockout_key(username, ip_address)
    _login_attempts.pop(key, None)
    # Bersihkan juga kunci username murni jika ada
    u = str(username).strip().lower()
    _login_attempts.pop(u, None)


def verify_and_upgrade_password(account, input_pass, is_siswa=False):
    """
    Memverifikasi kata sandi dengan backward-compatibility:
    - Jika sudah ter-hash (scrypt/pbkdf2/bcrypt), gunakan check_password_hash.
    - Jika masih plaintext warisan lama, verifikasi teks lalu otomatis migrasi ke hash scrypt.
    """
    stored_pass = getattr(account, 'password', None)
    if is_siswa and not stored_pass:
        stored_pass = account.nis
    if not stored_pass or not input_pass:
        return False

    if stored_pass.startswith(('scrypt:', 'pbkdf2:', 'bcrypt:')):
        return check_password_hash(stored_pass, input_pass)

    # Legacy plaintext match
    if stored_pass == input_pass:
        try:
            account.password = generate_password_hash(input_pass, method='scrypt')
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"[SECURITY] Gagal meng-upgrade password hash: {e}")
        return True

    return False

