import React, { useEffect } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";

/**
 * ToastNotification: Komponen notifikasi terpadu dan seragam.
 * Melayang di bagian atas tengah layar (top-center) agar konsisten di semua halaman.
 *
 * @param {Object} notification - { type: "success" | "error" | "info" | "warning", message: string }
 * @param {Function} onClose - Callback saat notifikasi ditutup
 * @param {number} autoCloseMs - Durasi otomatis tutup dalam milidetik (default: 4000ms)
 */
export default function ToastNotification({
  notification,
  onClose,
  autoCloseMs = 4000,
}) {
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, autoCloseMs);
    return () => clearTimeout(timer);
  }, [notification, autoCloseMs, onClose]);

  if (!notification || !notification.message) return null;

  const isSuccess = notification.type === "success";
  const isError = notification.type === "error";
  const isWarning = notification.type === "warning";

  const bgBorderClass = isSuccess
    ? "bg-emerald-950/90 text-emerald-100 border-emerald-500/40 shadow-emerald-950/30"
    : isError
      ? "bg-rose-950/90 text-rose-100 border-rose-500/40 shadow-rose-950/30"
      : isWarning
        ? "bg-amber-950/90 text-amber-100 border-amber-500/40 shadow-amber-950/30"
        : "bg-slate-900/90 text-slate-100 border-slate-700/60 shadow-slate-950/30";

  return (
    <aside
      aria-label="Notifikasi sistem"
      className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] sm:w-auto sm:min-w-[340px] pointer-events-auto select-none"
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-md shadow-xl text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-top-3 duration-200 ${bgBorderClass}`}
      >
        <div className="flex-shrink-0">
          {isSuccess && (
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
          )}
          {isError && (
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
          )}
          {isWarning && (
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
          )}
          {!isSuccess && !isError && !isWarning && (
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
          )}
        </div>

        <div className="flex-1 min-w-0 pr-1 leading-snug">
          <span>{notification.message}</span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Tutup notifikasi"
            className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
