import React, { useMemo } from "react";
import { Inbox, Clock, Laptop } from "lucide-react";
import { useTableSort } from "../../../hooks/useTableSort";
import SortableTh from "../../ui/SortableTh";

export interface PresensiHarianItem {
  id?: number;
  nama: string;
  kelas: string;
  waktu: string;
  status: string;
  [key: string]: unknown;
}

interface PresensiHarianTabProps {
  filteredHarian?: PresensiHarianItem[];
  paginatedHarian?: PresensiHarianItem[];
  startIndex?: number;
  endIndex?: number;
  periodeMode?: "bulan" | "tahun" | string;
  namaBulanTerpilih?: string;
  selectedTahun?: number;
}

export default function PresensiHarianTab({
  filteredHarian = [],
  paginatedHarian = [],
  startIndex,
  endIndex,
  periodeMode,
  namaBulanTerpilih,
  selectedTahun,
}: PresensiHarianTabProps) {
  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filteredHarian,
    "waktu",
    "desc",
    ["waktu"],
  );

  const displayList = useMemo(() => {
    if (endIndex !== undefined) {
      return sorted.slice(startIndex ?? 0, endIndex);
    }
    return paginatedHarian.length > 0 ? paginatedHarian : sorted;
  }, [sorted, startIndex, endIndex, paginatedHarian]);

  const getStatusBadge = (status?: string) => {
    const s = status || "";
    if (s.includes("(PJJ)")) {
      return s.includes("Terlambat")
        ? "bg-amber-50 text-amber-800 border-amber-300"
        : "bg-indigo-50 text-indigo-700 border-indigo-200";
    }
    if (s === "Tepat Waktu") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (s === "Terlambat") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (s === "Sakit") {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  const sortProps = { sortKey, sortDir, onSort };

  return (
    <div>
      {/* 1. Mobile & Tablet Portrait Cards View (< lg) */}
      <div className="divide-y divide-slate-100 md:grid md:grid-cols-2 md:gap-3 md:divide-y-0 md:p-3 lg:hidden">
        {filteredHarian.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-400 p-4">
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
          displayList.map((item, index) => {
            return (
              <div
                key={item.id || index}
                className="p-4 hover:bg-slate-50/60 transition-colors bg-white md:rounded-2xl md:border md:border-slate-200"
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
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${getStatusBadge(
                      item.status,
                    )}`}
                  >
                    {item.status?.includes("(PJJ)") && (
                      <Laptop className="w-3 h-3 text-indigo-600 shrink-0" />
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

      {/* 2. Desktop Table View (>= lg) */}
      <div className="hidden max-h-[calc(100dvh-18rem)] overflow-auto lg:block">
        <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[580px]">
          <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(226,232,240)]">
            <tr className="border-b border-slate-200 bg-slate-50">
              <SortableTh
                label="Waktu Presensi"
                field="waktu"
                {...sortProps}
              />
              <SortableTh label="Nama Siswa" field="nama" {...sortProps} />
              <SortableTh label="Kelas" field="kelas" {...sortProps} />
              <SortableTh
                label="Status Kehadiran"
                field="status"
                {...sortProps}
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredHarian.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400">
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
                </td>
              </tr>
            ) : (
              displayList.map((item, index) => {
                return (
                  <tr
                    key={item.id || index}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3.5 px-6 font-mono text-slate-500 whitespace-nowrap">
                      {item.waktu}
                    </td>
                    <td className="py-3.5 px-6 font-bold text-slate-900">
                      {item.nama}
                    </td>
                    <td className="py-3.5 px-6 text-slate-600 font-medium">
                      {item.kelas}
                    </td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(
                          item.status,
                        )}`}
                      >
                        {item.status?.includes("(PJJ)") && (
                          <Laptop className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        )}
                        <span>{item.status}</span>
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
  );
}
