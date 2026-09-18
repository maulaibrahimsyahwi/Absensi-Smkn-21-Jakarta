import axios from "axios";

/**
 * Client HTTP terpusat untuk komunikasi dengan server backend SMKN 21 Jakarta.
 * Menggunakan Axios instance dengan konfigurasi timeout dan base URL dinamis.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 30000,
});

// Otomatis sertakan header identitas pengguna jika sudah login
api.interceptors.request.use((config) => {
  try {
    const saved = localStorage.getItem("smkn21_auth_user");
    if (saved) {
      const user = JSON.parse(saved);
      if (user) {
        config.headers["X-User-Role"] = user.role;
        config.headers["X-User-Id"] = user.id;
      }
    }
  } catch (e) {
    // Ignore JSON parse error
  }
  return config;
});

export default api;
