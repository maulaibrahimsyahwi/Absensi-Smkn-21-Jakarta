import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ShieldCheck,
  User,
  Lock,
  GraduationCap,
  ClipboardCheck,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  Info,
  HelpCircle,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, loadingAuth } = useAuth();

  const [activeTab, setActiveTab] = useState("siswa"); // "siswa" atau "staf"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState("credentials"); // "credentials" atau "2fa"
  const [totpCode, setTotpCode] = useState("");
  const [hpField, setHpField] = useState(""); // Anti-bot honeypot field
  const [errorMessage, setErrorMessage] = useState("");
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Jika sudah pernah login (sesi aktif), langsung arahkan ke portal masing-masing
  useEffect(() => {
    if (!loadingAuth && user) {
      const targetPortal =
        user.role === "siswa"
          ? "/portal-siswa"
          : user.role === "piket"
            ? "/portal-piket"
            : "/portal-admin";
      navigate(targetPortal, { replace: true });
    }
  }, [user, loadingAuth, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (step === "credentials") {
      if (!username.trim() || !password.trim()) {
        setErrorMessage("Username/NIS dan Password wajib diisi.");
        return;
      }

      const roleRequested = activeTab === "siswa" ? "siswa" : "staf";
      const result = await login(
        username.trim(),
        password.trim(),
        roleRequested,
        "",
        hpField,
      );

      if (result.success) {
        handleRedirect(result.user);
      } else if (result.requires_2fa) {
        setStep("2fa");
        setTotpCode("");
      } else {
        setErrorMessage(result.message);
      }
    } else {
      // Step 2FA
      if (!totpCode.trim() || totpCode.trim().length !== 6) {
        setErrorMessage(
          "Masukkan 6 digit kode dari aplikasi Authenticator Anda.",
        );
        return;
      }

      const roleRequested = activeTab === "siswa" ? "siswa" : "staf";
      const result = await login(
        username.trim(),
        password.trim(),
        roleRequested,
        totpCode.trim(),
        hpField,
      );

      if (result.success) {
        handleRedirect(result.user);
      } else {
        setErrorMessage(result.message);
      }
    }
  };

  const handleRedirect = (user) => {
    const defaultPortal =
      user.role === "siswa"
        ? "/portal-siswa"
        : user.role === "piket"
          ? "/portal-piket"
          : "/portal-admin";

    navigate(defaultPortal, { replace: true });
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Presensi SMKN 21
          </h1>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">
            Sistem Presensi Biometrik Wajah & Manajemen Siswa SMKN 21 Jakarta
          </p>
        </div>

        {/* Role Selector Tabs (Hanya saat step credentials) */}
        {step === "credentials" && (
          <div className="bg-slate-200/70 p-1.5 rounded-2xl grid grid-cols-2 gap-1 text-xs sm:text-sm text-slate-600">
            <button
              type="button"
              onClick={() => {
                setActiveTab("siswa");
                setErrorMessage("");
              }}
              className={`py-2.5 rounded-xl font-bold transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer border ${
                activeTab === "siswa"
                  ? "bg-white text-blue-600 shadow-xs border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/50"
              }`}
            >
              <span>Siswa</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("staf");
                setErrorMessage("");
              }}
              className={`py-2.5 rounded-xl font-bold transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer border ${
                activeTab === "staf"
                  ? "bg-white text-blue-600 shadow-xs border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/50"
              }`}
            >
              <span>Guru Piket & Admin</span>
            </button>
          </div>
        )}

        {/* Card Form */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/70">
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          {step === "2fa" ? (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 animate-in fade-in"
            >
              {/* Anti-bot Honeypot Input */}
              <input
                type="text"
                name="website_hp"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={hpField}
                onChange={(e) => setHpField(e.target.value)}
                className="opacity-0 absolute -left-[9999px] w-1 h-1 pointer-events-none"
              />

              <div className="text-center space-y-2 py-1">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-inner ring-4 ring-blue-500/10">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-black text-slate-900">
                  Verifikasi 2FA
                </h2>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Akun <strong className="text-slate-800">{username}</strong>{" "}
                  dilindungi Autentikasi Dua Faktor. Masukkan kode 6 digit dari
                  aplikasi Authenticator Anda.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
                  Kode 6-Digit OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoFocus
                  value={totpCode}
                  onChange={(e) =>
                    setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="• • • • • •"
                  required
                  className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-2xl tracking-[0.4em] font-mono font-bold text-slate-900 placeholder-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loadingAuth || totpCode.length !== 6}
                className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loadingAuth ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Kode...</span>
                  </>
                ) : (
                  <span>Verifikasi & Masuk</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("credentials");
                  setTotpCode("");
                  setErrorMessage("");
                }}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors text-center cursor-pointer"
              >
                ← Kembali ke Form Login
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Anti-bot Honeypot Input */}
                <input
                  type="text"
                  name="website_hp"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={hpField}
                  onChange={(e) => setHpField(e.target.value)}
                  className="opacity-0 absolute -left-[9999px] w-1 h-1 pointer-events-none"
                />

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {activeTab === "siswa"
                      ? "Nomor Induk Siswa (NIS)"
                      : "Username Staf"}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      inputMode={activeTab === "siswa" ? "numeric" : "text"}
                      pattern={activeTab === "siswa" ? "[0-9]*" : undefined}
                      value={username}
                      onChange={(e) => {
                        if (activeTab === "siswa") {
                          setUsername(e.target.value.replace(/\D/g, ""));
                        } else {
                          setUsername(e.target.value);
                        }
                      }}
                      placeholder={
                        activeTab === "siswa"
                          ? "Masukkan NIS Anda (contoh: 21312)"
                          : "NIP / Username Guru Piket atau Admin"
                      }
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Kata Sandi (Password)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      Lupa Kata Sandi?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        activeTab === "siswa"
                          ? "Default password sama dengan NIS"
                          : "Masukkan password akun"
                      }
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>
                  {activeTab === "siswa" ? (
                    <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <span>
                        Untuk pertama kali, password siswa sama dengan NIS
                      </span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <span>Guru Piket masuk menggunakan akun resmi</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loadingAuth}
                  className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loadingAuth ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memverifikasi...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Modal Bantuan Lupa Kata Sandi */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    Bantuan Lupa Kata Sandi
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    SMKN 21 Jakarta • Layanan Presensi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 text-blue-900 space-y-1">
                <p className="font-bold text-xs">Untuk Siswa SMKN 21:</p>
                <p className="text-xs text-blue-800">
                  Untuk menjaga integritas dan keamanan akun presensi sekolah,
                  silakan melapor langsung ke <strong>Guru Piket</strong> atau{" "}
                  <strong>Petugas Administrator Sekolah</strong> di Ruang Piket
                  / Tata Usaha.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-emerald-900 space-y-1">
                <p className="font-bold text-xs">Prosedur Reset:</p>
                <p className="text-xs text-emerald-800">
                  Petugas admin dapat mereset kata sandi Anda dalam 1 detik.
                  Setelah direset, kata sandi Anda akan kembali ke default yaitu{" "}
                  <strong>Nomor Induk Siswa (NIS)</strong> Anda.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                <strong>Catatan Staf:</strong> Guru Piket & Admin dapat
                menghubungi tim IT / Administrator Utama SMKN 21 untuk
                permohonan reset sandi akun staf.
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer shadow-xs"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
