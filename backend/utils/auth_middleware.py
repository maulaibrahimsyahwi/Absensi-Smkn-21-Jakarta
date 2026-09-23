import jwt
from functools import wraps
from datetime import datetime, timezone, timedelta
from flask import request, jsonify, current_app
from config import JWT_SECRET_KEY

def generate_token(user_id, role, identifier, expires_in_hours=24):
    """
    Menghasilkan token JWT HS256 yang ditandatangani secara kriptografis.
    """
    secret = current_app.config.get('JWT_SECRET_KEY') or JWT_SECRET_KEY
    now = datetime.now(timezone.utc)
    payload = {
        'sub': str(user_id),
        'user_id': user_id,
        'role': role.lower() if role else 'siswa',
        'identifier': str(identifier),
        'iat': now,
        'exp': now + timedelta(hours=expires_in_hours)
    }
    return jwt.encode(payload, secret, algorithm='HS256')

def decode_token(token):
    """
    Mendekode dan memverifikasi token JWT.
    """
    secret = current_app.config.get('JWT_SECRET_KEY') or JWT_SECRET_KEY
    return jwt.decode(token, secret, algorithms=['HS256'])

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

        # ================= REAL-TIME DATABASE EXISTENCE VERIFICATION =================
        # Memastikan akun yang memiliki token JWT masih benar-benar ada di database (belum dihapus oleh Admin)
        user_id = payload.get('user_id')
        role = str(payload.get('role', '')).strip().lower()

        try:
            from models import User, Siswa
            user_account = None

            if role == 'siswa':
                user_account = Siswa.query.get(user_id)
                if not user_account:
                    return jsonify({
                        'status': 'error',
                        'error_code': 'ACCOUNT_DELETED',
                        'message': 'Akun siswa Anda telah dinonaktifkan atau dihapus oleh Administrator. Sesi login telah dihentikan.'
                    }), 401
                
                # Cek apakah akun alumni telah melewati masa tenggang 1 tahun
                if getattr(user_account, 'status', 'Aktif') == 'Alumni' and user_account.is_alumni_expired():
                    return jsonify({
                        'status': 'error',
                        'error_code': 'ACCOUNT_EXPIRED',
                        'message': 'Masa aktif akses akun alumni Anda telah berakhir.'
                    }), 401

            elif role in ['admin', 'piket', 'staf']:
                user_account = User.query.get(user_id)
                if not user_account:
                    return jsonify({
                        'status': 'error',
                        'error_code': 'ACCOUNT_DELETED',
                        'message': 'Akun staf/guru Anda telah dinonaktifkan atau dihapus dari sistem. Sesi login telah dihentikan.'
                    }), 401
            
            request.current_user_obj = user_account
        except Exception as db_err:
            # Jika terjadi error koneksi database, log dan izinkan payload yang valid tetap berjalan agar tidak memblokir sementara
            current_app.logger.warning(f"Gagal memvalidasi sesi akun di DB: {str(db_err)}")
            
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

