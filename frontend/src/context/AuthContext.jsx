import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

const STORAGE_KEY = "smkn21_auth_user";
const TOKEN_KEY = "smkn21_auth_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loadingAuth, setLoadingAuth] = useState(false);

  // Simpan perubahan user ke localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [user]);

  // Listener Cross-Tab Synchronizer (BroadcastChannel & Storage Event)
  useEffect(() => {
    let bc = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("smkn21_auth_channel");
        bc.onmessage = (event) => {
          const evtType = event.data?.type;
          if (evtType === "FORCE_LOGOUT") {
            setUser(null);
            if (!window.location.pathname.includes("/login")) {
              const reason =
                event.data?.reason === "deleted" ? "deleted=1" : "expired=1";
              window.location.href = `/login?${reason}`;
            }
          } else if (evtType === "USER_DELETED") {
            // Jika ID pengguna aktif sama dengan yang dihapus admin
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
              deletedIds.some((id) => String(id) === String(user.id)) &&
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
    } catch (e) {
      // Ignore broadcast channel error
    }

    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY && !e.newValue) {
        setUser(null);
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      if (bc) bc.close();
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Active Session Heartbeat: Memvalidasi eksistensi akun di DB setiap 8 detik
  useEffect(() => {
    if (!user) return;

    const verifySession = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await api.get("/auth/verify_session");
        if (res.data?.success && res.data.user) {
          const remoteUser = res.data.user;
          // Sinkronisasi data jika ada perubahan data akun dari sisi Admin
          setUser((prev) => {
            if (!prev) return null;
            if (
              prev.nama !== remoteUser.nama ||
              prev.kelas !== remoteUser.kelas ||
              prev.status !== remoteUser.status ||
              prev.foto_profil !== remoteUser.foto_profil
            ) {
              return { ...prev, ...remoteUser };
            }
            return prev;
          });
        }
      } catch (err) {
        // Jika 401 ACCOUNT_DELETED, sudah otomatis ditangani oleh interceptor api.js
      }
    };

    // Jalankan pemeriksaan awal saat komponen aktif
    verifySession();

    const intervalId = setInterval(verifySession, 8000);
    return () => clearInterval(intervalId);
  }, [user?.id]);

  /**
   * Login pengguna (Admin, Guru Piket, atau Siswa)
   */
  const login = async (
    username,
    password,
    role = "",
    totpCode = "",
    hpField = "",
  ) => {
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
        if (res.data.token) {
          localStorage.setItem(TOKEN_KEY, res.data.token);
        }
        setUser(res.data.user);
        return {
          success: true,
          message: res.data.message,
          user: res.data.user,
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
    } catch (err) {
      if (err.response?.data?.requires_2fa) {
        return {
          success: false,
          requires_2fa: true,
          message: err.response.data.message || "Kode 2FA salah.",
        };
      }
      const msg =
        err.response?.data?.message || "Terjadi kesalahan saat login.";
      return { success: false, message: msg };
    } finally {
      setLoadingAuth(false);
    }
  };

  /**
   * Logout pengguna
   */
  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  };

  /**
   * Simpan atau perbarui tanda tangan digital pengguna aktif
   */
  const saveSignature = async (signatureBase64, password = "") => {
    if (!user) return { success: false, message: "Pengguna belum login." };
    try {
      const payload = {
        role: user.role,
        id: user.id,
        signature: signatureBase64,
      };
      if (password) {
        payload.password = password;
      }
      const res = await api.post("/auth/signature", payload);

      if (res.data && res.data.success) {
        const updated = { ...user, tanda_tangan: signatureBase64 };
        setUser(updated);
        return { success: true, message: res.data.message };
      }
      return {
        success: false,
        message: res.data?.message || "Gagal menyimpan tanda tangan.",
      };
    } catch (err) {
      const msg =
        err.response?.data?.message || "Gagal menyimpan tanda tangan digital.";
      return { success: false, message: msg };
    }
  };

  /**
   * Simpan atau perbarui foto profil pengguna aktif
   */
  const updateFotoProfil = async (fotoBase64) => {
    if (!user) return { success: false, message: "Pengguna belum login." };
    try {
      const payload = {
        role: user.role,
        id: user.id,
        foto_profil: fotoBase64,
      };
      const res = await api.post("/auth/foto_profil", payload);
      if (res.data && res.data.success) {
        setUser((prev) => (prev ? { ...prev, foto_profil: fotoBase64 } : null));
        return { success: true, message: res.data.message };
      }
      return {
        success: false,
        message: res.data?.message || "Gagal mengunggah foto profil.",
      };
    } catch (err) {
      const msg =
        err.response?.data?.message || "Gagal mengunggah foto profil.";
      return { success: false, message: msg };
    }
  };

  /**
   * Hapus foto profil pengguna aktif dan kembalikan ke avatar default
   */
  const deleteFotoProfil = async () => {
    if (!user) return { success: false, message: "Pengguna belum login." };
    try {
      const res = await api.delete("/auth/foto_profil", {
        data: { role: user.role, id: user.id },
      });
      if (res.data && res.data.success) {
        setUser((prev) => (prev ? { ...prev, foto_profil: null } : null));
        return { success: true, message: res.data.message };
      }
      return {
        success: false,
        message: res.data?.message || "Gagal menghapus foto profil.",
      };
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal menghapus foto profil.";
      return { success: false, message: msg };
    }
  };

  /**
   * Perbarui nama lengkap pengguna aktif di server dan local state
   */
  const updateName = async (nama) => {
    if (!user) return { success: false, message: "Pengguna belum login." };
    try {
      const res = await api.put("/auth/profile", { nama });
      if (res.data && res.data.success) {
        setUser((prev) => (prev ? { ...prev, nama } : null));
        return { success: true, message: res.data.message };
      }
      return {
        success: false,
        message: res.data?.message || "Gagal memperbarui nama lengkap.",
      };
    } catch (err) {
      const msg =
        err.response?.data?.message || "Gagal memperbarui nama lengkap.";
      return { success: false, message: msg };
    }
  };

  /**
   * Refresh profil pengguna (misal status wajah terdaftar)
   */
  const updateUserProfile = (patchData) => {
    setUser((prev) => (prev ? { ...prev, ...patchData } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        isPiket: user?.role === "piket",
        isSiswa: user?.role === "siswa",
        login,
        logout,
        saveSignature,
        updateFotoProfil,
        deleteFotoProfil,
        updateUserProfile,
        updateName,
        loadingAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
