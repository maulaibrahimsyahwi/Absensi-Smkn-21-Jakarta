import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  Search,
  Filter,
  PlusCircle,
  Trash2,
  Eye,
  GraduationCap,
  X,
  Printer,
  FileText,
} from "lucide-react";
import api from "../../../services/api";
import { DAFTAR_KELAS_SMKN21 } from "../../../constants/schoolData";
import {
  getKategoriPelanggaran,
  getStatusPembinaan,
} from "../../../data/pelanggaranData";
import DashboardPagination from "../DashboardPagination";
import CustomDropdown from "../../CustomDropdown";
import CustomDatePicker from "../../CustomDatePicker";
import ToastNotification from "../../common/ToastNotification";
import { Skeleton } from "../../common/Skeleton";
import { useAuth } from "../../../context/AuthContext";
import { useRealtimeSubscription } from "../../../services/realtimeService";
import Sheet, { SheetHeader, SheetBody, SheetFooter } from "../../ui/Sheet";
import SegmentedControl from "../../ui/SegmentedControl";
import ExportMenu, { EXPORT_FORMATS, ExportOption } from "../../ui/ExportMenu";
import { KpiCard } from "../DashboardKpiCards";
import SortableTh from "../../ui/SortableTh";
import Button from "../../ui/Button";
import ModalCetakSuratPanggilan from "../../pelanggaran/ModalCetakSuratPanggilan";

export interface PelanggaranRecord {
  id: number;
  nis: string;
  nama_siswa: string;
  kelas: string;
  tanggal_waktu: string;
  tanggal_waktu_formatted?: string;
  jenis_pelanggaran: string;
  poin: number;
  kategori?: string;
  nama_penanggung_jawab?: string;
  tanda_tangan_siswa?: string;
  [key: string]: unknown;
}

export interface RekapSiswaPoin {
  nis: string;
  nama_siswa: string;
  kelas: string;
  total_poin: number;
  total_poin_pelanggaran?: number;
  total_pelanggaran?: number;
  total_poin_prestasi?: number;
  total_prestasi?: number;
  poin_bersih?: number;
  jumlah_pelanggaran?: number;
  [key: string]: unknown;
}

export interface RekapPelanggaranData {
  statistik?: {
    pelanggaran_hari_ini: number;
    total_catatan: number;
    siswa_tercatat: number;
  };
  rekap_siswa?: RekapSiswaPoin[];
}

interface BukuPelanggaranTabProps {
  selectedBulan?: number;
  selectedTahun?: number;
  periodeMode?: "bulan" | "tahun" | string;
  namaBulanTerpilih?: string;
}

const EXPORT_LIST: readonly ExportOption<"pdf" | "xlsx" | "csv">[] = [
  EXPORT_FORMATS.pdf,
  EXPORT_FORMATS.xlsx,
  EXPORT_FORMATS.csv,
];

export default function BukuPelanggaranTab({
  selectedBulan,
  selectedTahun,
  periodeMode,
  namaBulanTerpilih,
}: BukuPelanggaranTabProps) {
  const { isAdmin } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<"riwayat" | "rekap_poin">(
    "riwayat",
  );
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PelanggaranRecord[]>([]);
  const [rekapData, setRekapData] = useState<RekapPelanggaranData | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [displayLimit, setDisplayLimit] = useState(25);

  // Sorting State
  const [sortKey, setSortKey] = useState<string>("tanggal_waktu");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "tanggal_waktu" || key === "poin" ? "desc" : "asc");
    }
  };

  // Sorting State for SubTab 2 (Akumulasi Poin Siswa)
  const [sortKeyRekap, setSortKeyRekap] = useState<string>("total_poin");
  const [sortDirectionRekap, setSortDirectionRekap] = useState<"asc" | "desc">(
    "desc",
  );

  const handleSortRekap = (key: string) => {
    if (sortKeyRekap === key) {
      setSortDirectionRekap((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKeyRekap(key);
      setSortDirectionRekap(
        key === "total_poin" || key === "jumlah_pelanggaran" ? "desc" : "asc",
      );
    }
  };

  // Filters with 350ms debounced search
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [kelasFilter, setKelasFilter] = useState("ALL");
  const [tanggalFilter, setTanggalFilter] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Unique Kelas List
  const uniqueKelas = useMemo(() => {
    const fromRecords = records.map((r) => r.kelas).filter(Boolean);
    return Array.from(new Set([...DAFTAR_KELAS_SMKN21, ...fromRecords])).filter(
      Boolean,
    );
  }, [records]);

  // Modals
  const [selectedDetail, setSelectedDetail] = useState<PelanggaranRecord | null>(
    null,
  );
  const [deleteConfirmItem, setDeleteConfirmItem] =
    useState<PelanggaranRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [spModalSiswa, setSpModalSiswa] = useState<RekapSiswaPoin | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {};
      if (kelasFilter !== "ALL") params.kelas = kelasFilter;
      if (tanggalFilter) params.tanggal = tanggalFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (!tanggalFilter) {
        if (periodeMode === "bulan" && selectedBulan)
          params.bulan = selectedBulan;
        if (selectedTahun) params.tahun = selectedTahun;
      }
      params.limit = 1000;

      const [resList, resRekap] = await Promise.all([
        api.get<{ success: boolean; data?: PelanggaranRecord[] }>(
          "/pelanggaran",
          { params },
        ),
        api.get<RekapPelanggaranData & { success: boolean }>(
          "/pelanggaran/rekap",
        ),
      ]);

      if (resList.data?.success) {
        setRecords(resList.data.data || []);
      }
      if (resRekap.data?.success) {
        setRekapData(resRekap.data);
      }
    } catch (err: unknown) {
      console.error("Gagal memuat data pelanggaran:", err);
      setNotification({
        type: "error",
        message: "Gagal memuat data catatan pelanggaran.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [kelasFilter, tanggalFilter, selectedBulan, selectedTahun, periodeMode, debouncedSearch]);

  // Sinkronisasi realtime otomatis
  useRealtimeSubscription(["pelanggaran", "siswa"], () => {
    fetchData();
  });

  // Handle Export Direct dari Tab Buku Pelanggaran
  const handleExportDirect = async (
    format: "pdf" | "xlsx" | "csv" = "pdf",
  ) => {
    try {
      const { exportPelanggaranDirect } =
        await import("../../../utils/exportUtils");
      const periodeLabel =
        periodeMode === "bulan" && namaBulanTerpilih && selectedTahun
          ? `${namaBulanTerpilih} ${selectedTahun}`
          : selectedTahun
            ? `Tahun ${selectedTahun}`
            : "Semua Periode";

      exportPelanggaranDirect({
        format,
        subTab: activeSubTab,
        records,
        rekapData,
        periodeLabel:
          activeSubTab === "rekap_poin"
            ? `Akumulasi Poin Siswa (${periodeLabel})`
            : tanggalFilter
              ? `Tanggal ${tanggalFilter}`
              : periodeLabel,
      });
      setNotification({
        type: "success",
        message: `Laporan catatan pelanggaran (${format.toUpperCase()}) berhasil diunduh!`,
      });
    } catch (err: unknown) {
      console.error("Gagal mengekspor catatan pelanggaran:", err);
      setNotification({
        type: "error",
        message: "Gagal mengekspor catatan pelanggaran.",
      });
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!deleteConfirmItem) return;
    setDeleteLoading(true);
    try {
      const res = await api.delete<{ success: boolean; message?: string }>(
        `/pelanggaran/${deleteConfirmItem.id}`,
      );
      if (res.data?.success) {
        setNotification({
          type: "success",
          message: res.data.message || "Catatan pelanggaran berhasil dihapus.",
        });
        setDeleteConfirmItem(null);
        fetchData();
      } else {
        setNotification({
          type: "error",
          message: res.data?.message || "Gagal menghapus catatan.",
        });
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Terjadi kesalahan sistem.";
      setNotification({
        type: "error",
        message: msg,
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const stat = rekapData?.statistik || {
    pelanggaran_hari_ini: 0,
    total_catatan: 0,
    siswa_tercatat: 0,
  };

  const rekapSiswaList = rekapData?.rekap_siswa || [];

  // Reset currentPage saat filter berubah atau subtab berpindah
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, kelasFilter, tanggalFilter, activeSubTab]);

  // SubTab 1: Riwayat Catatan Pelanggaran Pagination
  const totalItemsRiwayat = records.length;
  const totalPagesRiwayat = Math.max(
    1,
    Math.ceil(totalItemsRiwayat / displayLimit),
  );
  const safeCurrentPageRiwayat = Math.min(
    Math.max(1, currentPage),
    totalPagesRiwayat,
  );
  const startIndexRiwayat = (safeCurrentPageRiwayat - 1) * displayLimit;
  const endIndexRiwayat = Math.min(
    startIndexRiwayat + displayLimit,
    totalItemsRiwayat,
  );
  const sortedRecords = useMemo(() => {
    const collator = new Intl.Collator("id", { numeric: true, sensitivity: "base" });
    return [...records].sort((a, b) => {
      const valA = (a as Record<string, unknown>)[sortKey] ?? "";
      const valB = (b as Record<string, unknown>)[sortKey] ?? "";
      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
      const r = collator.compare(String(valA), String(valB));
      return sortDirection === "asc" ? r : -r;
    });
  }, [records, sortKey, sortDirection]);

  const paginatedRecords = useMemo(() => {
    return sortedRecords.slice(startIndexRiwayat, endIndexRiwayat);
  }, [sortedRecords, startIndexRiwayat, endIndexRiwayat]);

  // SubTab 2: Akumulasi Poin Siswa Pagination
  const totalItemsRekap = rekapSiswaList.length;
  const totalPagesRekap = Math.max(
    1,
    Math.ceil(totalItemsRekap / displayLimit),
  );
  const safeCurrentPageRekap = Math.min(
    Math.max(1, currentPage),
    totalPagesRekap,
  );
  const startIndexRekap = (safeCurrentPageRekap - 1) * displayLimit;
  const endIndexRekap = Math.min(
    startIndexRekap + displayLimit,
    totalItemsRekap,
  );
  const sortedRekapSiswa = useMemo(() => {
    const collator = new Intl.Collator("id", { numeric: true, sensitivity: "base" });
    return [...rekapSiswaList].sort((a, b) => {
      const valA = (a as Record<string, unknown>)[sortKeyRekap] ?? "";
      const valB = (b as Record<string, unknown>)[sortKeyRekap] ?? "";
      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirectionRekap === "asc" ? valA - valB : valB - valA;
      }
      const r = collator.compare(String(valA), String(valB));
      return sortDirectionRekap === "asc" ? r : -r;
    });
  }, [rekapSiswaList, sortKeyRekap, sortDirectionRekap]);

  const paginatedRekapSiswa = useMemo(() => {
    return sortedRekapSiswa.slice(startIndexRekap, endIndexRekap);
  }, [sortedRekapSiswa, startIndexRekap, endIndexRekap]);

  const showSkeletonRiwayat = loading && records.length === 0;
  const isReloadingRiwayat = loading && records.length > 0;

  const showSkeletonRekap = loading && rekapSiswaList.length === 0;
  const isReloadingRekap = loading && rekapSiswaList.length > 0;

  return (
    <div className="space-y-6">
      {/* Toast Notification Seragam */}
      <ToastNotification
        notification={notification}
        onClose={() => setNotification(null)}
      />

      {/* Stats Cards dengan KpiCard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <KpiCard
          label="Pelanggaran Hari Ini"
          value={stat.pelanggaran_hari_ini}
          icon={<ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />}
          tone="rose"
          loading={loading && !rekapData}
        />
        <KpiCard
          label="Total Catatan Pelanggaran"
          value={stat.total_catatan}
          icon={<FileText className="w-5 h-5 sm:w-6 sm:h-6" />}
          tone="blue"
          loading={loading && !rekapData}
        />
        <KpiCard
          label="Siswa/i Tercatat Poin"
          value={stat.siswa_tercatat}
          icon={<GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />}
          tone="amber"
          loading={loading && !rekapData}
          className="sm:col-span-2 lg:col-span-1"
        />
      </div>

      {/* Control Bar: Sub-tabs & Action Button */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <SegmentedControl<"riwayat" | "rekap_poin">
          value={activeSubTab}
          onChange={(v) => setActiveSubTab(v)}
          options={[
            {
              value: "riwayat",
              label: "Riwayat Pelanggaran",
              count: records.length,
            },
            {
              value: "rekap_poin",
              label: "Akumulasi Poin",
              count: rekapSiswaList.length,
            },
          ]}
          ariaLabel="Pilih jenis tampilan catatan pelanggaran"
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Dropdown Ekspor Laporan Pelanggaran */}
          <ExportMenu<"pdf" | "xlsx" | "csv">
            title="Unduh Catatan Pelanggaran"
            subtitle={
              activeSubTab === "rekap_poin"
                ? "Akumulasi Poin Siswa"
                : "Riwayat Pelanggaran"
            }
            options={EXPORT_LIST}
            onSelect={(fmt) => handleExportDirect(fmt)}
            className="flex-1 sm:flex-none"
          />

          <Link
            to="/pelanggaran"
            className="press inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors duration-150 shadow-xs cursor-pointer w-full sm:w-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Input Pelanggaran</span>
          </Link>
        </div>
      </div>

      {/* Filters (Hanya untuk SubTab Riwayat) */}
      {activeSubTab === "riwayat" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {/* Search Input dengan debounce 350ms */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari siswa, NIS, jenis pelanggaran..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3.5 min-h-11 rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Filter Kelas Menggunakan CustomDropdown */}
            <div>
              <CustomDropdown
                value={kelasFilter}
                onChange={(val) => {
                  setKelasFilter(String(val));
                  setCurrentPage(1);
                }}
                options={[
                  { value: "ALL", label: "Semua Kelas" },
                  ...uniqueKelas.map((k) => ({ value: k, label: k })),
                ]}
                icon={<Filter className="w-3.5 h-3.5 text-slate-400" />}
                className="w-full min-h-11"
                align="right"
              />
            </div>

            {/* Filter Tanggal Menggunakan CustomDatePicker */}
            <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1">
              <div className="flex-1 min-w-0">
                <CustomDatePicker
                  value={tanggalFilter}
                  onChange={(val) => {
                    setTanggalFilter(val);
                    setCurrentPage(1);
                  }}
                  placeholder="Pilih tanggal..."
                  className="w-full min-h-11"
                />
              </div>
              {tanggalFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setTanggalFilter("");
                    setCurrentPage(1);
                  }}
                  title="Hapus filter tanggal"
                  className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs cursor-pointer shrink-0 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 1: TABEL RIWAYAT CATATAN PELANGGARAN */}
      <div
        id="pelanggaran-table-top"
        className={
          activeSubTab === "riwayat"
            ? "bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs min-h-[450px]"
            : "hidden"
        }
      >
        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">
            Daftar Catatan Pelanggaran ({records.length})
          </h4>
        </div>

        {/* Toolbar Pagination Atas */}
        <DashboardPagination
          displayLimit={displayLimit}
          setDisplayLimit={setDisplayLimit}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalItems={totalItemsRiwayat}
          totalPages={totalPagesRiwayat}
          safeCurrentPage={safeCurrentPageRiwayat}
          startIndex={startIndexRiwayat}
          endIndex={endIndexRiwayat}
          variant="toolbar"
        />

        {/* Loading skeleton saat belum ada data sama sekali */}
        {showSkeletonRiwayat && (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={`skel-m-${idx}`}
                className="p-3.5 rounded-xl border border-slate-100 space-y-2 animate-pulse"
              >
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {/* Konten Utama Riwayat Pelanggaran (dengan state reloading subtle) */}
        {!showSkeletonRiwayat && (
          <div
            className={`transition-opacity duration-150 ${
              isReloadingRiwayat ? "opacity-50 pointer-events-none" : "opacity-100"
            }`}
          >
            {/* 1. Mobile & Tablet Portrait Cards View (< lg) */}
            <div className="divide-y divide-slate-100 md:grid md:grid-cols-2 md:gap-3 md:divide-y-0 lg:hidden p-0 md:p-3">
              {paginatedRecords.map((r) => {
                const kat = getKategoriPelanggaran(r.poin);
                return (
                  <div
                    key={r.id}
                    className="p-3.5 hover:bg-slate-50/70 transition-colors space-y-2.5 md:rounded-2xl md:border md:border-slate-200/80 md:bg-white"
                  >
                    {/* Baris Atas: Tanggal/Waktu & Poin Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-mono text-slate-500 font-medium truncate">
                          {r.tanggal_waktu_formatted}
                        </span>
                        {r.kategori === "Prestasi" ? (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                            Prestasi
                          </span>
                        ) : (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                            Pelanggaran
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-black px-2 py-0.5 rounded-md border shrink-0 ${
                          r.kategori === "Prestasi"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : kat.badge
                        }`}
                      >
                        {r.kategori === "Prestasi"
                          ? `+${r.poin} Poin`
                          : `${r.poin} Poin`}
                      </span>
                    </div>

                    {/* Baris Siswa & Kelas */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">
                          {r.nama_siswa}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {r.nis}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                        {r.kelas}
                      </span>
                    </div>

                    {/* Jenis Pelanggaran / Prestasi */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                        {r.kategori === "Prestasi"
                          ? "Bentuk Prestasi / Reward"
                          : "Pelanggaran"}
                      </span>
                      <p className="font-semibold text-slate-800 line-clamp-2 leading-relaxed">
                        {r.jenis_pelanggaran}
                      </p>
                    </div>

                    {/* Footer Kartu: Guru Penegur & Tombol Aksi */}
                    <div className="flex items-center justify-between pt-1 gap-2 border-t border-slate-100">
                      <div className="text-[11px] text-slate-500 truncate min-w-0">
                        Penegur{" "}
                        <strong className="text-slate-700 font-semibold">
                          {r.nama_penanggung_jawab}
                        </strong>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedDetail(r)}
                          title="Lihat Detail Slip"
                          className="press inline-flex min-h-9 items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer border border-blue-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Slip</span>
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmItem(r)}
                            title="Hapus Catatan (Khusus Admin)"
                            className="press grid h-9 w-9 place-items-center text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-rose-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {!loading && records.length === 0 && (
                <div className="col-span-2 py-12 text-center text-slate-400 font-medium text-xs px-4">
                  Belum ada catatan pelanggaran yang sesuai.
                </div>
              )}
            </div>

            {/* 2. Desktop Table View (>= lg) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[780px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <SortableTh
                      label="Tanggal & Waktu"
                      field="tanggal_waktu"
                      sortKey={sortKey}
                      sortDir={sortDirection}
                      onSort={handleSort}
                      className="whitespace-nowrap"
                    />
                    <SortableTh
                      label="Siswa"
                      field="nama_siswa"
                      sortKey={sortKey}
                      sortDir={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTh
                      label="Kelas"
                      field="kelas"
                      sortKey={sortKey}
                      sortDir={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTh
                      label="Jenis Pelanggaran"
                      field="jenis_pelanggaran"
                      sortKey={sortKey}
                      sortDir={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTh
                      label="Poin"
                      field="poin"
                      sortKey={sortKey}
                      sortDir={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTh
                      label="Guru / Tendik Penegur"
                      field="nama_penanggung_jawab"
                      sortKey={sortKey}
                      sortDir={sortDirection}
                      onSort={handleSort}
                    />
                    <th className="px-4 py-3 font-bold text-[11px] text-slate-600 uppercase tracking-wider">
                      Tanda Tangan
                    </th>
                    <th className="px-4 py-3 text-center font-bold text-[11px] text-slate-600 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRecords.map((r) => {
                    const kat = getKategoriPelanggaran(r.poin);
                    return (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                          {r.tanggal_waktu_formatted}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{r.nama_siswa}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            NIS {r.nis}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                          {r.kelas}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <div className="flex items-center gap-1.5 mb-1">
                            {r.kategori === "Prestasi" ? (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                                Prestasi
                              </span>
                            ) : (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 uppercase tracking-wider">
                                Pelanggaran
                              </span>
                            )}
                          </div>
                          <p
                            className="font-semibold text-slate-800 line-clamp-2"
                            title={r.jenis_pelanggaran}
                          >
                            {r.jenis_pelanggaran}
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`text-[11px] font-black px-2 py-0.5 rounded-md border ${
                              r.kategori === "Prestasi"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : kat.badge
                            }`}
                          >
                            {r.kategori === "Prestasi" ? `+${r.poin}` : r.poin}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                          {r.nama_penanggung_jawab}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {r.tanda_tangan_siswa ? (
                            <button
                              type="button"
                              onClick={() => setSelectedDetail(r)}
                              className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 cursor-pointer"
                              title="Klik untuk melihat tanda tangan"
                            >
                              <img
                                src={r.tanda_tangan_siswa}
                                alt="TTD"
                                className="h-6 w-12 object-contain"
                              />
                            </button>
                          ) : (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-500 font-medium border border-slate-200/80"
                              title="Siswa belum membuat tanda tangan digital di profilnya"
                            >
                              Belum Buat TTD
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedDetail(r)}
                              title="Lihat Detail Tiket"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmItem(r)}
                                title="Hapus Catatan (Khusus Admin)"
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {!loading && records.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-16 text-center text-slate-400 font-medium text-xs"
                      >
                        Belum ada catatan pelanggaran yang sesuai.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Navigasi Halaman Bawah */}
        <DashboardPagination
          displayLimit={displayLimit}
          setDisplayLimit={setDisplayLimit}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalItems={totalItemsRiwayat}
          totalPages={totalPagesRiwayat}
          safeCurrentPage={safeCurrentPageRiwayat}
          startIndex={startIndexRiwayat}
          endIndex={endIndexRiwayat}
          variant="footer"
          scrollTargetId="pelanggaran-table-top"
        />
      </div>

      {/* SUB-TAB 2: AKUMULASI POIN SISWA */}
      <div
        id="rekap-poin-table-top"
        className={
          activeSubTab === "rekap_poin"
            ? "bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs min-h-[450px]"
            : "hidden"
        }
      >
        <div className="p-3.5 sm:p-4 border-b border-slate-200">
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">
            Peringkat Akumulasi Poin Kedisiplinan Siswa ({rekapSiswaList.length})
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Daftar siswa dengan catatan poin kedisiplinan dan reward prestasi
          </p>
        </div>

        {/* Toolbar Pagination Atas SubTab 2 */}
        <DashboardPagination
          displayLimit={displayLimit}
          setDisplayLimit={setDisplayLimit}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalItems={totalItemsRekap}
          totalPages={totalPagesRekap}
          safeCurrentPage={safeCurrentPageRekap}
          startIndex={startIndexRekap}
          endIndex={endIndexRekap}
          variant="toolbar"
        />

        {showSkeletonRekap && (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={`skel-rekap-${idx}`}
                className="p-3.5 rounded-xl border border-slate-100 space-y-2 animate-pulse"
              >
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
                <Skeleton className="h-4 w-48" />
              </div>
            ))}
          </div>
        )}

        {!showSkeletonRekap && (
          <div
            className={`transition-opacity duration-150 ${
              isReloadingRekap ? "opacity-50 pointer-events-none" : "opacity-100"
            }`}
          >
            {/* 1. Mobile & Tablet Portrait Cards View (< lg) */}
            <div className="divide-y divide-slate-100 md:grid md:grid-cols-2 md:gap-3 md:divide-y-0 lg:hidden p-0 md:p-3">
              {paginatedRekapSiswa.map((item, idx) => {
                const statusInfo = getStatusPembinaan(item.total_poin);
                const actualNo = startIndexRekap + idx + 1;
                return (
                  <div
                    key={idx}
                    className="p-3.5 hover:bg-slate-50/70 transition-colors space-y-2.5 md:rounded-2xl md:border md:border-slate-200/80 md:bg-white"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                          {actualNo}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">
                            {item.nama_siswa}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            NIS: {item.nis} • {item.kelas}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-slate-900 text-white shadow-xs">
                          Bersih: {item.poin_bersih ?? item.total_poin} Poin
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                          <span className="text-rose-600 font-bold">
                            P:{" "}
                            {item.total_poin_pelanggaran ??
                              item.total_pelanggaran ??
                              item.total_poin}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-emerald-600 font-bold">
                            R: +
                            {item.total_poin_prestasi ?? item.total_prestasi ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                      <span className="text-[11px] text-slate-500">
                        Total Kasus:{" "}
                        <strong className="text-slate-800">
                          {item.jumlah_pelanggaran} Kali
                        </strong>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.badge}`}
                        >
                          {statusInfo.status}
                        </span>
                        {(item.poin_bersih ?? item.total_poin ?? 0) >= 15 && (
                          <button
                            type="button"
                            onClick={() => setSpModalSiswa(item)}
                            title="Cetak Surat Panggilan (SP)"
                            className="px-2 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            <span>SP</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {!loading && rekapSiswaList.length === 0 && (
                <div className="col-span-2 py-12 text-center text-slate-400 font-medium text-xs px-4">
                  Belum ada akumulasi poin tercatat.
                </div>
              )}
            </div>

            {/* 2. Desktop Table View (>= lg) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[750px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3 text-center w-12 font-bold text-[11px] text-slate-600 uppercase tracking-wider">
                      No
                    </th>
                    <SortableTh
                      label="Nama Siswa"
                      field="nama_siswa"
                      sortKey={sortKeyRekap}
                      sortDir={sortDirectionRekap}
                      onSort={handleSortRekap}
                    />
                    <SortableTh
                      label="NIS"
                      field="nis"
                      sortKey={sortKeyRekap}
                      sortDir={sortDirectionRekap}
                      onSort={handleSortRekap}
                    />
                    <SortableTh
                      label="Kelas"
                      field="kelas"
                      sortKey={sortKeyRekap}
                      sortDir={sortDirectionRekap}
                      onSort={handleSortRekap}
                    />
                    <th className="px-4 py-3 text-center text-rose-600 font-bold text-[11px] uppercase tracking-wider">
                      Poin Pelanggaran
                    </th>
                    <th className="px-4 py-3 text-center text-emerald-600 font-bold text-[11px] uppercase tracking-wider">
                      Poin Prestasi
                    </th>
                    <SortableTh
                      label="Poin Bersih"
                      field="total_poin"
                      sortKey={sortKeyRekap}
                      sortDir={sortDirectionRekap}
                      onSort={handleSortRekap}
                      align="center"
                    />
                    <th className="px-4 py-3 font-bold text-[11px] text-slate-600 uppercase tracking-wider">
                      Status Pembinaan
                    </th>
                    <th className="px-4 py-3 text-center font-bold text-[11px] text-slate-600 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRekapSiswa.map((item, idx) => {
                    const poinBersih = item.poin_bersih ?? item.total_poin ?? 0;
                    const statusInfo = getStatusPembinaan(poinBersih);
                    const actualNo = startIndexRekap + idx + 1;
                    return (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="px-4 py-3 text-center font-bold text-slate-400">
                          {actualNo}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {item.nama_siswa}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500">
                          {item.nis}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {item.kelas}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-rose-600">
                          {item.total_poin_pelanggaran ??
                            item.total_pelanggaran ??
                            item.total_poin}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600">
                          +{item.total_poin_prestasi ?? item.total_prestasi ?? 0}
                        </td>
                        <td className="px-4 py-3 text-center font-black text-slate-900 text-sm">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
                            {poinBersih} Poin
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusInfo.badge}`}
                          >
                            {statusInfo.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {poinBersih >= 15 ? (
                            <button
                              type="button"
                              onClick={() => setSpModalSiswa(item)}
                              title="Cetak Surat Panggilan Orang Tua (SP)"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-600" />
                              <span>Cetak SP</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium italic">
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {!loading && rekapSiswaList.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-8 text-center text-slate-400"
                      >
                        Belum ada akumulasi poin tercatat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Navigasi Halaman Bawah SubTab 2 */}
        <DashboardPagination
          displayLimit={displayLimit}
          setDisplayLimit={setDisplayLimit}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalItems={totalItemsRekap}
          totalPages={totalPagesRekap}
          safeCurrentPage={safeCurrentPageRekap}
          startIndex={startIndexRekap}
          endIndex={endIndexRekap}
          variant="footer"
          scrollTargetId="rekap-poin-table-top"
        />
      </div>

      {/* Modal Detail & Cetak Tiket Pelanggaran */}
      <Sheet
        isOpen={Boolean(selectedDetail)}
        onClose={() => setSelectedDetail(null)}
        labelledBy="detail-pelanggaran-title"
        size="md"
        tall={true}
      >
        {selectedDetail && (
          <>
            <SheetHeader
              id="detail-pelanggaran-title"
              title="Slip Bukti Pelanggaran Siswa"
              subtitle="SMKN 21 Jakarta"
              onClose={() => setSelectedDetail(null)}
            />
            <SheetBody>
              <div className="space-y-4">
                <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-400">Waktu Kejadian</span>
                    <span className="font-bold text-slate-800">
                      {selectedDetail.tanggal_waktu_formatted}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-400">Nama Siswa</span>
                    <span className="font-bold text-slate-900">
                      {selectedDetail.nama_siswa}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-400">NIS & Kelas</span>
                    <span className="font-semibold text-slate-800">
                      {selectedDetail.nis} • {selectedDetail.kelas}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-400">Guru / Tendik Penegur</span>
                    <span className="font-bold text-slate-800">
                      {selectedDetail.nama_penanggung_jawab}
                    </span>
                  </div>
                  <div className="space-y-1 border-b border-slate-200 pb-2">
                    <span className="text-slate-400 block">Jenis Pelanggaran</span>
                    <span className="font-bold text-slate-900 block leading-relaxed">
                      {selectedDetail.jenis_pelanggaran}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Bobot Poin</span>
                    <span className="text-base font-black text-rose-600">
                      +{selectedDetail.poin} Poin
                    </span>
                  </div>
                </div>

                {/* Tanda Tangan */}
                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-1">
                    Tanda Tangan Digital Pengakuan Siswa
                  </span>
                  <div className="w-full h-28 border border-slate-200 bg-white rounded-2xl flex items-center justify-center p-2 shadow-inner">
                    {selectedDetail.tanda_tangan_siswa ? (
                      <img
                        src={selectedDetail.tanda_tangan_siswa}
                        alt="TTD Siswa"
                        className="max-h-full object-contain"
                      />
                    ) : (
                      <div className="text-center p-2">
                        <p className="text-xs text-slate-500 font-medium">
                          Siswa belum membuat tanda tangan digital
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          (Tercatat otomatis via Verifikasi Biometrik Wajah)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SheetBody>
            <SheetFooter>
              <Button
                variant="outline"
                icon={<Printer className="w-4 h-4" />}
                onClick={() => window.print()}
              >
                Cetak Slip
              </Button>
              <Button
                variant="soft"
                onClick={() => setSelectedDetail(null)}
              >
                Tutup
              </Button>
            </SheetFooter>
          </>
        )}
      </Sheet>

      {/* Modal Konfirmasi Hapus */}
      <Sheet
        isOpen={Boolean(deleteConfirmItem)}
        onClose={() => setDeleteConfirmItem(null)}
        labelledBy="delete-pelanggaran-title"
        size="sm"
      >
        {deleteConfirmItem && (
          <>
            <SheetHeader
              id="delete-pelanggaran-title"
              title="Hapus Catatan Pelanggaran?"
              subtitle={`${deleteConfirmItem.nama_siswa} (${deleteConfirmItem.poin} poin)`}
              onClose={() => setDeleteConfirmItem(null)}
            />
            <SheetBody>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hapus catatan pelanggaran untuk{" "}
                <strong className="text-slate-800">
                  {deleteConfirmItem.nama_siswa}
                </strong>{" "}
                ({deleteConfirmItem.poin} poin)? Akumulasi poin siswa akan otomatis disesuaikan di sistem.
              </p>
            </SheetBody>
            <SheetFooter>
              <Button
                variant="outline"
                disabled={deleteLoading}
                onClick={() => setDeleteConfirmItem(null)}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                loading={deleteLoading}
                onClick={handleDelete}
              >
                Ya, Hapus
              </Button>
            </SheetFooter>
          </>
        )}
      </Sheet>

      {/* Modal Cetak Surat Panggilan (SP) Orang Tua Siswa */}
      {spModalSiswa && (
        <ModalCetakSuratPanggilan
          isOpen={Boolean(spModalSiswa)}
          onClose={() => setSpModalSiswa(null)}
          siswa={{
            nama: spModalSiswa.nama_siswa,
            nis: spModalSiswa.nis,
            kelas: spModalSiswa.kelas,
          }}
          totalPoin={spModalSiswa.poin_bersih ?? spModalSiswa.total_poin ?? 0}
          statusPembinaan={
            getStatusPembinaan(
              spModalSiswa.poin_bersih ?? spModalSiswa.total_poin ?? 0,
            ).status
          }
        />
      )}
    </div>
  );
}
