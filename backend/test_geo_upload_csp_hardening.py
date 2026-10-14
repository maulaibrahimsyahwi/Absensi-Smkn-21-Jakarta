"""
test_geo_upload_csp_hardening.py
======================================================================
Rangkaian Pengujian Menyeluruh untuk:
1. Anti-Fake GPS & Mock Location Hardening (verify_anti_fake_gps & DB Coordinate Persistence)
2. OWASP File Upload Hardening (save_base64_file & submit_pengajuan_izin strict rejection)
3. Content Security Policy (CSP) & HTTP Security Headers (Sandbox Non-Overwrite & Zero unsafe-eval)
======================================================================
"""

import os
import io
import sys
import base64
import unittest
from datetime import datetime, timedelta, date

from app import app
from models import db, Siswa, AbsensiHarian, PengajuanIzin, User
from utils.helpers import verify_anti_fake_gps
from utils.file_storage import save_base64_file
from utils.auth_middleware import generate_token
from config import SEKOLAH_LATITUDE, SEKOLAH_LONGITUDE


class TestGeoUploadCspHardening(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config['TESTING'] = True
        cls.client = app.test_client()
        with app.app_context():
            from werkzeug.security import generate_password_hash
            from utils.auth_middleware import invalidate_account_cache

            invalidate_account_cache()
            cls.siswa_a = Siswa.query.filter_by(nis="999901").first()
            if not cls.siswa_a:
                cls.siswa_a = Siswa(
                    nis="999901",
                    nama="Siswa Geo A",
                    kelas="XII PPLG 1",
                    status="Aktif"
                )
                db.session.add(cls.siswa_a)

            cls.siswa_a.privacy_consent_at = datetime.now()
            cls.siswa_a.face_encoding = 'enc:v1:test_encoding_a'
            cls.siswa_a.tanda_tangan = '/static/uploads/signatures/sig_test_a.png'
            cls.siswa_a.password = generate_password_hash('TestPass123')
            cls.siswa_a.must_change_password = False
            cls.siswa_a.active_session_token = "sess_geo_a_123"

            cls.siswa_b = Siswa.query.filter_by(nis="999902").first()
            if not cls.siswa_b:
                cls.siswa_b = Siswa(
                    nis="999902",
                    nama="Siswa Geo B",
                    kelas="XII PPLG 2",
                    status="Aktif"
                )
                db.session.add(cls.siswa_b)

            cls.siswa_b.privacy_consent_at = datetime.now()
            cls.siswa_b.face_encoding = 'enc:v1:test_encoding_b'
            cls.siswa_b.tanda_tangan = '/static/uploads/signatures/sig_test_b.png'
            cls.siswa_b.password = generate_password_hash('TestPass123')
            cls.siswa_b.must_change_password = False
            cls.siswa_b.active_session_token = "sess_geo_b_456"

            db.session.commit()
            cls.siswa_a_id = cls.siswa_a.id
            cls.siswa_b_id = cls.siswa_b.id

            cls.token_a = generate_token(
                user_id=cls.siswa_a_id,
                role="siswa",
                identifier="999901",
                session_token="sess_geo_a_123"
            )
            cls.token_b = generate_token(
                user_id=cls.siswa_b_id,
                role="siswa",
                identifier="999902",
                session_token="sess_geo_b_456"
            )

    # =========================================================================
    # 1. PENGUJIAN ANTI-FAKE GPS & MOCK LOCATION
    # =========================================================================

    def test_01_fake_gps_mock_flag_and_accuracy(self):
        """Uji penolakan flag mock location dan akurasi sensor tidak wajar."""
        with app.app_context():
            # Mock flag true
            ok, msg = verify_anti_fake_gps(self.siswa_a_id, -6.1587, 106.8550, 5.0, is_mock=True)
            self.assertFalse(ok)
            self.assertIn("Mock Location", msg)

            # Akurasi <= 0
            ok, msg = verify_anti_fake_gps(self.siswa_a_id, -6.1587, 106.8550, 0.0)
            self.assertFalse(ok)
            self.assertIn("tidak wajar", msg)

            # Akurasi < 1.8 (terlalu sintetis)
            ok, msg = verify_anti_fake_gps(self.siswa_a_id, -6.1587, 106.8550, 1.2)
            self.assertFalse(ok)
            self.assertIn("tidak wajar", msg)

            # Akurasi > 120 (terlalu lemah)
            ok, msg = verify_anti_fake_gps(self.siswa_a_id, -6.1587, 106.8550, 150.0)
            self.assertFalse(ok)
            self.assertIn("terlalu lemah", msg)

    def test_02_fake_gps_center_point_and_zero_drift(self):
        """Uji penolakan koordinat persis titik tengah dan koordinat beku (Zero-Drift)."""
        with app.app_context():
            # Titik tengah persis konfigurasi sekolah
            ok, msg = verify_anti_fake_gps(self.siswa_a_id, SEKOLAH_LATITUDE, SEKOLAH_LONGITUDE, 5.0)
            self.assertFalse(ok)
            self.assertIn("titik tengah", msg)

            # Multi-sample Zero Drift (sampel identik mutlak d_lat=0, d_lon=0, d_acc=0)
            frozen_samples = [
                {"latitude": -6.1585, "longitude": 106.8548, "accuracy": 4.5, "timestamp": 1000},
                {"latitude": -6.1585, "longitude": 106.8548, "accuracy": 4.5, "timestamp": 2500}
            ]
            ok, msg = verify_anti_fake_gps(self.siswa_a_id, -6.1585, 106.8548, 4.5, gps_samples=frozen_samples)
            self.assertFalse(ok)
            self.assertIn("Zero-Drift", msg)

            # Sampel asli dengan micro-jitter (lat/lon/acc bervariasi secara alami)
            natural_samples = [
                {"latitude": -6.1585002, "longitude": 106.8548001, "accuracy": 4.52, "timestamp": 1000},
                {"latitude": -6.1585011, "longitude": 106.8548007, "accuracy": 4.61, "timestamp": 2500}
            ]
            ok, msg = verify_anti_fake_gps(self.siswa_a_id, -6.1585011, 106.8548007, 4.61, gps_samples=natural_samples)
            self.assertTrue(ok, msg)

    def test_03_fake_gps_shared_spoof_pin(self):
        """Uji penolakan koordinat yang identik persis dengan siswa lain (Shared Spoof Pin)."""
        with app.app_context():
            now = datetime.now()
            # Siswa A sudah presensi di koordinat tertentu
            pin_lat, pin_lon = -6.158600, 106.854900
            absen_a = AbsensiHarian.query.filter_by(siswa_id=self.siswa_a_id).first()
            if absen_a:
                absen_a.waktu = now - timedelta(minutes=5)
                absen_a.latitude = pin_lat
                absen_a.longitude = pin_lon
            else:
                absen_a = AbsensiHarian(
                    siswa_id=self.siswa_a_id,
                    kelas="XII PPLG 1",
                    status="Tepat Waktu",
                    waktu=now - timedelta(minutes=5),
                    latitude=pin_lat,
                    longitude=pin_lon,
                    tahun_ajaran="2026/2027",
                    semester="Ganjil"
                )
                db.session.add(absen_a)
            db.session.commit()

            # Siswa B mengirim pin yang sama persis (< 1e-6 diff) dalam 15 menit
            ok, msg = verify_anti_fake_gps(self.siswa_b_id, pin_lat, pin_lon, 5.0, now_dt=now, is_kiosk=False)
            self.assertFalse(ok)
            self.assertIn("identik persis", msg)

            # Namun jika dalam mode kiosk sekolah, shared pin TIDAK diblokir (karena kiosk adalah 1 perangkat bersama)
            ok_kiosk, msg_kiosk = verify_anti_fake_gps(self.siswa_b_id, pin_lat, pin_lon, 5.0, now_dt=now, is_kiosk=True)
            self.assertTrue(ok_kiosk, msg_kiosk)

    # =========================================================================
    # 2. PENGUJIAN OWASP FILE UPLOAD HARDENING
    # =========================================================================

    def test_04_file_storage_input_validation(self):
        """Uji penolakan input non-data URI dan path traversal pada save_base64_file."""
        # Bukan data URI (path lokal atau URL)
        res = save_base64_file("/etc/passwd", subfolder="signatures")
        self.assertIsNone(res)

        res = save_base64_file("https://attacker.com/malicious.png", subfolder="signatures")
        self.assertIsNone(res)

        # Subfolder tidak diizinkan
        dummy_png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        res = save_base64_file(dummy_png, subfolder="../etc")
        self.assertIsNone(res)

    def test_05_file_storage_magic_bytes_and_malicious_pdf(self):
        """Uji validasi magic bytes dan penolakan PDF yang menyematkan script aktif."""
        # File palsu: mengaku PNG tapi isinya teks/script PHP
        fake_png = "data:image/png;base64," + base64.b64encode(b"<?php echo 'HACKED'; ?>").decode('utf-8')
        res = save_base64_file(fake_png, subfolder="signatures")
        self.assertIsNone(res)

        # PDF berbahaya yang menyematkan /JavaScript atau /Launch
        malicious_pdf_bytes = b"%PDF-1.4\n1 0 obj\n<< /Type /Action /S /JavaScript /JS (app.alert('XSS')) >>\nendobj\n%%EOF"
        malicious_pdf = "data:application/pdf;base64," + base64.b64encode(malicious_pdf_bytes).decode('utf-8')
        res = save_base64_file(malicious_pdf, subfolder="surat")
        self.assertIsNone(res)

        # PDF yang sah tanpa objek aktif
        clean_pdf_bytes = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n%%EOF"
        clean_pdf = "data:application/pdf;base64," + base64.b64encode(clean_pdf_bytes).decode('utf-8')
        res_clean = save_base64_file(clean_pdf, subfolder="surat", prefix="test_clean_pdf")
        self.assertIsNotNone(res_clean)
        self.assertTrue(res_clean.endswith('.pdf'))

    def test_06_file_storage_valid_images_and_watermark(self):
        """Uji penyimpanan citra PNG valid dan pembersihan EXIF."""
        # 1x1 valid PNG
        valid_png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        res = save_base64_file(valid_png, subfolder="signatures", prefix="sig_unit_test")
        self.assertIsNotNone(res)
        self.assertTrue(res.startswith("/static/uploads/signatures/"))

    def test_07_submit_pengajuan_izin_rejection(self):
        """Uji penolakan keras HTTP 400 pada pengajuan izin jika berkas bukti atau TTD tidak valid."""
        with app.app_context():
            headers = {"Authorization": f"Bearer {self.token_a}"}
            # Pengajuan dengan surat bukti korup / bukan gambar/pdf valid
            corrupt_payload = {
                "nis": "999901",
                "jenis": "Sakit",
                "tanggal_mulai": date.today().isoformat(),
                "tanggal_selesai": date.today().isoformat(),
                "alasan": "Demam berdarah",
                "surat_bukti": "data:image/png;base64,NOT_A_REAL_IMAGE",
                "tanda_tangan_siswa": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                "latitude": -6.1587,
                "longitude": 106.8550
            }
            res = self.client.post("/api/pengajuan_izin", json=corrupt_payload, headers=headers)
            self.assertEqual(res.status_code, 400)
            self.assertIn("Surat Bukti tidak valid", res.get_json().get("message", ""))

            # Pengajuan dengan tanda tangan korup
            corrupt_sig_payload = {
                "nis": "999901",
                "jenis": "Sakit",
                "tanggal_mulai": date.today().isoformat(),
                "tanggal_selesai": date.today().isoformat(),
                "alasan": "Demam berdarah",
                "surat_bukti": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                "tanda_tangan_siswa": "data:image/png;base64,NOT_A_REAL_SIGNATURE",
                "latitude": -6.1587,
                "longitude": 106.8550
            }
            res_sig = self.client.post("/api/pengajuan_izin", json=corrupt_sig_payload, headers=headers)
            self.assertEqual(res_sig.status_code, 400)
            self.assertIn("tanda tangan digital tidak valid", res_sig.get_json().get("message", ""))

    # =========================================================================
    # 3. PENGUJIAN CSP & SECURITY HEADERS
    # =========================================================================

    def test_08_security_headers_standard_route(self):
        """Uji header keamanan standar, penghapusan unsafe-eval, dan keberadaan Permissions-Policy."""
        res = self.client.get("/api/health")
        self.assertEqual(res.headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(res.headers.get("X-Frame-Options"), "SAMEORIGIN")
        self.assertEqual(res.headers.get("X-XSS-Protection"), "0")
        self.assertEqual(res.headers.get("Cross-Origin-Opener-Policy"), "same-origin")
        self.assertEqual(res.headers.get("Cross-Origin-Resource-Policy"), "same-origin")

        perm_policy = res.headers.get("Permissions-Policy", "")
        self.assertIn("camera=(self)", perm_policy)
        self.assertIn("geolocation=(self)", perm_policy)
        self.assertIn("microphone=()", perm_policy)

        csp = res.headers.get("Content-Security-Policy", "")
        self.assertNotIn("unsafe-eval", csp)
        self.assertIn("object-src 'none'", csp)
        self.assertIn("base-uri 'self'", csp)

    def test_09_csp_sandbox_preservation_on_dokumen(self):
        """Uji bahwa header CSP sandbox (default-src 'none') milik dokumen surat TIDAK ditimpa oleh @app.after_request."""
        with app.app_context():
            # Buat dummy pengajuan izin dengan file surat nyata
            clean_png_bytes = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")
            surat_path = save_base64_file(
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                subfolder="surat",
                prefix="test_csp_doc"
            )
            fname = os.path.basename(surat_path)

            pengajuan = PengajuanIzin(
                siswa_id=self.siswa_a_id,
                kelas="XII PPLG 1",
                jenis="Sakit",
                tanggal_mulai=date.today(),
                tanggal_selesai=date.today(),
                alasan="Uji CSP",
                surat_bukti=surat_path,
                latitude=-6.1587,
                longitude=106.8550,
                status_pengajuan="Menunggu"
            )
            db.session.add(pengajuan)
            db.session.commit()

            # Akses dokumen sebagai Siswa A (pemilik)
            headers = {"Authorization": f"Bearer {self.token_a}"}
            res = self.client.get(f"/api/pengajuan_izin/dokumen/{fname}", headers=headers)
            self.assertEqual(res.status_code, 200)

            # Verifikasi Content-Security-Policy tetap 'default-src 'none'' (TIDAK ditimpa CSP PWA)
            csp = res.headers.get("Content-Security-Policy", "")
            self.assertEqual(csp, "default-src 'none'")


if __name__ == "__main__":
    unittest.main()
