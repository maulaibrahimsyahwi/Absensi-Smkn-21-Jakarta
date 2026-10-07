import api from "./api";
import { ApiResponse, AbsensiRecord } from "../types";

export interface LokasiSekolahData {
  latitude: number;
  longitude: number;
  radius: number;
  radius_meter?: number;
  polygon?: Array<[number, number]>;
  name?: string;
  alamat?: string;
}

export interface SyncOfflineResultItem {
  id: string;
  status: "synced" | "duplicate" | "rejected" | "error";
  siswa_id?: number;
  nama?: string;
  status_kehadiran?: string;
  message?: string;
  reason?: string;
}

export type SyncOfflineResponse = ApiResponse & {
  synced?: number;
  duplicates?: number;
  failed?: number;
  results?: SyncOfflineResultItem[];
};

/**
 * Layanan API Presensi Harian & Perpustakaan Siswa SMKN 21 Jakarta.
 */
export const presensiService = {
  /**
   * Mengambil status presensi siswa hari ini beserta jam operasional dan info PJJ.
   */
  getStatusToday: async (): Promise<ApiResponse> => {
    const res = await api.get("/presensi/status_today");
    return res.data;
  },

  /**
   * Mengirim verifikasi presensi harian dengan sampel biometrik dan koordinat GPS.
   * Dibatasi timeout 12 detik agar tidak membekukan antrean siswa di kiosk atau HP.
   */
  verifyHarian: async (
    payload: Record<string, unknown>,
  ): Promise<ApiResponse<{ absensi: AbsensiRecord }>> => {
    const res = await api.post("/verify_harian", payload, { timeout: 12000 });
    return res.data;
  },

  /**
   * Mengirim verifikasi presensi perpustakaan.
   */
  verifyPerpus: async (
    payload: Record<string, unknown>,
  ): Promise<ApiResponse> => {
    const res = await api.post("/verify_perpus", payload, { timeout: 12000 });
    return res.data;
  },

  /**
   * Mengambil koordinat dan radius geofence sekolah resmi.
   */
  getLokasiSekolah: async (): Promise<ApiResponse<LokasiSekolahData>> => {
    const res = await api.get("/sekolah/lokasi");
    return res.data;
  },

  /**
   * Sinkronisasi massal antrean presensi darurat offline dari Kiosk/HP ke server.
   */
  syncOffline: async (records: unknown[]): Promise<SyncOfflineResponse> => {
    const res = await api.post(
      "/presensi/sync_offline",
      { records },
      { timeout: 60000 },
    );
    return res.data;
  },
};

export default presensiService;
