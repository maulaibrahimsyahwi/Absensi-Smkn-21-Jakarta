import api from "./api";

/**
 * Layanan API Buku Saku Kedisiplinan & Catatan Pelanggaran Siswa SMKN 21.
 */
export const pelanggaranService = {
  /**
   * Mengambil riwayat catatan pelanggaran (bisa difilter tanggal/siswa/kelas).
   */
  getPelanggaranList: async (params = {}) => {
    const res = await api.get("/pelanggaran", { params });
    return res.data;
  },

  /**
   * Mencatat data pelanggaran tata tertib baru.
   */
  catatPelanggaran: async (payload) => {
    const res = await api.post("/pelanggaran", payload);
    return res.data;
  },

  /**
   * Menghapus rekaman catatan pelanggaran siswa.
   */
  deletePelanggaran: async (id) => {
    const res = await api.delete(`/pelanggaran/${id}`);
    return res.data;
  },

  /**
   * Mengambil daftar peringkat akumulasi poin pelanggaran per siswa.
   */
  getAkumulasiPoin: async (params = {}) => {
    const res = await api.get("/pelanggaran/akumulasi", { params });
    return res.data;
  },
};

export default pelanggaranService;
