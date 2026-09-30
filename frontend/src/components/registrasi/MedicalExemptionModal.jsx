import React, { useState, useEffect } from "react";
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import api from "../../services/api";
import CustomDatePicker from "../CustomDatePicker";

export default function MedicalExemptionModal({
  isOpen,
  onClose,
  targetSiswa,
  onSuccess,
}) {
  const [exemptUntil, setExemptUntil] = useState("");
  const [alasan, setAlasan] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (targetSiswa) {
      setExemptUntil(targetSiswa.medical_exemption_until || "");
      setAlasan(targetSiswa.medical_exemption_alasan || "");
      setErrorMsg("");
    }
  }, [targetSiswa, isOpen]);

  if (!isOpen || !targetSiswa) return null;

  const isCurrentlyExempt =
    targetSiswa.medical_exemption_until &&
    new Date(targetSiswa.medical_exemption_until) >=
      new Date(new Date().toDateString());

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!exemptUntil) {
      setErrorMsg("Tanggal batas dispensasi medis wajib diisi.");
      return;
    }

    if (!alasan.trim()) {
      setErrorMsg("Alasan dispensasi medis wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/siswa/${targetSiswa.id}/medical_exemption`, {
        exempt_until: exemptUntil,
        alasan: alasan.trim(),
      });

      if (res.data?.success) {
        onSuccess(
          res.data.message ||
            `Dispensasi medis wajah untuk ${targetSiswa.nama} berhasil disimpan.`,
        );
        onClose();
      } else {
        setErrorMsg(res.data?.message || "Gagal menyimpan dispensasi medis.");
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
          "Terjadi kesalahan saat menyimpan dispensasi medis.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await api.post(`/siswa/${targetSiswa.id}/medical_exemption`, {
        exempt_until: null,
        alasan: "",
      });

      if (res.data?.success) {
        onSuccess(
          `Dispensasi medis untuk ${targetSiswa.nama} berhasil dicabut.`,
        );
        onClose();
      } else {
        setErrorMsg(res.data?.message || "Gagal mencabut dispensasi medis.");
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
          "Terjadi kesalahan saat mencabut dispensasi.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-6 relative">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Modal */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 flex-shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              Dispensasi Medis Biometrik Wajah
            </h3>
            <p className="text-xs text-teal-600 font-semibold mt-0.5">
              Medical Exemption Pass Siswa
            </p>
          </div>
        </div>

        {/* Identitas Siswa */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-xs space-y-1">
          <p className="font-bold text-slate-900 text-sm">{targetSiswa.nama}</p>
          <p className="text-slate-500 font-mono">
            NIS {targetSiswa.nis} • Kelas {targetSiswa.kelas}
          </p>
          {isCurrentlyExempt && (
            <div className="pt-2 border-t border-slate-200 mt-2 flex items-center gap-1.5 text-amber-700 font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>
                Sedang Aktif s/d {targetSiswa.medical_exemption_until}
              </span>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">
              Masa Berlaku Dispensasi Sampai Dengan{" "}
              <span className="text-rose-500">*</span>
            </label>
            <CustomDatePicker
              value={exemptUntil}
              onChange={setExemptUntil}
              placeholder="Pilih tanggal berakhir..."
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">
              Alasan Medis / Keterangan Penyakit{" "}
              <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Contoh: Perban operasi wajah, cacar air, atau luka bakar..."
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
              required
            />
          </div>

          <div className="p-3 bg-teal-50/60 border border-teal-200/80 rounded-xl text-teal-800 text-[11px] leading-relaxed space-y-1.5">
            <p className="font-bold flex items-center gap-1.5 text-teal-900">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              <span>Bypass Otomatis Pada Gerbang</span>
            </p>
            <p>
              Selama tanggal dispensasi aktif, pemindaian wajah siswa di gerbang
              akan otomatis lolos dengan status{" "}
              <strong>Hadir (Dispensasi Medis)</strong> tanpa ditolak kecerdasan
              buatan.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            {isCurrentlyExempt ? (
              <button
                type="button"
                onClick={handleRevoke}
                disabled={loading}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Cabut Dispensasi</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md shadow-teal-600/20 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Dispensasi</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
