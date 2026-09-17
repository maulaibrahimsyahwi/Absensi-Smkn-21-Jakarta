import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  School,
  Clock,
  Calendar,
  BarChart3,
  Home,
  UserPlus,
  FileText,
  ClipboardCheck,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

export default function Navbar() {
  const location = useLocation();
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target) &&
        !e.target.closest("button[data-mobile-menu-toggle]")
      ) {
        setMobileMenuOpen(false);
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [mobileMenuOpen]);

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
  const isPiket = location.pathname === "/piket";

  const navItems = [
    {
      to: "/",
      label: "Beranda",
      shortLabel: "Beranda",
      desc: "Menu utama sistem presensi",
      icon: <Home className="w-4 h-4" />,
      active: isHome,
      color: "blue",
    },
    {
      to: "/piket",
      label: "Meja Guru Piket",
      shortLabel: "Meja Piket",
      desc: "Penerbitan surat izin masuk & keluar",
      icon: <ClipboardCheck className="w-4 h-4" />,
      active: isPiket,
      color: "blue",
    },
    {
      to: "/izin",
      label: "Surat Izin / Sakit",
      shortLabel: "Surat Izin",
      desc: "Portal mandiri pengajuan izin siswa",
      icon: <FileText className="w-4 h-4" />,
      active: isIzin,
      color: "rose",
    },
    {
      to: "/registrasi",
      label: "Data & Wajah Siswa",
      shortLabel: "Daftar Wajah",
      desc: "Registrasi biometrik & manajemen siswa",
      icon: <UserPlus className="w-4 h-4" />,
      active: isRegistrasi,
      color: "indigo",
    },
    {
      to: "/dashboard",
      label: "Dashboard Rekap",
      shortLabel: "Dashboard",
      desc: "Rekapitulasi kehadiran & perpustakaan",
      icon: <BarChart3 className="w-4 h-4" />,
      active: isDashboard,
      color: "blue",
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 h-16 flex items-center justify-between gap-2">
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

        {/* Live Clock & Status (Desktop >= md) */}
        <div className="hidden lg:flex items-center gap-4 bg-slate-50 border border-slate-200/70 rounded-full px-4 py-1.5 text-xs text-slate-600">
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

        {/* Navigation Actions (Desktop >= md) */}
        <div className="hidden md:flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {!isHome && (
            <Link
              to="/"
              title="Beranda"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Beranda</span>
            </Link>
          )}
          <Link
            to="/piket"
            title="Meja Guru Piket (Surat Masuk/Keluar Kelas)"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-colors ${
              isPiket
                ? "bg-blue-600 text-white shadow-xs shadow-blue-500/30"
                : "text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200"
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Meja Piket</span>
          </Link>
          <Link
            to="/izin"
            title="Pengajuan Surat Izin / Sakit"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-colors ${
              isIzin
                ? "bg-rose-600 text-white shadow-xs shadow-rose-500/30"
                : "text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Surat Izin/Sakit</span>
          </Link>
          <Link
            to="/registrasi"
            title="Daftar & Database Wajah Siswa"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-colors ${
              isRegistrasi
                ? "bg-indigo-600 text-white shadow-xs shadow-indigo-500/30"
                : "text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Daftar Wajah</span>
          </Link>
          <Link
            to="/dashboard"
            title="Dashboard Rekapitulasi Presensi"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-colors ${
              isDashboard
                ? "bg-blue-600 text-white shadow-xs shadow-blue-500/30"
                : "text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard Rekap</span>
          </Link>
        </div>

        {/* Mobile Actions: Current Active Pill & Hamburger Button (< md) */}
        <div className="flex md:hidden items-center gap-1.5">
          <button
            type="button"
            data-mobile-menu-toggle="true"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={
              mobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"
            }
            aria-expanded={mobileMenuOpen}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
              mobileMenuOpen
                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
            }`}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown Drawer (< md) */}
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="md:hidden border-t border-slate-200/80 bg-white shadow-xl animate-in slide-in-from-top-2 duration-150 px-4 py-3.5 space-y-1.5"
        >
          {/* Header Mobile Info (Tanggal & Jam) */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl mb-2 text-xs text-slate-600">
            <span className="font-medium text-[11px] text-slate-500 truncate">
              {dateStr || "SMKN 21 Jakarta"}
            </span>
            <span className="font-bold text-blue-600 text-xs whitespace-nowrap">
              {timeStr || "00:00 WIB"}
            </span>
          </div>

          {/* Menu Items List */}
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                item.active
                  ? item.color === "rose"
                    ? "bg-rose-50 text-rose-800 border border-rose-200 font-bold"
                    : item.color === "indigo"
                      ? "bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold"
                      : "bg-blue-50 text-blue-800 border border-blue-200 font-bold"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent font-medium"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    item.active
                      ? item.color === "rose"
                        ? "bg-rose-600 text-white"
                        : item.color === "indigo"
                          ? "bg-indigo-600 text-white"
                          : "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-tight truncate">
                    {item.label}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 flex-shrink-0 ${
                  item.active ? "text-blue-600" : "text-slate-300"
                }`}
              />
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
