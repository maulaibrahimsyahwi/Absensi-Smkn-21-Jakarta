
```
sistem_absensi_smkn21
├─ backend
│  ├─ app.py
│  ├─ config.py
│  ├─ face_utils.py
│  ├─ models.py
│  ├─ models_weights
│  │  ├─ face_detection_yunet_2023mar.onnx
│  │  └─ face_recognition_sface_2021dec.onnx
│  ├─ requirements.txt
│  ├─ routes
│  │  ├─ auth_routes.py
│  │  ├─ biometrik_routes.py
│  │  ├─ izin_routes.py
│  │  ├─ pelanggaran_routes.py
│  │  ├─ piket_routes.py
│  │  ├─ pjj_routes.py
│  │  ├─ presensi_routes.py
│  │  ├─ rekap_routes.py
│  │  ├─ siswa_routes.py
│  │  └─ __init__.py
│  ├─ seed.py
│  ├─ test_deep_fixes.py
│  ├─ test_features.py
│  ├─ test_security_audit.py
│  └─ utils
│     ├─ auth_middleware.py
│     ├─ helpers.py
│     ├─ totp_utils.py
│     └─ __init__.py
├─ frontend
│  ├─ .oxlintrc.json
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  ├─ favicon.svg
│  │  ├─ icons.svg
│  │  ├─ manifest.json
│  │  ├─ robots.txt
│  │  └─ sitemap.xml
│  ├─ README.md
│  ├─ src
│  │  ├─ App.jsx
│  │  ├─ components
│  │  │  ├─ ChangePasswordModal.jsx
│  │  │  ├─ common
│  │  │  │  ├─ ErrorBoundary.jsx
│  │  │  │  └─ Skeleton.jsx
│  │  │  ├─ CustomDatePicker.jsx
│  │  │  ├─ CustomDropdown.jsx
│  │  │  ├─ CustomTimePicker.jsx
│  │  │  ├─ dashboard
│  │  │  │  ├─ DashboardKpiCards.jsx
│  │  │  │  ├─ DashboardPagination.jsx
│  │  │  │  ├─ DashboardPeriodFilter.jsx
│  │  │  │  ├─ modals
│  │  │  │  │  ├─ RejectIzinModal.jsx
│  │  │  │  │  └─ SuratLightboxModal.jsx
│  │  │  │  └─ tabs
│  │  │  │     ├─ BukuPelanggaranTab.jsx
│  │  │  │     ├─ IzinPiketTab.jsx
│  │  │  │     ├─ ManajemenPiketTab.jsx
│  │  │  │     ├─ PerpustakaanTab.jsx
│  │  │  │     ├─ PresensiHarianTab.jsx
│  │  │  │     ├─ RekapSiswaTab.jsx
│  │  │  │     └─ VerifikasiIzinTab.jsx
│  │  │  ├─ FaceSilhouetteGuide.jsx
│  │  │  ├─ Navbar.jsx
│  │  │  ├─ NotificationDropdown.jsx
│  │  │  ├─ piket
│  │  │  │  ├─ DeleteIzinModal.jsx
│  │  │  │  └─ SlipIzinPiketModal.jsx
│  │  │  ├─ profile
│  │  │  │  ├─ TabInfoProfil.jsx
│  │  │  │  ├─ TabKeamanan2FA.jsx
│  │  │  │  ├─ TabTandaTangan.jsx
│  │  │  │  └─ TabUbahPassword.jsx
│  │  │  ├─ ProfileModal.jsx
│  │  │  ├─ ProtectedRoute.jsx
│  │  │  ├─ registrasi
│  │  │  │  ├─ DeleteSiswaModal.jsx
│  │  │  │  ├─ EditSiswaModal.jsx
│  │  │  │  ├─ FormTambahSiswa.jsx
│  │  │  │  ├─ LuluskanModal.jsx
│  │  │  │  ├─ ResetSiswaModals.jsx
│  │  │  │  └─ TabelDaftarSiswa.jsx
│  │  │  ├─ SelfFaceEnrollModal.jsx
│  │  │  └─ SignaturePadModal.jsx
│  │  ├─ constants
│  │  │  └─ schoolData.js
│  │  ├─ context
│  │  │  └─ AuthContext.jsx
│  │  ├─ data
│  │  │  └─ pelanggaranData.js
│  │  ├─ hooks
│  │  │  ├─ useFaceScanner.js
│  │  │  └─ useGeofence.js
│  │  ├─ index.css
│  │  ├─ main.jsx
│  │  ├─ pages
│  │  │  ├─ AbsensiHarian.jsx
│  │  │  ├─ AbsensiPerpus.jsx
│  │  │  ├─ CatatPelanggaran.jsx
│  │  │  ├─ Dashboard.jsx
│  │  │  ├─ GuruPiket.jsx
│  │  │  ├─ Home.jsx
│  │  │  ├─ Login.jsx
│  │  │  ├─ NotFound.jsx
│  │  │  ├─ PengajuanIzin.jsx
│  │  │  ├─ PortalAdmin.jsx
│  │  │  ├─ PortalPiket.jsx
│  │  │  ├─ PortalSiswa.jsx
│  │  │  └─ RegistrasiSiswa.jsx
│  │  ├─ services
│  │  │  └─ api.js
│  │  └─ utils
│  │     ├─ audioUtils.js
│  │     ├─ exportUtils.js
│  │     ├─ geoUtils.js
│  │     └─ imageUtils.js
│  └─ vite.config.js
├─ run.ps1
├─ stop.ps1
└─ walkthrough.md

```