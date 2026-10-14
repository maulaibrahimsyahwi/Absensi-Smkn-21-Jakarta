"""
Test Suite: Offline Liveness Deadlock, Earliest-Verified-Timestamp-Wins, and Kiosk Tablet Remediation
SMKN 21 Jakarta - Presensi Biometrik
"""
import os
import sys
import unittest
from datetime import datetime, date, time, timedelta

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import app, db
from models import Siswa, AbsensiHarian, PelanggaranSiswa, User
from utils.auth_middleware import generate_token

DUMMY_JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="

class TestOfflineKioskRemediation(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()

    def tearDown(self):
        self.ctx.pop()

    def test_01_earliest_timestamp_wins_in_sync_offline(self):
        """
        Uji skenario: Siswa hadir offline pukul 06:15 (Tepat Waktu) di gerbang sekolah,
        namun siswa tersebut scan ulang pukul 06:40 (Terlambat) saat jaringan pulih.
        Saat buffer offline kiosk disinkronkan, sistem harus memenangkan 06:15
        (Earliest Verified Timestamp) dan menghapus poin pelanggaran terlambat.
        """
        print("\n[TEST 1] Earliest-Verified-Timestamp-Wins & Pelanggaran Auto-Cleanup...")
        siswa = Siswa.query.filter_by(status='Aktif').first()
        if not siswa:
            self.skipTest("Tidak ada siswa aktif untuk pengujian.")

        today = date.today()
        # Aktifkan dispensasi medis sementara agar bypass matching OpenCV pada dummy photo
        siswa.medical_exemption_until = today + timedelta(days=7)
        siswa.medical_exemption_alasan = "Testing Exemption"

        # Bersihkan data absensi & pelanggaran hari ini untuk siswa pengujian
        AbsensiHarian.query.filter(
            AbsensiHarian.siswa_id == siswa.id,
            db.func.date(AbsensiHarian.waktu) == today
        ).delete()
        PelanggaranSiswa.query.filter(
            PelanggaranSiswa.siswa_id == siswa.id,
            db.func.date(PelanggaranSiswa.tanggal_waktu) == today,
            PelanggaranSiswa.jenis_pelanggaran.ilike("%Terlambat%")
        ).delete()
        db.session.commit()

        # 1. Simulasikan catatan awal: Siswa terlambat pukul 06:40 WIB (+5 poin)
        dt_late = datetime.combine(today, time(6, 40, 0))
        absen_late = AbsensiHarian(
            siswa_id=siswa.id,
            kelas=siswa.kelas,
            status="Terlambat",
            waktu=dt_late,
            sumber="kiosk"
        )
        pelanggaran_late = PelanggaranSiswa(
            siswa_id=siswa.id,
            nis=siswa.nis,
            nama_siswa=siswa.nama,
            kelas=siswa.kelas,
            tanggal_waktu=dt_late,
            jenis_pelanggaran="Terlambat Masuk Sekolah (Tercatat Kiosk)",
            poin=5,
            nama_penanggung_jawab="Guru Piket",
            keterangan="Presensi pukul 06:40:00 WIB"
        )
        db.session.add(absen_late)
        db.session.add(pelanggaran_late)
        db.session.commit()

        # Ambil token autentikasi admin/piket untuk menjalankan /api/presensi/sync_offline
        user_piket = User.query.filter_by(role='piket').first() or User.query.filter_by(role='admin').first()
        token = generate_token(user_piket.id, user_piket.role, user_piket.username)

        # 2. Kirim payload sync_offline dengan bukti foto offline pukul 06:15 WIB (Tepat Waktu)
        payload = {
            "records": [
                {
                    "id": "offline-item-1",
                    "mode": "kiosk",
                    "image": DUMMY_JPEG,
                    "captured_at": f"{today.isoformat()}T06:15:00",
                    "expected_siswa_id": siswa.id,
                    "latitude": -6.1754,
                    "longitude": 106.8272
                }
            ]
        }

        res = self.client.post(
            "/api/presensi/sync_offline",
            json=payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(res.status_code, 200, f"Sync offline gagal: {res.get_json()}")
        data = res.get_json()
        print(f"  -> Sync offline response: {data}")
        self.assertEqual(data.get("updated_earlier"), 1)

        # 3. Verifikasi di DB: Waktu absensi harus menjadi 06:15:00 dan status Tepat Waktu
        updated_absen = AbsensiHarian.query.filter(
            AbsensiHarian.siswa_id == siswa.id,
            db.func.date(AbsensiHarian.waktu) == today
        ).first()
        self.assertEqual(updated_absen.waktu.hour, 6)
        self.assertEqual(updated_absen.waktu.minute, 15)
        self.assertEqual(updated_absen.status, "Tepat Waktu")
        print("  -> [PASS] Absensi berhasil diperbarui ke 06:15:00 (Tepat Waktu).")

        # 4. Verifikasi di DB: Catatan pelanggaran terlambat harus otomatis dihapus
        remaining_pelanggaran = PelanggaranSiswa.query.filter(
            PelanggaranSiswa.siswa_id == siswa.id,
            db.func.date(PelanggaranSiswa.tanggal_waktu) == today,
            PelanggaranSiswa.jenis_pelanggaran.ilike("%Terlambat%")
        ).all()
        self.assertEqual(len(remaining_pelanggaran), 0)
        print("  -> [PASS] Poin pelanggaran terlambat otomatis dibatalkan/dihapus.")

    def test_02_kiosk_offline_buffer_duplicate_rejection(self):
        """
        Uji skenario: Jika catatan offline lebih lambat dari catatan yang sudah ada,
        sistem menolak pembaruan (tidak mendegradasi kehadiran siswa).
        """
        print("\n[TEST 2] Duplicate & Later Timestamp Rejection...")
        siswa = Siswa.query.filter_by(status='Aktif').first()
        today = date.today()

        user_piket = User.query.filter_by(role='piket').first() or User.query.filter_by(role='admin').first()
        token = generate_token(user_piket.id, user_piket.role, user_piket.username)

        # Kirim bukti offline pukul 06:45 (lebih lambat dari 06:15 yang sudah ada)
        payload = {
            "records": [
                {
                    "id": "offline-item-2",
                    "mode": "kiosk",
                    "image": DUMMY_JPEG,
                    "captured_at": f"{today.isoformat()}T06:45:00",
                    "expected_siswa_id": siswa.id
                }
            ]
        }

        res = self.client.post(
            "/api/presensi/sync_offline",
            json=payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("duplicates"), 1)
        print("  -> [PASS] Catatan offline lebih lambat ditolak sebagai duplikat tanpa mendegradasi presensi.")

if __name__ == "__main__":
    unittest.main()

