import React from "react";

export default function RealtimeBadge({ label = "Realtime", className = "" }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50/80 border border-emerald-200/80 text-emerald-700 text-[11px] font-semibold tracking-wide shadow-2xs select-none ${className}`}
      title="Data tersinkronisasi otomatis secara realtime"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span>{label}</span>
    </div>
  );
}
