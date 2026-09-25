import React, { useState, useEffect } from "react";
import { WifiOff, Wifi, X } from "lucide-react";

/**
 * Komponen Indikator Status Koneksi Offline-Aware.
 * Mendeteksi status internet secara real-time dan menampilkan notifikasi ramah pengguna.
 */
export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [showReconnected, setShowReconnected] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsDismissed(false);
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsDismissed(false);
      setShowReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Notifikasi ketika internet kembali menyala
  if (showReconnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-emerald-600 text-white text-xs sm:text-sm font-medium py-2.5 px-4 shadow-md flex items-center justify-between animate-in slide-in-from-top duration-300">
        <div className="flex items-center gap-2 max-w-6xl mx-auto w-full justify-center">
          <Wifi className="w-4 h-4 animate-pulse shrink-0" />
          <span>
            Koneksi internet kembali aktif! Sistem siap melakukan sinkronisasi
            presensi.
          </span>
        </div>
      </div>
    );
  }

  // Banner saat koneksi internet terputus (Offline)
  if (!isOnline && !isDismissed) {
    return (
      <aside
        aria-label="Pemberitahuan koneksi internet terputus"
        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-600 to-rose-600 text-white text-xs sm:text-sm font-medium py-2 px-3 sm:px-4 shadow-lg flex items-center justify-between animate-in slide-in-from-top duration-300"
      >
        <div className="flex items-center gap-2.5 max-w-5xl mx-auto">
          <div className="p-1 bg-white/20 rounded-full shrink-0">
            <WifiOff className="w-3.5 h-3.5" />
          </div>
          <p className="leading-tight">
            Anda sedang tidak terhubung ke internet. Presensi memerlukan koneksi
            yang stabil
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          aria-label="Tutup notifikasi offline"
          className="p-1 hover:bg-white/20 rounded-md text-white/80 hover:text-white transition-colors shrink-0 ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  return null;
}
