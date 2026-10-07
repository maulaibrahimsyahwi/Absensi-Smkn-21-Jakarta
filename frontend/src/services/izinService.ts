import api from "./api";
import type { ApiResponse, IzinPiketItem, PengajuanIzinItem } from "../types";

export type AksiVerifikasi = "Disetujui" | "Ditolak" | "SETUJUI" | "TOLAK";

export const IZIN_FILE = {
  maxBytes: 2 * 1024 * 1024,
  types: ["image/jpeg", "image/png", "application/pdf"],
} as const;

/**
 * Validasi tipe file dan ukuran foto bukti surat izin di sisi klien
 */
export function validateIzinFile(f: File): string | null {
  if (!IZIN_FILE.types.includes(f.type as never)) {
    return "Berkas bukti perizinan harus berupa gambar (JPG, PNG) atau PDF.";
  }
  if (f.size > IZIN_FILE.maxBytes) {
    return "Ukuran berkas bukti perizinan maksimal 2 MB.";
  }
  return null;
}

/**
 * Layanan API Perizinan Siswa SMKN 21 (Online & Meja Guru Piket).
 */
export const izinService = {
  /**
   * Mengambil daftar surat pengajuan izin online dari seluruh siswa.
   */
  getPengajuanList: async (
    signal?: AbortSignal,
  ): Promise<PengajuanIzinItem[]> =>
    (await api.get("/pengajuan_izin", { signal })).data,

  /**
   * Mengajukan surat izin baru oleh siswa (dengan berkas lampiran).
   * Diberi batas timeout 60 detik untuk mengakomodasi upload berkas di jaringan seluler.
   */
  submitPengajuan: async (
    payload: FormData | Record<string, unknown>,
  ): Promise<ApiResponse<PengajuanIzinItem>> =>
    (await api.post("/pengajuan_izin", payload, { timeout: 60000 })).data,

  /**
   * Verifikasi (Setujui / Tolak) surat izin siswa oleh Guru Piket atau Admin.
   * Mendukung baik 'Disetujui'/'Ditolak' maupun 'SETUJUI'/'TOLAK'.
   */
  verifikasiPengajuan: async (
    id: number | string,
    aksi: AksiVerifikasi,
    catatan = "",
  ): Promise<ApiResponse<PengajuanIzinItem>> => {
    const normalizedAksi =
      aksi === "SETUJUI" || aksi === "Disetujui" ? "Disetujui" : "Ditolak";
    const res = await api.post(`/pengajuan_izin/${id}/verifikasi`, {
      aksi: normalizedAksi,
      catatan: catatan.trim(),
    });
    return res.data;
  },

  /**
   * Mengambil daftar rekaman izin keluar-masuk meja Guru Piket.
   */
  getIzinPiketList: async (
    params: Record<string, unknown> = {},
    signal?: AbortSignal,
  ): Promise<IzinPiketItem[]> =>
    (await api.get("/piket/izin", { params, signal })).data,

  /**
   * Mencatat surat izin keluar-masuk baru di meja Guru Piket.
   */
  submitIzinPiket: async (
    payload: Record<string, unknown>,
  ): Promise<ApiResponse<IzinPiketItem>> =>
    (await api.post("/piket/izin", payload)).data,

  /**
   * Menghapus catatan surat izin meja piket.
   */
  deleteIzinPiket: async (id: number | string): Promise<ApiResponse> =>
    (await api.delete(`/piket/izin/${id}`)).data,
};

export default izinService;
