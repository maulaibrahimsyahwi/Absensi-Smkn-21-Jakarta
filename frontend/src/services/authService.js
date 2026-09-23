import api from "./api";

/**
 * Layanan API Autentikasi Pengguna & Siswa SMKN 21 Jakarta.
 */
export const authService = {
  /**
   * Login pengguna (Admin, Guru Piket, atau Siswa).
   */
  login: async (credentials) => {
    const res = await api.post("/auth/login", credentials);
    return res.data;
  },

  /**
   * Verifikasi validitas sesi & integritas token JWT saat ini.
   */
  verifySession: async () => {
    const res = await api.get("/auth/verify_session");
    return res.data;
  },

  /**
   * Mengubah kata sandi akun aktif.
   */
  changePassword: async (oldPassword, newPassword) => {
    const res = await api.post("/auth/change_password", {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return res.data;
  },

  /**
   * Menyimpan tanda tangan digital Base64 PNG akun.
   */
  saveSignature: async (dataUrl) => {
    const res = await api.post("/auth/signature", {
      tanda_tangan: dataUrl,
    });
    return res.data;
  },

  /**
   * Memperbarui profil akun aktif (nama lengkap, dsb).
   */
  updateProfile: async (data) => {
    const res = await api.put("/auth/profile", data);
    return res.data;
  },

  /**
   * Mengunggah foto profil avatar baru.
   */
  saveFotoProfil: async (fotoData) => {
    const res = await api.post("/auth/foto_profil", { foto: fotoData });
    return res.data;
  },

  /**
   * Menghapus foto profil avatar akun.
   */
  deleteFotoProfil: async () => {
    const res = await api.delete("/auth/foto_profil");
    return res.data;
  },

  /**
   * Menyiapkan kunci TOTP 2FA.
   */
  setup2FA: async (payload) => {
    const res = await api.post("/auth/2fa/setup", payload);
    return res.data;
  },

  /**
   * Mengonfirmasi aktivasi 2FA dengan kode TOTP 6 digit.
   */
  verifyEnable2FA: async (payload) => {
    const res = await api.post("/auth/2fa/verify_enable", payload);
    return res.data;
  },

  /**
   * Menonaktifkan 2FA dengan konfirmasi password.
   */
  disable2FA: async (payload) => {
    const res = await api.post("/auth/2fa/disable", payload);
    return res.data;
  },
};

export default authService;
