from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from models import db, User
from utils.auth_middleware import token_required, role_required
from utils.passwords import generate_initial_password, validate_new_password
from utils.audit_trail import record_audit_log

staf_bp = Blueprint('staf', __name__)

@staf_bp.route('/api/staf', methods=['GET'])
@token_required
@role_required(['admin'])
def get_all_staf():
    """
    Mengambil seluruh data akun staf (Guru Piket & Admin) untuk manajemen oleh Admin.
    Mengirim ringkasan profil tanpa memuat data gambar tanda tangan base64 besar.
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
                "foto_profil": u.foto_profil,
                "must_change_password": bool(getattr(u, 'must_change_password', False)),
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
    Admin mendaftarkan akun Guru Piket atau Admin baru menggunakan NIP/Username.
    Kata sandi awal otomatis ditandai must_change_password = True.
    """
    data = request.json or {}
    nama = str(data.get('nama', '')).strip()
    username = str(data.get('nip') or data.get('username') or '').strip().lower()
    password = str(data.get('password', '')).strip()
    role = str(data.get('role', 'piket')).strip().lower()

    if not nama:
        return jsonify({"success": False, "message": "Nama lengkap guru/staf wajib diisi."}), 400
    if not username:
        return jsonify({"success": False, "message": "NIP / Username staf wajib diisi."}), 400
    if role not in ('admin', 'piket'):
        return jsonify({"success": False, "message": "Role staf tidak valid (pilihan: admin atau piket)."}), 400

    # Kata sandi awal otomatis sama dengan NIP/Username jika kosong
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
            role=role,
            must_change_password=True
        )
        db.session.add(new_user)
        db.session.commit()

        current_u = getattr(request, 'current_user', {})
        record_audit_log(
            user_id=current_u.get('user_id'),
            role=current_u.get('role', 'admin'),
            user_name=current_u.get('identifier', 'Admin'),
            action='CREATE_STAF',
            target_type='User',
            target_id=new_user.id,
            keterangan=f"Membuat akun staf baru: {new_user.nama} ({new_user.username}, role: {role})"
        )

        return jsonify({
            "success": True,
            "message": f"Akun {new_user.role.upper()} {new_user.nama} ({username}) berhasil dibuat dengan kata sandi awal.",
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
    Admin memperbarui profil akun Guru Piket atau Admin.
    Jika kata sandi diubah oleh Admin, sesi aktif lama dicabut dan wajib ganti kata sandi.
    """
    user = User.query.get(id)
    if not user:
        return jsonify({"success": False, "message": "Data akun tidak ditemukan."}), 404

    data = request.json or {}
    nama = str(data.get('nama', '')).strip()
    username = str(data.get('username', '')).strip().lower()
    password = str(data.get('password', '')).strip()
    role = str(data.get('role', '')).strip().lower()

    if nama:
        user.nama = nama
    if role and role in ('admin', 'piket'):
        # Lindungi akun admin utama agar tidak berubah role secara tidak sengaja
        if user.username == 'admin' and role != 'admin':
            return jsonify({"success": False, "message": "Role akun Administrator utama tidak dapat diubah."}), 403
        user.role = role
    if username and username != user.username:
        if User.query.filter_by(username=username).first():
            return jsonify({"success": False, "message": f"Username '{username}' sudah digunakan akun lain."}), 400
        user.username = username
    if password:
        if len(password) < 8:
            return jsonify({"success": False, "message": "Kata sandi baru minimal 8 karakter."}), 400
        user.password = generate_password_hash(password, method='scrypt')
        user.must_change_password = True
        user.active_session_token = None  # Invalidate sesi yang sedang berjalan

    try:
        db.session.commit()
        current_u = getattr(request, 'current_user', {})
        record_audit_log(
            user_id=current_u.get('user_id'),
            role='admin',
            user_name=current_u.get('identifier', 'Admin'),
            action='UPDATE_STAF',
            target_type='User',
            target_id=user.id,
            keterangan=f"Memperbarui profil akun staf {user.nama} ({user.username}), role: {user.role}"
        )
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
        username_guru = user.username
        role_guru = user.role
        db.session.delete(user)
        db.session.commit()
        current_u = getattr(request, 'current_user', {})
        record_audit_log(
            user_id=current_u.get('user_id'),
            role='admin',
            user_name=current_u.get('identifier', 'Admin'),
            action='DELETE_STAF',
            target_type='User',
            target_id=id,
            keterangan=f"Menghapus akun staf {nama_guru} ({username_guru}, role: {role_guru}) dari sistem"
        )
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
    Admin mereset kata sandi akun Guru Piket / Admin dengan kata sandi acak yang aman.
    Menandai akun wajib mengganti kata sandi pada login pertama dan mencabut sesi aktif lama.
    """
    user = User.query.get(id)
    if not user:
        return jsonify({"success": False, "message": "Data akun tidak ditemukan."}), 404

    data = request.json or {}
    new_password = str(data.get('new_password', '')).strip()
    if not new_password:
        new_password = generate_initial_password(10)

    try:
        user.password = generate_password_hash(new_password, method='scrypt')
        user.must_change_password = True
        user.active_session_token = None  # Cabut sesi aktif lama
        db.session.commit()

        current_u = getattr(request, 'current_user', {})
        record_audit_log(
            user_id=current_u.get('user_id'),
            role=current_u.get('role', 'admin'),
            user_name=current_u.get('identifier', 'Admin'),
            action='RESET_PASSWORD_STAF',
            target_type='User',
            target_id=user.id,
            keterangan=f"Mereset kata sandi staf {user.nama} ({user.username})"
        )

        return jsonify({
            "success": True,
            "message": f"Kata sandi untuk {user.nama} berhasil direset.",
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

        current_u = getattr(request, 'current_user', {})
        record_audit_log(
            user_id=current_u.get('user_id'),
            role=current_u.get('role', 'admin'),
            user_name=current_u.get('identifier', 'Admin'),
            action='RESET_SIGNATURE_STAF',
            target_type='User',
            target_id=user.id,
            keterangan=f"Mereset tanda tangan digital staf {user.nama} ({user.username})"
        )

        return jsonify({
            "success": True,
            "message": f"Tanda tangan digital untuk {user.nama} berhasil direset. Guru dapat menggambar tanda tangan baru saat login."
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


