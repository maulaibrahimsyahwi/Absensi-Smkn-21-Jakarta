import React from "react";
import { KeyRound } from "lucide-react";
import TabUbahPassword from "./TabUbahPassword";
import TabKeamanan2FA from "./TabKeamanan2FA";

export default function TabKeamanan({ user, updateUserProfile }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Ubah Kata Sandi (Posisi di Atas) */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h5 className="font-bold text-slate-800 text-xs sm:text-sm">
              Ubah Kata Sandi
            </h5>
            <p className="text-[11px] text-slate-500">
              Perbarui kata sandi akun Anda secara berkala untuk menjaga
              keamanan akun
            </p>
          </div>
        </div>

        <TabUbahPassword user={user} />
      </div>

      {/* 2. Status 2FA (Posisi di Bawah Ubah Kata Sandi) */}
      <TabKeamanan2FA user={user} updateUserProfile={updateUserProfile} />
    </div>
  );
}
