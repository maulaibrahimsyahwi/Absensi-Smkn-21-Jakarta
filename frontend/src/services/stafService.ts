import api from "./api";
import { ApiResponse, User } from "../types";

/**
 * Layanan API Manajemen Akun Staf (Guru Piket & Admin) SMKN 21 Jakarta.
 */
export const stafService = {
  /**
   * Mengambil seluruh daftar akun staf.
   */
  getAllStaf: async (): Promise<ApiResponse<User[]>> => {
    const res = await api.get("/staf");
    return res.data;
  },

  /**
   * Mendaftarkan akun Guru Piket baru oleh Admin.
   */
  createStaf: async (payload: Record<string, unknown>): Promise<ApiResponse<User>> => {
    const res = await api.post("/staf", payload);
    return res.data;
  },

  /**
   * Memperbarui profil akun staf.
   */
  updateStaf: async (id: number | string, payload: Record<string, unknown>): Promise<ApiResponse<User>> => {
    const res = await api.put(`/staf/${id}`, payload);
    return res.data;
  },

  /**
   * Menghapus akun staf.
   */
  deleteStaf: async (id: number | string): Promise<ApiResponse> => {
    const res = await api.delete(`/staf/${id}`);
    return res.data;
  },

  /**
   * Mereset kata sandi akun staf ke default.
   */
  resetStafPassword: async (id: number | string, newPassword = ""): Promise<ApiResponse> => {
    const res = await api.post(`/staf/${id}/reset_password`, {
      new_password: newPassword,
    });
    return res.data;
  },

  /**
   * Mereset tanda tangan digital staf.
   */
  resetStafSignature: async (id: number | string): Promise<ApiResponse> => {
    const res = await api.post(`/staf/${id}/reset_signature`);
    return res.data;
  },
};

export default stafService;
