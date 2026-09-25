import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  Download,
  UserPlus,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Calendar,
  ClipboardCheck,
} from "lucide-react";
import CustomDropdown from "../CustomDropdown";

export default function DashboardPeriodFilter({
  periodeMode,
  setPeriodeMode,
  selectedBulan,
  setSelectedBulan,
  selectedTahun,
  setSelectedTahun,
  bulanDropdownOptions,
  tahunDropdownOptions,
  namaBulanTerpilih,
  loading,
  onRefresh,
  onExport,
  isPiket = false,
  isAdmin = false,
  backTarget,
}) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportDropdownRef = useRef(null);

  // Tutup dropdown ekspor saat klik di luar
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

  const handleExportClick = (format) => {
    setIsExportOpen(false);
    onExport(format);
  };

  return (
    <>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={backTarget || (isPiket ? "/portal-piket" : "/portal-admin")}
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs text-slate-600 flex-shrink-0"
            title="Kembali ke Beranda Portal"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
              {isPiket
                ? "Dashboard & Rekapitulasi Piket"
                : "Rekapitulasi Presensi Siswa"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-snug">
              {isPiket
                ? "Laporan presensi harian, verifikasi izin, dan catatan kedisiplinan siswa SMKN 21"
                : "Laporan akumulasi kehadiran, perpustakaan, dan ketertiban siswa SMKN 21"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          {isPiket ? (
            <Link
              to="/piket"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-all shadow-2xs flex-1 sm:flex-none whitespace-nowrap"
            >
              <ClipboardCheck className="w-4 h-4 flex-shrink-0" />
              <span>Meja Piket</span>
            </Link>
          ) : (
            <Link
              to="/registrasi"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-all shadow-2xs flex-1 sm:flex-none whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4 flex-shrink-0" />
              <span>Data Siswa</span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => onRefresh && onRefresh(true)}
            disabled={loading}
            className="inline-flex items-center justify-center cursor-pointer gap-1.5 sm:gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-2xs disabled:opacity-50 flex-shrink-0"
            title="Segarkan data rekapitulasi"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`}
            />
            <span className="hidden sm:inline">
              {loading ? "Menyegarkan..." : "Refresh"}
            </span>
          </button>

          {/* Dropdown Menu Unduh Rekap (XLSX, XLS, CSV) */}
          <div className="relative flex-1 sm:flex-none" ref={exportDropdownRef}>
            <button
              type="button"
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 cursor-pointer sm:px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xs whitespace-nowrap"
            >
              <Download className="w-4 h-4 flex-shrink-0" />
              <span>Unduh Rekap</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  isExportOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/70 -mt-2 mb-1 rounded-t-2xl">
                  <p className="text-[11px] text-slate-700 font-semibold truncate mt-0.5">
                    Periode{" "}
                    <span className="text-blue-600">
                      {periodeMode === "bulan"
                        ? `${namaBulanTerpilih} ${selectedTahun}`
                        : `Tahun ${selectedTahun} `}
                    </span>
                  </p>
                </div>

                {/* 1. Format Dokumen PDF Resmi (.pdf) */}
                <button
                  type="button"
                  onClick={() => handleExportClick("pdf")}
                  className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-rose-50 hover:text-rose-900 flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs group-hover:bg-rose-600 group-hover:text-white transition-colors flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 group-hover:text-rose-800 flex items-center gap-1.5">
                      <span>Dokumen PDF </span>
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded">
                        .pdf
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      Lengkap dengan KOP SMKN 21
                    </p>
                  </div>
                </button>

                {/* 2. Format Excel Modern (.xlsx) */}
                <button
                  type="button"
                  onClick={() => handleExportClick("xlsx")}
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
                  onClick={() => handleExportClick("xls")}
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
                  onClick={() => handleExportClick("csv")}
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 sm:p-5 mb-6 sm:mb-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        {/* Toggle Mode: Per Bulan vs Per Tahun */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 w-full sm:w-auto">
            <button
              onClick={() => setPeriodeMode("bulan")}
              className={`flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors duration-150 cursor-pointer text-center ${
                periodeMode === "bulan"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Bulan
            </button>
            <button
              onClick={() => setPeriodeMode("tahun")}
              className={`flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors duration-150 cursor-pointer text-center ${
                periodeMode === "tahun"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tahun
            </button>
          </div>
        </div>

        {/* Dropdown Pemilih Bulan & Tahun */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          {periodeMode === "bulan" && (
            <CustomDropdown
              value={selectedBulan}
              onChange={(val) => setSelectedBulan(Number(val))}
              options={bulanDropdownOptions}
              icon={<Calendar className="w-3.5 h-3.5 text-blue-600" />}
              className="w-full sm:w-auto sm:flex-none min-w-[130px]"
            />
          )}

          <CustomDropdown
            value={selectedTahun}
            onChange={(val) => setSelectedTahun(Number(val))}
            options={tahunDropdownOptions}
            icon={<Calendar className="w-3.5 h-3.5 text-slate-500" />}
            className="w-full sm:w-auto sm:flex-none min-w-[120px]"
          />
        </div>
      </div>
    </>
  );
}
