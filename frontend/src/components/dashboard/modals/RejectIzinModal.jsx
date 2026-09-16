import React from "react";
import { AlertCircle, Loader2 } from "lucide-react";

export default function RejectIzinModal({
  item,
  rejectNote,
  setRejectNote,
  verifyingId,
  onConfirmReject,
  onClose,
}) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Tolak Pengajuan {item.jenis}?
            </h3>
            <p className="text-xs text-slate-500">
              Siswa {item.nama} ({item.kelas})
            </p>
          </div>
        </div>

        {/* Alasan Siswa */}
        <div className="mb-3.5 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
          <span className="font-semibold text-slate-500 block mb-1">
            Alasan Pengajuan Siswa:
          </span>
          <p className="text-slate-800 italic break-words whitespace-normal leading-relaxed">
            "{item.alasan}"
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Catatan / Alasan Penolakan
          </label>
          <textarea
            rows={3}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Contoh: Surat keterangan dokter tidak terbaca jelas, mohon unggah ulang..."
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={verifyingId === item.id}
            onClick={() => onConfirmReject(item.id, rejectNote)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {verifyingId === item.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>Konfirmasi Tolak</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
