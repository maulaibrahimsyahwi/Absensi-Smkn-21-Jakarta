import os
import uuid
import base64
from datetime import datetime, time, timedelta
from flask import Blueprint, request, jsonify
from config import BASE_DIR
from models import db, Siswa, AbsensiHarian, PengajuanIzin
from utils.auth_middleware import token_required, role_required

izin_bp = Blueprint('izin', __name__)

UPLOAD_SURAT_DIR = os.path.join(BASE_DIR, 'static', 'uploads', 'surat')
os.makedirs(UPLOAD_SURAT_DIR, exist_ok=True)

def save_base64_surat(base64_str, folder=UPLOAD_SURAT_DIR, prefix='surat'):
    """
    Menyimpan data URI base64 ke berkas file fisik di disk server.
    Mengembalikan path relatif URL untuk disimpan di database (misal: /static/uploads/surat/surat_xxx.jpg).
    """
    if not base64_str or not isinstance(base64_str, str):
        return None
    
    # Jika sudah berupa path URL atau bukan data URI base64, kembalikan apa adanya
    if not base64_str.startswith('data:image'):
        return base64_str

    try:
        header, encoded = base64_str.split(',', 1)
        ext = 'jpg'
        if 'png' in header:
            ext = 'png'
        elif 'webp' in header:
            ext = 'webp'
        
        file_bytes = base64.b64decode(encoded)
        filename = f"{prefix}_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:8]}.{ext}"
        filepath = os.path.join(folder, filename)
        
        with open(filepath, 'wb') as f:
            f.write(file_bytes)
            
        return f"/static/uploads/surat/{filename}"
    except Exception as e:
        print("Gagal menyimpan berkas surat fisik:", e)
        return base64_str  # Fallback to original string if decode fails

# ================= PENGAJUAN IZIN & SAKIT (PORTAL MANDIRI & VERIFIKASI) =================

@izin_bp.route('/api/pengajuan_izin', methods=['POST'])
@token_required
def submit_pengajuan_izin():
    data = request.json or {}
    nis = str(data.get('nis', '')).strip()
    jenis = str(data.get('jenis', '')).strip()  # "Sakit" atau "Izin"
    tgl_mulai_str = str(data.get('tanggal_mulai', '')).strip()
    tgl_selesai_str = str(data.get('tanggal_selesai', '')).strip()
    alasan = str(data.get('alasan', '')).strip()
    surat_bukti = data.get('surat_bukti')  # base64 data uri string
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    lokasi_teks = data.get('lokasi_teks')

    try:
        if latitude is not None and latitude != '':
            latitude = float(latitude)
        else:
            latitude = None
        if longitude is not None and longitude != '':
            longitude = float(longitude)
        else:
            longitude = None
    except (ValueError, TypeError):
        latitude = None
        longitude = None

    if not nis:
        return jsonify({"success": False, "message": "NIS siswa wajib diisi."}), 400
    
    siswa = Siswa.query.filter_by(nis=nis).first()
    if not siswa:
        return jsonify({"success": False, "message": f"Siswa dengan NIS '{nis}' tidak ditemukan dalam database."}), 404

    # Proteksi Anti-Impersonasi: Siswa hanya boleh mengajukan izin untuk dirinya sendiri
    current_user = getattr(request, 'current_user', {})
    if current_user.get('role') == 'siswa':
        if str(siswa.id) != str(current_user.get('user_id')) and str(siswa.nis) != str(current_user.get('identifier', '')):
            return jsonify({
                "success": False,
                "message": "Akses ditolak: Anda hanya dapat mengajukan perizinan atas nama akun Anda sendiri."
            }), 403

    if getattr(siswa, 'status', 'Aktif') == 'Alumni':
        return jsonify({
            "success": False,
            "message": f"Siswa {siswa.nama} ({siswa.kelas}) sudah berstatus Alumni / Lulus dan tidak dapat mengajukan perizinan."
        }), 400

    if jenis not in ["Sakit", "Izin"]:
        return jsonify({"success": False, "message": "Jenis pengajuan harus 'Sakit' atau 'Izin'."}), 400

    if not tgl_mulai_str or not tgl_selesai_str:
        return jsonify({"success": False, "message": "Tanggal mulai dan selesai harus diisi."}), 400

    try:
        tgl_mulai = datetime.strptime(tgl_mulai_str, "%Y-%m-%d").date()
        tgl_selesai = datetime.strptime(tgl_selesai_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"success": False, "message": "Format tanggal tidak valid. Gunakan format YYYY-MM-DD."}), 400

    if tgl_selesai < tgl_mulai:
        return jsonify({"success": False, "message": "Tanggal selesai tidak boleh sebelum tanggal mulai."}), 400

    if (tgl_selesai - tgl_mulai).days > 30:
        return jsonify({"success": False, "message": "Rentang tanggal pengajuan izin maksimal 30 hari."}), 400

    if not alasan:
        return jsonify({"success": False, "message": "Alasan / keterangan ketidakhadiran wajib diisi."}), 400

    MAX_ALASAN_LENGTH = 200
    if len(alasan) > MAX_ALASAN_LENGTH:
        return jsonify({
            "success": False,
            "message": f"Alasan ketidakhadiran terlalu panjang (maksimal {MAX_ALASAN_LENGTH} karakter, terisi {len(alasan)} karakter)."
        }), 400

    # Validasi Wajib Foto Surat Keterangan / Bukti
    if not surat_bukti:
        bukti_label = "Surat Keterangan Dokter / Resep Obat" if jenis == "Sakit" else "Surat Permohonan Izin dari Orang Tua"
        return jsonify({
            "success": False,
            "message": f"Foto Surat Keterangan / Bukti wajib dilampirkan ({bukti_label}). Harap unggah foto bukti dokumen Anda."
        }), 400

    # Validasi Wajib GPS
    if latitude is None or longitude is None:
        return jsonify({
            "success": False,
            "message": "Titik koordinat lokasi GPS wajib disertakan saat mengajukan surat izin / sakit. Harap aktifkan sensor lokasi (GPS) pada perangkat Anda."
        }), 400

    tanda_tangan_siswa = data.get('tanda_tangan_siswa')
    if not tanda_tangan_siswa:
        return jsonify({
            "success": False,
            "message": "Siswa wajib membubuhkan tanda tangan digital pada surat pengajuan izin / sakit."
        }), 400

    try:
        # Simpan foto surat keterangan fisik di folder disk server (menghemat RAM & database)
        file_path_surat = save_base64_surat(surat_bukti, folder=UPLOAD_SURAT_DIR, prefix=f"surat_{siswa.nis}")

        pengajuan = PengajuanIzin(
            siswa_id=siswa.id,
            jenis=jenis,
            tanggal_mulai=tgl_mulai,
            tanggal_selesai=tgl_selesai,
            alasan=alasan,
            surat_bukti=file_path_surat,
            tanda_tangan_siswa=tanda_tangan_siswa,
            latitude=latitude,
            longitude=longitude,
            lokasi_teks=lokasi_teks,
            status_pengajuan="Menunggu"
        )
        db.session.add(pengajuan)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Pengajuan {jenis} atas nama {siswa.nama} ({siswa.kelas}) berhasil dikirim dan sedang menunggu verifikasi guru.",
            "data": pengajuan.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@izin_bp.route('/api/pengajuan_izin', methods=['GET'])
@token_required
@role_required(['piket', 'admin'])
def get_pengajuan_izin():
    status = request.args.get('status')
    query = PengajuanIzin.query
    if status and status != 'ALL':
        query = query.filter_by(status_pengajuan=status)
    pengajuan_list = query.order_by(PengajuanIzin.created_at.desc()).all()
    return jsonify([p.to_dict() for p in pengajuan_list])


@izin_bp.route('/api/pengajuan_izin/<int:id>/verifikasi', methods=['POST'])
@token_required
@role_required(['piket', 'admin'])
def verifikasi_pengajuan_izin(id):
    pengajuan = PengajuanIzin.query.get(id)
    if not pengajuan:
        return jsonify({"success": False, "message": "Data pengajuan tidak ditemukan."}), 404

    data = request.json or {}
    aksi = str(data.get('aksi', '')).strip()  # "Disetujui" atau "Ditolak"
    catatan = str(data.get('catatan', '')).strip()

    if aksi not in ["Disetujui", "Ditolak"]:
        return jsonify({"success": False, "message": "Aksi harus 'Disetujui' atau 'Ditolak'."}), 400

    try:
        pengajuan.status_pengajuan = aksi
        pengajuan.catatan_guru = catatan

        # Jika disetujui, generasikan rekaman AbsensiHarian untuk rentang tanggal tersebut
        if aksi == "Disetujui":
            curr = pengajuan.tanggal_mulai
            while curr <= pengajuan.tanggal_selesai:
                start_day = datetime.combine(curr, time.min)
                end_day = datetime.combine(curr, time.max)
                
                # Cek apakah sudah ada presensi harian untuk siswa di hari ini
                existing = AbsensiHarian.query.filter(
                    AbsensiHarian.siswa_id == pengajuan.siswa_id,
                    AbsensiHarian.waktu >= start_day,
                    AbsensiHarian.waktu <= end_day
                ).first()

                if existing:
                    existing.status = pengajuan.jenis
                else:
                    absensi_baru = AbsensiHarian(
                        siswa_id=pengajuan.siswa_id,
                        waktu=datetime.combine(curr, time(7, 0, 0)),
                        status=pengajuan.jenis
                    )
                    db.session.add(absensi_baru)
                
                curr += timedelta(days=1)

        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Pengajuan {pengajuan.jenis} siswa {pengajuan.siswa.nama} berhasil di-{aksi.lower()}.",
            "data": pengajuan.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

