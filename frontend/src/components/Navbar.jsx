import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  School,
  Clock,
  Calendar,
  BarChart3,
  Home,
  UserPlus,
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

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2.5 sm:gap-3 group min-w-0"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
            <School className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-slate-900 tracking-tight text-sm sm:text-lg truncate">
                SMKN 21
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.2 sm:py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60 flex-shrink-0">
                Official
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
          <span className="text-slate-300">•</span>
          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Online</span>
          </div>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {!isHome && (
            <Link
              to="/"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Beranda</span>
            </Link>
          )}
          <Link
            to="/registrasi"
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
              isRegistrasi
                ? "bg-indigo-600 text-white shadow-xs shadow-indigo-500/30"
                : "text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Daftar Wajah Siswa</span>
            <span className="sm:hidden">Wajah</span>
          </Link>
          <Link
            to="/dashboard"
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
              isDashboard
                ? "bg-blue-600 text-white shadow-xs shadow-blue-500/30"
                : "text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Dashboard Rekap</span>
            <span className="sm:hidden">Rekap</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
