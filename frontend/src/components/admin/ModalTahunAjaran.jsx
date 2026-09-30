import React, { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  GraduationCap,
  Save,
} from "lucide-react";
import api from "../../services/api";

export default function ModalTahunAjaran({ isOpen, onClose, onUpdated }) {
  const [tahunAjaran, setTahunAjaran] = useState("2026/2027");
  const [semester, setSemester] = useState("Ganjil");
  const [jamMasuk, setJamMasuk] = useState("06:30");
  const [toleransi, setToleransi] = useState(15);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");
      setSuccessMsg("");
      setLoading(true);
      api
        .get("/jadwal")
        .then((res) => {
          if (res.data?.success && res.data.data) {
            const d = res.data.data;
            setTahunAjaran(d.tahun_ajaran || "2026/2027");
            setSemester(d.semester || "Ganjil");
            setJamMasuk(d.jam_masuk || "06:30");
            setToleransi(d.toleransi_keterlambatan_menit || 15);
          }
        })
        .catch((err) => {
          console.error("Gagal mengambil pengaturan jadwal:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!tahunAjaran.trim()) {
      setErrorMsg("Tahun ajaran wajib diisi (contoh: 2026/2027).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.put("/jadwal", {
        tahun_ajaran: tahunAjaran.trim(),
        semester: semester,
        jam_masuk: jamMasuk,
        toleransi_keterlambatan_menit: parseInt(toleransi, 10),
      });

      if (res.data?.success) {
        setSuccessMsg("Tahun ajaran & semester aktif berhasil diperbarui.");
        if (onUpdated) onUpdated();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.data?.message || "Gagal memperbarui pengaturan.");
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
          "Terjadi kesalahan saat menyimpan pengaturan.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-6 relative">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Modal */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              Tahun Ajaran & Semester Resmi
            </h3>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-xs font-semibold">Memuat pengaturan...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Tahun Ajaran */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">
                Tahun Ajaran Aktif <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={tahunAjaran}
                onChange={(e) => setTahunAjaran(e.target.value)}
                placeholder="Contoh: 2026/2027"
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                required
              />
              <p className="text-[10px] text-slate-400">
                YYYY/YYYY (contoh: 2025/2026, 2026/2027)
              </p>
            </div>

            {/* Semester */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">
                Semester Aktif <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSemester("Ganjil")}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    semester === "Ganjil"
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Semester Ganjil
                </button>
                <button
                  type="button"
                  onClick={() => setSemester("Genap")}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    semester === "Genap"
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Semester Genap
                </button>
              </div>
            </div>

            {/* Jam Masuk & Toleransi */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                  Jam Masuk Gerbang
                </label>
                <input
                  type="time"
                  value={jamMasuk}
                  onChange={(e) => setJamMasuk(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                  Toleransi (Menit)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={toleransi}
                  onChange={(e) => setToleransi(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold"
                  required
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <span>Simpan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
