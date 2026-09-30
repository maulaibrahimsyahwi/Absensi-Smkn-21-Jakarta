export interface HolidayEvent {
  id?: number | string;
  tanggal: string;
  nama: string;
  keterangan?: string;
  is_cuti_bersama?: boolean;
  is_weekend?: boolean;
  kategori?: string;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  lampiran_surat?: string;
  nama_file_surat?: string;
  total_pages?: number | string;
  [key: string]: unknown;
}

export type LiburEvent = HolidayEvent;

export interface LiburStatus {
  is_libur: boolean;
  tipe?: string;
  keterangan?: string;
  data?: HolidayEvent;
}

export interface HolidayStatusResponse {
  success?: boolean;
  is_school_day?: boolean;
  is_weekend?: boolean;
  message?: string;
  nama_hari?: string;
  holiday_event?: {
    id?: number | string;
    nama?: string;
    kategori?: string;
    keterangan?: string;
    tanggal_mulai?: string;
    tanggal_selesai?: string;
    lampiran_surat?: string;
    nama_file_surat?: string;
    total_pages?: number | string;
    [key: string]: any;
  } | null;
  [key: string]: any;
}

export type HolidayStatusToday = HolidayStatusResponse;
