import api from "./api";

/**
 * Layanan API Manajemen Akun Staf (Guru Piket & Admin) SMKN 21 Jakarta.
 */
export const stafService = {
  /**
   * Mengambil seluruh daftar akun staf.
   */
  getAllStaf: async () => {
    const res = await api.get("/staf");
    return res.data;
  },

  /**
   * Mendaftarkan akun Guru Piket baru oleh Admin.
   */
  createStaf: async (payload) => {
    const res = await api.post("/staf", payload);
    return res.data;
  },

  /**
   * Memperbarui profil akun staf.
   */
  updateStaf: async (id, payload) => {
    const res = await api.put(`/staf/${id}`, payload);
    return res.data;
  },

  /**
   * Menghapus akun staf.
   */
  deleteStaf: async (id) => {
    const res = await api.delete(`/staf/${id}`);
    return res.data;
  },

  /**
   * Mereset kata sandi akun staf ke default.
   */
  resetStafPassword: async (id, newPassword = "") => {
    const res = await api.post(`/staf/${id}/reset_password`, {
      new_password: newPassword,
    });
    return res.data;
  },

  /**
   * Mereset tanda tangan digital staf.
   */
  resetStafSignature: async (id) => {
    const res = await api.post(`/staf/${id}/reset_signature`);
    return res.data;
  },
};

export default stafService;
