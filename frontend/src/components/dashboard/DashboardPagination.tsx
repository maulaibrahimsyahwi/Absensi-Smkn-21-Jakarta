import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface DashboardPaginationProps {
  displayLimit: number;
  setDisplayLimit: (limit: number) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalItems: number;
  totalPages: number;
  safeCurrentPage: number;
  startIndex: number;
  endIndex: number;
  variant?: "toolbar" | "footer";
  scrollTargetId?: string;
}

const PRESETS = [15, 25, 50];

export default function DashboardPagination({
  displayLimit,
  setDisplayLimit,
  setCurrentPage,
  totalItems,
  totalPages,
  safeCurrentPage,
  startIndex,
  endIndex,
  variant = "toolbar",
  scrollTargetId,
}: DashboardPaginationProps) {
  const go = (p: number) => {
    setCurrentPage(Math.min(totalPages, Math.max(1, p)));
    if (scrollTargetId) {
      document
        .getElementById(scrollTargetId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const range =
    totalItems === 0
      ? "0 data"
      : `${startIndex + 1}-${endIndex} dari ${totalItems.toLocaleString("id-ID")}`;

  const arrow =
    "press grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed sm:h-9 sm:w-9 cursor-pointer select-none";

  const pager = totalPages > 1 && (
    <nav aria-label="Navigasi halaman" className="flex items-center gap-1.5 select-none">
      <button
        type="button"
        disabled={safeCurrentPage <= 1}
        onClick={() => go(safeCurrentPage - 1)}
        aria-label="Halaman sebelumnya"
        className={arrow}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span
        aria-live="polite"
        className="min-w-[4.5rem] text-center text-xs font-semibold tabular-nums text-slate-700"
      >
        {safeCurrentPage} / {totalPages}
      </span>
      <button
        type="button"
        disabled={safeCurrentPage >= totalPages}
        onClick={() => go(safeCurrentPage + 1)}
        aria-label="Halaman berikutnya"
        className={arrow}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );

  if (variant === "footer") {
    return (
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
        <p className="text-xs text-slate-500 font-medium">{range}</p>
        {pager}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-slate-50/80 px-3 py-2 sm:px-6">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">Tampilkan</span>
        <div role="group" aria-label="Jumlah baris" className="flex gap-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={displayLimit === p}
              onClick={() => {
                setDisplayLimit(p);
                setCurrentPage(1);
              }}
              className={`press min-h-9 min-w-9 rounded-lg px-2 text-xs font-bold transition-colors cursor-pointer ${
                displayLimit === p
                  ? "bg-blue-600 text-white shadow-xs"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <p className="text-xs text-slate-500 font-medium">{range}</p>
        <div className="hidden sm:block">{pager}</div>
      </div>
    </div>
  );
}
