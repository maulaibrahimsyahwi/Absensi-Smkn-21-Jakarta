import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  Unlock,
  User,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import Button from "../ui/Button";
import { FULLSCREEN_ROUTES } from "../../utils/navVisibility";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const WARN_BEFORE_MS = 60 * 1000;
const LOCK_KEY = "smkn21_piket_idle_locked";
const ACTIVITY = [
  "pointerdown",
  "pointermove",
  "keydown",
  "wheel",
  "scroll",
  "touchstart",
] as const;

export default function IdleLockScreen() {
  const { user, logout, isPiket, isAdmin } = useAuth();
  const { pathname } = useLocation();
  const isEligible = Boolean(user && (isPiket || isAdmin));
  const isKiosk = FULLSCREEN_ROUTES.includes(pathname);

  const [isLocked, setIsLocked] = useState(() => {
    try {
      return sessionStorage.getItem(LOCK_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const lastActivity = useRef(Date.now());

  const lock = useCallback(() => {
    setIsLocked(true);
    setSecondsLeft(null);
    try {
      sessionStorage.setItem(LOCK_KEY, "true");
    } catch {
      /* abaikan */
    }
  }, []);

  useEffect(() => {
    if (isEligible) return;
    setIsLocked(false);
    try {
      sessionStorage.removeItem(LOCK_KEY);
    } catch {
      /* abaikan */
    }
  }, [isEligible]);

  // Pantau aktivitas dengan timestamp; kiosk (/harian, /perpus) tidak dihitung idle
  useEffect(() => {
    if (!isEligible || isLocked) return;
    lastActivity.current = Date.now();
    const touch = () => {
      lastActivity.current = Date.now();
      setSecondsLeft(null);
    };
    const check = () => {
      if (isKiosk) {
        lastActivity.current = Date.now();
        return;
      }
      const remaining = IDLE_TIMEOUT_MS - (Date.now() - lastActivity.current);
      if (remaining <= 0) {
        lock();
      } else {
        setSecondsLeft(
          remaining <= WARN_BEFORE_MS ? Math.ceil(remaining / 1000) : null,
        );
      }
    };
    // capture: scroll di dalam container (tabel, modal) tetap tertangkap
    ACTIVITY.forEach((e) =>
      window.addEventListener(e, touch, { passive: true, capture: true }),
    );
    document.addEventListener("visibilitychange", check);
    const id = setInterval(check, 1000);
    return () => {
      ACTIVITY.forEach((e) =>
        window.removeEventListener(e, touch, { capture: true }),
      );
      document.removeEventListener("visibilitychange", check);
      clearInterval(id);
    };
  }, [isEligible, isLocked, isKiosk, lock]);

  // Blokir interaksi dan fokus ke halaman di belakang overlay
  useEffect(() => {
    if (!isLocked) return;
    const root = document.getElementById("root");
    root?.setAttribute("inert", "");
    return () => root?.removeAttribute("inert");
  }, [isLocked]);

  const handleUnlock = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!password) {
      setErrorMsg("Masukkan kata sandi akun Anda.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api.post("/auth/login", {
        username: user.username,
        password,
      });
      if (res.data?.success) {
        if (res.data.token) {
          localStorage.setItem("smkn21_auth_token", res.data.token);
          api.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
        }
        setIsLocked(false);
        setPassword("");
        lastActivity.current = Date.now();
        try {
          sessionStorage.removeItem(LOCK_KEY);
        } catch {
          /* abaikan */
        }
      } else {
        setErrorMsg(res.data?.message || "Kata sandi salah.");
        setPassword("");
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        .response?.data?.message;
      setErrorMsg(msg || "Kata sandi salah. Silakan coba lagi.");
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchUser = () => {
    try {
      sessionStorage.removeItem(LOCK_KEY);
    } catch {
      /* abaikan */
    }
    logout();
    window.location.href = "/login";
  };

  if (!isEligible) return null;

  return (
    <>
      {secondsLeft !== null &&
        !isLocked &&
        createPortal(
          <div
            role="status"
            aria-live="polite"
            className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl animate-in slide-in-from-bottom duration-300 lg:bottom-6"
          >
            <Lock className="h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-xs">
              Layar terkunci dalam{" "}
              <strong className="tabular-nums font-bold text-amber-300">
                {secondsLeft}
              </strong>{" "}
              detik. Gerakkan kursor atau ketuk layar untuk tetap aktif.
            </p>
          </div>,
          document.body,
        )}

      {isLocked &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lock-title"
            className="fixed inset-0 z-[9999] flex items-end justify-center overflow-y-auto bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300 sm:items-center sm:p-4 select-none"
          >
            <div className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center shadow-2xl animate-in slide-in-from-bottom duration-300 sm:rounded-3xl sm:p-8">
              <h2
                id="lock-title"
                className="text-lg font-extrabold tracking-tight text-slate-900"
              >
                Layar terkunci
              </h2>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                Tidak ada aktivitas selama {IDLE_TIMEOUT_MS / 60000} menit.
                Masukkan kata sandi untuk melanjutkan
              </p>

              <div className="my-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left">
                <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-blue-700 text-white font-bold">
                  {user?.foto_profil ? (
                    <img
                      src={user.foto_profil as string}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-blue-200" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {user?.nama || user?.username}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {user?.role === "piket" ? "Guru Piket" : "Administrator"}
                  </p>
                </div>
              </div>

              <form onSubmit={handleUnlock} className="space-y-3 text-left">
                {errorMsg && (
                  <div
                    key={errorMsg}
                    role="alert"
                    className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
                <div>
                  <label
                    htmlFor="unlock-pw"
                    className="mb-1 block text-xs font-bold text-slate-700"
                  >
                    Kata sandi
                  </label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="unlock-pw"
                      autoFocus
                      type={showPw ? "text" : "password"}
                      autoComplete="current-password"
                      enterKeyHint="go"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-11 text-sm focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={
                        showPw
                          ? "Sembunyikan kata sandi"
                          : "Tampilkan kata sandi"
                      }
                      className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showPw ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  icon={<Unlock className="h-4 w-4" />}
                  className="w-full"
                >
                  Buka kunci
                </Button>
              </form>

              <button
                type="button"
                onClick={handleSwitchUser}
                className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" /> Ganti akun atau keluar
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
