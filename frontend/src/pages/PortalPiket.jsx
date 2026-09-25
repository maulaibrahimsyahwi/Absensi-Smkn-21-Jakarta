import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  School,
  ClipboardCheck,
  ShieldAlert,
  Camera,
  BarChart3,
  Clock,
  Calendar,
  User,
  PenLine,
  PlusCircle,
  Printer,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ArrowRight,
  FileText,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import ProfileModal from "../components/ProfileModal";
import SlipIzinPiketModal from "../components/piket/SlipIzinPiketModal";
import SignaturePadModal from "../components/SignaturePadModal";
import ToastNotification from "../components/common/ToastNotification";
import NotificationDropdown from "../components/NotificationDropdown";

export default function PortalPiket() {
  const navigate = useNavigate();
  const { user, isPiket, isAdmin, saveSignature } = useAuth();

  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState({
    total_izin_hari_ini: 0,
    izin_masuk_hari_ini: 0,
    izin_keluar_hari_ini: 0,
    total_terlambat_hari_ini: 0,
    pengajuan_izin_menunggu: 0,
    pelanggaran_hari_ini: 0,
    recent_izin: [],
  });

  // Modal States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState("profil");
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [notification, setNotification] = useState(null);

  // State Notifikasi Izin Siswa untuk Guru Piket
  const [pengajuanList, setPengajuanList] = useState([]);
  const [dismissedNotifIds, setDismissedNotifIds] = useState(() => {
    try {
      const raw = localStorage.getItem(`read_piket_notif_${user?.id}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const handleDismissNotif = (notifId) => {
    setDismissedNotifIds((prev) => {
      const next = [...prev, notifId];
      if (user?.id) {
        localStorage.setItem(
          `read_piket_notif_${user.id}`,
          JSON.stringify(next),
        );
      }
      return next;
    });
  };

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

  // Ambil Data Ringkasan Operasional Hari Ini & Pengajuan Izin
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const [resSummary, resNotif] = await Promise.allSettled([
        api.get("/piket/summary_today"),
        api.get("/piket/notifikasi"),
      ]);

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
    } catch (err) {
      // Fallback silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();

    // Polling silent setiap 6 detik saat tab aktif
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        api
          .get("/piket/summary_today")
          .then((res) => {
            if (res.data?.success && res.data.data)
              setSummaryData(res.data.data);
          })
          .catch(() => {});
        api
          .get("/piket/notifikasi")
          .then((res) => {
            if (res.data?.success && Array.isArray(res.data.notifikasi)) {
              setPengajuanList(res.data.notifikasi);
            }
          })
          .catch(() => {});
      }
    }, 6000);

    // Instant sync antar tab melalui BroadcastChannel
    let bc = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("smkn21_absensi_channel");
        bc.onmessage = (event) => {
          if (
            event.data?.type === "IZIN_SUBMITTED" ||
            event.data?.type === "IZIN_VERIFIED"
          ) {
            api
              .get("/piket/summary_today")
              .then((res) => {
                if (res.data?.success && res.data.data)
                  setSummaryData(res.data.data);
              })
              .catch(() => {});
            api
              .get("/piket/notifikasi")
              .then((res) => {
                if (res.data?.success && Array.isArray(res.data.notifikasi)) {
                  setPengajuanList(res.data.notifikasi);
                }
              })
              .catch(() => {});
          }
        };
      }
    } catch (e) {}

    return () => {
      clearInterval(intervalId);
      if (bc) bc.close();
    };
  }, [fetchSummary]);

  // Handler Simpan Tanda Tangan
  const handleSaveSignature = async (dataUrl) => {
    try {
      const res = await saveSignature(dataUrl);
      if (res.success) {
        setNotification({
          type: "success",
          message: "Tanda tangan digital Guru Piket berhasil disimpan!",
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: "Gagal menyimpan tanda tangan digital.",
      });
    }
  };

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

      {/* Header Profil Guru Piket (Hero Card) */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 rounded-3xl p-5 sm:p-8 text-white shadow-xl shadow-blue-950/20 relative">
        {/* Dekorasi blur diisolasi dalam wrapper */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -ml-20 -mb-20" />
        </div>

        {/* Konten Header: Responsif Mobile & Tablet */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Sisi Kiri: Foto Profil & Info Guru Piket */}
          <div className="flex items-center gap-3.5 sm:gap-5 min-w-0 flex-1">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur-md shadow-inner flex-shrink-0 overflow-hidden">
              {user?.foto_profil ? (
                <img
                  src={user.foto_profil}
                  alt={user?.nama || "Guru Piket"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-8 h-8 sm:w-11 sm:h-11 text-blue-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/25 border border-blue-400/30 text-[10px] sm:text-[11px] font-bold tracking-wide uppercase text-blue-200 mb-1">
                Petugas Piket SMKN 21
              </span>
              <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight truncate sm:whitespace-normal">
                {user?.nama || "Bapak / Ibu Guru Piket"}
              </h1>
              <p className="text-xs sm:text-sm text-blue-200 font-medium truncate mt-0.5">
                NIP {user?.username} &bull; Petugas Piket SMKN 21
              </p>
            </div>
          </div>

          {/* Sisi Kanan / Bawah pada mobile: Tombol Profil Pengguna & Dropdown Notifikasi */}
          <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
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
                <User className="w-4 h-4 text-blue-200" />
              )}
              <span>Profil</span>
            </button>

            <NotificationDropdown
              notifications={pengajuanList}
              dismissedIds={dismissedNotifIds}
              onDismiss={handleDismissNotif}
              variant="header"
              align="right"
              role="piket"
              userId={user?.id}
              onNavigate={() => navigate("/dashboard?tab=verifikasi_izin")}
            />
          </div>
        </div>
      </div>

      {/* Banner Peringatan Tanda Tangan Digital Guru Piket */}
      {!user?.tanda_tangan && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in shadow-xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-white flex-shrink-0 shadow-md shadow-amber-500/20">
              <PenLine className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-sm font-bold text-slate-900">
                  Tanda Tangan Digital Petugas Belum Tersedia
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200 uppercase">
                  Wajib
                </span>
              </div>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                Setiap lembar Surat Izin Masuk dan Izin Meninggalkan Kelas wajib
                dibubuhi tanda tangan digital Guru Piket. Harap buat tanda
                tangan sekarang agar penerbitan surat izin berjalan lancar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSignatureModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95"
          >
            <PenLine className="w-3.5 h-3.5" />
            <span> TTD Sekarang</span>
          </button>
        </div>
      )}

      {/* Ringkasan Statistik Tugas Guru Piket Hari Ini */}
      <div className="bg-white rounded-3xl p-5 sm:p-8 border border-slate-200/80 shadow-xs space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Statistik Meja Piket Hari Ini
            </h2>
            <p className="text-xs text-slate-500 leading-snug">
              Pantauan operasional kehadiran, perizinan, dan keterlambatan siswa
              hari ini
            </p>
          </div>
          <button
            type="button"
            onClick={fetchSummary}
            className="self-end sm:self-center p-2 sm:px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
          {/* Total Izin Piket */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-blue-50/70 border border-blue-200/60">
            <p className="text-[10px] sm:text-xs font-bold text-blue-800 uppercase tracking-wider mb-1 truncate">
              Surat Izin
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-xl sm:text-2xl md:text-3xl font-black text-blue-700">
                {summaryData.total_izin_hari_ini}
              </p>
            </div>
          </div>

          {/* Siswa Terlambat */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/60">
            <p className="text-[10px] sm:text-xs font-bold text-amber-800 uppercase tracking-wider mb-1 truncate">
              Siswa Terlambat
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-black text-amber-700">
              {summaryData.total_terlambat_hari_ini}
            </p>
          </div>

          {/* Pengajuan Izin Menunggu */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-purple-50/70 border border-purple-200/60">
            <p className="text-[10px] sm:text-xs font-bold text-purple-800 uppercase tracking-wider mb-1 truncate">
              Izin Menunggu
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-black text-purple-700">
              {summaryData.pengajuan_izin_menunggu}
            </p>
          </div>

          {/* Pelanggaran Hari Ini */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-rose-50/70 border border-rose-200/60">
            <p className="text-[10px] sm:text-xs font-bold text-rose-800 uppercase tracking-wider mb-1 truncate">
              Pelanggaran Tercatat
            </p>
            <p className="text-xl sm:text-2xl md:text-3xl font-black text-rose-700">
              {summaryData.pelanggaran_hari_ini}
            </p>
          </div>
        </div>
      </div>

      {/* Tombol Aksi Cepat Guru Piket */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link
          to="/piket"
          className="group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-4 sm:p-5 rounded-2xl shadow-md transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-2.5 sm:p-3 bg-white/15 rounded-xl backdrop-blur-xs shrink-0">
              <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base truncate">Meja Guru Piket</h3>
              <p className="text-[11px] text-blue-100 truncate">
                Terbitkan izin masuk/keluar
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/pelanggaran"
          className="group bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white p-4 sm:p-5 rounded-2xl shadow-md transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-2.5 sm:p-3 bg-white/15 rounded-xl backdrop-blur-xs shrink-0">
              <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base truncate">Catat Pelanggaran</h3>
              <p className="text-[11px] text-rose-100 truncate">
                Buku saku kedisiplinan siswa
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/dashboard"
          className="group bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white p-4 sm:p-5 rounded-2xl shadow-md transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-2.5 sm:p-3 bg-white/15 rounded-xl backdrop-blur-xs shrink-0">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base truncate">Dashboard Piket</h3>
              <p className="text-[11px] text-purple-100 truncate">
                Verifikasi izin & rekapitulasi
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/harian"
          className="group bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white p-4 sm:p-5 rounded-2xl shadow-md transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-2.5 sm:p-3 bg-white/15 rounded-xl backdrop-blur-xs shrink-0">
              <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base truncate">Presensi Siswa</h3>
              <p className="text-[11px] text-emerald-100 truncate">Scan wajah siswa</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Tabel Ringkasan Surat Izin yang Diterbitkan Hari Ini */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Surat Izin Diterbitkan Hari Ini
            </h2>
            <p className="text-xs text-slate-500">
              Daftar siswa yang telah mendapatkan dispensasi surat izin meja
              piket pada {todayIndoStr}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/piket"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Terbitkan Surat Izin</span>
            </Link>
          </div>
        </div>

        {summaryData.recent_izin && summaryData.recent_izin.length > 0 ? (
          <>
            {/* 1. Mobile Cards View (< md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {summaryData.recent_izin.map((item) => (
                <div key={item.id} className="py-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-800 truncate">
                        {item.nama}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span>NIS {item.nis}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700">{item.kelas}</span>
                      </div>
                    </div>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase shrink-0 ${
                        item.tipe === "Izin Masuk"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}
                    >
                      {item.tipe}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-600 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Jam Pelajaran:</span>
                      <span className="font-semibold text-slate-700">{item.jam_ke || "-"}</span>
                    </div>
                    <div className="text-slate-700 text-xs">
                      <span className="text-slate-400 text-[11px]">Alasan: </span>
                      <span className="break-words">{item.alasan || "-"}</span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedSlip(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                      title="Lihat atau Cetak Lembar Surat Izin"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Cetak Slip</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 2. Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Siswa</th>
                    <th className="py-3 px-3">Kelas</th>
                    <th className="py-3 px-3">Jenis Izin</th>
                    <th className="py-3 px-3">Jam Ke</th>
                    <th className="py-3 px-3">Alasan</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summaryData.recent_izin.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {item.nama}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          NIS {item.nis}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {item.kelas}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            item.tipe === "Izin Masuk"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {item.tipe}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-medium">
                        {item.jam_ke}
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                        {item.alasan}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedSlip(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                          title="Lihat atau Cetak Lembar Surat Izin"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>Slip</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <ClipboardCheck className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-500">
              Belum ada surat izin yang diterbitkan hari ini.
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Mencatat siswa yang terlambat atau meminta izin keluar kelas.
            </p>
          </div>
        )}
      </div>

      {/* Modal Profile & Settings */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        initialTab={profileModalTab}
      />

      {/* Modal Preview & Cetak Slip Izin Piket */}
      <SlipIzinPiketModal
        isOpen={Boolean(selectedSlip)}
        slipData={selectedSlip}
        onClose={() => setSelectedSlip(null)}
      />

      {/* Modal Tanda Tangan Digital */}
      <SignaturePadModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={handleSaveSignature}
        initialSignature={user?.tanda_tangan}
        title="Tanda Tangan Digital Guru Piket"
        description="Bubuhkan tanda tangan Anda sebagai identitas sah penandatangan Surat Izin Masuk dan Keluar Siswa."
      />
    </div>
  );
}
