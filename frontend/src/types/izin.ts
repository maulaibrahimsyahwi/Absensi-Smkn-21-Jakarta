/**
 * Nilai status resmi surat pengajuan izin / sakit siswa SMKN 21 Jakarta.
 * Sesuai kolom database `pengajuan_izin.status_pengajuan`.
 */
export const STATUS_IZIN = ['Menunggu', 'Disetujui', 'Ditolak'] as const;
export type StatusIzin = (typeof STATUS_IZIN)[number];

export const isStatusIzin = (v: unknown): v is StatusIzin =>
  typeof v === 'string' && (STATUS_IZIN as readonly string[]).includes(v);

/**
 * Peta label resmi untuk tampilan UI.
 */
export const STATUS_IZIN_LABEL: Record<StatusIzin, string> = {
  Menunggu: 'Menunggu Verifikasi',
  Disetujui: 'Disetujui',
  Ditolak: 'Ditolak',
};

/**
 * Jenis izin pengajuan online siswa: Sakit atau Izin.
 */
export const JENIS_IZIN = ['Sakit', 'Izin'] as const;
export type JenisIzin = (typeof JENIS_IZIN)[number];

/**
 * Tipe surat izin meja guru piket (E-Slip resmi).
 */
export const TIPE_IZIN_PIKET = ['Izin Masuk', 'Izin Meninggalkan Kelas'] as const;
export type TipeIzinPiket = (typeof TIPE_IZIN_PIKET)[number];

/**
 * Data transaksi surat pengajuan izin / sakit online.
 * Berkas fisik dilindungi UU PDP No. 27/2022 (Data Pribadi Spesifik Kesehatan).
 */
export interface PengajuanIzinItem {
  id: number;
  siswa_id: number;
  nama: string;
  nis: string;
  kelas: string;
  jenis: JenisIzin | string;
  tanggal_mulai: string;      // YYYY-MM-DD (WIB)
  tanggal_selesai: string;    // YYYY-MM-DD (WIB)
  alasan: string;
  surat_bukti?: string | null; // Path URL aman atau base64 data URI
  tanda_tangan_siswa?: string | null;
  status_pengajuan: StatusIzin;
  catatan_guru?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  lokasi_teks?: string | null;
  maps_url?: string | null;
  created_at?: string;        // YYYY-MM-DD HH:mm:ss (WIB)
}

/**
 * Rekaman E-Slip Surat Izin Masuk / Keluar Meja Guru Piket.
 */
export interface IzinPiketItem {
  id: number;
  siswa_id?: number;
  nama: string;
  nis: string;
  kelas: string;
  tipe: TipeIzinPiket | string;
  jam_ke: string | number;
  hari: string;
  tanggal: string;             // YYYY-MM-DD (WIB)
  tanggal_formatted?: string;  // DD/MM/YYYY
  alasan: string;
  petugas_piket: string;
  tanda_tangan_petugas?: string | null;
  tanda_tangan_siswa?: string | null;
  created_at?: string;         // YYYY-MM-DD HH:mm:ss (WIB)
}
