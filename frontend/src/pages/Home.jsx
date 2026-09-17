import React from "react";
import { Link } from "react-router-dom";
import {
  Camera,
  BookOpen,
  ArrowRight,
  FileText,
  ClipboardCheck,
} from "lucide-react";

export default function Home() {
  return (
    <section
      aria-label="Menu Utama Presensi"
      className="min-h-[calc(100vh-8rem)] flex flex-col justify-center items-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 max-w-6xl w-full">
        {/* Card 1: Absensi Harian */}
        <Link
          to="/harian"
          className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-500/80 p-5 sm:p-6 transition-all duration-200 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-200 mb-5">
              <Camera className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
              Absensi Harian
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Catat kehadiran harian siswa dengan pemindaian biometrik wajah
              otomatis.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between font-semibold text-xs text-blue-600 group-hover:text-blue-700">
            <span>Buka Presensi</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </div>
        </Link>

        {/* Card 2: Absensi Perpustakaan */}
        <Link
          to="/perpus"
          className="group bg-white rounded-2xl border border-slate-200 hover:border-emerald-500/80 p-5 sm:p-6 transition-all duration-200 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200 mb-5">
              <BookOpen className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
              Presensi Perpustakaan
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Catat kunjungan perpustakaan dan tentukan keperluan aktivitas
              belajar Anda.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between font-semibold text-xs text-emerald-600 group-hover:text-emerald-700">
            <span>Buka Perpustakaan</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </div>
        </Link>

        {/* Card 3: Meja Guru Piket */}
        <Link
          to="/piket"
          className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-500/80 p-5 sm:p-6 transition-all duration-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200 mb-5">
              <ClipboardCheck className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
              Meja Guru Piket
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Terbitkan surat ijin masuk atau meninggalkan kelas secara instan
              dengan format e-slip resmi.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between font-semibold text-xs text-indigo-600 group-hover:text-indigo-700">
            <span>Buka Meja Piket</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </div>
        </Link>

        {/* Card 4: Pengajuan Surat Izin / Sakit */}
        <Link
          to="/izin"
          className="group bg-white rounded-2xl border border-slate-200 hover:border-rose-500/80 p-5 sm:p-6 transition-all duration-200 shadow-sm hover:shadow-xl hover:shadow-rose-500/5 flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all duration-200 mb-5">
              <FileText className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-rose-600 transition-colors">
              Pengajuan Izin / Sakit
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Portal mandiri siswa & orang tua untuk unggah surat dokter atau
              izin berhalangan.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between font-semibold text-xs text-rose-600 group-hover:text-rose-700">
            <span>Ajukan Surat</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </div>
        </Link>
      </div>
    </section>
  );
}
