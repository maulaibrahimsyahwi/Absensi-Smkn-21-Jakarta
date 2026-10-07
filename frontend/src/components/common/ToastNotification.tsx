import React, { useEffect, useRef } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastNotificationData {
  type: ToastType | string;
  message: string;
}

export interface ToastNotificationProps {
  notification: ToastNotificationData | null;
  onClose?: () => void;
  autoCloseMs?: number;
}

/**
 * ToastNotification: Komponen notifikasi terpadu dan seragam.
 */
export default function ToastNotification({
  notification,
  onClose,
  autoCloseMs = 4000,
}: ToastNotificationProps) {
  // Simpan onClose di ref agar callback inline tidak mengulang timer tiap render
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!notification) return;
    // Error butuh waktu baca lebih lama (minimal 6 detik)
    const ms =
      notification.type === "error"
        ? Math.max(autoCloseMs, 6000)
        : autoCloseMs;
    const timer = setTimeout(() => {
      onCloseRef.current?.();
    }, ms);
    return () => clearTimeout(timer);
  }, [notification, autoCloseMs]);

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
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-label="Notifikasi sistem"
      className="pointer-events-auto fixed left-1/2 top-[max(1.25rem,env(safe-area-inset-top))] z-[80] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 select-none sm:w-auto sm:min-w-[340px]"
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
            aria-label="Tutup notifikasi"
            className="press grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
