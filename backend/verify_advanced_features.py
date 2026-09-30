import os
import sys
from datetime import datetime, date, timedelta

# Ensure backend dir is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from models import db, Siswa, AbsensiHarian, PelanggaranSiswa, PengaturanJadwal, User
from routes.pelanggaran_routes import MASTER_PRESTASI, MASTER_PELANGGARAN
from utils.backup_utils import create_db_backup, list_db_backups
from utils.auth_middleware import generate_token

def test_all():
    with app.app_context():
        print("=== 1. Verifying Database Schema & Models ===")
        # Check Siswa columns
        siswa_cols = [c.name for c in Siswa.__table__.columns]
        assert "medical_exemption_until" in siswa_cols, "medical_exemption_until missing in Siswa"
        assert "medical_exemption_alasan" in siswa_cols, "medical_exemption_alasan missing in Siswa"
        print("[OK] Feature 7: Siswa model has medical exemption fields.")

        # Check AbsensiHarian columns
        absensi_cols = [c.name for c in AbsensiHarian.__table__.columns]
        assert "device_id" in absensi_cols, "device_id missing in AbsensiHarian"
        assert "is_flagged_proxy" in absensi_cols, "is_flagged_proxy missing in AbsensiHarian"
        assert "proxy_note" in absensi_cols, "proxy_note missing in AbsensiHarian"
        assert "tahun_ajaran" in absensi_cols, "tahun_ajaran missing in AbsensiHarian"
        assert "semester" in absensi_cols, "semester missing in AbsensiHarian"
        print("[OK] Feature 8 & 9: AbsensiHarian model has device_id, proxy detection, and academic partition fields.")

        # Check PelanggaranSiswa columns
        pelanggaran_cols = [c.name for c in PelanggaranSiswa.__table__.columns]
        assert "kategori" in pelanggaran_cols, "kategori missing in PelanggaranSiswa"
        assert "tahun_ajaran" in pelanggaran_cols, "tahun_ajaran missing in PelanggaranSiswa"
        assert "semester" in pelanggaran_cols, "semester missing in PelanggaranSiswa"
        print("[OK] Feature 2 & 9: PelanggaranSiswa model has kategori, tahun_ajaran, semester.")

        # Check PengaturanJadwal columns
        jadwal_cols = [c.name for c in PengaturanJadwal.__table__.columns]
        assert "tahun_ajaran" in jadwal_cols, "tahun_ajaran missing in PengaturanJadwal"
        assert "semester" in jadwal_cols, "semester missing in PengaturanJadwal"
        print("[OK] Feature 9: PengaturanJadwal model has tahun_ajaran, semester.")

        print("\n=== 2. Verifying Feature 2: Master Prestasi & Restorative Justice ===")
        assert len(MASTER_PRESTASI) >= 8, "MASTER_PRESTASI should have at least 8 items"
        print(f"[OK] MASTER_PRESTASI loaded with {len(MASTER_PRESTASI)} items. Example: {MASTER_PRESTASI[0]['nama']}")

        print("\n=== 3. Verifying Feature 6: Auto-Backup System & 30-Day Retention ===")
        backup_res = create_db_backup(max_keep=30)
        assert backup_res.get("success") is True, f"Backup failed: {backup_res}"
        print(f"[OK] Backup created: filename={backup_res.get('filename')}, size={backup_res.get('size_kb')} KB")
        backup_info = list_db_backups()
        assert backup_info.get("success") is True, f"List backups failed: {backup_info}"
        backups = backup_info.get("backups", [])
        assert len(backups) > 0, "Backups list should not be empty"
        print(f"[OK] Available backups count: {len(backups)}")

        print("\n=== 4. Verifying Client Endpoints with Test Client ===")
        client = app.test_client()

        # Admin JWT Token
        admin_user = User.query.filter_by(role='admin').first()
        admin_id = admin_user.id if admin_user else 1
        admin_token = generate_token(user_id=admin_id, role='admin', identifier='admin')
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        # 4a. Feature 4 & 9: GET /api/presensi/status_today returns server_epoch_ms, tahun_ajaran, semester
        res_today = client.get("/api/presensi/status_today", headers=admin_headers)
        assert res_today.status_code == 200, f"Expected 200, got {res_today.status_code}"
        data_today = res_today.get_json()
        assert "server_epoch_ms" in data_today, "server_epoch_ms should be returned for anti-NTP check"
        assert "tahun_ajaran" in data_today, "tahun_ajaran should be returned"
        assert "semester" in data_today, "semester should be returned"
        print(f"[OK] Feature 4 & 9: /api/presensi/status_today returns server_epoch_ms={data_today['server_epoch_ms']}, TA={data_today['tahun_ajaran']} Sem={data_today['semester']}")

        # 4b. Feature 4: Anti-NTP clock tampering check in verify_harian
        skewed_time = datetime.now() - timedelta(minutes=10)
        res_skew = client.post("/api/verify_harian", json={
            "client_timestamp": int(skewed_time.timestamp() * 1000),
            "expected_siswa_id": 1,
            "simulated": True
        }, headers=admin_headers)
        assert res_skew.status_code == 403, f"Expected 403 for skewed clock, got {res_skew.status_code}"
        data_skew = res_skew.get_json()
        assert data_skew.get("time_tampered") is True, "time_tampered flag should be true"
        print(f"[OK] Feature 4: Anti-NTP tampering successfully caught! Drift: {data_skew.get('drift_seconds')}s")

        # 4c. Feature 2: Master Prestasi endpoint
        res_master = client.get("/api/pelanggaran/master", headers=admin_headers)
        assert res_master.status_code == 200
        data_master = res_master.get_json()
        assert "data" in data_master and "prestasi" in data_master, "master should return both violations and prestasi"
        print(f"[OK] Feature 2: /api/pelanggaran/master returns {len(data_master['data'])} violations and {len(data_master['prestasi'])} rewards")

        # 4d. Create a dedicated test student for Feature 1, 2, 7 testing
        test_student = Siswa.query.filter_by(nis="9999901").first()
        if not test_student:
            test_student = Siswa(nis="9999901", nama="Siswa Uji Coba Lanjut", kelas="X TEST 1", status="Aktif")
            db.session.add(test_student)
            db.session.commit()

        # 4e. Feature 1: Kenaikan Kelas Massal & Rollover
        res_naik = client.post("/api/siswa/naik_kelas_massal", json={
            "kelas_asal": "X TEST 1",
            "kelas_tujuan": "XI TEST 1",
            "aksi": "naik"
        }, headers=admin_headers)
        assert res_naik.status_code == 200, f"Expected 200, got {res_naik.status_code}: {res_naik.get_json()}"
        print(f"[OK] Feature 1: Kenaikan Kelas Massal successful: {res_naik.get_json().get('message')}")

        # Test Alumni Rollover
        res_lulus = client.post("/api/siswa/naik_kelas_massal", json={
            "kelas_asal": "XI TEST 1",
            "kelas_tujuan": "ALUMNI",
            "aksi": "lulus"
        }, headers=admin_headers)
        assert res_lulus.status_code == 200
        print(f"[OK] Feature 1: Alumni Rollover successful: {res_lulus.get_json().get('message')}")

        # Reset test student for next tests
        test_student.status = "Aktif"
        test_student.kelas = "X TEST 1"
        db.session.commit()

        # 4f. Feature 7: Medical Exemption pass grant and revoke
        tomorrow_str = (date.today() + timedelta(days=14)).isoformat()
        res_exempt = client.post(f"/api/siswa/{test_student.id}/medical_exemption", json={
            "exempt_until": tomorrow_str,
            "alasan": "Pemulihan pasca operasi rahang gigi"
        }, headers=admin_headers)
        assert res_exempt.status_code == 200
        print(f"[OK] Feature 7: Medical exemption granted for {test_student.nama} until {tomorrow_str}")

        res_revoke = client.post(f"/api/siswa/{test_student.id}/medical_exemption", json={
            "exempt_until": None,
            "alasan": ""
        }, headers=admin_headers)
        assert res_revoke.status_code == 200
        print(f"[OK] Feature 7: Medical exemption revoked successfully")

        # 4g. Feature 2: Record a Prestasi (Reward Point) & Check Restorative Justice Rekap
        res_prestasi = client.post("/api/pelanggaran", json={
            "nis": test_student.nis,
            "nama_siswa": test_student.nama,
            "kelas": test_student.kelas,
            "jenis_pelanggaran": "Juara LKS / Lomba Kejuruan (Tingkat Kota / Provinsi / Nasional)",
            "poin": 25,
            "kategori": "Prestasi",
            "nama_penanggung_jawab": "Guru Pembimbing LKS",
            "tanda_tangan_siswa": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "keterangan": "Meraih Medali Emas LKS Tingkat Provinsi Bidang Web Technologies"
        }, headers=admin_headers)
        assert res_prestasi.status_code == 201 or res_prestasi.status_code == 200, f"Got {res_prestasi.status_code}: {res_prestasi.get_json()}"
        print(f"[OK] Feature 2: Prestasi/Reward successfully recorded (+25 poin restoratif)")

        # Verify in Rekap
        res_rekap = client.get("/api/pelanggaran/rekap", headers=admin_headers)
        assert res_rekap.status_code == 200
        rekap_data = res_rekap.get_json()
        rekap_list = rekap_data.get("rekap_siswa", [])
        student_rekap = next((s for s in rekap_list if s["nis"] == test_student.nis), None)
        assert student_rekap is not None, "Test student must be present in rekap"
        assert student_rekap["total_poin_prestasi"] >= 25, "Prestasi points must be accounted"
        assert student_rekap["poin_bersih"] == 0, "Poin bersih must be 0 when no violations exist"
        print(f"[OK] Feature 2: Restorative Justice Rekap verified: Pelanggaran={student_rekap['total_poin_pelanggaran']}, Prestasi={student_rekap['total_poin_prestasi']}, Poin Bersih={student_rekap['poin_bersih']}")

        # 4h. Feature 5: Offline emergency buffer sync endpoint (use unique past date)
        unique_past_dt = datetime.now() - timedelta(days=20 + (int(datetime.now().timestamp()) % 50))
        res_sync = client.post("/api/presensi/sync_offline", json={
            "records": [
                {
                    "nis": test_student.nis,
                    "timestamp": unique_past_dt.isoformat(),
                    "device_id": "KIOSK-GATE-MAIN",
                    "status": "Tepat Waktu"
                }
            ]
        }, headers=admin_headers)
        assert res_sync.status_code == 200
        sync_data = res_sync.get_json()
        assert sync_data.get("success") is True
        print(f"[OK] Feature 5: Offline attendance queue sync verified: synced={sync_data.get('synced')}")

        # 4i. Feature 3: UU PDP Security on Lampiran
        from models import PengajuanIzin
        other_siswa = Siswa.query.filter(Siswa.id != test_student.id).first()
        if not other_siswa:
            other_siswa = Siswa(nis="9999902", nama="Siswa Pemilik Dokumen Medis", kelas="XI MEDIS 1", status="Aktif")
            db.session.add(other_siswa)
            db.session.commit()

        izin_other = PengajuanIzin(
            siswa_id=other_siswa.id,
            jenis="Sakit",
            tanggal_mulai=date.today(),
            tanggal_selesai=date.today(),
            alasan="Diagnosa penyakit tertutup",
            surat_bukti="data:image/jpeg;base64,/9j/4AAQSkZJRg==",
            status_pengajuan="Disetujui"
        )
        db.session.add(izin_other)
        db.session.commit()

        # Generate token for test_student (who exists in DB)
        student_token = generate_token(user_id=test_student.id, role='siswa', identifier=test_student.nis)
        res_unauth = client.get(f"/api/pengajuan_izin/{izin_other.id}/lampiran", headers={'Authorization': f'Bearer {student_token}'})
        assert res_unauth.status_code == 403, f"Expected 403 Forbidden for unauthorized student, got {res_unauth.status_code}"
        assert "UU Perlindungan Data Pribadi" in res_unauth.get_json().get("message", "")
        print(f"[OK] Feature 3: UU PDP medical document privacy protection verified (HTTP 403 Forbidden for unauthorized student).")

        # Admin authorized access check
        res_auth = client.get(f"/api/pengajuan_izin/{izin_other.id}/lampiran", headers=admin_headers)
        assert res_auth.status_code == 200
        print(f"[OK] Feature 3: Authorized medical staff / admin can securely access medical attachment.")

        # Clean up test izin
        db.session.delete(izin_other)
        db.session.commit()

        # 4j. Feature 9: Academic Year & Semester Update
        res_jadwal = client.put("/api/jadwal", json={
            "tahun_ajaran": "2026/2027",
            "semester": "Ganjil"
        }, headers=admin_headers)
        assert res_jadwal.status_code == 200
        print(f"[OK] Feature 9: Academic Semester & Year partitioning update verified: {res_jadwal.get_json().get('message')}")

        # Clean up test student & records
        PelanggaranSiswa.query.filter_by(nis=test_student.nis).delete()
        AbsensiHarian.query.filter_by(siswa_id=test_student.id).delete()
        db.session.delete(test_student)
        db.session.commit()

        print("\n=== ALL 10 ADVANCED FEATURE INTEGRATION TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    test_all()
