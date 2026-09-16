import React from "react";
import { Sliders, ChevronLeft, ChevronRight } from "lucide-react";

export default function DashboardPagination({
  displayLimit,
  setDisplayLimit,
  currentPage,
  setCurrentPage,
  totalItems,
  totalPages,
  safeCurrentPage,
  startIndex,
  endIndex,
}) {
  return (
    <div className="px-3.5 sm:px-6 py-3 bg-slate-50/80 border-b border-slate-200/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
      {/* Kontrol Slider & Preset */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="font-semibold text-slate-700">Batas Tampilan</span>
        </div>

        {/* Preset Buttons */}
        <div className="flex items-center gap-1">
          {[15, 20, 25, 50].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setDisplayLimit(preset);
                setCurrentPage(1);
              }}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                displayLimit === preset
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Info Range & Pagination Controls */}
      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200/60">
        <span className="text-slate-500 font-medium text-[11px] sm:text-xs">
          {totalItems === 0 ? (
            "0 data"
          ) : (
            <>
              Menampilkan{" "}
              <strong className="text-slate-800 font-bold">
                {startIndex + 1}–{endIndex}
              </strong>{" "}
              dari{" "}
              <strong className="text-slate-800 font-bold">{totalItems}</strong>{" "}
              data
            </>
          )}
        </span>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 sm:px-2 sm:py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center gap-1 transition-all cursor-pointer"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg">
              {safeCurrentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 sm:px-2 sm:py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center gap-1 transition-all cursor-pointer"
              title="Halaman Selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
