import React, { useState } from "react";
import { KeyRound, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import TabUbahPassword from "./TabUbahPassword";
import TabKeamanan2FA from "./TabKeamanan2FA";

export default function TabKeamanan({ user, updateUserProfile }) {
  const [showChangePassword, setShowChangePassword] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Ubah Kata Sandi (Posisi di Atas dengan Tombol Toggle Buka/Tutup) */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
        <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-slate-800 text-xs sm:text-sm">
                Kata Sandi Akun
              </h5>
              <p className="text-[11px] text-slate-500">
                Perbarui kata sandi akun Anda secara berkala untuk menjaga
                keamanan akun
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowChangePassword((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 flex-shrink-0 ${
              showChangePassword
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
            }`}
          >
            <span>{showChangePassword ? "Tutup" : "Ubah Sandi"}</span>
            {showChangePassword ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {showChangePassword ? (
          <div className="pt-1 animate-in fade-in duration-150">
            <TabUbahPassword
              user={user}
              onSuccess={() => setShowChangePassword(false)}
              onCancel={() => setShowChangePassword(false)}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-slate-500 py-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Kata sandi Anda saat ini aktif & terlindungi</span>
            </div>
            <button
              type="button"
              onClick={() => setShowChangePassword(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer hover:underline"
            >
              Ubah Sandi &rarr;
            </button>
          </div>
        )}
      </div>

      {/* 2. Status 2FA (Posisi di Bawah Ubah Kata Sandi) */}
      <TabKeamanan2FA user={user} updateUserProfile={updateUserProfile} />
    </div>
  );
}
