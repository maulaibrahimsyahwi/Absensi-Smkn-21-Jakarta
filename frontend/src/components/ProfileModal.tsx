import React, { useState, useEffect } from "react";
import { X, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import TabInfoProfil from "./profile/TabInfoProfil";
import TabKeamanan from "./profile/TabKeamanan";
import Sheet from "./ui/Sheet";
import LogoutConfirm from "./common/LogoutConfirm";

export interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "profil" | "keamanan" | string;
}

export default function ProfileModal({
  isOpen,
  onClose,
  initialTab = "profil",
}: ProfileModalProps): React.JSX.Element | null {
  const {
    user,
    isSiswa,
    updateFotoProfil,
    deleteFotoProfil,
    updateUserProfile,
    saveSignature,
  } = useAuth();

  const [confirmLogout, setConfirmLogout] = useState(false);

  const resolveTab = (tab?: string): "profil" | "keamanan" => {
    if (tab === "password" || tab === "2fa" || tab === "keamanan") {
      return "keamanan";
    }
    return "profil";
  };

  const [activeTab, setActiveTab] = useState<"profil" | "keamanan">(resolveTab(initialTab));

  useEffect(() => {
    if (isOpen) {
      setActiveTab(resolveTab(initialTab));
    }
  }, [isOpen, initialTab]);

  const tabs: Array<{ id: "profil" | "keamanan"; label: string }> = [
    { id: "profil", label: "Profil" },
    { id: "keamanan", label: "Keamanan" },
  ];

  return (
    <>
      <Sheet isOpen={isOpen} onClose={onClose} labelledBy="profile-title" size="md">
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-3 sm:p-5">
          <div>
            <h3 id="profile-title" className="text-base font-bold text-slate-900 sm:text-lg">
              Pengaturan Akun & Profil
            </h3>
            <p className="text-xs text-slate-500">
              Profil, biometrik, tanda tangan, dan keamanan
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog profil"
            className="press grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          role="tablist"
          className="relative mx-5 mb-3 grid shrink-0 grid-cols-2 rounded-2xl bg-slate-100 p-1 text-sm select-none"
        >
          <span
            aria-hidden="true"
            className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-white shadow-xs transition-transform duration-300 ease-out-expo ${
              activeTab === "keamanan" ? "translate-x-full" : ""
            }`}
          />
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative z-10 py-2 text-center text-xs font-bold transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "text-slate-900"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto px-5 pb-5 sm:pb-6 flex-1">
          {activeTab === "profil" && (
            <TabInfoProfil
              user={user}
              isSiswa={isSiswa}
              updateFotoProfil={updateFotoProfil}
              deleteFotoProfil={deleteFotoProfil}
              saveSignature={saveSignature}
            />
          )}

          {activeTab === "keamanan" && (
            <TabKeamanan user={user} updateUserProfile={updateUserProfile} />
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="press flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Keluar dari akun
          </button>
        </div>
      </Sheet>

      <LogoutConfirm
        isOpen={confirmLogout}
        onClose={() => {
          setConfirmLogout(false);
          onClose();
        }}
      />
    </>
  );
}
