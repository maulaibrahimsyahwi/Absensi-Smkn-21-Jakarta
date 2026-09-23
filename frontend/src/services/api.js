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
      const url = error.config?.url || "";

      // Abaikan request login, ubah password, dan verifikasi biometrik/presensi dari trigger auto-logout
      const isLoginRequest = url.includes("/auth/login");
      const isPasswordCheckFailure =
        url.includes("/change_password") ||
        url.includes("/auth/signature") ||
        url.includes("/2fa/disable");
      const isVerificationEndpoint =
        url.includes("/verify_harian") ||
        url.includes("/verify_perpus") ||
        url.includes("/detect_liveness") ||
        url.includes("/detect_face");

      // Hanya logout jika error BENAR-BENAR berasal dari masalah token/sesi kedaluwarsa
      const isTokenExpired =
        msg.includes("Sesi login") ||
        msg.includes("Token autentikasi") ||
        msg.includes("Gagal memverifikasi token") ||
        msg.includes("Token tidak valid") ||
        msg.includes("Token kedaluwarsa") ||
        msg.includes("Token expired");

      if (
        isTokenExpired &&
        !isLoginRequest &&
        !isPasswordCheckFailure &&
        !isVerificationEndpoint &&
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
