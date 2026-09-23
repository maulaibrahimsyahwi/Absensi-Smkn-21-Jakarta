import api from "./api";

/**
 * Layanan API Pengaturan Mode Pembelajaran Jarak Jauh (PJJ) SMKN 21.
 */
export const pjjService = {
  /**
   * Mengambil konfigurasi aktif mode PJJ saat ini.
   */
  getStatus: async () => {
    const res = await api.get("/pjj/status");
    return res.data;
  },

  /**
   * Mengecek apakah siswa tertentu berhak mendapatkan mode PJJ.
   */
  cekSiswa: async (params = {}) => {
    const res = await api.get("/pjj/cek_siswa", { params });
    return res.data;
  },

  /**
   * Menyimpan / memperbarui konfigurasi status PJJ (Admin only).
   */
  saveSettings: async (settings) => {
    const res = await api.post("/pjj/settings", settings);
    return res.data;
  },
};

export default pjjService;
