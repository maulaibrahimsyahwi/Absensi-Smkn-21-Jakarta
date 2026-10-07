import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  UserPlus,
  BarChart3,
  ClipboardCheck,
  ShieldAlert,
  Camera,
  BookOpen,
  Clock,
  Calendar,
  User,
  ChevronRight,
  UserRound,
  CalendarDays,
  Flag,
  Database,
  GraduationCap,
  Laptop,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import ProfileModal from "../components/ProfileModal";
import ToastNotification, {
  ToastNotificationProps,
} from "../components/common/ToastNotification";
import NotificationDropdown from "../components/NotificationDropdown";
import ModalPengaturanPJJ from "../components/pjj/ModalPengaturanPJJ";
import ModalKalenderLibur from "../components/libur/ModalKalenderLibur";
import ModalTahunAjaran from "../components/admin/ModalTahunAjaran";
import ModalDisasterRecovery from "../components/admin/ModalDisasterRecovery";
import { liburService } from "../services/liburService";
import { useRealtimeSubscription } from "../services/realtimeService";
import { HolidayStatusResponse } from "../types/libur";

interface SummaryData {
  total_siswa: number;
  siswa_aktif: number;
  siswa_alumni: number;
  siswa_biometrik: number;
  persentase_biometrik: number;
  total_hadir_today: number;
  tepat_waktu: number;
  terlambat: number;
  sakit: number;
  izin: number;
  persentase_kehadiran: number;
  izin_menunggu: number;
  pelanggaran_bulan_ini: number;
  recent_presensi: Array<{
    id: number | string;
    nama: string;
    kelas: string;
    waktu?: string;
    status: string;
    [key: string]: any;
  }>;
}

export default function PortalAdmin() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [summaryData, setSummaryData] = useState<SummaryData>({
    total_siswa: 0,
    siswa_aktif: 0,
    siswa_alumni: 0,
    siswa_biometrik: 0,
    persentase_biometrik: 0,
    total_hadir_today: 0,
    tepat_waktu: 0,
    terlambat: 0,
    sakit: 0,
    izin: 0,
    persentase_kehadiran: 0,
    izin_menunggu: 0,
    pelanggaran_bulan_ini: 0,
    recent_presensi: [],
  });

  const [pengajuanList, setPengajuanList] = useState<any[]>([]);

  // Modal Profile & PJJ States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [profileModalTab, setProfileModalTab] = useState<string>("profil");
  const [isPjjModalOpen, setIsPjjModalOpen] = useState<boolean>(false);
  const [pjjActiveInfo, setPjjActiveInfo] = useState<any>(null);
  const [isLiburModalOpen, setIsLiburModalOpen] = useState<boolean>(false);
  const [liburModalTab, setLiburModalTab] = useState<string>("daftar");
  const [liburStatusToday, setLiburStatusToday] =
    useState<HolidayStatusResponse | null>(null);
  const [isTahunAjaranModalOpen, setIsTahunAjaranModalOpen] =
    useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [notification, setNotification] =
    useState<ToastNotificationProps["notification"]>(null);

  // Live Clock (WIB)
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");

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
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Tanggal Hari Ini (Format Indonesia)
  const todayIndoStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Fetch Ringkasan Statistik Sekolah, Notifikasi Pengajuan Izin, Status PJJ & Hari Libur
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const [resSummary, resNotif, resPjj, resLibur] = await Promise.allSettled(
        [
          api.get("/rekap/admin_summary"),
          api.get("/piket/notifikasi"),
          api.get("/pjj/status"),
          liburService.getStatusToday(),
        ],
      );

      if (
        resSummary.status === "fulfilled" &&
        resSummary.value.data?.success &&
        resSummary.value.data.data
      ) {
        setSummaryData(resSummary.value.data.data);
      }
      if (
        resNotif.status === "fulfilled" &&
        resNotif.value.data?.success &&
        Array.isArray(resNotif.value.data.notifikasi)
      ) {
        setPengajuanList(resNotif.value.data.notifikasi);
      }
      if (
        resPjj.status === "fulfilled" &&
        resPjj.value.data?.success &&
        resPjj.value.data.data
      ) {
        setPjjActiveInfo(resPjj.value.data.data);
      }
      if (resLibur.status === "fulfilled" && resLibur.value?.success) {
        setLiburStatusToday(resLibur.value as HolidayStatusResponse);
      }
    } catch (err) {
      console.error("Gagal memuat ringkasan admin:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Sinkronisasi data otomatis secara realtime lintas tab & perangkat admin
  useRealtimeSubscription(
    ["presensi", "izin", "pelanggaran", "piket", "siswa", "libur", "pjj"],
    () => {
      fetchSummary();
    },
  );

  const openProfile = (tab = "profil") => {
    setProfileModalTab(tab);
    setIsProfileModalOpen(true);
  };

  return (
    <div className="min-h-screen py-5 sm:py-8 px-3.5 sm:px-6 max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {/* Toast Notification Seragam */}
      <ToastNotification
        notification={notification}
        onClose={() => setNotification(null)}
      />

      {/* Header Profil Administrator (Hero Card) */}
      <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950 rounded-3xl p-5 sm:p-8 text-white shadow-xl shadow-purple-950/20 relative">
        {/* Dekorasi blur diisolasi dalam wrapper */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -ml-20 -mb-20" />
        </div>

        {/* Konten Header: Responsif Mobile & Tablet */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Sisi Kiri: Foto Profil & Info Admin */}
          <div className="flex items-center gap-3.5 sm:gap-5 min-w-0 flex-1">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-md shadow-inner shrink-0 overflow-hidden">
              {user?.foto_profil ? (
                <img
                  src={user.foto_profil}
                  alt={user?.nama || "Admin"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserRound className="w-8 h-8 sm:w-11 sm:h-11 text-purple-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight truncate sm:whitespace-normal">
                {user?.nama || "Administrator SMKN 21"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
                <span>{todayIndoStr}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-white">
                  <Clock className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                  {currentTimeStr}
                </span>
                {liburStatusToday && (
                  <button
                    type="button"
                    onClick={() => setIsLiburModalOpen(true)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                      liburStatusToday.is_holiday
                        ? "bg-rose-500/30 text-rose-200 border-rose-400/40 hover:bg-rose-500/40"
                        : liburStatusToday.is_special_school_day
                          ? "bg-amber-500/30 text-amber-200 border-amber-400/40 hover:bg-amber-500/40"
                          : liburStatusToday.is_weekend
                            ? "bg-slate-500/30 text-slate-200 border-slate-400/40 hover:bg-slate-500/40"
                            : "bg-emerald-500/30 text-emerald-200 border-emerald-400/40 hover:bg-emerald-500/40"
                    }`}
                    title="Klik untuk membuka Pengaturan Kalender & Hari Libur Sekolah"
                  >
                    {liburStatusToday.is_holiday ? (
                      <>
                        <span>
                          Libur{" "}
                          {liburStatusToday.holiday_event?.nama ||
                            "Sekolah Libur"}
                        </span>
                      </>
                    ) : liburStatusToday.is_special_school_day ? (
                      <>
                        <Flag className="w-3 h-3 text-amber-300" />
                        <span>
                          Masuk Khusus{" "}
                          {liburStatusToday.holiday_event?.nama || "Kegiatan"}
                        </span>
                      </>
                    ) : liburStatusToday.is_weekend ? (
                      <>
                        <Calendar className="w-3 h-3 text-slate-300" />
                        <span>Akhir Pekan</span>
                      </>
                    ) : (
                      <>
                        <span>Aktif Pembelajaran</span>
                      </>
                    )}
                  </button>
                )}
              </p>
            </div>
          </div>

          {/* Tombol Profil (Desktop) & Notifikasi Admin */}
          <div className="flex items-center self-end sm:self-center shrink-0">
            <NotificationDropdown
              notifications={pengajuanList}
              variant="header"
              align="right"
              role="admin"
              userId={user?.id}
              onNavigate={() => navigate("/dashboard")}
            />
          </div>
        </div>
      </div>

      {/* Kartu Metrik & Statistik Operasional Sekolah */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Statistik Operasional Sekolah
            </h2>
            <p className="text-xs text-slate-500">
              Ringkasan data siswa, biometrik wajah, kehadiran, dan perizinan
              sekolah
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Siswa Aktif */}
          <Link
            to="/registrasi"
            className="p-4 sm:p-5 rounded-2xl bg-purple-50/70 hover:bg-purple-100/70 border border-purple-200/60 transition-colors group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-purple-800 uppercase tracking-wider">
                Siswa Aktif
              </p>
              <ChevronRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-black text-purple-700">
                {loading ? "-" : summaryData.siswa_aktif}
              </p>
              <span className="text-xs font-semibold text-purple-600">
                Siswa
              </span>
            </div>
          </Link>

          {/* Absensi Wajah */}
          <Link
            to="/registrasi"
            className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/60 transition-colors group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Biometrik Wajah
              </p>
              <ChevronRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-black text-emerald-700">
                {loading ? "-" : `${summaryData.persentase_biometrik}%`}
              </p>
              <span className="text-xs font-semibold text-emerald-600">
                {summaryData.siswa_biometrik} siswa
              </span>
            </div>
          </Link>

          {/* Kehadiran Hari Ini */}
          <Link
            to="/dashboard?tab=rekap_siswa"
            className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200/60 transition-colors group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                Kehadiran Hari Ini
              </p>
              <ChevronRight className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-black text-blue-700">
                {loading ? "-" : `${summaryData.persentase_kehadiran}%`}
              </p>
            </div>
          </Link>

          {/* Pengajuan Izin Menunggu */}
          <Link
            to="/dashboard?tab=verifikasi_izin"
            className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200/60 transition-colors group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                Izin Menunggu
              </p>
              <ChevronRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-black text-amber-700">
                {loading ? "-" : summaryData.izin_menunggu}
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Menu Layanan & Manajemen Administrasi */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Pusat Manajemen & Layanan Administrasi</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {/* Card 1: Data & Biometrik Siswa */}
          <Link
            to="/registrasi"
            className="group bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white p-3.5 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div className="p-2 sm:p-3 bg-white/15 rounded-xl backdrop-blur-xs shrink-0">
                <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-xs sm:text-base truncate">
                  Data Siswa
                </h3>
                <p className="text-[10px] sm:text-[11px] text-purple-100 truncate">
                  Registrasi & wajah
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform shrink-0 hidden sm:block" />
          </Link>

          {/* Card 2: Dashboard Rekap */}
          <Link
            to="/dashboard"
            className="group bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white p-3.5 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div className="p-2 sm:p-3 bg-white/15 rounded-xl backdrop-blur-xs shrink-0">
                <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-xs sm:text-base truncate">
                  Rekap Presensi
                </h3>
                <p className="text-[10px] sm:text-[11px] text-blue-100 truncate">
                  Laporan & verifikasi
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform shrink-0 hidden sm:block" />
          </Link>

          {/* Card 3: Meja Guru Piket */}
          <Link
            to="/piket"
            className="group bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white p-3.5 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div className="p-2 sm:p-3 bg-white/15 rounded-xl backdrop-blur-xs shrink-0">
                <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-xs sm:text-base truncate">
                  Meja Guru Piket
                </h3>
                <p className="text-[10px] sm:text-[11px] text-emerald-100 truncate">
                  Izin masuk & keluar
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform shrink-0 hidden sm:block" />
          </Link>

          {/* Card 4: Catat Pelanggaran Siswa */}
          <Link
            to="/pelanggaran"
            className="group bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white p-3.5 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div className="p-2 sm:p-3 bg-white/15 rounded-xl backdrop-blur-xs shrink-0">
                <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-xs sm:text-base truncate">
                  Buku Pelanggaran
                </h3>
                <p className="text-[10px] sm:text-[11px] text-rose-100 truncate">
                  Tata tertib & sanksi
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform shrink-0 hidden sm:block" />
          </Link>

          {/* Card 5: Kiosk Scan Wajah Mandiri */}
          <Link
            to="/harian"
            className="group bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white p-3.5 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div className="p-2 sm:p-3 bg-white/15 rounded-xl backdrop-blur-xs shrink-0">
                <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-xs sm:text-base truncate">
                  Presensi Harian
                </h3>
                <p className="text-[10px] sm:text-[11px] text-indigo-100 truncate">
                  Kiosk scan wajah
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform shrink-0 hidden sm:block" />
          </Link>

          {/* Card 6: Absensi Perpustakaan */}
          <Link
            to="/perpus"
            className="group bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white p-3.5 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div className="p-2 sm:p-3 bg-white/15 rounded-xl backdrop-blur-xs shrink-0">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-xs sm:text-base truncate">
                  Perpustakaan
                </h3>
                <p className="text-[10px] sm:text-[11px] text-amber-100 truncate">
                  Kunjungan & peminjaman
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform shrink-0 hidden sm:block" />
          </Link>
        </div>

        {/* Panel Kontrol Khusus Sekolah: Kalender Libur, PJJ, Akademik, Backup */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Card: Pengaturan Kalender & Hari Libur Sekolah */}
          <button
            type="button"
            onClick={() => {
              setLiburModalTab("daftar");
              setIsLiburModalOpen(true);
            }}
            className="group bg-gradient-to-r from-rose-600 via-rose-700 to-pink-700 hover:from-rose-700 hover:to-pink-800 text-white p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 sm:p-3 bg-white/15 rounded-xl backdrop-blur-xs relative shrink-0">
                <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6" />
                {liburStatusToday?.is_holiday && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-300 rounded-full border border-rose-700 animate-ping"></span>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">
                  Kalender & Libur Sekolah
                </h3>
                <p className="text-[11px] text-rose-100 mt-0.5 truncate">
                  {liburStatusToday?.is_holiday
                    ? `${liburStatusToday.holiday_event?.nama || "Libur Sekolah"}`
                    : "Kalender SKB & hari libur sekolah"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-200 group-hover:text-white transition-colors shrink-0 ml-2">
              <span className="hidden sm:inline">Kelola</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Card: Pengaturan Mode Daring (PJJ) */}
          <button
            type="button"
            onClick={() => setIsPjjModalOpen(true)}
            className="group bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 sm:p-3 bg-white/15 rounded-xl backdrop-blur-xs relative shrink-0">
                <Laptop className="w-5 h-5 sm:w-6 sm:h-6" />
                {pjjActiveInfo?.is_active_today && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-violet-700 animate-ping"></span>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">
                  Mode Daring (PJJ)
                </h3>
                <p className="text-[11px] text-violet-100 mt-0.5 truncate">
                  {pjjActiveInfo?.is_active_today
                    ? "Mode Daring Sedang Aktif"
                    : "Atur jadwal & kelas pembelajaran jarak jauh"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-200 group-hover:text-white transition-colors shrink-0 ml-2">
              <span className="hidden sm:inline">Kelola</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Card: Pengaturan Tahun Ajaran & Semester */}
          <button
            type="button"
            onClick={() => setIsTahunAjaranModalOpen(true)}
            className="group bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 sm:p-3 bg-white/15 rounded-xl backdrop-blur-xs relative shrink-0">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">
                  Tahun Ajaran & Semester
                </h3>
                <p className="text-[11px] text-blue-100 mt-0.5 truncate">
                  Semester & toleransi jam masuk
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-200 group-hover:text-white transition-colors shrink-0 ml-2">
              <span className="hidden sm:inline">Kelola</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Card: Disaster Recovery & Backup Database */}
          <button
            type="button"
            onClick={() => setIsBackupModalOpen(true)}
            className="group bg-gradient-to-r from-purple-700 to-fuchsia-800 hover:from-purple-800 hover:to-fuchsia-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 sm:p-3 bg-white/15 rounded-xl backdrop-blur-xs relative shrink-0">
                <Database className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-purple-800 animate-ping"></span>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">
                  Cadangan Basis Data
                </h3>
                <p className="text-[11px] text-purple-100 mt-0.5 truncate">
                  Backup otomatis & unduh berkas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-200 group-hover:text-white transition-colors shrink-0 ml-2">
              <span className="hidden sm:inline">Kelola</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      </div>

      {/* Ringkasan Presensi Hari Ini */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Aktivitas Presensi Terkini Hari Ini
            </h3>
            <p className="text-xs text-slate-500">
              Pembaruan scan wajah dan kehadiran siswa
            </p>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
          >
            <span>Lihat Semua Rekap</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {summaryData.recent_presensi.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
            <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">
              Belum Ada Data Presensi Hari Ini
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Presensi siswa yang melakukan scan wajah mandiri akan otomatis
              tampil di sini
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {summaryData.recent_presensi.map((item) => (
              <div
                key={item.id}
                className="py-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {item.nama ? item.nama.charAt(0).toUpperCase() : "S"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">
                      {item.nama}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {item.kelas} •{" "}
                      {item.waktu ? item.waktu.split(" ")[1] : "-"} WIB
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    item.status === "Tepat Waktu"
                      ? "bg-emerald-100 text-emerald-800"
                      : item.status === "Terlambat"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profile & Settings Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        initialTab={profileModalTab}
      />

      {/* Modal Pengaturan PJJ */}
      <ModalPengaturanPJJ
        isOpen={isPjjModalOpen}
        onClose={() => setIsPjjModalOpen(false)}
        onUpdated={fetchSummary}
      />

      {/* Modal Kalender & Hari Libur Sekolah */}
      <ModalKalenderLibur
        isOpen={isLiburModalOpen}
        onClose={() => setIsLiburModalOpen(false)}
        onRefreshStatus={fetchSummary}
        initialTab={liburModalTab}
      />

      {/* Modal Pengaturan Tahun Ajaran & Semester */}
      <ModalTahunAjaran
        isOpen={isTahunAjaranModalOpen}
        onClose={() => setIsTahunAjaranModalOpen(false)}
        onUpdated={fetchSummary}
      />

      {/* Modal Disaster Recovery & Backup Database */}
      <ModalDisasterRecovery
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </div>
  );
}
