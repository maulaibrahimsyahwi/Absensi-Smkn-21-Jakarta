import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Share2 } from "lucide-react";

/**
 * Komponen PWA Install Prompt Minimalis.
 * Hanya muncul satu kali saat pengguna pertama kali membuka website (first visit).
 * Terintegrasi langsung dengan dialog instalasi native browser (Android Chrome PWA).
 */
export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  // Deteksi perangkat
  const userAgent =
    typeof window !== "undefined"
      ? window.navigator.userAgent.toLowerCase()
      : "";
  const isIos = /iphone|ipad|ipod/.test(userAgent);
  const isMobile =
    isIos || /android|mobile|tablet/i.test(userAgent);

  useEffect(() => {
    // 1. Cek apakah aplikasi sudah berjalan dalam mode standalone (sudah terpasang di HP)
    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true ||
        document.referrer.includes("android-app://"));

    if (isStandalone) {
      return; // Sudah terpasang, jangan tampilkan
    }

    // 2. Cek apakah pengguna sudah pernah melihat/menutup prompt ini sebelumnya
    // HANYA MUNCUL SATU KALI SAAT PERTAMA KALI MEMBUKA WEBSITE
    try {
      const alreadyHandled =
        localStorage.getItem("smkn21_pwa_first_visit_handled") === "true";
      if (alreadyHandled) {
        return; // Sudah pernah muncul sebelumnya, jangan munculkan lagi
      }
    } catch {
      // ignore
    }

    // 3. Tangkap event native beforeinstallprompt (Android / Chrome)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt,
    );

    // 4. Di perangkat mobile, tampilkan banner pertama kali setelah jeda 1.5 detik
    let timer;
    if (isMobile) {
      timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      if (timer) clearTimeout(timer);
    };
  }, [isMobile]);

  const markAsHandled = () => {
    setIsVisible(false);
    try {
      // Tandai bahwa prompt pertama kali sudah selesai (tidak akan muncul lagi)
      localStorage.setItem("smkn21_pwa_first_visit_handled", "true");
    } catch {
      // ignore
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Munculkan dialog instalasi native browser
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch {
        // ignore
      }
      setDeferredPrompt(null);
    }
    // Tutup dan jangan tampilkan lagi di masa mendatang
    markAsHandled();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-sm z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-col gap-3">
        {/* Konten Utama */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-slate-100">
                  Pasang Aplikasi SMKN 21
                </h4>
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                  PWA
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-snug">
                Pasang ke layar utama HP untuk akses presensi cepat dan layar
                penuh.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={markAsHandled}
            aria-label="Tutup saran instalasi"
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Khusus Safari iOS: Petunjuk singkat satu baris */}
        {isIos && (
          <div className="bg-slate-800/80 rounded-xl px-3 py-2 text-[11px] text-slate-300 flex items-center gap-2 border border-slate-700/50">
            <Share2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              Ketuk tombol <strong>Bagikan ⎋</strong> lalu pilih{" "}
              <strong>'Add to Home Screen' (+)</strong>.
            </span>
          </div>
        )}

        {/* Tombol Aksi */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
          <button
            type="button"
            onClick={markAsHandled}
            className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Nanti Saja
          </button>
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Pasang Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
}
