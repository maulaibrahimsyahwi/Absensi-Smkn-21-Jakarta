import os
import json
from datetime import datetime, date, timedelta
from app import app
from models import db, HariLibur
from utils.helpers import get_holiday_status, is_school_day

from utils.auth_middleware import generate_token

def test_libur_system():
    print("\n=======================================================")
    print("VERIFIKASI FITUR KALENDER AKADEMIK & HARI LIBUR SEKOLAH")
    print("=======================================================")

    with app.app_context():
        client = app.test_client()

        admin_token = generate_token(1, 'admin', 'admin')
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        piket_token = generate_token(2, 'piket', 'piket')
        piket_headers = {'Authorization': f'Bearer {piket_token}'}

        # 1. Test GET status_today
        res_status = client.get('/api/hari_libur/status_today', headers=piket_headers)
        assert res_status.status_code == 200
        data_status = res_status.get_json()
        print(f"[OK] Status hari ini: is_school_day={data_status['is_school_day']}, nama_hari={data_status['nama_hari']}")

        # 2. Test Non-Admin cannot create holiday (HTTP 403)
        res_fail = client.post('/api/hari_libur', json={
            'nama': 'Libur Uji Coba',
            'tanggal_mulai': '2026-12-20',
            'tanggal_selesai': '2027-01-02'
        }, headers=piket_headers)
        assert res_fail.status_code == 403
        print("[OK] Guru Piket dilarang menambah hari libur (HTTP 403)")

        # 3. Test Admin creates Libur Semester
        res_create = client.post('/api/hari_libur', json={
            'nama': 'Libur Semester Ganjil TA 2026/2027',
            'kategori': 'libur_semester',
            'tanggal_mulai': '2026-12-21',
            'tanggal_selesai': '2027-01-03',
            'tipe_hari': 'libur',
            'keterangan': 'Sesuai Kalender Pendidikan Disdik DKI Jakarta'
        }, headers=admin_headers)
        assert res_create.status_code == 201
        created_id = res_create.get_json()['data']['id']
        print(f"[OK] Admin berhasil menambahkan Libur Semester (ID: {created_id})")

        # 4. Verifikasi bahwa tanggal di dalam rentang libur semester menghasilkan is_school_day = False
        target_libur_date = datetime(2026, 12, 23, 10, 0) # Rabu di dalam libur semester
        assert is_school_day(target_libur_date) == False
        h_info = get_holiday_status(target_libur_date)
        assert h_info["is_holiday"] == True
        assert "Libur Semester" in h_info["holiday_event"]["nama"]
        print(f"[OK] Hari Rabu 23 Des 2026 otomatis diakui sebagai Libur Semester (is_school_day=False)")

        # 5. Test Admin creates 'masuk_khusus' (Misal Upacara 17 Agustus atau Hardiknas yang jatuh di hari Minggu/merah)
        res_special = client.post('/api/hari_libur', json={
            'nama': 'Upacara Peringatan Hari Kemerdekaan RI',
            'kategori': 'khusus',
            'tanggal_mulai': '2026-08-17',
            'tanggal_selesai': '2026-08-17',
            'tipe_hari': 'masuk_khusus',
            'keterangan': 'Seluruh siswa dan dewan guru wajib hadir upacara bendera'
        }, headers=admin_headers)
        assert res_special.status_code == 201
        special_id = res_special.get_json()['data']['id']

        # 17 Agustus 2026 adalah hari Senin
        dt_upacara = datetime(2026, 8, 17, 7, 0)
        h_upacara = get_holiday_status(dt_upacara)
        assert h_upacara["is_special_school_day"] == True
        assert is_school_day(dt_upacara) == True
        print(f"[OK] Kegiatan Masuk Khusus berhasil mengaktifkan presensi (is_special_school_day=True)")

        # 6. Test Quick Override Today (Admin klik 'Liburkan Hari Ini')
        res_ov_libur = client.post('/api/hari_libur/quick_override_today', json={
            'action': 'libur',
            'nama': 'Diliburkan Khusus (Rapat Dewan Guru)',
            'keterangan': 'Seluruh siswa belajar mandiri di rumah'
        }, headers=admin_headers)
        assert res_ov_libur.status_code == 200
        print("[OK] Quick Override 'libur' hari ini berhasil dieksekusi")

        # Cek status hari ini sekarang
        now_check = datetime.now()
        h_today = get_holiday_status(now_check)
        assert h_today["is_holiday"] == True
        assert h_today["is_school_day"] == False
        print(f"[OK] Status hari ini seketika berubah menjadi LIBUR: {h_today['holiday_event']['nama']}")

        # 7. Test Quick Override Reset (Kembalikan ke normal)
        res_ov_reset = client.post('/api/hari_libur/quick_override_today', json={
            'action': 'reset'
        }, headers=admin_headers)
        assert res_ov_reset.status_code == 200
        print("[OK] Quick Override 'reset' hari ini berhasil dikembalikan ke normal")

        # 8. Test 1-Click Sync National Holidays
        res_sync_nat = client.post('/api/hari_libur/sync_national', json={'tahun': 2026}, headers=admin_headers)
        assert res_sync_nat.status_code == 200
        data_nat = res_sync_nat.get_json()
        assert data_nat["success"] == True
        print(f"[OK] 1-Click Sync Libur Nasional 2026 berhasil: {data_nat['added']} hari libur diimpor, {data_nat['skipped']} dilewati.")

        # Test duplicate sync (should skip all)
        res_sync_nat2 = client.post('/api/hari_libur/sync_national', json={'tahun': 2026}, headers=admin_headers)
        assert res_sync_nat2.status_code == 200
        data_nat2 = res_sync_nat2.get_json()
        assert data_nat2["added"] == 0
        print(f"[OK] Deteksi duplikasi sync berjalan: {data_nat2['skipped']} hari libur dilewati.")

        # 9. Test 1-Click Sync Academic Calendar
        res_sync_acad = client.post('/api/hari_libur/sync_academic', json={'tahun': 2026}, headers=admin_headers)
        assert res_sync_acad.status_code == 200
        data_acad = res_sync_acad.get_json()
        assert data_acad["success"] == True
        print(f"[OK] 1-Click Sync Libur Semester 2026 berhasil: {data_acad['added']} agenda libur diimpor.")

        # 10. Test Quick Surat Edaran (Aksi Cepat SE Dadakan)
        res_se = client.post('/api/hari_libur/quick_se', json={
            'target': 'besok',
            'tipe_hari': 'libur',
            'judul': 'PJJ Cuaca Ekstrem',
            'nomor_se': 'SE Disdik No. 99/2026',
            'keterangan': 'Instruksi PJJ dari Kepala Dinas Pendidikan DKI Jakarta'
        }, headers=admin_headers)
        assert res_se.status_code == 200
        data_se = res_se.get_json()
        assert data_se['success'] == True
        print("[OK] Aksi Cepat Surat Edaran (quick_se) berhasil diterapkan.")

        # 11. Test Template File Download
        res_tpl = client.get('/api/hari_libur/template_file', headers=admin_headers)
        assert res_tpl.status_code == 200
        assert len(res_tpl.data) > 0
        print(f"[OK] Download Template Kalender Excel berhasil ({len(res_tpl.data)} bytes).")

        # 12. Test Import File Excel
        import io
        import openpyxl
        wb_test = openpyxl.Workbook()
        ws_test = wb_test.active
        ws_test.append(["Nama Agenda", "Tanggal Mulai", "Tanggal Selesai", "Kategori", "Presensi", "Keterangan"])
        ws_test.append(["Uji Coba Import Excel Disdik", "2026-11-25", "2026-11-25", "khusus", "masuk_khusus", "Hari Guru Nasional"])
        test_buf = io.BytesIO()
        wb_test.save(test_buf)
        test_buf.seek(0)

        # Cleanup import test record if already exists from previous runs
        test_imp_old = HariLibur.query.filter_by(nama="Uji Coba Import Excel Disdik").first()
        if test_imp_old:
            db.session.delete(test_imp_old)
            db.session.commit()

        res_import = client.post(
            '/api/hari_libur/import_file',
            data={'file': (test_buf, 'test_kaldik.xlsx')},
            content_type='multipart/form-data',
            headers=admin_headers
        )
        assert res_import.status_code == 200
        data_imp = res_import.get_json()
        assert data_imp['success'] == True
        assert data_imp['added'] == 1
        print(f"[OK] Import file Excel kalender berhasil: {data_imp['added']} ditambahkan.")

        # Bersihkan data test libur manual & import
        client.delete(f'/api/hari_libur/{created_id}', headers=admin_headers)
        client.delete(f'/api/hari_libur/{special_id}', headers=admin_headers)
        test_imp_end = HariLibur.query.filter_by(nama="Uji Coba Import Excel Disdik").first()
        if test_imp_end:
            db.session.delete(test_imp_end)
            db.session.commit()
        print("[OK] Cleanup data pengujian kalender libur selesai")

        print("\n=======================================================")
        print("SEMUA ASSERTION FITUR HARI LIBUR & KALENDER BERHASIL!")
        print("=======================================================\n")

if __name__ == '__main__':
    test_libur_system()
