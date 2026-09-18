from flask import Blueprint, request, jsonify
from datetime import datetime
from models import db, PelanggaranSiswa, Siswa

pelanggaran_bp = Blueprint('pelanggaran_bp', __name__)

# Master Data 44 Butir Pelanggaran Siswa/i SMKN 21 Jakarta & Poin Baku
MASTER_PELANGGARAN = [
    {"id": 1, "nama": "Bebicara dan bersikap tidak pantas yang mengundang perselisihan", "poin_default": 10, "kategori": "Sedang"},
    {"id": 2, "nama": "Berada di luar kelas pada jam kegiatan belajar mengajar tanpa seizin guru", "poin_default": 5, "kategori": "Ringan"},
    {"id": 3, "nama": "Berdandan secara mencolok (memakai lipstik, ditindik, sulam alis, sulam bibir, cat kuku, cat rambut) dan mengenakan perhiasan /aksesoris secara berlebih", "poin_default": 10, "kategori": "Sedang"},
    {"id": 4, "nama": "Berjudi atau hal-hal yang bisa diindikasikan sebagai perjudian", "poin_default": 50, "kategori": "Berat"},
    {"id": 5, "nama": "Berkelahi dan tawuran", "poin_default": 50, "kategori": "Berat"},
    {"id": 6, "nama": "Berkumpul di luar sekolah/ di sekolah pada hari libur dengan memakai seragam/atribut sekolah atau mengatasnamakan sekolah kecuali seizin Sekolah", "poin_default": 10, "kategori": "Sedang"},
    {"id": 7, "nama": "Berkumpul setelah pulang sekolah di luar sekolah dengan memakai seragam/atribut sekolah atau mengatasnamakan sekolah kecuali seizin sekolah", "poin_default": 10, "kategori": "Sedang"},
    {"id": 8, "nama": "Berperilaku asusila", "poin_default": 100, "kategori": "Sangat Berat"},
    {"id": 9, "nama": "Bertato, rambut dicat, ditindik, memakai cincin, rambut gondrong, gelang, kalung, anting (peserta didik laki-laki)", "poin_default": 10, "kategori": "Sedang"},
    {"id": 10, "nama": "Diantar dan dijemput melewati gapura sekolah", "poin_default": 2, "kategori": "Ringan"},
    {"id": 11, "nama": "Hamil dan menghamili", "poin_default": 100, "kategori": "Sangat Berat"},
    {"id": 12, "nama": "Melakukan bullying, pelecehan, Intolerasi, penghinaan kehormatan martabat warga sekolah", "poin_default": 50, "kategori": "Berat"},
    {"id": 13, "nama": "Melakukan kegiatan ekstrakurikuler di luar jadwal tanpa izin Pembina", "poin_default": 5, "kategori": "Ringan"},
    {"id": 14, "nama": "Melakukan kegiatan mengatasnamakan sekolah tanpa seizin sekolah", "poin_default": 25, "kategori": "Sedang"},
    {"id": 15, "nama": "Melakukan pemerasan atau sejenisnya", "poin_default": 50, "kategori": "Berat"},
    {"id": 16, "nama": "Melakukan tindakan kriminal", "poin_default": 100, "kategori": "Sangat Berat"},
    {"id": 17, "nama": "Melawan guru/karyawan secara verbal dan non verbal", "poin_default": 50, "kategori": "Berat"},
    {"id": 18, "nama": "Memakai barang, benda atau atribut yang tertera logo/tulisan/gambar produk rokok/minuman keras/Narkoba/ organisasi terlarang/terindikasi SARA", "poin_default": 25, "kategori": "Sedang"},
    {"id": 19, "nama": "Memakai sandal dan telanjang kaki dilingkungan sekolah pada saat KBM", "poin_default": 5, "kategori": "Ringan"},
    {"id": 20, "nama": "Memalsukan dokumen administrasi resmi", "poin_default": 50, "kategori": "Berat"},
    {"id": 21, "nama": "Membawa buku bacaan, gambar, Video ataupun HP dan sejenisnya yang memuat pornografi", "poin_default": 50, "kategori": "Berat"},
    {"id": 22, "nama": "Membawa makanan dan minuman kemasan ke dalam kelas", "poin_default": 2, "kategori": "Ringan"},
    {"id": 23, "nama": "Membawa rokok dan Merokok", "poin_default": 50, "kategori": "Berat"},
    {"id": 24, "nama": "Membawa senjata tajam dan benda berbahaya kecuali izin dari guru", "poin_default": 100, "kategori": "Sangat Berat"},
    {"id": 25, "nama": "Membawa/mengkonsumsi/mengedarkan obat-obat terlarang ( Narkoba ) maupun minuman keras dan sejenisnya;", "poin_default": 100, "kategori": "Sangat Berat"},
    {"id": 26, "nama": "Membeli makanan dan minuman melalui aplikasi online (kecuali seizin guru)", "poin_default": 5, "kategori": "Ringan"},
    {"id": 27, "nama": "Membentuk organisasi selain OSIS", "poin_default": 25, "kategori": "Sedang"},
    {"id": 28, "nama": "Memberikan informasi data yang tidak benar (hoaks)", "poin_default": 25, "kategori": "Sedang"},
    {"id": 29, "nama": "Membuang sampah tidak pada tempatnya dan tidak sesuai jenisnya", "poin_default": 2, "kategori": "Ringan"},
    {"id": 30, "nama": "Mencemarkan/merusak nama baik sekolah", "poin_default": 50, "kategori": "Berat"},
    {"id": 31, "nama": "Mencontek, menanyakan, bekerjasama,memperlihatkan, memberi atau menerima jawaban/soal kepada peserta didik lain ketika ulangan/ujian", "poin_default": 25, "kategori": "Sedang"},
    {"id": 32, "nama": "Mencoret-coret dinding, meja, kursi belajar, dan sarana prasarana sekolah", "poin_default": 10, "kategori": "Sedang"},
    {"id": 33, "nama": "Mencuri barang –barang baik milik sekolah maupun milik warga sekolah", "poin_default": 50, "kategori": "Berat"},
    {"id": 34, "nama": "Mengendarai kendaraan bermotor ke sekolah tanpa dilengkapi surat- surat kendaraan (SIM, STNK)", "poin_default": 10, "kategori": "Sedang"},
    {"id": 35, "nama": "Menggunakan gadget dan benda lainnya dalam KBM, kecuali seizin guru", "poin_default": 10, "kategori": "Sedang"},
    {"id": 36, "nama": "Menggunakan pakaian dan atribut selain yang telah ditentukan sekolah kecuali seizin sekolah", "poin_default": 5, "kategori": "Ringan"},
    {"id": 37, "nama": "Menggunakan pakaian terlalu kecil/ sempit;", "poin_default": 5, "kategori": "Ringan"},
    {"id": 38, "nama": "Menyimpan/meninggalkan atribut sekolah, Al Quran, buku, kertas catatan, alat tulis di laci meja", "poin_default": 2, "kategori": "Ringan"},
    {"id": 39, "nama": "Merusak kelestarian tanaman sekolah", "poin_default": 5, "kategori": "Ringan"},
    {"id": 40, "nama": "Merusak sarana /prasarana sekolah", "poin_default": 25, "kategori": "Sedang"},
    {"id": 41, "nama": "Pelecehan Seksual Fisik dan verbal", "poin_default": 100, "kategori": "Sangat Berat"},
    {"id": 42, "nama": "Terlambat masuk sekolah", "poin_default": 5, "kategori": "Ringan"},
    {"id": 43, "nama": "Tidak masuk sekolah tanpa keterangan atau meninggalkan sekolah sebelum berakhirnya kegiatan belajar mengajar tanpa izin (bolos)", "poin_default": 25, "kategori": "Sedang"},
    {"id": 44, "nama": "Tidak memakai atribut sesuai ketentuan sekolah", "poin_default": 5, "kategori": "Ringan"}
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

    # Siapkan tanda tangan siswa
    ttd = tanda_tangan_siswa or getattr(siswa, 'tanda_tangan', None)
    if not ttd:
        ttd = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='60'><text x='10' y='35' font-family='sans-serif' font-size='12' fill='%23e11d48' font-weight='bold'>TERCATAT TERLAMBAT</text><text x='10' y='50' font-family='sans-serif' font-size='9' fill='%2364748b'>Verifikasi Presensi</text></svg>"

    waktu_dt = waktu if isinstance(waktu, datetime) else datetime.combine(waktu, datetime.now().time())
    ket = f"Otomatis tercatat ({sumber})"
    if alasan:
        ket += f": {alasan}"
    else:
        ket += f" pada pukul {waktu_dt.strftime('%H:%M:%S')} WIB (Batas masuk: 06:30 WIB)"

    record = PelanggaranSiswa(
        siswa_id=siswa.id,
        nis=siswa.nis,
        nama_siswa=siswa.nama,
        kelas=siswa.kelas,
        tanggal_waktu=waktu_dt,
        jenis_pelanggaran="Terlambat masuk sekolah",
        poin=5,
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
def handle_sync_terlambat():
    """
    Endpoint manual/admin untuk menyinkronkan data terlambat ke buku saku pelanggaran.
    """
    try:
        count = sync_terlambat_ke_pelanggaran()
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
    Mengambil master data 44 jenis pelanggaran dan daftar pilihan poin.
    """
    return jsonify({
        "success": True,
        "data": MASTER_PELANGGARAN,
        "poin_options": ALLOWED_POIN
    })


@pelanggaran_bp.route('/api/pelanggaran', methods=['POST'])
def create_pelanggaran():
    """
    Mencatat pelanggaran siswa baru.
    Menerima data identitas siswa, jenis pelanggaran, poin, nama guru penegur, dan tanda tangan digital.
    """
    data = request.json or {}

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

    # Validasi input wajib
    if not nama_siswa:
        return jsonify({"success": False, "message": "Nama siswa wajib diisi."}), 400
    if not kelas:
        return jsonify({"success": False, "message": "Kelas siswa wajib dipilih."}), 400
    if not jenis_pelanggaran:
        return jsonify({"success": False, "message": "Jenis pelanggaran wajib dipilih."}), 400
    if poin is None:
        return jsonify({"success": False, "message": "Poin pelanggaran wajib ditentukan."}), 400
    
    try:
        poin = int(poin)
    except (ValueError, TypeError):
        return jsonify({"success": False, "message": "Poin pelanggaran tidak valid."}), 400

    if poin not in ALLOWED_POIN:
        return jsonify({"success": False, "message": f"Poin pelanggaran harus salah satu dari: {ALLOWED_POIN}"}), 400

    if not nama_penanggung_jawab:
        return jsonify({"success": False, "message": "Nama Guru / Tendik penanggung jawab wajib diisi."}), 400
    if not tanda_tangan_siswa:
        return jsonify({"success": False, "message": "Tanda tangan siswa (E-Signature) wajib dibubuhkan."}), 400

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

    # Hubungkan dengan siswa_id jika ada di database
    siswa_id = data.get('siswa_id')
    siswa_obj = None
    if siswa_id:
        siswa_obj = Siswa.query.get(siswa_id)
    elif nis:
        siswa_obj = Siswa.query.filter_by(nis=nis).first()

    if siswa_obj:
        if getattr(siswa_obj, 'status', 'Aktif') == 'Alumni':
            return jsonify({
                "success": False,
                "message": f"Siswa {siswa_obj.nama} ({siswa_obj.kelas}) sudah berstatus Alumni / Lulus dan tidak dapat mencatat pelanggaran sekolah."
            }), 400
        siswa_id = siswa_obj.id
        if not nama_siswa:
            nama_siswa = siswa_obj.nama
        if not kelas:
            kelas = siswa_obj.kelas

    try:
        record = PelanggaranSiswa(
            siswa_id=siswa_id,
            nis=nis or "-",
            nama_siswa=nama_siswa,
            kelas=kelas,
            tanggal_waktu=tanggal_waktu,
            jenis_pelanggaran=jenis_pelanggaran,
            poin=poin,
            nama_penanggung_jawab=nama_penanggung_jawab,
            tanda_tangan_siswa=tanda_tangan_siswa,
            keterangan=keterangan or None
        )
        db.session.add(record)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Catatan pelanggaran siswa {nama_siswa} (+{poin} poin) berhasil disimpan.",
            "data": record.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Gagal menyimpan catatan pelanggaran: {str(e)}"}), 500


@pelanggaran_bp.route('/api/pelanggaran', methods=['GET'])
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
    search = request.args.get('search')
    limit = request.args.get('limit', default=100, type=int)

    query = PelanggaranSiswa.query

    if siswa_id:
        query = query.filter_by(siswa_id=siswa_id)
    if nis:
        query = query.filter_by(nis=nis)
    if kelas and kelas != 'ALL':
        query = query.filter_by(kelas=kelas)
    if tanggal:
        try:
            target_date = datetime.strptime(tanggal, "%Y-%m-%d").date()
            query = query.filter(db.func.date(PelanggaranSiswa.tanggal_waktu) == target_date)
        except ValueError:
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
def get_pelanggaran_rekap():
    """
    Mengambil ringkasan akumulasi poin pelanggaran per siswa,
    daftar siswa dengan poin tertinggi, dan statistik pelanggaran hari ini.
    """
    try:
        today = datetime.now().date()

        # Pelanggaran hari ini
        today_count = PelanggaranSiswa.query.filter(
            db.func.date(PelanggaranSiswa.tanggal_waktu) == today
        ).count()

        # Total catatan pelanggaran
        total_records = PelanggaranSiswa.query.count()

        # Agregasi total poin per siswa
        subquery = db.session.query(
            PelanggaranSiswa.nama_siswa,
            PelanggaranSiswa.nis,
            PelanggaranSiswa.kelas,
            PelanggaranSiswa.siswa_id,
            db.func.sum(PelanggaranSiswa.poin).label('total_poin'),
            db.func.count(PelanggaranSiswa.id).label('jumlah_pelanggaran')
        ).group_by(
            PelanggaranSiswa.nama_siswa,
            PelanggaranSiswa.nis,
            PelanggaranSiswa.kelas,
            PelanggaranSiswa.siswa_id
        ).order_by(db.desc('total_poin')).all()

        rekap_siswa = []
        for row in subquery:
            status = "Aman"
            poin = int(row.total_poin or 0)
            if poin >= 75:
                status = "SP / Rapat Pleno"
            elif poin >= 50:
                status = "Panggilan Orang Tua / BK"
            elif poin >= 25:
                status = "Peringatan Wali Kelas"

            rekap_siswa.append({
                "siswa_id": row.siswa_id,
                "nama_siswa": row.nama_siswa,
                "nis": row.nis,
                "kelas": row.kelas,
                "total_poin": poin,
                "jumlah_pelanggaran": row.jumlah_pelanggaran,
                "status_pembinaan": status
            })

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
def delete_pelanggaran(id):
    """
    Menghapus catatan pelanggaran (hanya dapat dilakukan oleh Guru Piket / Admin).
    """
    record = PelanggaranSiswa.query.get(id)
    if not record:
        return jsonify({"success": False, "message": "Catatan pelanggaran tidak ditemukan."}), 404

    try:
        nama = record.nama_siswa
        poin = record.poin
        db.session.delete(record)
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Catatan pelanggaran untuk {nama} ({poin} poin) berhasil dihapus."
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 500

