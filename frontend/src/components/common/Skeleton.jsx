import React from "react";

/**
 * Komponen Skeleton dasar dengan animasi denyut shimmer modern.
 */
export function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 rounded-xl ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton untuk baris teks atau label.
 */
export function SkeletonLine({
  width = "w-full",
  height = "h-4",
  className = "",
}) {
  return <Skeleton className={`${width} ${height} rounded-md ${className}`} />;
}

/**
 * Skeleton untuk card metrik / statistik.
 */
export function SkeletonCard({ className = "" }) {
  return (
    <div
      className={`bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4 ${className}`}
    >
      <Skeleton className="w-12 h-12 rounded-2xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonLine width="w-24" height="h-3" />
        <SkeletonLine width="w-32" height="h-6" />
      </div>
    </div>
  );
}

/**
 * Skeleton untuk tabel data responsif.
 */
export function SkeletonTable({ rows = 5, cols = 5, className = "" }) {
  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <div className="bg-slate-50/80 border-b border-slate-200 p-4 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton
            key={`th-${i}`}
            className="h-3.5 flex-1 rounded-md bg-slate-300/70"
          />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={`tr-${rIdx}`} className="p-4 flex items-center gap-4">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <Skeleton
                key={`td-${rIdx}-${cIdx}`}
                className={`h-4 rounded-md ${
                  cIdx === 0 ? "w-24 flex-shrink-0" : "flex-1"
                } ${rIdx % 2 === 0 ? "bg-slate-200/70" : "bg-slate-150"}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton fallback layar penuh untuk Lazy Loading halaman router (menggantikan PageLoader lama).
 */
export function PageSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Hero Banner Skeleton */}
      <div className="bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-3xl p-6 sm:p-8 animate-pulse border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-3 max-w-md w-full">
          <Skeleton className="w-24 h-4 rounded-full bg-slate-300" />
          <Skeleton className="w-48 sm:w-64 h-7 rounded-xl bg-slate-300" />
          <Skeleton className="w-full h-3.5 rounded-md bg-slate-300/80" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="w-24 h-9 rounded-xl bg-slate-300" />
          <Skeleton className="w-9 h-9 rounded-xl bg-slate-300" />
        </div>
      </div>

      {/* Grid 3 Stats Card Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Main Content Area Skeleton */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-2">
            <SkeletonLine width="w-40" height="h-5" />
            <SkeletonLine width="w-60" height="h-3" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="w-24 h-8 rounded-xl" />
            <Skeleton className="w-28 h-8 rounded-xl" />
          </div>
        </div>
        <SkeletonTable rows={4} cols={5} />
      </div>
    </div>
  );
}

export default PageSkeleton;
