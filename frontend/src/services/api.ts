import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

/**
 * Client HTTP terpusat untuk komunikasi dengan server backend SMKN 21 Jakarta.
 * Menggunakan Axios instance dengan konfigurasi timeout dan Authorization Bearer token.
 */
const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl && !envUrl.includes("devtunnels.ms") && !envUrl.includes("ngrok")) {
    return envUrl;
  }
  // Saat dibuka lewat Vite dev server (dengan proxy aktif), gunakan path relatif /api
  // Ini otomatis menyelesaikan masalah HTTPS/HTTP Mixed Content dan CORS di HP & PC!
  if (typeof window !== "undefined") {
    return "/api";
  }
  return "http://localhost:5000/api";
};

/**
 * Mengonversi path file relatif server (misal: /static/uploads/surat/...)
 * menjadi URL lengkap yang dapat diakses oleh browser/HP.
 */
export const getFileUrl = (path?: string | null): string => {
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

const api: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
});

// Otomatis sertakan token JWT kriptografis pada setiap request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  try {
    const token = localStorage.getItem("smkn21_auth_token");
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
  } catch (_e) {
    // Ignore localStorage error
  }
  return config;
});

const AUTH_CODES = new Set([
  "TOKEN_EXPIRED",
  "INVALID_TOKEN",
  "TOKEN_ERROR",
  "ACCOUNT_DELETED",
  "ACCOUNT_EXPIRED",
]);

const LEGACY_AUTH_MSG =
  /sesi login|token autentikasi|token tidak valid|token kedaluwarsa|token expired|gagal memverifikasi token|dihapus|tidak terdaftar|dinonaktifkan|masa aktif akses akun/i;

const SESSION_KEYS = [
  "smkn21_auth_token",
  "smkn21_auth_user",
  "smkn21_kiosk_device_id",
];

let isRedirecting = false;
let conflictShown = false;

export const resetAuthInterceptorState = (): void => {
  isRedirecting = false;
  conflictShown = false;
};

// Interceptor respons untuk menangani sesi kedaluwarsa & akun dihapus (HTTP 401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 403) {
      const errorCode: string = error.response.data?.error_code || "";
      if (errorCode === "PASSWORD_CHANGE_REQUIRED") {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("smkn21_password_required"));
        }
      }
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401) {
      if (isRedirecting) {
        return Promise.reject(error);
      }

      const msg: string = error.response.data?.message || "";
      const errorCode: string = error.response.data?.error_code || "";
      const url: string = error.config?.url || "";

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

      if (
        isLoginRequest ||
        isPasswordCheckFailure ||
        isVerificationEndpoint ||
        (typeof window !== "undefined" && window.location.pathname.includes("/login"))
      ) {
        return Promise.reject(error);
      }

      // Deteksi konflik multi-perangkat (Akun login di perangkat lain)
      const isConflict =
        errorCode === "SESSION_TERMINATED" ||
        /perangkat lain|sesi ini telah diakhiri/i.test(msg);

      if (isConflict && !isLoginRequest) {
        // Hapus token sesi dari localStorage agar background sync & realtime tidak terus membombardir server
        SESSION_KEYS.forEach((key) => {
          try {
            localStorage.removeItem(key);
          } catch (_e) {
            // Ignore error
          }
        });

        if (!conflictShown) {
          conflictShown = true;
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("smkn21_session_conflict", {
                detail: {
                  errorCode: "SESSION_TERMINATED",
                  message:
                    msg ||
                    "Akun Anda telah login di perangkat lain. Sesi pada perangkat ini telah diakhiri demi keamanan data Anda.",
                },
              }),
            );
          }
        }
        return Promise.reject(error);
      }

      // Deteksi jika akun telah dihapus / dinonaktifkan oleh Administrator di database
      const isAccountDeleted =
        errorCode === "ACCOUNT_DELETED" ||
        errorCode === "ACCOUNT_EXPIRED" ||
        /dihapus|tidak terdaftar|dinonaktifkan|masa aktif akses akun/i.test(msg);

      // Deteksi jika token autentikasi kedaluwarsa
      const isTokenExpired =
        AUTH_CODES.has(errorCode) ||
        LEGACY_AUTH_MSG.test(msg);

      if (isTokenExpired || isAccountDeleted) {
        isRedirecting = true;

        SESSION_KEYS.forEach((key) => {
          try {
            localStorage.removeItem(key);
          } catch (_e) {
            // Ignore error
          }
        });

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
        } catch (_e) {
          // Ignore broadcast error
        }

        const queryReason = isAccountDeleted ? "deleted=1" : "expired=1";
        if (typeof window !== "undefined") {
          window.location.href = `/login?${queryReason}`;
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
