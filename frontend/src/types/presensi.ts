export type StatusPresensi = 'HADIR' | 'TERLAMBAT' | 'IZIN' | 'SAKIT' | 'ALPA' | 'DISPENSASI';

export interface AbsensiRecord {
  id: number;
  siswa_id: number;
  nama: string;
  nis: string;
  kelas: string;
  jurusan: string;
  tanggal: string;
  jam_masuk?: string | null;
  jam_pulang?: string | null;
  status: StatusPresensi | string;
  keterangan?: string | null;
  confidence?: number | null;
  foto_presensi?: string | null;
  lokasi?: string | null;
  is_manual?: boolean;
  manual_by?: string | null;
  catatan_manual?: string | null;
  jarak_meter?: number | null;
  within_radius?: boolean;
  [key: string]: unknown;
}

export interface PresensiPerpusRecord {
  id: number;
  siswa_id: number;
  nama: string;
  nis: string;
  kelas: string;
  jurusan: string;
  tanggal: string;
  jam_kunjungan: string;
  keperluan?: string;
  [key: string]: unknown;
}

export interface KpiSummary {
  total_siswa: number;
  total_hadir: number;
  total_terlambat: number;
  total_izin: number;
  total_sakit: number;
  total_alpa: number;
  persentase_kehadiran: number;
  [key: string]: unknown;
}
