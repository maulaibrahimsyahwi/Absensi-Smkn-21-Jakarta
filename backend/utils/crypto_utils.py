import os
import json
import base64
import hashlib
from cryptography.fernet import Fernet
from config import SECRET_KEY, JWT_SECRET_KEY

# Inisialisasi Kunci Fernet (32-byte url-safe base64)
_raw_key = os.environ.get("DATA_ENCRYPTION_KEY", "").strip()
if not _raw_key:
    # Turunkan kunci simetris deterministik dari SECRET_KEY / JWT_SECRET_KEY
    _seed = (SECRET_KEY or JWT_SECRET_KEY or "smkn21-default-secret-salt").encode("utf-8")
    _key_bytes = hashlib.sha256(_seed).digest()
    _fernet_key = base64.urlsafe_b64encode(_key_bytes)
else:
    if len(_raw_key) == 44:
        _fernet_key = _raw_key.encode("utf-8")
    else:
        _key_bytes = hashlib.sha256(_raw_key.encode("utf-8")).digest()
        _fernet_key = base64.urlsafe_b64encode(_key_bytes)

_fernet = Fernet(_fernet_key)

CIPHER_PREFIX = "enc:v1:"

def encrypt_field(plaintext: str | None) -> str | None:
    """Mengenkripsi teks biasa menjadi ciphertext dengan prefix 'enc:v1:'."""
    if not plaintext or not isinstance(plaintext, str):
        return plaintext
    if plaintext.startswith(CIPHER_PREFIX):
        return plaintext
    token = _fernet.encrypt(plaintext.encode("utf-8")).decode("utf-8")
    return f"{CIPHER_PREFIX}{token}"

def decrypt_field(ciphertext: str | None) -> str | None:
    """Mendekripsi ciphertext bertanda 'enc:v1:'. Jika masih teks biasa (legacy), kembalikan langsung."""
    if not ciphertext or not isinstance(ciphertext, str):
        return ciphertext
    if not ciphertext.startswith(CIPHER_PREFIX):
        return ciphertext
    raw_token = ciphertext[len(CIPHER_PREFIX):]
    try:
        return _fernet.decrypt(raw_token.encode("utf-8")).decode("utf-8")
    except Exception as e:
        print(f"[CRYPTO ERROR] Gagal mendekripsi data: {e}")
        return ciphertext

def encrypt_json_payload(data: dict) -> str:
    """Mengenkripsi objek Python dictionary ke ciphertext bertanda 'enc:v1:'."""
    dumped = json.dumps(data, ensure_ascii=False)
    return encrypt_field(dumped)

def decrypt_json_payload(raw_content: str) -> dict:
    """Mendekripsi data snapshot cadangan (baik terenkripsi 'enc:v1:' maupun format JSON teks biasa)."""
    if not raw_content or not isinstance(raw_content, str):
        return {}
    if raw_content.startswith(CIPHER_PREFIX):
        decrypted_str = decrypt_field(raw_content)
        return json.loads(decrypted_str)
    return json.loads(raw_content)
