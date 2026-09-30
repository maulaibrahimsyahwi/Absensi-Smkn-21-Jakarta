import api from "./api";
import { ApiResponse, IzinPiketItem, PengajuanIzinItem } from "../types";

/**
 * Layanan API Perizinan Siswa SMKN 21 (Online & Meja Guru Piket).
 */
export const izinService = {
  /**
   * Mengambil daftar surat pengajuan izin online dari seluruh siswa.
   */
  getPengajuanList: async (): Promise<any> => {
    const res = await api.get("/pengajuan_izin");
    return res.data;
  },

  /**
   * Mengajukan surat izin baru oleh siswa (dengan berkas lampiran).
   */
  submitPengajuan: async (formData: FormData): Promise<any> => {
    const res = await api.post("/pengajuan_izin", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  /**
   * Verifikasi (Setujui / Tolak) surat izin siswa oleh Guru Piket atau Admin.
   */
  verifikasiPengajuan: async (id: number | string, aksi: 'SETUJUI' | 'TOLAK' | string, catatan = ""): Promise<any> => {
    const res = await api.post(`/pengajuan_izin/${id}/verifikasi`, {
      aksi,
      catatan,
    });
    return res.data;
  },

  /**
   * Mengambil daftar rekaman izin keluar-masuk meja Guru Piket.
   */
  getIzinPiketList: async (params: Record<string, unknown> = {}): Promise<any> => {
    const res = await api.get("/piket/izin", { params });
    return res.data;
  },

  /**
   * Mencatat surat izin keluar-masuk baru di meja Guru Piket.
   */
  submitIzinPiket: async (payload: Record<string, unknown>): Promise<ApiResponse<IzinPiketItem>> => {
    const res = await api.post("/piket/izin", payload);
    return res.data;
  },

  /**
   * Menghapus catatan surat izin meja piket.
   */
  deleteIzinPiket: async (id: number | string): Promise<ApiResponse> => {
    const res = await api.delete(`/piket/izin/${id}`);
    return res.data;
  },
};

export default izinService;
