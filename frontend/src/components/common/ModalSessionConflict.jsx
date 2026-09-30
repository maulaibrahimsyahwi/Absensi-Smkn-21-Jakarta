import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  Smartphone,
  LogOut,
  Laptop,
  ArrowRight,
  Clock,
} from "lucide-react";

/**
 * Modal Notifikasi Standar Industri untuk Konflik Sesi Multi-Perangkat (Single Active Session).
 * Muncul saat akun terdeteksi login di perangkat lain atau sesi dihentikan server.
 * Menampilkan countdown otomatis (5 detik) sebelum diarahkan ke halaman login.
 */
export default function ModalSessionConflict() {
  const [conflictData, setConflictData] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef(null);

  useEffect(() => {
    // 1. Tangkap custom event internal dari axios interceptor (api.js)
    const handleSessionConflictEvent = (e) => {
      const detail = e.detail || {};
      setConflictData({
        errorCode: detail.errorCode || "SESSION_TERMINATED",
        message:
          detail.message ||
          "Akun Anda telah login di perangkat lain. Sesi ini telah diakhiri demi keamanan data Anda.",
      });
      setCountdown(5);
    };

    window.addEventListener(
      "smkn21_session_conflict",
      handleSessionConflictEvent,
    );

    // 2. Tangkap sinyal antar tab via BroadcastChannel
    let bc = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("smkn21_auth_channel");
        bc.onmessage = (event) => {
          if (event.data?.type === "SESSION_CONFLICT") {
            setConflictData({
              errorCode: event.data.errorCode || "SESSION_TERMINATED",
              message:
                event.data.message ||
                "Akun Anda telah login di perangkat lain. Sesi pada perangkat ini telah diakhiri.",
            });
            setCountdown(5);
          }
        };
      }
    } catch (err) {
      // ignore
    }

    return () => {
      window.removeEventListener(
        "smkn21_session_conflict",
        handleSessionConflictEvent,
      );
      if (bc) bc.close();
    };
  }, []);

  // Timer hitung mundur 5 detik saat modal aktif
  useEffect(() => {
    if (!conflictData) return;

    if (countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else {
      handleRedirectToLogin();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [conflictData, countdown]);

  const handleRedirectToLogin = () => {
    try {
      localStorage.removeItem("smkn21_auth_token");
      localStorage.removeItem("smkn21_auth_user");
      sessionStorage.removeItem("smkn21_piket_idle_locked");
    } catch (e) {
      // ignore
    }

    const reason =
      conflictData?.errorCode === "ACCOUNT_DELETED"
        ? "deleted=1"
        : "conflict=1";

    if (!window.location.pathname.includes("/login")) {
      window.location.href = `/login?${reason}`;
    } else {
      setConflictData(null);
    }
  };

  if (!conflictData) return null;

  const isMultiDevice =
    conflictData.errorCode === "SESSION_TERMINATED" ||
    conflictData.message.includes("perangkat lain");

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Dekorasi Aksen Keamanan Atas */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-rose-500 to-red-600" />

        {/* Visual Badge Dua Perangkat */}
        <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
          <div className="absolute inset-0 bg-rose-100 rounded-3xl animate-ping opacity-40" />
          <div className="relative w-18 h-18 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-inner">
            {isMultiDevice ? (
              <div className="flex items-center gap-1">
                <Laptop className="w-7 h-7 text-rose-600" />
                <Smartphone className="w-5 h-5 text-amber-600 -ml-1 mt-2" />
              </div>
            ) : (
              <ShieldAlert className="w-9 h-9 text-rose-600" />
            )}
          </div>
        </div>

        {/* Judul & Pesan Formal */}
        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
          {isMultiDevice
            ? "Akun Login di Perangkat Lain"
            : "Sesi Autentikasi Berakhir"}
        </h2>

        <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed max-w-sm mx-auto">
          {conflictData.message}
        </p>

        {/* Kotak Informasi Keamanan Institusional */}
        <div className="my-5 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs text-left space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-amber-950">
            <Clock className="w-4 h-4 text-amber-700 shrink-0" />
            Pengalihan Otomatis:
          </p>
          <p className="text-amber-800 leading-relaxed text-[11px]">
            Sesi pada browser/perangkat ini dinonaktifkan. Anda akan dialihkan
            ke halaman login dalam{" "}
            <span className="font-extrabold text-rose-700 text-xs px-1.5 py-0.5 rounded bg-rose-100 border border-rose-200 inline-block mx-0.5">
              {countdown} detik
            </span>
          </p>
          {/* Progress Bar Countdown */}
          <div className="w-full bg-amber-200/80 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-gradient-to-r from-amber-500 to-rose-600 h-full transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Tombol Aksi Langsung */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleRedirectToLogin}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-slate-900 to-blue-950 hover:from-black hover:to-blue-900 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span>Login Ulang Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
