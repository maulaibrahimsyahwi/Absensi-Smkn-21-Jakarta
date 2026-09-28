import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sun,
  Calendar,
  FileText,
  Download,
  ExternalLink,
  ShieldCheck,
  GraduationCap,
  Clock,
  User,
  LogOut,
  RefreshCw,
  AlertCircle,
  Info,
  CheckCircle2,
  ArrowRight,
  School,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { liburService } from "../services/liburService";
import ProfileModal from "../components/ProfileModal";
import logoSMKN21 from "../assets/Logo SMKN21.png";

export default function HalamanLibur() {
  const navigate = useNavigate();
  const { user, role, logout, todayStatus, refreshTodayStatus } = useAuth();

  const [statusData, setStatusData] = useState(todayStatus || null);
  const [loading, setLoading] = useState(!todayStatus);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState("profil");
  const [currentTimeStr, setCurrentTimeStr] = useState("");
  const [currentDateStr, setCurrentDateStr] = useState("");

  // Live Clock (WIB) & Tanggal Bahasa Indonesia
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " WIB",
      );
      setCurrentDateStr(
        now.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch status operasional hari ini
  const fetchStatus = useCallback(
    async (isManual = false) => {
      if (isManual) setIsRefreshing(true);
      try {
        const data = await liburService.getStatusToday();
        if (data && data.success) {
          setStatusData(data);
          if (refreshTodayStatus) {
            refreshTodayStatus();
          }

          // Jika ternyata hari ini sudah menjadi hari sekolah aktif (misal admin membatalkan libur)
          if (data.is_school_day) {
            if (role === "siswa") {
              navigate("/portal-siswa", { replace: true });
            } else if (role === "piket") {
              navigate("/portal-piket", { replace: true });
            } else if (role === "admin") {
              navigate("/portal-admin", { replace: true });
            }
          }
        }
      } catch (err) {
        console.warn("Gagal memperbarui status hari libur:", err);
      } finally {
        setLoading(false);
        if (isManual) setIsRefreshing(false);
      }
    },
    [navigate, role, refreshTodayStatus],
  );

  useEffect(() => {
    fetchStatus(false);
  }, [fetchStatus]);

  const handleLogout = () => {
    if (window.confirm("Apakah Anda yakin ingin keluar dari sistem?")) {
      logout();
      navigate("/login", { replace: true });
    }
  };

  const holidayEvent = statusData?.holiday_event;
  const suratUrl = holidayEvent?.lampiran_surat || "";
  const namaFileSurat =
    holidayEvent?.nama_file_surat || "Surat_Edaran_Resmi.pdf";
  const isPdf = suratUrl.toLowerCase().includes(".pdf");

  // Format kategori libur
  const formatKategori = (kat) => {
    switch (kat) {
      case "libur_nasional":
        return "Hari Libur Nasional";
      case "cuti_bersama":
        return "Cuti Bersama Resmi";
      case "libur_semester":
        return "Libur Akhir Semester";
      case "kegiatan_khusus":
        return "Hari Khusus Sekolah";
      default:
        return "Agenda Kalender Pendidikan";
    }
  };

  // Format tanggal rentang
  const formatRangeDate = () => {
    if (!holidayEvent) {
      if (statusData?.is_weekend) {
        return currentDateStr;
      }
      return currentDateStr;
    }

    const tglMulai = holidayEvent.tanggal_mulai;
    const tglSelesai = holidayEvent.tanggal_selesai || tglMulai;

    if (!tglMulai) return currentDateStr;

    try {
      const d1 = new Date(tglMulai).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      if (tglMulai === tglSelesai) {
        return d1;
      }
      const d2 = new Date(tglSelesai).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      return `${d1} s/d ${d2}`;
    } catch {
      return `${tglMulai} s/d ${tglSelesai}`;
    }
  };

  const judulLibur =
    holidayEvent?.nama ||
    (statusData?.is_weekend
      ? `Libur Akhir Pekan (${statusData?.nama_hari || "Sabtu/Minggu"})`
      : "Hari Libur Sekolah");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Top Identity Header Bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs backdrop-blur-md bg-white/95">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
          {/* Logo & School Name */}
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logoSMKN21}
              alt="Logo SMKN 21 Jakarta"
              className="w-9 h-9 sm:w-11 sm:h-11 object-contain shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight truncate leading-tight">
                SMKN 21 JAKARTA
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                Sistem Presensi & Manajemen Siswa
              </p>
            </div>
          </div>

          {/* Right Header: Clock & User Info */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Live Clock Pill */}
            <div className="hidden md:flex flex-col items-end text-right">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{currentTimeStr}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {currentDateStr}
              </span>
            </div>

            {/* Admin Back Link */}
            {role === "admin" && (
              <button
                type="button"
                onClick={() => navigate("/portal-admin")}
                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>Portal Admin</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* User Profile Pill & Logout */}
            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setProfileModalTab("profil");
                    setIsProfileModalOpen(true);
                  }}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors cursor-pointer text-left"
                  title="Lihat Profil"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-2xs">
                    {user.foto_profil ? (
                      <img
                        src={user.foto_profil}
                        alt={user.nama}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      user.nama?.charAt(0) || "U"
                    )}
                  </div>
                  <div className="hidden sm:block min-w-0 max-w-[120px]">
                    <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                      {user.nama}
                    </p>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                      {role === "siswa"
                        ? "Siswa"
                        : role === "piket"
                          ? "Guru Piket"
                          : "Admin"}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
                  title="Keluar dari Akun"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Masuk
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Hero Notice Card */}
        <div className="bg-gradient-to-br from-indigo-900 via-purple-950 to-slate-950 text-white rounded-3xl p-6 sm:p-10 shadow-2xl shadow-indigo-950/20 relative overflow-hidden border border-indigo-800/40">
          {/* Subtle Ambient Background Orbs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              {/* Badge Status */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200 text-xs font-extrabold tracking-wide uppercase shadow-xs">
                  <Sun className="w-3.5 h-3.5 text-amber-300" />
                  <span>Status: Kegiatan Diliburkan</span>
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-blue-300" />
                  <span>{formatRangeDate()}</span>
                </span>
                {holidayEvent?.kategori && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[11px] font-bold">
                    {formatKategori(holidayEvent.kategori)}
                  </span>
                )}
              </div>

              {/* Main Headline */}
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                {judulLibur}
              </h2>

              {/* Notice Description */}
              <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
                {holidayEvent?.keterangan ||
                  statusData?.message ||
                  "Seluruh kegiatan presensi kehadiran tatap muka, pembinaan piket, dan kegiatan belajar mengajar di lingkungan SMKN 21 Jakarta diliburkan."}
              </p>
            </div>

            {/* Quick Action Button: Refresh */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0 self-start md:self-center">
              <button
                type="button"
                disabled={isRefreshing}
                onClick={() => fetchStatus(true)}
                className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 backdrop-blur-md cursor-pointer disabled:opacity-60 shadow-xs active:scale-95"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? "animate-spin text-amber-300" : ""}`}
                />
                <span>
                  {isRefreshing ? "Memeriksa Status..." : "Cek Ulang Status"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Embedded Document Preview / Announcement Card */}
        {suratUrl ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
            {/* Document Header Bar */}
            <div className="px-5 py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-white truncate">
                      Surat Edaran Resmi Sekolah
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold uppercase tracking-wider">
                      Resmi
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {namaFileSurat}
                  </p>
                </div>
              </div>

              {/* Actions: Buka Tab Baru & Unduh */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <a
                  href={suratUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Buka dokumen di tab baru"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Tab Baru</span>
                </a>
                <a
                  href={suratUrl}
                  download
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Unduh berkas surat edaran"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Dokumen</span>
                </a>
              </div>
            </div>

            {/* Document Viewer Frame */}
            <div className="p-3 sm:p-5 bg-slate-100/70">
              {isPdf ? (
                <div className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-inner">
                  <iframe
                    src={suratUrl}
                    title="Pratinjau Surat Edaran Resmi"
                    className="w-full h-[650px] sm:h-[750px] border-none"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-inner">
                  <img
                    src={suratUrl}
                    alt="Pratinjau Surat Edaran"
                    className="max-w-full max-h-[750px] rounded-xl object-contain shadow-md"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Card jika tidak ada surat edaran yang dilampirkan */
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 shadow-inner">
              <Calendar className="w-7 h-7" />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="text-base font-bold text-slate-900">
                Informasi Kalender Pendidikan Sekolah
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Hari libur ini berlaku otomatis sesuai dengan Keputusan Bersama
                (SKB 3 Menteri) / Kalender Pendidikan Resmi Dinas Pendidikan DKI
                Jakarta. Tidak ada berkas surat edaran khusus yang dilampirkan
                untuk agenda ini.
              </p>
            </div>
          </div>
        )}

        {/* Informational Guidance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              Jadwal Presensi Dibuka
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Layanan presensi tatap muka akan dibuka kembali pada hari aktif
              sekolah berikutnya mulai pukul{" "}
              <strong className="text-slate-700">05:00 WIB</strong> s/d{" "}
              <strong className="text-slate-700">06:30 WIB</strong>.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              Status Kehadiran Siswa
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Siswa tidak perlu melakukan presensi atau pengajuan surat
              izin/sakit selama periode libur sekolah berlangsung.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <School className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              Pusat Informasi Sekolah
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Informasi resmi terkait kegiatan sekolah dan pengumuman mendadak
              dapat dipantau melalui wali kelas dan tata usaha SMKN 21.
            </p>
          </div>
        </div>
      </main>

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          initialTab={profileModalTab}
        />
      )}
    </div>
  );
}
