import React from "react";
import {
  Trash2,
  AlertTriangle,
  X,
  Loader2,
  LogIn,
  LogOut,
  Calendar,
  Clock,
  User,
} from "lucide-react";

export default function DeleteIzinModal({
  deletingIzin,
  onClose,
  onConfirm,
  loading = false,
}) {
  if (!deletingIzin) return null;

  const isMasuk = deletingIzin.tipe === "Izin Masuk";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-rose-100 w-full max-w-md shadow-2xl p-5 sm:p-6 relative animate-in zoom-in-95 duration-150">
        {/* Tombol Tutup Silang */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          title="Tutup Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header dengan Icon Sampah Merah */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0 shadow-xs">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              Hapus Surat Izin Piket?
            </h3>
          </div>
        </div>

        {/* Kotak Rincian Surat Izin yang akan Dihapus */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl mb-4 space-y-2 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  isMasuk
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {isMasuk ? (
                  <LogIn className="w-3 h-3" />
                ) : (
                  <LogOut className="w-3 h-3" />
                )}
                <span>{deletingIzin.tipe}</span>
              </span>
            </div>
            <span className="font-semibold text-slate-600">
              {deletingIzin.jam_ke}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-slate-500 font-medium">Siswa</span>
            <span className="font-bold text-slate-900 text-right">
              {deletingIzin.nama} ({deletingIzin.kelas})
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-slate-500 font-medium">Tanggal</span>
            <span className="font-medium text-slate-700">
              {deletingIzin.hari},{" "}
              {deletingIzin.tanggal_formatted || deletingIzin.tanggal}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-slate-500 font-medium">Petugas</span>
            <span className="font-medium text-slate-700">
              {deletingIzin.petugas_piket}
            </span>
          </div>

          <div className="pt-1 border-t border-slate-200/60">
            <p className="text-[11px] text-slate-500 font-medium mb-0.5">
              Alasan Keperluan
            </p>
            <p className="text-xs text-slate-700 italic bg-white p-2 rounded-lg border border-slate-200">
              "{deletingIzin.alasan}"
            </p>
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 text-xs font-semibold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 text-xs font-bold rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Hapus Surat</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
