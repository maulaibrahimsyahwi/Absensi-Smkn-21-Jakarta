import React, { useState, useEffect, useRef, useCallback, FormEvent } from "react";
import {
  Lock,
  Unlock,
  KeyRound,
  LogOut,
  AlertCircle,
  Loader2,
  User,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 Menit Inactivity
const STORAGE_LOCK_KEY = "smkn21_piket_idle_locked";

export default function IdleLockScreen() {
  const { user, logout, isPiket, isAdmin } = useAuth();
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(STORAGE_LOCK_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [password, setPassword] = useState<string>("");
  const [loadingUnlock, setLoadingUnlock] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lock hanya aktif jika user login dengan role 'piket' atau 'admin'
  const isEligible = Boolean(user && (isPiket || isAdmin));

  const lockScreen = useCallback(() => {
    if (!isEligible) return;
    setIsLocked(true);
    try {
      sessionStorage.setItem(STORAGE_LOCK_KEY, "true");
    } catch (_e) {
      // ignore storage error
    }
  }, [isEligible]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (isEligible && !isLocked) {
      timerRef.current = setTimeout(lockScreen, IDLE_TIMEOUT_MS);
    }
  }, [isEligible, isLocked, lockScreen]);

  useEffect(() => {
    if (!isEligible) {
      setIsLocked(false);
      try {
        sessionStorage.removeItem(STORAGE_LOCK_KEY);
      } catch (_e) {
        // ignore
      }
      return;
    }

    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    const handleUserActivity = () => {
      if (!isLocked) {
        resetTimer();
      }
    };

    events.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    resetTimer();

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isEligible, isLocked, resetTimer]);

  if (!isEligible || !isLocked) return null;

  const handleUnlock = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!password) {
      setErrorMsg("Masukkan kata sandi akun Anda.");
      return;
    }

    if (!user) return;

    setLoadingUnlock(true);
    try {
      const res = await api.post("/auth/login", {
        username: user.username,
        password: password,
      });

      if (res.data?.success) {
        setIsLocked(false);
        setPassword("");
        try {
          sessionStorage.removeItem(STORAGE_LOCK_KEY);
        } catch (_e) {
          // ignore
        }
        resetTimer();
      } else {
        setErrorMsg(
          res.data?.message || "Kata sandi salah. Silakan coba lagi.",
        );
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setErrorMsg(
        axiosErr.response?.data?.message ||
          "Kata sandi yang Anda masukkan salah. Silakan coba lagi.",
      );
    } finally {
      setLoadingUnlock(false);
    }
  };

  const handleSwitchUser = () => {
    try {
      sessionStorage.removeItem(STORAGE_LOCK_KEY);
    } catch (_e) {
      // ignore
    }
    logout();
    window.location.href = "/login";
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 text-center relative overflow-hidden">
        {/* Dekorasi Aksen Keamanan */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-700 via-indigo-600 to-amber-500" />

        {/* Icon & Title */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-blue-50 border border-blue-200/80 text-blue-700 flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-blue-700" />
        </div>

        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
          Layar Meja Piket Terkunci
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
          Sistem otomatis mengunci layar karena tidak ada aktivitas selama 15
          menit untuk mencegah akses tanpa izin.
        </p>

        {/* Info Petugas */}
        <div className="my-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-blue-700 text-white font-bold flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
            {user?.foto_profil ? (
              <img
                src={user.foto_profil as string}
                alt={user?.nama || "User"}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-blue-200" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {user?.nama || user?.username}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              @{user?.username} &bull;{" "}
              <span className="capitalize font-semibold text-blue-700">
                {user?.role === "piket" ? "Guru Piket" : "Administrator"}
              </span>
            </p>
          </div>
        </div>

        {/* Form Unlock */}
        <form onSubmit={handleUnlock} className="space-y-3.5 text-left">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kata Sandi untuk Membuka Kunci
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                placeholder="Masukkan kata sandi..."
                className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingUnlock}
            className="w-full py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {loadingUnlock ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Buka Kunci Layar</span>
              </>
            )}
          </button>
        </form>

        {/* Switch User / Logout */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-center">
          <button
            type="button"
            onClick={handleSwitchUser}
            className="text-xs font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Ganti Akun / Keluar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
