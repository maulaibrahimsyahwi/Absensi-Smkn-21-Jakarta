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
};
