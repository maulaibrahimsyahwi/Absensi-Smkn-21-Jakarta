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
                'message': 'Sesi login Anda telah berakhir. Silakan login ulang.'
            }), 401
        except jwt.InvalidTokenError:
            return jsonify({
                'status': 'error',
                'message': 'Token autentikasi tidak valid atau telah dirusak.'
            }), 401
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': f'Gagal memverifikasi token: {str(e)}'
            }), 401
            
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

