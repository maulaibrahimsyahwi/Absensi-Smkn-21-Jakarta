import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  User,
  KeyRound,
  PenLine,
  Camera,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Lock,
  GraduationCap,
  Sparkles,
  Info,
  Upload,
  Trash2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { validateAndCompressImage } from "../utils/imageUtils";
import SignaturePadModal from "./SignaturePadModal";
import SelfFaceEnrollModal from "./SelfFaceEnrollModal";

export default function ProfileModal({
  isOpen,
  onClose,
  initialTab = "profil",
}) {
  const {
    user,
    isSiswa,
    isPiket,
    isAdmin,
    saveSignature,
    updateFotoProfil,
    deleteFotoProfil,
  } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);

  // State Ubah Sandi
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");

  // State Tanda Tangan
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [ttdPasswordPrompt, setTtdPasswordPrompt] = useState(false);
  const [ttdConfirmPassword, setTtdConfirmPassword] = useState("");
  const [ttdError, setTtdError] = useState("");
  const [ttdSuccess, setTtdSuccess] = useState("");

  // State Biometrik Wajah
  const [showFaceEnrollModal, setShowFaceEnrollModal] = useState(false);

  // State Foto Profil
  const fileInputRef = useRef(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoSuccess, setPhotoSuccess] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPassError("");
      setPassSuccess("");
      setTtdPasswordPrompt(false);
      setTtdConfirmPassword("");
      setTtdError("");
      setTtdSuccess("");
      setPhotoError("");
      setPhotoSuccess("");
      setShowDeleteConfirm(false);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  // Handle Pilih & Upload Foto Profil
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError("");
    setPhotoSuccess("");

    // Validasi ukuran awal (< 500 KB)
    if (file.size > 500 * 1024) {
      setPhotoError(
        `Ukuran file terlalu besar (${(file.size / 1024).toFixed(1)} KB). Maksimal ukuran file adalah < 500 KB.`,
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setPhotoLoading(true);
    try {
      // Validasi & kompresi cerdas jika diperlukan
      const base64Photo = await validateAndCompressImage(file, 500);

      const res = await updateFotoProfil(base64Photo);
      if (res.success) {
        setPhotoSuccess("Foto profil berhasil diperbarui!");
      } else {
        setPhotoError(res.message || "Gagal memperbarui foto profil.");
      }
    } catch (err) {
      setPhotoError(err.message || "Gagal memproses foto profil.");
    } finally {
      setPhotoLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Buka dialog konfirmasi kustom hapus foto
  const handleDeletePhoto = () => {
    setPhotoError("");
    setPhotoSuccess("");
    setShowDeleteConfirm(true);
  };

  // Eksekusi hapus foto setelah disetujui pada dialog kustom
  const confirmDeletePhoto = async () => {
    setShowDeleteConfirm(false);
    setPhotoError("");
    setPhotoSuccess("");
    setPhotoLoading(true);

    try {
      const res = await deleteFotoProfil();
      if (res.success) {
        setPhotoSuccess(
          "Foto profil berhasil dihapus dan kembali ke avatar default.",
        );
      } else {
        setPhotoError(res.message || "Gagal menghapus foto profil.");
      }
    } catch (err) {
      setPhotoError("Terjadi kendala saat menghapus foto profil.");
    } finally {
      setPhotoLoading(false);
    }
  };

  // Handle Ubah Kata Sandi
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");

    if (!oldPassword.trim()) {
      setPassError("Kata sandi saat ini wajib diisi.");
      return;
    }
    if (!newPassword.trim()) {
      setPassError("Kata sandi baru wajib diisi.");
      return;
    }
    if (newPassword.length < 4) {
      setPassError("Kata sandi baru minimal 4 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }

    setPassLoading(true);
    try {
      const payload = {
        role: user?.role,
        id: user?.id,
        old_password: oldPassword.trim(),
        new_password: newPassword.trim(),
      };
      const res = await api.post("/auth/change_password", payload);
      if (res.data && res.data.success) {
        setPassSuccess(res.data.message || "Kata sandi berhasil diperbarui!");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        "Gagal mengubah kata sandi. Pastikan kata sandi saat ini benar.";
      setPassError(errMsg);
    } finally {
      setPassLoading(false);
    }
  };

  // Handle Klik "Perbarui Tanda Tangan"
  const handleInitiateTtdUpdate = () => {
    setTtdError("");
    setTtdSuccess("");
    if (isSiswa && user?.tanda_tangan) {
      // Jika siswa sudah memiliki TTD, wajib verifikasi password dulu
      setTtdPasswordPrompt(true);
    } else {
      setShowSignaturePad(true);
    }
  };

  // Verifikasi password siswa sebelum buka kanvas TTD
  const handleVerifyPasswordForTtd = (e) => {
    e.preventDefault();
    setTtdError("");
    if (!ttdConfirmPassword.trim()) {
      setTtdError(
        "Kata sandi akun Anda wajib diisi untuk membuka kunci tanda tangan.",
      );
      return;
    }
    // Jika kata sandi diisi, buka kanvas tanda tangan
    setShowSignaturePad(true);
    setTtdPasswordPrompt(false);
  };

  // Simpan TTD dari canvas
  const handleSaveSignature = async (sigBase64) => {
    try {
      const res = await saveSignature(
        sigBase64,
        ttdConfirmPassword || undefined,
      );
      if (res.success) {
        setTtdSuccess(
          "Tanda tangan digital Anda berhasil diperbarui dan disimpan!",
        );
        setTtdConfirmPassword("");
      } else {
        setTtdError(res.message || "Gagal menyimpan tanda tangan digital.");
      }
    } catch (err) {
      setTtdError("Terjadi kendala saat menyimpan tanda tangan.");
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 my-auto">
        {/* Header Modal - Modern Dark Glassmorphism */}
        <div className="relative overflow-hidden px-6 py-5 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white border-b border-slate-800/80 flex items-center justify-between flex-shrink-0">
          {/* Ambient Glows */}
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10 min-w-0">
            {/* Avatar Squircle with Glowing Ring */}
            <div className="relative group flex-shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/15 p-0.5 shadow-xl ring-2 ring-indigo-500/30 ring-offset-2 ring-offset-slate-950 overflow-hidden flex items-center justify-center">
                {user?.foto_profil ? (
                  <img
                    src={user.foto_profil}
                    alt={user?.nama || "Foto Profil"}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : isSiswa ? (
                  <GraduationCap className="w-7 h-7 text-blue-300" />
                ) : isPiket ? (
                  <ShieldCheck className="w-7 h-7 text-emerald-300" />
                ) : (
                  <User className="w-7 h-7 text-indigo-300" />
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("profil");
                  fileInputRef.current?.click();
                }}
                title="Unggah / Ganti Foto Profil (< 500 KB)"
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer border border-white/40"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* User Details & Role Badge */}
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-white truncate max-w-xs">
                  {user?.nama || user?.username || "Profil Pengguna"}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border shadow-2xs ${
                    isAdmin
                      ? "bg-purple-500/20 text-purple-200 border-purple-400/30"
                      : isPiket
                        ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/30"
                        : user?.status === "Alumni"
                          ? "bg-amber-500/20 text-amber-200 border-amber-400/30"
                          : "bg-blue-500/20 text-blue-200 border-blue-400/30"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isAdmin
                        ? "bg-purple-400 animate-pulse"
                        : isPiket
                          ? "bg-emerald-400 animate-pulse"
                          : user?.status === "Alumni"
                            ? "bg-amber-400"
                            : "bg-blue-400 animate-pulse"
                    }`}
                  />
                  <span>
                    {isAdmin
                      ? "Administrator"
                      : isPiket
                        ? "Guru Piket"
                        : user?.status === "Alumni"
                          ? "Alumni"
                          : "Siswa"}
                  </span>
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium truncate flex items-center gap-1.5">
                {isSiswa ? (
                  <>
                    <span>NIS: {user?.nis || "-"}</span>
                    <span className="text-slate-500">•</span>
                    <span>Kelas: {user?.kelas || "-"}</span>
                  </>
                ) : (
                  <>
                    <span>{user?.username || "-"}</span>
                    <span className="text-slate-500">•</span>
                    <span>SMKN 21 Jakarta</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Close Button - Frosted Glass */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer relative z-10 border border-white/5"
            title="Tutup Modal Profil"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50/70 px-6 pt-2 gap-2 overflow-x-auto flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("profil")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === "profil"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profil</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sandi")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === "sandi"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Ubah Sandi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ttd")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === "ttd"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <PenLine className="w-3.5 h-3.5" />
            <span>Tanda Tangan</span>
          </button>

          {isSiswa && (
            <button
              type="button"
              onClick={() => setActiveTab("wajah")}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === "wajah"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Biometrik Wajah</span>
            </button>
          )}
        </div>

        {/* Tab Contents */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 min-h-[400px] space-y-4">
          {/* TAB 1: PROFIL RINGKASAN */}
          {activeTab === "profil" && (
            <div className="space-y-4 animate-in fade-in">
              {/* Photo Upload & Avatar Card */}
              <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-slate-200 flex items-center justify-center">
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
                    <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center backdrop-blur-xs">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Foto Profil
                    </h4>
                    <span className="inline-flex items-center text-[10px] font-semibold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200/60 w-fit mx-auto sm:mx-0">
                      Maks. &lt; 500 KB (JPG, PNG, WEBP)
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoSelect}
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      disabled={photoLoading}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                    >
                      {photoLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {user?.foto_profil ? "Ganti Foto" : "Unggah Foto"}
                      </span>
                    </button>

                    {user?.foto_profil && (
                      <button
                        type="button"
                        disabled={photoLoading}
                        onClick={handleDeletePhoto}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 disabled:opacity-50 rounded-xl text-xs font-bold transition-all cursor-pointer border border-rose-200/60"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Hapus Foto</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Notifikasi Foto */}
              {photoError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{photoError}</span>
                </div>
              )}
              {photoSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{photoSuccess}</span>
                </div>
              )}

              {/* Data Identitas Akun */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Nama Lengkap
                  </p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">
                    {user?.nama || "-"}
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Peran
                  </p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5 capitalize">
                    {isAdmin
                      ? "Administrator"
                      : isPiket
                        ? "Guru Piket"
                        : "Siswa Aktif"}
                  </p>
                </div>

                {isSiswa && (
                  <>
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Nomor Induk Siswa (NIS)
                      </p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5 font-mono">
                        {user?.nis || "-"}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Kelas
                      </p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5 font-semibold">
                        {user?.kelas || "-"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: UBAH KATA SANDI */}
          {activeTab === "sandi" && (
            <form
              onSubmit={handleChangePassword}
              className="space-y-4 animate-in fade-in"
            >
              {passError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{passError}</span>
                </div>
              )}
              {passSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{passSuccess}</span>
                </div>
              )}

              {/* Sandi Saat Ini */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Sandi Saat Ini <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showOldPass ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder={
                      isSiswa
                        ? "Masukkan kata sandi lama (atau NIS jika belum pernah diubah)"
                        : "Masukkan kata sandi saat ini"
                    }
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPass(!showOldPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showOldPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Sandi Baru */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Sandi Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Sandi Baru */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Konfirmasi Kata Sandi Baru{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={passLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {passLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Kata Sandi...</span>
                  </>
                ) : (
                  <span>Perbarui Kata Sandi</span>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: TANDA TANGAN DIGITAL */}
          {activeTab === "ttd" && (
            <div className="space-y-4 animate-in fade-in">
              {ttdError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{ttdError}</span>
                </div>
              )}
              {ttdSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{ttdSuccess}</span>
                </div>
              )}

              {/* Preview Tanda Tangan */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center">
                <p className="text-xs font-bold text-slate-600 mb-2">
                  Tanda Tangan Saat Ini
                </p>
                <div className="w-full max-w-xs h-28 bg-white border border-dashed border-slate-300 rounded-xl flex items-center justify-center p-2 shadow-2xs">
                  {user?.tanda_tangan ? (
                    <img
                      src={user.tanda_tangan}
                      alt="Tanda Tangan Digital"
                      className="max-h-24 max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      Belum ada tanda tangan digital
                    </span>
                  )}
                </div>
              </div>

              {/* Prompt Verifikasi Password jika Siswa ingin perbarui TTD */}
              {ttdPasswordPrompt ? (
                <form
                  onSubmit={handleVerifyPasswordForTtd}
                  className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Konfirmasi Keamanan Akun
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Untuk mencegah orang lain merusak atau mengganti tanda
                        tangan Anda, masukkan kata sandi akun Anda untuk membuka
                        kanvas pembaruan tanda tangan.
                      </p>
                    </div>
                  </div>

                  <div>
                    <input
                      type="password"
                      value={ttdConfirmPassword}
                      onChange={(e) => setTtdConfirmPassword(e.target.value)}
                      placeholder="Masukkan kata sandi akun Anda..."
                      className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setTtdPasswordPrompt(false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Buka Kunci
                    </button>
                  </div>
                </form>
              ) : (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleInitiateTtdUpdate}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <PenLine className="w-4 h-4" />
                    <span>
                      {user?.tanda_tangan
                        ? "Perbarui Tanda Tangan"
                        : "Buat Tanda Tangan Sekarang"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BIOMETRIK WAJAH (KHUSUS SISWA) */}
          {activeTab === "wajah" && isSiswa && (
            <div className="space-y-4 animate-in fade-in">
              <div
                className={`p-4 rounded-2xl border ${
                  user?.terdaftar
                    ? "bg-emerald-50/70 border-emerald-200"
                    : "bg-amber-50/70 border-amber-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      user?.terdaftar
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {user?.terdaftar ? (
                      <ShieldCheck className="w-6 h-6" />
                    ) : (
                      <Camera className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {user?.terdaftar
                        ? "Biometrik Wajah Terdaftar & Terkunci"
                        : "Biometrik Wajah Belum Terdaftar"}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {user?.terdaftar
                        ? "Data biometrik wajah Anda telah tersimpan dan terenkripsi untuk presensi mandiri. Demi mencegah kecurangan dan penyalahgunaan akun, pembaruan wajah dikunci permanen."
                        : "Daftarkan 3 sudut sampel wajah Anda (depan, sedikit miring, senyum) agar dapat melakukan presensi mandiri selfie di lingkungan sekolah."}
                    </p>
                  </div>
                </div>
              </div>

              {user?.terdaftar ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Lock className="w-4 h-4 text-blue-600" />
                    <span>Kebijakan Keamanan Biometrik SMKN 21</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Siswa tidak diizinkan mengubah sampel wajah secara bebas
                    guna menjamin keaslian kehadiran. Jika terjadi kendala
                    pengenalan wajah saat absen (misalnya perubahan fisik atau
                    kacamata baru), silakan hubungi{" "}
                    <strong>Admin Sekolah</strong> atau{" "}
                    <strong>Guru Piket</strong> untuk melakukan reset biometrik
                    wajah.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowFaceEnrollModal(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Daftarkan Wajah Sekarang</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Kanvas Tanda Tangan */}
      <SignaturePadModal
        isOpen={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onSave={handleSaveSignature}
        initialSignature={user?.tanda_tangan || ""}
        title={
          isSiswa
            ? "Tanda Tangan Digital Siswa"
            : "Tanda Tangan Digital Guru Piket"
        }
        subtitle="Bubuhkan tanda tangan jelas"
      />

      {/* Modal Perekaman Wajah Mandiri */}
      {isSiswa && (
        <SelfFaceEnrollModal
          isOpen={showFaceEnrollModal}
          onClose={() => setShowFaceEnrollModal(false)}
          onSuccess={() => {
            setShowFaceEnrollModal(false);
            onClose();
          }}
        />
      )}

      {/* Modal Konfirmasi Kustom: Hapus Foto Profil */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-slate-900">
                Hapus Foto Profil?
              </h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Foto profil kustom Anda akan dihapus dan tampilan avatar akun
                akan dikembalikan ke avatar bawaan sistem.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeletePhoto}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm shadow-rose-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
