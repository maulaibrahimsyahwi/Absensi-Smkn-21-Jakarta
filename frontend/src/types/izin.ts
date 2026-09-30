export type StatusIzin = 'MENUNGGU' | 'DISETUJUI' | 'DITOLAK';
export type TipeIzin = 'IZIN' | 'SAKIT' | 'DISPENSASI';

export interface PengajuanIzinItem {
  id: number;
  siswa_id: number;
  nama: string;
  nis: string;
  kelas: string;
  jurusan: string;
  tipe: TipeIzin;
  tanggal_mulai: string;
  tanggal_selesai: string;
  durasi_hari?: number;
  alasan: string;
  surat_url?: string | null;
  status: StatusIzin;
  catatan_admin?: string | null;
  created_at?: string;
  approved_by?: string | null;
  [key: string]: unknown;
}

export interface IzinPiketItem {
  id: number;
  siswa_id: number;
  nama: string;
  nis: string;
  kelas: string;
  jurusan: string;
  jenis: 'TERLAMBAT' | 'IZIN_KELUAR' | 'PULANG_CEPAT' | string;
  jam: string;
  tanggal: string;
  alasan: string;
  tindakan?: string;
  petugas?: string;
  status: 'PENDING' | 'SELESAI' | string;
  [key: string]: unknown;
}
