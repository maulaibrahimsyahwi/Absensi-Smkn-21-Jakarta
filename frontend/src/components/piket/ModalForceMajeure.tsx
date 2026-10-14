import React, { useState } from "react";
import { AlertTriangle, ShieldCheck, Check, Sparkles } from "lucide-react";
import api from "../../services/api";
import Sheet, { SheetHeader, SheetBody, SheetFooter } from "../ui/Sheet";
import CustomDatePicker from "../CustomDatePicker";
import CustomTimePicker from "../CustomTimePicker";
import Button from "../ui/Button";
import InlineAlert from "../ui/InlineAlert";
import Field, { INPUT_CLASS } from "../ui/Field";

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
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      labelledBy="force-majeure-title"
    >
      <SheetHeader
        id="force-majeure-title"
        title="Dispensasi Massal Force Majeure"
        subtitle="Pemutihan keterlambatan akibat transit / cuaca ekstrem"
        icon={
          <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-700 border border-amber-500/20 shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
        }
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <SheetBody>
          <div className="space-y-4 text-xs">
            {errorMsg && (
              <InlineAlert type="error" title="Gagal Memproses">
                {errorMsg}
              </InlineAlert>
            )}

            {/* Info Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 text-amber-950 space-y-1 shadow-2xs">
              <p className="font-bold flex items-center gap-1.5 text-xs text-amber-900">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Ketentuan Pemutihan Meja Piket
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Semua siswa yang tercatat <b>Terlambat</b> pada rentang jam di
                bawah akan otomatis diubah statusnya menjadi <b>Hadir</b> dan
                poin sanksi keterlambatannya dihapuskan.
              </p>
            </div>

            {/* Tanggal Kejadian */}
            <Field label="Tanggal Kejadian" required>
              <CustomDatePicker
                value={tanggal}
                onChange={setTanggal}
                className="w-full"
              />
            </Field>

            {/* Rentang Waktu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Jam Mulai Gangguan" required>
                <CustomTimePicker
                  value={jamMulai}
                  onChange={setJamMulai}
                  className="w-full"
                />
              </Field>

              <Field label="Jam Selesai Toleransi" required>
                <CustomTimePicker
                  value={jamSelesai}
                  onChange={setJamSelesai}
                  className="w-full"
                />
              </Field>
            </div>

            {/* Pilihan Cepat Alasan */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Pilihan Cepat Alasan Kejadian <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_ALASAN.map((opt) => {
                  const isSelected = alasan === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAlasan(opt)}
                      className={`text-left text-[11px] p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2 ${
                        isSelected
                          ? "bg-amber-50 border-amber-400 text-amber-900 font-bold shadow-xs shadow-amber-500/10"
                          : "bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80 text-slate-700 font-medium"
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full border mt-0.5 shrink-0 flex items-center justify-center transition-colors ${
                          isSelected
                            ? "border-amber-600 bg-amber-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <span className="leading-snug">{opt}</span>
                    </button>
                  );
                })}
              </div>

              <textarea
                rows={2}
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                placeholder="Atau ketik keterangan rinci alasan force majeure..."
                required
                className={`${INPUT_CLASS} min-h-16 py-2 text-xs font-medium focus:border-amber-500 focus:ring-amber-500/20 resize-none`}
              />
            </div>
          </div>
        </SheetBody>

        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={onClose}
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            icon={<ShieldCheck className="w-4 h-4" />}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-md shadow-amber-600/20 text-white"
          >
            Terapkan Pemutihan Sekarang
          </Button>
        </SheetFooter>
      </form>
    </Sheet>
  );
}
