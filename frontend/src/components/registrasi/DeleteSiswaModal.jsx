import React from "react";

export default function DeleteSiswaModal({
  deletingSiswa,
  setDeletingSiswa,
  confirmDeleteSiswa,
}) {
  if (!deletingSiswa) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-sm max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-6">
        <h3 className="text-base font-bold text-slate-900 mb-2">
          Hapus Siswa dari Database?
        </h3>
        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
          Apakah Anda yakin ingin menghapus data{" "}
          <strong>{deletingSiswa.nama}</strong> ({deletingSiswa.kelas})? Sampel
          biometrik wajah dan seluruh data presensinya akan dihapus permanen.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDeletingSiswa(null)}
            className="flex-1 py-2 text-xs font-semibold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={confirmDeleteSiswa}
            className="flex-1 py-2 text-xs font-bold rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
          >
            Hapus Siswa
          </button>
        </div>
      </div>
    </div>
  );
}
