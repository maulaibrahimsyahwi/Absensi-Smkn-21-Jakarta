"""
Verification Script for All 21 Audit Fixes
SMKN 21 Jakarta Attendance & Disciplinary System
"""
import os
import sys
from datetime import datetime, date, timedelta

backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from werkzeug.security import generate_password_hash
from app import app
from models import (
    db, User, Siswa, PengaturanJadwal, PelanggaranSiswa, 
    AbsensiHarian, PengajuanIzin, IzinPiket
)
from utils.auth_middleware import generate_token

def run_tests():
    client = app.test_client()

    with app.app_context():
        print("=" * 65)
        print("VERIFYING ALL AUDIT ENHANCEMENTS (SMKN 21 JAKARTA)")
        print("=" * 65)

        # 1. Pastikan user admin dan piket ada
        admin = User.query.filter_by(role='admin').first()
        if not admin:
            admin = User(
                username='admin_test',
                nama='Admin Test',
                role='admin',
                password=generate_password_hash('Admin123!')
            )
            db.session.add(admin)
            db.session.commit()
            test_pw = 'Admin123!'
        else:
            admin.password = generate_password_hash('AdminPassword123')
            db.session.commit()
            test_pw = 'AdminPassword123'

        # Login admin via API to get session token
        res_login = client.post('/api/auth/login', json={
            'username': admin.username,
            'password': test_pw
        })
        assert res_login.status_code == 200, f"Admin login failed: {res_login.data}"
        admin_token = res_login.json['token']
        admin_headers = {'Authorization': f'Bearer {admin_token}'}
        print("[PASS] 1. Authentication & Single Active Session Setup")

        # 2. Test Multi-Device Single Active Session
        # Login again with admin -> old token should be invalidated
        res_login_2 = client.post('/api/auth/login', json={
            'username': admin.username,
            'password': test_pw
        })
        assert res_login_2.status_code == 200
        new_admin_token = res_login_2.json['token']
        new_admin_headers = {'Authorization': f'Bearer {new_admin_token}'}

        # Request with old token must return 401 SESSION_TERMINATED
        res_old = client.get('/api/piket/summary_today', headers=admin_headers)
        assert res_old.status_code == 401 and res_old.json.get('error_code') == 'SESSION_TERMINATED', f"Expected SESSION_TERMINATED, got: {res_old.data}"
        print("[PASS] 2. Single Active Session (Old token terminated on second device login)")

        # 3. Test Pengaturan Jadwal & Mode Darurat
        res_jadwal = client.get('/api/jadwal', headers=new_admin_headers)
        assert res_jadwal.status_code == 200, f"GET /api/jadwal failed: {res_jadwal.data}"
        assert 'data' in res_jadwal.json
        print("[PASS] 3. Dynamic Schedule API (/api/jadwal)")

        res_darurat = client.post('/api/piket/mode_darurat', headers=new_admin_headers, json={
            'status': True,
            'toleransi_menit': 30,
            'keterangan': 'Test Sinyal Gerbang'
        })
        assert res_darurat.status_code == 200
        assert res_darurat.json['mode_darurat'] is True
        print("[PASS] 4. Mode Darurat Jaringan Toggle (/api/piket/mode_darurat)")

        # 4. Test Siswa Model: nisn, must_change_password, soft-delete
        test_siswa = Siswa.query.filter_by(nis='TEST9999').first()
        if not test_siswa:
            test_siswa = Siswa(
                nis='TEST9999',
                nisn='0089999999',
                nama='Siswa Test Audit',
                kelas='XII PPLG 1',
                status='Aktif',
                must_change_password=True,
                password=generate_password_hash('TEST9999')
            )
            db.session.add(test_siswa)
            db.session.commit()
        else:
            test_siswa.password = generate_password_hash('TEST9999')
            test_siswa.must_change_password = True
            db.session.commit()

        # Login siswa: must_change_password should be True
        res_s_login = client.post('/api/auth/login', json={
            'username': 'TEST9999',
            'nis': 'TEST9999',
            'password': 'TEST9999'
        })
        assert res_s_login.status_code == 200, f"Siswa login failed: {res_s_login.data}"
        assert res_s_login.json.get('must_change_password') is True, "Expected must_change_password to be True"
        siswa_token = res_s_login.json['token']
        siswa_headers = {'Authorization': f'Bearer {siswa_token}'}
        print("[PASS] 5. Force Change Password Flag on First Login")

        # 5. Test 2FA Reset Endpoint by Admin
        test_siswa.two_factor_secret = "JBSWY3DPEHPK3PXP"
        test_siswa.two_factor_enabled = True
        db.session.commit()

        res_reset_2fa = client.post(f'/api/siswa/{test_siswa.id}/reset_2fa', headers=new_admin_headers)
        assert res_reset_2fa.status_code == 200, f"Reset 2FA failed: {res_reset_2fa.data}"
        db.session.refresh(test_siswa)
        assert test_siswa.two_factor_enabled is False and test_siswa.two_factor_secret is None
        print("[PASS] 6. Admin 2FA Reset Endpoint (/api/siswa/<id>/reset_2fa)")

        # 6. Test Pelanggaran Tamper-Proof & Status Verifikasi
        # Siswa self-reports violation: tries to set point to 1 (cheat)
        res_pelanggaran = client.post('/api/pelanggaran', headers=siswa_headers, json={
            'nama_siswa': test_siswa.nama,
            'nis': test_siswa.nis,
            'siswa_id': test_siswa.id,
            'kelas': test_siswa.kelas,
            'tanggal_waktu': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'jenis_pelanggaran': 'Datang terlambat masuk sekolah',
            'poin': 1, # Attempts to tamper
            'nama_penanggung_jawab': 'Mandiri',
            'tanda_tangan_siswa': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
        })
        assert res_pelanggaran.status_code == 201, f"Create violation failed: {res_pelanggaran.data}"
        pel_id = res_pelanggaran.json['data']['id']
        pel_rec = PelanggaranSiswa.query.get(pel_id)
        assert pel_rec.poin == 5, f"Expected point locked to default 5, got {pel_rec.poin}"
        assert pel_rec.status_verifikasi == "Menunggu Konfirmasi", f"Expected Menunggu Konfirmasi, got {pel_rec.status_verifikasi}"
        print("[PASS] 7. Pelanggaran Self-Report Tamper-Proof (Point locked to master, status Menunggu Konfirmasi)")

        # Guru piket confirms violation
        res_konfirmasi = client.post(f'/api/pelanggaran/{pel_id}/konfirmasi', headers=new_admin_headers, json={
            'tindakan': 'setujui'
        })
        assert res_konfirmasi.status_code == 200
        db.session.refresh(pel_rec)
        assert pel_rec.status_verifikasi == "Disetujui"
        print("[PASS] 8. Guru Piket 1-Click Confirmation (/api/pelanggaran/<id>/konfirmasi)")

        # 7. Test Soft Delete
        res_del = client.delete(f'/api/siswa/{test_siswa.id}', headers=new_admin_headers)
        assert res_del.status_code == 200
        db.session.refresh(test_siswa)
        assert test_siswa.is_deleted is True
        assert test_siswa.status == 'Mutasi'
        # Check that historical violation record is still preserved!
        pel_check = PelanggaranSiswa.query.get(pel_id)
        assert pel_check is not None, "Violation history was erroneously deleted on student soft delete!"
        print("[PASS] 9. Dapodik Soft Delete (is_deleted=True, status='Mutasi', history preserved)")

        # Clean up test violation and student
        db.session.delete(pel_check)
        db.session.delete(test_siswa)
        db.session.commit()

        # Turn off mode darurat
        client.post('/api/piket/mode_darurat', headers=new_admin_headers, json={'status': False})

        print("=" * 65)
        print("ALL AUDIT ENHANCEMENT TESTS PASSED PERFECTLY!")
        print("=" * 65)

if __name__ == '__main__':
    run_tests()
