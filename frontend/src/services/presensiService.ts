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
   */
  verifyHarian: async (payload: Record<string, unknown>): Promise<ApiResponse<{ absensi: AbsensiRecord }>> => {
    const res = await api.post("/verify_harian", payload);
    return res.data;
  },

  /**
   * Mengirim verifikasi presensi perpustakaan.
   */
  verifyPerpus: async (payload: Record<string, unknown>): Promise<ApiResponse> => {
    const res = await api.post("/verify_perpus", payload);
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
   * Sinkronisasi massal antrean presensi darurat offline dari Kiosk ke server.
   */
  syncOffline: async (records: unknown[]): Promise<ApiResponse> => {
    const res = await api.post("/presensi/sync_offline", { records });
    return res.data;
  },
};

export default presensiService;
