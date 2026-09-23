import time as time_module
from collections import defaultdict
from werkzeug.security import generate_password_hash, check_password_hash
from models import db

# Account lockout tracking (in-memory, reset saat restart server)
_login_attempts = defaultdict(list)  # {username: [timestamp, ...]}
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 900  # 15 menit


def check_account_locked(username):
    """
    Memeriksa apakah akun terkunci akibat terlalu banyak percobaan login gagal berturut-turut.
    Mengembalikan tuple: (is_locked: bool, remaining_seconds: int)
    """
    now = time_module.time()
    # Bersihkan percobaan yang sudah melebihi durasi batas kunci
    _login_attempts[username] = [
        t for t in _login_attempts[username] if now - t < LOCKOUT_DURATION_SECONDS
    ]
    if len(_login_attempts[username]) >= MAX_LOGIN_ATTEMPTS:
        remaining = int(LOCKOUT_DURATION_SECONDS - (now - _login_attempts[username][0]))
        return True, remaining
    return False, 0


def record_failed_attempt(username):
    """Mencatat stempel waktu percobaan login yang gagal."""
    _login_attempts[username].append(time_module.time())


def clear_login_attempts(username):
    """Menghapus seluruh rekaman percobaan gagal setelah login berhasil."""
    _login_attempts.pop(username, None)


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

