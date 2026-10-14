import os
import json
import base64
import hashlib
from cryptography.fernet import Fernet
from config import _IS_PROD, SECRET_KEY, JWT_SECRET_KEY

# Inisialisasi Kunci Fernet Primer (32-byte url-safe base64) terpisah dari SECRET_KEY (UU PDP Pasal 35 & BIO-02)
_raw_key = os.environ.get("DATA_ENCRYPTION_KEY", "").strip()
if _IS_PROD and (not _raw_key or len(_raw_key) < 32):
    raise RuntimeError(
        "CRITICAL SECURITY ERROR: DATA_ENCRYPTION_KEY (min 32 chars, terpisah dari SECRET_KEY) "
        "wajib disetel di environment produksi untuk perlindungan data spesifik UU PDP!"
    )

if not _raw_key:
    # Hanya untuk development lokal: gunakan domain separation eksplisit dengan prefix kontekstual
    _key_bytes = hashlib.sha256(f"smkn21-pdp-field-encryption:{SECRET_KEY}".encode("utf-8")).digest()
else:
    _key_bytes = hashlib.sha256(_raw_key.encode("utf-8")).digest()

_fernet_key = base64.urlsafe_b64encode(_key_bytes)
_fernet = Fernet(_fernet_key)

# Inisialisasi Fernet sekunder untuk dekripsi backward-compatibility (kunci turunan lama)
_legacy_seed = (SECRET_KEY or JWT_SECRET_KEY or "smkn21-default-secret-salt").encode("utf-8")
_legacy_key_bytes = hashlib.sha256(_legacy_seed).digest()
_legacy_fernet = Fernet(base64.urlsafe_b64encode(_legacy_key_bytes))

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
    except Exception:
        # Fallback ke kunci lama jika ciphertext dienkripsi sebelum pemisahan kunci DATA_ENCRYPTION_KEY
        try:
            return _legacy_fernet.decrypt(raw_token.encode("utf-8")).decode("utf-8")
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

