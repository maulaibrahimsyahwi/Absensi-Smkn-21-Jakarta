import axios from "axios";

/**
 * Client HTTP terpusat untuk komunikasi dengan server backend SMKN 21 Jakarta.
 * Menggunakan Axios instance dengan konfigurasi timeout dan Authorization Bearer token.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 30000,
});

// Otomatis sertakan token JWT kriptografis pada setiap request
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("smkn21_auth_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  } catch (e) {
    // Ignore localStorage error
  }
  return config;
});

// Interceptor respons untuk menangani sesi kedaluwarsa (HTTP 401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const msg = error.response.data?.message || "";
      const isLoginRequest = error.config?.url?.includes("/auth/login");
      const isPasswordCheckFailure =
        error.config?.url?.includes("/change_password") ||
        error.config?.url?.includes("/auth/signature") ||
        error.config?.url?.includes("/2fa/disable");

      // Hanya logout jika error berasal dari masalah token/sesi, bukan kegagalan verifikasi password lokal
      const isTokenExpired =
        msg.includes("Sesi login") ||
        msg.includes("Token autentikasi") ||
        msg.includes("Gagal memverifikasi token");

      if (
        (isTokenExpired || (!isPasswordCheckFailure && !isLoginRequest)) &&
        !isLoginRequest &&
        !isPasswordCheckFailure &&
        !window.location.pathname.includes("/login")
      ) {
        localStorage.removeItem("smkn21_auth_token");
        localStorage.removeItem("smkn21_auth_user");
        window.location.href = "/login?expired=1";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
