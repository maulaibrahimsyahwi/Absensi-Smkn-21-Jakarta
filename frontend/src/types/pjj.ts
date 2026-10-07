/**
 * Konfigurasi resmi Mode Pembelajaran Jarak Jauh (PJJ / PKL).
 * Sesuai model backend `PengaturanPJJ`.
 */
export interface PengaturanPJJ {
  id?: number;
  is_active: boolean;
  aktif?: boolean;                         // Alias fallback
  tipe_lingkup?: 'semua' | 'tingkat' | 'kelas';
  tingkat_aktif?: string[];
  kelas_aktif?: string[];
  target_kelas?: string[];                 // Alias fallback
  tanggal_mulai: string | null;            // YYYY-MM-DD
  tanggal_selesai: string | null;          // YYYY-MM-DD
  keterangan: string;
  updated_by?: string;
  updated_at?: string | null;
}
