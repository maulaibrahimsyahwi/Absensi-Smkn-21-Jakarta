import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, User, KeyRound, PenLine, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import TabInfoProfil from "./profile/TabInfoProfil";
import TabUbahPassword from "./profile/TabUbahPassword";
import TabKeamanan2FA from "./profile/TabKeamanan2FA";
import TabTandaTangan from "./profile/TabTandaTangan";

export default function ProfileModal({
  isOpen,
  onClose,
  initialTab = "profil",
}) {
  const {
    user,
    isSiswa,
    updateFotoProfil,
    deleteFotoProfil,
    updateUserProfile,
    saveSignature,
  } = useAuth();

  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Support tombol Escape untuk menutup modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tabs = [
    { id: "profil", label: "Profil", icon: User },
    { id: "password", label: "Kata Sandi", icon: KeyRound },
    { id: "2fa", label: "Keamanan (2FA)", icon: ShieldCheck },
    { id: "ttd", label: "Tanda Tangan", icon: PenLine },
  ];

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 flex-shrink-0">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base sm:text-lg">
              Pengaturan Akun & Profil
            </h3>
            <p className="text-xs text-slate-500">
              Kelola informasi akun, keamanan, dan identitas digital Anda
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
            aria-label="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector Bar */}
        <div className="flex border-b border-slate-100 bg-white px-3 pt-2 gap-1 overflow-x-auto no-scrollbar flex-shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "border-blue-600 text-blue-600 bg-blue-50/50"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body Container */}
        <div className="p-4 sm:p-6 overflow-y-auto min-h-[380px]">
          {activeTab === "profil" && (
            <TabInfoProfil
              user={user}
              isSiswa={isSiswa}
              updateFotoProfil={updateFotoProfil}
              deleteFotoProfil={deleteFotoProfil}
            />
          )}

          {activeTab === "password" && <TabUbahPassword user={user} />}

          {activeTab === "2fa" && (
            <TabKeamanan2FA user={user} updateUserProfile={updateUserProfile} />
          )}

          {activeTab === "ttd" && (
            <TabTandaTangan
              user={user}
              isSiswa={isSiswa}
              saveSignature={saveSignature}
            />
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
