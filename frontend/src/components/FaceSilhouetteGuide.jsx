import React from "react";
import { Eye, CheckCircle2, Sparkles } from "lucide-react";

export default function FaceSilhouetteGuide({
  isDetected = false,
  theme = "blue", // "blue" or "emerald"
  countdown = null,
  loading = false,
  isLiveVerified = false,
  eyeState = "UNKNOWN",
}) {
  const isBlue = theme === "blue";
  const activeColor = isLiveVerified
    ? "#34d399"
    : isDetected
      ? isBlue
        ? "#60a5fa"
        : "#34d399"
      : "rgba(255,255,255,0.85)";

  const glowColor = isLiveVerified
    ? "rgba(16, 185, 129, 0.75)"
    : isBlue
      ? "rgba(59, 130, 246, 0.65)"
      : "rgba(16, 185, 129, 0.65)";

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 select-none px-4">
      <div className="relative flex flex-col items-center justify-center">
        {/* SVG Siluet Wajah Proporsional, Luas & Pas untuk HP serta Tablet */}
        <svg
          viewBox="0 0 380 500"
          className={`w-[88vw] max-w-[340px] xs:max-w-[360px] sm:max-w-[440px] md:max-w-[490px] lg:max-w-[530px] h-auto max-h-[68vh] sm:max-h-[74vh] transition-all duration-300 ${
            isDetected ? "scale-100 opacity-100" : "scale-[0.98] opacity-85"
          }`}
          style={{
            filter: isDetected
              ? `drop-shadow(0 0 28px ${glowColor})`
              : "drop-shadow(0 4px 16px rgba(0,0,0,0.5))",
          }}
        >
          {/* 1. Sudut Bingkai Pemindai (Corner Scanning Brackets) Modern Biometrik */}
          {/* Pojok Kiri Atas */}
          <path
            d="M 25 65 L 25 35 Q 25 25 35 25 L 65 25"
            fill="none"
            stroke={activeColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Pojok Kanan Atas */}
          <path
            d="M 315 25 L 345 25 Q 355 25 355 35 L 355 65"
            fill="none"
            stroke={activeColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Pojok Kiri Bawah */}
          <path
            d="M 25 435 L 25 465 Q 25 475 35 475 L 65 475"
            fill="none"
            stroke={activeColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Pojok Kanan Bawah */}
          <path
            d="M 315 475 L 345 475 Q 355 475 355 465 L 355 435"
            fill="none"
            stroke={activeColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* 2. Kontur Kepala & Wajah Manusia yang Luas, Natural & Nyaman */}
          <path
            d="M 190 32
               C 275 32, 332 85, 332 178
               C 332 268, 298 348, 248 402
               C 220 432, 206 442, 190 442
               C 174 442, 160 432, 132 402
               C 82 348, 48 268, 48 178
               C 48 85, 105 32, 190 32 Z"
            fill="none"
            stroke={activeColor}
            strokeWidth={isDetected ? "3.5" : "2.5"}
            strokeDasharray={isDetected ? "none" : "12 8"}
            strokeLinecap="round"
            className="transition-all duration-300"
          />

          {/* 3. Garis Panduan Area Mata (Soft Eye Alignment Guide) */}
          <line
            x1="130"
            y1="185"
            x2="170"
            y2="185"
            stroke={isDetected ? activeColor : "rgba(255,255,255,0.4)"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="4 4"
          />
          <line
            x1="210"
            y1="185"
            x2="250"
            y2="185"
            stroke={isDetected ? activeColor : "rgba(255,255,255,0.4)"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="4 4"
          />

          {/* 4. Garis Aksen Dagu Bawah (Chin Rest Guide) */}
          <path
            d="M 165 422 Q 190 432 215 422"
            fill="none"
            stroke={isDetected ? activeColor : "rgba(255,255,255,0.4)"}
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* 5. Siluet Bahu / Leher Halus di Bagian Bawah */}
          <path
            d="M 132 405 C 110 440, 70 470, 35 488"
            fill="none"
            stroke={isDetected ? activeColor : "rgba(255,255,255,0.3)"}
            strokeWidth="2"
            strokeDasharray={isDetected ? "none" : "8 6"}
            strokeLinecap="round"
          />
          <path
            d="M 248 405 C 270 440, 310 470, 345 488"
            fill="none"
            stroke={isDetected ? activeColor : "rgba(255,255,255,0.3)"}
            strokeWidth="2"
            strokeDasharray={isDetected ? "none" : "8 6"}
            strokeLinecap="round"
          />
        </svg>

        {/* 6. Floating Countdown Badge: Muncul di Tengah Wajah saat Kedipan Terverifikasi */}
        {isDetected && isLiveVerified && countdown !== null && !loading && (
          <div className="absolute top-[38%] flex flex-col items-center gap-1.5 animate-in zoom-in-95 duration-200 pointer-events-none">
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center font-black text-4xl sm:text-5xl text-white shadow-2xl backdrop-blur-md border ${
                isBlue
                  ? "bg-blue-600/90 border-blue-300 shadow-blue-500/60"
                  : "bg-emerald-600/90 border-emerald-300 shadow-emerald-500/60"
              } animate-pulse`}
            >
              {countdown}
            </div>
          </div>
        )}

        {/* 7. Floating Prompt di Atas Siluet Wajah (Nyaman & Terlihat Jelas di HP & Tablet) */}
        <div className="absolute -top-10 sm:-top-12 inset-x-0 text-center pointer-events-none px-4 z-20">
          {isDetected ? (
            isLiveVerified ? (
              <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold border backdrop-blur-md shadow-lg bg-emerald-950/90 border-emerald-400 text-emerald-200 animate-in fade-in zoom-in-95">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 animate-bounce" />
                <span className="truncate">
                  Wajah Terverifikasi • Tahan Posisi
                </span>
              </span>
            ) : eyeState === "CLOSED" ? (
              <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold border backdrop-blur-md shadow-lg bg-cyan-950/90 border-cyan-400 text-cyan-200 animate-pulse">
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
                <span className="truncate">Buka mata Anda kembali...</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold border backdrop-blur-md shadow-lg bg-blue-950/90 border-blue-400 text-blue-200">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                <span className="truncate">
                  Wajah Pas • Silakan Berkedip Santai
                </span>
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold bg-black/75 border border-white/20 text-slate-200 backdrop-blur-md shadow-lg">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-blue-400 animate-ping flex-shrink-0"></span>
              <span className="truncate">Arahkan wajah ke dalam siluet</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
