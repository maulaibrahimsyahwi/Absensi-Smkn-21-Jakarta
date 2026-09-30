from flask import Blueprint, request, jsonify
from datetime import datetime
from models import db, PelanggaranSiswa, Siswa, PengaturanJadwal
from utils.auth_middleware import token_required, role_required
from utils.audit_trail import record_audit_log
from utils.realtime_bus import notify_data_changed

pelanggaran_bp = Blueprint('pelanggaran_bp', __name__)

# Master Data Prestasi & Poin Penghargaan Siswa (Restorative Justice / Reward Points)
MASTER_PRESTASI = [
    {"id": 101, "nama": "Juara LKS / Lomba Kejuruan (Tingkat Kota / Provinsi / Nasional)", "poin_default": 25, "kategori": "Prestasi"},
    {"id": 102, "nama": "Juara Lomba Akademik / Non-Akademik / Olahraga / Seni", "poin_default": 15, "kategori": "Prestasi"},
    {"id": 103, "nama": "Petugas Upacara / Pasukan Pengibar Bendera (Paskibra) Teladan", "poin_default": 5, "kategori": "Prestasi"},
    {"id": 104, "nama": "Pengurus OSIS / MPK / Ekstrakurikuler Aktif & Berdedikasi", "poin_default": 10, "kategori": "Prestasi"},
    {"id": 105, "nama": "Duta Literasi / Kunjungan Perpustakaan Terajin", "poin_default": 10, "kategori": "Prestasi"},
    {"id": 106, "nama": "Aksi Nyata Kebersihan Lingkungan Sekolah / Relawan 7K", "poin_default": 5, "kategori": "Prestasi"},
    {"id": 107, "nama": "Tindakan Kejujuran (Menyerahkan Barang Temuan Berharga)", "poin_default": 10, "kategori": "Prestasi"},
    {"id": 108, "nama": "Inisiatif Restoratif Khusus / Perbaikan Sikap Terpuji", "poin_default": 10, "kategori": "Prestasi"}
]

# Master Data 44 Butir Pelanggaran Siswa/i SMKN 21 Jakarta (Diurutkan dari poin terkecil ke terbesar)
MASTER_PELANGGARAN = [
    # --- Poin 2 (Ringan) ---
    {"id": 10, "nama": "Diantar dan dijemput melewati gapura sekolah", "poin_default": 2, "kategori": "Ringan"},
    {"id": 22, "nama": "Membawa makanan dan minuman kemasan ke dalam kelas", "poin_default": 2, "kategori": "Ringan"},
    {"id": 29, "nama": "Membuang sampah tidak pada tempatnya dan tidak sesuai jenisnya", "poin_default": 2, "kategori": "Ringan"},
    {"id": 38, "nama": "Menyimpan/meninggalkan atribut sekolah, Al Quran, buku, kertas catatan, alat tulis di laci meja", "poin_default": 2, "kategori": "Ringan"},

    # --- Poin 5 (Ringan) ---
    {"id": 2, "nama": "Berada di luar kelas pada jam kegiatan belajar mengajar tanpa seizin guru", "poin_default": 5, "kategori": "Ringan"},
    {"id": 13, "nama": "Melakukan kegiatan ekstrakurikuler di luar jadwal tanpa izin Pembina", "poin_default": 5, "kategori": "Ringan"},
    {"id": 19, "nama": "Memakai sandal dan telanjang kaki dilingkungan sekolah pada saat KBM", "poin_default": 5, "kategori": "Ringan"},
    {"id": 26, "nama": "Membeli makanan dan minuman melalui aplikasi online (kecuali seizin guru)", "poin_default": 5, "kategori": "Ringan"},
    {"id": 36, "nama": "Menggunakan pakaian dan atribut selain yang telah ditentukan sekolah kecuali seizin sekolah", "poin_default": 5, "kategori": "Ringan"},
    {"id": 37, "nama": "Menggunakan pakaian terlalu kecil/ sempit;", "poin_default": 5, "kategori": "Ringan"},
    {"id": 39, "nama": "Merusak kelestarian tanaman sekolah", "poin_default": 5, "kategori": "Ringan"},
    {"id": 42, "nama": "Terlambat masuk sekolah", "poin_default": 5, "kategori": "Ringan"},
    {"id": 44, "nama": "Tidak memakai atribut sesuai ketentuan sekolah", "poin_default": 5, "kategori": "Ringan"},

    # --- Poin 10 (Sedang) ---
    {"id": 1, "nama": "Bebicara dan bersikap tidak pantas yang mengundang perselisihan", "poin_default": 10, "kategori": "Sedang"},
    {"id": 3, "nama": "Berdandan secara mencolok (memakai lipstik, ditindik, sulam alis, sulam bibir, cat kuku, cat rambut) dan mengenakan perhiasan /aksesoris secara berlebih", "poin_default": 10, "kategori": "Sedang"},
    {"id": 6, "nama": "Berkumpul di luar sekolah/ di sekolah pada hari libur dengan memakai seragam/atribut sekolah atau mengatasnamakan sekolah kecuali seizin Sekolah", "poin_default": 10, "kategori": "Sedang"},
    {"id": 7, "nama": "Berkumpul setelah pulang sekolah di luar sekolah dengan memakai seragam/atribut sekolah atau mengatasnamakan sekolah kecuali seizin sekolah", "poin_default": 10, "kategori": "Sedang"},
    {"id": 9, "nama": "Bertato, rambut dicat, ditindik, memakai cincin, rambut gondrong, gelang, kalung, anting (peserta didik laki-laki)", "poin_default": 10, "kategori": "Sedang"},
    {"id": 32, "nama": "Mencoret-coret dinding, meja, kursi belajar, dan sarana prasarana sekolah", "poin_default": 10, "kategori": "Sedang"},
    {"id": 34, "nama": "Mengendarai kendaraan bermotor ke sekolah tanpa dilengkapi surat- surat kendaraan (SIM, STNK)", "poin_default": 10, "kategori": "Sedang"},
    {"id": 35, "nama": "Menggunakan gadget dan benda lainnya dalam KBM, kecuali seizin guru", "poin_default": 10, "kategori": "Sedang"},

    # --- Poin 25 (Sedang) ---
    {"id": 14, "nama": "Melakukan kegiatan mengatasnamakan sekolah tanpa seizin sekolah", "poin_default": 25, "kategori": "Sedang"},
    {"id": 18, "nama": "Memakai barang, benda atau atribut yang tertera logo/tulisan/gambar produk rokok/minuman keras/Narkoba/ organisasi terlarang/terindikasi SARA", "poin_default": 25, "kategori": "Sedang"},
    {"id": 27, "nama": "Membentuk organisasi selain OSIS", "poin_default": 25, "kategori": "Sedang"},
    {"id": 28, "nama": "Memberikan informasi data yang tidak benar (hoaks)", "poin_default": 25, "kategori": "Sedang"},
    {"id": 31, "nama": "Mencontek, menanyakan, bekerjasama,memperlihatkan, memberi atau menerima jawaban/soal kepada peserta didik lain ketika ulangan/ujian", "poin_default": 25, "kategori": "Sedang"},
    {"id": 40, "nama": "Merusak sarana /prasarana sekolah", "poin_default": 25, "kategori": "Sedang"},
    {"id": 43, "nama": "Tidak masuk sekolah tanpa keterangan atau meninggalkan sekolah sebelum berakhirnya kegiatan belajar mengajar tanpa izin (bolos)", "poin_default": 25, "kategori": "Sedang"},

    # --- Poin 50 (Berat) ---
    {"id": 4, "nama": "Berjudi atau hal-hal yang bisa diindikasikan sebagai perjudian", "poin_default": 50, "kategori": "Berat"},
    {"id": 5, "nama": "Berkelahi dan tawuran", "poin_default": 50, "kategori": "Berat"},
    {"id": 12, "nama": "Melakukan bullying, pelecehan, Intolerasi, penghinaan kehormatan martabat warga sekolah", "poin_default": 50, "kategori": "Berat"},
    {"id": 15, "nama": "Melakukan pemerasan atau sejenisnya", "poin_default": 50, "kategori": "Berat"},
    {"id": 17, "nama": "Melawan guru/karyawan secara verbal dan non verbal", "poin_default": 50, "kategori": "Berat"},
    {"id": 20, "nama": "Memalsukan dokumen administrasi resmi", "poin_default": 50, "kategori": "Berat"},
    {"id": 21, "nama": "Membawa buku bacaan, gambar, Video ataupun HP dan sejenisnya yang memuat pornografi", "poin_default": 50, "kategori": "Berat"},
    {"id": 23, "nama": "Membawa rokok dan Merokok", "poin_default": 50, "kategori": "Berat"},
    {"id": 30, "nama": "Mencemarkan/merusak nama baik sekolah", "poin_default": 50, "kategori": "Berat"},
    {"id": 33, "nama": "Mencuri barang –barang baik milik sekolah maupun milik warga sekolah", "poin_default": 50, "kategori": "Berat"},

    # --- Poin 100 (Sangat Berat) ---
    {"id": 8, "nama": "Berperilaku asusila", "poin_default": 100, "kategori": "Sangat Berat"},
    {"id": 11, "nama": "Hamil dan menghamili", "poin_default": 100, "kategori": "Sangat Berat"},
    {"id": 16, "nama": "Melakukan tindakan kriminal", "poin_default": 100, "kategori": "Sangat Berat"},
    {"id": 24, "nama": "Membawa senjata tajam dan benda berbahaya kecuali izin dari guru", "poin_default": 100, "kategori": "Sangat Berat"},
    {"id": 25, "nama": "Membawa/mengkonsumsi/mengedarkan obat-obat terlarang ( Narkoba ) maupun minuman keras dan sejenisnya;", "poin_default": 100, "kategori": "Sangat Berat"},
    {"id": 41, "nama": "Pelecehan Seksual Fisik dan verbal", "poin_default": 100, "kategori": "Sangat Berat"}
]

ALLOWED_POIN = [2, 5, 10, 25, 50, 100]


def catat_pelanggaran_terlambat(siswa, waktu, sumber="Presensi Harian", petugas="Sistem Presensi / Guru Piket", alasan=None, tanda_tangan_siswa=None):
    """
    Otomatis mencatat pelanggaran 'Terlambat masuk sekolah' (+5 poin) ke PelanggaranSiswa.
    Mencegah duplikasi catatan terlambat pada tanggal yang sama untuk siswa yang sama.
    """
    if not siswa:
        return None

    target_date = waktu.date() if isinstance(waktu, datetime) else waktu

    # Cek apakah sudah tercatat pelanggaran terlambat pada hari tersebut
    existing = PelanggaranSiswa.query.filter(
        PelanggaranSiswa.siswa_id == siswa.id,
        PelanggaranSiswa.jenis_pelanggaran == "Terlambat masuk sekolah",
        db.func.date(PelanggaranSiswa.tanggal_waktu) == target_date
    ).first()

    if existing:
        return existing

    # Siapkan tanda tangan siswa (gunakan tanda tangan digital profil siswa jika ada, atau string kosong jika belum membuat)
    ttd = tanda_tangan_siswa or getattr(siswa, 'tanda_tangan', None) or ""

    waktu_dt = waktu if isinstance(waktu, datetime) else datetime.combine(waktu, datetime.now().time())
    ket = f"Otomatis tercatat ({sumber})"
    if alasan:
        ket += f": {alasan}"
    else:
        ket += f" pada pukul {waktu_dt.strftime('%H:%M:%S')} WIB (Batas masuk: 06:30 WIB)"

    cfg = PengaturanJadwal.query.first()
    curr_ta = cfg.tahun_ajaran if cfg and cfg.tahun_ajaran else "2026/2027"
    curr_sem = cfg.semester if cfg and cfg.semester else "Ganjil"

    record = PelanggaranSiswa(
        siswa_id=siswa.id,
        nis=siswa.nis,
        nama_siswa=siswa.nama,
        kelas=siswa.kelas,
        tanggal_waktu=waktu_dt,
        jenis_pelanggaran="Terlambat masuk sekolah",
        poin=5,
        kategori="Pelanggaran",
        tahun_ajaran=curr_ta,
        semester=curr_sem,
        nama_penanggung_jawab=petugas,
        tanda_tangan_siswa=ttd,
        keterangan=ket
    )
    db.session.add(record)
    return record


def sync_terlambat_ke_pelanggaran():
    """
    Sinkronisasi seluruh riwayat keterlambatan dari AbsensiHarian ke PelanggaranSiswa.
    """
    from models import AbsensiHarian
    terlambat_records = AbsensiHarian.query.filter_by(status='Terlambat').all()
    count = 0
    for a in terlambat_records:
        if a.siswa:
            rec = catat_pelanggaran_terlambat(
                a.siswa,
                a.waktu,
                sumber="Presensi Harian",
                petugas="Sistem Presensi SMKN 21",
                alasan=f"Presensi pukul {a.waktu.strftime('%H:%M:%S')} WIB"
            )
            if rec:
                count += 1
    db.session.commit()
    return count


@pelanggaran_bp.route('/api/pelanggaran/sync_terlambat', methods=['POST'])
@token_required
@role_required(['piket', 'admin'])
def handle_sync_terlambat():
    """
    Endpoint manual/admin untuk menyinkronkan data terlambat ke buku saku pelanggaran.
    """
    try:
        count = sync_terlambat_ke_pelanggaran()
        if count > 0:
            notify_data_changed("pelanggaran")
        return jsonify({
            "success": True,
            "message": f"Berhasil menyinkronkan {count} catatan keterlambatan ke buku saku poin kedisiplinan."
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500


@pelanggaran_bp.route('/api/pelanggaran/master', methods=['GET'])
def get_master_pelanggaran():
    """
    Mengambil master data 44 jenis pelanggaran, daftar prestasi/reward restoratif, dan daftar pilihan poin.
    """
    return jsonify({
        "success": True,
        "data": MASTER_PELANGGARAN,
        "prestasi": MASTER_PRESTASI,
        "poin_options": ALLOWED_POIN
    })


@pelanggaran_bp.route('/api/pelanggaran', methods=['POST'])
@token_required
@role_required(['piket', 'admin', 'siswa'])
def create_pelanggaran():
    """
    Mencatat pelanggaran atau prestasi siswa baru (Restorative Justice / Reward Points).
    Mendukung pencatatan resmi oleh Guru Piket/Admin dan pencatatan mandiri (self-reporting) oleh Siswa.
    Jika diakses oleh Siswa, identitas siswa otomatis dikunci ke akun yang sedang login.
    """
    data = request.json or {}

    current_u = getattr(request, 'current_user', {})
    user_role = str(current_u.get('role', '')).lower()
    user_id = current_u.get('user_id')

    nis = str(data.get('nis', '')).strip()
    nama_siswa = str(data.get('nama_siswa', '')).strip()
    first_name = str(data.get('first_name', '')).strip()
    last_name = str(data.get('last_name', '')).strip()

    # Gabungkan jika dikirim first_name & last_name
    if not nama_siswa and (first_name or last_name):
        nama_siswa = f"{first_name} {last_name}".strip()

    kelas = str(data.get('kelas', '')).strip()
    jenis_pelanggaran = str(data.get('jenis_pelanggaran', '')).strip()
    poin = data.get('poin')
    nama_penanggung_jawab = str(data.get('nama_penanggung_jawab', '')).strip()
    guru_first = str(data.get('guru_first_name', '')).strip()
    guru_last = str(data.get('guru_last_name', '')).strip()

    if not nama_penanggung_jawab and (guru_first or guru_last):
        nama_penanggung_jawab = f"{guru_first} {guru_last}".strip()

    tanda_tangan_siswa = data.get('tanda_tangan_siswa', '')
    keterangan = str(data.get('keterangan', '')).strip()
    tanggal_waktu_str = data.get('tanggal_waktu')

    # Deteksi Kategori: "Pelanggaran" atau "Prestasi" (Reward Points)
    kategori = str(data.get('kategori', '')).strip()
    if not kategori:
        is_prestasi = any(p['nama'].strip().lower() == jenis_pelanggaran.strip().lower() for p in MASTER_PRESTASI)
        kategori = "Prestasi" if is_prestasi else "Pelanggaran"

    # Jika pemohon adalah Siswa (pencatatan mandiri antrean piket), kunci identitas ke akun siswa yang login
    siswa_obj = None
    if user_role == 'siswa':
        siswa_obj = Siswa.query.get(user_id)
        if not siswa_obj:
            return jsonify({"success": False, "message": "Akun siswa Anda tidak ditemukan dalam database."}), 404
        if getattr(siswa_obj, 'status', 'Aktif') == 'Alumni':
            return jsonify({
                "success": False,
                "message": "Akun alumni tidak dapat mencatat pelanggaran/prestasi sekolah."
            }), 400
        siswa_id = siswa_obj.id
        nis = siswa_obj.nis
        nama_siswa = siswa_obj.nama
        kelas = siswa_obj.kelas
    else:
        # Hubungkan dengan siswa_id jika ada di database (petugas piket / admin)
        siswa_id = data.get('siswa_id')
        if siswa_id:
            siswa_obj = Siswa.query.get(siswa_id)
        elif nis:
            siswa_obj = Siswa.query.filter_by(nis=nis).first()

        if siswa_obj:
            if getattr(siswa_obj, 'status', 'Aktif') == 'Alumni':
                return jsonify({
                    "success": False,
                    "message": f"Siswa {siswa_obj.nama} ({siswa_obj.kelas}) sudah berstatus Alumni / Lulus dan tidak dapat mencatat kedisiplinan sekolah."
                }), 400
            siswa_id = siswa_obj.id
            if not nama_siswa:
                nama_siswa = siswa_obj.nama
            if not kelas:
                kelas = siswa_obj.kelas

    # Validasi input wajib
    if not nama_siswa:
        return jsonify({"success": False, "message": "Nama siswa wajib diisi."}), 400
    if not kelas:
        return jsonify({"success": False, "message": "Kelas siswa wajib dipilih."}), 400
    if not jenis_pelanggaran:
        return jsonify({"success": False, "message": "Jenis pelanggaran / prestasi wajib dipilih."}), 400

    # Jika siswa lapor mandiri, kunci poin secara mutlak ke poin default master resmi (anti-manipulasi)
    status_verifikasi = "Disetujui"
    if user_role == 'siswa':
        status_verifikasi = "Menunggu Konfirmasi"
        if kategori == 'Prestasi':
            matched = next((m for m in MASTER_PRESTASI if m['nama'].strip().lower() == jenis_pelanggaran.strip().lower()), None)
            poin = matched['poin_default'] if matched else 10
            nama_penanggung_jawab = "Klaim Mandiri Siswa (Menunggu Verifikasi Guru/Pembina)"
        else:
            matched = next((m for m in MASTER_PELANGGARAN if m['nama'].strip().lower() == jenis_pelanggaran.strip().lower()), None)
            poin = matched['poin_default'] if matched else 5
            nama_penanggung_jawab = "Lapor Mandiri Siswa (Menunggu Verifikasi Guru Piket)"
    else:
        if poin is None:
            if kategori == 'Prestasi':
                matched = next((m for m in MASTER_PRESTASI if m['nama'].strip().lower() == jenis_pelanggaran.strip().lower()), None)
                poin = matched['poin_default'] if matched else 10
            else:
                return jsonify({"success": False, "message": "Poin wajib ditentukan."}), 400
        try:
            poin = int(poin)
        except (ValueError, TypeError):
            return jsonify({"success": False, "message": "Poin tidak valid."}), 400

        if not nama_penanggung_jawab:
            return jsonify({"success": False, "message": "Nama Guru / Tendik penanggung jawab wajib diisi."}), 400

    if not tanda_tangan_siswa:
        return jsonify({"success": False, "message": "Tanda tangan siswa (E-Signature) wajib dibubuhkan langsung di kanvas."}), 400

    # Parse tanggal waktu
    tanggal_waktu = datetime.now()
    if tanggal_waktu_str:
        for fmt in [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M",
            "%d-%b-%Y %I:%M %p",
            "%d-%b-%Y %H:%M",
            "%Y-%m-%d"
        ]:
            try:
                tanggal_waktu = datetime.strptime(tanggal_waktu_str, fmt)
                break
            except ValueError:
                pass

    try:
        cfg = PengaturanJadwal.query.first()
        curr_ta = cfg.tahun_ajaran if cfg and cfg.tahun_ajaran else "2026/2027"
        curr_sem = cfg.semester if cfg and cfg.semester else "Ganjil"

        record = PelanggaranSiswa(
            siswa_id=siswa_id,
            nis=nis or "-",
            nama_siswa=nama_siswa,
            kelas=kelas,
            tanggal_waktu=tanggal_waktu,
            jenis_pelanggaran=jenis_pelanggaran,
            poin=poin,
            kategori=kategori,
            tahun_ajaran=curr_ta,
            semester=curr_sem,
            nama_penanggung_jawab=nama_penanggung_jawab,
            tanda_tangan_siswa=tanda_tangan_siswa,
            status_verifikasi=status_verifikasi,
            keterangan=keterangan or None
        )
        db.session.add(record)
        db.session.commit()
        notify_data_changed("pelanggaran")

        # Catat jejak audit
        if kategori == 'Prestasi':
            action_name = 'KLAIM_PRESTASI_MANDIRI' if user_role == 'siswa' else 'CATAT_PRESTASI'
            ket_audit = f"Pemberian poin penghargaan prestasi '{jenis_pelanggaran}' (+{poin} poin apresiasi, Status: {status_verifikasi}) untuk {nama_siswa} ({kelas})."
            msg = f"Klaim prestasi mandiri berhasil dikirim! Menunggu konfirmasi (+{poin} poin apresiasi)." if user_role == 'siswa' else f"Penghargaan prestasi siswa {nama_siswa} (+{poin} poin apresiasi) berhasil disimpan resmi."
        else:
            action_name = 'LAPOR_PELANGGARAN_MANDIRI' if user_role == 'siswa' else 'CATAT_PELANGGARAN'
            ket_audit = f"Pencatatan pelanggaran '{jenis_pelanggaran}' (+{poin} poin, Status: {status_verifikasi}) untuk {nama_siswa} ({kelas})."
            msg = f"Laporan pelanggaran mandiri berhasil dikirim! Menunggu konfirmasi Guru Piket (+{poin} poin)." if user_role == 'siswa' else f"Catatan pelanggaran siswa {nama_siswa} (+{poin} poin) berhasil disimpan resmi."

        actor_name = f"Siswa: {nama_siswa} ({nis})" if user_role == 'siswa' else current_u.get('identifier', nama_penanggung_jawab)
        record_audit_log(
            user_id=current_u.get('user_id'),
            role=user_role,
            user_name=actor_name,
            action=action_name,
            target_type='PelanggaranSiswa',
            target_id=record.id,
            keterangan=ket_audit
        )

        return jsonify({
            "success": True,
            "message": msg,
            "status_verifikasi": status_verifikasi,
            "data": record.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Gagal menyimpan catatan: {str(e)}"}), 500


@pelanggaran_bp.route('/api/pelanggaran/<int:id>/konfirmasi', methods=['POST'])
@token_required
@role_required(['piket', 'admin'])
def konfirmasi_pelanggaran(id):
    """
    Fitur 1-Klik Guru Piket / Admin untuk mengesahkan atau menolak laporan pelanggaran mandiri siswa.
    """
    rec = PelanggaranSiswa.query.get(id)
    if not rec:
        return jsonify({"success": False, "message": "Catatan pelanggaran tidak ditemukan."}), 404

    data = request.json or {}
    aksi = str(data.get('aksi', 'setujui')).strip().lower()
    current_u = getattr(request, 'current_user', {})
    officer_name = current_u.get('identifier', 'Guru Piket')

    try:
        if aksi in ['tolak', 'batal']:
            db.session.delete(rec)
            db.session.commit()
            notify_data_changed("pelanggaran")
            return jsonify({
                "success": True,
                "message": f"Laporan pelanggaran mandiri {rec.nama_siswa} ({rec.jenis_pelanggaran}) berhasil dibatalkan / ditolak."
            })

        rec.status_verifikasi = "Disetujui"
        rec.nama_penanggung_jawab = f"Disahkan oleh {officer_name}"
        db.session.commit()
        notify_data_changed("pelanggaran")

        record_audit_log(
            user_id=current_u.get('user_id'),
            role=current_u.get('role', 'piket'),
            user_name=officer_name,
            action='KONFIRMASI_PELANGGARAN_MANDIRI',
            target_type='PelanggaranSiswa',
            target_id=rec.id,
            keterangan=f"Guru Piket mengesahkan laporan pelanggaran {rec.nama_siswa} ({rec.jenis_pelanggaran}, +{rec.poin} poin)"
        )

        return jsonify({
            "success": True,
            "message": f"Pelanggaran mandiri {rec.nama_siswa} (+{rec.poin} poin) berhasil disahkan resmi!",
            "data": rec.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Gagal mengonfirmasi pelanggaran: {str(e)}"}), 500


@pelanggaran_bp.route('/api/pelanggaran', methods=['GET'])
@token_required
def get_pelanggaran_list():
    """
    Mengambil daftar catatan pelanggaran siswa dengan filter:
    - siswa_id: id siswa
    - nis: NIS siswa
    - kelas: kelas siswa (misal: "X TKJ 1")
    - tanggal: filter tanggal tertentu (YYYY-MM-DD)
    - search: pencarian nama siswa, NIS, atau jenis pelanggaran
    """
    siswa_id = request.args.get('siswa_id', type=int)
    nis = request.args.get('nis')
    kelas = request.args.get('kelas')
    tanggal = request.args.get('tanggal')
    bulan = request.args.get('bulan')
    tahun = request.args.get('tahun')
    status_verifikasi = request.args.get('status_verifikasi')
    kategori = request.args.get('kategori')
    tahun_ajaran = request.args.get('tahun_ajaran')
    semester = request.args.get('semester')
    search = request.args.get('search')
    limit = request.args.get('limit', default=1000, type=int)

    query = PelanggaranSiswa.query

    current_user = getattr(request, 'current_user', {})
    user_role = current_user.get('role')
    user_id = current_user.get('user_id')

    # Jika pemanggil adalah siswa, kunci hanya untuk data miliknya sendiri (mencegah melihat pelanggaran siswa lain)
    if user_role == 'siswa':
        query = query.filter_by(siswa_id=user_id)
    else:
        if siswa_id:
            query = query.filter_by(siswa_id=siswa_id)
        if nis:
            query = query.filter_by(nis=nis)
        if kelas and kelas != 'ALL':
            query = query.filter_by(kelas=kelas)
        if status_verifikasi and status_verifikasi != 'ALL':
            query = query.filter_by(status_verifikasi=status_verifikasi)

    if kategori and kategori != 'ALL':
        query = query.filter(PelanggaranSiswa.kategori == kategori)
    if tahun_ajaran and tahun_ajaran != 'ALL':
        query = query.filter(PelanggaranSiswa.tahun_ajaran == tahun_ajaran)
    if semester and semester != 'ALL':
        query = query.filter(PelanggaranSiswa.semester == semester)

    if tanggal:
        try:
            target_date = datetime.strptime(tanggal, "%Y-%m-%d").date()
            query = query.filter(db.func.date(PelanggaranSiswa.tanggal_waktu) == target_date)
        except ValueError:
            pass
    if tahun and str(tahun) != 'ALL':
        try:
            query = query.filter(db.extract('year', PelanggaranSiswa.tanggal_waktu) == int(tahun))
        except Exception:
            pass
    if bulan and str(bulan) != 'ALL':
        try:
            query = query.filter(db.extract('month', PelanggaranSiswa.tanggal_waktu) == int(bulan))
        except Exception:
            pass
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            db.or_(
                PelanggaranSiswa.nama_siswa.ilike(search_term),
                PelanggaranSiswa.nis.ilike(search_term),
                PelanggaranSiswa.jenis_pelanggaran.ilike(search_term),
                PelanggaranSiswa.nama_penanggung_jawab.ilike(search_term)
            )
        )

    records = query.order_by(PelanggaranSiswa.tanggal_waktu.desc()).limit(limit).all()

    return jsonify({
        "success": True,
        "data": [r.to_dict() for r in records],
        "total": len(records)
    })


@pelanggaran_bp.route('/api/pelanggaran/rekap', methods=['GET'])
@token_required
@role_required(['piket', 'admin'])
def get_pelanggaran_rekap():
    """
    Mengambil ringkasan akumulasi poin kedisiplinan per siswa (Restorative Justice):
    - total_poin_pelanggaran
    - total_poin_prestasi (reward yang memulihkan poin)
    - poin_bersih = max(0, total_pelanggaran - total_prestasi)
    - SP 1, 2, 3 dievaluasi dari poin_bersih
    Mendukung filter Tahun Ajaran & Semester resmi.
    """
    try:
        today = datetime.now().date()
        tahun_ajaran = request.args.get('tahun_ajaran')
        semester = request.args.get('semester')

        query_base = PelanggaranSiswa.query
        if tahun_ajaran and tahun_ajaran != 'ALL':
            query_base = query_base.filter(PelanggaranSiswa.tahun_ajaran == tahun_ajaran)
        if semester and semester != 'ALL':
            query_base = query_base.filter(PelanggaranSiswa.semester == semester)

        # Pelanggaran hari ini
        today_count = query_base.filter(
            db.func.date(PelanggaranSiswa.tanggal_waktu) == today,
            PelanggaranSiswa.kategori != 'Prestasi'
        ).count()

        # Total catatan
        total_records = query_base.count()

        # Agregasi per siswa
        all_records = query_base.all()
        siswa_map = {}
        for r in all_records:
            key = r.siswa_id or f"{r.nis}_{r.nama_siswa}"
            if key not in siswa_map:
                siswa_map[key] = {
                    "siswa_id": r.siswa_id,
                    "nama_siswa": r.nama_siswa,
                    "nis": r.nis,
                    "kelas": r.kelas,
                    "poin_pelanggaran": 0,
                    "poin_prestasi": 0,
                    "jumlah_pelanggaran": 0,
                    "jumlah_prestasi": 0
                }
            if r.kategori == 'Prestasi':
                siswa_map[key]["poin_prestasi"] += r.poin
                siswa_map[key]["jumlah_prestasi"] += 1
            else:
                siswa_map[key]["poin_pelanggaran"] += r.poin
                siswa_map[key]["jumlah_pelanggaran"] += 1

        rekap_siswa = []
        for key, s in siswa_map.items():
            poin_bersih = max(0, s["poin_pelanggaran"] - s["poin_prestasi"])
            status = "Aman (< 30 Poin)"
            sp_level = "Aman"
            if poin_bersih >= 100:
                sp_level = "SP 3"
                status = "SP 3 (Sidang Pleno / Drop Out)"
            elif poin_bersih >= 50:
                sp_level = "SP 2"
                status = "SP 2 (Panggilan Orang Tua / BK)"
            elif poin_bersih >= 30:
                sp_level = "SP 1"
                status = "SP 1 (Peringatan / Wali Kelas)"

            rekap_siswa.append({
                "siswa_id": s["siswa_id"],
                "nama_siswa": s["nama_siswa"],
                "nis": s["nis"],
                "kelas": s["kelas"],
                "total_poin_pelanggaran": s["poin_pelanggaran"],
                "total_poin_prestasi": s["poin_prestasi"],
                "total_poin": poin_bersih,
                "poin_bersih": poin_bersih,
                "jumlah_pelanggaran": s["jumlah_pelanggaran"],
                "jumlah_prestasi": s["jumlah_prestasi"],
                "sp_level": sp_level,
                "status_pembinaan": status
            })

        rekap_siswa.sort(key=lambda x: x["poin_bersih"], reverse=True)

        return jsonify({
            "success": True,
            "statistik": {
                "pelanggaran_hari_ini": today_count,
                "total_catatan": total_records,
                "siswa_tercatat": len(rekap_siswa)
            },
            "rekap_siswa": rekap_siswa
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@pelanggaran_bp.route('/api/pelanggaran/<int:id>', methods=['DELETE'])
@token_required
@role_required(['admin'])
def delete_pelanggaran(id):
    """
    Menghapus catatan pelanggaran (hanya dapat dilakukan oleh Superadmin).
    """
    record = PelanggaranSiswa.query.get(id)
    if not record:
        return jsonify({"success": False, "message": "Catatan pelanggaran tidak ditemukan."}), 404

    try:
        nama = record.nama_siswa
        poin = record.poin
        jenis = record.jenis_pelanggaran
        kelas = record.kelas
        record_id = record.id

        db.session.delete(record)
        db.session.commit()
        notify_data_changed("pelanggaran")

        # Catat jejak audit penghapusan pelanggaran
        current_u = getattr(request, 'current_user', {})
        record_audit_log(
            user_id=current_u.get('user_id'),
            role=current_u.get('role', 'piket'),
            user_name=current_u.get('identifier', 'Guru Piket'),
            action='HAPUS_PELANGGARAN',
            target_type='PelanggaranSiswa',
            target_id=record_id,
            keterangan=f"Menghapus catatan pelanggaran '{jenis}' ({poin} poin) milik {nama} ({kelas})"
        )

        return jsonify({
            "success": True,
            "message": f"Catatan pelanggaran untuk {nama} ({poin} poin) berhasil dihapus."
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

