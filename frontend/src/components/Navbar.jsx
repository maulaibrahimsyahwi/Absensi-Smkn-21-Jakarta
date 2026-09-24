import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  School,
  BarChart3,
  Home,
  UserPlus,
  FileText,
  ClipboardCheck,
  Menu,
  X,
  ChevronRight,
  LogOut,
  LogIn,
  GraduationCap,
  ShieldCheck,
  ShieldAlert,
  Camera,
  User,
  KeyRound,
  Smartphone,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ProfileModal from "./ProfileModal";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, isAuthenticated, isAdmin, isPiket, isSiswa, logout } =
    useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState("profil");
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

  const isHome = location.pathname === "/";
  const isDashboard = location.pathname === "/dashboard";
  const isRegistrasi = location.pathname === "/registrasi";
  const isIzin = location.pathname === "/izin";
  const isPiketPath = location.pathname === "/piket";
  const isHarian = location.pathname === "/harian";
  const isPortalSiswa = location.pathname === "/portal-siswa";
  const isPortalPiket = location.pathname === "/portal-piket";
  const isPelanggaran = location.pathname === "/pelanggaran";

  // Konfigurasi Nav Items Dinamis Berdasarkan Role
  let navItems = [];

  if (!isAuthenticated) {
    // Pengunjung / Tamu yang Belum Login: TIDAK menampilkan modul operasional sekolah
    navItems = [];
  } else if (isSiswa) {
    const isAlumni = user?.status === "Alumni";
    if (isAlumni) {
      // Siswa yang sudah berstatus Alumni / Lulus
      navItems = [
        {
          to: "/portal-siswa",
          label: "Portal Alumni",
          shortLabel: "Beranda Alumni",
          desc: "Rekap kelulusan & riwayat pribadi",
          icon: <GraduationCap className="w-4 h-4" />,
          active: isPortalSiswa,
          color: "amber",
        },
      ];
    } else {
      // Siswa SMKN 21 Aktif (Portal, Absen Mandiri, Izin, dan Catat Pelanggaran)
      navItems = [
        {
          to: "/portal-siswa",
          label: "Portal Siswa",
          shortLabel: "Beranda",
          desc: "Rekap, tanda tangan & riwayat pribadi",
          icon: <GraduationCap className="w-4 h-4" />,
          active: isPortalSiswa,
          color: "blue",
        },
        {
          to: "/harian",
          label: "Presensi Mandiri",
          shortLabel: "Absen",
          desc: "Scan wajah & GPS sekolah",
          icon: <Camera className="w-4 h-4" />,
          active: isHarian,
          color: "emerald",
        },
        {
          to: "/izin",
          label: "Pengajuan Izin",
          shortLabel: "Surat Izin",
          desc: "Kirim surat izin sakit / keperluan",
          icon: <FileText className="w-4 h-4" />,
          active: isIzin,
          color: "rose",
        },
        {
          to: "/pelanggaran",
          label: "Catat Pelanggaran",
          shortLabel: "Pelanggaran",
          desc: "Buku saku catatan pelanggaran",
          icon: <ShieldAlert className="w-4 h-4" />,
          active: isPelanggaran,
          color: "rose",
        },
      ];
    }
  } else if (isPiket) {
    // Guru Piket
    navItems = [
      {
        to: "/portal-piket",
        label: "Beranda Guru Piket",
        shortLabel: "Beranda",
        desc: "Ringkasan tugas, profil & status piket",
        icon: <Home className="w-4 h-4" />,
        active: isPortalPiket,
        color: "blue",
      },
      {
        to: "/piket",
        label: "Meja Guru Piket",
        shortLabel: "Meja Piket",
        desc: "Penerbitan surat izin masuk & keluar",
        icon: <ClipboardCheck className="w-4 h-4" />,
        active: isPiketPath,
        color: "blue",
      },
      {
        to: "/pelanggaran",
        label: "Catat Pelanggaran",
        shortLabel: "Pelanggaran",
        desc: "Catat pelanggaran siswa yang ditegur",
        icon: <ShieldAlert className="w-4 h-4" />,
        active: isPelanggaran,
        color: "rose",
      },
      {
        to: "/dashboard",
        label: "Dashboard Piket",
        shortLabel: "Dashboard",
        desc: "Verifikasi izin & rekapitulasi piket",
        icon: <BarChart3 className="w-4 h-4" />,
        active: isDashboard,
        color: "blue",
      },
      {
        to: "/harian",
        label: "Absensi Backup Kiosk",
        shortLabel: "Absensi Siswa",
        desc: "Scan siswa yang lupa bawa HP",
        icon: <Camera className="w-4 h-4" />,
        active: isHarian,
        color: "emerald",
      },
    ];
  } else {
    // Admin Sekolah (Akses Penuh)
    navItems = [
      {
        to: "/portal-admin",
        label: "Beranda Admin",
        shortLabel: "Beranda",
        desc: "Ringkasan statistik & pusat manajemen",
        icon: <Home className="w-4 h-4" />,
        active: location.pathname === "/portal-admin",
        color: "purple",
      },
      {
        to: "/piket",
        label: "Meja Guru Piket",
        shortLabel: "Meja Piket",
        desc: "Penerbitan surat izin masuk & keluar",
        icon: <ClipboardCheck className="w-4 h-4" />,
        active: isPiketPath,
        color: "blue",
      },
      {
        to: "/pelanggaran",
        label: "Catat Pelanggaran",
        shortLabel: "Pelanggaran",
        desc: "Buku catatan pelanggaran siswa",
        icon: <ShieldAlert className="w-4 h-4" />,
        active: isPelanggaran,
        color: "rose",
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
        shortLabel: "Data Siswa",
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
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <Link
          to={
            isSiswa
              ? "/portal-siswa"
              : isPiket
                ? "/portal-piket"
                : isAdmin
                  ? "/portal-admin"
                  : "/"
          }
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
              {isAuthenticated
                ? `${user?.nama || user?.username}${user?.kelas ? ` • ${user.kelas}` : ""}`
                : "Sistem Presensi SMKN 21 Jakarta"}
            </p>
          </div>
        </Link>

        {/* Right Actions: Profile Button, Logout Button, and Menu Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Tombol Pasang App PWA */}
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("show-pwa-prompt"))
            }
            title="Pasang Aplikasi SMKN 21 di Layar Utama HP"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Pasang App</span>
          </button>

          {isAuthenticated ? (
            <>
              {/* Tombol Keluar Cepat (Hanya tampil di Laptop & Desktop >= 1024px) */}
              <button
                type="button"
                onClick={handleLogout}
                title="Keluar dari akun"
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-rose-600 hover:text-rose-700 bg-rose-50/70 hover:bg-rose-100 border border-rose-200/60 rounded-xl transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Keluar</span>
              </button>

              {/* Tombol Hamburger Toggle Menu (HANYA tampil di Mobile & Tablet < 1024px) */}
              <button
                type="button"
                data-mobile-menu-toggle="true"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                title="Menu Navigasi"
                className={`lg:hidden p-2 rounded-xl border transition-all cursor-pointer ${
                  mobileMenuOpen
                    ? "bg-blue-50 border-blue-200 text-blue-600"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900"
                }`}
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                to="/login"
                title="Masuk ke Akun"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs shadow-blue-500/20"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Dropdown Menu (Hanya untuk Mobile & Tablet < 1024px) */}
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="lg:hidden absolute right-3 sm:right-6 top-16 w-[calc(100vw-1.5rem)] max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl p-3 sm:p-4 space-y-2 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header Info Akun */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600">
            <div className="min-w-0 pr-2">
              <p className="font-bold text-slate-800 truncate">
                {isAuthenticated
                  ? user?.nama || user?.username
                  : "SMKN 21 Jakarta"}
              </p>
            </div>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border uppercase flex-shrink-0 ${
                isAdmin
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : isPiket
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : user?.status === "Alumni"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
              }`}
            >
              {isAdmin
                ? "Admin"
                : isPiket
                  ? "Guru Piket"
                  : user?.status === "Alumni"
                    ? "Alumni"
                    : "Siswa"}
            </span>
          </div>

          {/* Menu Items List */}
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                  item.active
                    ? "bg-blue-50 text-blue-800 border border-blue-200 font-bold"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-transparent font-medium"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      item.active
                        ? "bg-blue-600 text-white"
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
                  className={`w-4 h-4 flex-shrink-0 ${item.active ? "text-blue-600" : "text-slate-300"}`}
                />
              </Link>
            ))}
          </div>

          {/* Tombol Pasang Aplikasi di Mobile Menu */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                window.dispatchEvent(new CustomEvent("show-pwa-prompt"));
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-indigo-900 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/70 font-medium cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-600 text-white">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-xs font-bold leading-tight">
                    Pasang Aplikasi (PWA)
                  </p>
                  <p className="text-[10px] text-indigo-600 truncate mt-0.5">
                    Akses cepat di layar utama tanpa browser bar
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0 text-indigo-400" />
            </button>
          </div>

          {/* User Profile & Logout Action Buttons */}
          {isAuthenticated && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setProfileInitialTab("profil");
                  setShowProfileModal(true);
                }}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-200"
              >
                {user?.foto_profil ? (
                  <img
                    src={user.foto_profil}
                    alt={user?.nama || "Profil"}
                    className="w-5 h-5 rounded-md object-cover border border-slate-300"
                  />
                ) : (
                  <User className="w-4 h-4 text-blue-600" />
                )}
                <span>Profil</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 text-xs font-bold transition-all cursor-pointer"
              >
                <span>Keluar</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Profile & Settings Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        initialTab={profileInitialTab}
      />
    </header>
  );
}
