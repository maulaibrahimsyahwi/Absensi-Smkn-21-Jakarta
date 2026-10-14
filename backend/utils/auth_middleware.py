import time
import threading
import secrets
import jwt
from functools import wraps
from datetime import datetime, timezone, timedelta
from flask import request, jsonify, current_app
from config import JWT_SECRET_KEY

# Cache sesi akun di memori untuk mengurangi beban database saat request berfrekuensi tinggi (misal liveness camera)
_account_cache = {}
_account_cache_lock = threading.Lock()
ACCOUNT_CACHE_TTL = 20  # detik

def _evict_expired_account_cache(now_ts):
    """Membersihkan entri cache sesi yang kadaluarsa untuk mencegah kebocoran memori."""
    if len(_account_cache) > 500:
        expired_keys = [k for k, v in _account_cache.items() if now_ts - v.get('timestamp', 0) > ACCOUNT_CACHE_TTL]
        for k in expired_keys:
            _account_cache.pop(k, None)
        if len(_account_cache) > 500:
            excess = len(_account_cache) - 500
            sorted_keys = sorted(_account_cache.keys(), key=lambda k: _account_cache[k].get('timestamp', 0))
            for k in sorted_keys[:excess]:
                _account_cache.pop(k, None)

class CachedAccountProxy:
    """Proxy ringan untuk entri akun dari cache sesi (menghemat query DB dan thread locks)."""
    def __init__(self, data):
        self._data = data
        for k, v in data.items():
            setattr(self, k, v)

    def is_alumni_expired(self):
        return self._data.get('alumni_expired', False)

    def to_dict(self, include_signature=False):
        return {
            'id': self._data.get('id'),
            'role': self._data.get('role'),
            'nama': self._data.get('nama'),
            'nis': self._data.get('nis'),
            'kelas': self._data.get('kelas'),
            'status': self._data.get('status', 'Aktif'),
            'medical_exemption_until': self._data.get('medical_exemption_until'),
            'medical_exemption_alasan': self._data.get('medical_exemption_alasan'),
            'privacy_consent_at': self._data.get('privacy_consent_at'),
            'needs_pwd_change': self._data.get('needs_pwd_change', False),
            'has_biometric': bool(self._data.get('has_biometric', False)),
        }

def invalidate_account_cache(role=None, user_id=None):
    """Menghapus entri cache sesi saat akun logout, ganti password, atau diperbarui."""
    with _account_cache_lock:
        if role and user_id:
            _account_cache.pop(f"{str(role).lower()}:{user_id}", None)
        else:
            _account_cache.clear()

EXEMPT_ENDPOINTS = {
    'auth.change_password',
    'auth.logout',
    'auth.verify_session',
    'auth.save_signature',
    'auth.save_foto_profil',
    'auth.delete_foto_profil'
}

EXEMPT_PATHS = {
    '/api/auth/change_password',
    '/api/auth/logout',
    '/api/auth/verify_session',
    '/api/auth/signature',
    '/api/auth/foto_profil'
}

def _get_jwt_secret():
    try:
        return current_app.config.get('JWT_SECRET_KEY') or JWT_SECRET_KEY
    except Exception:
        return JWT_SECRET_KEY

def generate_token(user_id, role, identifier, expires_in_hours=24, session_token=None):
    """
    Menghasilkan token JWT HS256 yang ditandatangani secara kriptografis
    beserta pelacakan session_token untuk Single Active Device.
    Menyertakan claims 'iss' dan 'jti' sesuai rekomendasi OWASP Top 10.
    """
    secret = _get_jwt_secret()
    now = datetime.now(timezone.utc)

    # Pastikan session_token selalu ada dan sinkron dengan akun aktif
    if not session_token:
        try:
            from models import User, Siswa, db
            target_obj = None
            if str(role).lower() == 'siswa':
                target_obj = Siswa.query.get(user_id)
            else:
                target_obj = User.query.get(user_id)

            if target_obj:
                if not getattr(target_obj, 'active_session_token', None):
                    target_obj.active_session_token = secrets.token_hex(16)
                    db.session.commit()
                session_token = target_obj.active_session_token
            else:
                session_token = secrets.token_hex(16)
        except Exception:
            session_token = secrets.token_hex(16)

    payload = {
        'iss': 'smkn21-absensi',
        'jti': secrets.token_hex(8),
        'sub': str(user_id),
        'user_id': user_id,
        'role': role.lower() if role else 'siswa',
        'identifier': str(identifier),
        'session_token': str(session_token),
        'iat': now,
        'exp': now + timedelta(hours=expires_in_hours)
    }
    return jwt.encode(payload, secret, algorithm='HS256')

def decode_token(token):
    """
    Mendekode dan memverifikasi token JWT beserta klaim wajib (iss, exp, iat, sub, session_token).
    """
    secret = _get_jwt_secret()
    return jwt.decode(
        token,
        secret,
        algorithms=['HS256'],
        issuer='smkn21-absensi',
        options={'require': ['exp', 'iat', 'sub', 'jti', 'session_token']}
    )

def token_required(f):
    """
    Decorator untuk memvalidasi header Authorization: Bearer <token>.
    Menyuntikkan payload ke request.current_user.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({
                'status': 'error',
                'message': 'Token autentikasi tidak ditemukan. Silakan login terlebih dahulu.'
            }), 401
        
        parts = auth_header.strip().split(' ')
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({
                'status': 'error',
                'message': 'Format Authorization header tidak valid (harus Bearer <token>).'
            }), 401
        
        token = parts[1]
        try:
            payload = decode_token(token)
            request.current_user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({
                'status': 'error',
                'error_code': 'TOKEN_EXPIRED',
                'message': 'Sesi login Anda telah berakhir. Silakan login ulang.'
            }), 401
        except jwt.InvalidTokenError:
            return jsonify({
                'status': 'error',
                'error_code': 'INVALID_TOKEN',
                'message': 'Token autentikasi tidak valid atau telah dirusak.'
            }), 401
        except Exception as e:
            return jsonify({
                'status': 'error',
                'error_code': 'TOKEN_ERROR',
                'message': f'Gagal memverifikasi token: {str(e)}'
            }), 401

        # ================= REAL-TIME ACCOUNT & SESSION CACHE VERIFICATION =================
        # Menggunakan in-memory cache ringan (TTL 20 detik) untuk mencegah lonjakan query ke PostgreSQL
        # saat pemindaian kamera biometrik (/api/detect_liveness) berlangsung setiap 600ms.
        user_id = payload.get('user_id')
        role = str(payload.get('role', '')).strip().lower()
        session_token = payload.get('session_token')
        curr_ep = request.endpoint or ''
        curr_path = request.path or ''

        cache_key = f"{role}:{user_id}"
        now_ts = time.time()
        cached = None
        with _account_cache_lock:
            entry = _account_cache.get(cache_key)
            if entry and (now_ts - entry['timestamp'] < ACCOUNT_CACHE_TTL):
                cached = entry

        try:
            from models import User, Siswa
            from utils.passwords import needs_password_change

            if cached:
                if cached.get('deleted'):
                    return jsonify({
                        'status': 'error',
                        'error_code': 'ACCOUNT_DELETED',
                        'message': 'Akun Anda telah dinonaktifkan atau dihapus dari sistem. Sesi login telah dihentikan.'
                    }), 401

                if cached.get('alumni_expired'):
                    return jsonify({
                        'status': 'error',
                        'error_code': 'ACCOUNT_EXPIRED',
                        'message': 'Masa aktif akses akun alumni Anda telah berakhir.'
                    }), 401

                db_session_token = cached.get('active_session_token')
                if not session_token or not db_session_token or not secrets.compare_digest(str(session_token), str(db_session_token)):
                    return jsonify({
                        'status': 'error',
                        'error_code': 'SESSION_TERMINATED',
                        'message': 'Sesi Anda telah berakhir (logout) atau akun telah login di perangkat lain.'
                    }), 401

                if cached.get('needs_pwd_change'):
                    if curr_ep not in EXEMPT_ENDPOINTS and curr_path not in EXEMPT_PATHS:
                        return jsonify({
                            'status': 'error',
                            'error_code': 'PASSWORD_CHANGE_REQUIRED',
                            'message': 'Akun Anda wajib memperbarui kata sandi default sebelum dapat mengakses sistem.'
                        }), 403

                # Pasang proxy ringan untuk request.current_user_obj (kecuali verify_session yang butuh full model)
                if curr_ep == 'auth.verify_session':
                    user_account = Siswa.query.get(user_id) if role == 'siswa' else User.query.get(user_id)
                    request.current_user_obj = user_account
                else:
                    request.current_user_obj = CachedAccountProxy(cached)
            else:
                user_account = None

                if role == 'siswa':
                    user_account = Siswa.query.get(user_id)
                    if not user_account:
                        with _account_cache_lock:
                            _evict_expired_account_cache(now_ts)
                            _account_cache[cache_key] = {'deleted': True, 'timestamp': now_ts}
                        return jsonify({
                            'status': 'error',
                            'error_code': 'ACCOUNT_DELETED',
                            'message': 'Akun siswa Anda telah dinonaktifkan atau dihapus oleh Administrator. Sesi login telah dihentikan.'
                        }), 401
                    
                    if getattr(user_account, 'status', 'Aktif') == 'Alumni' and user_account.is_alumni_expired():
                        with _account_cache_lock:
                            _evict_expired_account_cache(now_ts)
                            _account_cache[cache_key] = {'alumni_expired': True, 'timestamp': now_ts}
                        return jsonify({
                            'status': 'error',
                            'error_code': 'ACCOUNT_EXPIRED',
                            'message': 'Masa aktif akses akun alumni Anda telah berakhir.'
                        }), 401

                elif role in ['admin', 'piket', 'staf']:
                    user_account = User.query.get(user_id)
                    if not user_account:
                        with _account_cache_lock:
                            _evict_expired_account_cache(now_ts)
                            _account_cache[cache_key] = {'deleted': True, 'timestamp': now_ts}
                        return jsonify({
                            'status': 'error',
                            'error_code': 'ACCOUNT_DELETED',
                            'message': 'Akun staf/guru Anda telah dinonaktifkan atau dihapus dari sistem. Sesi login telah dihentikan.'
                        }), 401
                
                request.current_user_obj = user_account

                # ================= MULTI-DEVICE / SINGLE ACTIVE SESSION ENFORCEMENT =================
                db_session_token = getattr(user_account, 'active_session_token', None) if user_account else None
                if not session_token or not db_session_token or not secrets.compare_digest(str(session_token), str(db_session_token)):
                    return jsonify({
                        'status': 'error',
                        'error_code': 'SESSION_TERMINATED',
                        'message': 'Sesi Anda telah berakhir (logout) atau akun telah login di perangkat lain.'
                    }), 401

                # ================= FORCE PASSWORD CHANGE ENFORCEMENT =================
                user_needs_pwd_change = False
                if user_account:
                    user_needs_pwd_change = needs_password_change(user_account)
                    if user_needs_pwd_change:
                        if curr_ep not in EXEMPT_ENDPOINTS and curr_path not in EXEMPT_PATHS:
                            return jsonify({
                                'status': 'error',
                                'error_code': 'PASSWORD_CHANGE_REQUIRED',
                                'message': 'Akun Anda wajib memperbarui kata sandi default sebelum dapat mengakses sistem.'
                            }), 403

                # Simpan metadata sesi ke cache ringan (TTL 20 detik)
                with _account_cache_lock:
                    _evict_expired_account_cache(now_ts)
                    _account_cache[cache_key] = {
                        'id': user_account.id,
                        'role': role,
                        'deleted': False,
                        'alumni_expired': False,
                        'active_session_token': getattr(user_account, 'active_session_token', None),
                        'needs_pwd_change': user_needs_pwd_change,
                        'has_biometric': bool(getattr(user_account, 'face_encoding', None)),
                        'nama': getattr(user_account, 'nama', None),
                        'nis': getattr(user_account, 'nis', None),
                        'kelas': getattr(user_account, 'kelas', None),
                        'status': getattr(user_account, 'status', 'Aktif'),
                        'medical_exemption_until': getattr(user_account, 'medical_exemption_until', None),
                        'medical_exemption_alasan': getattr(user_account, 'medical_exemption_alasan', None),
                        'privacy_consent_at': getattr(user_account, 'privacy_consent_at', None),
                        'timestamp': now_ts
                    }
        except Exception as db_err:
            current_app.logger.error(f"Gagal memvalidasi sesi akun di DB: {str(db_err)}")
            return jsonify({
                'status': 'error',
                'error_code': 'DATABASE_UNAVAILABLE',
                'message': 'Layanan basis data sedang sibuk atau mengalami kendala koneksi. Silakan coba sesaat lagi.'
            }), 503

        return f(*args, **kwargs)
    return decorated

def role_required(allowed_roles):
    """
    Decorator untuk memeriksa apakah role pengguna saat ini diizinkan.
    Wajib dipasang SETELAH @token_required.
    """
    if isinstance(allowed_roles, str):
        allowed_roles = [allowed_roles]
    allowed_roles = [r.lower() for r in allowed_roles]

    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            current_user = getattr(request, 'current_user', None)
            if not current_user:
                return jsonify({
                    'status': 'error',
                    'message': 'Pengguna belum terautentikasi.'
                }), 401
            
            user_role = current_user.get('role', '').lower()
            if user_role not in allowed_roles:
                return jsonify({
                    'status': 'error',
                    'message': f'Akses ditolak. Wewenang "{user_role}" tidak memiliki izin untuk tindakan ini.'
                }), 403
                
            return f(*args, **kwargs)
        return decorated
    return decorator

