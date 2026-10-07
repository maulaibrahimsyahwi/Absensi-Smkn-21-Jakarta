import React, { useState, useEffect } from "react";
import api from "../../services/api";
import CustomDatePicker from "../CustomDatePicker";
import { Siswa } from "../../types/siswa";
import Sheet, { SheetBody, SheetFooter, SheetHeader } from "../ui/Sheet";
import Button from "../ui/Button";
import InlineAlert from "../ui/InlineAlert";
import ChipSelect from "../ui/ChipSelect";
import ConfirmSheet from "../ui/ConfirmSheet";
import { todayWib, addDaysYmd, isExemptActive } from "../../utils/date";

export interface MedicalExemptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSiswa: Siswa | null;
  onSuccess: (msg: string) => void;
}

const REASONS = [
  "Perban atau cedera pada wajah",
  "Penyakit kulit sementara",
  "Pemulihan setelah tindakan medis",
  "Lainnya",
] as const;

type ExemptionReason = (typeof REASONS)[number];
const MAX_DAYS = 30;

export default function MedicalExemptionModal({
  isOpen,
  onClose,
  targetSiswa,
  onSuccess,
}: MedicalExemptionModalProps) {
  const today = todayWib();
  const [exemptUntil, setExemptUntil] = useState<string>("");
  const [reason, setReason] = useState<ExemptionReason>(REASONS[0]);
  const [catatanLainnya, setCatatanLainnya] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState<boolean>(false);

  useEffect(() => {
    if (targetSiswa && isOpen) {
      setExemptUntil(
        targetSiswa.medical_exemption_until || addDaysYmd(today, 7),
      );
      const currentAlasan = targetSiswa.medical_exemption_alasan || "";
      const matched = REASONS.find((r) => r === currentAlasan);
      if (matched) {
        setReason(matched);
        setCatatanLainnya("");
      } else if (currentAlasan) {
        setReason("Lainnya");
        setCatatanLainnya(currentAlasan);
      } else {
        setReason(REASONS[0]);
        setCatatanLainnya("");
      }
      setErrorMsg("");
      setRevokeConfirmOpen(false);
    }
  }, [targetSiswa, isOpen, today]);

  if (!targetSiswa) return null;

  const isCurrentlyExempt = isExemptActive(targetSiswa.medical_exemption_until);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!exemptUntil) {
      setErrorMsg("Tanggal batas dispensasi medis wajib diisi.");
      return;
    }

    if (exemptUntil < today) {
      setErrorMsg("Tanggal berakhir tidak boleh tanggal lampau.");
      return;
    }

    const finalAlasan =
      reason === "Lainnya" && catatanLainnya.trim()
        ? `Lainnya: ${catatanLainnya.trim()}`
        : reason;

    setLoading(true);
    try {
      const res = await api.post(`/siswa/${targetSiswa.id}/medical_exemption`, {
        exempt_until: exemptUntil,
        alasan: finalAlasan,
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
    } catch (err: any) {
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
        setRevokeConfirmOpen(false);
        onSuccess(
          `Dispensasi medis untuk ${targetSiswa.nama} berhasil dicabut.`,
        );
        onClose();
      } else {
        setErrorMsg(res.data?.message || "Gagal mencabut dispensasi medis.");
      }
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message ||
          "Terjadi kesalahan saat mencabut dispensasi medis.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Sheet isOpen={isOpen} onClose={onClose} size="md" labelledBy="med-title">
        <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
          <SheetHeader
            id="med-title"
            title="Dispensasi medis wajah"
            subtitle={`${targetSiswa.nama} (${targetSiswa.kelas})`}
            onClose={onClose}
          />
          <SheetBody>
            <div className="space-y-5">
              {errorMsg && <InlineAlert type="error">{errorMsg}</InlineAlert>}

              <InlineAlert type="warning">
                Selama masa dispensasi aktif, siswa dapat melakukan presensi
                tanpa verifikasi wajah. Pemberian dispensasi ini dicatat dalam
                log audit sekolah.
              </InlineAlert>

              <div>
                <p className="mb-1.5 text-xs font-bold text-slate-700">
                  Berlaku sampai <span className="text-rose-500">*</span>
                </p>
                <div className="mb-2 flex flex-wrap gap-2">
                  {[3, 7, 14, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setExemptUntil(addDaysYmd(today, d))}
                      className="press min-h-9 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      {d} hari
                    </button>
                  ))}
                </div>
                <CustomDatePicker
                  value={exemptUntil}
                  onChange={setExemptUntil}
                  minDate={today}
                  maxDate={addDaysYmd(today, MAX_DAYS)}
                  className="w-full"
                  placeholder="Pilih tanggal berakhir..."
                />
                <p className="mt-1 text-xs text-slate-500">
                  Maksimal durasi satu kali penetapan adalah {MAX_DAYS} hari.
                </p>
              </div>

              <div>
                <ChipSelect
                  label="Kategori kondisi medis"
                  value={reason}
                  onChange={setReason}
                  options={REASONS}
                  grid
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Cukup pilih kategori. Jangan menuliskan diagnosa penyakit
                  spesifik demi menjaga privasi medis siswa. Bukti surat dokter
                  asli diarsipkan fisik oleh Tata Usaha.
                </p>
              </div>

              {reason === "Lainnya" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Kategori Lainnya (Singkat)
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={catatanLainnya}
                    onChange={(e) => setCatatanLainnya(e.target.value)}
                    placeholder="Contoh: Kondisi pasca tindakan dokter"
                    className="w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  />
                </div>
              )}
            </div>
          </SheetBody>
          <SheetFooter>
            <div className="flex w-full items-center justify-between gap-2">
              {isCurrentlyExempt ? (
                <Button
                  type="button"
                  variant="dangerSoft"
                  onClick={() => setRevokeConfirmOpen(true)}
                  disabled={loading}
                >
                  Cabut Dispensasi
                </Button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onClose} disabled={loading}>
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={!exemptUntil}
                >
                  Simpan Dispensasi
                </Button>
              </div>
            </div>
          </SheetFooter>
        </form>
      </Sheet>

      <ConfirmSheet
        isOpen={revokeConfirmOpen}
        onClose={() => setRevokeConfirmOpen(false)}
        onConfirm={handleRevoke}
        loading={loading}
        title="Cabut dispensasi medis?"
        confirmLabel="Ya, cabut sekarang"
        danger={true}
      >
        <p>
          Dispensasi medis wajah untuk <b>{targetSiswa.nama}</b> akan dicabut
          segera. Siswa akan kembali diwajibkan melakukan pemindaian wajah saat
          presensi.
        </p>
      </ConfirmSheet>
    </>
  );
}
