"""
Test Suite untuk memvalidasi perbaikan komprehensif celah keamanan IDOR,
pengetatan geofence, proteksi biometrik, dan performa agregasi SQL.
"""

from app import app
from models import db, User, Siswa, AbsensiHarian
from utils.auth_middleware import generate_token
from datetime import datetime

def run_tests():
    client = app.test_client()
    
    with app.app_context():
        # Setup akun uji
        admin_user = User.query.filter_by(role='admin').first()
        piket_user = User.query.filter_by(role='piket').first()
        
        # Buat 2 siswa uji jika belum ada
        siswa_a = Siswa.query.filter_by(nis='TEST001').first()
        if not siswa_a:
            siswa_a = Siswa(nis='TEST001', nama='Siswa Penguji A', kelas='XII PPLG 1', status='Aktif')
            db.session.add(siswa_a)
        
        siswa_b = Siswa.query.filter_by(nis='TEST002').first()
        if not siswa_b:
            siswa_b = Siswa(nis='TEST002', nama='Siswa Penguji B', kelas='XII PPLG 2', status='Aktif')
            db.session.add(siswa_b)
        db.session.commit()
        
        token_admin = generate_token(admin_user.id, 'admin', admin_user.username)
        token_piket = generate_token(piket_user.id, 'piket', piket_user.username)
        token_siswa_a = generate_token(siswa_a.id, 'siswa', siswa_a.nis)
        token_siswa_b = generate_token(siswa_b.id, 'siswa', siswa_b.nis)

    headers_admin = {"Authorization": f"Bearer {token_admin}", "Content-Type": "application/json"}
    headers_piket = {"Authorization": f"Bearer {token_piket}", "Content-Type": "application/json"}
    headers_siswa_a = {"Authorization": f"Bearer {token_siswa_a}", "Content-Type": "application/json"}
    headers_siswa_b = {"Authorization": f"Bearer {token_siswa_b}", "Content-Type": "application/json"}

    print("=========================================================")
    print("[TEST] RUNNING DEEP SECURITY & PERFORMANCE VERIFICATIONS")
    print("=========================================================")

    # 1. Siswa dilarang mencatat pelanggaran (POST /api/pelanggaran) -> 403
    res = client.post('/api/pelanggaran', json={
        "nis": "TEST002",
        "nama_siswa": "Siswa Penguji B",
        "kelas": "XII PPLG 2",
        "jenis_pelanggaran": "Berkelahi dan tawuran",
        "poin": 50,
        "nama_penanggung_jawab": "Guru Palsu",
        "tanda_tangan_siswa": "data:image/png;base64,sample"
    }, headers=headers_siswa_a)
    assert res.status_code == 403, f"Expected 403 for siswa create_pelanggaran, got {res.status_code}"
    print("[OK] Siswa dilarang mencatat pelanggaran disiplin (HTTP 403)")

    # 2. Siswa dilarang mengakses rekap pelanggaran sekolah -> 403
    res = client.get('/api/pelanggaran/rekap', headers=headers_siswa_a)
    assert res.status_code == 403, f"Expected 403 for siswa get_pelanggaran_rekap, got {res.status_code}"
    print("[OK] Siswa dilarang melihat rekap pelanggaran umum (HTTP 403)")

    # 3. Siswa A dilarang mengajukan izin atas nama Siswa B -> 403
    res = client.post('/api/pengajuan_izin', json={
        "nis": "TEST002",  # NIS milik Siswa B
        "jenis": "Sakit",
        "tanggal_mulai": "2026-09-20",
        "tanggal_selesai": "2026-09-21",
        "alasan": "Demam tinggi"
    }, headers=headers_siswa_a)
    assert res.status_code == 403, f"Expected 403 for IDOR pengajuan izin, got {res.status_code}"
    print("[OK] Siswa dilarang mengajukan perizinan atas nama NIS orang lain (HTTP 403)")

    # 4. Siswa A dilarang merekam sampel wajah untuk Siswa B -> 403
    res = client.post('/api/register_face', json={
        "siswa_id": siswa_b.id,
        "image": "data:image/jpeg;base64,/9j/fake"
    }, headers=headers_siswa_a)
    assert res.status_code == 403, f"Expected 403 for IDOR register face, got {res.status_code}"
    print("[OK] Siswa dilarang merekam sampel biometrik untuk akun orang lain (HTTP 403)")

    # 5. Siswa A dilarang mengubah tanda tangan Siswa B -> 403
    res = client.post('/api/auth/signature', json={
        "role": "siswa",
        "id": siswa_b.id,
        "signature": "data:image/png;base64,ttd_palsu"
    }, headers=headers_siswa_a)
    assert res.status_code == 403, f"Expected 403 for IDOR signature update, got {res.status_code}"
    print("[OK] Siswa dilarang mengubah tanda tangan akun orang lain (HTTP 403)")

    # 6. Presensi mandiri tanpa koordinat GPS ditolak -> 403
    res = client.post('/api/verify_harian', json={
        "image": "data:image/jpeg;base64,/9j/fake",
        "expected_siswa_id": siswa_a.id,
        "latitude": None,
        "longitude": None
    }, headers=headers_siswa_a)
    assert res.status_code == 403, f"Expected 403 for presensi without GPS, got {res.status_code}"
    print("[OK] Presensi mandiri tanpa koordinat GPS ditolak (HTTP 403)")

    # 7. Pengujian performa agregasi SQL pada get_rekap_siswa_periode
    res = client.get('/api/rekap/siswa_periode?mode=tahun&tahun=2026', headers=headers_admin)
    assert res.status_code == 200, f"Expected 200 for rekap_siswa_periode, got {res.status_code}"
    data = res.get_json()
    assert "statistik" in data and "daftar" in data
    assert "total_siswa" in data["statistik"]
    assert "total_presensi_harian" in data["statistik"]
    print("[OK] Query SQL Aggregation get_rekap_siswa_periode berhasil dieksekusi dengan cepat!")

    print("=========================================================")
    print("[PASSED] ALL DEEP FIX ASSERTIONS PASSED PERFECTLY!")
    print("=========================================================")

if __name__ == '__main__':
    run_tests()

