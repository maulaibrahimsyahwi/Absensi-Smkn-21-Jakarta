import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Wifi, WifiOff } from "lucide-react";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { FULLSCREEN_ROUTES } from "../../utils/navVisibility";

export default function OfflineBanner() {
  const online = useOnlineStatus();
  const { pathname } = useLocation();
  const [showBack, setShowBack] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setShowBack(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setShowBack(true);
    const t = setTimeout(() => setShowBack(false), 3500);
    return () => clearTimeout(t);
  }, [online]);

  // Sembunyikan di rute kiosk karena kiosk sudah memiliki indikator buffer offline tersendiri
  if (FULLSCREEN_ROUTES.includes(pathname)) return null;
  if (online && !showBack) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center justify-center gap-2 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-xs font-semibold text-white animate-in slide-in-from-top duration-300 sm:text-sm ${
        online ? "bg-emerald-600" : "bg-slate-900"
      }`}
    >
      {online ? (
        <Wifi className="h-4 w-4" />
      ) : (
        <WifiOff className="h-4 w-4 text-amber-400" />
      )}
      <span>
        {online ? "Koneksi kembali aktif" : "Tidak ada koneksi internet"}
      </span>
    </div>
  );
}
