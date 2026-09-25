import React, { useState } from "react";
import {
  PenLine,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import SignaturePadModal from "../SignaturePadModal";

export default function TabTandaTangan({ user, isSiswa, saveSignature }) {
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [ttdPasswordPrompt, setTtdPasswordPrompt] = useState(false);
  const [ttdConfirmPassword, setTtdConfirmPassword] = useState("");
  const [ttdError, setTtdError] = useState("");
  const [ttdSuccess, setTtdSuccess] = useState("");

  const handleInitiateTtdUpdate = () => {
    setTtdError("");
    setTtdSuccess("");
    if (isSiswa && user?.tanda_tangan) {
      setTtdPasswordPrompt(true);
    } else {
      setShowSignaturePad(true);
    }
  };

  const handleVerifyPasswordForTtd = (e) => {
    e.preventDefault();
    setTtdError("");
    if (!ttdConfirmPassword.trim()) {
      setTtdError(
        "Kata sandi akun Anda wajib diisi untuk membuka kunci tanda tangan.",
      );
      return;
    }
    setShowSignaturePad(true);
    setTtdPasswordPrompt(false);
  };

  const handleSaveSignature = async (sigBase64) => {
    try {
      const res = await saveSignature(
        sigBase64,
        ttdConfirmPassword || undefined,
      );
      if (res.success) {
        setTtdSuccess(
          "Tanda tangan digital Anda berhasil diperbarui dan disimpan!",
        );
        setTtdConfirmPassword("");
      } else {
        setTtdError(res.message || "Gagal menyimpan tanda tangan digital.");
      }
    } catch {
      setTtdError("Terjadi kendala saat menyimpan tanda tangan.");
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {ttdError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{ttdError}</span>
        </div>
      )}
      {ttdSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{ttdSuccess}</span>
        </div>
      )}

      <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <PenLine className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-slate-800 text-xs sm:text-sm">
                Tanda Tangan Digital
              </h5>
              <p className="text-[11px] text-slate-500">
                {user?.tanda_tangan
                  ? "Tanda tangan aktif tersimpan"
                  : "Belum ada tanda tangan digital"}
              </p>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              user?.tanda_tangan
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {user?.tanda_tangan ? "Tersimpan" : "Belum"}
          </span>
        </div>

        {user?.tanda_tangan && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-center items-center h-28">
            <img
              src={user.tanda_tangan}
              alt="Tanda Tangan Digital"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}

        <button
          type="button"
          onClick={handleInitiateTtdUpdate}
          className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
        >
          {user?.tanda_tangan
            ? "Perbarui Tanda Tangan"
            : "Buat Tanda Tangan Digital"}
        </button>
      </div>

      {/* Password Prompt untuk Siswa sebelum buat TTD baru */}
      {ttdPasswordPrompt && (
        <form
          onSubmit={handleVerifyPasswordForTtd}
          className="p-4 rounded-2xl border border-purple-200 bg-purple-50/50 space-y-3 animate-in zoom-in-95"
        >
          <div className="flex items-center gap-2 text-purple-800">
            <Lock className="w-4 h-4" />
            <h5 className="font-bold text-xs sm:text-sm">
              Verifikasi Keamanan Akun
            </h5>
          </div>
          <p className="text-xs text-slate-600">
            Masukkan kata sandi akun Anda untuk membuka kunci pembaruan tanda
            tangan:
          </p>

          <input
            type="password"
            value={ttdConfirmPassword}
            onChange={(e) => setTtdConfirmPassword(e.target.value)}
            placeholder="Kata sandi akun Anda"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
          />

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setTtdPasswordPrompt(false)}
              className="w-1/2 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="w-1/2 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition"
            >
              Lanjutkan
            </button>
          </div>
        </form>
      )}

      {/* Modal Canvas Signature Pad */}
      <SignaturePadModal
        isOpen={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onSave={handleSaveSignature}
        initialImage={user?.tanda_tangan}
        title="Tanda Tangan Digital"
      />
    </div>
  );
}
