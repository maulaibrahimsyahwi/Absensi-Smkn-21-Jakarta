import api from "./api";
import { ApiResponse } from "../types";

/**
 * Layanan API Rekapitulasi & Riwayat Kehadiran Siswa SMKN 21 Jakarta.
 */
export const rekapService = {
  /**
   * Mengambil daftar tahun ajaran yang tersedia di database.
   */
  getAvailableYears: async (): Promise<any> => {
    const res = await api.get("/rekap/available_years");
    return res.data;
  },

  /**
   * Mengambil data statistik agregasi & rekapitulasi siswa per periode (bulan/tahun).
   */
  getSiswaPeriode: async (params: Record<string, unknown>): Promise<any> => {
    const res = await api.get("/rekap/siswa_periode", { params });
    return res.data;
  },

  /**
   * Mengambil data riwayat log presensi harian siswa.
   */
  getHarian: async (params: Record<string, unknown>): Promise<any> => {
    const res = await api.get("/rekap/harian", { params });
    return res.data;
  },

  /**
   * Mengambil data riwayat kunjungan perpustakaan.
   */
  getPerpus: async (params: Record<string, unknown>): Promise<any> => {
    const res = await api.get("/rekap/perpus", { params });
    return res.data;
  },
};

export default rekapService;
