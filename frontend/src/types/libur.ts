/**
 * Representasi entitas kalender hari libur / hari khusus SMKN 21 Jakarta.
 * Disimpan di database `hari_libur` (rentang tanggal_mulai s.d. tanggal_selesai).
 * Untuk libur 1 hari penuh, tanggal_mulai sama dengan tanggal_selesai.
 */
export interface HolidayEvent {
  id?: number | string;
  nama: string;
  kategori?: string;
  tipe_hari: 'libur' | 'masuk_khusus';
  tanggal_mulai: string;      // YYYY-MM-DD (WIB)
  tanggal_selesai: string;    // YYYY-MM-DD (WIB)
  tanggal?: string;           // Alias kemudahan untuk komponen tampilan tanggal tunggal
  keterangan?: string;
  is_active?: boolean;
  is_builtin?: boolean;
  is_built_in?: boolean;
  is_cuti_bersama?: boolean;
  is_weekend?: boolean;
  lampiran_surat?: string | null;
  nama_file_surat?: string | null;
  total_pages?: number;       // Selalu bernilai integer
  created_by?: string;
  created_at?: string;
}

export type LiburEvent = HolidayEvent;

/**
 * Respon resmi endpoint operasional `/api/hari_libur/status_today`.
 * Digunakan oleh mesin Kiosk, Portal Guru Piket, dan Admin untuk
 * menentukan apakah presensi harian wajib dibuka atau ditutup.
 */
export interface HolidayStatusResponse {
  success: boolean;
  tanggal?: string;           // YYYY-MM-DD
  is_school_day: boolean;
  is_holiday: boolean;
  is_special_school_day: boolean;
  is_weekend: boolean;
  nama_hari: string;
  holiday_event: HolidayEvent | null;
  message?: string;
}

export type HolidayStatusToday = HolidayStatusResponse;
export type LiburStatus = HolidayStatusResponse;
