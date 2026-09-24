import React, { useState, useEffect } from "react";
import { Download, Share2, X, Smartphone } from "lucide-react";

/**
 * Komponen PWA Install Prompt.
 * Memandu siswa/guru untuk memasang aplikasi ke layar utama HP (Android & iOS).
 */
export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIosPrompt, setIsIosPrompt] = useState(false);

  useEffect(() => {
    // 1. Cek apakah aplikasi sudah berjalan dalam mode standalone (sudah ter-install)
    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true);

    if (isStandalone) {
      return; // Sudah terpasang, jangan tampilkan banner
    }

    // 2. Cek apakah pengguna sudah pernah menutup prompt dalam 5 hari terakhir
    try {
      const dismissedTime = localStorage.getItem("smkn21_pwa_prompt_dismissed");
      if (
        dismissedTime &&
        Date.now() - Number(dismissedTime) < 5 * 24 * 60 * 60 * 1000
      ) {
        return;
      }
    } catch {
      // ignore localStorage error
    }

    // 3. Deteksi perangkat iOS (iPhone / iPad)
    const userAgent =
      typeof window !== "undefined"
        ? window.navigator.userAgent.toLowerCase()
        : "";
    const isIos = /iphone|ipad|ipod/.test(userAgent);

    if (isIos && !isStandalone) {
      // Tampilkan banner panduan iOS setelah jeda
      const timer = setTimeout(() => {
        setIsIosPrompt(true);
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // 4. Deteksi event beforeinstallprompt di Android/Chrome/Edge
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => {
        setIsVisible(true);
      }, 2500);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem(
        "smkn21_pwa_prompt_dismissed",
        Date.now().toString()
      );
    } catch {
      // ignore
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-md z-40 animate-in slide-in-from-bottom duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/60 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-inner">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-100">
                Pasang Aplikasi SMKN 21
              </h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-snug">
                Pasang ke layar utama HP untuk akses cepat, layar penuh, dan
                tanpa bilah browser.
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

        {isIosPrompt ? (
          <div className="bg-slate-800/80 rounded-xl p-2.5 text-xs text-slate-300 flex items-center gap-2 border border-slate-700/50">
            <Share2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              Ketuk tombol <strong>Share ⎋</strong> di Safari, lalu pilih{" "}
              <strong>'Add to Home Screen' (+)</strong>.
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Nanti Saja
            </button>
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Pasang Sekarang</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
