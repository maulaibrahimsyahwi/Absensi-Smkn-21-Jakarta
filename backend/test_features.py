from app import app
from utils.totp_utils import generate_totp_secret, get_totp_token, verify_totp
from utils.auth_middleware import generate_token
from datetime import datetime, time
from config import WAKTU_MULAI_MASUK, WAKTU_BATAS_MASUK

def run_tests():
    print("=== TEST 1: TOTP RFC 6238 Generator & Verifier ===")
    sec = generate_totp_secret()
    token = get_totp_token(sec)
    assert len(token) == 6 and token.isdigit(), "Token harus 6 digit angka"
    assert verify_totp(sec, token), "Verifikasi TOTP harus True"
    assert not verify_totp(sec, "000000" if token != "000000" else "111111"), "Verifikasi kode palsu harus False"
    print("[OK] TOTP core functions valid!")

    with app.test_client() as client:
        print("\n=== TEST 2: Honeypot Anti-Bot on Login ===")
        res_bot = client.post('/api/auth/login', json={
            'username': 'admin',
            'password': 'any',
            'website_hp': 'spam-bot-input'
        })
        assert res_bot.status_code == 403, f"Expected 403 for bot honeypot, got {res_bot.status_code}"
        print("[OK] Honeypot blocked bot request:", res_bot.get_json().get('message'))

        # Buat token admin untuk menguji endpoint terproteksi
        with app.app_context():
            admin_token = generate_token(1, 'admin', 'admin')
        admin_headers = {'Authorization': f'Bearer {admin_token}'}

        print("\n=== TEST 3: 2FA Setup, Verify Enable, Login with 2FA, and Disable ===")
        # Setup 2FA for admin
        res_setup = client.post('/api/auth/2fa/setup', json={'id': 1, 'role': 'admin'}, headers=admin_headers)
        assert res_setup.status_code == 200 and res_setup.get_json()['success']
        admin_secret = res_setup.get_json()['secret']
        print("[OK] 2FA Setup initiated, secret:", admin_secret)

        # Enable with valid token
        valid_code = get_totp_token(admin_secret)
        res_enable = client.post('/api/auth/2fa/verify_enable', json={
            'id': 1,
            'role': 'admin',
            'totp_code': valid_code
        }, headers=admin_headers)
        assert res_enable.status_code == 200 and res_enable.get_json()['two_factor_enabled']
        print("[OK] 2FA successfully activated for Admin")

        # Attempt Login: Step 1 without 2FA code
        res_l1 = client.post('/api/auth/login', json={'username': 'admin', 'password': 'admin123', 'role': 'admin'})
        assert res_l1.status_code == 200
        l1_json = res_l1.get_json()
        assert l1_json.get('requires_2fa') == True, "Login harus meminta 2FA"
        print("[OK] Login Step 1 properly intercepted with requires_2fa: True")

        # Attempt Login: Step 2 with incorrect code
        res_l2_wrong = client.post('/api/auth/login', json={
            'username': 'admin',
            'password': 'admin123',
            'role': 'admin',
            'totp_code': '999999' if valid_code != '999999' else '111111'
        })
        assert res_l2_wrong.status_code == 401
        print("[OK] Login Step 2 rejected wrong code:", res_l2_wrong.get_json().get('message'))

        # Attempt Login: Step 2 with correct code
        res_l2_ok = client.post('/api/auth/login', json={
            'username': 'admin',
            'password': 'admin123',
            'role': 'admin',
            'totp_code': valid_code
        })
        assert res_l2_ok.status_code == 200 and res_l2_ok.get_json()['success']
        print("[OK] Login Step 2 successful with valid 2FA TOTP code!")

        # Disable 2FA
        res_disable = client.post('/api/auth/2fa/disable', json={
            'id': 1,
            'role': 'admin',
            'password': 'admin123'
        }, headers=admin_headers)
        assert res_disable.status_code == 200 and res_disable.get_json()['success']
        print("[OK] 2FA successfully disabled with password confirmation")

        print("\n=== TEST 4: Jam Operasional Presensi Harian (05:00 - 06:30 WIB) ===")
        res_status = client.get('/api/presensi/status_today?siswa_id=1', headers=admin_headers)
        assert res_status.status_code == 200
        data_status = res_status.get_json()
        print("[OK] Status Presensi check:", data_status.get('jam_buka'), "sampai", data_status.get('jam_batas'))

        print("\n=== TEST 5: Generate Alpa Siswa Hari Ini ===")
        res_alpa = client.post('/api/rekap/generate_alpa_today', headers=admin_headers)
        assert res_alpa.status_code == 200
        print("[OK] Generate Alpa endpoint response:", res_alpa.get_json().get('message'))

        print("\n=== TEST 6: JWT Token & Role-Based Access Control ===")
        # Login to get token
        login_res = client.post('/api/auth/login', json={
            'username': 'admin',
            'password': 'admin123'
        })
        assert login_res.status_code == 200
        token = login_res.get_json().get('token')
        assert token is not None and len(token) > 20
        print("[OK] JWT Token successfully issued upon login!")

        # Access staf list with valid Bearer token
        staf_res = client.get('/api/staf', headers={'Authorization': f'Bearer {token}'})
        assert staf_res.status_code == 200
        print("[OK] Staf endpoint accessible with valid Admin Bearer token!")

        # Test local SVG QR generation
        from utils.totp_utils import get_qr_data_uri
        qr_uri = get_qr_data_uri("TESTSECRET123456", "admin")
        assert qr_uri.startswith("data:image/svg+xml")
        print("[OK] Local SVG QR code generated offline without third-party leaks!")

    print("\nALL 6 INTEGRATION SUITES PASSED CLEANLY!")

if __name__ == '__main__':
    run_tests()
