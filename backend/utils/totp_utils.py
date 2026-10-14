import hmac
import hashlib
import time
import base64
import struct
import secrets
from urllib.parse import quote

def generate_totp_secret():
    """
    Menghasilkan 160-bit (20 bytes) random secret key terenkode Base32 (RFC 3548 / RFC 6238).
    """
    raw = secrets.token_bytes(20)
    return base64.b32encode(raw).decode('utf-8').replace('=', '')

def get_totp_token(secret, time_step=30, digits=6, t=None):
    """
    Menghasilkan 6-digit TOTP token untuk secret dan timestamp tertentu (RFC 6238).
    """
    if t is None:
        t = time.time()
    secret = secret.strip().replace(' ', '').upper()
    missing_padding = len(secret) % 8
    if missing_padding:
        secret += '=' * (8 - missing_padding)
    key = base64.b32decode(secret, casefold=True)
    counter = int(t // time_step)
    msg = struct.pack('>Q', counter)
    h = hmac.new(key, msg, hashlib.sha1).digest()
    offset = h[19] & 0x0F
    code = (struct.unpack('>I', h[offset:offset+4])[0] & 0x7FFFFFFF) % (10 ** digits)
    return f'{code:0{digits}d}'

class TOTPResult:
    """
    Hasil verifikasi TOTP yang kompatibel dua arah:
    - Mendukung evaluasi boolean langsung: if not verify_totp(...)
    - Mendukung tuple unpacking: valid, step = verify_totp(...)
    - Mendukung akses properti: res.valid, res.step
    """
    __slots__ = ('valid', 'step')

    def __init__(self, valid: bool, step: int = None):
        self.valid = valid
        self.step = step

    def __bool__(self):
        return bool(self.valid)

    def __iter__(self):
        return iter((self.valid, self.step))

    def __getitem__(self, idx):
        return (self.valid, self.step)[idx]

    def __eq__(self, other):
        if isinstance(other, bool):
            return self.valid == other
        if isinstance(other, (tuple, list)) and len(other) == 2:
            return (self.valid, self.step) == tuple(other)
        return False

    def __repr__(self):
        return f"TOTPResult(valid={self.valid}, step={self.step})"


def verify_totp(secret, token, window=1, time_step=30, last_step=None):
    """
    Memverifikasi token TOTP 6 digit dengan toleransi window pergeseran waktu (default +/- 30s).
    Mendukung proteksi Anti-Replay: menolak token jika time step sudah pernah digunakan (step <= last_step).
    Menggunakan hmac.compare_digest untuk mencegah Timing Attack.
    Mengembalikan objek TOTPResult yang mendukung unpacking (valid, step) sekaligus evaluasi boolean langsung.
    """
    if not secret or not token:
        return TOTPResult(False, None)
    token = str(token).strip()
    if len(token) != 6 or not token.isdigit():
        return TOTPResult(False, None)
    current_time = time.time()
    current_step = int(current_time // time_step)

    # Sort offset dari 0 (waktu sekarang), lalu -1, +1, dst. agar mencocokkan waktu terdekat terlebih dahulu
    offsets = sorted(range(-window, window + 1), key=lambda x: abs(x))
    for offset in offsets:
        test_step = current_step + offset
        if last_step is not None and test_step <= int(last_step):
            # Token replay dari time step yang sama atau masa lalu ditolak
            continue
        test_time = test_step * time_step
        expected_token = get_totp_token(secret, time_step=time_step, t=test_time)
        if hmac.compare_digest(expected_token, token):
            return TOTPResult(True, test_step)
    return TOTPResult(False, None)

def get_totp_uri(secret, account_name, issuer="SMKN 21 Jakarta"):
    """
    Menghasilkan URI standar `otpauth://totp/...` untuk pemindaian aplikasi Authenticator.
    """
    label = f"{issuer}:{account_name}"
    return f"otpauth://totp/{quote(label)}?secret={secret}&issuer={quote(issuer)}&algorithm=SHA1&digits=6&period=30"

def get_qr_data_uri(secret, account_name, issuer="SMKN 21 Jakarta"):
    """
    Menghasilkan Data URI SVG QR Code secara 100% lokal & offline tanpa mengirimkan
    kunci rahasia (shared secret) ke server pihak ketiga manapun.
    """
    import io
    import qrcode
    import qrcode.image.svg
    
    uri = get_totp_uri(secret, account_name, issuer)
    factory = qrcode.image.svg.SvgPathImage
    img = qrcode.make(uri, image_factory=factory, box_size=10)
    
    stream = io.BytesIO()
    img.save(stream)
    svg_raw = stream.getvalue().decode('utf-8')
    return f"data:image/svg+xml;utf8,{quote(svg_raw)}"

def get_qr_url(secret, account_name, issuer="SMKN 21 Jakarta"):
    """
    Alias kompatibilitas: Mengembalikan QR code Data URI lokal yang aman (100% Offline).
    """
    return get_qr_data_uri(secret, account_name, issuer)


