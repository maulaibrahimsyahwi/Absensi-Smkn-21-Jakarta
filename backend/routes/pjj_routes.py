import json
from datetime import datetime, date
from flask import Blueprint, request, jsonify
from models import db, PengaturanPJJ, Siswa
from utils.auth_middleware import token_required, role_required
from utils.helpers import is_kelas_pjj

pjj_bp = Blueprint('pjj', __name__)

# Daftar kelas resmi SMKN 21 Jakarta (Kurikulum Merdeka)
DAFTAR_KELAS_RESMI = [
    "X PPLG 1", "X PPLG 2", "XI PPLG 1", "XI PPLG 2", "XII PPLG 1", "XII PPLG 2",
    "X AKL 1", "X AKL 2", "XI AKL 1", "XI AKL 2", "XII AKL 1", "XII AKL 2",
    "X MPLB 1", "X MPLB 2", "XI MPLB 1", "XI MPLB 2", "XII MPLB 1", "XII MPLB 2",
    "X BR 1", "X BR 2", "XI BR 1", "XI BR 2", "XII BR 1", "XII BR 2"
]


def get_or_create_pjj_config():
    """Mengambil atau menginisialisasi baris konfigurasi PJJ (singleton)."""
    cfg = PengaturanPJJ.query.first()
    if not cfg:
        cfg = PengaturanPJJ(
            is_active=False,
            tipe_lingkup="tingkat",
            tingkat_aktif=json.dumps([]),
            kelas_aktif=json.dumps([]),
            keterangan="Normal PTM",
            updated_by="Sistem"
        )
        db.session.add(cfg)
        db.session.commit()
    return cfg


@pjj_bp.route('/api/pjj/status', methods=['GET'])
def get_pjj_status():
    """
    Mengambil status konfigurasi PJJ terkini beserta metadata tingkat dan kelas.
    Dapat diakses publik (termasuk oleh antarmuka presensi siswa dan kiosk).
    """
    try:
        cfg = get_or_create_pjj_config()
        now_dt = datetime.now()
        cur_date = now_dt.date()

        # Cek apakah konfigurasi secara kalender aktif hari ini
        is_active_today = cfg.is_active
        if is_active_today:
            if cfg.tanggal_mulai and cur_date < cfg.tanggal_mulai:
                is_active_today = False
            if cfg.tanggal_selesai and cur_date > cfg.tanggal_selesai:
                is_active_today = False

        data = cfg.to_dict()
        data['is_active_today'] = is_active_today
        data['daftar_kelas_tersedia'] = DAFTAR_KELAS_RESMI
        data['tingkat_tersedia'] = ["X", "XI", "XII"]

        return jsonify({
            "success": True,
            "data": data
        })
    except Exception as e:
        return jsonify({"success": False, "message": f"Gagal mengambil status PJJ: {e}"}), 500


@pjj_bp.route('/api/pjj/cek_siswa', methods=['GET'])
def cek_siswa_pjj():
    """
    Memeriksa apakah siswa atau kelas tertentu diizinkan melakukan presensi dari rumah (PJJ) hari ini.
    Query params:
    - siswa_id: ID siswa
    - kelas: Nama kelas siswa
    """
    siswa_id = request.args.get('siswa_id')
    kelas_str = request.args.get('kelas', '')

    if siswa_id and not kelas_str:
        s = Siswa.query.get(siswa_id)
        if s:
            kelas_str = s.kelas

    pjj_active, pjj_info = is_kelas_pjj(kelas_str)
    return jsonify({
        "success": True,
        "kelas": kelas_str,
        "is_pjj": pjj_active,
        "keterangan": pjj_info
    })


@pjj_bp.route('/api/pjj/settings', methods=['POST'])
@token_required
@role_required(['admin', 'piket'])
def update_pjj_settings():
    """
    Memperbarui konfigurasi Mode PJJ (Pembelajaran Jarak Jauh).
    Hanya dapat diakses oleh Guru Piket dan Admin Sekolah.
    """
    data = request.json or {}
    current_user = getattr(request, 'current_user', {})
    updater_name = current_user.get('nama') or current_user.get('identifier') or 'Petugas'

    is_active = bool(data.get('is_active', False))
    tipe_lingkup = str(data.get('tipe_lingkup', 'tingkat')).strip().lower()
    if tipe_lingkup not in ['semua', 'tingkat', 'kelas']:
        tipe_lingkup = 'tingkat'

    tingkat_aktif = data.get('tingkat_aktif', [])
    if not isinstance(tingkat_aktif, list):
        tingkat_aktif = []
    # Validasi hanya tingkat X, XI, XII
    tingkat_aktif = [t for t in tingkat_aktif if str(t).upper() in ['X', 'XI', 'XII']]

    kelas_aktif = data.get('kelas_aktif', [])
    if not isinstance(kelas_aktif, list):
        kelas_aktif = []

    tgl_mulai_str = data.get('tanggal_mulai')
    tgl_selesai_str = data.get('tanggal_selesai')
    keterangan = str(data.get('keterangan', '')).strip()

    tgl_mulai = None
    tgl_selesai = None
    if tgl_mulai_str:
        try:
            tgl_mulai = datetime.strptime(str(tgl_mulai_str).strip(), "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"success": False, "message": "Format tanggal_mulai tidak valid (YYYY-MM-DD)."}), 400

    if tgl_selesai_str:
        try:
            tgl_selesai = datetime.strptime(str(tgl_selesai_str).strip(), "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"success": False, "message": "Format tanggal_selesai tidak valid (YYYY-MM-DD)."}), 400

    if tgl_mulai and tgl_selesai and tgl_selesai < tgl_mulai:
        return jsonify({"success": False, "message": "Tanggal selesai tidak boleh lebih awal dari tanggal mulai."}), 400

    try:
        cfg = get_or_create_pjj_config()
        cfg.is_active = is_active
        cfg.tipe_lingkup = tipe_lingkup
        cfg.tingkat_aktif = json.dumps(tingkat_aktif)
        cfg.kelas_aktif = json.dumps(kelas_aktif)
        cfg.tanggal_mulai = tgl_mulai
        cfg.tanggal_selesai = tgl_selesai
        cfg.keterangan = keterangan or ("PJJ Daring" if is_active else "Normal PTM")
        cfg.updated_by = updater_name
        cfg.updated_at = datetime.now()

        db.session.commit()

        # Rangkuman pesan respon
        if not is_active:
            msg = "Mode PJJ dinonaktifkan. Seluruh kelas kembali ke Pembelajaran Tatap Muka (PTM) di sekolah."
        elif tipe_lingkup == 'semua':
            msg = "Mode PJJ diaktifkan untuk Seluruh Siswa SMKN 21."
        elif tipe_lingkup == 'tingkat':
            tingkat_str = ", ".join(tingkat_aktif) if tingkat_aktif else "Tidak ada"
            msg = f"Mode PJJ diaktifkan untuk Tingkat {tingkat_str}."
        else:
            msg = f"Mode PJJ diaktifkan untuk {len(kelas_aktif)} kelas pilihan."

        return jsonify({
            "success": True,
            "message": msg,
            "data": cfg.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Gagal menyimpan pengaturan PJJ: {e}"}), 500

