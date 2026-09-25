import React from "react";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  BookOpen,
} from "lucide-react";

export default function DashboardKpiCards({ stats = {}, isPiket = false }) {
  return (
    <div
      className={`grid gap-3 sm:gap-4 mb-6 sm:mb-8 ${
        isPiket
          ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4"
          : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      }`}
    >
      {/* Total Siswa Terdaftar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
            Total Siswa
          </span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 truncate">
          {stats.total_siswa || 0}
        </div>
      </div>

      {/* Hadir Tepat Waktu */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
            Tepat Waktu
          </span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-emerald-600 truncate">
          {stats.total_tepat_waktu || 0}
        </div>
      </div>

      {/* Terlambat */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
            Terlambat
          </span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-amber-600 truncate">
          {stats.total_terlambat || 0}
        </div>
      </div>

      {/* Sakit & Izin */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
            Sakit & Izin
          </span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
            <HeartPulse className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="flex items-baseline justify-between gap-1 flex-wrap">
          <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-rose-600">
            {(stats.total_sakit || 0) + (stats.total_izin || 0)}
          </span>
          <div className="flex items-center gap-1 text-[10px] font-bold">
            <span
              className="px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/70"
              title={`Sakit: ${stats.total_sakit || 0} Siswa`}
            >
              S {stats.total_sakit || 0}
            </span>
            <span
              className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/70"
              title={`Izin: ${stats.total_izin || 0} Siswa`}
            >
              I {stats.total_izin || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Kunjungan Perpustakaan (Khusus Admin / Bukan Guru Piket) */}
      {!isPiket && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs col-span-2 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Perpustakaan
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-indigo-600 truncate">
            {stats.total_perpus || 0}
          </div>
        </div>
      )}
    </div>
  );
}
