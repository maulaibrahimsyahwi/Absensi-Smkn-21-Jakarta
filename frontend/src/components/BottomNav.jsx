import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Camera,
  FileText,
  ShieldAlert,
  ClipboardCheck,
  BarChart3,
  Users,
  GraduationCap,
  User,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ProfileModal from "./ProfileModal";

/**
 * Komponen Bottom Navigation Bar Khusus Smartphone (HP) & Tablet Kecil (< 768px).
 * Memberikan pengalaman navigasi jempol yang ergonomis, cepat, dan mirip aplikasi mobile native.
 */
export default function BottomNav() {
  const location = useLocation();
  const { user, isAuthenticated, isSiswa, isPiket, isAdmin } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Jangan tampilkan pada pengunjung yang belum login atau di halaman kiosk kamera fullscreen
  if (!isAuthenticated) return null;
  if (
    location.pathname === "/harian" ||
    location.pathname === "/perpus" ||
    location.pathname === "/libur"
  ) {
    return null;
  }

  const isAlumni = isSiswa && user?.status === "Alumni";

  // Item navigasi berdasarkan peran pengguna
  let navItems = [];

  if (isSiswa) {
    if (isAlumni) {
      navItems = [
        {
          to: "/portal-siswa",
          label: "Beranda",
          icon: <Home className="w-5 h-5" />,
          active: location.pathname === "/portal-siswa",
        },
        {
          type: "profile",
          label: "Profil",
          icon: user?.foto_profil ? (
            <img
              src={user.foto_profil}
              alt="Profil"
              className="w-5 h-5 rounded-full object-cover border border-slate-300"
            />
          ) : (
            <User className="w-5 h-5" />
          ),
          active: false,
        },
      ];
    } else {
      navItems = [
        {
          to: "/portal-siswa",
          label: "Beranda",
          icon: <Home className="w-5 h-5" />,
          active: location.pathname === "/portal-siswa",
        },
        {
          to: "/izin",
          label: "Izin/Sakit",
          icon: <FileText className="w-5 h-5" />,
          active: location.pathname === "/izin",
        },
        {
          to: "/harian",
          label: "Absen Wajah",
          isPrimary: true,
          icon: <Camera className="w-5 h-5" />,
          active: location.pathname === "/harian",
        },
        {
          to: "/pelanggaran",
          label: "Buku Saku",
          icon: <ShieldAlert className="w-5 h-5" />,
          active: location.pathname === "/pelanggaran",
        },
        {
          type: "profile",
          label: "Profil",
          icon: user?.foto_profil ? (
            <img
              src={user.foto_profil}
              alt="Profil"
              className="w-5 h-5 rounded-full object-cover border border-slate-300"
            />
          ) : (
            <User className="w-5 h-5" />
          ),
          active: false,
        },
      ];
    }
  } else if (isPiket && !isAdmin) {
    navItems = [
      {
        to: "/portal-piket",
        label: "Beranda",
        icon: <Home className="w-5 h-5" />,
        active: location.pathname === "/portal-piket",
      },
      {
        to: "/piket",
        label: "Meja Piket",
        icon: <ClipboardCheck className="w-5 h-5" />,
        active: location.pathname === "/piket",
      },
      {
        to: "/harian",
        label: "Scan Kiosk",
        isPrimary: true,
        icon: <Camera className="w-5 h-5" />,
        active: location.pathname === "/harian",
      },
      {
        to: "/pelanggaran",
        label: "Catat Poin",
        icon: <ShieldAlert className="w-5 h-5" />,
        active: location.pathname === "/pelanggaran",
      },
      {
        to: "/dashboard",
        label: "Monitor",
        icon: <BarChart3 className="w-5 h-5" />,
        active: location.pathname === "/dashboard",
      },
    ];
  } else if (isAdmin) {
    navItems = [
      {
        to: "/portal-admin",
        label: "Beranda",
        icon: <Home className="w-5 h-5" />,
        active: location.pathname === "/portal-admin",
      },
      {
        to: "/dashboard",
        label: "Dashboard",
        icon: <BarChart3 className="w-5 h-5" />,
        active: location.pathname === "/dashboard",
      },
      {
        to: "/registrasi",
        label: "Data Siswa",
        icon: <Users className="w-5 h-5" />,
        active: location.pathname === "/registrasi",
      },
      {
        to: "/piket",
        label: "Meja Piket",
        icon: <ClipboardCheck className="w-5 h-5" />,
        active: location.pathname === "/piket",
      },
      {
        to: "/harian",
        label: "Scan Kiosk",
        isPrimary: true,
        icon: <Camera className="w-5 h-5" />,
        active: location.pathname === "/harian",
      },
    ];
  }

  return (
    <>
      <nav
        aria-label="Navigasi Bawah Smartphone"
        className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 z-40 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)] safe-area-bottom-nav select-none"
      >
        <div className="flex items-center justify-around px-2 py-1 max-w-lg mx-auto">
          {navItems.map((item, idx) => {
            if (item.type === "profile") {
              return (
                <button
                  key={`nav-profile-${idx}`}
                  type="button"
                  onClick={() => setShowProfileModal(true)}
                  className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all cursor-pointer active:scale-90 ${
                    item.active
                      ? "text-blue-600 font-extrabold"
                      : "text-slate-500 hover:text-slate-800 font-semibold"
                  }`}
                >
                  <div className="p-1 rounded-lg transition-transform">
                    {item.icon}
                  </div>
                  <span className="text-[10px] leading-tight mt-0.5 tracking-tight truncate max-w-[64px]">
                    {item.label}
                  </span>
                </button>
              );
            }

            if (item.isPrimary) {
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex flex-col items-center justify-center flex-1 -mt-4 group active:scale-95 transition-all"
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                      item.active
                        ? "bg-blue-600 text-white shadow-blue-500/40 ring-4 ring-blue-100"
                        : "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-blue-600/30"
                    }`}
                  >
                    {item.icon}
                  </div>
                  <span
                    className={`text-[10px] font-extrabold mt-1 tracking-tight truncate max-w-[64px] ${
                      item.active ? "text-blue-600" : "text-slate-700"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all active:scale-90 ${
                  item.active
                    ? "text-blue-600 font-extrabold"
                    : "text-slate-500 hover:text-slate-800 font-semibold"
                }`}
              >
                <div
                  className={`p-1 rounded-lg transition-transform ${
                    item.active ? "bg-blue-50 text-blue-600 scale-105" : ""
                  }`}
                >
                  {item.icon}
                </div>
                <span className="text-[10px] leading-tight mt-0.5 tracking-tight truncate max-w-[64px]">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Profile Modal triggered by Bottom Nav */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        initialTab="profil"
      />
    </>
  );
}
