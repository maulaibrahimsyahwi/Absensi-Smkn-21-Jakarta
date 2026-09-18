import React, { useRef, useState } from "react";
import {
  User,
  Camera,
  Upload,
  Trash2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { validateAndCompressImage } from "../../utils/imageUtils";

export default function TabInfoProfil({
  user,
  isSiswa,
  updateFotoProfil,
  deleteFotoProfil,
  onOpenFaceEnroll,
}) {
  const fileInputRef = useRef(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoSuccess, setPhotoSuccess] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError("");
    setPhotoSuccess("");

    if (!file.type.startsWith("image/")) {
      setPhotoError(
        "Format file tidak didukung. Harap pilih gambar JPEG/PNG/WebP.",
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Ukuran foto maksimal 5 MB.");
      return;
    }

    setPhotoLoading(true);
    try {
      const compressedBase64 = await validateAndCompressImage(file, {
        maxWidth: 600,
        maxHeight: 600,
        quality: 0.82,
      });

      const res = await updateFotoProfil(compressedBase64);
      if (res.success) {
        setPhotoSuccess("Foto profil berhasil diperbarui!");
      } else {
        setPhotoError(res.message || "Gagal mengunggah foto profil.");
      }
    } catch {
      setPhotoError("Terjadi kendala saat memproses gambar.");
    } finally {
      setPhotoLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeletePhoto = async () => {
    setPhotoLoading(true);
    setPhotoError("");
    setPhotoSuccess("");
    try {
      const res = await deleteFotoProfil();
      if (res.success) {
        setPhotoSuccess("Foto profil berhasil dihapus.");
        setShowDeleteConfirm(false);
      } else {
        setPhotoError(res.message || "Gagal menghapus foto profil.");
      }
    } catch {
      setPhotoError("Terjadi kendala saat menghapus foto.");
    } finally {
      setPhotoLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Alert Status */}
      {photoError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{photoError}</span>
        </div>
      )}
      {photoSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{photoSuccess}</span>
        </div>
      )}

      {/* Bagian Avatar & Foto Profil */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
        <div className="relative group">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center">
            {user?.foto_profil ? (
              <img
                src={user.foto_profil}
                alt={user?.nama || "Foto Profil"}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-slate-400" />
            )}
          </div>
          {photoLoading && (
            <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center text-white">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div>
            <h4 className="font-bold text-slate-800 text-sm sm:text-base">
              {user?.nama || user?.username}
            </h4>
            <p className="text-xs text-slate-500">
              {isSiswa
                ? `NIS: ${user?.nis} • Kelas ${user?.kelas}`
                : `Peran: ${user?.role?.toUpperCase()}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={photoLoading}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" /> Unggah Foto
            </button>
            {user?.foto_profil && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={photoLoading}
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Konfirmasi Hapus Foto */}
      {showDeleteConfirm && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-2.5">
          <p className="font-medium">
            Hapus foto profil dan gunakan avatar bawaan?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDeletePhoto}
              disabled={photoLoading}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs"
            >
              Ya, Hapus
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold text-xs"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Kartu Status Biometrik Wajah (Khusus Siswa) */}
      {isSiswa && (
        <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-xs sm:text-sm font-bold text-slate-800">
                  Biometrik Wajah
                </h5>
                <p className="text-[11px] text-slate-500">
                  {user?.terdaftar
                    ? "Wajah aktif terverifikasi"
                    : "Belum mendaftarkan sampel wajah"}
                </p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                user?.terdaftar
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {user?.terdaftar ? "Terdaftar" : "Belum"}
            </span>
          </div>

          {!user?.terdaftar && (
            <button
              type="button"
              onClick={onOpenFaceEnroll}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> Daftarkan Wajah Sekarang
            </button>
          )}
        </div>
      )}
    </div>
  );
}
