import React from "react";

export interface FaceSilhouetteGuideProps {
  isDetected?: boolean;
  theme?: "blue" | "emerald";
  countdown?: number | null;
  loading?: boolean;
  isLiveVerified?: boolean;
  eyeState?: "UNKNOWN" | "OPEN" | "CLOSED" | string;
  progress?: number;
  isOfflineFallback?: boolean;
}

export default function FaceSilhouetteGuide({
  isDetected = false,
  theme = "blue",
  countdown = null,
  loading = false,
  isLiveVerified = false,
  eyeState = "UNKNOWN",
  progress,
  isOfflineFallback = false,
}: FaceSilhouetteGuideProps) {
  const isBlue = theme === "blue";

  // Hirarki 4-Warna Dynamic Ring:
  // 1. Live Verified -> Emerald Green (#10b981)
  // 2. Mata Terpejam / Proses Kedip -> Pulsing Cyan (#06b6d4)
  // 3. Wajah Terdeteksi & Terbuka -> Electric Blue (#3b82f6) / Emerald Theme (#10b981)
  // 4. Standby / Mencari Wajah -> Faded White Dashed (rgba(255,255,255,0.45))
  let activeColor = "rgba(255, 255, 255, 0.45)";
  let glowColor = "rgba(0, 0, 0, 0.5)";
  let strokeDash = "12 8";
  let strokeWidth = "2.5";

  if (isLiveVerified) {
    activeColor = "#10b981";
    glowColor = "rgba(16, 185, 129, 0.85)";
    strokeDash = "none";
    strokeWidth = "3.5";
  } else if (isDetected) {
    strokeDash = "none";
    strokeWidth = "3.5";
    if (eyeState === "CLOSED") {
      activeColor = "#06b6d4";
      glowColor = "rgba(6, 182, 212, 0.85)";
    } else {
      activeColor = isBlue ? "#3b82f6" : "#10b981";
      glowColor = isBlue
        ? "rgba(59, 130, 246, 0.75)"
        : "rgba(16, 185, 129, 0.75)";
    }
  }

  // Kalkulasi progress lingkaran countdown (radius = 44)
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const computedProgress =
    progress !== undefined
      ? progress
      : countdown !== null
        ? Math.max(0, Math.min(1, (4 - countdown) / 3))
        : 0;
  const strokeDashoffset = circumference * (1 - computedProgress);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 select-none px-4">
      <div className="relative flex flex-col items-center justify-center">
        {/* SVG Siluet Wajah Proporsional, Disesuaikan untuk Tablet Landscape 10" (1280x800) & HP */}
        <svg
          viewBox="0 0 380 500"
          role="img"
          aria-label="Siluet panduan posisi wajah"
          className={`w-[82vw] max-w-[320px] sm:max-w-[380px] lg:max-w-[420px] h-auto max-h-[58dvh] sm:max-h-[62dvh] transition-all duration-300 ${
            isDetected ? "scale-100 opacity-100" : "scale-[0.98] opacity-75"
          }`}
          style={{
            filter: isDetected
              ? `drop-shadow(0 0 28px ${glowColor})`
              : "drop-shadow(0 4px 16px rgba(0,0,0,0.5))",
          }}
        >
          {/* Kontur Kepala & Wajah Manusia yang Luas, Natural & Nyaman */}
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
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDash}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>

        {/* Floating Countdown Badge with SVG Progress Ring */}
        {isDetected && isLiveVerified && countdown !== null && !loading && (
          <div className="absolute top-[38%] flex flex-col items-center justify-center animate-in zoom-in-95 duration-200 pointer-events-none">
            <div className="relative flex items-center justify-center">
              {/* SVG Circular Progress Ring */}
              <svg
                className="w-24 h-24 sm:w-28 sm:h-28 -rotate-90 transform"
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth="6"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={isBlue ? "#60a5fa" : "#34d399"}
                  strokeWidth="6"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 ease-out"
                />
              </svg>

              {/* Countdown Number Inside Ring */}
              <div
                className={`absolute inset-2.5 sm:inset-3 rounded-full flex items-center justify-center font-black text-3xl sm:text-4xl text-white shadow-2xl backdrop-blur-md border ${
                  isBlue
                    ? "bg-blue-600/90 border-blue-300/80 shadow-blue-500/60"
                    : "bg-emerald-600/90 border-emerald-300/80 shadow-emerald-500/60"
                }`}
              >
                {countdown}
              </div>
            </div>
          </div>
        )}

        {/* Floating Prompt di Atas Siluet Wajah dengan A11y Live Region */}
        <div
          role="status"
          aria-live="polite"
          className="absolute -top-10 sm:-top-12 inset-x-0 text-center pointer-events-none px-4 z-20"
        >
          {isDetected ? (
            isLiveVerified ? (
              <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold border backdrop-blur-md shadow-lg bg-emerald-950/90 border-emerald-400 text-emerald-200 animate-in fade-in zoom-in-95">
                <span className="truncate">Wajah Teridentifikasi</span>
              </span>
            ) : isOfflineFallback ? (
              <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold border backdrop-blur-md shadow-lg bg-amber-950/90 border-amber-400 text-amber-200 animate-pulse">
                <span className="truncate">Mode Offline: Tahan Posisi Wajah</span>
              </span>
            ) : eyeState === "CLOSED" ? (
              <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold border backdrop-blur-md shadow-lg bg-cyan-950/90 border-cyan-400 text-cyan-200 animate-pulse">
                <span className="truncate">Buka mata Anda kembali</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold border backdrop-blur-md shadow-lg bg-blue-950/90 border-blue-400 text-blue-200">
                <span className="truncate">Silakan Berkedip</span>
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold bg-black/75 border border-white/20 text-slate-200 backdrop-blur-md shadow-lg">
              <span className="truncate">Arahkan wajah ke dalam siluet</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
