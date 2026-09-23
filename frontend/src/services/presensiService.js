import api from "./api";

/**
 * Layanan API Presensi Harian & Perpustakaan Siswa SMKN 21 Jakarta.
 */
export const presensiService = {
  /**
   * Mengambil status presensi siswa hari ini beserta jam operasional dan info PJJ.
   */
  getStatusToday: async () => {
    const res = await api.get("/presensi/status_today");
    return res.data;
  },

  /**
   * Mengirim verifikasi presensi harian dengan sampel biometrik dan koordinat GPS.
   */
  verifyHarian: async (payload) => {
    const res = await api.post("/verify_harian", payload);
    return res.data;
  },

  /**
   * Mengirim verifikasi presensi perpustakaan.
   */
  verifyPerpus: async (payload) => {
    const res = await api.post("/verify_perpus", payload);
    return res.data;
  },

  /**
   * Mengambil koordinat dan radius geofence sekolah resmi.
   */
  getLokasiSekolah: async () => {
    const res = await api.get("/sekolah/lokasi");
    return res.data;
  },
};

export default presensiService;
