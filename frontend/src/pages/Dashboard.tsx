import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import { rekapService, izinService } from "../services";
import type { AksiVerifikasi } from "../services/izinService";
import ConfirmSheet from "../components/ui/ConfirmSheet";
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
  ShieldAlert,
  BarChart3,
  UsersRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import CustomDropdown from "../components/CustomDropdown";
import SignaturePadModal from "../components/SignaturePadModal";
import { useRealtimeSubscription } from "../services/realtimeService";

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
import SuratLightboxModal from "../components/dashboard/modals/SuratLightBoxModal";
import RejectIzinModal from "../components/dashboard/modals/RejectIzinModal";
import SlipIzinPiketModal from "../components/piket/SlipIzinPiketModal";
import ModalExportLaporanSudin from "../components/admin/ModalExportLaporanSudin";
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

interface SiswaPeriodeData {
  statistik?: Record<string, any>;
  daftar?: any[];
}

export default function Dashboard(): React.JSX.Element {
  const { user, isPiket, isAdmin, saveSignature } = useAuth();
  const backTarget = isPiket
    ? "/portal-piket"
    : isAdmin
      ? "/portal-admin"
      : "/";
  const currentNow = new Date();
  const [periodeMode, setPeriodeMode] = useState<"bulan" | "tahun">("bulan");
  const [selectedBulan, setSelectedBulan] = useState(currentNow.getMonth() + 1);
  const [selectedTahun, setSelectedTahun] = useState(currentNow.getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>(DEFAULT_YEARS);
  const [isSudinModalOpen, setIsSudinModalOpen] = useState(false);

  // Ambil daftar tahun dinamis dari database
  useEffect(() => {
    rekapService
      .getAvailableYears()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailableYears(data);
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

  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const urlTab = new URLSearchParams(window.location.search).get("tab");
      if (urlTab) return urlTab;
      const saved = localStorage.getItem("smkn21_auth_user");
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed?.role === "piket" ? "verifikasi_izin" : "rekap_siswa";
    } catch {
      return "rekap_siswa";
    }
  });
  const [showSigModal, setShowSigModal] = useState(false);

  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    if (
      isPiket &&
      !searchParams.get("tab") &&
      (activeTab === "rekap_siswa" ||
        activeTab === "riwayat_perpus" ||
        activeTab === "manajemen_piket")
    ) {
      setActiveTab("verifikasi_izin");
    }
  }, [isPiket, activeTab, searchParams]);

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

  const handleSelectCategory = (cat: "kehadiran" | "perizinan" | "manajemen") => {
    setSearchTerm("");
    if (cat === "kehadiran") {
      setActiveTab(isPiket ? "riwayat_harian" : "rekap_siswa");
    } else if (cat === "perizinan") {
      setActiveTab("verifikasi_izin");
    } else if (cat === "manajemen") {
      setActiveTab("pelanggaran_siswa");
    }
  };

  const handleSaveSignature = async (dataUrl: string) => {
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
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [selectedSuratModal, setSelectedSuratModal] = useState<any | null>(null);
  const [selectedSlipModal, setSelectedSlipModal] = useState<any | null>(null);
  const [rejectModalItem, setRejectModalItem] = useState<any | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  // Paginasi & Slider batas data aktif
  const [displayLimit, setDisplayLimit] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Data utama dari API
  const [siswaPeriode, setSiswaPeriode] = useState<SiswaPeriodeData>({
    statistik: {},
    daftar: [],
  });
  const [riwayatHarian, setRiwayatHarian] = useState<any[]>([]);
  const [riwayatPerpus, setRiwayatPerpus] = useState<any[]>([]);
  const [pengajuanList, setPengajuanList] = useState<any[]>([]);
  const [izinPiketList, setIzinPiketList] = useState<any[]>([]);
  const [pelanggaranList, setPelanggaranList] = useState<any[]>([]);
  const [stafList, setStafList] = useState<any[]>([]);

  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Auto-dismiss floating toast notification setelah 5 detik
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Request ID race guard & state konfirmasi hapus izin piket
  const reqIdRef = useRef(0);
  const abortCtrlRef = useRef<AbortController | null>(null);
  const [deletingIzin, setDeletingIzin] = useState<{ id: number; nama: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Reset pagination saat ganti filter/tab
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, kelasFilter, statusIzinFilter, displayLimit]);

  const fetchData = async (isManual = false) => {
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
    }
    const abortCtrl = new AbortController();
    abortCtrlRef.current = abortCtrl;
    const signal = abortCtrl.signal;

    const currentReqId = ++reqIdRef.current;
    setLoading(true);
    try {
      const delayPromise = isManual
        ? new Promise((resolve) => setTimeout(resolve, 450))
        : Promise.resolve();

      const [
        resPeriode,
        resHarian,
        resPerpus,
        resPengajuan,
        resPiket,
        resPelanggaran,
        resStaf,
      ] = await Promise.allSettled([
        rekapService.getSiswaPeriode({
          mode: periodeMode,
          bulan: selectedBulan,
          tahun: selectedTahun,
        }, signal),
        rekapService.getHarian({
          mode: periodeMode,
          bulan: selectedBulan,
          tahun: selectedTahun,
        }, signal),
        rekapService.getPerpus({
          mode: periodeMode,
          bulan: selectedBulan,
          tahun: selectedTahun,
        }, signal),
        izinService.getPengajuanList(signal),
        izinService.getIzinPiketList({
          tanggal: "ALL",
        }, signal),
        api.get("/pelanggaran", {
          params: {
            limit: 1000,
            ...(periodeMode === "bulan" ? { bulan: selectedBulan } : {}),
            tahun: selectedTahun,
          },
          signal,
        }),
        api.get("/staf", { signal }),
        delayPromise,
      ]);

      if (currentReqId !== reqIdRef.current || signal.aborted) return;

      if (resPeriode.status === "fulfilled" && resPeriode.value) {
        setSiswaPeriode(resPeriode.value);
      }
      if (resHarian.status === "fulfilled" && resHarian.value) {
        setRiwayatHarian(
          Array.isArray(resHarian.value)
            ? resHarian.value
            : (resHarian.value as any)?.items || [],
        );
      }
      if (resPerpus.status === "fulfilled" && resPerpus.value) {
        setRiwayatPerpus(
          Array.isArray(resPerpus.value)
            ? resPerpus.value
            : (resPerpus.value as any)?.items || [],
        );
      }
      if (resPengajuan.status === "fulfilled" && resPengajuan.value) {
        setPengajuanList(resPengajuan.value);
      }
      if (resPiket.status === "fulfilled" && resPiket.value) {
        setIzinPiketList(resPiket.value);
      }
      if (resPelanggaran.status === "fulfilled" && resPelanggaran.value?.data?.data) {
        setPelanggaranList(resPelanggaran.value.data.data);
      }
      if (resStaf.status === "fulfilled" && resStaf.value?.data?.data) {
        setStafList(resStaf.value.data.data);
      }

      if (isManual) {
        setNotification({
          type: "success",
          message: "Data rekapitulasi & riwayat kehadiran berhasil diperbarui!",
        });
      }
    } catch (err) {
      if (currentReqId !== reqIdRef.current || abortCtrl.signal.aborted) return;
      console.error("Gagal mengambil data rekap:", err);
      if (isManual) {
        setNotification({
          type: "error",
          message:
            "Gagal memperbarui data rekapitulasi. Periksa koneksi backend.",
        });
      }
    } finally {
      if (currentReqId === reqIdRef.current && !abortCtrl.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const handleDeleteIzinPiket = (id: number, nama: string) => {
    setDeletingIzin({ id, nama });
  };

  const executeDeleteIzinPiket = async () => {
    if (!deletingIzin) return;
    setDeleteLoading(true);
    try {
      await izinService.deleteIzinPiket(deletingIzin.id);
      setNotification({
        type: "success",
        message: `Surat izin untuk ${deletingIzin.nama} berhasil dihapus dari sistem.`,
      });
      setDeletingIzin(null);
      fetchData();
    } catch (err: any) {
      setNotification({
        type: "error",
        message:
          err.response?.data?.message || "Gagal menghapus surat izin piket.",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleVerifikasi = async (id: number, aksi: AksiVerifikasi, catatan = "") => {
    setVerifyingId(id);
    const prevPengajuan = pengajuanList;
    // Optimistic update status pengajuan langsung di UI
    setPengajuanList((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status_pengajuan: aksi === "Disetujui" ? "Disetujui" : "Ditolak",
              catatan_guru: catatan || item.catatan_guru,
            }
          : item,
      ),
    );

    try {
      const res = await izinService.verifikasiPengajuan(id, aksi, catatan);
      if (res && res.success) {
        setRejectModalItem(null);
        setRejectNote("");
        setNotification({
          type: "success",
          message: `Pengajuan izin berhasil ${aksi.toLowerCase()}!`,
        });

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
        fetchData();
      } else {
        // Rollback jika server menolak
        setPengajuanList(prevPengajuan);
        setNotification({
          type: "error",
          message: "Gagal memproses verifikasi surat pengajuan.",
        });
      }
    } catch (err: any) {
      // Rollback jika terjadi kesalahan jaringan
      setPengajuanList(prevPengajuan);
      setNotification({
        type: "error",
        message:
          err.response?.data?.message ||
          "Gagal memproses verifikasi surat pengajuan.",
      });
    } finally {
      setVerifyingId(null);
    }
  };

  useEffect(() => {
    fetchData();
    return () => {
      if (abortCtrlRef.current) {
        abortCtrlRef.current.abort();
      }
    };
  }, [periodeMode, selectedBulan, selectedTahun]);

  // Sinkronisasi data realtime otomatis lintas tab & perangkat dashboard
  useRealtimeSubscription(
    ["presensi", "izin", "pelanggaran", "piket", "siswa", "libur", "pjj"],
    () => {
      fetchData(false);
    },
  );

  // Filtered Rekap Siswa
  const filteredSiswa = useMemo(() => {
    return (siswaPeriode.daftar || []).filter((item: any) => {
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
    return riwayatHarian.filter((item: any) => {
      const matchSearch =
        item.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kelas?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchKelas = kelasFilter === "ALL" || item.kelas === kelasFilter;
      return matchSearch && matchKelas;
    });
  }, [riwayatHarian, searchTerm, kelasFilter]);

  // Filtered Riwayat Perpus
  const filteredPerpus = useMemo(() => {
    return riwayatPerpus.filter((item: any) => {
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
    return pengajuanList.filter((item: any) => {
      if (item.tanggal_mulai) {
        const [y, m] = item.tanggal_mulai.split("-").map(Number);
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
        item.kelas?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchKelas = kelasFilter === "ALL" || item.kelas === kelasFilter;
      const matchStatus =
        statusIzinFilter === "ALL" ||
        item.status_pengajuan === statusIzinFilter;
      return matchSearch && matchKelas && matchStatus;
    });
  }, [
    pengajuanList,
    searchTerm,
    kelasFilter,
    statusIzinFilter,
    periodeMode,
    selectedBulan,
    selectedTahun,
  ]);

  // Filtered Izin Meja Piket
  const filteredIzinPiket = useMemo(() => {
    return izinPiketList.filter((item: any) => {
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

  // Filtered Buku Pelanggaran Siswa
  const filteredPelanggaran = useMemo(() => {
    return pelanggaranList.filter((item: any) => {
      if (item.tanggal_waktu) {
        const [datePart] = item.tanggal_waktu.split(" ");
        const [y, m] = datePart.split("-").map(Number);
        if (selectedTahun && y !== Number(selectedTahun)) return false;
        if (
          periodeMode === "bulan" &&
          selectedBulan &&
          m !== Number(selectedBulan)
        )
          return false;
      }
      const matchSearch =
        item.nama_siswa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.jenis_pelanggaran
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        item.kelas?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nama_penanggung_jawab
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchKelas = kelasFilter === "ALL" || item.kelas === kelasFilter;
      return matchSearch && matchKelas;
    });
  }, [
    pelanggaranList,
    searchTerm,
    kelasFilter,
    periodeMode,
    selectedBulan,
    selectedTahun,
  ]);

  const pendingCount = useMemo(() => {
    return pengajuanList.filter((p: any) => p.status_pengajuan === "Menunggu")
      .length;
  }, [pengajuanList]);

  const uniqueKelas = useMemo(() => {
    const list = siswaPeriode.daftar?.map((s: any) => s.kelas) || [];
    return Array.from(new Set(list)).filter(Boolean) as string[];
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
    if (activeTab === "pelanggaran_siswa") return filteredPelanggaran;
    if (activeTab === "manajemen_piket") return stafList;
    return [];
  }, [
    activeTab,
    filteredSiswa,
    filteredHarian,
    filteredPerpus,
    filteredPengajuan,
    filteredIzinPiket,
    filteredPelanggaran,
    stafList,
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
      const datasets = {
        filteredSiswa,
        filteredHarian,
        filteredPerpus,
        filteredPengajuan,
        filteredIzinPiket,
        filteredPelanggaran,
        records: filteredPelanggaran,
        stafList,
      };
      const periodeInfo = {
        periodeMode,
        namaBulanTerpilih,
        selectedTahun,
      };

      if (format === "pdf") {
        await exportPdf(activeTab, datasets, periodeInfo);
      } else {
        await exportSpreadsheet(format, activeTab, datasets, periodeInfo);
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
    <div className="py-6 sm:py-6 px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-3">
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
        onOpenSudin={() => setIsSudinModalOpen(true)}
        isPiket={isPiket}
        isAdmin={isAdmin}
        backTarget={backTarget}
      />

      {/* 2. KPI Metric Summary Cards */}
      <DashboardKpiCards stats={stats} isPiket={isPiket} />

      {/* 3 Kategori Utama Pengelompokan Dashboard */}
      <div className="bg-slate-100/90 p-1 sm:p-1.5 rounded-2xl grid grid-cols-3 gap-1 border border-slate-200 shadow-2xs">
        {/* Kategori 1: Presensi & Kehadiran */}
        <button
          type="button"
          onClick={() => handleSelectCategory("kehadiran")}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
            activeCategory === "kehadiran"
              ? "bg-white text-blue-700 shadow-xs border-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60 border-transparent"
          }`}
        >
          <BarChart3 className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="hidden sm:inline">Presensi & Kehadiran</span>
          <span className="sm:hidden">Presensi</span>
        </button>

        {/* Kategori 2: Perizinan Siswa */}
        <button
          type="button"
          onClick={() => handleSelectCategory("perizinan")}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
            activeCategory === "perizinan"
              ? "bg-white text-indigo-700 shadow-xs border-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60 border-transparent"
          }`}
        >
          <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="hidden sm:inline">Perizinan Siswa</span>
          <span className="sm:hidden">Perizinan</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white shadow-xs">
              {pendingCount}
            </span>
          )}
        </button>

        {/* Kategori 3: Tata Tertib & Staf */}
        <button
          type="button"
          onClick={() => handleSelectCategory("manajemen")}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
            activeCategory === "manajemen"
              ? "bg-white text-purple-700 shadow-xs border-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/60 border-transparent"
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="hidden sm:inline">Tata Tertib & Staf</span>
          <span className="sm:hidden">Tata Tertib</span>
        </button>
      </div>

      {/* 4. Main Content Card */}
      <div id="dashboard-table-top" className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Sub-Tab Navigation Bar */}
        <div className="border-b border-slate-200 px-3 sm:px-6 py-2.5 bg-slate-50/70 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
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
                    <UsersRound className="w-4 h-4" />
                    <span>Kelola Guru Piket</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tab 6: Buku Catatan Pelanggaran */}
        {activeTab === "pelanggaran_siswa" && (
          <div className="p-3 sm:p-5 md:p-6 min-h-[500px]">
            <BukuPelanggaranTab
              selectedBulan={selectedBulan}
              selectedTahun={selectedTahun}
              periodeMode={periodeMode}
              namaBulanTerpilih={namaBulanTerpilih}
            />
          </div>
        )}

        {/* Tab 7: Manajemen Guru Piket (Khusus Admin) */}
        {isAdmin && activeTab === "manajemen_piket" && (
          <div className="p-3 sm:p-5 md:p-6 min-h-[500px]">
            <ManajemenPiketTab />
          </div>
        )}

        {/* Tab 1 - 5: Presensi & Perizinan */}
        <div
          className={
            !["pelanggaran_siswa", "manajemen_piket"].includes(activeTab)
              ? "min-h-[500px] flex flex-col"
              : "hidden"
          }
        >
          {/* Filter & Search Bar */}
          <div className="p-3 sm:p-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama, NIS, alasan, atau kelas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div
              className={`grid ${
                activeTab === "verifikasi_izin" ? "grid-cols-2" : "grid-cols-1"
              } sm:flex sm:items-center gap-2 w-full sm:w-auto`}
            >
              {activeTab === "verifikasi_izin" && (
                <CustomDropdown
                  value={statusIzinFilter}
                  onChange={setStatusIzinFilter}
                  options={[
                    { value: "ALL", label: "Semua Status" },
                    { value: "Menunggu", label: "Menunggu" },
                    { value: "Disetujui", label: "Disetujui" },
                    { value: "Ditolak", label: "Ditolak" },
                  ]}
                  icon={<Filter className="w-3.5 h-3.5 text-slate-400" />}
                  className="w-full sm:w-auto sm:min-w-[130px]"
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
                className="w-full sm:w-auto sm:min-w-[120px]"
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

          <div className="flex-1 flex flex-col">
            {loading ? (
              <div className="min-h-[400px] overflow-hidden">
                <SkeletonTable rows={7} cols={6} />
              </div>
            ) : (
              <>
                {/* Tab 1: Rekap Akumulasi Siswa */}
                {activeTab === "rekap_siswa" && (
                  <RekapSiswaTab
                    filteredSiswa={filteredSiswa}
                    paginatedSiswa={paginatedSiswa}
                    startIndex={startIndex}
                    endIndex={endIndex}
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
                    startIndex={startIndex}
                    endIndex={endIndex}
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
                    startIndex={startIndex}
                    endIndex={endIndex}
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
                    startIndex={startIndex}
                    endIndex={endIndex}
                  />
                )}

                {/* Tab 5: Izin Meja Piket */}
                {activeTab === "izin_piket" && (
                  <IzinPiketTab
                    filteredIzinPiket={filteredIzinPiket}
                    paginatedIzinPiket={paginatedIzinPiket}
                    onOpenSlipModal={(item) => setSelectedSlipModal(item)}
                    onDeleteIzin={isAdmin ? handleDeleteIzinPiket : undefined}
                    startIndex={startIndex}
                    endIndex={endIndex}
                  />
                )}
              </>
            )}
          </div>

          {/* Footer Navigasi Halaman Bawah */}
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
            variant="footer"
            scrollTargetId="dashboard-table-top"
          />
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

      {/* Modal Konfirmasi Hapus Izin Piket */}
      <ConfirmSheet
        isOpen={!!deletingIzin}
        onClose={() => setDeletingIzin(null)}
        onConfirm={executeDeleteIzinPiket}
        loading={deleteLoading}
        title="Hapus Surat Izin Piket?"
        subtitle="Tindakan ini tidak dapat dibatalkan"
        confirmLabel="Ya, Hapus Surat"
        cancelLabel="Batal"
        danger
      >
        <p>
          Apakah Anda yakin ingin menghapus surat izin untuk{" "}
          <strong className="text-slate-900">{deletingIzin?.nama}</strong>? Catatan
          surat izin ini akan dihapus secara permanen dari server.
        </p>
      </ConfirmSheet>

      {/* Modal Tanda Tangan Guru Piket */}
      <SignaturePadModal
        isOpen={showSigModal}
        onClose={() => setShowSigModal(false)}
        onSave={handleSaveSignature}
        initialSignature={user?.tanda_tangan}
        title="Tanda Tangan Digital Guru Piket"
        signerName={user?.nama || "Guru Piket"}
      />

      {/* Modal Ekspor Laporan Bulanan Format Sudin */}
      <ModalExportLaporanSudin
        isOpen={isSudinModalOpen}
        onClose={() => setIsSudinModalOpen(false)}
      />

      {/* Floating Bottom-Right Toast Notification */}
      {notification && (
        <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-6 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] sm:w-auto animate-in slide-in-from-bottom-5 fade-in duration-200 pointer-events-auto">
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
