import React, { useState } from "react";
import {
  AlertTriangle,
  X,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import api from "../../services/api";

const PRESET_ALASAN = [
  "Gangguan Operasional KRL Lintas Kemayoran / Manggarai",
  "Cuaca Ekstrim Hujan Lebat & Genangan Air",
  "Keterlambatan Armada Transjakarta",
  "Macet Total Akibat Pohon Tumbang / Penutupan Jalur",
];

export interface ModalForceMajeureProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function ModalForceMajeure({
  isOpen,
  onClose,
  onSuccess,
}: ModalForceMajeureProps): React.JSX.Element | null {
  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const [tanggal, setTanggal] = useState(getTodayStr());
  const [jamMulai, setJamMulai] = useState("06:30");
  const [jamSelesai, setJamSelesai] = useState("07:30");
  const [alasan, setAlasan] = useState(PRESET_ALASAN[0]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");

    if (!alasan.trim()) {
      setErrorMsg("Alasan force majeure wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/piket/force_majeure", {
        tanggal,
        jam_mulai: jamMulai,
        jam_selesai: jamSelesai,
        alasan: alasan.trim(),
      });

      if (res.data?.success) {
        onSuccess(
          res.data.message ||
            `Dispensasi Force Majeure berhasil diterapkan untuk ${res.data.total_terdampak || 0} siswa.`,
        );
        onClose();
      } else {
        setErrorMsg(
          res.data?.message || "Gagal menerapkan dispensasi force majeure.",
        );
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
          "Terjadi kesalahan saat memproses dispensasi force majeure.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 px-5 sm:px-6 py-4 sm:py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                Dispensasi Massal Force Majeure
              </h3>
              <p className="text-xs text-amber-100 mt-0.5">
                Pemutihan keterlambatan akibat kendala transit / bencana
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 space-y-4 overflow-y-auto"
        >
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Info Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-amber-950">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              Ketentuan Pemutihan Resmi Meja Piket:
            </p>
            <p className="text-amber-800 leading-relaxed">
              Semua siswa yang tercatat <b>Terlambat</b> pada rentang jam di
              bawah akan otomatis diubah statusnya menjadi <b>Hadir</b> dan poin
              sanksi keterlambatannya dihapuskan.
            </p>
          </div>

          {/* Tanggal Kejadian */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tanggal Kejadian
            </label>
            <div className="relative">
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Rentang Waktu */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Jam Mulai Gangguan
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={jamMulai}
                  onChange={(e) => setJamMulai(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Jam Selesai Toleransi
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={jamSelesai}
                  onChange={(e) => setJamSelesai(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Pilihan Cepat Alasan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Pilihan Cepat Alasan Kejadian
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              {PRESET_ALASAN.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAlasan(opt)}
                  className={`text-left text-[11px] p-2 rounded-xl border transition-all cursor-pointer font-medium ${
                    alasan === opt
                      ? "bg-amber-50 border-amber-400 text-amber-900 font-bold shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Atau ketik keterangan rinci alasan force majeure..."
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Terapkan Pemutihan Sekarang</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
