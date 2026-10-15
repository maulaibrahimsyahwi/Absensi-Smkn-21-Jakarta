import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import api, { resetAuthInterceptorState } from "../services/api";
import { liburService } from "../services/liburService";
import { User, UserRole, normalizeUser } from "../types";
import {
  stashFirstLoginSecret,
  clearFirstLoginSecret,
} from "../utils/firstLoginSecret";

export interface LoginResult {
  success: boolean;
  message?: string;
  requires_2fa?: boolean;
  role?: string;
  user?: User;
}

export interface ServiceResult {
  success: boolean;
  message?: string;
}

export interface AuthContextType {
  user: User | null;
  role: UserRole | string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isPiket: boolean;
  isSiswa: boolean;
  initializing: boolean;
  login: (
    username: string,
    password: string,
    role?: string,
    totpCode?: string,
    hpField?: string
  ) => Promise<LoginResult>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<ServiceResult>;
  saveSignature: (signatureBase64: string, password?: string) => Promise<ServiceResult>;
  updateFotoProfil: (fotoBase64: string) => Promise<ServiceResult>;
  deleteFotoProfil: () => Promise<ServiceResult>;
  updateUserProfile: (patchData: Partial<User>) => void;
  updateName: (nama: string) => Promise<ServiceResult>;
  loadingAuth: boolean;
  todayStatus: unknown;
  loadingTodayStatus: boolean;
  refreshTodayStatus: () => Promise<unknown>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "smkn21_auth_user";
const TOKEN_KEY = "smkn21_auth_token";
const SESSION_KEYS = [
  STORAGE_KEY,
  TOKEN_KEY,
  "smkn21_piket_signature",
  "smkn21_piket_idle_locked",
  "smkn21_realtime_sync_event",
];

const persistUser = (u: User | null) => {
  try {
    if (!u) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    // Simpan versi profil ringan tanpa foto profil & tanda tangan base64
    const { tanda_tangan, foto_profil, ...slim } = u as any;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch {
    /* Sesi tetap aktif di memori */
  }
};

export interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? normalizeUser(JSON.parse(saved)) : null;
    } catch {
      return null;
    }
  });

  const [initializing, setInitializing] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  });

  const [loadingAuth, setLoadingAuth] = useState<boolean>(false);
  const [todayStatus, setTodayStatus] = useState<unknown>(null);
  const [loadingTodayStatus, setLoadingTodayStatus] = useState<boolean>(true);

  const refreshTodayStatus = useCallback(async () => {
    try {
      const data = await liburService.getStatusToday();
      if (data && data.success) {
        setTodayStatus((prev: unknown) =>
          JSON.stringify(prev) === JSON.stringify(data) ? prev : data,
        );
        return data;
      }
    } catch (err) {
      console.warn("Gagal mengecek status operasional sekolah:", err);
    } finally {
      setLoadingTodayStatus(false);
    }
    return null;
  }, []);

  useEffect(() => {
    refreshTodayStatus();
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refreshTodayStatus();
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [refreshTodayStatus]);

  // Simpan perubahan user ke localStorage dengan proteksi kuota
  useEffect(() => {
    persistUser(user);
  }, [user]);

  // Listener Cross-Tab Synchronizer (BroadcastChannel & Storage Event)
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("smkn21_auth_channel");
        bc.onmessage = (event: MessageEvent) => {
          const evtType = event.data?.type;
          if (evtType === "HOLIDAY_CHANGED" || evtType === "LIBUR_UPDATED") {
            refreshTodayStatus();
          } else if (evtType === "FORCE_LOGOUT") {
            setUser(null);
            if (!window.location.pathname.includes("/login")) {
              const reason =
                event.data?.reason === "deleted" ? "deleted=1" : "expired=1";
              window.location.href = `/login?${reason}`;
            }
          } else if (evtType === "USER_DELETED") {
            const deletedId = event.data?.id;
            const deletedRole = event.data?.role;
            if (
              user &&
              String(user.id) === String(deletedId) &&
              (!deletedRole || user.role === deletedRole)
            ) {
              logout();
              if (!window.location.pathname.includes("/login")) {
                window.location.href = "/login?deleted=1";
              }
            }
          } else if (evtType === "BULK_USERS_DELETED") {
            const deletedIds = event.data?.ids || [];
            const deletedRole = event.data?.role;
            if (
              user &&
              deletedIds.some((id: unknown) => String(id) === String(user.id)) &&
              (!deletedRole || user.role === deletedRole)
            ) {
              logout();
              if (!window.location.pathname.includes("/login")) {
                window.location.href = "/login?deleted=1";
              }
            }
          }
        };
      }
    } catch (_e) {
      // Ignore broadcast channel error
    }

    // Ikuti perubahan akun di tab lain, bukan hanya logout
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      if (!e.newValue) {
        setUser(null);
        return;
      }
      try {
        const next = JSON.parse(e.newValue);
        const norm = normalizeUser(next);
        setUser((prev) =>
          prev && String(prev.id) === String(norm.id) && prev.role === norm.role
            ? prev
            : norm,
        );
      } catch {
        /* abaikan */
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      if (bc) bc.close();
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [refreshTodayStatus, user]);

  // Active Session Heartbeat: Pemeriksaan pertama selalu jalan, berikutnya santai 60s
  useEffect(() => {
    if (!user) {
      setInitializing(false);
      return;
    }

    let isMounted = true;
    const MERGE_FIELDS = [
      "nama",
      "kelas",
      "status",
      "role",
      "foto_profil",
      "terdaftar",
      "has_signature",
      "tanda_tangan",
      "two_factor_enabled",
      "must_change_password",
    ] as const;

    const verifySession = async (force = false) => {
      if (!force && document.visibilityState !== "visible") return;
      try {
        const res = await api.get("/auth/verify_session");
        if (res.data?.success && res.data.user && isMounted) {
          const norm = normalizeUser(res.data.user);
          setUser((prev) => {
            if (!prev) return null;
            const effectiveNorm = { ...norm };
            if (!effectiveNorm.tanda_tangan && prev.tanda_tangan) {
              effectiveNorm.tanda_tangan = prev.tanda_tangan;
            }
            const changed = MERGE_FIELDS.some(
              (k) => (prev as any)[k] !== (effectiveNorm as any)[k] && (effectiveNorm as any)[k] !== undefined,
            );
            return changed ? { ...prev, ...effectiveNorm } : prev;
          });
        }
      } catch {
        /* 401 ditangani oleh interceptor api.ts */
      } finally {
        if (isMounted) setInitializing(false);
      }
    };

    verifySession(true);
    const intervalId = setInterval(() => verifySession(), 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") verifySession();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [user?.id]);

  /**
   * Login pengguna (Admin, Guru Piket, atau Siswa)
   */
  const login = async (
    username: string,
    password: string,
    role = "",
    totpCode = "",
    hpField = "",
  ): Promise<LoginResult> => {
    setLoadingAuth(true);
    try {
      const res = await api.post("/auth/login", {
        username,
        password,
        role,
        totp_code: totpCode,
        hp_field: hpField,
      });

      if (res.data && res.data.success) {
        resetAuthInterceptorState();
        if (res.data.token) {
          localStorage.setItem(TOKEN_KEY, res.data.token);
        }
        const normalized = normalizeUser(res.data.user);
        if (res.data.must_change_password || normalized.must_change_password) {
          stashFirstLoginSecret(password);
        } else {
          clearFirstLoginSecret();
        }
        setUser(normalized);
        return {
          success: true,
          message: res.data.message,
          user: normalized,
        };
      } else if (res.data?.requires_2fa) {
        return {
          success: false,
          requires_2fa: true,
          role: res.data.role,
          message:
            res.data.message || "Autentikasi Dua Faktor (2FA) diperlukan.",
        };
      } else {
        return { success: false, message: res.data?.message || "Login gagal." };
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { requires_2fa?: boolean; message?: string } } };
      if (axiosErr.response?.data?.requires_2fa) {
        return {
          success: false,
          requires_2fa: true,
          message: axiosErr.response.data.message || "Kode 2FA salah.",
        };
      }
      const msg =
        axiosErr.response?.data?.message || "Terjadi kesalahan saat login.";
      return { success: false, message: msg };
    } finally {
      setLoadingAuth(false);
    }
  };

  /**
   * Logout pengguna: bersihkan semua jejak sesi dan cabut token di server
   */
  const logout = useCallback(() => {
    resetAuthInterceptorState();
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      api
        .post("/auth/logout", null, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => {});
    }
    clearFirstLoginSecret();
    SESSION_KEYS.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        /* abaikan */
      }
    });
    setUser(null);
    setInitializing(false);
  }, []);

  /**
   * Simpan atau perbarui tanda tangan digital pengguna aktif
   */
  const saveSignature = useCallback(
    async (signatureBase64: string, password = ""): Promise<ServiceResult> => {
      if (!user) return { success: false, message: "Pengguna belum login." };
      try {
        const payload: Record<string, unknown> = {
          role: user.role,
          id: user.id,
          signature: signatureBase64,
        };
        if (password) {
          payload.password = password;
        }
        const res = await api.post("/auth/signature", payload);

        if (res.data && res.data.success) {
          setUser((prev) =>
            prev
              ? {
                  ...prev,
                  tanda_tangan: signatureBase64,
                  has_signature: true,
                }
              : prev,
          );
          return { success: true, message: res.data.message };
        }
        return {
          success: false,
          message: res.data?.message || "Gagal menyimpan tanda tangan.",
        };
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        const msg =
          axiosErr.response?.data?.message ||
          "Gagal menyimpan tanda tangan digital.";
        return { success: false, message: msg };
      }
    },
    [user?.id, user?.role],
  );

  /**
   * Mengubah kata sandi mandiri pengguna aktif
   */
  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string): Promise<ServiceResult> => {
      try {
        const res = await api.post("/auth/change_password", {
          old_password: oldPassword.trim(),
          new_password: newPassword.trim(),
        });
        if (res.data && res.data.success) {
          if (res.data.token) {
            localStorage.setItem(TOKEN_KEY, res.data.token);
          }
          clearFirstLoginSecret();
          setUser((prev) =>
            prev ? { ...prev, must_change_password: false } : prev
          );
          return { success: true, message: res.data.message };
        }
        return {
          success: false,
          message: res.data?.message || "Gagal mengubah kata sandi.",
        };
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        const msg =
          axiosErr.response?.data?.message ||
          "Gagal mengubah kata sandi. Pastikan kata sandi saat ini benar.";
        return { success: false, message: msg };
      }
    },
    [],
  );

  // Tangkap event saat server menolak request dengan status 403 PASSWORD_CHANGE_REQUIRED
  useEffect(() => {
    const handlePwRequired = () => {
      setUser((prev) => (prev ? { ...prev, must_change_password: true } : prev));
    };
    window.addEventListener("smkn21_password_required", handlePwRequired);
    return () => {
      window.removeEventListener("smkn21_password_required", handlePwRequired);
    };
  }, []);

  /**
   * Simpan atau perbarui foto profil pengguna aktif
   */
  const updateFotoProfil = useCallback(
    async (fotoBase64: string): Promise<ServiceResult> => {
      if (!user) return { success: false, message: "Pengguna belum login." };
      try {
        const payload = {
          role: user.role,
          id: user.id,
          foto_profil: fotoBase64,
        };
        const res = await api.post("/auth/foto_profil", payload);
        if (res.data && res.data.success) {
          setUser((prev) =>
            prev ? { ...prev, foto_profil: fotoBase64 } : prev,
          );
          return { success: true, message: res.data.message };
        }
        return {
          success: false,
          message: res.data?.message || "Gagal mengunggah foto profil.",
        };
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        const msg =
          axiosErr.response?.data?.message || "Gagal mengunggah foto profil.";
        return { success: false, message: msg };
      }
    },
    [user?.id, user?.role],
  );

  /**
   * Hapus foto profil pengguna aktif dan kembalikan ke avatar default
   */
  const deleteFotoProfil = useCallback(async (): Promise<ServiceResult> => {
    if (!user) return { success: false, message: "Pengguna belum login." };
    try {
      const res = await api.delete("/auth/foto_profil", {
        data: { role: user.role, id: user.id },
      });
      if (res.data && res.data.success) {
        setUser((prev) => (prev ? { ...prev, foto_profil: null } : prev));
        return { success: true, message: res.data.message };
      }
      return {
        success: false,
        message: res.data?.message || "Gagal menghapus foto profil.",
      };
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg =
        axiosErr.response?.data?.message || "Gagal menghapus foto profil.";
      return { success: false, message: msg };
    }
  }, [user?.id, user?.role]);

  /**
   * Perbarui nama lengkap pengguna aktif di server dan local state
   */
  const updateName = useCallback(
    async (nama: string): Promise<ServiceResult> => {
      if (!user) return { success: false, message: "Pengguna belum login." };
      try {
        const res = await api.put("/auth/profile", { nama });
        if (res.data && res.data.success) {
          setUser((prev) => (prev ? { ...prev, nama } : prev));
          return { success: true, message: res.data.message };
        }
        return {
          success: false,
          message: res.data?.message || "Gagal memperbarui nama lengkap.",
        };
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        const msg =
          axiosErr.response?.data?.message || "Gagal memperbarui nama lengkap.";
        return { success: false, message: msg };
      }
    },
    [user?.id],
  );

  /**
   * Refresh profil pengguna (misal status wajah terdaftar)
   */
  const updateUserProfile = useCallback((patchData: Partial<User>) => {
    setUser((prev) =>
      prev
        ? normalizeUser({ ...prev, ...patchData } as Record<string, unknown>)
        : prev,
    );
  }, []);

  const value = React.useMemo<AuthContextType>(
    () => ({
      user,
      role: user ? user.role : null,
      isAuthenticated: !!user,
      isAdmin: user?.role === "admin",
      isPiket: user?.role === "piket",
      isSiswa: user?.role === "siswa",
      initializing,
      login,
      logout,
      changePassword,
      saveSignature,
      updateFotoProfil,
      deleteFotoProfil,
      updateUserProfile,
      updateName,
      loadingAuth,
      todayStatus,
      loadingTodayStatus,
      refreshTodayStatus,
    }),
    [
      user,
      initializing,
      login,
      logout,
      changePassword,
      saveSignature,
      updateFotoProfil,
      deleteFotoProfil,
      updateUserProfile,
      updateName,
      loadingAuth,
      todayStatus,
      loadingTodayStatus,
      refreshTodayStatus,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
