export interface PelanggaranRule {
  id: string | number;
  kategori: string;
  nama: string;
  poin: number;
}

export interface PelanggaranRecord {
  id: number;
  siswa_id: number;
  nama: string;
  nis: string;
  kelas: string;
  jurusan: string;
  tanggal: string;
  kategori: string;
  pelanggaran: string;
  poin: number;
  tindakan?: string;
  petugas?: string;
  total_poin?: number;
  sanksi?: string;
  created_at?: string;
  tanggal_waktu_formatted?: string;
  jenis_pelanggaran?: string;
  nama_penanggung_jawab?: string;
  tanda_tangan_siswa?: string;
  [key: string]: any;
}

export type Pelanggaran = PelanggaranRecord;
