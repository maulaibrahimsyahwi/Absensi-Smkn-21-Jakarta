import React from "react";
import { Trash2, AlertTriangle, X } from "lucide-react";

export default function DeleteSiswaModal({
  deletingSiswa,
  setDeletingSiswa,
  confirmDeleteSiswa,
  isBulk = false,
  selectedCount = 0,
  confirmBulkDelete,
  onCloseBulk,
  loading = false,
}) {
  const isOpen = Boolean(deletingSiswa || isBulk);
  if (!isOpen) return null;

  const handleClose = () => {
    if (isBulk && onCloseBulk) {
      onCloseBulk();
    } else if (setDeletingSiswa) {
      setDeletingSiswa(null);
    }
  };

  const handleConfirm = () => {
    if (isBulk && confirmBulkDelete) {
      confirmBulkDelete();
    } else if (confirmDeleteSiswa) {
      confirmDeleteSiswa();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-rose-100 w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-6 relative">
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header dengan Icon Sampah Merah */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {isBulk
                ? `Hapus  ${selectedCount} Siswa?`
                : `Hapus  ${deletingSiswa?.nama}?`}
            </h3>
            <p className="text-xs text-rose-600 font-semibold mt-0.5">
              Penghapusan Permanen dari data Siswa/i
            </p>
          </div>
        </div>

        {/* Warning Box */}
        <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl mb-4 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-800 leading-relaxed font-medium">
            <strong>PERINGATAN</strong> Tindakan ini akan menghapus data siswa
            secara permanen beserta seluruh riwayat presensi harian,
            perpustakaan, dan izin sakitnya. Data yang dihapus tidak dapat
            dipulihkan.
          </p>
        </div>

        <p className="text-xs text-slate-600 mb-5 leading-relaxed">
          {isBulk ? (
            <>
              Apakah Anda yakin ingin menghapus ? Jika Anda hanya ingin siswa
              yang sudah lulus tidak bisa absen lagi, disarankan memilih{" "}
              <strong>"Luluskan ke Alumni"</strong> agar riwayat presensinya
              tetap aman tersimpan.
            </>
          ) : (
            <>
              Apakah Anda yakin ingin menghapus data{" "}
              <strong>{deletingSiswa?.nama}</strong> ({deletingSiswa?.kelas})?
              Jika siswa sudah lulus, Anda bisa memilih status{" "}
              <strong>"Alumni"</strong> tanpa perlu menghapus riwayat
              presensinya.
            </>
          )}
        </p>

        {/* Tombol Aksi */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 py-2.5 text-xs font-semibold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2.5 text-xs font-bold rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {loading ? (
              <span>Menghapus...</span>
            ) : (
              <>
                <span>{isBulk ? `Hapus` : "Ya, Hapus "}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
