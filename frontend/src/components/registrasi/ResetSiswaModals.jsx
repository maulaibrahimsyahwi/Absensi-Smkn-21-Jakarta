import React from "react";
import { KeyRound, Camera, PenTool, Loader2 } from "lucide-react";

export default function ResetSiswaModals({
  resettingPasswordSiswa,
  setResettingPasswordSiswa,
  handleResetPasswordConfirm,
  resettingFaceSiswa,
  setResettingFaceSiswa,
  handleResetFaceConfirm,
  resettingSignatureSiswa,
  setResettingSignatureSiswa,
  handleResetSignatureConfirm,
  loading,
}) {
  return (
    <>
      {/* Modal Konfirmasi Reset Password Siswa ke Default (NIS) */}
      {resettingPasswordSiswa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Reset Kata Sandi Siswa?
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Kata sandi untuk <strong>{resettingPasswordSiswa.nama}</strong>{" "}
                ({resettingPasswordSiswa.kelas}) akan dikembalikan ke default
                awal:
              </p>
              <div className="mt-3 py-2 px-3 bg-amber-50 border border-amber-200 rounded-xl inline-block">
                <span className="text-xs font-mono font-bold text-amber-800">
                  Password Default {resettingPasswordSiswa.nis}
                </span>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setResettingPasswordSiswa(null)}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetPasswordConfirm}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mereset...</span>
                  </>
                ) : (
                  <span>Ya, Reset Password</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Reset Biometrik Wajah Siswa */}
      {resettingFaceSiswa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
                <Camera className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Reset Biometrik Wajah?
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Sampel wajah untuk <strong>{resettingFaceSiswa.nama}</strong> (
                {resettingFaceSiswa.kelas}) akan dihapus dari sistem biometrik.
              </p>
              <div className="mt-3 p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-left">
                <p className="text-[11px] text-cyan-800 font-medium leading-relaxed">
                  Siswa ini akan dapat mendaftarkan ulang 3 sampel wajah barunya
                  melalui Portal Siswa atau direkam ulang oleh Admin.
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setResettingFaceSiswa(null)}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetFaceConfirm}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mereset Wajah...</span>
                  </>
                ) : (
                  <span>Ya, Reset Wajah</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Reset Tanda Tangan Siswa */}
      {resettingSignatureSiswa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
                <PenTool className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Reset Tanda Tangan Digital?
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Tanda tangan digital untuk{" "}
                <strong>{resettingSignatureSiswa.nama}</strong> (
                {resettingSignatureSiswa.kelas}) akan dihapus.
              </p>
              <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-xl text-left">
                <p className="text-[11px] text-purple-800 font-medium leading-relaxed">
                  Siswa ini akan diminta membuat tanda tangan digital baru saat
                  membuka portal atau mengajukan surat izin.
                </p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setResettingSignatureSiswa(null)}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetSignatureConfirm}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mereset TTD...</span>
                  </>
                ) : (
                  <span>Ya, Reset TTD</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
