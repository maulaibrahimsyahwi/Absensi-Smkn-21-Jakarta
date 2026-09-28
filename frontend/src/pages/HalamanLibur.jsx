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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
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

  // PDF Preview & Custom Page Controls
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(true);
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(1);

  // Custom Logout Confirmation Modal
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);

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
    setShowLogoutConfirmModal(true);
  };

  const holidayEvent = statusData?.holiday_event;
  const suratUrl = holidayEvent?.lampiran_surat || "";
  const namaFileSurat =
    holidayEvent?.nama_file_surat || "Surat_Edaran_Resmi.pdf";
  const isPdf = suratUrl.toLowerCase().includes(".pdf");

  // Inisialisasi dan sinkronisasi jumlah halaman berkas PDF
  useEffect(() => {
    if (holidayEvent?.total_pages && Number(holidayEvent.total_pages) > 0) {
      setPdfTotalPages(Number(holidayEvent.total_pages));
    } else if (isPdf && suratUrl) {
      const filename = suratUrl.split("/").pop();
      if (filename) {
        liburService
          .getDokumenInfo(filename)
          .then((res) => {
            if (res?.total_pages && Number(res.total_pages) > 0) {
              setPdfTotalPages(Number(res.total_pages));
            }
          })
          .catch(() => {});
      }
    }
  }, [holidayEvent, isPdf, suratUrl]);

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
                  <span>Kegiatan Diliburkan</span>
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
          </div>
        </div>

        {/* Embedded Document Preview / Announcement Card */}
        {suratUrl ? (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
            {/* Document Header Bar with Collapsible Trigger & ChevronDown */}
            <div
              onClick={() => setIsPdfPreviewOpen((prev) => !prev)}
              className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-800 cursor-pointer select-none transition-colors hover:bg-slate-850"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-white truncate">
                      Surat Edaran Resmi Sekolah
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Resmi
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {namaFileSurat}
                  </p>
                </div>
              </div>

              {/* Toggle Chevron & Label */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-300 font-medium hidden sm:inline">
                  {isPdfPreviewOpen
                    ? "Sembunyikan Berkas"
                    : "Lihat Berkas Surat"}
                </span>
                <div
                  className={`p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-transform duration-300 ${
                    isPdfPreviewOpen ? "rotate-180" : ""
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Document Viewer Area (Collapsible) */}
            {isPdfPreviewOpen && (
              <div className="animate-in fade-in duration-200">
                {isPdf ? (
                  <>
                    {/* Custom PDF Navigation Toolbar */}
                    <div className="px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-3 text-white text-xs select-none">
                      {/* Left: Indicator */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold text-[10px] uppercase tracking-wider border border-purple-500/30">
                          PDF
                        </span>
                        <span className="font-semibold text-slate-300 truncate hidden md:inline text-xs">
                          {namaFileSurat}
                        </span>
                      </div>

                      {/* Center: Custom Page Navigation [ < ] [ 1 ] / 3 [ > ] */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPdfCurrentPage((p) => Math.max(1, p - 1));
                          }}
                          disabled={pdfCurrentPage <= 1}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors cursor-pointer border border-slate-700/80"
                          title="Halaman Sebelumnya"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/90 rounded-lg border border-slate-700 text-xs font-bold">
                          <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
                            Halaman
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={pdfTotalPages}
                            value={pdfCurrentPage}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (
                                !isNaN(val) &&
                                val >= 1 &&
                                val <= pdfTotalPages
                              ) {
                                setPdfCurrentPage(val);
                              }
                            }}
                            className="w-9 text-center bg-slate-950 border border-slate-700 rounded text-purple-300 font-bold py-0.5 focus:outline-hidden focus:ring-1 focus:ring-purple-400"
                          />
                          <span className="text-slate-400">/</span>
                          <span className="text-slate-200 min-w-[14px] text-center">
                            {pdfTotalPages}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPdfCurrentPage((p) =>
                              Math.min(pdfTotalPages, p + 1),
                            );
                          }}
                          disabled={pdfCurrentPage >= pdfTotalPages}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors cursor-pointer border border-slate-700/80"
                          title="Halaman Selanjutnya"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={suratUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold border border-slate-700"
                          title="Buka dokumen di tab baru"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Tab Baru</span>
                        </a>
                        <a
                          href={suratUrl}
                          download
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold shadow-xs"
                          title="Unduh berkas surat edaran"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Unduh</span>
                        </a>
                      </div>
                    </div>

                    {/* Frame PDF tanpa toolbar bawaan browser */}
                    <div className="p-2 sm:p-4 bg-slate-100/70">
                      <div className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-inner">
                        <iframe
                          key={`pdf-page-${pdfCurrentPage}`}
                          src={`${suratUrl}#page=${pdfCurrentPage}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                          title="Pratinjau Surat Edaran Resmi"
                          className="w-full h-[650px] sm:h-[750px] border-none block"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-slate-100/70 flex items-center justify-center">
                    <img
                      src={suratUrl}
                      alt="Pratinjau Surat Edaran"
                      className="max-w-full max-h-[750px] rounded-xl object-contain shadow-md"
                    />
                  </div>
                )}
              </div>
            )}
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
      </main>

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          initialTab={profileModalTab}
        />
      )}

      {/* Modal Konfirmasi Logout Kustom */}
      {showLogoutConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs select-none animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-inner">
              <LogOut className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900">
                Konfirmasi Keluar Akun
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Apakah Anda yakin ingin keluar dari sistem presensi SMKN 21
                Jakarta? Anda perlu masuk kembali untuk mengakses portal akun.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirmModal(false);
                  logout();
                  navigate("/login", { replace: true });
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
