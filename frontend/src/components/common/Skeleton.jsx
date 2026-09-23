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
 * Contextual Skeleton untuk Halaman Dashboard Rekapitulasi (max-w-6xl).
 * Mencegah layout shift (pantulan menyusut-membesar) saat membuka Dashboard.
 */
export function DashboardSkeleton() {
  return (
    <div className="py-6 sm:py-8 px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-4">
      {/* 1. Header Filter Bar Skeleton */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-1.5">
            <SkeletonLine width="w-36" height="h-5" />
            <SkeletonLine width="w-48" height="h-3.5" />
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
      </div>

      {/* 2. KPI Metric Summary Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`kpi-skel-${i}`}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <SkeletonLine width="w-20" height="h-3" />
              <Skeleton className="w-7 h-7 rounded-lg" />
            </div>
            <SkeletonLine width="w-16" height="h-6" />
            <SkeletonLine width="w-28" height="h-2.5" />
          </div>
        ))}
      </div>

      {/* 3. Kategori Utama Tabs Skeleton */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl flex flex-col sm:flex-row gap-1.5 border border-slate-200 shadow-2xs">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 flex-1 rounded-xl" />
      </div>

      {/* 4. Main Table Card Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 px-4 sm:px-6 py-3 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="w-36 h-9 rounded-xl" />
            <Skeleton className="w-32 h-9 rounded-xl" />
          </div>
          <Skeleton className="w-48 h-9 rounded-xl" />
        </div>
        <div className="overflow-hidden">
          <SkeletonTable rows={7} cols={6} />
        </div>
      </div>
    </div>
  );
}

/**
 * Contextual Skeleton untuk Halaman Registrasi Siswa (max-w-7xl, 2-Column Grid).
 * Mencegah bouncing akibat unmount/mount hero banner yang tidak ada di Registrasi.
 */
export function RegistrasiSkeleton() {
  return (
    <div className="py-6 sm:py-8 px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-1.5">
            <SkeletonLine width="w-56" height="h-6" />
            <SkeletonLine width="w-72" height="h-3.5" />
          </div>
        </div>
        <Skeleton className="w-24 h-9 rounded-xl" />
      </div>

      {/* Main Grid: Form Left, Student Table Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-4">
        {/* Kolom Kiri: Form & Kamera */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <SkeletonLine width="w-40" height="h-5" />
            <Skeleton className="w-full aspect-video rounded-2xl" />
            <div className="space-y-3">
              <SkeletonLine width="w-full" height="h-10" />
              <SkeletonLine width="w-full" height="h-10" />
              <SkeletonLine width="w-full" height="h-10" />
            </div>
            <Skeleton className="w-full h-11 rounded-xl" />
          </div>
        </div>

        {/* Kolom Kanan: Student Table */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <Skeleton className="w-full sm:w-64 h-10 rounded-xl" />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Skeleton className="w-24 h-10 rounded-xl" />
                <Skeleton className="w-24 h-10 rounded-xl" />
              </div>
            </div>
            <SkeletonTable rows={8} cols={5} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Contextual Skeleton untuk Halaman Portal (max-w-6xl).
 */
export function PortalSkeleton() {
  return (
    <div className="w-full max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Hero Banner Skeleton */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-200/90 p-6 sm:p-8 animate-pulse border border-slate-200 flex flex-col justify-between min-h-[160px]">
        {/* Top Right Actions */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2">
          <Skeleton className="w-20 h-9 rounded-2xl bg-slate-300" />
          <Skeleton className="w-9 h-9 rounded-2xl bg-slate-300" />
        </div>

        {/* Center / Left Info */}
        <div className="flex items-center gap-4 pt-8 sm:pt-2">
          <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-300 flex-shrink-0" />
          <div className="space-y-2">
            <Skeleton className="w-24 h-4 rounded-full bg-slate-300" />
            <Skeleton className="w-48 sm:w-64 h-7 rounded-xl bg-slate-300" />
            <Skeleton className="w-36 h-3.5 rounded-md bg-slate-300" />
          </div>
        </div>
      </div>

      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`portal-skel-card-${i}`}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2"
          >
            <Skeleton className="w-10 h-10 rounded-xl" />
            <SkeletonLine width="w-24" height="h-4" />
            <SkeletonLine width="w-16" height="h-3" />
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
        <SkeletonLine width="w-48" height="h-5" />
        <SkeletonTable rows={5} cols={5} />
      </div>
    </div>
  );
}

/**
 * Skeleton fallback umum (General / Fallback).
 */
export function PageSkeleton() {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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

/**
 * Contextual Skeleton untuk Halaman Guru Piket (/piket, max-w-7xl, 2-Column Grid).
 * Menggantikan skeleton beranda hero banner yang tidak sesuai dengan formulir penerbitan & log izin.
 */
export function PiketSkeleton() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-6 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-1.5">
            <SkeletonLine width="w-64" height="h-6" />
            <SkeletonLine width="w-48" height="h-3.5" />
          </div>
        </div>
      </div>

      {/* 2-Column Grid: Form Kiri (5 cols), Table Kanan (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kolom Kiri: Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <SkeletonLine width="w-40" height="h-5" />
            <SkeletonLine width="w-24" height="h-3" />
          </div>
          <div className="space-y-3">
            <SkeletonLine width="w-28" height="h-3.5" />
            <Skeleton className="w-full h-11 rounded-xl" />
          </div>
          <div className="space-y-3">
            <SkeletonLine width="w-24" height="h-3.5" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
            </div>
          </div>
          <div className="space-y-3">
            <SkeletonLine width="w-32" height="h-3.5" />
            <Skeleton className="w-full h-20 rounded-xl" />
          </div>
          <Skeleton className="w-full h-11 rounded-xl" />
        </div>

        {/* Kolom Kanan: Log Riwayat Surat Piket */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <SkeletonLine width="w-48" height="h-5" />
            <Skeleton className="w-28 h-8 rounded-xl" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="flex-1 h-10 rounded-xl" />
            <Skeleton className="w-28 h-10 rounded-xl" />
          </div>
          <SkeletonTable rows={6} cols={4} />
        </div>
      </div>
    </div>
  );
}

/**
 * Contextual Skeleton untuk Catat Pelanggaran (/pelanggaran, max-w-3xl).
 */
export function PelanggaranSkeleton() {
  return (
    <div className="min-h-[calc(100vh-4rem)] py-6 sm:py-10 px-3 sm:px-6 lg:px-8 max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-1.5">
              <SkeletonLine width="w-48" height="h-5" />
              <SkeletonLine width="w-64" height="h-3" />
            </div>
          </div>
        </div>
        <div className="p-5 sm:p-7 space-y-5">
          <div className="space-y-2">
            <SkeletonLine width="w-28" height="h-3.5" />
            <Skeleton className="w-full h-11 rounded-xl" />
          </div>
          <div className="space-y-2">
            <SkeletonLine width="w-32" height="h-3.5" />
            <Skeleton className="w-full h-11 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-11 rounded-xl" />
            <Skeleton className="h-11 rounded-xl" />
          </div>
          <Skeleton className="w-full h-24 rounded-xl" />
          <Skeleton className="w-full h-12 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * Contextual Skeleton untuk Pengajuan Izin (/izin, max-w-2xl).
 */
export function IzinSkeleton() {
  return (
    <div className="min-h-[calc(100vh-4rem)] py-6 sm:py-10 px-3 sm:px-6 lg:px-8 max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-5 sm:px-7 sm:py-6 border-b border-slate-100 flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-1.5">
            <SkeletonLine width="w-44" height="h-5" />
            <SkeletonLine width="w-60" height="h-3" />
          </div>
        </div>
        <div className="p-5 sm:p-7 space-y-4">
          <Skeleton className="w-full h-11 rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-11 rounded-xl" />
            <Skeleton className="h-11 rounded-xl" />
          </div>
          <Skeleton className="w-full h-24 rounded-xl" />
          <Skeleton className="w-full h-12 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * RouteAwareSkeleton: Menyesuaikan tampilan loading skeleton secara otomatis
 * dengan rute URL tujuan, mengeliminasi layout jump & bouncing saat navigasi lazy-loading.
 */
export function RouteAwareSkeleton() {
  if (typeof window === "undefined") return <PageSkeleton />;
  const pathname = window.location.pathname;

  if (pathname.startsWith("/dashboard")) {
    return <DashboardSkeleton />;
  }
  if (pathname.startsWith("/registrasi")) {
    return <RegistrasiSkeleton />;
  }
  if (pathname.startsWith("/piket")) {
    return <PiketSkeleton />;
  }
  if (pathname.startsWith("/pelanggaran")) {
    return <PelanggaranSkeleton />;
  }
  if (pathname.startsWith("/izin")) {
    return <IzinSkeleton />;
  }
  if (pathname.startsWith("/portal")) {
    return <PortalSkeleton />;
  }
  return <PageSkeleton />;
}

export default RouteAwareSkeleton;
