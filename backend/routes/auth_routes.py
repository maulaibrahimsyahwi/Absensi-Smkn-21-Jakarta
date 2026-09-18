from flask import Blueprint, request, jsonify
from models import db, User, Siswa, AbsensiHarian, AbsensiPerpustakaan, PengajuanIzin, IzinPiket

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json or {}
    username = str(data.get('username', '')).strip()
    password = str(data.get('password', '')).strip()
    role_requested = str(data.get('role', '')).strip().lower()

    if not username:
        return jsonify({"success": False, "message": "Username atau NIS wajib diisi."}), 400
    if not password:
        return jsonify({"success": False, "message": "Password wajib diisi."}), 400

    # 1. Cek Login Siswa (jika role eksplisit 'siswa' atau username cocok dengan NIS siswa)
    if role_requested == 'siswa' or (username.isdigit() and len(username) >= 4):
        siswa = Siswa.query.filter_by(nis=username).first()
        if siswa:
            if getattr(siswa, 'status', 'Aktif') == 'Alumni':
                # Cek apakah masa tenggang akun alumni telah lewat 1 tahun (365 hari)
                if siswa.is_alumni_expired():
                    return jsonify({
                        "success": False, 
                        "message": f"Masa aktif akun alumni Anda ({siswa.nama}) telah berakhir (> 1 tahun sejak kelulusan). Akun telah diarsipkan oleh SMKN 21 Jakarta."
                    }), 403

            # Validasi password siswa: jika belum diset, default password adalah NIS
            valid_pass = siswa.password if siswa.password else siswa.nis
            if password != valid_pass:
                return jsonify({
                    "success": False, 
                    "message": "Password siswa salah." if siswa.password else "Password siswa salah. (Default password: NIS Anda)"
                }), 401

            is_alumni_user = getattr(siswa, 'status', 'Aktif') == 'Alumni'
            welcome_prefix = "Selamat datang kembali (Alumni)" if is_alumni_user else "Selamat datang"

            return jsonify({
                "success": True,
                "message": f"{welcome_prefix}, {siswa.nama}!",
                "user": {
                    "id": siswa.id,
                    "role": "siswa",
                    "username": siswa.nis,
                    "nama": siswa.nama,
                    "nis": siswa.nis,
                    "kelas": siswa.kelas,
                    "status": siswa.status or "Aktif",
                    "tanggal_lulus": siswa.tanggal_lulus.strftime("%Y-%m-%d %H:%M:%S") if siswa.tanggal_lulus else None,
                    "tanda_tangan": siswa.tanda_tangan,
                    "foto_profil": siswa.foto_profil,
                    "terdaftar": bool(siswa.face_encoding)
                }
            })

    # 2. Cek Login Staf (Admin & Guru Piket)
    user = User.query.filter_by(username=username).first()
    if user:
        if user.password != password:
            return jsonify({"success": False, "message": "Password yang dimasukkan salah."}), 401
        
        if role_requested and role_requested != user.role:
            return jsonify({
                "success": False, 
                "message": f"Akun ini terdaftar sebagai {user.role.upper()}, bukan {role_requested.upper()}."
            }), 403

        role_label = "Administrator" if user.role == "admin" else "Guru Piket"
        return jsonify({
            "success": True,
            "message": f"Login berhasil sebagai {role_label} ({user.nama}).",
            "user": {
                "id": user.id,
                "role": user.role,
                "username": user.username,
                "nama": user.nama,
                "tanda_tangan": user.tanda_tangan,
                "foto_profil": user.foto_profil
            }
        })

    return jsonify({"success": False, "message": "Akun tidak ditemukan. Periksa kembali Username atau NIS Anda."}), 404


@auth_bp.route('/api/auth/signature', methods=['POST'])
def save_signature():
    """
    Menyimpan atau memperbarui tanda tangan digital (Base64 PNG) untuk pengguna yang sedang aktif.
    """
    data = request.json or {}
    role = str(data.get('role', '')).strip().lower()
    user_id = data.get('id')
    signature = data.get('signature')

    if not role or not user_id:
        return jsonify({"success": False, "message": "Data role dan ID pengguna wajib disertakan."}), 400

    try:
        if role == 'siswa':
            siswa = Siswa.query.get(user_id)
            if not siswa:
                return jsonify({"success": False, "message": "Data siswa tidak ditemukan."}), 404
            
            # Anti-abuse: Jika siswa sudah memiliki tanda tangan dan ingin memperbaruinya,
            # wajib verifikasi password siswa agar orang lain tidak bisa sembarangan mengganti tanda tangannya
            if siswa.tanda_tangan and not data.get('admin_override', False):
                password = str(data.get('password', '')).strip()
                if not password:
                    return jsonify({
                        "success": False,
                        "require_password": True,
                        "message": "Untuk mencegah pemalsuan/penyalahgunaan, masukkan kata sandi akun Anda untuk memperbarui tanda tangan digital."
                    }), 400
                
                valid_pass = siswa.password if siswa.password else siswa.nis
                if password != valid_pass:
                    return jsonify({
                        "success": False,
                        "require_password": True,
                        "message": "Kata sandi salah. Pembaruan tanda tangan digital ditolak."
                    }), 401

            siswa.tanda_tangan = signature
            db.session.commit()
            return jsonify({
                "success": True,
                "message": f"Tanda tangan digital untuk {siswa.nama} berhasil disimpan.",
                "tanda_tangan": signature
            })
        else:
            user = User.query.get(user_id)
            if not user:
                return jsonify({"success": False, "message": "Data petugas tidak ditemukan."}), 404
            user.tanda_tangan = signature
            db.session.commit()
            return jsonify({
                "success": True,
                "message": f"Tanda tangan digital untuk {user.nama} berhasil disimpan.",
                "tanda_tangan": signature
            })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


# ================= UPLOAD & HAPUS FOTO PROFIL (AVATAR) =================

@auth_bp.route('/api/auth/foto_profil', methods=['POST'])
def save_foto_profil():
    """
    Menyimpan atau memperbarui foto profil (avatar) pengguna (Siswa, Guru Piket, atau Admin).
    Dibatasi maksimal ~2 MB (Base64 string < 2.8 MB).
    """
    data = request.json or {}
    role = str(data.get('role', '')).strip().lower()
    user_id = data.get('id')
    foto_profil = data.get('foto_profil', '')

    if not role or not user_id:
        return jsonify({"success": False, "message": "Identitas pengguna wajib disertakan."}), 400
    if not foto_profil:
        return jsonify({"success": False, "message": "Data gambar foto profil tidak boleh kosong."}), 400

    # Batasi ukuran file foto: maksimal < 500 KB (~680 KB data URI base64)
    MAX_BASE64_LEN = int(700 * 1024)
    if len(foto_profil) > MAX_BASE64_LEN:
        return jsonify({
            "success": False, 
            "message": "Ukuran foto profil terlalu besar! Maksimal ukuran file yang diizinkan adalah < 500 KB."
        }), 400

    if not foto_profil.startswith('data:image/'):
        return jsonify({"success": False, "message": "Format foto tidak valid. Gunakan format JPG, PNG, atau WEBP."}), 400

    try:
        if role == 'siswa':
            siswa = Siswa.query.get(user_id)
            if not siswa:
                return jsonify({"success": False, "message": "Data siswa tidak ditemukan."}), 404
            siswa.foto_profil = foto_profil
            db.session.commit()
            return jsonify({
                "success": True,
                "message": f"Foto profil untuk {siswa.nama} berhasil diperbarui!",
                "foto_profil": foto_profil
            })
        else:
            user = User.query.get(user_id)
            if not user:
                return jsonify({"success": False, "message": "Data pengguna tidak ditemukan."}), 404
            user.foto_profil = foto_profil
            db.session.commit()
            return jsonify({
                "success": True,
                "message": f"Foto profil untuk {user.nama} berhasil diperbarui!",
                "foto_profil": foto_profil
            })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@auth_bp.route('/api/auth/foto_profil', methods=['DELETE'])
def delete_foto_profil():
    """
    Menghapus foto profil pengguna dan mengembalikannya ke avatar default.
    """
    data = request.json or {}
    role = str(data.get('role', '')).strip().lower()
    user_id = data.get('id')

    if not role or not user_id:
        return jsonify({"success": False, "message": "Identitas pengguna wajib disertakan."}), 400

    try:
        if role == 'siswa':
            siswa = Siswa.query.get(user_id)
            if not siswa:
                return jsonify({"success": False, "message": "Data siswa tidak ditemukan."}), 404
            siswa.foto_profil = None
            db.session.commit()
            return jsonify({
                "success": True,
                "message": f"Foto profil {siswa.nama} berhasil dihapus."
            })
        else:
            user = User.query.get(user_id)
            if not user:
                return jsonify({"success": False, "message": "Data pengguna tidak ditemukan."}), 404
            user.foto_profil = None
            db.session.commit()
            return jsonify({
                "success": True,
                "message": f"Foto profil {user.nama} berhasil dihapus."
            })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@auth_bp.route('/api/siswa/me/rekap', methods=['GET'])
def get_personal_siswa_rekap():
    """
    Mengambil data rekapitulasi kehadiran dan riwayat perizinan pribadi khusus untuk siswa yang login.
    """
    siswa_id = request.args.get('siswa_id')
    nis = request.args.get('nis')

    siswa = None
    if siswa_id:
        siswa = Siswa.query.get(siswa_id)
    elif nis:
        siswa = Siswa.query.filter_by(nis=nis).first()

    if not siswa:
        return jsonify({"success": False, "message": "Data siswa tidak ditemukan."}), 404

    # Hitung statistik kehadiran siswa
    harian_records = AbsensiHarian.query.filter_by(siswa_id=siswa.id).all()
    perpus_records = AbsensiPerpustakaan.query.filter_by(siswa_id=siswa.id).all()
    pengajuan_records = PengajuanIzin.query.filter_by(siswa_id=siswa.id).order_by(PengajuanIzin.created_at.desc()).all()
    piket_records = IzinPiket.query.filter_by(siswa_id=siswa.id).order_by(IzinPiket.created_at.desc()).all()

    tepat_waktu = sum(1 for h in harian_records if h.status == 'Tepat Waktu')
    terlambat = sum(1 for h in harian_records if h.status == 'Terlambat')
    sakit = sum(1 for h in harian_records if h.status == 'Sakit')
    izin = sum(1 for h in harian_records if h.status == 'Izin')
    total_hadir = tepat_waktu + terlambat

    return jsonify({
        "success": True,
        "siswa": siswa.to_dict(),
        "statistik": {
            "total_hadir": total_hadir,
            "tepat_waktu": tepat_waktu,
            "terlambat": terlambat,
            "sakit": sakit,
            "izin": izin,
            "kunjungan_perpus": len(perpus_records)
        },
        "riwayat_pengajuan": [p.to_dict() for p in pengajuan_records],
        "riwayat_piket": [i.to_dict() for i in piket_records]
    })


# ================= UBAH KATA SANDI & RESET PASSWORD =================

@auth_bp.route('/api/auth/change_password', methods=['POST'])
def change_password():
    """
    Mengubah kata sandi mandiri untuk pengguna yang sedang aktif (Siswa, Guru Piket, atau Admin).
    """
    data = request.json or {}
    user_id = data.get('id')
    role = str(data.get('role', '')).strip().lower()
    old_password = str(data.get('old_password', '')).strip()
    new_password = str(data.get('new_password', '')).strip()

    if not user_id or not role:
        return jsonify({"success": False, "message": "Identitas pengguna tidak valid."}), 400
    if not old_password:
        return jsonify({"success": False, "message": "Kata sandi saat ini wajib diisi."}), 400
    if not new_password:
        return jsonify({"success": False, "message": "Kata sandi baru wajib diisi."}), 400
    if len(new_password) < 4:
        return jsonify({"success": False, "message": "Kata sandi baru minimal 4 karakter."}), 400

    try:
        if role == 'siswa':
            siswa = Siswa.query.get(user_id)
            if not siswa:
                return jsonify({"success": False, "message": "Data siswa tidak ditemukan."}), 404
            
            # Cek password lama (jika belum pernah diubah, default adalah NIS)
            current_pass = siswa.password if siswa.password else siswa.nis
            if old_password != current_pass:
                return jsonify({"success": False, "message": "Kata sandi saat ini tidak cocok."}), 400
            
            siswa.password = new_password
            db.session.commit()
            return jsonify({
                "success": True,
                "message": f"Kata sandi untuk siswa {siswa.nama} berhasil diperbarui!"
            })
        else:
            user = User.query.get(user_id)
            if not user:
                return jsonify({"success": False, "message": "Data pengguna staf tidak ditemukan."}), 404
            
            if user.password != old_password:
                return jsonify({"success": False, "message": "Kata sandi saat ini tidak cocok."}), 400
            
            user.password = new_password
            db.session.commit()
            return jsonify({
                "success": True,
                "message": f"Kata sandi untuk {user.nama} berhasil diperbarui!"
            })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Gagal memperbarui kata sandi: {str(e)}"}), 500


@auth_bp.route('/api/siswa/<int:id>/reset_password', methods=['POST'])
def reset_siswa_password(id):
    """
    Fitur khusus Admin: Mereset kata sandi siswa kembali ke default (NIS siswa).
    """
    try:
        siswa = Siswa.query.get(id)
        if not siswa:
            return jsonify({"success": False, "message": "Data siswa tidak ditemukan."}), 404

        siswa.password = None  # Reset ke None agar login menggunakan NIS sebagai default
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Kata sandi {siswa.nama} ({siswa.kelas}) berhasil direset ke default (NIS: {siswa.nis}).",
            "default_password": siswa.nis
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Gagal mereset kata sandi: {str(e)}"}), 500


@auth_bp.route('/api/siswa/<int:id>/reset_signature', methods=['POST'])
def reset_siswa_signature(id):
    """
    Fitur khusus Admin: Mereset tanda tangan digital siswa agar siswa dapat membuat tanda tangan baru.
    """
    try:
        siswa = Siswa.query.get(id)
        if not siswa:
            return jsonify({"success": False, "message": "Data siswa tidak ditemukan."}), 404
        
        siswa.tanda_tangan = None
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Tanda tangan digital {siswa.nama} ({siswa.kelas}) berhasil direset. Siswa dapat membuat tanda tangan baru."
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Gagal mereset tanda tangan: {str(e)}"}), 500


# ================= MANAJEMEN AKUN STAF / GURU PIKET (ADMIN ONLY) =================

def require_admin():
    """
    Memeriksa apakah pemanggil adalah Administrator (berdasarkan header X-User-Role).
    Jika pemanggil secara eksplisit adalah siswa atau piket, akses ditolak.
    """
    role = request.headers.get('X-User-Role') or request.args.get('role')
    if role and role.lower() != 'admin':
        return False
    return True


@auth_bp.route('/api/staf', methods=['GET'])
def get_all_staf():
    """
    Mengambil seluruh data akun staf (Guru Piket & Admin) untuk manajemen oleh Admin.
    """
    if not require_admin():
        return jsonify({"success": False, "message": "Akses ditolak. Pengelolaan akun staf hanya dapat dilakukan oleh Administrator."}), 403

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


@auth_bp.route('/api/staf', methods=['POST'])
def create_staf():
    """
    Admin mendaftarkan akun Guru Piket baru.
    """
    if not require_admin():
        return jsonify({"success": False, "message": "Akses ditolak. Pengelolaan akun staf hanya dapat dilakukan oleh Administrator."}), 403

    data = request.json or {}
    nama = str(data.get('nama', '')).strip()
    username = str(data.get('username', '')).strip().lower()
    password = str(data.get('password', '')).strip()
    role = str(data.get('role', 'piket')).strip().lower()

    if not nama:
        return jsonify({"success": False, "message": "Nama lengkap guru wajib diisi."}), 400
    if not username:
        return jsonify({"success": False, "message": "Username / NIP akun wajib diisi."}), 400
    if not password:
        return jsonify({"success": False, "message": "Kata sandi awal wajib diisi."}), 400
    if len(password) < 4:
        return jsonify({"success": False, "message": "Kata sandi minimal 4 karakter."}), 400

    # Cek apakah username sudah dipakai
    if User.query.filter_by(username=username).first():
        return jsonify({"success": False, "message": f"Username '{username}' sudah digunakan oleh pengguna lain."}), 400

    try:
        new_user = User(
            username=username,
            password=password,
            nama=nama,
            role=role
        )
        db.session.add(new_user)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Akun {new_user.nama} ({'Guru Piket' if role == 'piket' else 'Admin'}) berhasil dibuat!",
            "user": new_user.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@auth_bp.route('/api/staf/<int:id>', methods=['PUT'])
def update_staf(id):
    """
    Admin memperbarui profil akun Guru Piket.
    """
    if not require_admin():
        return jsonify({"success": False, "message": "Akses ditolak. Pengelolaan akun staf hanya dapat dilakukan oleh Administrator."}), 403

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
        user.password = password

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


@auth_bp.route('/api/staf/<int:id>', methods=['DELETE'])
def delete_staf(id):
    """
    Admin menghapus akun Guru Piket.
    """
    if not require_admin():
        return jsonify({"success": False, "message": "Akses ditolak. Pengelolaan akun staf hanya dapat dilakukan oleh Administrator."}), 403

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


@auth_bp.route('/api/staf/<int:id>/reset_password', methods=['POST'])
def reset_staf_password(id):
    """
    Admin mereset kata sandi akun Guru Piket.
    """
    if not require_admin():
        return jsonify({"success": False, "message": "Akses ditolak. Pengelolaan akun staf hanya dapat dilakukan oleh Administrator."}), 403

    user = User.query.get(id)
    if not user:
        return jsonify({"success": False, "message": "Data akun tidak ditemukan."}), 404

    data = request.json or {}
    new_password = str(data.get('new_password', '')).strip() or "piket123"

    try:
        user.password = new_password
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Kata sandi {user.nama} berhasil direset ke: {new_password}",
            "default_password": new_password
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@auth_bp.route('/api/staf/<int:id>/reset_signature', methods=['POST'])
def reset_staf_signature(id):
    """
    Admin mereset tanda tangan digital akun Guru Piket agar guru dapat membuat tanda tangan baru.
    """
    if not require_admin():
        return jsonify({"success": False, "message": "Akses ditolak. Pengelolaan akun staf hanya dapat dilakukan oleh Administrator."}), 403

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




