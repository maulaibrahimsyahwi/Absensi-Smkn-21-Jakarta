import React, { useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { KeyRound, User as UserIcon, LogOut, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ProfileModal from "./ProfileModal";
import logoSMKN21 from "../assets/Logo SMKN21.png";
import { getNavEntries } from "../utils/navConfig";
import FloatingPanel from "./ui/FloatingPanel";
import LogoutConfirm from "./common/LogoutConfirm";
import { useMediaQuery } from "../hooks/useMediaQuery";

export default function Navbar(): React.JSX.Element {
  const location = useLocation();
  const { user, role, isAuthenticated, isAdmin, isPiket, isSiswa } = useAuth();

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileTab, setProfileTab] = useState<"profil" | "keamanan">("profil");
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const openProfile = (tab: "profil" | "keamanan" = "profil") => {
    setProfileTab(tab);
    setMenuOpen(false);
    setShowProfileModal(true);
  };

  const roleLabel = isAdmin
    ? "Administrator"
    : isPiket
      ? "Guru Piket"
      : `${user?.kelas ?? "Siswa"}`;

  // Navigasi Terpadu Berdasarkan Role & Status Pengguna
  const navEntries = isAuthenticated ? getNavEntries({ user, role }) : [];
  const navItems = navEntries.map((item) => ({
    ...item,
    icon: item.icon({ className: "w-4 h-4" }),
    active: location.pathname === item.to,
  }));

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
                ? `${user?.kelas ? `${user.kelas}` : ""}`
                : "Sistem Presensi SMKN 21 Jakarta"}
            </p>
          </div>
        </Link>

        {/* Right Actions: Profile Button & Desktop Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {isAuthenticated ? (
            <div className="relative flex items-center gap-1.5 sm:gap-2">
              {/* Profile / Avatar Button */}
              <button
                ref={avatarRef}
                type="button"
                onClick={() =>
                  isDesktop ? setMenuOpen((o) => !o) : openProfile()
                }
                aria-label="Akun saya"
                aria-haspopup={isDesktop ? "menu" : "dialog"}
                aria-expanded={isDesktop ? menuOpen : undefined}
                className="press flex items-center gap-2 rounded-full border border-slate-200/90 bg-white py-1 pl-1 pr-1 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
              >
                {user?.foto_profil ? (
                  <img
                    src={user.foto_profil}
                    alt="Foto Profil"
                    className="h-7 w-7 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {(user?.nama || user?.username || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}
                <span className="hidden max-w-[120px] truncate text-xs font-bold text-slate-700 lg:inline">
                  {(user?.nama || user?.username || "").split(" ")[0]}
                </span>
              </button>

              {/* Desktop Avatar Dropdown */}
              <FloatingPanel
                anchorRef={avatarRef}
                open={menuOpen && isDesktop}
                onClose={() => setMenuOpen(false)}
                align="right"
                width={250}
              >
                <div className="border-b border-slate-100 px-4 py-2">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {user?.nama || user?.username}
                  </p>
                  <p className="truncate text-xs text-slate-500">{roleLabel}</p>
                </div>
                <div role="menu" className="p-1.5">
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => openProfile("profil")}
                    className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <UserIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span>Profil </span>
                  </button>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => openProfile("keamanan")}
                    className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <KeyRound className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span>Kata sandi</span>
                  </button>
                </div>
                <div className="border-t border-slate-100 p-1">
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmLogout(true);
                    }}
                    className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-xs sm:text-sm font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                  >
                    <LogOut className="h-4 w-4 flex-shrink-0" />
                    <span>Keluar</span>
                  </button>
                </div>
              </FloatingPanel>
            </div>
          ) : (
            ""
          )}
        </div>
      </div>

      <LogoutConfirm
        isOpen={confirmLogout}
        onClose={() => setConfirmLogout(false)}
      />

      {/* Profile & Settings Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        initialTab={profileTab}
      />
    </header>
  );
}
