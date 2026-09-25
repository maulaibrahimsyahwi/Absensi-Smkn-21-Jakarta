import React, { useState, useMemo } from "react";
import {
  Inbox,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Laptop,
} from "lucide-react";
import { getJurusanInfo } from "../../../constants/schoolData";

export default function PresensiHarianTab({
  filteredHarian = [],
  paginatedHarian = [],
  periodeMode,
  namaBulanTerpilih,
  selectedTahun,
}) {
  const [sortKey, setSortKey] = useState("waktu");
  const [sortDirection, setSortDirection] = useState("desc");

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const displayList = useMemo(() => {
    const list = [...paginatedHarian];
    return list.sort((a, b) => {
      let valA = a[sortKey] ?? "";
      let valB = b[sortKey] ?? "";
      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
      return sortDirection === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
  }, [paginatedHarian, sortKey, sortDirection]);

  const getStatusBadge = (status) => {
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

  return (
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
          displayList.map((item, index) => {
            const jurInfo = getJurusanInfo(item.kelas) || {
              badge: "bg-slate-100 text-slate-700 border-slate-200",
              kode: item.kelas,
            };
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
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex-shrink-0 ${getStatusBadge(
                      item.status,
                    )}`}
                  >
                    {item.status?.includes("(PJJ)") && (
                      <Laptop className="w-3 h-3 text-indigo-600 flex-shrink-0" />
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
              <th
                onClick={() => handleSort("waktu")}
                className="py-3.5 px-6 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                title="Urutkan Waktu Presensi"
              >
                <div className="flex items-center gap-1.5">
                  <span>Waktu Presensi</span>
                  {sortKey === "waktu" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-blue-600" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-300" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort("nama")}
                className="py-3.5 px-6 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                title="Urutkan Nama Siswa"
              >
                <div className="flex items-center gap-1.5">
                  <span>Nama Siswa</span>
                  {sortKey === "nama" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-blue-600" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-300" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort("kelas")}
                className="py-3.5 px-6 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                title="Urutkan Kelas"
              >
                <div className="flex items-center gap-1.5">
                  <span>Kelas</span>
                  {sortKey === "kelas" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-blue-600" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-300" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort("status")}
                className="py-3.5 px-6 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                title="Urutkan Status Kehadiran"
              >
                <div className="flex items-center gap-1.5">
                  <span>Status Kehadiran</span>
                  {sortKey === "status" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-blue-600" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-300" />
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredHarian.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-12 text-center text-slate-400">
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
              displayList.map((item, index) => {
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
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusBadge(
                          item.status,
                        )}`}
                      >
                        {item.status?.includes("(PJJ)") && (
                          <Laptop className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
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
