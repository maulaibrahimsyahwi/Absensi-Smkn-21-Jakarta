import json
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Siswa(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nis = db.Column(db.String(20), unique=True, nullable=False)
    nama = db.Column(db.String(100), nullable=False)
    kelas = db.Column(db.String(50), nullable=False)
    face_encoding = db.Column(db.Text, nullable=True) # Stored as JSON string (single encoding or list of encodings)
    
    def get_encoding(self):
        if self.face_encoding:
            return json.loads(self.face_encoding)
        return None

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
            "terdaftar": bool(self.face_encoding),
            "sample_count": sample_count
        }

class AbsensiHarian(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    siswa_id = db.Column(db.Integer, db.ForeignKey('siswa.id'), nullable=False, index=True)
    waktu = db.Column(db.DateTime, default=datetime.now, index=True)
    status = db.Column(db.String(20), nullable=False) # "Tepat Waktu" atau "Terlambat"
    
    siswa = db.relationship('Siswa', backref=db.backref('absensi_harian', lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "siswa_id": self.siswa_id,
            "nama": self.siswa.nama if self.siswa else "Siswa Dihapus",
            "kelas": self.siswa.kelas if self.siswa else "-",
            "waktu": self.waktu.strftime("%Y-%m-%d %H:%M:%S"),
            "status": self.status
        }

class AbsensiPerpustakaan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    siswa_id = db.Column(db.Integer, db.ForeignKey('siswa.id'), nullable=False, index=True)
    waktu = db.Column(db.DateTime, default=datetime.now, index=True)
    keperluan = db.Column(db.String(100), nullable=False) # "Meminjam Buku", "Mengembalikan Buku", "Belajar", dll
    
    siswa = db.relationship('Siswa', backref=db.backref('absensi_perpus', lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "siswa_id": self.siswa_id,
            "nama": self.siswa.nama if self.siswa else "Siswa Dihapus",
            "kelas": self.siswa.kelas if self.siswa else "-",
            "waktu": self.waktu.strftime("%Y-%m-%d %H:%M:%S"),
            "keperluan": self.keperluan
        }
