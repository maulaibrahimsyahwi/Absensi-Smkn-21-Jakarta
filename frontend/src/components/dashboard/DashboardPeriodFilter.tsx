import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, UserPlus, ClipboardCheck } from "lucide-react";
import CustomDropdown, { DropdownOption } from "../CustomDropdown";
import ExportMenu, { EXPORT_FORMATS, ExportOption } from "../ui/ExportMenu";
import SegmentedControl, { SegmentedOption } from "../ui/SegmentedControl";

interface DashboardPeriodFilterProps {
  periodeMode: "bulan" | "tahun" | string;
  setPeriodeMode: (mode: "bulan" | "tahun") => void;
  selectedBulan: number;
  setSelectedBulan: (bulan: number) => void;
  selectedTahun: number;
  setSelectedTahun: (tahun: number) => void;
  bulanDropdownOptions: DropdownOption[];
  tahunDropdownOptions: DropdownOption[];
  namaBulanTerpilih: string;
  onExport: (format: "pdf" | "xlsx" | "xls" | "csv") => void;
  isPiket?: boolean;
  backTarget?: string;
  loading?: boolean;
  onRefresh?: () => void;
  isAdmin?: boolean;
}

const EXPORT_LIST: readonly ExportOption<"pdf" | "xlsx" | "xls" | "csv">[] = [
  EXPORT_FORMATS.pdf,
  EXPORT_FORMATS.xlsx,
  EXPORT_FORMATS.xls,
  EXPORT_FORMATS.csv,
];

const MODE_OPTIONS: SegmentedOption<"bulan" | "tahun">[] = [
  { value: "bulan", label: "Bulan" },
  { value: "tahun", label: "Tahun" },
];

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
  onExport,
  isPiket = false,
  backTarget,
}: DashboardPeriodFilterProps) {
  const currentMode = periodeMode === "tahun" ? "tahun" : "bulan";
  const periodText =
    currentMode === "bulan"
      ? `${namaBulanTerpilih} ${selectedTahun}`
      : `Tahun ${selectedTahun}`;

  return (
    <>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={backTarget || (isPiket ? "/portal-piket" : "/portal-admin")}
            className="grid h-11 w-11 place-items-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs text-slate-600 shrink-0"
            title="Kembali ke Beranda Portal"
            aria-label="Kembali ke Beranda Portal"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
              {isPiket ? "Rekapitulasi Piket" : "Rekapitulasi Presensi Siswa"}
            </h1>
            <p className="text-xs text-slate-500 leading-snug">
              {isPiket
                ? "Laporan presensi & kedisiplinan siswa SMKN 21"
                : "Laporan kehadiran, perpustakaan, & ketertiban siswa SMKN 21"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          {isPiket ? (
            <Link
              to="/piket"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-all shadow-2xs flex-1 sm:flex-none whitespace-nowrap"
            >
              <ClipboardCheck className="w-4 h-4 shrink-0" />
              <span>Meja Piket</span>
            </Link>
          ) : (
            ""
          )}

          {/* Export Menu */}
          <ExportMenu<"pdf" | "xlsx" | "xls" | "csv">
            title="Unduh Rekap Laporan"
            subtitle={`Periode: ${periodText}`}
            options={EXPORT_LIST}
            onSelect={onExport}
            className="flex-1 sm:flex-none"
          />
        </div>
      </div>

      {/* FILTER PERIODE WAKTU (PER BULAN & PER TAHUN) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 mb-4 sm:mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4">
        {/* Toggle Mode: Per Bulan vs Per Tahun */}
        <div className="w-full sm:w-auto">
          <SegmentedControl
            value={currentMode}
            onChange={(m) => setPeriodeMode(m)}
            options={MODE_OPTIONS}
            ariaLabel="Pilih mode periode waktu"
            className="w-full sm:w-44"
          />
        </div>

        {/* Dropdown Pemilih Bulan & Tahun */}
        <div
          className={`grid ${
            currentMode === "bulan" ? "grid-cols-2" : "grid-cols-1"
          } sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto`}
        >
          {currentMode === "bulan" && (
            <CustomDropdown
              value={selectedBulan}
              onChange={(val) => setSelectedBulan(Number(val))}
              options={bulanDropdownOptions}
              className="w-full sm:w-auto sm:flex-none sm:min-w-[130px]"
            />
          )}

          <CustomDropdown
            value={selectedTahun}
            onChange={(val) => setSelectedTahun(Number(val))}
            options={tahunDropdownOptions}
            className="w-full sm:w-auto sm:flex-none sm:min-w-[110px]"
          />
        </div>
      </div>
    </>
  );
}
