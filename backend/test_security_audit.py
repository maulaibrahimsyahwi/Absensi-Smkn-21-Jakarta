"""
Script Pengujian Verifikasi Keamanan (Security Audit Verification)
Memastikan seluruh celah keamanan kritis telah tertutup:
1. Endpoint menolak request tanpa token (401)
2. Header spoofing X-User-Role ditolak (401)
3. Role siswa dilarang mengakses rute admin / piket (403)
4. Siswa dilarang memverifikasi izin sendiri (403)
5. Token Admin sah dapat mengakses endpoint (200)
"""

from app import app
from utils.auth_middleware import generate_token

def run_security_audit_tests():
    print("=========================================================")
    print("[LOCK] RUNNING COMPREHENSIVE SECURITY AUDIT VERIFICATION")
    print("=========================================================")

    with app.test_client() as client:
        with app.app_context():
            from models import Siswa
            first_siswa = Siswa.query.filter_by(status='Aktif').first()
            siswa_id = first_siswa.id if first_siswa else 4
            siswa_nis = first_siswa.nis if first_siswa else '21312'
            admin_token = generate_token(1, 'admin', 'admin')
            piket_token = generate_token(2, 'piket', 'piket')
            siswa_token = generate_token(siswa_id, 'siswa', siswa_nis)

        admin_headers = {'Authorization': f'Bearer {admin_token}'}
        piket_headers = {'Authorization': f'Bearer {piket_token}'}
        siswa_headers = {'Authorization': f'Bearer {siswa_token}'}

        # TEST 1: Request tanpa token ke seluruh endpoint terproteksi wajib ditolak (401)
        print("\n--- TEST 1: Penolakan Akses Tanpa Token (HTTP 401) ---")
        endpoints = [
            ('GET', '/api/siswa'),
            ('POST', '/api/siswa', {'nis': '99999', 'nama': 'Test', 'kelas': 'X PPLG 1'}),
            ('GET', '/api/staf'),
            ('POST', '/api/piket/izin', {'siswa_id': 1}),
            ('GET', '/api/pengajuan_izin'),
            ('POST', '/api/pengajuan_izin/1/verifikasi', {'aksi': 'Disetujui'}),
            ('DELETE', '/api/pelanggaran/1'),
            ('GET', '/api/rekap/harian'),
            ('POST', '/api/rekap/generate_alpa_today'),
            ('POST', '/api/register_face', {'siswa_id': 1}),
            ('POST', '/api/siswa/1/reset_password'),
            ('POST', '/api/siswa/1/reset_signature'),
        ]

        for method, ep, *body in endpoints:
            data = body[0] if body else None
            if method == 'GET':
                res = client.get(ep)
            elif method == 'POST':
                res = client.post(ep, json=data or {})
            elif method == 'DELETE':
                res = client.delete(ep)
            assert res.status_code == 401, f"FAIL: {method} {ep} harus 401 tapi dapat {res.status_code}"
            print(f"[OK 401] {method:6} {ep}")

        # TEST 2: Header spoofing X-User-Role wajib ditolak (401)
        print("\n--- TEST 2: Penolakan Header Spoofing X-User-Role (HTTP 401) ---")
        spoof_headers = {'X-User-Role': 'admin', 'X-User-Id': '1'}
        res_spoof = client.get('/api/staf', headers=spoof_headers)
        assert res_spoof.status_code == 401, f"FAIL: Spoofed header harus 401 tapi dapat {res_spoof.status_code}"
        print("[OK] Header 'X-User-Role: admin' berhasil ditolak dengan HTTP 401!")

        res_spoof_siswa = client.post('/api/siswa', json={'nis': '9999', 'nama': 'Hacker', 'kelas': 'X PPLG 1'}, headers=spoof_headers)
        assert res_spoof_siswa.status_code == 401, f"FAIL: Spoofed post siswa harus 401 tapi dapat {res_spoof_siswa.status_code}"
        print("[OK] Penambahan data siswa dengan spoofed header ditolak dengan HTTP 401!")

        # TEST 3: Siswa dilarang mengakses endpoint Admin (HTTP 403)
        print("\n--- TEST 3: Otorisasi Role Siswa Dibatasi (HTTP 403) ---")
        res_siswa_staf = client.get('/api/staf', headers=siswa_headers)
        assert res_siswa_staf.status_code == 403, f"FAIL: Siswa akses staf harus 403 tapi dapat {res_siswa_staf.status_code}"
        print("[OK] Siswa dilarang akses staf (HTTP 403)")

        res_siswa_crud = client.post('/api/siswa', json={'nis': '8888', 'nama': 'Fake', 'kelas': 'X PPLG 1'}, headers=siswa_headers)
        assert res_siswa_crud.status_code == 403, f"FAIL: Siswa tambah siswa harus 403 tapi dapat {res_siswa_crud.status_code}"
        print("[OK] Siswa dilarang menambah siswa (HTTP 403)")

        res_siswa_del_viol = client.delete('/api/pelanggaran/1', headers=siswa_headers)
        assert res_siswa_del_viol.status_code == 403, f"FAIL: Siswa hapus pelanggaran harus 403 tapi dapat {res_siswa_del_viol.status_code}"
        print("[OK] Siswa dilarang menghapus pelanggaran (HTTP 403)")

        # TEST 4: Siswa dilarang menyetujui izin sendiri (HTTP 403)
        print("\n--- TEST 4: Siswa Dilarang Menyetujui Izin Sendiri (HTTP 403) ---")
        res_self_approve = client.post('/api/pengajuan_izin/1/verifikasi', json={'aksi': 'Disetujui'}, headers=siswa_headers)
        assert res_self_approve.status_code == 403, f"FAIL: Siswa self-approve harus 403 tapi dapat {res_self_approve.status_code}"
        print("[OK] Siswa dilarang menyetujui pengajuan izin (HTTP 403)")

        # TEST 5: Guru Piket dan Admin dapat mengakses endpoint sesuai wewenangnya
        print("\n--- TEST 5: Wewenang Sah Guru Piket & Admin (HTTP 200) ---")
        res_piket_list = client.get('/api/piket/izin', headers=piket_headers)
        assert res_piket_list.status_code == 200
        print("[OK] Guru Piket berhasil mengakses daftar izin piket (HTTP 200)")

        res_admin_staf = client.get('/api/staf', headers=admin_headers)
        assert res_admin_staf.status_code == 200
        print("[OK] Admin berhasil mengakses daftar staf (HTTP 200)")

        res_admin_rekap = client.get('/api/rekap/harian', headers=admin_headers)
        assert res_admin_rekap.status_code == 200
        print("[OK] Admin berhasil mengakses rekap harian (HTTP 200)")

        # TEST 6: Proteksi Audit Logs & Protected Document Storage
        print("\n--- TEST 6: Proteksi Audit Trail & Protected File Storage ---")
        res_siswa_audit = client.get('/api/audit_logs', headers=siswa_headers)
        assert res_siswa_audit.status_code == 403, f"FAIL: Siswa audit log harus 403 tapi dapat {res_siswa_audit.status_code}"
        print("[OK] Siswa dilarang mengakses log audit (HTTP 403)")

        res_admin_audit = client.get('/api/audit_logs', headers=admin_headers)
        assert res_admin_audit.status_code == 200
        print("[OK] Admin berhasil mengakses log audit (HTTP 200)")

        res_anon_doc = client.get('/api/pengajuan_izin/dokumen/secret_doctor_note.jpg')
        assert res_anon_doc.status_code == 401
        print("[OK] Akses dokumen izin tanpa token ditolak (HTTP 401)")

    print("\n=========================================================")
    print("[PASSED] ALL SECURITY AUDIT ASSERTIONS PASSED PERFECTLY!")
    print("=========================================================")

if __name__ == '__main__':
    run_security_audit_tests()
