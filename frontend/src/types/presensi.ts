/**
 * Nilai status resmi presensi kehadiran harian siswa SMKN 21 Jakarta.
 * Sesuai mesin penentu status kehadiran backend `check_status_kehadiran()`.
 */
export const STATUS_PRESENSI = [
  'Tepat Waktu',
  'Hadir',
  'Terlambat',
  'Sakit',
  'Izin',
  'Alpa',
  'Dispensasi',
] as const;

export type CanonicalStatusPresensi = (typeof STATUS_PRESENSI)[number];

export type StatusPresensi =
  | CanonicalStatusPresensi
  | 'Hadir (Dispensasi Medis)'
  | 'Tepat Waktu (PJJ)'
  | 'Terlambat (PJJ)'
  | 'Tepat Waktu (PKL)'
  | 'Terlambat (PKL)';

export const isStatusPresensi = (v: unknown): v is StatusPresensi =>
  typeof v === 'string' &&
  ((STATUS_PRESENSI as readonly string[]).includes(v) ||
    v.includes('(PJJ)') ||
    v.includes('(PKL)') ||
    v.includes('(Dispensasi Medis)'));

/**
 * Peta label dan warna indikator status presensi.
 */
export const STATUS_PRESENSI_LABEL: Record<CanonicalStatusPresensi, string> = {
  'Tepat Waktu': 'Tepat Waktu',
  Hadir: 'Hadir',
  Terlambat: 'Terlambat',
  Sakit: 'Sakit',
  Izin: 'Izin',
  Alpa: 'Alpa',
  Dispensasi: 'Dispensasi',
};

/**
 * Catatan riwayat presensi harian siswa (Sesuai model `AbsensiHarian`).
 */
export interface AbsensiRecord {
  id: number;
  siswa_id: number;
  nama: string;
  nis: string;
  kelas: string;
  jurusan?: string;
  waktu: string;               // YYYY-MM-DD HH:mm:ss (WIB)
  tanggal?: string;            // YYYY-MM-DD (WIB)
  jam_masuk?: string | null;    // HH:mm (WIB)
  jam_pulang?: string | null;   // HH:mm (WIB)
  status: StatusPresensi | string;
  keterangan?: string | null;
  /**
   * Skala persentase kecocokan biometrik wajah AI: 0.0 s.d. 100.0 (misal: 98.4%).
   */
  confidence?: number | null;
  foto_presensi?: string | null; // Dilindungi hak akses UU PDP No. 27/2022
  lokasi?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  device_id?: string | null;
  is_flagged_proxy?: boolean;
  proxy_note?: string | null;
  tahun_ajaran?: string;
  semester?: string;
  is_manual?: boolean;
  manual_by?: string | null;
  catatan_manual?: string | null;
  jarak_meter?: number | null;
  within_radius?: boolean;
}

/**
 * Catatan riwayat kunjungan perpustakaan (Sesuai model `AbsensiPerpustakaan`).
 */
export interface PresensiPerpusRecord {
  id: number;
  siswa_id: number;
  nama: string;
  nis: string;
  kelas: string;
  jurusan?: string;
  waktu: string;               // YYYY-MM-DD HH:mm:ss (WIB)
  tanggal?: string;            // YYYY-MM-DD (WIB)
  jam_kunjungan?: string;      // HH:mm (WIB)
  keperluan?: string;
  device_id?: string | null;
}

/**
 * Ringkasan Key Performance Indicator (KPI) kehadiran hari ini.
 */
export interface KpiSummary {
  total_siswa: number;
  total_hadir: number;
  total_terlambat: number;
  total_izin: number;
  total_sakit: number;
  total_alpa: number;
  /**
   * Skala persentase kehadiran: 0.0 s.d. 100.0 (misal: 95.5%).
   */
  persentase_kehadiran: number;
}

/**
 * Baris item hasil rekap presensi harian dari endpoint `/api/rekap/harian`.
 */
export interface RekapHarianRow {
  id: number;
  siswa_id: number;
  nama: string;
  nis: string;
  kelas: string;
  waktu: string;
  status: string;
  device_id?: string | null;
  is_flagged_proxy?: boolean;
  proxy_note?: string | null;
  tahun_ajaran?: string;
  semester?: string;
}

/**
 * Baris item agregat kehadiran siswa per periode dari `/api/rekap/siswa_periode`.
 */
export interface RekapSiswaPeriodeRow {
  siswa_id: number;
  nis: string;
  nama: string;
  kelas: string;
  status: string;
  pjj: number;
  pkl: number;
  tepat_waktu: number;
  terlambat: number;
  dispensasi: number;
  sakit: number;
  izin: number;
  alpa: number;
  total_hadir: number;
  kunjungan_perpus: number;
}

/**
 * Struktur transaksi antrean presensi lokal saat jaringan offline / darurat.
 */
export interface OfflineAttendanceRecord {
  id: string; // UUID v4 idempotency key
  siswa_id?: number;
  expected_siswa_id?: number;
  nis: string;
  nama: string;
  status: string;
  waktu: string; // ISO 8601 string / format WIB
  captured_at: string;
  image?: string;
  device_id?: string;
  latitude?: number;
  longitude?: number;
  mode?: 'mandiri' | 'kiosk';
}

/**
 * Hasil per-entri dari respon sinkronisasi offline server `/api/presensi/sync_offline`.
 */
export interface SyncOfflineResultItem {
  id: string;
  status: 'synced' | 'duplicate' | 'rejected' | 'error';
  siswa_id?: number;
  nama?: string;
  status_kehadiran?: string;
  reason?: string;
  message?: string;
}

/**
 * Respon resmi batch sinkronisasi offline dari `/api/presensi/sync_offline`.
 */
export interface SyncOfflineResponse {
  success: boolean;
  synced: number;
  duplicates: number;
  failed: number;
  results: SyncOfflineResultItem[];
  message: string;
}
