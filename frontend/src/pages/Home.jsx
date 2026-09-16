import React from "react";
import { Link } from "react-router-dom";
import { Camera, BookOpen, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <section
      aria-label="Menu Utama Presensi"
      className="min-h-[calc(100vh-8rem)] flex flex-col justify-center items-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto"
    >
      {/* Clean Title */}
      <div className="text-center mb-8 sm:mb-10">
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Presensi Siswa{" "}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            SMKN 21 Jakarta
          </span>
        </h1>
      </div>

      {/* Main Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 max-w-3xl w-full">
        {/* Card 1: Absensi Harian */}
        <Link
          to="/harian"
          className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-500/80 p-6 sm:p-8 transition-all duration-200 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-200 mb-5 sm:mb-6">
              <Camera className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
              Absensi Harian
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Catat kehadiran harian siswa dengan pemindaian wajah otomatis.
            </p>
          </div>

          <div className="pt-5 sm:pt-6 mt-5 sm:mt-6 border-t border-slate-100 flex items-center justify-between font-semibold text-xs sm:text-sm text-blue-600 group-hover:text-blue-700">
            <span>Buka Presensi Harian</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </div>
        </Link>

        {/* Card 2: Absensi Perpustakaan */}
        <Link
          to="/perpus"
          className="group bg-white rounded-2xl border border-slate-200 hover:border-emerald-500/80 p-6 sm:p-8 transition-all duration-200 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200 mb-5 sm:mb-6">
              <BookOpen className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
              Absensi Perpustakaan
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Catat kunjungan perpustakaan dan pilih keperluan kunjungan Anda.
            </p>
          </div>

          <div className="pt-5 sm:pt-6 mt-5 sm:mt-6 border-t border-slate-100 flex items-center justify-between font-semibold text-xs sm:text-sm text-emerald-600 group-hover:text-emerald-700">
            <span>Buka Presensi Perpus</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </div>
        </Link>
      </div>
    </section>
  );
}
