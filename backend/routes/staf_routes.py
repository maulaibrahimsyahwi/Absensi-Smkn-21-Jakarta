from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from models import db, User
from utils.auth_middleware import token_required, role_required

staf_bp = Blueprint('staf', __name__)

@staf_bp.route('/api/staf', methods=['GET'])
@token_required
@role_required(['admin'])
def get_all_staf():
    """
    Mengambil seluruh data akun staf (Guru Piket & Admin) untuk manajemen oleh Admin.
    """
    try:
        users = User.query.order_by(User.role.asc(), User.nama.asc()).all()
        result = []
        for u in users:
            result.append({
                "id": u.id,
                "username": u.username,
                "nama": u.nama,
                "role": u.role,
                "has_signature": bool(u.tanda_tangan),
                "tanda_tangan": u.tanda_tangan,
                "foto_profil": u.foto_profil,
                "created_at": u.created_at.strftime("%Y-%m-%d %H:%M:%S") if u.created_at else None
            })
        return jsonify({
            "success": True,
            "data": result,
            "total": len(result)
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@staf_bp.route('/api/staf', methods=['POST'])
@token_required
@role_required(['admin'])
def create_staf():
    """
    Admin mendaftarkan akun Guru Piket baru menggunakan NIP.
    Kata sandi awal otomatis sama dengan NIP guru jika tidak diisi secara manual.
    """
    data = request.json or {}
    nama = str(data.get('nama', '')).strip()
    username = str(data.get('nip') or data.get('username') or '').strip().lower()
    password = str(data.get('password', '')).strip()
    role = str(data.get('role', 'piket')).strip().lower()

    if not nama:
        return jsonify({"success": False, "message": "Nama lengkap guru wajib diisi."}), 400
    if not username:
        return jsonify({"success": False, "message": "NIP guru piket wajib diisi."}), 400

    # Kata sandi awal otomatis sama dengan NIP jika kosong
    if not password:
        password = username

    if len(password) < 4:
        return jsonify({"success": False, "message": "Kata sandi / NIP minimal 4 karakter."}), 400

    # Cek apakah username/NIP sudah dipakai
    if User.query.filter_by(username=username).first():
        return jsonify({"success": False, "message": f"NIP / Username '{username}' sudah terdaftar di sistem."}), 400

    try:
        new_user = User(
            username=username,
            password=generate_password_hash(password, method='scrypt'),
            nama=nama,
            role=role
        )
        db.session.add(new_user)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Akun Guru Piket {new_user.nama} (NIP: {username}) berhasil dibuat dengan kata sandi awal sama dengan NIP.",
            "user": new_user.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@staf_bp.route('/api/staf/<int:id>', methods=['PUT'])
@token_required
@role_required(['admin'])
def update_staf(id):
    """
    Admin memperbarui profil akun Guru Piket.
    """
    user = User.query.get(id)
    if not user:
        return jsonify({"success": False, "message": "Data akun tidak ditemukan."}), 404

    data = request.json or {}
    nama = str(data.get('nama', '')).strip()
    username = str(data.get('username', '')).strip().lower()
    password = str(data.get('password', '')).strip()

    if nama:
        user.nama = nama
    if username and username != user.username:
        if User.query.filter_by(username=username).first():
            return jsonify({"success": False, "message": f"Username '{username}' sudah digunakan akun lain."}), 400
        user.username = username
    if password:
        if len(password) < 4:
            return jsonify({"success": False, "message": "Kata sandi baru minimal 4 karakter."}), 400
        user.password = generate_password_hash(password, method='scrypt')

    try:
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Data akun {user.nama} berhasil diperbarui.",
            "user": user.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@staf_bp.route('/api/staf/<int:id>', methods=['DELETE'])
@token_required
@role_required(['admin'])
def delete_staf(id):
    """
    Admin menghapus akun Guru Piket.
    """
    user = User.query.get(id)
    if not user:
        return jsonify({"success": False, "message": "Data akun tidak ditemukan."}), 404

    if user.username == 'admin' or user.role == 'admin':
        return jsonify({"success": False, "message": "Akun Administrator utama tidak dapat dihapus demi keamanan sistem."}), 403

    try:
        nama_guru = user.nama
        db.session.delete(user)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Akun Guru Piket {nama_guru} berhasil dihapus dari sistem."
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@staf_bp.route('/api/staf/<int:id>/reset_password', methods=['POST'])
@token_required
@role_required(['admin'])
def reset_staf_password(id):
    """
    Admin mereset kata sandi akun Guru Piket dengan enkripsi scrypt.
    """
    user = User.query.get(id)
    if not user:
        return jsonify({"success": False, "message": "Data akun tidak ditemukan."}), 404

    data = request.json or {}
    new_password = str(data.get('new_password', '')).strip() or "piket123"

    try:
        user.password = generate_password_hash(new_password, method='scrypt')
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Kata sandi {user.nama} berhasil direset ke default.",
            "default_password": new_password
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@staf_bp.route('/api/staf/<int:id>/reset_signature', methods=['POST'])
@token_required
@role_required(['admin'])
def reset_staf_signature(id):
    """
    Admin mereset tanda tangan digital akun Guru Piket agar guru dapat membuat tanda tangan baru.
    """
    user = User.query.get(id)
    if not user:
        return jsonify({"success": False, "message": "Data akun tidak ditemukan."}), 404

    try:
        user.tanda_tangan = None
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Tanda tangan digital untuk {user.nama} berhasil direset. Guru dapat menggambar tanda tangan baru saat login."
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

