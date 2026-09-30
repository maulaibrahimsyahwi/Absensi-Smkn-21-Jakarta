import React, { useState } from "react";
import {
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import api from "../../services/api";
import { KELAS_GROUPS_DROPDOWN } from "../../constants/schoolData";
import CustomDropdown from "../CustomDropdown";

export interface KenaikanKelasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export default function KenaikanKelasModal({
  isOpen,
  onClose,
  onSuccess,
}: KenaikanKelasModalProps) {
  const [kelasAsal, setKelasAsal] = useState<string>("X PPLG 1");
  const [aksi, setAksi] = useState<"naik_kelas" | "lulus">("naik_kelas");
  const [kelasTujuan, setKelasTujuan] = useState<string>("XI PPLG 1");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!kelasAsal) {
      setErrorMsg("Pilih kelas asal terlebih dahulu.");
      return;
    }

    if (aksi === "naik_kelas" && !kelasTujuan) {
      setErrorMsg("Pilih kelas tujuan kenaikan kelas.");
      return;
    }

    if (aksi === "naik_kelas" && kelasAsal === kelasTujuan) {
      setErrorMsg("Kelas asal dan kelas tujuan tidak boleh sama.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        kelas_asal: kelasAsal,
        aksi: aksi,
        kelas_tujuan: aksi === "naik_kelas" ? kelasTujuan : null,
      };

      const res = await api.post("/siswa/naik_kelas_massal", payload);
      if (res.data?.success) {
        onSuccess(res.data.message || `Berhasil memperbarui tingkat kelas.`);
        onClose();
      } else {
        setErrorMsg(res.data?.message || "Gagal memproses kenaikan kelas.");
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
          "Terjadi kesalahan saat memproses kenaikan kelas massal.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-6 relative">
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
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              Kenaikan Kelas Massal & Rollover
            </h3>
            <p className="text-xs text-blue-600 font-semibold mt-0.5">
              Tahun Ajaran Baru SMKN 21 Jakarta
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Opsi Aksi */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">
              Tipe Kenaikan / Rollover
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAksi("naik_kelas")}
                className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                  aksi === "naik_kelas"
                    ? "bg-blue-50 border-blue-500 text-blue-700 shadow-2xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                Naik Kelas (X → XI, XI → XII)
              </button>
              <button
                type="button"
                onClick={() => setAksi("lulus")}
                className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                  aksi === "lulus"
                    ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                Luluskan ke Alumni (Kelas XII)
              </button>
            </div>
          </div>

          {/* Kelas Asal */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">
              Kelas Asal (Rombel yang Dipromosikan)
            </label>
            <CustomDropdown
              value={kelasAsal}
              onChange={setKelasAsal}
              groups={KELAS_GROUPS_DROPDOWN}
              placeholder="Pilih Kelas Asal..."
              className="w-full"
            />
          </div>

          {/* Kelas Tujuan (jika aksi naik kelas) */}
          {aksi === "naik_kelas" && (
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">
                Kelas Baru / Tujuan
              </label>
              <CustomDropdown
                value={kelasTujuan}
                onChange={setKelasTujuan}
                groups={KELAS_GROUPS_DROPDOWN}
                placeholder="Pilih Kelas Baru..."
                className="w-full"
              />
            </div>
          )}

          {/* Info Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-slate-600 text-[11px] leading-relaxed">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                Seluruh siswa aktif di <strong>{kelasAsal}</strong> akan
                otomatis{" "}
                {aksi === "naik_kelas"
                  ? `dipindahkan ke kelas ${kelasTujuan}`
                  : "dialihkan statusnya menjadi Alumni"}
                .
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>
                Data riwayat absensi, pelanggaran, dan foto biometrik wajah
                siswa tetap tersimpan aman.
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>Terapkan Kenaikan Massal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
