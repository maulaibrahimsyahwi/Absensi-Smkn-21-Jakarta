import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  School,
  Clock,
  Calendar,
  BarChart3,
  Home,
  UserPlus,
  FileText,
} from "lucide-react";

export default function Navbar() {
  const location = useLocation();
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " WIB",
      );
      setDateStr(
        now.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isHome = location.pathname === "/";
  const isDashboard = location.pathname === "/dashboard";
  const isRegistrasi = location.pathname === "/registrasi";
  const isIzin = location.pathname === "/izin";

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2 sm:gap-3 group min-w-0 flex-shrink-0"
        >
          <div className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
            <School className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-slate-900 tracking-tight text-sm sm:text-lg truncate">
                SMKN 21
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium hidden sm:block truncate">
              Sistem Presensi & Perpustakaan
            </p>
          </div>
        </Link>

        {/* Live Clock & Status */}
        <div className="hidden md:flex items-center gap-4 bg-slate-50 border border-slate-200/70 rounded-full px-4 py-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{dateStr || "Memuat tanggal..."}</span>
          </div>
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{timeStr || "00:00:00 WIB"}</span>
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {!isHome && (
            <Link
              to="/"
              title="Beranda"
              className="inline-flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg sm:rounded-xl transition-colors"
            >
              <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Beranda</span>
            </Link>
          )}
          <Link
            to="/izin"
            title="Pengajuan Surat Izin / Sakit"
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl transition-colors ${
              isIzin
                ? "bg-rose-600 text-white shadow-xs shadow-rose-500/30"
                : "text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden md:inline">Surat Izin/Sakit</span>
            <span className="md:hidden">Izin</span>
          </Link>
          <Link
            to="/registrasi"
            title="Daftar & Database Wajah Siswa"
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl transition-colors ${
              isRegistrasi
                ? "bg-indigo-600 text-white shadow-xs shadow-indigo-500/30"
                : "text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden md:inline">Daftar Wajah</span>
            <span className="md:hidden">Wajah</span>
          </Link>
          <Link
            to="/dashboard"
            title="Dashboard Rekapitulasi Presensi"
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl transition-colors ${
              isDashboard
                ? "bg-blue-600 text-white shadow-xs shadow-blue-500/30"
                : "text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden md:inline">Dashboard Rekap</span>
            <span className="md:hidden">Rekap</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
