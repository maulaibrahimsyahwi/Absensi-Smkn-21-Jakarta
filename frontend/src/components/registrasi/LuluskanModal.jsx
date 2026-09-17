import React from "react";
import {
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

export default function LuluskanModal({
  isOpen,
  onClose,
  onConfirm,
  type = "selected", // "tingkat_xii" | "selected" | "single"
  targetSiswa = null,
  selectedCount = 0,
  loading = false,
}) {
  if (!isOpen) return null;

  const isTingkatXII = type === "tingkat_xii";
  const isSingle = type === "single";

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

        {/* Icon & Judul */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {isTingkatXII
                ? "Luluskan Seluruh Angkatan Kelas XII?"
                : isSingle
                  ? `Luluskan ${targetSiswa?.nama}?`
                  : `Luluskan ${selectedCount} Siswa Terpilih?`}
            </h3>
            <p className="text-xs text-indigo-600 font-semibold mt-0.5">
              Ubah Status Menjadi Alumni / Lulus
            </p>
          </div>
        </div>

        {/* Deskripsi & Highlight Manfaat */}
        <div className="space-y-3 mb-5">
          <p className="text-xs text-slate-600 leading-relaxed">
            {isTingkatXII ? (
              <>
                Siswa tingkat <strong>Kelas XII</strong> yang saat ini berstatus
                aktif akan diubah statusnya menjadi{" "}
                <strong>Alumni / Lulus</strong>. Anda tidak perlu menghapus data
                mereka satu per satu.
              </>
            ) : isSingle ? (
              <>
                Siswa <strong>{targetSiswa?.nama}</strong> ({targetSiswa?.kelas}
                ) akan diubah statusnya menjadi <strong>Alumni / Lulus</strong>.
              </>
            ) : (
              <>
                Sebanyak <strong>{selectedCount} siswa</strong> yang Anda pilih
                akan diubah statusnya menjadi <strong>Alumni / Lulus</strong>.
              </>
            )}
          </p>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs">
            <div className="flex items-start gap-2 text-slate-700 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Riwayat Absensi Tetap Utuh</strong>
              </span>
            </div>
            <div className="flex items-start gap-2 text-slate-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>
                  Biometrik Otomatis tidak akan lagi dapat memindai presensi
                </strong>{" "}
              </span>
            </div>
            <div className="flex items-start gap-2 text-slate-700 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Bisa Diaktifkan Kembali</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 text-xs font-semibold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {loading ? (
              <span>Memproses...</span>
            ) : (
              <>
                <span>
                  {isTingkatXII ? "Luluskan Kelas XII" : "Ya, Luluskan Siswa"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
