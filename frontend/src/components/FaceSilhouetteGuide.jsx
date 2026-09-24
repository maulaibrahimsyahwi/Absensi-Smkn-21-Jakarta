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
        </svg>

        {/* 3. Floating Countdown Badge: Muncul di Tengah Wajah saat Kedipan Terverifikasi */}
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

        {/* 4. Floating Prompt di Atas Siluet Wajah (Nyaman & Terlihat Jelas di HP & Tablet) */}
        <div className="absolute -top-10 sm:-top-12 inset-x-0 text-center pointer-events-none px-4 z-20">
          {isDetected ? (
            isLiveVerified ? (
              <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold border backdrop-blur-md shadow-lg bg-emerald-950/90 border-emerald-400 text-emerald-200 animate-in fade-in zoom-in-95">
                <span className="truncate">Wajah Teridentifikasi</span>
              </span>
            ) : eyeState === "CLOSED" ? (
              <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold border backdrop-blur-md shadow-lg bg-cyan-950/90 border-cyan-400 text-cyan-200 animate-pulse">
                <span className="truncate">Buka mata Anda kembali</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold border backdrop-blur-md shadow-lg bg-blue-950/90 border-blue-400 text-blue-200">
                <span className="truncate">Silakan Berkedip </span>
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
