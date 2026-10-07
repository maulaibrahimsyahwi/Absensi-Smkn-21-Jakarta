import React, { useState, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Camera,
  FileText,
  ShieldAlert,
  ClipboardCheck,
  BarChart3,
  Users,
  User,
  BookOpen,
  MailPen,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ProfileModal from "./ProfileModal";
import Sheet, { SheetHeader, SheetBody } from "./ui/Sheet";
import { NO_BOTTOM_NAV_ROUTES } from "../utils/navVisibility";
import { getNavEntries, NavEntry } from "../utils/navConfig";

export interface NavItem {
  to?: string;
  type?: "link" | "profile" | "more";
  label: string;
  icon: ReactNode;
  active: boolean;
  isPrimary?: boolean;
}

/**
 * Komponen Bottom Navigation Bar Khusus Smartphone (HP) & Tablet (< 1024px / lg:hidden).
 * Memberikan pengalaman navigasi jempol yang ergonomis, cepat, dan mirip aplikasi mobile native.
 */
export default function BottomNav() {
  const location = useLocation();
  const { user, role, isAuthenticated, isSiswa, isPiket, isAdmin } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showMoreSheet, setShowMoreSheet] = useState<boolean>(false);

  const haptic = () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }
  };

  // Jangan tampilkan pada pengunjung yang belum login atau di rute yang dilarang (kiosk, libur, izin)
  if (!isAuthenticated || NO_BOTTOM_NAV_ROUTES.includes(location.pathname)) {
    return null;
  }

  const isAlumni = isSiswa && (user as { status?: string })?.status === "Alumni";

  // Item navigasi berdasarkan peran pengguna
  let navItems: NavItem[] = [];
  let moreItems: NavEntry[] = [];

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
          label: "Akun",
          icon: (user as { foto_profil?: string })?.foto_profil ? (
            <img
              src={(user as { foto_profil?: string }).foto_profil}
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
          icon: <BookOpen className="w-5 h-5" />,
          active: location.pathname === "/pelanggaran",
        },
        {
          type: "profile",
          label: "Akun",
          icon: (user as { foto_profil?: string })?.foto_profil ? (
            <img
              src={(user as { foto_profil?: string }).foto_profil}
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
        icon: <MailPen className="w-5 h-5" />,
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
    const isMoreActive = ["/piket", "/pelanggaran", "/izin"].includes(
      location.pathname,
    );

    const allAdminEntries = getNavEntries({ user, role });
    moreItems = allAdminEntries.filter((entry) =>
      ["/piket", "/pelanggaran", "/izin"].includes(entry.to),
    );

    // Admin: 4 tombol utama + 1 tombol "Lainnya" untuk membuka menu tambahan (Piket, Pelanggaran, Izin)
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
        to: "/harian",
        label: "Scan Kiosk",
        isPrimary: true,
        icon: <Camera className="w-5 h-5" />,
        active: location.pathname === "/harian",
      },
      {
        to: "/registrasi",
        label: "Data Siswa",
        icon: <Users className="w-5 h-5" />,
        active: location.pathname === "/registrasi",
      },
      {
        type: "more",
        label: "Lainnya",
        icon: <MoreHorizontal className="w-5 h-5" />,
        active: isMoreActive,
      },
    ];
  }

  return (
    <>
      <nav
        aria-label="Navigasi bawah smartphone dan tablet"
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden px-3 pb-2 safe-area-bottom-nav pointer-events-none select-none"
      >
        <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-around rounded-3xl border border-slate-200/80 bg-white/95 px-1.5 py-1.5 shadow-[0_8px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          {navItems.map((item, idx) => {
            if (item.type === "profile") {
              return (
                <button
                  key={`nav-profile-${idx}`}
                  type="button"
                  onClick={() => {
                    haptic();
                    setShowProfileModal(true);
                  }}
                  className="press flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-slate-500 cursor-pointer"
                >
                  <span className="grid h-8 w-12 place-items-center">
                    {item.icon}
                  </span>
                  <span className="leading-none">{item.label}</span>
                </button>
              );
            }

            if (item.type === "more") {
              return (
                <button
                  key={`nav-more-${idx}`}
                  type="button"
                  onClick={() => {
                    haptic();
                    setShowMoreSheet(true);
                  }}
                  aria-label="Buka menu lainnya"
                  className={`press flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                    item.active ? "text-blue-700" : "text-slate-500"
                  }`}
                >
                  <span
                    className={`grid h-8 w-12 place-items-center rounded-full transition-all duration-300 ease-out-expo ${
                      item.active
                        ? "scale-100 bg-blue-100"
                        : "scale-90 bg-transparent"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="leading-none">{item.label}</span>
                </button>
              );
            }

            if (item.isPrimary && item.to) {
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={haptic}
                  className="press -mt-6 flex flex-1 flex-col items-center gap-1 group"
                >
                  <span
                    className={`grid h-14 w-14 place-items-center rounded-2xl text-white shadow-lg shadow-blue-600/30 ring-4 ring-white transition-colors ${
                      item.active ? "bg-blue-700" : "bg-blue-600"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={`text-[11px] font-bold leading-none ${
                      item.active ? "text-blue-700" : "text-slate-700"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            }

            return item.to ? (
              <Link
                key={item.to}
                to={item.to}
                onClick={haptic}
                aria-current={item.active ? "page" : undefined}
                className={`press flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                  item.active ? "text-blue-700" : "text-slate-500"
                }`}
              >
                <span
                  className={`grid h-8 w-12 place-items-center rounded-full transition-all duration-300 ease-out-expo ${
                    item.active
                      ? "scale-100 bg-blue-100"
                      : "scale-90 bg-transparent"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="leading-none">{item.label}</span>
              </Link>
            ) : null;
          })}
        </div>
      </nav>

      {/* Sheet Menu Lainnya untuk Admin di HP/Tablet */}
      <Sheet
        isOpen={showMoreSheet}
        onClose={() => setShowMoreSheet(false)}
        size="sm"
      >
        <SheetHeader
          title="Menu Operasional"
          subtitle="Modul tambahan khusus administrator"
          onClose={() => setShowMoreSheet(false)}
        />
        <SheetBody className="p-4 space-y-2 pb-6">
          {moreItems.map((entry) => {
            const isActive = location.pathname === entry.to;
            return (
              <Link
                key={entry.to}
                to={entry.to}
                onClick={() => {
                  haptic();
                  setShowMoreSheet(false);
                }}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-50/80 border-blue-200 text-blue-900"
                    : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100 text-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isActive
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    {entry.icon({ className: "w-5 h-5" })}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold leading-tight">
                      {entry.label}
                    </h4>
                    {entry.desc && (
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                        {entry.desc}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </Link>
            );
          })}

          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                haptic();
                setShowMoreSheet(false);
                setShowProfileModal(true);
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-800 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
                  <User className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold leading-tight">
                    Profil & Akun
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                    {user?.nama || user?.username} (Admin)
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </SheetBody>
      </Sheet>

      {/* Profile Modal triggered by Bottom Nav */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        initialTab="profil"
      />
    </>
  );
}
