import React, { useState, useEffect } from "react";
import {
  Download,
  Share2,
  X,
  Smartphone,
  CheckCircle2,
  HelpCircle,
  MoreVertical,
  PlusSquare,
} from "lucide-react";

/**
 * Komponen PWA Install Prompt yang Cerdas & Responsif.
 * Mendukung Android, iOS, tablet, dan desktop.
 * Dilengkapi panduan visual langkah-demi-langkah jika browser berjalan pada mode dev / self-signed SSL.
 */
export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Deteksi perangkat
  const userAgent =
    typeof window !== "undefined"
      ? window.navigator.userAgent.toLowerCase()
      : "";
  const isIos = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isMobile = isIos || isAndroid || /mobile|tablet/.test(userAgent);

  useEffect(() => {
    // 1. Cek apakah aplikasi sudah berjalan dalam mode standalone (sudah terpasang di HP)
    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true ||
        document.referrer.includes("android-app://"));

    if (isStandalone) {
      return; // Sudah terpasang, jangan tampilkan banner
    }

    // 2. Cek apakah pengguna sudah pernah menutup prompt baru-baru ini
    try {
      const dismissedTime = localStorage.getItem(
        "smkn21_pwa_prompt_dismissed",
      );
      if (
        dismissedTime &&
        Date.now() - Number(dismissedTime) < 12 * 60 * 60 * 1000
      ) {
        // Hanya lewati jika bukan event manual
      } else {
        // Tampilkan otomatis di HP / tablet setelah 1.5 detik
        if (isMobile) {
          const autoTimer = setTimeout(() => {
            setIsVisible(true);
          }, 1500);
          return () => clearTimeout(autoTimer);
        }
      }
    } catch {
      if (isMobile) {
        setIsVisible(true);
      }
    }

    // 3. Tangkap event native beforeinstallprompt (jika didukung & diizinkan browser)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    // 4. Tangkap event kustom jika dipicu dari menu / tombol navbar
    const handleManualTrigger = () => {
      setIsVisible(true);
      setShowGuide(true);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt,
    );
    window.addEventListener("show-pwa-prompt", handleManualTrigger);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("show-pwa-prompt", handleManualTrigger);
    };
  }, [isMobile]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Jalankan dialog instalasi native jika tersedia
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } else {
      // Jika browser belum mendukung dialog otomatis (misal: di IP lokal self-signed SSL atau iOS),
      // buka panduan visual langkah-demi-langkah
      setShowGuide((prev) => !prev);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem(
        "smkn21_pwa_prompt_dismissed",
        Date.now().toString(),
      );
    } catch {
      // ignore
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-md z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-col gap-3">
        {/* Header Banner */}
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
                Pasang ke layar utama HP untuk akses cepat tanpa bilah browser.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Tutup saran instalasi"
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Panduan Langkah-Demi-Langkah (Jika panduan dibuka atau di iOS) */}
        {(showGuide || isIos) && (
          <div className="bg-slate-800/90 rounded-xl p-3 text-xs text-slate-200 border border-slate-700/60 flex flex-col gap-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-[11px] uppercase tracking-wider">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Cara Pasang di {isIos ? "iPhone (Safari)" : "Android (Chrome)"}:</span>
            </div>

            {isIos ? (
              <ol className="space-y-1.5 pl-1 text-[11.5px] text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-indigo-400">1.</span>
                  <span>
                    Ketuk tombol <strong>Bagikan (Share <Share2 className="w-3.5 h-3.5 inline text-sky-400" />)</strong> di bilah bawah Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-indigo-400">2.</span>
                  <span>
                    Gulir ke bawah dan pilih <strong>'Add to Home Screen' (<PlusSquare className="w-3.5 h-3.5 inline text-slate-300" />)</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-indigo-400">3.</span>
                  <span>
                    Ketuk <strong>'Tambah'</strong> di pojok kanan atas.
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-1.5 pl-1 text-[11.5px] text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-indigo-400">1.</span>
                  <span>
                    Ketuk ikon <strong>titik tiga (<MoreVertical className="w-3.5 h-3.5 inline text-slate-300" />)</strong> di pojok kanan atas browser Chrome.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-indigo-400">2.</span>
                  <span>
                    Pilih menu <strong>'Tambahkan ke Layar Utama'</strong> (atau <strong>'Instal aplikasi'</strong>).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-indigo-400">3.</span>
                  <span>
                    Ketuk <strong>'Instal'</strong> / <strong>'Tambah'</strong>.
                  </span>
                </li>
              </ol>
            )}

            <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] pt-1 border-t border-slate-700/50">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Ikon SMKN 21 akan langsung muncul di beranda HP Anda!</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setShowGuide((prev) => !prev)}
            className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors cursor-pointer"
          >
            {showGuide ? "Sembunyikan Petunjuk" : "Lihat Petunjuk"}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDismiss}
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
              <span>{deferredPrompt ? "Pasang Sekarang" : showGuide ? "Tutup" : "Pasang Sekarang"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
