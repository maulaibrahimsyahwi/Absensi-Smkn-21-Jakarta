import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { AuthUser } from "../../types/auth";
import { passwordChecks, PASSWORD_MIN } from "../../utils/passwordPolicy";

export interface TabUbahPasswordProps {
  user: AuthUser | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function TabUbahPassword({
  user,
  onSuccess,
  onCancel,
}: TabUbahPasswordProps): React.JSX.Element {
  const { changePassword } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");

  const checkResult = passwordChecks(newPassword, {
    oldPassword,
    username: user?.username,
    nis: user?.nis,
    confirmPassword,
  });

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");

    if (!oldPassword.trim()) {
      setPassError("Kata sandi saat ini wajib diisi.");
      return;
    }

    if (!checkResult.valid) {
      setPassError(checkResult.error || "Kata sandi belum memenuhi kriteria keamanan.");
      return;
    }

    setPassLoading(true);
    try {
      const res = await changePassword(oldPassword.trim(), newPassword.trim());
      if (res.success) {
        setPassSuccess(res.message || "Kata sandi berhasil diperbarui!");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1500);
        }
      } else {
        setPassError(res.message || "Gagal mengubah kata sandi.");
      }
    } catch {
      setPassError("Terjadi kesalahan saat memperbarui kata sandi.");
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleChangePassword}
      className="space-y-4 animate-in fade-in duration-200"
    >
      {passError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{passError}</span>
        </div>
      )}
      {passSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{passSuccess}</span>
        </div>
      )}

      {/* Sandi Lama */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          Kata Sandi Saat Ini
        </label>
        <div className="relative">
          <input
            type={showOldPass ? "text" : "password"}
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="Masukkan kata sandi lama Anda"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm transition pr-10"
          />
          <button
            type="button"
            onClick={() => setShowOldPass(!showOldPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            {showOldPass ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Sandi Baru */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          Kata Sandi Baru (Min. {PASSWORD_MIN} Karakter)
        </label>
        <div className="relative">
          <input
            type={showNewPass ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={`Minimal ${PASSWORD_MIN} karakter (huruf besar, kecil, angka)`}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm transition pr-10"
          />
          <button
            type="button"
            onClick={() => setShowNewPass(!showNewPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            {showNewPass ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Indikator Persyaratan Keamanan */}
        {newPassword.length > 0 && (
          <div className="mt-2.5 rounded-xl border border-slate-100 bg-slate-50 p-2.5 space-y-1">
            {checkResult.rules.map((rule) => (
              <div
                key={rule.id}
                className={`flex items-center gap-2 text-[11px] ${
                  rule.passed ? "text-emerald-600 font-medium" : "text-slate-500"
                }`}
              >
                <span className={`inline-block w-3.5 text-center ${rule.passed ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                  {rule.passed ? "✓" : "•"}
                </span>
                <span>{rule.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Konfirmasi Sandi Baru */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">
          Konfirmasi Kata Sandi Baru
        </label>
        <div className="relative">
          <input
            type={showConfirmPass ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Ketik ulang kata sandi baru"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm transition pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPass(!showConfirmPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            {showConfirmPass ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={passLoading}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
        )}
        <button
          type="submit"
          disabled={passLoading}
          className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {passLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            `Simpan Kata Sandi `
          )}
        </button>
      </div>
    </form>
  );
}
