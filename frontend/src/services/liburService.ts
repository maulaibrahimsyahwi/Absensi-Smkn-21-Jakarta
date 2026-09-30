import api from "./api";
import { ApiResponse, HolidayEvent, LiburStatus } from "../types";

export const liburService = {
  getHariLiburList: async (params: Record<string, unknown> = {}): Promise<ApiResponse<HolidayEvent[]>> => {
    const res = await api.get("/hari_libur", { params });
    return res.data;
  },

  getStatusToday: async (): Promise<ApiResponse<LiburStatus>> => {
    const res = await api.get("/hari_libur/status_today");
    return res.data;
  },

  createHariLibur: async (data: Record<string, unknown>): Promise<ApiResponse<HolidayEvent>> => {
    const res = await api.post("/hari_libur", data);
    return res.data;
  },

  updateHariLibur: async (id: number | string, data: Record<string, unknown>): Promise<ApiResponse<HolidayEvent>> => {
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
    const res = await api.post("/hari_libur/sync_national", { tahun });
    return res.data;
  },

  syncAcademic: async (tahun: number | string): Promise<ApiResponse> => {
    const res = await api.post("/hari_libur/sync_academic", { tahun });
    return res.data;
  },

  quickSuratEdaran: async (payload: Record<string, unknown>): Promise<ApiResponse> => {
    const res = await api.post("/hari_libur/quick_se", payload);
    return res.data;
  },

  uploadSuratEdaran: async (file: File): Promise<ApiResponse<{ filename: string; url: string }>> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/hari_libur/upload_surat", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  getDokumenInfo: async (filename: string): Promise<ApiResponse> => {
    const res = await api.get(`/hari_libur/dokumen_info/${filename}`);
    return res.data;
  },

  importFile: async (formData: FormData): Promise<ApiResponse> => {
    const res = await api.post("/hari_libur/import_file", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  downloadTemplate: async (): Promise<void> => {
    const res = await api.get("/hari_libur/template_file", {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Template_Impor_Kalender_Libur_SMKN21_${new Date().getFullYear()}.xlsx`,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default liburService;
