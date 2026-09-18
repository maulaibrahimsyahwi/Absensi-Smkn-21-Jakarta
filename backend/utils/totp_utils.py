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

def verify_totp(secret, token, window=1, time_step=30):
    """
    Memverifikasi token TOTP 6 digit dengan toleransi window pergeseran waktu (default +/- 30s).
    Menggunakan hmac.compare_digest untuk mencegah Timing Attack.
    """
    if not secret or not token:
        return False
    token = str(token).strip()
    if len(token) != 6 or not token.isdigit():
        return False
    current_time = time.time()
    for offset in range(-window, window + 1):
        test_time = current_time + (offset * time_step)
        expected_token = get_totp_token(secret, time_step=time_step, t=test_time)
        if hmac.compare_digest(expected_token, token):
            return True
    return False

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


