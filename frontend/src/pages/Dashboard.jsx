import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Download,
  Users,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Clock,
  Calendar,
  Filter,
  UserCheck,
  UserPlus,
  Inbox,
  Sparkles,
  BarChart2,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileSpreadsheet,
} from "lucide-react";
import CustomDropdown from "../components/CustomDropdown";
import { getJurusanInfo } from "./RegistrasiSiswa";

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

// Fallback tahun (tahun saat ini dan 4 tahun ke belakang)
const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export default function Dashboard() {
  const currentNow = new Date();
  const [periodeMode, setPeriodeMode] = useState("bulan"); // "bulan" atau "tahun"
  const [selectedBulan, setSelectedBulan] = useState(currentNow.getMonth() + 1);
  const [selectedTahun, setSelectedTahun] = useState(currentNow.getFullYear());

  // Opsi 1: Daftar tahun dinamis dari database (otomatis memuat seluruh tahun yang ada datanya)
  const [availableYears, setAvailableYears] = useState(DEFAULT_YEARS);

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

  const [activeTab, setActiveTab] = useState("rekap_siswa"); // "rekap_siswa", "riwayat_harian", "riwayat_perpus"
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [kelasFilter, setKelasFilter] = useState("ALL");

  // Batas Tampilan Data & Paginasi (slider: 25, 50, 100, max 150)
  const [displayLimit, setDisplayLimit] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Dropdown menu ekspor (XLSX, XLS, CSV)
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(e.target)
      ) {
        setIsExportOpen(false);
      }
    }
    if (isExportOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isExportOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, kelasFilter, displayLimit]);

  // Data State
  const [siswaPeriode, setSiswaPeriode] = useState({
    statistik: {
      total_siswa: 0,
      total_presensi_harian: 0,
      total_tepat_waktu: 0,
      total_terlambat: 0,
      total_perpus: 0,
    },
    daftar: [],
  });
  const [riwayatHarian, setRiwayatHarian] = useState([]);
  const [riwayatPerpus, setRiwayatPerpus] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const bulanParam = periodeMode === "bulan" ? selectedBulan : "ALL";
      const [resPeriode, resHarian, resPerpus] = await Promise.all([
        axios.get("http://localhost:5000/api/rekap/siswa_periode", {
          params: {
            mode: periodeMode,
            bulan: selectedBulan,
            tahun: selectedTahun,
          },
        }),
        axios.get("http://localhost:5000/api/rekap/harian", {
          params: {
            bulan: bulanParam,
            tahun: selectedTahun,
          },
        }),
        axios.get("http://localhost:5000/api/rekap/perpus", {
          params: {
            bulan: bulanParam,
            tahun: selectedTahun,
          },
        }),
      ]);

      setSiswaPeriode(resPeriode.data || { statistik: {}, daftar: [] });
      setRiwayatHarian(resHarian.data || []);
      setRiwayatPerpus(resPerpus.data || []);
    } catch (err) {
      console.error("Gagal mengambil data rekap:", err);
    } finally {
      setLoading(false);
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
    return filteredPerpus;
  }, [activeTab, filteredSiswa, filteredHarian, filteredPerpus]);

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

  // Ekspor Data Laporan (Excel .xlsx, Excel .xls, CSV .csv) Sesuai Periode Aktif
  const handleExport = (format = "xlsx") => {
    let headers = [];
    let rows = [];
    const periodeTag =
      periodeMode === "bulan"
        ? `${namaBulanTerpilih}_${selectedTahun}`
        : `Tahun_${selectedTahun}`;
    let filename = "";
    let sheetName = "Rekap Data";

    if (activeTab === "rekap_siswa") {
      sheetName = "Rekap Siswa";
      filename = `rekap_kehadiran_${periodeTag}`;
      headers = [
        "No",
        "NIS",
        "Nama Siswa",
        "Kelas",
        "Tepat Waktu",
        "Terlambat",
        "Total Hadir",
        "Kunjungan Perpus",
        "Status Aktivitas",
      ];
      rows = filteredSiswa.map((item, index) => [
        index + 1,
        item.nis,
        item.nama,
        item.kelas,
        item.tepat_waktu,
        item.terlambat,
        item.total_hadir,
        item.kunjungan_perpus,
        item.total_hadir > 0 ? "Aktif Presensi" : "Nir-Kehadiran",
      ]);
    } else if (activeTab === "riwayat_harian") {
      sheetName = "Presensi Harian";
      filename = `riwayat_presensi_harian_${periodeTag}`;
      headers = [
        "No",
        "Waktu Presensi",
        "Nama Siswa",
        "Kelas",
        "Status Kehadiran",
      ];
      rows = filteredHarian.map((item, index) => [
        index + 1,
        item.waktu,
        item.nama,
        item.kelas,
        item.status,
      ]);
    } else {
      sheetName = "Kunjungan Perpus";
      filename = `riwayat_perpustakaan_${periodeTag}`;
      headers = [
        "No",
        "Waktu Kunjungan",
        "Nama Siswa",
        "Kelas",
        "Keperluan Kunjungan",
      ];
      rows = filteredPerpus.map((item, index) => [
        index + 1,
        item.waktu,
        item.nama,
        item.kelas,
        item.keperluan,
      ]);
    }

    try {
      const worksheetData = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Auto-width kolom agar tampilan di Microsoft Excel rapi
      const colWidths = headers.map((h, colIdx) => {
        const maxLen = Math.max(
          h.length,
          ...rows.map((r) => String(r[colIdx] ?? "").length),
        );
        return { wch: Math.min(Math.max(maxLen + 3, 10), 40) };
      });
      worksheet["!cols"] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      const bookType = format === "xls" ? "biff8" : format;
      XLSX.writeFile(workbook, `${filename}.${format}`, { bookType });
    } catch (err) {
      console.error("Gagal mengekspor data:", err);
    } finally {
      setIsExportOpen(false);
    }
  };

  const stats = siswaPeriode.statistik || {};

  return (
    <div className="py-6 sm:py-8 px-3.5 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs text-slate-600 flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Rekapitulasi Presensi & Perpustakaan
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Laporan akumulasi kehadiran siswa berdasarkan bulan dan tahun
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 self-start sm:self-auto flex-wrap">
          <Link
            to="/registrasi"
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-all shadow-2xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Database Siswa</span>
          </Link>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center cursor-pointer gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-2xs disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {/* Dropdown Menu Unduh Rekap (XLSX, XLS, CSV) */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              type="button"
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 cursor-pointer sm:px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Rekap</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  isExportOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/70 -mt-2 mb-1 rounded-t-2xl">
                  <p className="text-[11px] text-slate-700 font-semibold truncate mt-0.5">
                    Periode:{" "}
                    <span className="text-blue-600">
                      {periodeMode === "bulan"
                        ? `${namaBulanTerpilih} ${selectedTahun}`
                        : `Tahun ${selectedTahun} `}
                    </span>
                  </p>
                </div>

                {/* 1. Format Excel Modern (.xlsx) */}
                <button
                  type="button"
                  onClick={() => handleExport("xlsx")}
                  className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs group-hover:bg-emerald-600 group-hover:text-white transition-colors flex-shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 group-hover:text-emerald-800 flex items-center gap-1.5">
                      <span>Microsoft Excel</span>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                        .xlsx
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      Format spreadsheet standar modern
                    </p>
                  </div>
                </button>

                {/* 2. Format Excel Legacy (.xls) */}
                <button
                  type="button"
                  onClick={() => handleExport("xls")}
                  className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold text-xs group-hover:bg-emerald-600 group-hover:text-white transition-colors flex-shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 group-hover:text-emerald-800 flex items-center gap-1.5">
                      <span>Excel 97–2003</span>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">
                        .xls
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      Kompatibel dengan aplikasi versi lama
                    </p>
                  </div>
                </button>

                {/* 3. Format CSV (.csv) */}
                <button
                  type="button"
                  onClick={() => handleExport("csv")}
                  className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-900 flex items-center gap-3 transition-colors cursor-pointer group border-t border-slate-100"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors flex-shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 group-hover:text-blue-800 flex items-center gap-1.5">
                      <span>Format CSV</span>
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                        .csv
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      Teks terpisah koma, ringan & portabel
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FILTER PERIODE WAKTU (PER BULAN & PER TAHUN) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 mb-6 sm:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Toggle Mode: Per Bulan vs Per Tahun */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setPeriodeMode("bulan")}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodeMode === "bulan"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Per Bulan
            </button>
            <button
              onClick={() => setPeriodeMode("tahun")}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodeMode === "tahun"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Per Tahun
            </button>
          </div>
        </div>

        {/* Dropdown Pemilih Bulan & Tahun */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {periodeMode === "bulan" && (
            <CustomDropdown
              value={selectedBulan}
              onChange={(val) => setSelectedBulan(Number(val))}
              options={BULAN_DROPDOWN_OPTIONS}
              icon={<Calendar className="w-3.5 h-3.5 text-blue-600" />}
              className="flex-1 sm:flex-none min-w-[130px]"
            />
          )}

          <CustomDropdown
            value={selectedTahun}
            onChange={(val) => setSelectedTahun(Number(val))}
            options={tahunDropdownOptions}
            icon={<Calendar className="w-3.5 h-3.5 text-slate-500" />}
            className="flex-1 sm:flex-none min-w-[120px]"
          />
        </div>
      </div>

      {/* KPI METRIC SUMMARY CARDS (Sesuai Bulan / Tahun Terpilih) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {/* Total Siswa Terdaftar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Siswa Terdaftar
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {stats.total_siswa || 0}
          </div>
        </div>

        {/* Hadir Tepat Waktu */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Tepat Waktu
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
            {stats.total_tepat_waktu || 0}
          </div>
        </div>

        {/* Terlambat */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Terlambat
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600">
            {stats.total_terlambat || 0}
          </div>
        </div>

        {/* Kunjungan Perpustakaan */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Kunjungan Perpustakaan
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600">
            {stats.total_perpus || 0}
          </div>
        </div>
      </div>

      {/* Main Content Card */}
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
            <BarChart2 className="w-4 h-4 flex-shrink-0" />
            <span>
              <span className="sm:hidden">Rekap Siswa</span>
              <span className="hidden sm:inline">
                Rekap Kehadiran (
                {periodeMode === "bulan"
                  ? `${namaBulanTerpilih} ${selectedTahun}`
                  : `Tahun ${selectedTahun}`}
                )
              </span>
            </span>
            <span
              className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "rekap_siswa"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-200/70 text-slate-600"
              }`}
            >
              {siswaPeriode.daftar?.length || 0}
            </span>
          </button>

          {/* Tab 2: Detail Riwayat Harian */}
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
              <span className="sm:hidden">Presensi Harian</span>
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

          {/* Tab 3: Detail Riwayat Perpustakaan */}
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
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3.5 sm:p-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama, NIS, atau kelas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="w-full sm:w-auto">
            {/* Filter Kelas */}
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

        {/* Bar Kontrol Slider Limit Tampilan & Navigasi Halaman */}
        <div className="px-3.5 sm:px-6 py-3 bg-slate-50/80 border-b border-slate-200/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
          {/* Kontrol Slider */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="font-semibold text-slate-700">
                Batas Tampilan
              </span>
            </div>

            {/* Preset Buttons */}
            <div className="flex items-center gap-1">
              {[10, 15, 25, 50].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDisplayLimit(preset)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                    displayLimit === preset
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Info Range & Pagination Controls */}
          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200/60">
            <span className="text-slate-500 font-medium text-[11px] sm:text-xs">
              {totalItems === 0 ? (
                "0 data"
              ) : (
                <>
                  Menampilkan{" "}
                  <strong className="text-slate-800 font-bold">
                    {startIndex + 1}–{endIndex}
                  </strong>{" "}
                  dari{" "}
                  <strong className="text-slate-800 font-bold">
                    {totalItems}
                  </strong>{" "}
                  data
                </>
              )}
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 sm:px-2 sm:py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center gap-1 transition-all cursor-pointer"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-2 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg">
                  {safeCurrentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  className="p-1 sm:px-2 sm:py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center gap-1 transition-all cursor-pointer"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* TAB 1: REKAP AKUMULASI SISWA PER BULAN / PER TAHUN */}
        {activeTab === "rekap_siswa" && (
          <div>
            {/* 1. Mobile Cards View (< md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredSiswa.length === 0 ? (
                <div className="py-12 text-center text-slate-400 p-4">
                  <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2 stroke-1" />
                  <p className="font-semibold text-slate-600 text-sm">
                    Tidak Ada Data Siswa
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Belum ada siswa terdaftar atau tidak cocok dengan filter
                    pencarian.
                  </p>
                </div>
              ) : (
                paginatedSiswa.map((item) => {
                  const isAktif = item.total_hadir > 0;
                  const jurInfo = getJurusanInfo(item.kelas);
                  return (
                    <div
                      key={item.siswa_id}
                      className="p-4 hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Header Kartu: Nama & Status */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">
                            {item.nama}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[11px] text-slate-400 font-mono">
                              NIS: {item.nis}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[11px] font-bold text-slate-700">
                              {item.kelas}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${jurInfo.badge}`}
                            >
                              {jurInfo.kode}
                            </span>
                          </div>
                        </div>

                        {isAktif ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex-shrink-0">
                            Aktif
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 flex-shrink-0">
                            Nir-Hadir
                          </span>
                        )}
                      </div>

                      {/* 4 Kotak Metrik Akumulasi Kehadiran */}
                      <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100 text-center">
                        <div className="bg-emerald-50/70 border border-emerald-100/80 rounded-xl p-1.5">
                          <span className="text-[10px] text-emerald-700 font-medium block">
                            Tepat
                          </span>
                          <span className="text-xs font-black text-emerald-800">
                            {item.tepat_waktu}x
                          </span>
                        </div>
                        <div className="bg-amber-50/70 border border-amber-100/80 rounded-xl p-1.5">
                          <span className="text-[10px] text-amber-700 font-medium block">
                            Telat
                          </span>
                          <span className="text-xs font-black text-amber-800">
                            {item.terlambat}x
                          </span>
                        </div>
                        <div className="bg-blue-50/70 border border-blue-100/80 rounded-xl p-1.5">
                          <span className="text-[10px] text-blue-700 font-medium block">
                            Total Hadir
                          </span>
                          <span className="text-xs font-black text-blue-800">
                            {item.total_hadir} Hari
                          </span>
                        </div>
                        <div className="bg-indigo-50/70 border border-indigo-100/80 rounded-xl p-1.5">
                          <span className="text-[10px] text-indigo-700 font-medium block">
                            Perpus
                          </span>
                          <span className="text-xs font-black text-indigo-800">
                            {item.kunjungan_perpus}x
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 2. Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-6">Siswa</th>
                    <th className="py-3.5 px-6">Kelas</th>
                    <th className="py-3.5 px-6 text-center">Tepat Waktu</th>
                    <th className="py-3.5 px-6 text-center">Terlambat</th>
                    <th className="py-3.5 px-6 text-center">Total Hadir</th>
                    <th className="py-3.5 px-6 text-center">
                      Kunjungan Perpus
                    </th>
                    <th className="py-3.5 px-6 text-right">Status Aktivitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSiswa.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="py-12 text-center text-slate-400"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <Inbox className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
                          <p className="font-semibold text-slate-600 text-sm">
                            Tidak Ada Data Siswa
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Belum ada siswa terdaftar atau tidak cocok dengan
                            filter pencarian.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedSiswa.map((item) => {
                      const isAktif = item.total_hadir > 0;
                      const jurInfo = getJurusanInfo(item.kelas);
                      return (
                        <tr
                          key={item.siswa_id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-3.5 px-6">
                            <div>
                              <p className="font-bold text-slate-900">
                                {item.nama}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono">
                                NIS: {item.nis}
                              </p>
                            </div>
                          </td>
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-800 text-xs">
                                {item.kelas}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            <span className="font-extrabold text-emerald-700 text-sm">
                              {item.tepat_waktu}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            <span className="font-extrabold text-amber-700 text-sm">
                              {item.terlambat}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            <span className="font-extrabold text-slate-900 text-sm">
                              {item.total_hadir} Hari
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            <span className="font-extrabold text-indigo-900 text-sm">
                              <span>{item.kunjungan_perpus}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            {isAktif ? (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                Aktif Presensi
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                                Nir-Kehadiran
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: LOG DETAIL PRESENSI HARIAN */}
        {activeTab === "riwayat_harian" && (
          <div>
            {/* 1. Mobile Cards View (< md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredHarian.length === 0 ? (
                <div className="py-12 text-center text-slate-400 p-4">
                  <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2 stroke-1" />
                  <p className="font-semibold text-slate-600 text-sm">
                    Tidak Ada Data Presensi Harian
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pada periode{" "}
                    {periodeMode === "bulan"
                      ? `${namaBulanTerpilih} ${selectedTahun}`
                      : `Tahun ${selectedTahun}`}
                    .
                  </p>
                </div>
              ) : (
                paginatedHarian.map((item, index) => {
                  const jurInfo = getJurusanInfo(item.kelas);
                  const isTepat = item.status === "Tepat Waktu";
                  return (
                    <div
                      key={item.id || index}
                      className="p-4 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">
                            {item.nama}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-700">
                              {item.kelas}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${jurInfo.badge}`}
                            >
                              {jurInfo.kode}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex-shrink-0 ${
                            isTepat
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {isTepat ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                          )}
                          <span>{item.status}</span>
                        </span>
                      </div>

                      <div className="flex items-center text-slate-400 text-xs gap-1.5 pt-1.5 border-t border-slate-100">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-600 font-medium">
                          {item.waktu}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 2. Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[580px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-6">Waktu Presensi</th>
                    <th className="py-3.5 px-6">Nama Siswa</th>
                    <th className="py-3.5 px-6">Kelas</th>
                    <th className="py-3.5 px-6">Status Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHarian.length === 0 ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="py-12 text-center text-slate-400"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <Inbox className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
                          <p className="font-semibold text-slate-600 text-sm">
                            Tidak Ada Data Presensi Harian
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Pada periode{" "}
                            {periodeMode === "bulan"
                              ? `${namaBulanTerpilih} ${selectedTahun}`
                              : `Tahun ${selectedTahun}`}
                            .
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedHarian.map((item, index) => {
                      const jurInfo = getJurusanInfo(item.kelas);
                      return (
                        <tr
                          key={item.id || index}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-4 px-6 text-slate-600 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{item.waktu}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 font-semibold text-slate-900">
                            {item.nama}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-800 text-xs">
                                {item.kelas}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                item.status === "Tepat Waktu"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: LOG DETAIL PERPUSTAKAAN */}
        {activeTab === "riwayat_perpus" && (
          <div>
            {/* 1. Mobile Cards View (< md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredPerpus.length === 0 ? (
                <div className="py-12 text-center text-slate-400 p-4">
                  <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2 stroke-1" />
                  <p className="font-semibold text-slate-600 text-sm">
                    Tidak Ada Data Kunjungan Perpustakaan
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pada periode{" "}
                    {periodeMode === "bulan"
                      ? `${namaBulanTerpilih} ${selectedTahun}`
                      : `Tahun ${selectedTahun}`}
                    .
                  </p>
                </div>
              ) : (
                paginatedPerpus.map((item, index) => {
                  const jurInfo = getJurusanInfo(item.kelas);
                  return (
                    <div
                      key={item.id || index}
                      className="p-4 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">
                            {item.nama}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-700">
                              {item.kelas}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${jurInfo.badge}`}
                            >
                              {jurInfo.kode}
                            </span>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex-shrink-0">
                          <BookOpen className="w-3 h-3 text-emerald-600" />
                          <span>{item.keperluan}</span>
                        </span>
                      </div>

                      <div className="flex items-center text-slate-400 text-xs gap-1.5 pt-1.5 border-t border-slate-100">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-600 font-medium">
                          {item.waktu}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 2. Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[580px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-6">Waktu Kunjungan</th>
                    <th className="py-3.5 px-6">Nama Siswa</th>
                    <th className="py-3.5 px-6">Kelas</th>
                    <th className="py-3.5 px-6">Keperluan Kunjungan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPerpus.length === 0 ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="py-12 text-center text-slate-400"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <Inbox className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
                          <p className="font-semibold text-slate-600 text-sm">
                            Tidak Ada Data Kunjungan Perpustakaan
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Pada periode{" "}
                            {periodeMode === "bulan"
                              ? `${namaBulanTerpilih} ${selectedTahun}`
                              : `Tahun ${selectedTahun}`}
                            .
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedPerpus.map((item, index) => {
                      const jurInfo = getJurusanInfo(item.kelas);
                      return (
                        <tr
                          key={item.id || index}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-4 px-6 text-slate-600 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{item.waktu}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 font-semibold text-slate-900">
                            {item.nama}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-800 text-xs">
                                {item.kelas}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="py-4 px-6 font-semibold text-slate-900">
                              <span>{item.keperluan}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Table Footer Info & Bottom Pagination */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <span>
            Menampilkan data periode{" "}
            <strong className="text-slate-800">
              {periodeMode === "bulan"
                ? `${namaBulanTerpilih} ${selectedTahun}`
                : `Tahun ${selectedTahun}`}
            </strong>
          </span>

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
  );
}
