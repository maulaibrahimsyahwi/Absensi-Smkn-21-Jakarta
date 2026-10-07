import api from "./api";
import { ApiResponse, HolidayEvent, HolidayStatusResponse } from "../types";
import { downloadBlob } from "../utils/download";
import { nowYearWib } from "../utils/date";

export interface HolidayPayload {
  nama: string;
  tanggal_mulai: string;
  tanggal_selesai?: string;
  tipe_hari: "libur" | "masuk_khusus";
  kategori?: string;
  keterangan?: string;
  is_active?: boolean;
  surat_edaran_url?: string | null;
  [key: string]: unknown;
}

export const SURAT_EDARAN_CONFIG = {
  maxBytes: 5 * 1024 * 1024,
  types: ["application/pdf"],
} as const;

export function validateSuratEdaranFile(file: File): string | null {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return "Surat edaran wajib berformat PDF.";
  }
  if (file.size > SURAT_EDARAN_CONFIG.maxBytes) {
    return "Ukuran berkas surat edaran maksimal 5 MB.";
  }
  return null;
}

export const liburService = {
  getHariLiburList: async (
    params: Record<string, unknown> = {},
    signal?: AbortSignal,
  ): Promise<HolidayEvent[]> => {
    const res = await api.get("/hari_libur", { params, signal });
    return res.data;
  },

  getStatusToday: async (signal?: AbortSignal): Promise<HolidayStatusResponse> => {
    const res = await api.get("/hari_libur/status_today", { signal });
    return res.data;
  },

  createHariLibur: async (data: HolidayPayload): Promise<ApiResponse<HolidayEvent>> => {
    const res = await api.post("/hari_libur", data);
    return res.data;
  },

  updateHariLibur: async (
    id: number | string,
    data: Partial<HolidayPayload>,
  ): Promise<ApiResponse<HolidayEvent>> => {
    const res = await api.put(`/hari_libur/${id}`, data);
    return res.data;
  },

  deleteHariLibur: async (id: number | string): Promise<ApiResponse> => {
    const res = await api.delete(`/hari_libur/${id}`);
    return res.data;
  },

  quickOverrideToday: async (payload: Record<string, unknown>): Promise<ApiResponse> => {
    const res = await api.post("/hari_libur/quick_override_today", payload);
    return res.data;
  },

  syncNational: async (tahun: number | string): Promise<ApiResponse> => {
    const res = await api.post(
      "/hari_libur/sync_national",
      { tahun },
      { timeout: 60000 },
    );
    return res.data;
  },

  syncAcademic: async (tahun: number | string): Promise<ApiResponse> => {
    const res = await api.post(
      "/hari_libur/sync_academic",
      { tahun },
      { timeout: 60000 },
    );
    return res.data;
  },

  quickSuratEdaran: async (payload: Record<string, unknown>): Promise<ApiResponse> => {
    const res = await api.post("/hari_libur/quick_se", payload);
    return res.data;
  },

  uploadSuratEdaran: async (
    file: File,
  ): Promise<ApiResponse<{ filename: string; url: string }>> => {
    const errorMsg = validateSuratEdaranFile(file);
    if (errorMsg) {
      throw new Error(errorMsg);
    }
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/hari_libur/upload_surat", formData, {
      timeout: 60000,
    });
    return res.data;
  },

  getDokumenInfo: async (filename: string): Promise<ApiResponse> => {
    const safeFilename = encodeURIComponent(filename);
    const res = await api.get(`/hari_libur/dokumen_info/${safeFilename}`);
    return res.data;
  },

  importFile: async (formData: FormData): Promise<ApiResponse> => {
    const res = await api.post("/hari_libur/import_file", formData, {
      timeout: 60000,
    });
    return res.data;
  },

  downloadTemplate: async (tahun?: number | string): Promise<void> => {
    try {
      const res = await api.get("/hari_libur/template_file", {
        responseType: "blob",
      });
      const t = tahun || nowYearWib();
      downloadBlob(
        new Blob([res.data]),
        `Template_Impor_Kalender_Libur_SMKN21_${t}.xlsx`,
      );
    } catch (err: any) {
      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const json = JSON.parse(text);
          throw new Error(json.message || "Gagal mengunduh template.");
        } catch {
          throw new Error(text || "Gagal mengunduh template.");
        }
      }
      throw err;
    }
  },
};

export default liburService;
