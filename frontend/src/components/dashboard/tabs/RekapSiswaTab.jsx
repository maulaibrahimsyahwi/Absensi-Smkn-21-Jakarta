import React, { useState, useMemo } from "react";
import { Inbox, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { getJurusanInfo } from "../../../constants/schoolData";

export default function RekapSiswaTab({
  filteredSiswa = [],
  paginatedSiswa = [],
}) {
  const [sortKey, setSortKey] = useState("nama");
  const [sortDirection, setSortDirection] = useState("asc");

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "nama" || key === "kelas" ? "asc" : "desc");
    }
  };

  const displayList = useMemo(() => {
    const list = [...paginatedSiswa];
    return list.sort((a, b) => {
      let valA = a[sortKey] ?? 0;
      let valB = b[sortKey] ?? 0;
      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
      return sortDirection === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
  }, [paginatedSiswa, sortKey, sortDirection]);

  return (
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
          displayList.map((item) => {
            const isAktif = item.total_hadir > 0;
            const jurInfo = getJurusanInfo(item.kelas) || {
              badge: "bg-slate-100 text-slate-700 border-slate-200",
              kode: item.kelas,
            };
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
                        NIS {item.nis}
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

                {/* 6 Kotak Metrik Akumulasi Kehadiran */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-2 border-t border-slate-100 text-center">
                  <div className="bg-emerald-50/70 border border-emerald-100/80 rounded-xl p-1.5">
                    <span className="text-[10px] text-emerald-700 font-medium block">
                      Tepat
                    </span>
                    <span className="text-xs font-black text-emerald-800">
                      {item.tepat_waktu}
                    </span>
                  </div>
                  <div className="bg-amber-50/70 border border-amber-100/80 rounded-xl p-1.5">
                    <span className="text-[10px] text-amber-700 font-medium block">
                      Telat
                    </span>
                    <span className="text-xs font-black text-amber-800">
                      {item.terlambat}
                    </span>
                  </div>
                  <div className="bg-rose-50/70 border border-rose-100/80 rounded-xl p-1.5">
                    <span className="text-[10px] text-rose-700 font-medium block">
                      Sakit
                    </span>
                    <span className="text-xs font-black text-rose-800">
                      {item.sakit || 0}
                    </span>
                  </div>
                  <div className="bg-amber-50/70 border border-amber-100/80 rounded-xl p-1.5">
                    <span className="text-[10px] text-amber-700 font-medium block">
                      Izin
                    </span>
                    <span className="text-xs font-black text-amber-800">
                      {item.izin || 0}
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
                      {item.kunjungan_perpus}
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
        <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[760px]">
          <thead>
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <th
                onClick={() => handleSort("nama")}
                className="py-3.5 px-6 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                title="Urutkan Nama Siswa"
              >
                <div className="flex items-center gap-1.5">
                  <span>Siswa</span>
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
                onClick={() => handleSort("tepat_waktu")}
                className="py-3.5 px-4 text-center cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                title="Urutkan Tepat Waktu"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Tepat Waktu</span>
                  {sortKey === "tepat_waktu" ? (
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
                onClick={() => handleSort("terlambat")}
                className="py-3.5 px-4 text-center cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                title="Urutkan Terlambat"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Terlambat</span>
                  {sortKey === "terlambat" ? (
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
                onClick={() => handleSort("sakit")}
                className="py-3.5 px-4 text-center cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                title="Urutkan Sakit"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Sakit</span>
                  {sortKey === "sakit" ? (
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
                onClick={() => handleSort("izin")}
                className="py-3.5 px-4 text-center cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                title="Urutkan Izin"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Izin</span>
                  {sortKey === "izin" ? (
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
                onClick={() => handleSort("total_hadir")}
                className="py-3.5 px-4 text-center cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                title="Urutkan Total Hadir"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Total Hadir</span>
                  {sortKey === "total_hadir" ? (
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
                onClick={() => handleSort("kunjungan_perpus")}
                className="py-3.5 px-4 text-center cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                title="Urutkan Kunjungan Perpus"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Kunjungan Perpus</span>
                  {sortKey === "kunjungan_perpus" ? (
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
                onClick={() => handleSort("total_hadir")}
                className="py-3.5 px-6 text-right cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                title="Urutkan Status Aktivitas"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Status Aktivitas</span>
                  {sortKey === "total_hadir" ? (
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
            {filteredSiswa.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center">
                    <Inbox className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
                    <p className="font-semibold text-slate-600 text-sm">
                      Tidak Ada Data Siswa
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Belum ada siswa terdaftar atau tidak cocok dengan filter
                      pencarian.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              displayList.map((item) => {
                const isAktif = item.total_hadir > 0;
                return (
                  <tr
                    key={item.siswa_id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3.5 px-6">
                      <div>
                        <p className="font-bold text-slate-900">{item.nama}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          NIS {item.nis}
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
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-extrabold text-emerald-700 text-sm">
                        {item.tepat_waktu}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-extrabold text-amber-700 text-sm">
                        {item.terlambat}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-extrabold text-rose-600 text-sm">
                        {item.sakit || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-extrabold text-amber-600 text-sm">
                        {item.izin || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-extrabold text-slate-900 text-sm">
                        {item.total_hadir} Hari
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
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
  );
}
