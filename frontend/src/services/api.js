import axios from "axios";

/**
 * Client HTTP terpusat untuk komunikasi dengan server backend SMKN 21 Jakarta.
 * Menggunakan Axios instance dengan konfigurasi timeout dan Authorization Bearer token.
 */
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  // Saat dibuka lewat Vite dev server (dengan proxy aktif), gunakan path relatif /api
  // Ini otomatis menyelesaikan masalah HTTPS/HTTP Mixed Content dan CORS di HP!
  if (typeof window !== "undefined") {
    return "/api";
  }
  return "http://localhost:5000/api";
};

/**
 * Mengonversi path file relatif server (misal: /static/uploads/surat/...)
 * menjadi URL lengkap yang dapat diakses oleh browser/HP.
 */
export const getFileUrl = (path) => {
  if (!path) return "";
  if (
    path.startsWith("data:") ||
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) {
    return path;
  }
  return path.startsWith("/") ? path : "/" + path;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
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

// Interceptor respons untuk menangani sesi kedaluwarsa & akun dihapus (HTTP 401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const msg = error.response.data?.message || "";
      const errorCode = error.response.data?.error_code || "";
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

      // Deteksi jika akun telah dihapus / dinonaktifkan oleh Administrator di database
      const isAccountDeleted =
        errorCode === "ACCOUNT_DELETED" ||
        errorCode === "ACCOUNT_EXPIRED" ||
        msg.includes("dihapus") ||
        msg.includes("tidak terdaftar") ||
        msg.includes("dinonaktifkan") ||
        msg.includes("Masa aktif akses akun");

      // Deteksi jika token autentikasi kedaluwarsa
      const isTokenExpired =
        errorCode === "TOKEN_EXPIRED" ||
        errorCode === "INVALID_TOKEN" ||
        errorCode === "TOKEN_ERROR" ||
        msg.includes("Sesi login") ||
        msg.includes("Token autentikasi") ||
        msg.includes("Gagal memverifikasi token") ||
        msg.includes("Token tidak valid") ||
        msg.includes("Token kedaluwarsa") ||
        msg.includes("Token expired");

      if (
        (isTokenExpired || isAccountDeleted) &&
        !isLoginRequest &&
        !isPasswordCheckFailure &&
        !isVerificationEndpoint &&
        !window.location.pathname.includes("/login")
      ) {
        localStorage.removeItem("smkn21_auth_token");
        localStorage.removeItem("smkn21_auth_user");

        // Kirim sinyal broadcast ke seluruh tab browser agar logout serentak
        try {
          if (typeof BroadcastChannel !== "undefined") {
            const bc = new BroadcastChannel("smkn21_auth_channel");
            bc.postMessage({
              type: "FORCE_LOGOUT",
              reason: isAccountDeleted ? "deleted" : "expired",
            });
            bc.close();
          }
        } catch (e) {
          // Ignore broadcast error
        }

        const queryReason = isAccountDeleted ? "deleted=1" : "expired=1";
        window.location.href = `/login?${queryReason}`;
      }
    }
    return Promise.reject(error);
  },
);

export default api;
