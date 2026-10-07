import React, { useState, useMemo, useEffect } from "react";
import {
  Users,
  Search,
  GraduationCap,
  Trash2,
  Edit2,
  Camera,
  KeyRound,
  PenTool,
  UserCheck,
  ShieldOff,
  Activity,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import CustomDropdown from "../CustomDropdown";
import { SkeletonTable } from "../common/Skeleton";
import { Siswa } from "../../types/siswa";
import SegmentedControl from "../ui/SegmentedControl";
import ActionMenu, { ActionItem } from "../ui/ActionMenu";
import Button from "../ui/Button";
import SortableTh from "../ui/SortableTh";
import DashboardPagination from "../dashboard/DashboardPagination";
import { useTableSort } from "../../hooks/useTableSort";
import { isExemptActive } from "../../utils/date";

export interface TabelDaftarSiswaProps {
  siswaList: Siswa[];
  filteredSiswa: Siswa[];
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  kelasFilter: string;
  setKelasFilter: (s: string) => void;
  uniqueKelas: string[];
  selectedIds: (number | string)[];
  isAllSelected: boolean;
  isSomeSelected?: boolean;
  toggleSelectAll: () => void;
  toggleSelectSiswa: (id: number | string) => void;
  totalAktif: number;
  totalAlumni: number;
  totalKelasXIIAktif: number;
  onLuluskanTingkatXII: () => void;
  onKenaikanKelasMassal: () => void;
  onMedicalExemption?: (s: Siswa) => void;
  onLuluskanSelected: () => void;
  onLuluskanSingle: (s: Siswa) => void;
  onAktifkanSingle: (s: Siswa) => void;
  onReRecord: (s: Siswa) => void;
  onEdit: (s: Siswa) => void;
  onDelete: (s: Siswa) => void;
  onResetPassword: (s: Siswa) => void;
  onResetFace: (s: Siswa) => void;
  onResetSignature: (s: Siswa) => void;
  onReset2fa?: (s: Siswa) => void;
  onBulkDelete: () => void;
  onClearSelection?: () => void;
  loading?: boolean;
}

export default function TabelDaftarSiswa({
  siswaList,
  filteredSiswa,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  kelasFilter,
  setKelasFilter,
  uniqueKelas,
  selectedIds,
  isAllSelected,
  toggleSelectAll,
  toggleSelectSiswa,
  totalAktif,
  totalAlumni,
  totalKelasXIIAktif,
  onLuluskanTingkatXII,
  onKenaikanKelasMassal,
  onMedicalExemption,
  onLuluskanSelected,
  onLuluskanSingle,
  onAktifkanSingle,
  onReRecord,
  onEdit,
  onDelete,
  onResetPassword,
  onResetFace,
  onResetSignature,
  onReset2fa,
  onBulkDelete,
  onClearSelection,
  loading = false,
}: TabelDaftarSiswaProps) {
  const [quick, setQuick] = useState<"all" | "no_face" | "exempt">("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const rows = useMemo(() => {
    if (quick === "no_face") return filteredSiswa.filter((s) => !s.terdaftar);
    if (quick === "exempt")
      return filteredSiswa.filter((s) =>
        isExemptActive(s.medical_exemption_until),
      );
    return filteredSiswa;
  }, [filteredSiswa, quick]);

  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    rows,
    "nama",
    "asc",
    ["sample_count"],
  );

  useEffect(() => {
    setPage(1);
  }, [rows, sortKey, sortDir, limit]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const end = Math.min(start + limit, total);
  const pageRows = sorted.slice(start, end);
  const paging = {
    displayLimit: limit,
    setDisplayLimit: setLimit,
    currentPage: page,
    setCurrentPage: setPage,
    totalItems: total,
    totalPages,
    safeCurrentPage: safePage,
    startIndex: start,
    endIndex: end,
  };

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const hiddenSelected =
    selectedIds.length - sorted.filter((s) => selectedSet.has(s.id)).length;
  const noFaceCount = filteredSiswa.filter((s) => !s.terdaftar).length;
  const exemptCount = filteredSiswa.filter((s) =>
    isExemptActive(s.medical_exemption_until),
  ).length;

  const kelasOptions = useMemo(() => {
    return [
      { value: "ALL", label: "Semua Kelas" },
      ...uniqueKelas.map((k) => ({ value: k, label: k })),
    ];
  }, [uniqueKelas]);

  const rowActions = (s: Siswa): ActionItem[] => [
    s.status === "Alumni"
      ? {
          key: "aktif",
          group: "Status",
          label: "Aktifkan kembali",
          icon: <UserCheck className="h-4 w-4" />,
          onSelect: () => onAktifkanSingle(s),
        }
      : {
          key: "lulus",
          group: "Status",
          label: "Luluskan ke alumni",
          icon: <GraduationCap className="h-4 w-4" />,
          onSelect: () => onLuluskanSingle(s),
        },
    {
      key: "med",
      group: "Biometrik",
      label: "Dispensasi medis",
      icon: <Activity className="h-4 w-4" />,
      hidden: !onMedicalExemption,
      onSelect: () => onMedicalExemption?.(s),
    },
    {
      key: "face",
      group: "Biometrik",
      label: "Reset biometrik wajah",
      icon: <Camera className="h-4 w-4" />,
      hidden: !s.terdaftar,
      onSelect: () => onResetFace(s),
    },
    {
      key: "pw",
      group: "Akun",
      label: "Reset kata sandi",
      icon: <KeyRound className="h-4 w-4" />,
      onSelect: () => onResetPassword(s),
    },
    {
      key: "ttd",
      group: "Akun",
      label: "Reset tanda tangan",
      icon: <PenTool className="h-4 w-4" />,
      hidden: !s.has_signature && !s.tanda_tangan,
      onSelect: () => onResetSignature(s),
    },
    {
      key: "2fa",
      group: "Akun",
      label: "Reset 2FA",
      icon: <ShieldOff className="h-4 w-4" />,
      hidden: !onReset2fa,
      onSelect: () => onReset2fa?.(s),
    },
    {
      key: "del",
      group: "Berbahaya",
      label: "Hapus permanen",
      icon: <Trash2 className="h-4 w-4" />,
      danger: true,
      onSelect: () => onDelete(s),
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4">
      {/* Header & Filter Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Daftar Siswa Terdaftar
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {total} siswa
            </span>
          </div>

          {/* Action Menu Tindakan Massal */}
          <ActionMenu
            label="Tindakan Massal"
            title="Tindakan Massal"
            subtitle="Berlaku untuk banyak siswa sekaligus"
            items={[
              {
                key: "naik",
                label: "Kenaikan kelas massal",
                icon: <GraduationCap className="h-4 w-4 text-blue-600" />,
                onSelect: onKenaikanKelasMassal,
              },
              {
                key: "xii",
                label: `Luluskan kelas XII (${totalKelasXIIAktif})`,
                icon: <GraduationCap className="h-4 w-4 text-indigo-600" />,
                hidden: totalKelasXIIAktif === 0,
                onSelect: onLuluskanTingkatXII,
              },
            ]}
          />
        </div>

        {/* Segmented Filter Status Siswa */}
        <SegmentedControl
          ariaLabel="Status siswa"
          value={statusFilter as "ALL" | "Aktif" | "Alumni"}
          onChange={setStatusFilter}
          options={[
            { value: "ALL", label: "Semua", count: siswaList.length },
            { value: "Aktif", label: "Aktif", count: totalAktif },
            { value: "Alumni", label: "Alumni", count: totalAlumni },
          ]}
        />

        {/* Quick Filter: Semua, Belum Ada Wajah, Dispensasi */}
        <SegmentedControl
          ariaLabel="Filter cepat"
          value={quick}
          onChange={setQuick}
          options={[
            { value: "all", label: "Semua Data" },
            {
              value: "no_face",
              label: "Belum Ada Wajah",
              count: noFaceCount,
            },
            {
              value: "exempt",
              label: "Dispensasi Medis",
              count: exemptCount,
            },
          ]}
        />

        {/* Search & Kelas Filter */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama atau NIS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <CustomDropdown
            value={kelasFilter}
            onChange={setKelasFilter}
            options={kelasOptions}
            className="w-full sm:w-48"
            placeholder="Pilih Kelas..."
          />
        </div>
      </div>

      {/* Sticky Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-blue-200 bg-white p-3 shadow-lg xl:bottom-4 animate-in fade-in slide-in-from-bottom duration-200">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">
              {selectedIds.length} siswa dipilih
            </p>
            {hiddenSelected > 0 && (
              <p className="text-xs font-medium text-amber-700">
                {hiddenSelected} di antaranya tidak terlihat akibat filter aktif
              </p>
            )}
          </div>

          <Button size="sm" variant="primary" onClick={onLuluskanSelected}>
            Luluskan ({selectedIds.length})
          </Button>
          <Button size="sm" variant="dangerSoft" onClick={onBulkDelete}>
            Hapus
          </Button>
          {onClearSelection && (
            <Button size="sm" variant="outline" onClick={onClearSelection}>
              Batal pilih
            </Button>
          )}
        </div>
      )}

      {/* Konten Daftar Siswa */}
      {loading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : pageRows.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs sm:text-sm font-semibold text-slate-700">
            Tidak ada siswa ditemukan
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Coba sesuaikan kata kunci pencarian atau ubah filter kelas/status.
          </p>
        </div>
      ) : (
        <>
          {/* Tampilan Kartu untuk Mobile & Tablet (< xl) */}
          <div className="xl:hidden space-y-2.5">
            {pageRows.map((s) => {
              const isSelected = selectedSet.has(s.id);
              const isExempt = isExemptActive(s.medical_exemption_until);

              return (
                <div
                  key={s.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isSelected
                      ? "border-blue-300 bg-blue-50/40 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <label className="-ml-1.5 -mt-1 grid h-10 w-10 shrink-0 cursor-pointer place-items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectSiswa(s.id)}
                        className="h-5 w-5 accent-blue-600 rounded cursor-pointer"
                        aria-label={`Pilih ${s.nama}`}
                      />
                    </label>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {s.nama}
                        </span>
                        {s.status === "Alumni" && (
                          <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-slate-100 text-slate-600 border border-slate-200">
                            Alumni
                          </span>
                        )}
                        {isExempt && (
                          <span
                            className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1"
                            title={`Dispensasi medis sampai ${s.medical_exemption_until}`}
                          >
                            <Activity className="w-3 h-3" /> Dispensasi
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 mt-0.5">
                        NIS: <span className="font-mono">{s.nis}</span> &bull;{" "}
                        {s.kelas} &bull; {s.jenis_kelamin || "Laki-laki"}
                      </p>

                      <div className="mt-1.5 flex items-center gap-2">
                        {s.terdaftar ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {s.sample_count
                              ? `${s.sample_count} Sampel`
                              : "Terdaftar"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                            Belum Ada Wajah
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2 border-t border-slate-100 pt-2.5">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Edit2 className="h-3.5 w-3.5" />}
                      onClick={() => onEdit(s)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Camera className="h-3.5 w-3.5" />}
                      onClick={() => onReRecord(s)}
                    >
                      {s.terdaftar ? "Rekam Ulang" : "Rekam Wajah"}
                    </Button>
                    <div className="ml-auto">
                      <ActionMenu
                        title={s.nama}
                        subtitle={`NIS: ${s.nis} • ${s.kelas}`}
                        items={rowActions(s)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tampilan Tabel untuk Layar Lebar (>= xl) */}
          <div className="hidden xl:block overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 accent-blue-600 rounded cursor-pointer"
                      aria-label="Pilih semua siswa di halaman ini"
                    />
                  </th>
                  <SortableTh
                    sortKey="nis"
                    currentKey={sortKey}
                    direction={sortDir}
                    onSort={onSort}
                    className="p-3"
                  >
                    NIS
                  </SortableTh>
                  <SortableTh
                    sortKey="nama"
                    currentKey={sortKey}
                    direction={sortDir}
                    onSort={onSort}
                    className="p-3"
                  >
                    Nama Siswa
                  </SortableTh>
                  <SortableTh
                    sortKey="kelas"
                    currentKey={sortKey}
                    direction={sortDir}
                    onSort={onSort}
                    className="p-3"
                  >
                    Kelas
                  </SortableTh>
                  <SortableTh
                    sortKey="status"
                    currentKey={sortKey}
                    direction={sortDir}
                    onSort={onSort}
                    className="p-3"
                  >
                    Status
                  </SortableTh>
                  <th className="p-3">Biometrik Wajah</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.map((s) => {
                  const isSelected = selectedSet.has(s.id);
                  const isExempt = isExemptActive(s.medical_exemption_until);

                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isSelected ? "bg-blue-50/30" : ""
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectSiswa(s.id)}
                          className="h-4 w-4 accent-blue-600 rounded cursor-pointer"
                          aria-label={`Pilih ${s.nama}`}
                        />
                      </td>
                      <td className="p-3 font-mono font-semibold text-slate-700">
                        {s.nis}
                      </td>
                      <td className="p-3">
                        <p className="font-bold text-slate-900">{s.nama}</p>
                        <p className="text-[11px] text-slate-400">
                          {s.jenis_kelamin || "Laki-laki"}
                        </p>
                      </td>
                      <td className="p-3 font-semibold text-slate-700">
                        {s.kelas}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            s.status === "Alumni"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {s.status || "Aktif"}
                        </span>
                      </td>
                      <td className="p-3">
                        {s.terdaftar ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                            <span>
                              {s.sample_count
                                ? `${s.sample_count} Sampel`
                                : "Terdaftar"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-rose-600 font-semibold">
                            <span>Belum Terdaftar</span>
                          </div>
                        )}
                        {isExempt && (
                          <div
                            className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200"
                            title={`Dispensasi medis sampai ${s.medical_exemption_until}`}
                          >
                            <Activity className="w-3 h-3" /> Dispensasi
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            icon={<Edit2 className="h-3.5 w-3.5" />}
                            onClick={() => onEdit(s)}
                          >
                            Edit
                          </Button>
                          <ActionMenu
                            title={s.nama}
                            subtitle={`NIS: ${s.nis} • ${s.kelas}`}
                            items={rowActions(s)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <DashboardPagination variant="footer" {...paging} />
        </>
      )}
    </div>
  );
}
