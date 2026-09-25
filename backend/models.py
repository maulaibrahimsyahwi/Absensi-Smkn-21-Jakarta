import json
from datetime import datetime, date
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    """
    Model pengguna untuk Staf Admin dan Guru Piket SMKN 21 Jakarta.
    """
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False, index=True)
    password = db.Column(db.String(100), nullable=False)
    nama = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="piket")  # "admin" atau "piket"
    tanda_tangan = db.Column(db.Text, nullable=True)  # Base64 PNG signature
    foto_profil = db.Column(db.Text, nullable=True)   # Base64 JPEG/PNG avatar foto profil
    two_factor_secret = db.Column(db.String(64), nullable=True)
    two_factor_enabled = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "nama": self.nama,
            "role": self.role,
            "tanda_tangan": self.tanda_tangan,
            "foto_profil": self.foto_profil,
            "two_factor_enabled": bool(self.two_factor_enabled),
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else None
        }


class Siswa(db.Model):
    """
    Model data siswa SMKN 21 Jakarta.
    """
    __tablename__ = 'siswa'
    id = db.Column(db.Integer, primary_key=True)
    nis = db.Column(db.String(20), unique=True, nullable=False, index=True)
    nama = db.Column(db.String(100), nullable=False)
    kelas = db.Column(db.String(50), nullable=False)
    jenis_kelamin = db.Column(db.String(20), default="Laki-laki", nullable=False)  # "Laki-laki" (Siswa) atau "Perempuan" (Siswi)
    status = db.Column(db.String(20), default="Aktif", nullable=False, index=True)  # "Aktif" atau "Alumni"
    tanggal_lulus = db.Column(db.DateTime, nullable=True)  # Waktu siswa diluluskan menjadi Alumni
    password = db.Column(db.String(100), nullable=True)  # Password login siswa (default: NIS)
    tanda_tangan = db.Column(db.Text, nullable=True)  # Base64 PNG digital signature siswa
    foto_profil = db.Column(db.Text, nullable=True)   # Base64 JPEG/PNG avatar foto profil siswa
    face_encoding = db.Column(db.Text, nullable=True)  # Stored as JSON string (single encoding or list of encodings)
    two_factor_secret = db.Column(db.String(64), nullable=True)
    two_factor_enabled = db.Column(db.Boolean, default=False, nullable=False)
    
    def get_encoding(self):
        if self.face_encoding:
            return json.loads(self.face_encoding)
        return None

    def is_alumni_expired(self):
        """
        Mengecek apakah masa tenggang akun alumni telah berakhir (> 1 tahun / 365 hari sejak kelulusan).
        """
        if getattr(self, 'status', 'Aktif') != 'Alumni':
            return False
        if not self.tanggal_lulus:
            return False
        delta = datetime.now() - self.tanggal_lulus
        return delta.days >= 365

    def to_dict(self):
        sample_count = 0
        if self.face_encoding:
            try:
                data = json.loads(self.face_encoding)
                if isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
                    sample_count = len(data)
                elif isinstance(data, list):
                    sample_count = 1
            except Exception:
                sample_count = 1

        return {
            "id": self.id,
            "nis": self.nis,
            "nama": self.nama,
            "kelas": self.kelas,
            "jenis_kelamin": getattr(self, 'jenis_kelamin', 'Laki-laki') or "Laki-laki",
            "status": self.status or "Aktif",
            "tanggal_lulus": self.tanggal_lulus.strftime("%Y-%m-%d %H:%M:%S") if self.tanggal_lulus else None,
            "is_alumni_expired": self.is_alumni_expired(),
            "tanda_tangan": self.tanda_tangan,
            "foto_profil": self.foto_profil,
            "terdaftar": bool(self.face_encoding),
            "sample_count": sample_count,
            "two_factor_enabled": bool(self.two_factor_enabled)
        }


class AbsensiHarian(db.Model):
    """
    Rekaman riwayat presensi harian siswa.
    """
    __tablename__ = 'absensi_harian'
    id = db.Column(db.Integer, primary_key=True)
    siswa_id = db.Column(db.Integer, db.ForeignKey('siswa.id'), nullable=False, index=True)
    waktu = db.Column(db.DateTime, default=datetime.now, index=True)
    status = db.Column(db.String(20), nullable=False)  # "Tepat Waktu", "Terlambat", "Sakit", "Izin"
    
    siswa = db.relationship('Siswa', backref=db.backref('absensi_harian', lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "siswa_id": self.siswa_id,
            "nis": self.siswa.nis if self.siswa else "-",
            "nama": self.siswa.nama if self.siswa else "Siswa Dihapus",
            "kelas": self.siswa.kelas if self.siswa else "-",
            "waktu": self.waktu.strftime("%Y-%m-%d %H:%M:%S"),
            "status": self.status
        }


class AbsensiPerpustakaan(db.Model):
    """
    Rekaman kunjungan perpustakaan SMKN 21.
    """
    __tablename__ = 'absensi_perpustakaan'
    id = db.Column(db.Integer, primary_key=True)
    siswa_id = db.Column(db.Integer, db.ForeignKey('siswa.id'), nullable=False, index=True)
    waktu = db.Column(db.DateTime, default=datetime.now, index=True)
    keperluan = db.Column(db.String(100), nullable=False)  # "Meminjam Buku", "Mengembalikan Buku", dll
    
    siswa = db.relationship('Siswa', backref=db.backref('absensi_perpus', lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "siswa_id": self.siswa_id,
            "nis": self.siswa.nis if self.siswa else "-",
            "nama": self.siswa.nama if self.siswa else "Siswa Dihapus",
            "kelas": self.siswa.kelas if self.siswa else "-",
            "waktu": self.waktu.strftime("%Y-%m-%d %H:%M:%S"),
            "keperluan": self.keperluan
        }


class PengajuanIzin(db.Model):
    """
    Rekaman pengajuan izin / sakit mandiri oleh siswa dengan bukti surat dan GPS.
    """
    __tablename__ = 'pengajuan_izin'
    id = db.Column(db.Integer, primary_key=True)
    siswa_id = db.Column(db.Integer, db.ForeignKey('siswa.id'), nullable=False, index=True)
    jenis = db.Column(db.String(20), nullable=False)  # "Sakit" atau "Izin"
    tanggal_mulai = db.Column(db.Date, nullable=False)
    tanggal_selesai = db.Column(db.Date, nullable=False)
    alasan = db.Column(db.Text, nullable=False)
    surat_bukti = db.Column(db.Text, nullable=True)  # Data URI base64 foto surat
    status_pengajuan = db.Column(db.String(20), default="Menunggu", index=True)  # "Menunggu", "Disetujui", "Ditolak"
    catatan_guru = db.Column(db.Text, nullable=True)
    tanda_tangan_siswa = db.Column(db.Text, nullable=True)  # Base64 digital signature
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    lokasi_teks = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)

    siswa = db.relationship('Siswa', backref=db.backref('pengajuan_izin', lazy=True))

    def to_dict(self):
        maps_url = None
        if self.latitude is not None and self.longitude is not None:
            maps_url = f"https://www.google.com/maps?q={self.latitude},{self.longitude}"

        return {
            "id": self.id,
            "siswa_id": self.siswa_id,
            "nis": self.siswa.nis if self.siswa else "-",
            "nama": self.siswa.nama if self.siswa else "Siswa Dihapus",
            "kelas": self.siswa.kelas if self.siswa else "-",
            "jenis": self.jenis,
            "tanggal_mulai": self.tanggal_mulai.strftime("%Y-%m-%d"),
            "tanggal_selesai": self.tanggal_selesai.strftime("%Y-%m-%d"),
            "alasan": self.alasan,
            "surat_bukti": self.surat_bukti,
            "tanda_tangan_siswa": self.tanda_tangan_siswa,
            "status_pengajuan": self.status_pengajuan,
            "catatan_guru": self.catatan_guru,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "lokasi_teks": self.lokasi_teks,
            "maps_url": maps_url,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }


class IzinPiket(db.Model):
    """
    Rekaman Surat Izin Masuk / Meninggalkan Kelas yang diterbitkan di Meja Guru Piket (E-Slip).
    """
    __tablename__ = 'izin_piket'
    id = db.Column(db.Integer, primary_key=True)
    siswa_id = db.Column(db.Integer, db.ForeignKey('siswa.id'), nullable=False, index=True)
    hari = db.Column(db.String(20), nullable=False)  # "Senin", "Selasa", dll
    tanggal = db.Column(db.Date, nullable=False, index=True)
    tipe = db.Column(db.String(50), nullable=False)  # "Izin Masuk" atau "Izin Meninggalkan Kelas"
    jam_ke = db.Column(db.String(50), nullable=False)  # "3", "Jam ke-3", dll
    alasan = db.Column(db.Text, nullable=False)
    petugas_piket = db.Column(db.String(100), nullable=False)
    tanda_tangan_petugas = db.Column(db.Text, nullable=True)  # Base64 digital signature guru piket
    tanda_tangan_siswa = db.Column(db.Text, nullable=True)  # Base64 digital signature siswa
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)

    siswa = db.relationship('Siswa', backref=db.backref('izin_piket', lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "siswa_id": self.siswa_id,
            "nis": self.siswa.nis if self.siswa else "-",
            "nama": self.siswa.nama if self.siswa else "Siswa Dihapus",
            "kelas": self.siswa.kelas if self.siswa else "-",
            "hari": self.hari,
            "tanggal": self.tanggal.strftime("%Y-%m-%d"),
            "tanggal_formatted": self.tanggal.strftime("%d/%m/%Y"),
            "tipe": self.tipe,
            "jam_ke": self.jam_ke,
            "alasan": self.alasan,
            "petugas_piket": self.petugas_piket,
            "tanda_tangan_petugas": self.tanda_tangan_petugas,
            "tanda_tangan_siswa": self.tanda_tangan_siswa,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }


class PelanggaranSiswa(db.Model):
    """
    Rekaman Buku Catatan Pelanggaran Siswa/i SMKN 21 Jakarta (Diisi oleh siswa yang bersangkutan).
    Mencatat pengakuan pelanggaran disiplin beserta bobot poin dan e-signature siswa.
    """
    __tablename__ = 'pelanggaran_siswa'
    id = db.Column(db.Integer, primary_key=True)
    siswa_id = db.Column(db.Integer, db.ForeignKey('siswa.id'), nullable=True, index=True)
    nis = db.Column(db.String(30), nullable=False, index=True)
    nama_siswa = db.Column(db.String(150), nullable=False, index=True)
    kelas = db.Column(db.String(50), nullable=False, index=True)
    tanggal_waktu = db.Column(db.DateTime, nullable=False, default=datetime.now, index=True)
    jenis_pelanggaran = db.Column(db.String(255), nullable=False, index=True)
    poin = db.Column(db.Integer, nullable=False, default=5)
    nama_penanggung_jawab = db.Column(db.String(150), nullable=False)
    tanda_tangan_siswa = db.Column(db.Text, nullable=True)  # Base64 digital signature kanvas
    keterangan = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)

    siswa = db.relationship('Siswa', backref=db.backref('catatan_pelanggaran', lazy=True))

    def to_dict(self):
        ttd = self.tanda_tangan_siswa
        # Jika ttd kosong atau berisi cap teks SVG lama, gunakan tanda tangan profil siswa jika tersedia
        if (not ttd or 'TERCATAT TERLAMBAT' in str(ttd)) and self.siswa and self.siswa.tanda_tangan:
            ttd = self.siswa.tanda_tangan
        elif not ttd or 'TERCATAT TERLAMBAT' in str(ttd):
            ttd = None

        return {
            "id": self.id,
            "siswa_id": self.siswa_id,
            "nis": self.nis,
            "nama_siswa": self.nama_siswa,
            "kelas": self.kelas,
            "tanggal_waktu": self.tanggal_waktu.strftime("%Y-%m-%d %H:%M:%S"),
            "tanggal_waktu_formatted": self.tanggal_waktu.strftime("%d-%b-%Y %H.%M"),
            "jenis_pelanggaran": self.jenis_pelanggaran,
            "poin": self.poin,
            "nama_penanggung_jawab": self.nama_penanggung_jawab,
            "tanda_tangan_siswa": ttd,
            "keterangan": self.keterangan,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }


class PengaturanPJJ(db.Model):
    """
    Konfigurasi Mode PJJ (Pembelajaran Jarak Jauh / Belajar Dari Rumah / PKL).
    Menentukan tingkatan/kelas mana yang diizinkan presensi dari rumah (bypass geofence radius 100m).
    """
    __tablename__ = 'pengaturan_pjj'
    id = db.Column(db.Integer, primary_key=True)
    is_active = db.Column(db.Boolean, default=False, nullable=False)  # Master toggle PJJ
    tipe_lingkup = db.Column(db.String(20), default="tingkat", nullable=False)  # "semua", "tingkat", "kelas"
    tingkat_aktif = db.Column(db.Text, default="[]", nullable=False)  # JSON array string misal '["X", "XI"]'
    kelas_aktif = db.Column(db.Text, default="[]", nullable=False)  # JSON array string misal '["XII PPLG 1"]'
    tanggal_mulai = db.Column(db.Date, nullable=True)  # None = hanya berlaku hari ini / manual
    tanggal_selesai = db.Column(db.Date, nullable=True)
    keterangan = db.Column(db.String(255), nullable=True)  # misal "Asesmen Nasional", "PKL / Magang"
    updated_by = db.Column(db.String(100), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        try:
            tingkat_list = json.loads(self.tingkat_aktif or "[]")
        except Exception:
            tingkat_list = []
        try:
            kelas_list = json.loads(self.kelas_aktif or "[]")
        except Exception:
            kelas_list = []

        return {
            "id": self.id,
            "is_active": bool(self.is_active),
            "tipe_lingkup": self.tipe_lingkup,
            "tingkat_aktif": tingkat_list,
            "kelas_aktif": kelas_list,
            "tanggal_mulai": self.tanggal_mulai.strftime("%Y-%m-%d") if self.tanggal_mulai else None,
            "tanggal_selesai": self.tanggal_selesai.strftime("%Y-%m-%d") if self.tanggal_selesai else None,
            "keterangan": self.keterangan or "",
            "updated_by": self.updated_by or "-",
            "updated_at": self.updated_at.strftime("%Y-%m-%d %H:%M:%S") if self.updated_at else None
        }


class AuditLog(db.Model):
    """
    Model pencatatan log audit rekam jejak aktivitas operasional staf/admin.
    Mencatat siapa yang mengubah data penting (misal verifikasi izin, hapus pelanggaran, presensi manual).
    """
    __tablename__ = 'audit_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=True)
    role = db.Column(db.String(30), nullable=False)
    user_name = db.Column(db.String(100), nullable=False)
    action = db.Column(db.String(50), nullable=False, index=True)  # e.g., 'VERIFIKASI_IZIN', 'HAPUS_PELANGGARAN', 'UBAH_PRESENSI'
    target_type = db.Column(db.String(50), nullable=True)          # e.g., 'PengajuanIzin', 'PelanggaranSiswa', 'AbsensiHarian'
    target_id = db.Column(db.String(50), nullable=True)
    keterangan = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "role": self.role,
            "user_name": self.user_name,
            "action": self.action,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "keterangan": self.keterangan,
            "ip_address": self.ip_address,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else None,
            "created_at_formatted": self.created_at.strftime("%d-%b-%Y %H:%M") if self.created_at else None,
        }



