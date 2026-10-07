import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Share, PlusSquare } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const SNOOZE_KEY = "smkn21_pwa_snooze_until";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function isAppStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

function isPromptSnoozed(): boolean {
  try {
    const val = localStorage.getItem(SNOOZE_KEY);
    if (!val) return false;
    return Date.now() < Number(val);
  } catch {
    return false;
  }
}

/**
 * Komponen PWA Install Prompt.
 * Mendukung Android/Desktop (via beforeinstallprompt) dan iOS Safari (instruksi panduan).
 * Tampil hanya jika pengguna terautentikasi dan belum menginstal atau menunda (snooze 7 hari).
 */
export default function PwaInstallPrompt() {
  const { isAuthenticated } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);

  // Deteksi perangkat
  const userAgent =
    typeof window !== "undefined"
      ? window.navigator.userAgent.toLowerCase()
      : "";
  const isIos = /iphone|ipad|ipod/.test(userAgent) && !/crios|fxios/i.test(userAgent);
  const isMobile = isIos || /android|mobile|tablet/i.test(userAgent);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsVisible(false);
      return;
    }

    if (isAppStandalone() || isPromptSnoozed()) {
      return;
    }

    // Tangkap event native beforeinstallprompt (Android / Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Di perangkat iOS/mobile lainnya tanpa beforeinstallprompt, tampilkan saran setelah jeda
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isMobile) {
      timer = setTimeout(() => {
        if (!isAppStandalone() && !isPromptSnoozed()) {
          setIsVisible(true);
        }
      }, 1500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      if (timer) clearTimeout(timer);
    };
  }, [isAuthenticated, isMobile]);

  const handleSnooze = () => {
    setIsVisible(false);
    setShowIosGuide(false);
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SEVEN_DAYS_MS));
    } catch {
      // ignore
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch {
        // ignore
      }
      setDeferredPrompt(null);
      handleSnooze();
    } else if (isIos) {
      setShowIosGuide(true);
    } else {
      handleSnooze();
    }
  };

  if (!isVisible || !isAuthenticated) return null;

  return (
    <div
      role="region"
      aria-label="Pemasangan Aplikasi"
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-5 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-sm z-50 animate-in slide-in-from-bottom duration-300"
    >
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-col gap-3">
        {/* Konten Utama */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-md mt-0.5">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-100">
                Pasang Aplikasi SMKN 21
              </h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-snug">
                Akses cepat langsung dari layar utama HP dengan mode layar penuh dan offline buffer.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSnooze}
            aria-label="Tutup saran instalasi"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Panduan Khusus iOS Safari jika diklik */}
        {showIosGuide && (
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-slate-200 space-y-2 animate-in fade-in duration-200">
            <p className="font-semibold text-indigo-300">Cara pasang di iPhone / iPad:</p>
            <ol className="space-y-1.5 list-decimal list-inside text-slate-300 leading-relaxed">
              <li>
                Ketuk tombol <span className="inline-flex items-center gap-1 font-semibold text-white px-1 py-0.5 bg-slate-700 rounded"><Share className="w-3.5 h-3.5 text-blue-400 inline" /> Bagikan</span> di bilah bawah browser Safari.
              </li>
              <li>
                Gulir ke bawah dan pilih <span className="inline-flex items-center gap-1 font-semibold text-white px-1 py-0.5 bg-slate-700 rounded"><PlusSquare className="w-3.5 h-3.5 text-emerald-400 inline" /> Tambah ke Layar Utama</span>.
              </li>
              <li>
                Ketuk <span className="font-semibold text-white">Tambah</span> di pojok kanan atas.
              </li>
            </ol>
          </div>
        )}

        {/* Tombol Aksi */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
          <button
            type="button"
            onClick={handleSnooze}
            className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer min-h-[40px] flex items-center"
          >
            Nanti Saja
          </button>
          {!showIosGuide ? (
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer min-h-[40px]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isIos ? "Petunjuk Pasang" : "Pasang Sekarang"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSnooze}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer min-h-[40px]"
            >
              <span>Mengerti</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
