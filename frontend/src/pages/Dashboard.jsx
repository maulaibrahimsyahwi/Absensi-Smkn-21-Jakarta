import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
  Users,
  CheckCircle2,
  Clock,
  BookOpen,
  Search,
  Filter,
  FileText,
  ClipboardCheck,
  Info,
  AlertCircle,
  X,
  PenTool,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  BarChart3,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import CustomDropdown from "../components/CustomDropdown";
import { getJurusanInfo } from "../constants/schoolData";
import SignaturePadModal from "../components/SignaturePadModal";

// Modular Subcomponents
import DashboardPeriodFilter from "../components/dashboard/DashboardPeriodFilter";
import DashboardKpiCards from "../components/dashboard/DashboardKpiCards";
import DashboardPagination from "../components/dashboard/DashboardPagination";
import RekapSiswaTab from "../components/dashboard/tabs/RekapSiswaTab";
import PresensiHarianTab from "../components/dashboard/tabs/PresensiHarianTab";
import PerpustakaanTab from "../components/dashboard/tabs/PerpustakaanTab";
import VerifikasiIzinTab from "../components/dashboard/tabs/VerifikasiIzinTab";
import IzinPiketTab from "../components/dashboard/tabs/IzinPiketTab";
import ManajemenPiketTab from "../components/dashboard/tabs/ManajemenPiketTab";
import BukuPelanggaranTab from "../components/dashboard/tabs/BukuPelanggaranTab";
import SuratLightboxModal from "../components/dashboard/modals/SuratLightboxModal";
import RejectIzinModal from "../components/dashboard/modals/RejectIzinModal";
import SlipIzinPiketModal from "../components/piket/SlipIzinPiketModal";
import { SkeletonTable } from "../components/common/Skeleton";

const BULAN_OPTIONS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

const BULAN_DROPDOWN_OPTIONS = BULAN_OPTIONS.map((b) => ({
  value: b.value,
  label: `${b.label}`,
}));

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export default function Dashboard() {
  const { user, isPiket, isAdmin, saveSignature } = useAuth();
  const backTarget = isPiket
    ? "/portal-piket"
    : isAdmin
      ? "/portal-admin"
      : "/";
  const currentNow = new Date();
  const [periodeMode, setPeriodeMode] = useState("bulan"); // "bulan" atau "tahun"
  const [selectedBulan, setSelectedBulan] = useState(currentNow.getMonth() + 1);
  const [selectedTahun, setSelectedTahun] = useState(currentNow.getFullYear());
  const [availableYears, setAvailableYears] = useState(DEFAULT_YEARS);

  // Ambil daftar tahun dinamis dari database
  useEffect(() => {
    api
      .get("/rekap/available_years")
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setAvailableYears(res.data);
        }
      })
      .catch((err) => {
        console.warn("Menggunakan fallback tahun:", err);
      });
  }, []);

  const tahunDropdownOptions = useMemo(() => {
    return availableYears.map((t) => ({
      value: t,
      label: `${t}`,
    }));
  }, [availableYears]);

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem("smkn21_auth_user");
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed?.role === "piket" ? "verifikasi_izin" : "rekap_siswa";
    } catch {
      return "rekap_siswa";
    }
  });
  const [showSigModal, setShowSigModal] = useState(false);

  useEffect(() => {
    if (
      isPiket &&
      (activeTab === "rekap_siswa" ||
        activeTab === "riwayat_perpus" ||
        activeTab === "manajemen_piket")
    ) {
      setActiveTab("verifikasi_izin");
    }
  }, [isPiket, activeTab]);

  // Helper Kategori Tab Dashboard: "kehadiran" | "perizinan" | "manajemen"
  const activeCategory = useMemo(() => {
    if (
      ["rekap_siswa", "riwayat_harian", "riwayat_perpus"].includes(activeTab)
    ) {
      return "kehadiran";
    }
    if (["verifikasi_izin", "izin_piket"].includes(activeTab)) {
      return "perizinan";
    }
    if (["pelanggaran_siswa", "manajemen_piket"].includes(activeTab)) {
      return "manajemen";
    }
    return "kehadiran";
  }, [activeTab]);

  const handleSelectCategory = (cat) => {
    setSearchTerm("");
    if (cat === "kehadiran") {
      setActiveTab(isPiket ? "riwayat_harian" : "rekap_siswa");
    } else if (cat === "perizinan") {
      setActiveTab("verifikasi_izin");
    } else if (cat === "manajemen") {
      setActiveTab("pelanggaran_siswa");
    }
  };

  const handleSaveSignature = async (dataUrl) => {
    if (user) {
      await saveSignature(dataUrl);
      setNotification({
        type: "success",
        message: "Tanda tangan Guru Piket berhasil diperbarui!",
      });
    }
  };

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [kelasFilter, setKelasFilter] = useState("ALL");
  const [statusIzinFilter, setStatusIzinFilter] = useState("ALL"); // "ALL", "Menunggu", "Disetujui", "Ditolak"
  const [verifyingId, setVerifyingId] = useState(null);
  const [selectedSuratModal, setSelectedSuratModal] = useState(null);
  const [selectedSlipModal, setSelectedSlipModal] = useState(null);
  const [rejectModalItem, setRejectModalItem] = useState(null);
  const [rejectNote, setRejectNote] = useState("");

  // Paginasi & Slider batas data aktif
  const [displayLimit, setDisplayLimit] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Data utama dari API
  const [siswaPeriode, setSiswaPeriode] = useState({
    statistik: {},
    daftar: [],
  });
  const [riwayatHarian, setRiwayatHarian] = useState([]);
  const [riwayatPerpus, setRiwayatPerpus] = useState([]);
  const [pengajuanList, setPengajuanList] = useState([]);
  const [izinPiketList, setIzinPiketList] = useState([]);

  const [notification, setNotification] = useState(null);

  // Auto-dismiss floating toast notification setelah 5 detik
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Reset pagination saat ganti filter/tab
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, kelasFilter, statusIzinFilter, displayLimit]);

  const fetchData = async (isManual = false) => {
    setLoading(true);
    try {
      const delayPromise = isManual
        ? new Promise((resolve) => setTimeout(resolve, 450))
        : Promise.resolve();
      const [resPeriode, resHarian, resPerpus, resPengajuan, resPiket] =
        await Promise.all([
          api.get("/rekap/siswa_periode", {
            params: {
              mode: periodeMode,
              bulan: selectedBulan,
              tahun: selectedTahun,
            },
          }),
          api.get("/rekap/harian", {
            params: {
              mode: periodeMode,
              bulan: selectedBulan,
              tahun: selectedTahun,
            },
          }),
          api.get("/rekap/perpus", {
            params: {
              mode: periodeMode,
              bulan: selectedBulan,
              tahun: selectedTahun,
            },
          }),
          api.get("/pengajuan_izin"),
          api.get("/piket/izin", {
            params: {
              tanggal: "ALL",
            },
          }),
          delayPromise,
        ]);

      setSiswaPeriode(resPeriode.data || { statistik: {}, daftar: [] });
      setRiwayatHarian(resHarian.data || []);
      setRiwayatPerpus(resPerpus.data || []);
      setPengajuanList(resPengajuan.data || []);
      setIzinPiketList(resPiket.data || []);

      if (isManual) {
        setNotification({
          type: "success",
          message: "Data rekapitulasi & riwayat kehadiran berhasil diperbarui!",
        });
      }
    } catch (err) {
      console.error("Gagal mengambil data rekap:", err);
      if (isManual) {
        setNotification({
          type: "error",
          message:
            "Gagal memperbarui data rekapitulasi. Periksa koneksi backend.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIzinPiket = async (id, nama) => {
    if (
      !window.confirm(
        `Apakah Anda yakin ingin menghapus surat izin untuk ${nama}?`,
      )
    )
      return;
    try {
      await api.delete(`/piket/izin/${id}`);
      fetchData();
    } catch (err) {
      alert("Gagal menghapus surat izin piket.");
    }
  };

  const handleVerifikasi = async (id, aksi, catatan = "") => {
    setVerifyingId(id);
    try {
      const res = await api.post(`/pengajuan_izin/${id}/verifikasi`, {
        aksi,
        catatan,
      });
      if (res.data && res.data.success) {
        await fetchData();
        setRejectModalItem(null);
        setRejectNote("");

        // Broadcast real-time event ke tab portal siswa
        try {
          if (typeof BroadcastChannel !== "undefined") {
            const bc = new BroadcastChannel("smkn21_absensi_channel");
            bc.postMessage({
              type: "IZIN_VERIFIED",
              id,
              aksi,
              timestamp: Date.now(),
            });
            bc.close();
          }
        } catch {
          // ignore
        }
        try {
          localStorage.setItem(
            "smkn21_last_izin_update",
            Date.now().toString(),
          );
        } catch {
          // ignore
        }
      }
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Gagal memproses verifikasi surat pengajuan.",
      );
    } finally {
      setVerifyingId(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, [periodeMode, selectedBulan, selectedTahun]);

  // Filtered Rekap Siswa
  const filteredSiswa = useMemo(() => {
    return (siswaPeriode.daftar || []).filter((item) => {
      const matchSearch =
        item.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kelas?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchKelas = kelasFilter === "ALL" || item.kelas === kelasFilter;
      return matchSearch && matchKelas;
    });
  }, [siswaPeriode.daftar, searchTerm, kelasFilter]);

  // Filtered Riwayat Harian
  const filteredHarian = useMemo(() => {
    return riwayatHarian.filter((item) => {
      const matchSearch =
        item.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kelas?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchKelas = kelasFilter === "ALL" || item.kelas === kelasFilter;
      return matchSearch && matchKelas;
    });
  }, [riwayatHarian, searchTerm, kelasFilter]);

  // Filtered Riwayat Perpus
  const filteredPerpus = useMemo(() => {
    return riwayatPerpus.filter((item) => {
      const matchSearch =
        item.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kelas?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.keperluan?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchKelas = kelasFilter === "ALL" || item.kelas === kelasFilter;
      return matchSearch && matchKelas;
    });
  }, [riwayatPerpus, searchTerm, kelasFilter]);

  // Filtered Pengajuan Izin
  const filteredPengajuan = useMemo(() => {
    return pengajuanList.filter((item) => {
      const matchSearch =
        item.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.alasan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kelas?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchKelas = kelasFilter === "ALL" || item.kelas === kelasFilter;
      const matchStatus =
        statusIzinFilter === "ALL" ||
        item.status_pengajuan === statusIzinFilter;
      return matchSearch && matchKelas && matchStatus;
    });
  }, [pengajuanList, searchTerm, kelasFilter, statusIzinFilter]);

  // Filtered Izin Meja Piket
  const filteredIzinPiket = useMemo(() => {
    return izinPiketList.filter((item) => {
      // Filter periode jika mode bulan/tahun dipilih
      if (item.tanggal) {
        const [y, m] = item.tanggal.split("-").map(Number);
        if (selectedTahun && y !== Number(selectedTahun)) return false;
        if (
          periodeMode === "bulan" &&
          selectedBulan &&
          m !== Number(selectedBulan)
        )
          return false;
      }
      const matchSearch =
        item.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.alasan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kelas?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.petugas_piket?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tipe?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchKelas = kelasFilter === "ALL" || item.kelas === kelasFilter;
      return matchSearch && matchKelas;
    });
  }, [
    izinPiketList,
    searchTerm,
    kelasFilter,
    periodeMode,
    selectedBulan,
    selectedTahun,
  ]);

  const pendingCount = useMemo(() => {
    return pengajuanList.filter((p) => p.status_pengajuan === "Menunggu")
      .length;
  }, [pengajuanList]);

  const uniqueKelas = useMemo(() => {
    const list = siswaPeriode.daftar?.map((s) => s.kelas) || [];
    return Array.from(new Set(list)).filter(Boolean);
  }, [siswaPeriode.daftar]);

  const namaBulanTerpilih = useMemo(() => {
    const b = BULAN_OPTIONS.find((opt) => opt.value === Number(selectedBulan));
    return b ? b.label : "";
  }, [selectedBulan]);

  // Perhitungan batas tampilan dan paginasi data aktif
  const currentTotalList = useMemo(() => {
    if (activeTab === "rekap_siswa") return filteredSiswa;
    if (activeTab === "riwayat_harian") return filteredHarian;
    if (activeTab === "riwayat_perpus") return filteredPerpus;
    if (activeTab === "verifikasi_izin") return filteredPengajuan;
    if (activeTab === "izin_piket") return filteredIzinPiket;
    return [];
  }, [
    activeTab,
    filteredSiswa,
    filteredHarian,
    filteredPerpus,
    filteredPengajuan,
    filteredIzinPiket,
  ]);

  const totalItems = currentTotalList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / displayLimit));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (safeCurrentPage - 1) * displayLimit;
  const endIndex = Math.min(startIndex + displayLimit, totalItems);

  // Potongan data yang ditampilkan sesuai slider limit & halaman aktif
  const paginatedSiswa = useMemo(() => {
    if (activeTab !== "rekap_siswa") return [];
    return filteredSiswa.slice(startIndex, endIndex);
  }, [activeTab, filteredSiswa, startIndex, endIndex]);

  const paginatedHarian = useMemo(() => {
    if (activeTab !== "riwayat_harian") return [];
    return filteredHarian.slice(startIndex, endIndex);
  }, [activeTab, filteredHarian, startIndex, endIndex]);

  const paginatedPerpus = useMemo(() => {
    if (activeTab !== "riwayat_perpus") return [];
    return filteredPerpus.slice(startIndex, endIndex);
  }, [activeTab, filteredPerpus, startIndex, endIndex]);

  const paginatedPengajuan = useMemo(() => {
    if (activeTab !== "verifikasi_izin") return [];
    return filteredPengajuan.slice(startIndex, endIndex);
  }, [activeTab, filteredPengajuan, startIndex, endIndex]);

  const paginatedIzinPiket = useMemo(() => {
    if (activeTab !== "izin_piket") return [];
    return filteredIzinPiket.slice(startIndex, endIndex);
  }, [activeTab, filteredIzinPiket, startIndex, endIndex]);

  // Ekspor Data Laporan (PDF .pdf, Excel .xlsx, Excel .xls, CSV .csv) Sesuai Periode Aktif
  const handleExport = async (format = "xlsx") => {
    try {
      const { exportSpreadsheet, exportPdf } =
        await import("../utils/exportUtils");
      if (format === "pdf") {
        exportPdf(
          activeTab,
          {
            filteredSiswa,
            filteredHarian,
            filteredPerpus,
            filteredPengajuan,
            filteredIzinPiket,
          },
          {
            periodeMode,
            namaBulanTerpilih,
            selectedTahun,
          },
        );
      } else {
        exportSpreadsheet(
          format,
          activeTab,
          {
            filteredSiswa,
            filteredHarian,
            filteredPerpus,
            filteredPengajuan,
            filteredIzinPiket,
          },
          {
            periodeMode,
            namaBulanTerpilih,
            selectedTahun,
          },
        );
      }
    } catch (err) {
      console.error("Gagal memuat modul ekspor:", err);
      setNotification({
        type: "error",
        message: "Gagal memuat modul ekspor data. Silakan coba lagi.",
      });
    }
  };

  const stats = siswaPeriode.statistik || {};

  return (
    <div className="py-6 sm:py-8 px-3.5 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-4">
      {/* 1. Header & Period Filter */}
      <DashboardPeriodFilter
        periodeMode={periodeMode}
        setPeriodeMode={setPeriodeMode}
        selectedBulan={selectedBulan}
        setSelectedBulan={setSelectedBulan}
        selectedTahun={selectedTahun}
        setSelectedTahun={setSelectedTahun}
        bulanDropdownOptions={BULAN_DROPDOWN_OPTIONS}
        tahunDropdownOptions={tahunDropdownOptions}
        namaBulanTerpilih={namaBulanTerpilih}
        loading={loading}
        onRefresh={fetchData}
        onExport={handleExport}
      />

      {/* 2. KPI Metric Summary Cards */}
      <DashboardKpiCards stats={stats} />

      {/* 3 Kategori Utama Pengelompokan Dashboard (Solusi Opsi 1) */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl flex flex-col sm:flex-row gap-1.5 border border-slate-200 shadow-2xs">
        {/* Kategori 1: Presensi & Kehadiran */}
        <button
          type="button"
          onClick={() => handleSelectCategory("kehadiran")}
          className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-colors duration-150 cursor-pointer flex-1 border ${
            activeCategory === "kehadiran"
              ? "bg-white text-blue-700 shadow-xs border-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60 border-transparent"
          }`}
        >
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <span>Presensi & Kehadiran</span>
        </button>

        {/* Kategori 2: Perizinan Siswa */}
        <button
          type="button"
          onClick={() => handleSelectCategory("perizinan")}
          className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-colors duration-150 cursor-pointer flex-1 border ${
            activeCategory === "perizinan"
              ? "bg-white text-indigo-700 shadow-xs border-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60 border-transparent"
          }`}
        >
          <FileText className="w-4 h-4 text-indigo-600" />
          <span>Perizinan Siswa</span>
        </button>

        {/* Kategori 3: Tata Tertib & Staf */}
        <button
          type="button"
          onClick={() => handleSelectCategory("manajemen")}
          className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-colors duration-150 cursor-pointer flex-1 border ${
            activeCategory === "manajemen"
              ? "bg-white text-purple-700 shadow-xs border-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60 border-transparent"
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          <span>Tata Tertib & Staf</span>
        </button>
      </div>

      {/* 3. Main Content Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Sub-Tab Navigation Bar (Pill Buttons yang responsif tanpa scroll horizontal) */}
        <div className="border-b border-slate-200 px-4 sm:px-6 py-3 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* --- SUB-TAB UNTUK KATEGORI: PRESENSI & KEHADIRAN --- */}
            {activeCategory === "kehadiran" && (
              <>
                {!isPiket && (
                  <button
                    onClick={() => {
                      setActiveTab("rekap_siswa");
                      setSearchTerm("");
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors duration-150 cursor-pointer border ${
                      activeTab === "rekap_siswa"
                        ? "bg-blue-600 text-white shadow-xs border-blue-600"
                        : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200/80"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Rekap Kehadiran Siswa</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                        activeTab === "rekap_siswa"
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {filteredSiswa.length}
                    </span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setActiveTab("riwayat_harian");
                    setSearchTerm("");
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors duration-150 cursor-pointer border ${
                    activeTab === "riwayat_harian"
                      ? "bg-blue-600 text-white shadow-xs border-blue-600"
                      : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200/80"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Log Presensi Harian</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                      activeTab === "riwayat_harian"
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {riwayatHarian.length}
                  </span>
                </button>

                {!isPiket && (
                  <button
                    onClick={() => {
                      setActiveTab("riwayat_perpus");
                      setSearchTerm("");
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors duration-150 cursor-pointer border ${
                      activeTab === "riwayat_perpus"
                        ? "bg-emerald-600 text-white shadow-xs border-emerald-600"
                        : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200/80"
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Log Kunjungan Perpustakaan</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                        activeTab === "riwayat_perpus"
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {riwayatPerpus.length}
                    </span>
                  </button>
                )}
              </>
            )}

            {/* --- SUB-TAB UNTUK KATEGORI: PERIZINAN SISWA --- */}
            {activeCategory === "perizinan" && (
              <>
                <button
                  onClick={() => {
                    setActiveTab("verifikasi_izin");
                    setSearchTerm("");
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors duration-150 cursor-pointer border ${
                    activeTab === "verifikasi_izin"
                      ? "bg-rose-600 text-white shadow-xs border-rose-600"
                      : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200/80"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Verifikasi Izin & Sakit</span>
                  {pendingCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-white text-rose-600 shadow-2xs animate-pulse">
                      {pendingCount} Baru
                    </span>
                  ) : (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                        activeTab === "verifikasi_izin"
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {pengajuanList.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setActiveTab("izin_piket");
                    setSearchTerm("");
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors duration-150 cursor-pointer border ${
                    activeTab === "izin_piket"
                      ? "bg-indigo-600 text-white shadow-xs border-indigo-600"
                      : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200/80"
                  }`}
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Izin Meja Piket</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                      activeTab === "izin_piket"
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {filteredIzinPiket.length}
                  </span>
                </button>
              </>
            )}

            {/* --- SUB-TAB UNTUK KATEGORI: TATA TERTIB & STAF --- */}
            {activeCategory === "manajemen" && (
              <>
                <button
                  onClick={() => {
                    setActiveTab("pelanggaran_siswa");
                    setSearchTerm("");
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors duration-150 cursor-pointer border ${
                    activeTab === "pelanggaran_siswa"
                      ? "bg-rose-600 text-white shadow-xs border-rose-600"
                      : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200/80"
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Buku Catatan Pelanggaran</span>
                </button>

                {isAdmin && (
                  <button
                    onClick={() => {
                      setActiveTab("manajemen_piket");
                      setSearchTerm("");
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors duration-150 cursor-pointer border ${
                      activeTab === "manajemen_piket"
                        ? "bg-purple-600 text-white shadow-xs border-purple-600"
                        : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200/80"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Kelola Guru Piket</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tab 6: Buku Catatan Pelanggaran */}
        {activeTab === "pelanggaran_siswa" && (
          <div className="p-4 sm:p-6 min-h-[500px]">
            <BukuPelanggaranTab />
          </div>
        )}

        {/* Tab 7: Manajemen Guru Piket (Khusus Admin) */}
        {isAdmin && activeTab === "manajemen_piket" && (
          <div className="p-4 sm:p-6 min-h-[500px]">
            <ManajemenPiketTab />
          </div>
        )}

        {/* Tab 1 - 5: Presensi & Perizinan (Fallback) */}
        <div
          className={
            !["pelanggaran_siswa", "manajemen_piket"].includes(activeTab)
              ? "min-h-[500px] flex flex-col justify-between"
              : "hidden"
          }
        >
          {/* Filter & Search Bar */}
          <div className="p-3.5 sm:p-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama, NIS, alasan, atau kelas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {activeTab === "verifikasi_izin" && (
                <CustomDropdown
                  value={statusIzinFilter}
                  onChange={setStatusIzinFilter}
                  options={[
                    { value: "ALL", label: "Semua Status" },
                    { value: "Menunggu", label: "Menunggu Konfirmasi" },
                    { value: "Disetujui", label: "Disetujui" },
                    { value: "Ditolak", label: "Ditolak" },
                  ]}
                  icon={<Filter className="w-3.5 h-3.5 text-slate-400" />}
                  className="w-full sm:w-auto min-w-[150px]"
                  align="right"
                />
              )}

              <CustomDropdown
                value={kelasFilter}
                onChange={setKelasFilter}
                options={[
                  { value: "ALL", label: "Semua Kelas" },
                  ...uniqueKelas.map((k) => ({ value: k, label: k })),
                ]}
                icon={<Filter className="w-3.5 h-3.5 text-slate-400" />}
                className="w-full sm:w-auto"
                align="right"
              />
            </div>
          </div>

          {/* Slider Batas Data & Navigasi Halaman Atas */}
          <DashboardPagination
            displayLimit={displayLimit}
            setDisplayLimit={setDisplayLimit}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalItems={totalItems}
            totalPages={totalPages}
            safeCurrentPage={safeCurrentPage}
            startIndex={startIndex}
            endIndex={endIndex}
          />

          {loading ? (
            <div className="p-4 sm:p-6 min-h-[400px]">
              <SkeletonTable rows={7} cols={6} />
            </div>
          ) : (
            <>
              {/* Tab 1: Rekap Akumulasi Siswa */}
              {activeTab === "rekap_siswa" && (
                <RekapSiswaTab
                  filteredSiswa={filteredSiswa}
                  paginatedSiswa={paginatedSiswa}
                />
              )}

              {/* Tab 2: Log Detail Presensi Harian */}
              {activeTab === "riwayat_harian" && (
                <PresensiHarianTab
                  filteredHarian={filteredHarian}
                  paginatedHarian={paginatedHarian}
                  periodeMode={periodeMode}
                  namaBulanTerpilih={namaBulanTerpilih}
                  selectedTahun={selectedTahun}
                />
              )}

              {/* Tab 3: Log Detail Perpustakaan */}
              {activeTab === "riwayat_perpus" && (
                <PerpustakaanTab
                  filteredPerpus={filteredPerpus}
                  paginatedPerpus={paginatedPerpus}
                  periodeMode={periodeMode}
                  namaBulanTerpilih={namaBulanTerpilih}
                  selectedTahun={selectedTahun}
                />
              )}

              {/* Tab 4: Verifikasi Pengajuan Izin & Sakit */}
              {activeTab === "verifikasi_izin" && (
                <VerifikasiIzinTab
                  filteredPengajuan={filteredPengajuan}
                  paginatedPengajuan={paginatedPengajuan}
                  statusIzinFilter={statusIzinFilter}
                  verifyingId={verifyingId}
                  onVerifikasi={handleVerifikasi}
                  onOpenRejectModal={(item) => setRejectModalItem(item)}
                  onOpenSuratModal={(item) => setSelectedSuratModal(item)}
                />
              )}

              {/* Tab 5: Izin Meja Piket */}
              {activeTab === "izin_piket" && (
                <IzinPiketTab
                  filteredIzinPiket={filteredIzinPiket}
                  paginatedIzinPiket={paginatedIzinPiket}
                  onOpenSlipModal={(item) => setSelectedSlipModal(item)}
                  onDeleteIzin={handleDeleteIzinPiket}
                />
              )}
            </>
          )}

          {/* Footer Navigasi Halaman Bawah */}
          <div className="p-4 sm:p-5 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-b-2xl">
            <p className="text-xs text-slate-500 text-center sm:text-left">
              {totalItems === 0 ? (
                "Tidak ada baris data untuk ditampilkan."
              ) : (
                <>
                  Menampilkan{" "}
                  <span className="font-bold text-slate-800">
                    {startIndex + 1}–{endIndex}
                  </span>{" "}
                  dari{" "}
                  <span className="font-bold text-slate-800">{totalItems}</span>{" "}
                  total entri data
                </>
              )}
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">
                  Halaman {safeCurrentPage} dari {totalPages}
                </span>
                <div className="inline-flex rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
                  <button
                    type="button"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 350, behavior: "smooth" });
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed border-r border-slate-200 cursor-pointer"
                  >
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 350, behavior: "smooth" });
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Lightbox Foto Surat Bukti */}
      <SuratLightboxModal
        item={selectedSuratModal}
        onClose={() => setSelectedSuratModal(null)}
      />

      {/* Modal Penolakan dengan Catatan Guru */}
      <RejectIzinModal
        item={rejectModalItem}
        rejectNote={rejectNote}
        setRejectNote={setRejectNote}
        verifyingId={verifyingId}
        onConfirmReject={(id, note) => handleVerifikasi(id, "Ditolak", note)}
        onClose={() => {
          setRejectModalItem(null);
          setRejectNote("");
        }}
      />

      {/* Modal E-Slip Izin Meja Piket Resmi */}
      <SlipIzinPiketModal
        isOpen={Boolean(selectedSlipModal)}
        slipData={selectedSlipModal}
        onClose={() => setSelectedSlipModal(null)}
      />

      {/* Modal Tanda Tangan Guru Piket */}
      <SignaturePadModal
        isOpen={showSigModal}
        onClose={() => setShowSigModal(false)}
        onSave={handleSaveSignature}
        initialSignature={user?.tanda_tangan}
        title="Tanda Tangan Digital Guru Piket"
        signerName={user?.nama || "Guru Piket"}
      />

      {/* Floating Bottom-Right Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] animate-in slide-in-from-bottom-5 fade-in duration-200 pointer-events-auto">
          <div
            className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-start gap-3 relative ${
              notification.type === "success"
                ? "bg-slate-900/95 border-emerald-500/40 text-white shadow-emerald-950/30"
                : notification.type === "info"
                  ? "bg-slate-900/95 border-blue-500/40 text-white shadow-blue-950/30"
                  : "bg-slate-900/95 border-rose-500/40 text-white shadow-rose-950/30"
            }`}
          >
            {notification.type === "success" ? (
              <div className="p-1 rounded-xl bg-emerald-500/20 text-emerald-400 flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : notification.type === "info" ? (
              <div className="p-1 rounded-xl bg-blue-500/20 text-blue-400 flex-shrink-0 mt-0.5">
                <Info className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-1 rounded-xl bg-rose-500/20 text-rose-400 flex-shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
            )}

            <div className="flex-1 pr-6 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-slate-400">
                {notification.type === "success"
                  ? "Berhasil"
                  : notification.type === "info"
                    ? "Informasi"
                    : "Pemberitahuan"}
              </p>
              <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-100 break-words">
                {notification.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setNotification(null)}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Tutup Notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
