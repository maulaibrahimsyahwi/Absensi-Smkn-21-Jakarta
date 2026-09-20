import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  Search,
  Filter,
  PlusCircle,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  User,
  GraduationCap,
  X,
  Printer,
  FileText,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import api from "../../../services/api";
import {
  DAFTAR_KELAS_SMKN21,
  KELAS_GROUPS_DROPDOWN,
} from "../../../constants/schoolData";
import {
  getKategoriPelanggaran,
  getStatusPembinaan,
} from "../../../data/pelanggaranData";
import DashboardPagination from "../DashboardPagination";
import CustomDropdown from "../../CustomDropdown";
import CustomDatePicker from "../../CustomDatePicker";
import { Skeleton } from "../../common/Skeleton";

export default function BukuPelanggaranTab() {
  const [activeSubTab, setActiveSubTab] = useState("riwayat"); // "riwayat" atau "rekap_poin"
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [rekapData, setRekapData] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [kelasFilter, setKelasFilter] = useState("ALL");
  const [tanggalFilter, setTanggalFilter] = useState("");

  // Pagination State
  const [displayLimit, setDisplayLimit] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  // Group opsi filter kelas dengan pilihan "Semua Kelas"
  const kelasFilterGroups = useMemo(() => {
    return [
      {
        group: "Pilihan Tingkat",
        options: [
          {
            value: "ALL",
            label: "Semua Kelas",
            sublabel: "Tampilkan seluruh rombel kelas",
          },
        ],
      },
      ...KELAS_GROUPS_DROPDOWN,
    ];
  }, []);

  // Modals
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (kelasFilter !== "ALL") params.kelas = kelasFilter;
      if (tanggalFilter) params.tanggal = tanggalFilter;
      if (search.trim()) params.search = search.trim();

      const [resList, resRekap] = await Promise.all([
        api.get("/pelanggaran", { params }),
        api.get("/pelanggaran/rekap"),
      ]);

      if (resList.data?.success) {
        setRecords(resList.data.data || []);
      }
      if (resRekap.data?.success) {
        setRekapData(resRekap.data);
      }
    } catch (err) {
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
  }, [kelasFilter, tanggalFilter]);

  // Handle Delete
  const handleDelete = async () => {
    if (!deleteConfirmItem) return;
    setDeleteLoading(true);
    try {
      const res = await api.delete(`/pelanggaran/${deleteConfirmItem.id}`);
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
    } catch (err) {
      setNotification({
        type: "error",
        message: err.response?.data?.message || "Terjadi kesalahan sistem.",
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
  }, [search, kelasFilter, tanggalFilter, activeSubTab]);

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
  const paginatedRecords = useMemo(() => {
    return records.slice(startIndexRiwayat, endIndexRiwayat);
  }, [records, startIndexRiwayat, endIndexRiwayat]);

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
  const paginatedRekapSiswa = useMemo(() => {
    return rekapSiswaList.slice(startIndexRekap, endIndexRekap);
  }, [rekapSiswaList, startIndexRekap, endIndexRekap]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-2xl bg-slate-900 text-white shadow-2xl flex items-center gap-3 animate-in fade-in">
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-medium">
            {notification.message}
          </span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white text-xs ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Pelanggaran Hari Ini
            </p>
            <h3 className="text-2xl font-black text-slate-800 mt-0.5">
              {stat.pelanggaran_hari_ini}{" "}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Catatan Pelanggaran
            </p>
            <h3 className="text-2xl font-black text-slate-800 mt-0.5">
              {stat.total_catatan}{" "}
            </h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Siswa Tercatat Poin
            </p>
            <h3 className="text-2xl font-black text-slate-800 mt-0.5">
              {stat.siswa_tercatat}{" "}
            </h3>
          </div>
        </div>
      </div>

      {/* Control Bar: Sub-tabs & Action Button */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("riwayat")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors duration-150 cursor-pointer border ${
              activeSubTab === "riwayat"
                ? "bg-rose-600 text-white shadow-xs border-rose-600"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80"
            }`}
          >
            Riwayat Pelanggaran
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("rekap_poin")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors duration-150 cursor-pointer border ${
              activeSubTab === "rekap_poin"
                ? "bg-rose-600 text-white shadow-xs border-rose-600"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80"
            }`}
          >
            Akumulasi Poin Siswa
          </button>
        </div>

        <Link
          to="/pelanggaran"
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors duration-150 shadow-xs cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Input Pelanggaran</span>
        </Link>
      </div>

      {/* Filters (Hanya untuk SubTab Riwayat) */}
      {activeSubTab === "riwayat" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari siswa, NIS, atau jenis pelanggaran..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchData()}
                className="w-full text-xs pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Filter Kelas Menggunakan CustomDropdown */}
            <div>
              <CustomDropdown
                value={kelasFilter}
                onChange={(val) => {
                  setKelasFilter(val);
                  setCurrentPage(1);
                }}
                groups={kelasFilterGroups}
                placeholder="Pilih Kelas..."
                icon={<GraduationCap className="w-4 h-4 text-rose-600" />}
                className="w-full"
              />
            </div>

            {/* Filter Tanggal Menggunakan CustomDatePicker */}
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <CustomDatePicker
                  value={tanggalFilter}
                  onChange={(val) => {
                    setTanggalFilter(val);
                    setCurrentPage(1);
                  }}
                  placeholder="Pilih filter tanggal..."
                  className="w-full"
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
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs cursor-pointer flex-shrink-0 transition-colors"
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
        className={
          activeSubTab === "riwayat"
            ? "bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs min-h-[450px]"
            : "hidden"
        }
      >
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">
            Daftar Catatan Pelanggaran ({records.length})
          </h4>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>

        {/* Slider Batas Data & Navigasi Halaman Atas */}
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
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Tanggal & Waktu</th>
                <th className="px-4 py-3">Siswa</th>
                <th className="px-4 py-3">Kelas</th>
                <th className="px-4 py-3">Jenis Pelanggaran</th>
                <th className="px-4 py-3">Poin</th>
                <th className="px-4 py-3">Guru / Tendik Penegur</th>
                <th className="px-4 py-3">Tanda Tangan</th>
                <th className="px-4 py-3 text-center">Aksi</th>
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
                        NIS: {r.nis}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                      {r.kelas}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p
                        className="font-semibold text-slate-800 line-clamp-2"
                        title={r.jenis_pelanggaran}
                      >
                        {r.jenis_pelanggaran}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-black px-2 py-0.5 rounded-md border ${kat.badge}`}
                      >
                        +{r.poin}
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
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmItem(r)}
                          title="Hapus Catatan"
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {loading && (
                <>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={`skel-row-${idx}`} className="animate-pulse">
                      <td className="px-4 py-3.5">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="px-4 py-3.5">
                        <Skeleton className="h-4 w-36 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </td>
                      <td className="px-4 py-3.5">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="px-4 py-3.5">
                        <Skeleton className="h-4 w-44" />
                      </td>
                      <td className="px-4 py-3.5">
                        <Skeleton className="h-5 w-12 rounded-md" />
                      </td>
                      <td className="px-4 py-3.5">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="px-4 py-3.5">
                        <Skeleton className="h-7 w-7 rounded-lg" />
                      </td>
                      <td className="px-4 py-3.5">
                        <Skeleton className="h-7 w-16 rounded-lg mx-auto" />
                      </td>
                    </tr>
                  ))}
                </>
              )}

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

        {/* Footer Navigasi Halaman Bawah */}
        <div className="p-4 sm:p-5 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-b-2xl">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            {totalItemsRiwayat === 0 ? (
              "Tidak ada baris data untuk ditampilkan."
            ) : (
              <>
                Menampilkan{" "}
                <span className="font-bold text-slate-800">
                  {startIndexRiwayat + 1}–{endIndexRiwayat}
                </span>{" "}
                dari{" "}
                <span className="font-bold text-slate-800">
                  {totalItemsRiwayat}
                </span>{" "}
                total data catatan pelanggaran
              </>
            )}
          </p>

          {totalPagesRiwayat > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">
                Halaman {safeCurrentPageRiwayat} dari {totalPagesRiwayat}
              </span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
                <button
                  type="button"
                  disabled={safeCurrentPageRiwayat <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed border-r border-slate-200 cursor-pointer"
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={safeCurrentPageRiwayat >= totalPagesRiwayat}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPagesRiwayat, p + 1))
                  }
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SUB-TAB 2: AKUMULASI POIN SISWA */}
      <div
        className={
          activeSubTab === "rekap_poin"
            ? "bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs min-h-[450px]"
            : "hidden"
        }
      >
        <div className="p-4 sm:p-5 border-b border-slate-200">
          <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">
            Peringkat Akumulasi Poin Kedisiplinan Siswa ({rekapSiswaList.length}
            )
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Daftar siswa dengan catatan poin pelanggaran, diurutkan dari poin
            tertinggi.
          </p>
        </div>

        {/* Slider Batas Data & Navigasi Halaman Atas SubTab 2 */}
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
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3 text-center">No</th>
                <th className="px-4 py-3">Nama Siswa</th>
                <th className="px-4 py-3">NIS</th>
                <th className="px-4 py-3">Kelas</th>
                <th className="px-4 py-3 text-center">Jumlah Kasus</th>
                <th className="px-4 py-3">Total Poin</th>
                <th className="px-4 py-3">Status Pembinaan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRekapSiswa.map((item, idx) => {
                const statusInfo = getStatusPembinaan(item.total_poin);
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
                    <td className="px-4 py-3 text-center font-bold text-slate-700">
                      {item.jumlah_pelanggaran}
                    </td>
                    <td className="px-4 py-3 font-black text-rose-600 text-sm">
                      {item.total_poin} Poin
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusInfo.badge}`}
                      >
                        {statusInfo.status}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {rekapSiswaList.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    Belum ada akumulasi poin tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Navigasi Halaman Bawah SubTab 2 */}
        <div className="p-4 sm:p-5 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-b-2xl">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            {totalItemsRekap === 0 ? (
              "Tidak ada baris data untuk ditampilkan."
            ) : (
              <>
                Menampilkan{" "}
                <span className="font-bold text-slate-800">
                  {startIndexRekap + 1}–{endIndexRekap}
                </span>{" "}
                dari{" "}
                <span className="font-bold text-slate-800">
                  {totalItemsRekap}
                </span>{" "}
                total siswa tercatat
              </>
            )}
          </p>

          {totalPagesRekap > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">
                Halaman {safeCurrentPageRekap} dari {totalPagesRekap}
              </span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
                <button
                  type="button"
                  disabled={safeCurrentPageRekap <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed border-r border-slate-200 cursor-pointer"
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={safeCurrentPageRekap >= totalPagesRekap}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPagesRekap, p + 1))
                  }
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Detail & Cetak Tiket Pelanggaran */}
      {selectedDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Slip Bukti Pelanggaran Siswa
                  </h3>
                  <p className="text-[11px] text-slate-400">SMKN 21 Jakarta</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
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

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Slip</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-100">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Hapus Catatan Pelanggaran?
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus catatan pelanggaran untuk{" "}
              <strong className="text-slate-800">
                {deleteConfirmItem.nama_siswa}
              </strong>{" "}
              (+{deleteConfirmItem.poin} poin)? Tindakan ini akan mengurangi
              akumulasi poin siswa tersebut.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
