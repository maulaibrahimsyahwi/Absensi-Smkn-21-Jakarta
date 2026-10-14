import React, { useState, useRef, useEffect } from "react";
import {
  Lock,
  KeyRound,
  PenLine,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  LogOut,
  ArrowRight,
  RotateCcw,
  Undo2,
  Loader2,
  Check,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  peekFirstLoginSecret,
  consumeFirstLoginSecret,
} from "../utils/firstLoginSecret";
import { passwordChecks, PASSWORD_MIN } from "../utils/passwordPolicy";
import SignaturePad, { SignaturePadHandle } from "./ui/SignaturePad";
import Button from "./ui/Button";

type Step = "password" | "signature";

export default function OnboardingGate(): React.JSX.Element | null {
  const { user, changePassword, saveSignature, logout } = useAuth();

  const [step, setStep] = useState<Step>("password");
  const [oldPassword, setOldPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showOldPass, setShowOldPass] = useState<boolean>(false);
  const [showNewPass, setShowNewPass] = useState<boolean>(false);
  const [showConfirmPass, setShowConfirmPass] = useState<boolean>(false);
  const [isSecretStashed, setIsSecretStashed] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Signature state
  const sigRef = useRef<SignaturePadHandle>(null);
  const [isSigValid, setIsSigValid] = useState<boolean>(false);

  // Cek apakah akun perlu melewati Onboarding Gate
  const mustChangePassword = Boolean(user?.must_change_password);
  const needsOnboarding = Boolean(user && (mustChangePassword || step === "signature"));

  useEffect(() => {
    if (!mustChangePassword) return;

    const stashed = peekFirstLoginSecret();
    if (stashed) {
      setOldPassword(stashed);
      setIsSecretStashed(true);
    } else {
      setIsSecretStashed(false);
    }
  }, [mustChangePassword]);

  if (!needsOnboarding) {
    return null;
  }

  const checkResult = passwordChecks(newPassword, {
    oldPassword,
    username: user?.username,
    nis: user?.nis,
    confirmPassword,
  });

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const currentPw = oldPassword.trim();
    if (!currentPw) {
      setErrorMsg("Kata sandi saat ini wajib diisi.");
      return;
    }

    if (!checkResult.valid) {
      setErrorMsg(
        checkResult.error || "Kata sandi belum memenuhi kriteria keamanan."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword(currentPw, newPassword.trim());
      if (res.success) {
        consumeFirstLoginSecret();
        setSuccessMsg("Kata sandi berhasil diperbarui!");
        setTimeout(() => {
          setSuccessMsg("");
          setStep("signature");
        }, 800);
      } else {
        setErrorMsg(res.message || "Gagal mengubah kata sandi.");
      }
    } catch {
      setErrorMsg("Terjadi gangguan koneksi saat memperbarui kata sandi.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureSubmit = async () => {
    if (!sigRef.current) return;
    const dataUrl = sigRef.current.toDataURL();
    if (!dataUrl) {
      setErrorMsg("Goreskan tanda tangan digital Anda terlebih dahulu.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    try {
      const res = await saveSignature(dataUrl);
      if (res.success) {
        setSuccessMsg("Tanda tangan digital berhasil disimpan!");
        // State must_change_password sudah false, gate otomatis tertutup
      } else {
        setErrorMsg(res.message || "Gagal menyimpan tanda tangan digital.");
      }
    } catch {
      setErrorMsg("Gagal menyimpan tanda tangan. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  };

  const roleLabel =
    user?.role === "siswa"
      ? "Siswa"
      : user?.role === "admin"
      ? "Administrator"
      : "Guru Piket";

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-900/90 backdrop-blur-md overflow-y-auto animate-in fade-in duration-300">
      {/* Header bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700/80 bg-slate-900/95 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white sm:text-base leading-tight">
              Aktivasi Akun SMKN 21
            </h1>
            <p className="text-xs text-slate-400">
              {user?.nama} ({roleLabel})
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          title="Keluar dari akun ini"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </header>

      {/* Progress stepper */}
      <div className="w-full max-w-lg mx-auto px-4 pt-6 pb-2">
        <div className="flex items-center justify-between text-xs font-medium">
          <div
            className={`flex items-center gap-2 ${
              step === "password"
                ? "text-blue-400 font-semibold"
                : "text-emerald-400"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                step === "password"
                  ? "bg-blue-600 text-white"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              }`}
            >
              {step === "signature" ? <Check className="h-3.5 w-3.5" /> : "1"}
            </span>
            <span>Ubah Kata Sandi</span>
          </div>

          <div
            className={`h-0.5 flex-1 mx-3 ${
              step === "signature" ? "bg-emerald-500/40" : "bg-slate-700"
            }`}
          />

          <div
            className={`flex items-center gap-2 ${
              step === "signature"
                ? "text-blue-400 font-semibold"
                : "text-slate-400"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                step === "signature"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}
            >
              2
            </span>
            <span>Tanda Tangan Digital</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/95 p-5 sm:p-7 shadow-2xl">
          {errorMsg && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {step === "password" ? (
            /* STEP 1: UBAH KATA SANDI */
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-lg bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400 mb-2 border border-blue-500/20">
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Langkah 1 dari 2</span>
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Buat Kata Sandi Baru Pribadi
                </h2>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Kata sandi akun Anda masih menggunakan bawaan sekolah (NIS / NIP).
                  Demi keamanan dan privasi data UU PDP, Anda wajib membuat kata sandi baru yang aman.
                </p>
              </div>

              {/* Input Kata Sandi Saat Ini */}
              {!isSecretStashed && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Kata Sandi Saat Ini (Bawaan)
                  </label>
                  <div className="relative">
                    <input
                      type={showOldPass ? "text" : "password"}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Masukkan kata sandi saat ini / NIS / NIP"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPass(!showOldPass)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                    >
                      {showOldPass ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Input Kata Sandi Baru */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={`Minimal ${PASSWORD_MIN} karakter (huruf besar, kecil, angka)`}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showNewPass ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Score bar */}
                {newPassword.length > 0 && (
                  <div className="mt-2">
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full transition-all duration-300 ${
                          checkResult.score <= 1
                            ? "w-1/4 bg-rose-500"
                            : checkResult.score === 2
                            ? "w-2/4 bg-amber-500"
                            : checkResult.score === 3
                            ? "w-3/4 bg-blue-500"
                            : "w-full bg-emerald-500"
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Input Konfirmasi Kata Sandi */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Ulangi Kata Sandi Baru
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang kata sandi baru"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showConfirmPass ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Indikator Persyaratan Keamanan */}
              <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-3 space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Kriteria Keamanan Kata Sandi:
                </span>
                {checkResult.rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`flex items-center gap-2 text-[11px] ${
                      rule.passed ? "text-emerald-400" : "text-slate-400"
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
                        rule.passed
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-slate-700/60 text-slate-400"
                      }`}
                    >
                      {rule.passed ? "✓" : "•"}
                    </div>
                    <span>{rule.label}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full justify-center py-2.5 text-xs font-semibold"
                  disabled={loading || !checkResult.valid}
                  icon={
                    loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )
                  }
                >
                  {loading ? "Menyimpan Kata Sandi..." : "Simpan & Lanjut ke Tanda Tangan"}
                </Button>
              </div>
            </form>
          ) : (
            /* STEP 2: TANDA TANGAN DIGITAL */
            <div className="space-y-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 mb-2 border border-emerald-500/20">
                  <PenLine className="h-3.5 w-3.5" />
                  <span>Langkah 2 dari 2</span>
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Bubuhkan Tanda Tangan Digital
                </h2>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Tanda tangan digital ini akan digunakan secara sah untuk verifikasi surat izin,
                  rekapitulasi presensi, dan berkas kedisiplinan sekolah.
                </p>
              </div>

              {/* Area Pad Tanda Tangan */}
              <div className="rounded-2xl border border-slate-700 bg-white p-2">
                <SignaturePad
                  ref={sigRef}
                  onChange={setIsSigValid}
                  className="h-56 sm:h-64"
                />
              </div>

              {/* Tombol aksi pad */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    icon={<Undo2 className="h-3.5 w-3.5" />}
                    onClick={() => sigRef.current?.undo()}
                  >
                    Urungkan
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    icon={<RotateCcw className="h-3.5 w-3.5" />}
                    onClick={() => sigRef.current?.clear()}
                  >
                    Bersihkan
                  </Button>
                </div>

                <span
                  className={`text-[11px] font-medium ${
                    isSigValid ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {isSigValid ? "Tanda tangan valid ✓" : "Goreskan tanda tangan"}
                </span>
              </div>

              {/* Deklarasi Persetujuan UU PDP No. 27/2022 */}
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-[11px] text-blue-300 leading-relaxed">
                <span className="font-semibold text-blue-200">Persetujuan UU PDP (No. 27/2022 Pasal 22 & 25):</span> Dengan menyimpan data ini, saya menyetujui pemrosesan data pribadi dan biometrik wajah untuk keperluan presensi dan verifikasi administrasi resmi SMKN 21 Jakarta.
              </div>

              {/* Tombol submit akhir */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="primary"
                  className="w-full justify-center py-2.5 text-xs font-semibold"
                  disabled={loading || !isSigValid}
                  onClick={handleSignatureSubmit}
                  icon={
                    loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )
                  }
                >
                  {loading ? "Menyimpan Data..." : "Simpan & Masuk ke Aplikasi"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

