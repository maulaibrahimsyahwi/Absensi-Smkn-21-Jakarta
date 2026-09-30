import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ProfileModal from "./ProfileModal";
import logoSMKN21 from "../assets/Logo SMKN21.png";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, isAuthenticated, isAdmin, isPiket, isSiswa, logout } =
    useAuth();

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState("profil");

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
    } else if (!user?.terdaftar) {
      // Siswa SMKN 21 Aktif tetapi belum merekam biometrik wajah (fitur operasional dikunci)
      navItems = [
        {
          to: "/portal-siswa",
          label:
            user?.jenis_kelamin === "Perempuan"
              ? "Portal Siswi"
              : "Portal Siswa",
          shortLabel: "Beranda",
          desc: "Rekap & status biometrik wajah",
          icon: <GraduationCap className="w-4 h-4" />,
          active: isPortalSiswa,
          color: "blue",
        },
      ];
    } else {
      // Siswa SMKN 21 Aktif yang sudah terdaftar biometrik (Akses Penuh)
      navItems = [
        {
          to: "/portal-siswa",
          label:
            user?.jenis_kelamin === "Perempuan"
              ? "Portal Siswi"
              : "Portal Siswa",
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
        label: "Absensi Siswa",
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
        desc: "Rekapitulasi presensi & operasional siswa",
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
          <div className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl bg-white border border-slate-200/80 p-1 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform flex-shrink-0">
            <img
              src={logoSMKN21}
              alt="Logo SMKN 21"
              className="w-full h-full object-contain"
            />
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

        {/* Right Actions: Profile Button & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {isAuthenticated ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                title="Keluar dari akun"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50/80 hover:bg-rose-100 border border-rose-200/60 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
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

      {/* Profile & Settings Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        initialTab={profileInitialTab}
      />
    </header>
  );
}
