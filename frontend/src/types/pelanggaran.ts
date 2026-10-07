export interface PelanggaranRule {
  id: string | number;
  kategori: string;
  nama: string;
  poin: number;
}

export interface PelanggaranRecord {
  id: number;
  siswa_id: number;
  nis: string;
  nama_siswa: string;
  nama?: string;
  kelas: string;
  jurusan?: string;
  tanggal_waktu: string;
  tanggal_waktu_formatted?: string;
  tanggal?: string;
  kategori: string;
  jenis_pelanggaran: string;
  pelanggaran?: string;
  poin: number;
  nama_penanggung_jawab?: string;
  petugas?: string;
  tanda_tangan_siswa?: string | null;
  status_verifikasi?: string;
  keterangan?: string | null;
  tindakan?: string;
  total_poin?: number;
  sanksi?: string;
  tahun_ajaran?: string;
  semester?: string;
  created_at?: string;
}

export type Pelanggaran = PelanggaranRecord;
