import React, { useState } from "react";
import {
  ShieldCheck,
  Smartphone,
  QrCode,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
} from "lucide-react";
import api from "../../services/api";

export default function TabKeamanan2FA({ user, updateUserProfile }) {
  const [twoFactorSetup, setTwoFactorSetup] = useState(null);
  const [twoFactorStep, setTwoFactorStep] = useState("idle"); // "idle" | "setup" | "disable_confirm"
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorDisablePass, setTwoFactorDisablePass] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState("");
  const [twoFactorSuccess, setTwoFactorSuccess] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Inisiasi Setup 2FA
  const handleInit2FASetup = async () => {
    setTwoFactorLoading(true);
    setTwoFactorError("");
    setTwoFactorSuccess("");
    try {
      const res = await api.post("/auth/2fa/setup", {
        id: user.id,
        role: user.role,
      });
      if (res.data?.success) {
        setTwoFactorSetup(res.data);
        setTwoFactorStep("setup");
      } else {
        setTwoFactorError(res.data?.message || "Gagal menyiapkan 2FA.");
      }
    } catch (err) {
      setTwoFactorError(
        err.response?.data?.message || "Terjadi kendala saat menyiapkan 2FA.",
      );
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Verifikasi & Aktifkan 2FA
  const handleVerifyAndEnable2FA = async (e) => {
    e.preventDefault();
    if (!twoFactorCode.trim() || twoFactorCode.trim().length !== 6) {
      setTwoFactorError(
        "Masukkan 6 digit kode verifikasi dari aplikasi Authenticator Anda.",
      );
      return;
    }
    setTwoFactorLoading(true);
    setTwoFactorError("");
    setTwoFactorSuccess("");
    try {
      const res = await api.post("/auth/2fa/verify_enable", {
        id: user.id,
        role: user.role,
        totp_code: twoFactorCode.trim(),
      });
      if (res.data?.success) {
        setTwoFactorSuccess(
          "2FA berhasil diaktifkan! Akun Anda kini terlindungi.",
        );
        setTwoFactorStep("idle");
        setTwoFactorCode("");
        updateUserProfile({ two_factor_enabled: true });
      } else {
        setTwoFactorError(
          res.data?.message || "Kode verifikasi 2FA tidak valid.",
        );
      }
    } catch (err) {
      setTwoFactorError(
        err.response?.data?.message || "Kode verifikasi 6 digit tidak valid.",
      );
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Nonaktifkan 2FA
  const handleDisable2FA = async (e) => {
    e.preventDefault();
    setTwoFactorLoading(true);
    setTwoFactorError("");
    setTwoFactorSuccess("");
    try {
      const res = await api.post("/auth/2fa/disable", {
        id: user.id,
        role: user.role,
        password: twoFactorDisablePass.trim(),
        totp_code: twoFactorCode.trim(),
      });
      if (res.data?.success) {
        setTwoFactorSuccess("2FA berhasil dinonaktifkan.");
        setTwoFactorStep("idle");
        setTwoFactorDisablePass("");
        setTwoFactorCode("");
        updateUserProfile({ two_factor_enabled: false });
      } else {
        setTwoFactorError(res.data?.message || "Gagal menonaktifkan 2FA.");
      }
    } catch (err) {
      setTwoFactorError(
        err.response?.data?.message || "Kata sandi atau kode verifikasi salah.",
      );
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (twoFactorSetup?.secret) {
      navigator.clipboard.writeText(twoFactorSetup.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {twoFactorError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{twoFactorError}</span>
        </div>
      )}
      {twoFactorSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{twoFactorSuccess}</span>
        </div>
      )}

      {/* Status Card */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              user?.two_factor_enabled
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h5 className="font-bold text-slate-800 text-xs sm:text-sm">
              Status 2FA: {user?.two_factor_enabled ? "Aktif" : "Nonaktif"}
            </h5>
            <p className="text-[11px] text-slate-500">
              {user?.two_factor_enabled
                ? "Akun Anda terlindungi dengan kode OTP 6 digit"
                : "Tingkatkan keamanan akun dari pembobolan & bot"}
            </p>
          </div>
        </div>

        {user?.two_factor_enabled ? (
          <button
            type="button"
            onClick={() => {
              setTwoFactorStep("disable_confirm");
              setTwoFactorError("");
              setTwoFactorSuccess("");
            }}
            className="px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 font-bold text-xs transition cursor-pointer"
          >
            Nonaktifkan
          </button>
        ) : (
          twoFactorStep === "idle" && (
            <button
              type="button"
              onClick={handleInit2FASetup}
              disabled={twoFactorLoading}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              {twoFactorLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <QrCode className="w-3.5 h-3.5" />
              )}
              Aktifkan
            </button>
          )
        )}
      </div>

      {/* Step Setup 2FA */}
      {twoFactorStep === "setup" && twoFactorSetup && (
        <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/50 space-y-4 animate-in zoom-in-95">
          <div className="text-center space-y-1">
            <h5 className="font-bold text-slate-800 text-sm">
              Pindai QR Code di Google Authenticator
            </h5>
            <p className="text-xs text-slate-500">
              Buka aplikasi Authenticator di ponsel Anda, pilih{" "}
              <strong>Scan a QR code</strong>
            </p>
          </div>

          <div className="flex justify-center p-3 bg-white rounded-2xl border border-slate-200 w-fit mx-auto shadow-xs">
            <img
              src={twoFactorSetup.qr_url}
              alt="QR Code 2FA"
              className="w-44 h-44 object-contain rounded-lg"
            />
          </div>

          {/* Kunci Rahasia Manual */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600 text-center">
              Atau masukkan kunci rahasia ini secara manual:
            </label>
            <div className="flex items-center gap-2 max-w-xs mx-auto">
              <input
                type="text"
                readOnly
                value={twoFactorSetup.secret}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-center text-xs font-mono font-bold text-slate-800 tracking-wider select-all"
              />
              <button
                type="button"
                onClick={handleCopySecret}
                className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition flex-shrink-0"
                title="Salin Kunci Rahasia"
              >
                {copiedSecret ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Form Konfirmasi Kode OTP */}
          <form onSubmit={handleVerifyAndEnable2FA} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 text-center mb-1.5">
                Masukkan 6 Digit Kode dari Aplikasi Authenticator
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) =>
                  setTwoFactorCode(e.target.value.replace(/\D/g, ""))
                }
                placeholder="000000"
                className="w-48 mx-auto block px-4 py-2.5 rounded-xl border border-slate-300 text-center text-lg font-mono font-black tracking-widest text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTwoFactorStep("idle")}
                className="w-1/2 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={twoFactorLoading || twoFactorCode.length !== 6}
                className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                {twoFactorLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Verifikasi & Aktifkan"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step Nonaktifkan 2FA */}
      {twoFactorStep === "disable_confirm" && (
        <form
          onSubmit={handleDisable2FA}
          className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-3 animate-in zoom-in-95"
        >
          <div className="flex items-center gap-2 text-rose-700">
            <Lock className="w-4 h-4" />
            <h5 className="font-bold text-xs sm:text-sm">
              Konfirmasi Nonaktifkan 2FA
            </h5>
          </div>
          <p className="text-xs text-slate-600">
            Masukkan kata sandi akun Anda untuk memverifikasi penonaktifan
            proteksi 2FA:
          </p>

          <input
            type="password"
            value={twoFactorDisablePass}
            onChange={(e) => setTwoFactorDisablePass(e.target.value)}
            placeholder="Kata sandi akun Anda"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
          />

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setTwoFactorStep("idle")}
              className="w-1/2 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={twoFactorLoading || !twoFactorDisablePass}
              className="w-1/2 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              {twoFactorLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              Konfirmasi Nonaktifkan
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
