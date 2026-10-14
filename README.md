# Sistem Absensi, Disiplin & Monitoring SMKN 21 Jakarta

Aplikasi web terintegrasi untuk pengelolaan absensi biometrik wajah berbasis AI, kedisiplinan dan prestasi siswa, serta monitoring operasional sekolah secara real-time di SMKN 21 Jakarta.

---

## 🏛️ Arsitektur Sistem

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite 8 (PWA, Service Worker, IndexedDB Offline Emergency Queue)
- **Backend**: Python 3.11+, Flask (Modular Blueprints), Waitress WSGI Multi-threading
- **Basis Data**: PostgreSQL 17 (Supabase Transaction Pooler port 6543) dengan SQLAlchemy ORM
- **Kecerdasan Buatan (AI)**: OpenCV DNN YuNet (Face Detection) + SFace (Face Recognition Feature Vector `<1ms`) dengan isolasi thread (`threading.local`)
- **Keamanan & Autentikasi**: JWT (HS256), Werkzeug `scrypt` hashing (auto-upgrade), Single Active Session Token, 2FA TOTP (Offline RFC 6238), Rate Limiting (Flask-Limiter)
- **Kepatuhan Privasi**: Standar UU Pelindungan Data Pribadi (UU PDP No. 27 Tahun 2022) dengan enkripsi data biometrik dan kontrol akses ketat pada rekam medis/surat izin.

---

## 📁 Struktur Direktori

```text
sistem_absensi_smkn21/
├── backend/
│   ├── app.py                         # Inisialisasi Flask, Middleware Keamanan, Error Handler
│   ├── config.py                      # Konfigurasi Lingkungan, Database URL, Secret Keys, Geofence
│   ├── face_utils.py                  # Pipeline AI Biometrik OpenCV (YuNet + SFace)
│   ├── models.py                      # Skema Model Database SQLAlchemy (PostgreSQL)
│   ├── requirements.txt               # Dependensi Python Server
│   ├── run_production.py              # Runner Server Produksi (Waitress WSGI Multi-Thread)
│   ├── models_weights/                # Bobot Neural Network ONNX (YuNet & SFace)
│   ├── routes/                        # Modular Blueprint API
│   │   ├── auth_routes.py             # Autentikasi, JWT, 2FA TOTP, Profil & Avatar
│   │   ├── backup_routes.py           # Snapshot DB, Full System Archive, Housekeeping & Restore API
│   │   ├── biometrik_routes.py        # Deteksi Wajah, Liveness Kedipan, Token Challenge
│   │   ├── holiday_routes.py          # Kalender Akademik, Hari Libur & Surat Edaran
│   │   ├── izin_routes.py             # Pengajuan Izin/Sakit Mandiri & Bukti Medis Terproteksi
│   │   ├── pelanggaran_routes.py      # Buku Catatan Disiplin & Poin Prestasi
│   │   ├── piket_routes.py            # Meja Guru Piket, E-Slip Dispensasi Masuk/Keluar
│   │   ├── pjj_routes.py              # Pengaturan Mode PJJ / PKL (Bypass Geofence)
│   │   ├── presensi_routes.py         # Transaksi Presensi Harian & Geofence Validation
│   │   ├── rekap_routes.py            # Rekapitulasi Presensi & Laporan Sudin
│   │   ├── siswa_routes.py            # CRUD Siswa, Kenaikan Kelas Massal, Status Alumni
│   │   └── staf_routes.py             # Manajemen Akun Staf Admin & Guru Piket
│   ├── scripts/                       # Skrip Pemeliharaan & Operasional
│   │   ├── migrate_sqlite_to_postgres.py  # Migrasi data SQLite lama ke PostgreSQL
│   │   └── restore_database.py        # CLI Disaster Recovery Pemulihan Basis Data
│   └── utils/                         # Modul Utilitas & Helper
│       ├── audit_trail.py             # Pencatatan Rekam Jejak Audit Log Operasional
│       ├── auth_middleware.py         # Dekorator @token_required & @role_required
│       ├── auth_security.py           # Rate limiting brute-force & verifikasi scrypt
│       ├── backup_utils.py            # Snapshot JSON, Full ZIP Archive & Urutan FK Restore
│       ├── db_migrations.py           # Auto-migrasi skema kolom PostgreSQL saat startup
│       ├── file_storage.py            # Penyimpanan fisik avatar, ttd digital & berkas uploads
│       ├── helpers.py                 # Timezone WIB (now_wib), Geofence Poligon, Validasi Jam
│       ├── passwords.py               # Kebijakan kata sandi & validasi tanda tangan PNG
│       ├── realtime_bus.py            # In-memory realtime event bus untuk Live Polling
│       └── totp_utils.py              # Generator & Verifikator 2FA TOTP Offline
├── frontend/
│   ├── index.html                     # Entry point HTML5 & meta tags PWA
│   ├── package.json                   # Dependensi React 19 & Skrip Build
│   ├── vite.config.js                 # Konfigurasi Vite, SSL Proxy & Chunk Splitting
│   ├── public/                        # Aset Publik, PWA Manifest & Service Worker
│   └── src/
│       ├── App.tsx                    # Rute Utama, Lazy Loading & Proteksi Peran
│       ├── main.tsx                   # Inisialisasi React DOM
│       ├── components/                # Komponen Antarmuka Pengguna
│       │   ├── common/                # ErrorBoundary, Skeleton, Toast, Alerts
│       │   ├── dashboard/             # Tab, KPI Cards, Filter Periode, Modal Laporan
│       │   ├── piket/                 # Modal Presensi Manual, Force Majeure, Slip Izin
│       │   ├── profile/               # Tab Profil, Ganti Password, 2FA, Tanda Tangan
│       │   └── registrasi/            # Formulir Siswa, Tabel Siswa, Import/Export Excel
│       ├── context/
│       │   └── AuthContext.tsx        # Global State Autentikasi Pengguna
│       ├── hooks/                     # Custom React Hooks (FaceScanner, Geofence, PWA)
│       ├── pages/                     # Halaman Rute Aplikasi
│       │   ├── AbsensiHarian.tsx      # Kamera Presensi Biometrik & Liveness
│       │   ├── AbsensiPerpus.tsx      # Kiosk Kunjungan Perpustakaan
│       │   ├── CatatPelanggaran.tsx   # Portal Pengakuan Disiplin & E-Signature
│       │   ├── Dashboard.tsx          # Pusat Monitoring Guru Piket & Staf Admin
│       │   ├── GuruPiket.tsx          # Portal Meja Piket & Penerbitan E-Slip
│       │   ├── HalamanLibur.tsx       # Manajemen Kalender Akademik & Hari Libur
│       │   ├── Home.tsx               # Halaman Beranda Publik SMKN 21
│       │   ├── KebijakanPrivasi.tsx   # Dokumen Hukum Kebijakan Privasi Biometrik
│       │   ├── Login.tsx              # Autentikasi Multi-Role & 2FA TOTP
│       │   ├── PengajuanIzin.tsx      # Pengajuan Mandiri Sakit/Izin Siswa
│       │   ├── PortalAdmin.tsx        # Pengaturan Sekolah, PJJ, Staf, Backup & Storage
│       │   ├── PortalPiket.tsx        # Ringkasan Eksekutif & Tindakan Darurat Piket
│       │   ├── PortalSiswa.tsx        # Riwayat Absensi & Status Kehadiran Siswa
│       │   └── RegistrasiSiswa.tsx    # Manajemen Induk Siswa & Perekaman Biometrik
│       └── utils/                     # Format tanggal, ekspor Excel/PDF, audio chime
├── run.ps1                            # Peluncur Otomatis Server (Latar Belakang / Terlihat)
└── stop.ps1                           # Penghenti Seluruh Layanan Server
```

---

## 🚀 Panduan Instalasi & Menjalankan Sistem

### 1. Prasyarat Sistem
- **Sistem Operasi**: Windows 10/11 atau Linux Server
- **Python**: Versi 3.11 atau lebih baru
- **Node.js**: Versi 20 atau lebih baru (LTS disarankan)
- **Koneksi Database**: Akses PostgreSQL / Supabase URL

### 2. Konfigurasi Lingkungan (`backend/.env`)
Salin file template atau buat file `.env` di folder `backend/`:
```ini
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
SECRET_KEY=kunci-rahasia-enkripsi-jwt-smkn21
FLASK_ENV=production
```

### 3. Menjalankan Server dengan Skrip Peluncur (`run.ps1`)

Gunakan skrip PowerShell bawaan yang telah dioptimalkan:

#### Mode Produksi (Rekomendasi untuk Sekolah)
Menjalankan backend Waitress WSGI performa tinggi dan menyajikan bundle frontend teroptimasi:
```powershell
.\run.ps1 -Mode prod
```

#### Mode Pengembangan (Development)
Menjalankan backend Flask dengan auto-reload dan Vite Dev Server:
```powershell
.\run.ps1 -Mode dev
```

#### Opsi Tambahan:
- `-Visible` : Membuka jendela PowerShell terpisah untuk memantau log secara langsung.
- `-NoBrowser` : Tidak membuka browser otomatis setelah server aktif.

#### Menghentikan Semua Layanan:
```powershell
.\stop.ps1
```

---

## 🛡️ Pemulihan Basis Data (Disaster Recovery)

Sistem dilengkapi mekanisme backup snapshot harian otomatis (berotasi 30 hari) serta arsip sistem penuh (`.zip`).

### Memulihkan Data melalui CLI:
Jalankan skrip pemulihan database dari terminal:
```powershell
cd backend
.\venv\Scripts\python.exe scripts\restore_database.py
```
Skrip akan menampilkan daftar cadangan yang tersedia, mengurutkan foreign key dependencies secara benar, dan mereset auto-increment sequence PostgreSQL setelah pemulihan selesai.

---

## 🔒 Kebijakan Privasi & Perlindungan Data Biometrik

Sistem mematuhi standar hukum perlindungan data pribadi siswa:
1. **Minimalisasi Data**: Foto wajah pengguna hanya diekstrak menjadi representasi vektor numerik 128-dimensi (ONNX SFace) dan gambar asli tidak disimpan permanen di server.
2. **Penyimpanan Tanda Tangan & Lampiran Fisik**: Foto surat izin dan tanda tangan digital disimpan dalam folder terisolasi di disk server, bukan di dalam kolom teks database, untuk mencegah kelebihan muatan memori.
3. **Enkripsi Transit & At-Rest**: Akses berkas rekam medis dan surat keterangan dokter dilindungi oleh otorisasi berbasis token JWT bertingkat hak akses.

---

© 2026 SMK Negeri 21 Jakarta. Hak Cipta Dilindungi Undang-Undang.