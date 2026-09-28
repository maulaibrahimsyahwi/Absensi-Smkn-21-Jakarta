import api from "./api";

export const liburService = {
  getHariLiburList: async (params = {}) => {
    const res = await api.get("/hari_libur", { params });
    return res.data;
  },

  getStatusToday: async () => {
    const res = await api.get("/hari_libur/status_today");
    return res.data;
  },

  createHariLibur: async (data) => {
    const res = await api.post("/hari_libur", data);
    return res.data;
  },

  updateHariLibur: async (id, data) => {
    const res = await api.put(`/hari_libur/${id}`, data);
    return res.data;
  },

  deleteHariLibur: async (id) => {
    const res = await api.delete(`/hari_libur/${id}`);
    return res.data;
  },

  quickOverrideToday: async (payload) => {
    const res = await api.post("/hari_libur/quick_override_today", payload);
    return res.data;
  },

  syncNational: async (tahun) => {
    const res = await api.post("/hari_libur/sync_national", { tahun });
    return res.data;
  },

  syncAcademic: async (tahun) => {
    const res = await api.post("/hari_libur/sync_academic", { tahun });
    return res.data;
  },

  quickSuratEdaran: async (payload) => {
    const res = await api.post("/hari_libur/quick_se", payload);
    return res.data;
  },

  uploadSuratEdaran: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/hari_libur/upload_surat", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  getDokumenInfo: async (filename) => {
    const res = await api.get(`/hari_libur/dokumen_info/${filename}`);
    return res.data;
  },

  importFile: async (formData) => {
    const res = await api.post("/hari_libur/import_file", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  downloadTemplate: async () => {
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
