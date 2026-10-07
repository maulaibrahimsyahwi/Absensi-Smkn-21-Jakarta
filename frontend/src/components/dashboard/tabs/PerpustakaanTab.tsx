import React, { useMemo } from "react";
import { Inbox, Clock, BookOpen } from "lucide-react";
import { getJurusanInfo } from "../../../constants/schoolData";
import { useTableSort } from "../../../hooks/useTableSort";
import SortableTh from "../../ui/SortableTh";

export interface PerpustakaanItem {
  id?: number;
  nama: string;
  kelas: string;
  keperluan: string;
  waktu: string;
  [key: string]: unknown;
}

interface PerpustakaanTabProps {
  filteredPerpus?: PerpustakaanItem[];
  paginatedPerpus?: PerpustakaanItem[];
  startIndex?: number;
  endIndex?: number;
  periodeMode?: "bulan" | "tahun" | string;
  namaBulanTerpilih?: string;
  selectedTahun?: number;
}

export default function PerpustakaanTab({
  filteredPerpus = [],
  paginatedPerpus = [],
  startIndex,
  endIndex,
  periodeMode,
  namaBulanTerpilih,
  selectedTahun,
}: PerpustakaanTabProps) {
  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filteredPerpus,
    "waktu",
    "desc",
    ["waktu"],
  );

  const displayList = useMemo(() => {
    if (endIndex !== undefined) {
      return sorted.slice(startIndex ?? 0, endIndex);
    }
    return paginatedPerpus.length > 0 ? paginatedPerpus : sorted;
  }, [sorted, startIndex, endIndex, paginatedPerpus]);

  const sortProps = { sortKey, sortDir, onSort };

  return (
    <div>
      {/* 1. Mobile & Tablet Portrait Cards View (< lg) */}
      <div className="divide-y divide-slate-100 md:grid md:grid-cols-2 md:gap-3 md:divide-y-0 md:p-3 lg:hidden">
        {filteredPerpus.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-400 p-4">
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
          displayList.map((item, index) => {
            const jurInfo = getJurusanInfo(item.kelas) || {
              badge: "bg-slate-100 text-slate-700 border-slate-200",
              kode: item.kelas,
            };
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
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${jurInfo.badge}`}
                      >
                        {jurInfo.kode}
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-indigo-200 bg-indigo-50 text-indigo-700 shrink-0">
                    <BookOpen className="w-3 h-3 text-indigo-600" />
                    <span>Perpus</span>
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/60 text-xs mb-2">
                  <span className="text-slate-400 text-[11px] block mb-0.5">
                    Keperluan
                  </span>
                  <p className="font-semibold text-slate-800">
                    {item.keperluan}
                  </p>
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
        <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[640px]">
          <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(226,232,240)]">
            <tr className="border-b border-slate-200 bg-slate-50">
              <SortableTh
                label="Waktu Kunjungan"
                field="waktu"
                {...sortProps}
              />
              <SortableTh label="Nama Siswa" field="nama" {...sortProps} />
              <SortableTh label="Kelas" field="kelas" {...sortProps} />
              <SortableTh
                label="Keperluan Kunjungan"
                field="keperluan"
                {...sortProps}
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPerpus.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400">
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
              displayList.map((item, index) => {
                const jurInfo = getJurusanInfo(item.kelas) || {
                  badge: "bg-slate-100 text-slate-700 border-slate-200",
                  kode: item.kelas,
                };
                return (
                  <tr
                    key={item.id || index}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-4 px-6 text-slate-600 font-medium font-mono text-xs whitespace-nowrap">
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
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${jurInfo.badge}`}
                        >
                          {jurInfo.kode}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      {item.keperluan}
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
