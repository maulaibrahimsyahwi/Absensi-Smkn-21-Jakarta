import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Users,
  CheckCircle2,
  Clock,
  BookOpen,
  Search,
  Filter,
  FileText,
  ClipboardCheck,
} from "lucide-react";
import CustomDropdown from "../components/CustomDropdown";
import { getJurusanInfo } from "../constants/schoolData";
import { exportSpreadsheet } from "../utils/exportUtils";

// Modular Subcomponents
import DashboardPeriodFilter from "../components/dashboard/DashboardPeriodFilter";
import DashboardKpiCards from "../components/dashboard/DashboardKpiCards";
import DashboardPagination from "../components/dashboard/DashboardPagination";
import RekapSiswaTab from "../components/dashboard/tabs/RekapSiswaTab";
import PresensiHarianTab from "../components/dashboard/tabs/PresensiHarianTab";
import PerpustakaanTab from "../components/dashboard/tabs/PerpustakaanTab";
import VerifikasiIzinTab from "../components/dashboard/tabs/VerifikasiIzinTab";
import IzinPiketTab from "../components/dashboard/tabs/IzinPiketTab";
import SuratLightboxModal from "../components/dashboard/modals/SuratLightboxModal";
import RejectIzinModal from "../components/dashboard/modals/RejectIzinModal";
import SlipIzinPiketModal from "../components/piket/SlipIzinPiketModal";

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
  label: `Bulan ${b.label}`,
}));

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export default function Dashboard() {
  const currentNow = new Date();
  const [periodeMode, setPeriodeMode] = useState("bulan"); // "bulan" atau "tahun"
  const [selectedBulan, setSelectedBulan] = useState(currentNow.getMonth() + 1);
  const [selectedTahun, setSelectedTahun] = useState(currentNow.getFullYear());
  const [availableYears, setAvailableYears] = useState(DEFAULT_YEARS);

  // Ambil daftar tahun dinamis dari database
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/rekap/available_years")
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
      label: `Tahun ${t}`,
    }));
  }, [availableYears]);

  const [activeTab, setActiveTab] = useState("rekap_siswa"); // "rekap_siswa", "riwayat_harian", "riwayat_perpus", "verifikasi_izin"
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

  // Reset pagination saat ganti filter/tab
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, kelasFilter, statusIzinFilter, displayLimit]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resPeriode, resHarian, resPerpus, resPengajuan, resPiket] =
        await Promise.all([
          axios.get("http://localhost:5000/api/rekap", {
            params: {
              mode: periodeMode,
              bulan: selectedBulan,
              tahun: selectedTahun,
            },
          }),
          axios.get("http://localhost:5000/api/absensi_harian", {
            params: {
              mode: periodeMode,
              bulan: selectedBulan,
              tahun: selectedTahun,
            },
          }),
          axios.get("http://localhost:5000/api/absensi_perpus", {
            params: {
              mode: periodeMode,
              bulan: selectedBulan,
              tahun: selectedTahun,
            },
          }),
          axios.get("http://localhost:5000/api/pengajuan_izin"),
          axios.get("http://localhost:5000/api/piket/izin", {
            params: {
              tanggal: "ALL",
            },
          }),
        ]);

      setSiswaPeriode(resPeriode.data || { statistik: {}, daftar: [] });
      setRiwayatHarian(resHarian.data || []);
      setRiwayatPerpus(resPerpus.data || []);
      setPengajuanList(resPengajuan.data || []);
      setIzinPiketList(resPiket.data || []);
    } catch (err) {
      console.error("Gagal mengambil data rekap:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIzinPiket = async (id, nama) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus surat izin untuk ${nama}?`)) return;
    try {
      await axios.delete(`http://localhost:5000/api/piket/izin/${id}`);
      fetchData();
    } catch (err) {
      alert("Gagal menghapus surat izin piket.");
    }
  };

  const handleVerifikasi = async (id, aksi, catatan = "") => {
    setVerifyingId(id);
    try {
      const res = await axios.post(
        `http://localhost:5000/api/pengajuan_izin/${id}/verifikasi`,
        {
          aksi,
          catatan,
        },
      );
      if (res.data && res.data.success) {
        await fetchData();
        setRejectModalItem(null);
        setRejectNote("");
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

  // Ekspor Data Laporan (Excel .xlsx, Excel .xls, CSV .csv) Sesuai Periode Aktif
  const handleExport = (format = "xlsx") => {
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
  };

  const stats = siswaPeriode.statistik || {};

  return (
    <div className="py-6 sm:py-8 px-3.5 sm:px-6 lg:px-8 max-w-6xl mx-auto">
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

      {/* 3. Main Content Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        {/* Tab Switchers */}
        <div className="border-b border-slate-200 px-3 sm:px-6 pt-2 sm:pt-4 flex items-center gap-2 sm:gap-6 bg-slate-50/60 overflow-x-auto rounded-t-2xl whitespace-nowrap no-scrollbar">
          {/* Tab 1: Rekap Akumulasi Siswa */}
          <button
            onClick={() => {
              setActiveTab("rekap_siswa");
              setSearchTerm("");
            }}
            className={`pb-3 sm:pb-4 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "rekap_siswa"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-4 h-4 flex-shrink-0" />
            <span>
              <span className="sm:hidden">Rekap Siswa</span>
              <span className="hidden sm:inline">Rekap Kehadiran Siswa</span>
            </span>
            <span
              className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "rekap_siswa"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-200/70 text-slate-600"
              }`}
            >
              {filteredSiswa.length}
            </span>
          </button>

          {/* Tab 2: Log Presensi Harian */}
          <button
            onClick={() => {
              setActiveTab("riwayat_harian");
              setSearchTerm("");
            }}
            className={`pb-3 sm:pb-4 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "riwayat_harian"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>
              <span className="sm:hidden">Log Harian</span>
              <span className="hidden sm:inline">Log Presensi Harian</span>
            </span>
            <span
              className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "riwayat_harian"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-200/70 text-slate-600"
              }`}
            >
              {riwayatHarian.length}
            </span>
          </button>

          {/* Tab 3: Log Kunjungan Perpustakaan */}
          <button
            onClick={() => {
              setActiveTab("riwayat_perpus");
              setSearchTerm("");
            }}
            className={`pb-3 sm:pb-4 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "riwayat_perpus"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4 flex-shrink-0" />
            <span>
              <span className="sm:hidden">Perpustakaan</span>
              <span className="hidden sm:inline">
                Log Kunjungan Perpustakaan
              </span>
            </span>
            <span
              className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "riwayat_perpus"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200/70 text-slate-600"
              }`}
            >
              {riwayatPerpus.length}
            </span>
          </button>

          {/* Tab 4: Verifikasi Izin & Sakit */}
          <button
            onClick={() => {
              setActiveTab("verifikasi_izin");
              setSearchTerm("");
            }}
            className={`pb-3 sm:pb-4 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "verifikasi_izin"
                ? "border-rose-600 text-rose-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span>
              <span className="sm:hidden">Izin & Sakit</span>
              <span className="hidden sm:inline">Verifikasi Izin & Sakit</span>
            </span>
            {pendingCount > 0 ? (
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                {pendingCount} Baru
              </span>
            ) : (
              <span
                className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "verifikasi_izin"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-slate-200/70 text-slate-600"
                }`}
              >
                {pengajuanList.length}
              </span>
            )}
          </button>

          {/* Tab 5: Izin Meja Piket */}
          <button
            onClick={() => {
              setActiveTab("izin_piket");
              setSearchTerm("");
            }}
            className={`pb-3 sm:pb-4 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "izin_piket"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <ClipboardCheck className="w-4 h-4 flex-shrink-0" />
            <span>
              <span className="sm:hidden">Meja Piket</span>
              <span className="hidden sm:inline">Izin Meja Piket</span>
            </span>
            <span
              className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "izin_piket"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-slate-200/70 text-slate-600"
              }`}
            >
              {filteredIzinPiket.length}
            </span>
          </button>
        </div>

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
    </div>
  );
}
