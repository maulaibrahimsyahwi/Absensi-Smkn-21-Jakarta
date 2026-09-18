import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  School,
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
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ArrowRight,
  FileText,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Award,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import ProfileModal from "../components/ProfileModal";
import NotificationDropdown from "../components/NotificationDropdown";

export default function PortalAdmin() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState({
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

  const [pengajuanList, setPengajuanList] = useState([]);
  const [dismissedNotifIds, setDismissedNotifIds] = useState([]);

  // Modal Profile State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState("profil");
  const [notification, setNotification] = useState(null);

  // Live Clock (WIB)
  const [currentTimeStr, setCurrentTimeStr] = useState("");

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

  // Fetch Ringkasan Statistik Sekolah & Notifikasi Pengajuan Izin
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const [resSummary, resPengajuan] = await Promise.allSettled([
        api.get("/rekap/admin_summary"),
        api.get("/pengajuan_izin"),
      ]);

      if (
        resSummary.status === "fulfilled" &&
        resSummary.value.data?.success &&
        resSummary.value.data.data
      ) {
        setSummaryData(resSummary.value.data.data);
      }
      if (
        resPengajuan.status === "fulfilled" &&
        Array.isArray(resPengajuan.value.data)
      ) {
        setPengajuanList(resPengajuan.value.data);
      }
    } catch (err) {
      console.error("Gagal memuat ringkasan admin:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();

    // Polling silent setiap 8 detik
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        api
          .get("/rekap/admin_summary")
          .then((res) => {
            if (res.data?.success && res.data.data)
              setSummaryData(res.data.data);
          })
          .catch(() => {});
        api
          .get("/pengajuan_izin")
          .then((res) => {
            if (Array.isArray(res.data)) setPengajuanList(res.data);
          })
          .catch(() => {});
      }
    }, 8000);

    // BroadcastChannel synchronization
    let bc = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("smkn21_absensi_channel");
        bc.onmessage = () => {
          fetchSummary();
        };
      }
    } catch (e) {}

    return () => {
      clearInterval(intervalId);
      if (bc) bc.close();
    };
  }, [fetchSummary]);

  const openProfile = (tab = "profil") => {
    setProfileModalTab(tab);
    setIsProfileModalOpen(true);
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 max-w-6xl mx-auto space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-2xl bg-slate-900 text-white shadow-xl flex items-center gap-3 animate-in fade-in">
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white text-xs ml-2"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Header Profil Administrator (Hero Card) */}
      <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-purple-950/20 relative">
        {/* Dekorasi blur diisolasi dalam wrapper */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -ml-20 -mb-20" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-md shadow-inner flex-shrink-0 overflow-hidden">
              {user?.foto_profil ? (
                <img
                  src={user.foto_profil}
                  alt={user?.nama || "Admin"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ShieldCheck className="w-9 h-9 sm:w-11 sm:h-11 text-purple-300" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1"></div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                {user?.nama || "Administrator Sekolah"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-purple-300" />
                <span>{todayIndoStr}</span>
                <span className="text-slate-500">•</span>
                <Clock className="w-3.5 h-3.5 text-purple-300" />
                <span className="font-semibold text-white">
                  {currentTimeStr}
                </span>
              </p>
            </div>
          </div>

          {/* Pojok Kanan Atas: Tombol Profil & Notifikasi Admin */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => openProfile("profil")}
              title="Profil Pengguna & Pengaturan Akun"
              className="inline-flex items-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold transition-all backdrop-blur-md shadow-xs active:scale-95 cursor-pointer"
            >
              {user?.foto_profil ? (
                <img
                  src={user.foto_profil}
                  alt={user?.nama || "Profil"}
                  className="w-5 h-5 rounded-lg object-cover border border-white/40 shadow-xs"
                />
              ) : (
                <User className="w-4 h-4 text-purple-200" />
              )}
              <span>Profil </span>
            </button>

            <NotificationDropdown
              notifications={pengajuanList}
              dismissedIds={dismissedNotifIds}
              onDismiss={(id) => setDismissedNotifIds((prev) => [...prev, id])}
              variant="header"
              align="right"
              role="admin"
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
          <button
            type="button"
            onClick={fetchSummary}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-600" : ""}`}
            />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Siswa Aktif */}
          <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/70 border border-purple-200/60">
            <p className="text-xs font-bold text-purple-800 uppercase tracking-wider mb-1">
              Siswa Aktif
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-black text-purple-700">
                {loading ? "-" : summaryData.siswa_aktif}
              </p>
            </div>
          </div>

          {/* Biometrik Wajah */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60">
            <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
              Biometrik Wajah
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-black text-emerald-700">
                {loading ? "-" : `${summaryData.persentase_biometrik}%`}
              </p>
            </div>
          </div>

          {/* Kehadiran Hari Ini */}
          <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 border border-blue-200/60">
            <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">
              Kehadiran Hari Ini
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-black text-blue-700">
                {loading ? "-" : `${summaryData.persentase_kehadiran}%`}
              </p>
            </div>
          </div>

          {/* Pengajuan Izin Menunggu */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/60">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
              Izin Menunggu
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-black text-amber-700">
                {loading ? "-" : summaryData.izin_menunggu}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Aksi Cepat Administrasi (Quick Actions) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Pusat Manajemen & Layanan Administrasi</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Data & Biometrik Siswa */}
          <Link
            to="/registrasi"
            className="group bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white p-5 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-xs">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">Data & Wajah Siswa</h3>
                <p className="text-[11px] text-purple-100">
                  Registrasi & biometrik siswa
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Card 2: Dashboard Rekap */}
          <Link
            to="/dashboard"
            className="group bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white p-5 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-xs">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">Dashboard Rekapitulasi</h3>
                <p className="text-[11px] text-blue-100">
                  Verifikasi izin & ekspor laporan
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Card 3: Meja Guru Piket */}
          <Link
            to="/piket"
            className="group bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white p-5 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-xs">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">Meja Guru Piket</h3>
                <p className="text-[11px] text-emerald-100">
                  Terbitkan izin masuk/keluar
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Card 4: Catat Pelanggaran Siswa */}
          <Link
            to="/pelanggaran"
            className="group bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white p-5 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-xs">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">
                  Buku Catatan Pelanggaran
                </h3>
                <p className="text-[11px] text-rose-100">
                  Buku saku kedisiplinan & poin
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Card 5: Kiosk Scan Wajah Mandiri */}
          <Link
            to="/harian"
            className="group bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white p-5 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-xs">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">Presensi Siswa Harian</h3>
                <p className="text-[11px] text-indigo-100">
                  Kiosk scan wajah mandiri & GPS
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Card 6: Absensi Perpustakaan */}
          <Link
            to="/perpus"
            className="group bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white p-5 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-xs">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">Presensi Perpustakaan</h3>
                <p className="text-[11px] text-amber-100">
                  Kunjungan & peminjaman buku
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
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
              Presensi siswa yang melakukan scan wajah mandiri atau melalui
              kiosk akan otomatis tampil di sini.
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
    </div>
  );
}
