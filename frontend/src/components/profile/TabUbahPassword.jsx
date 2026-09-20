import React, { useState } from "react";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import api from "../../services/api";

export default function TabUbahPassword({ user }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");

    if (!oldPassword.trim()) {
      setPassError("Kata sandi saat ini wajib diisi");
      return;
    }
    if (!newPassword.trim()) {
      setPassError("Kata sandi baru wajib diisi");
      return;
    }
    if (newPassword.length < 6) {
      setPassError("Kata sandi baru minimal 6 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError("Konfirmasi kata sandi tidak cocok dengan kata sandi baru.");
      return;
    }

    setPassLoading(true);
    try {
      const payload = {
        role: user?.role,
        id: user?.id,
        old_password: oldPassword.trim(),
        new_password: newPassword.trim(),
      };
      const res = await api.post("/auth/change_password", payload);
      if (res.data && res.data.success) {
        setPassSuccess(res.data.message || "Kata sandi berhasil diperbarui!");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        "Gagal mengubah kata sandi. Pastikan kata sandi saat ini benar.";
      setPassError(errMsg);
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
          Kata Sandi Baru (Min. 6 Karakter)
        </label>
        <div className="relative">
          <input
            type={showNewPass ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Buat kata sandi baru yang kuat"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm transition pr-10"
          />
          <button
            type="button"
            onClick={() => setShowNewPass(!showNewPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showNewPass ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showConfirmPass ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={passLoading}
        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
      >
        {passLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          `Simpan Kata Sandi Baru`
        )}
      </button>
    </form>
  );
}
