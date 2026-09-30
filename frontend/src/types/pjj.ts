export interface PengaturanPJJ {
  id?: number;
  aktif: boolean;
  tanggal_mulai: string;
  tanggal_selesai: string;
  keterangan: string;
  target_kelas?: string[];
  [key: string]: unknown;
}
