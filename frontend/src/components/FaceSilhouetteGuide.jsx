import React from "react";

export default function FaceSilhouetteGuide({
  isDetected = false,
  theme = "blue", // "blue" or "emerald"
  countdown = null,
  loading = false,
}) {
  const isBlue = theme === "blue";
  const activeColor = isBlue ? "#60a5fa" : "#34d399";
  const glowColor = isBlue
    ? "rgba(59, 130, 246, 0.55)"
    : "rgba(16, 185, 129, 0.55)";

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 select-none">
      <div className="relative flex flex-col items-center justify-center">
        {/* SVG Siluet Wajah Proporsional & Pas (Responsif untuk Berbagai Device) */}
        <svg
          viewBox="0 0 360 480"
          className={`w-[260px] sm:w-[370px] md:w-[430px] lg:w-[490px] max-w-[80vw] h-auto max-h-[56vh] sm:max-h-[66vh] transition-all duration-300 ${
            isDetected ? "scale-100 opacity-100" : "scale-98 opacity-80"
          }`}
          style={{
            filter: isDetected ? `drop-shadow(0 0 24px ${glowColor})` : "none",
          }}
        >
          {/* Garis Luar Siluet Wajah Halus & Luas */}
          <path
            d="M 180 35
               C 260 35, 305 90, 305 180
               C 305 265, 275 340, 230 395
               C 205 425, 195 435, 180 435
               C 165 435, 155 425, 130 395
               C 85 340, 55 265, 55 180
               C 55 90, 100 35, 180 35 Z"
            fill="none"
            stroke={isDetected ? activeColor : "rgba(255,255,255,0.75)"}
            strokeWidth={isDetected ? "3.5" : "2.5"}
            strokeDasharray={isDetected ? "none" : "10 7"}
            strokeLinecap="round"
            className="transition-all duration-300"
          />

          {/* Garis Aksen Halus Penanda Dagu Bawah */}
          <path
            d="M 160 418 Q 180 426 200 418"
            fill="none"
            stroke={isDetected ? activeColor : "rgba(255,255,255,0.4)"}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>

        {/* Floating Countdown Badge in Center of Face when Detected */}
        {isDetected && countdown !== null && !loading && (
          <div className="absolute top-[38%] flex flex-col items-center gap-1.5 animate-in zoom-in-95 duration-200">
            <div
              className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center font-black text-3xl sm:text-4xl text-white shadow-2xl backdrop-blur-md border ${
                isBlue
                  ? "bg-blue-600/85 border-blue-400 shadow-blue-500/50"
                  : "bg-emerald-600/85 border-emerald-400 shadow-emerald-500/50"
              } animate-pulse`}
            >
              {countdown}
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-white bg-black/70 px-3.5 py-1 rounded-full border border-white/20 mt-1 shadow-lg">
              Menstabilkan Wajah...
            </span>
          </div>
        )}

        {/* Floating Prompt Below Chin */}
        <div className="absolute -bottom-8 sm:-bottom-9 inset-x-0 text-center pointer-events-none px-4">
          {isDetected ? (
            <span
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-sm font-bold border backdrop-blur-md shadow-lg ${
                isBlue
                  ? "bg-blue-950/85 border-blue-400 text-blue-200"
                  : "bg-emerald-950/85 border-emerald-400 text-emerald-200"
              }`}
            >
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400 animate-ping flex-shrink-0"></span>
              <span className="truncate">
                Wajah Terdeteksi! Tahan posisi...
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-sm font-semibold bg-black/70 border border-white/20 text-slate-300 backdrop-blur-md shadow-lg">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-slate-400 flex-shrink-0"></span>
              <span className="truncate">Posisikan wajah di dalam siluet</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
