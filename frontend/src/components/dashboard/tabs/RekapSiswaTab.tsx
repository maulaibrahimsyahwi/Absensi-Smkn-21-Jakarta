import React, { useMemo } from "react";
import { Inbox } from "lucide-react";
import { getJurusanInfo } from "../../../constants/schoolData";
import { useTableSort } from "../../../hooks/useTableSort";
import SortableTh from "../../ui/SortableTh";

export interface RekapSiswaItem {
  siswa_id: number;
  nama: string;
  nis: string;
  kelas: string;
  tepat_waktu: number;
  terlambat: number;
  sakit?: number;
  izin?: number;
  total_hadir: number;
  kunjungan_perpus: number;
  [key: string]: unknown;
}

interface RekapSiswaTabProps {
  filteredSiswa?: RekapSiswaItem[];
  paginatedSiswa?: RekapSiswaItem[];
  startIndex?: number;
  endIndex?: number;
}

function AttendanceBar({
  tepat,
  telat,
  sakit,
  izin,
}: {
  tepat: number;
  telat: number;
  sakit: number;
  izin: number;
}) {
  const total = tepat + telat + sakit + izin;
  const seg = [
    { v: tepat, c: "bg-emerald-500", l: "Tepat waktu" },
    { v: telat, c: "bg-amber-400", l: "Terlambat" },
    { v: sakit, c: "bg-rose-400", l: "Sakit" },
    { v: izin, c: "bg-blue-400", l: "Izin" },
  ];

  return (
    <div
      role="img"
      aria-label={seg.map((s) => `${s.l} ${s.v}`).join(", ")}
      className="flex h-2 overflow-hidden rounded-full bg-slate-100"
    >
      {total > 0 &&
        seg.map(
          (s) =>
            s.v > 0 && (
              <span
                key={s.l}
                className={s.c}
                style={{ width: `${(s.v / total) * 100}%` }}
              />
            ),
        )}
    </div>
  );
}

export default function RekapSiswaTab({
  filteredSiswa = [],
  paginatedSiswa = [],
  startIndex,
  endIndex,
}: RekapSiswaTabProps) {
  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filteredSiswa,
    "nama",
    "asc",
    [
      "tepat_waktu",
      "terlambat",
      "sakit",
      "izin",
      "total_hadir",
      "kunjungan_perpus",
    ],
  );

  const displayList = useMemo(() => {
    if (endIndex !== undefined) {
      return sorted.slice(startIndex ?? 0, endIndex);
    }
    return paginatedSiswa.length > 0 ? paginatedSiswa : sorted;
  }, [sorted, startIndex, endIndex, paginatedSiswa]);

  const sortProps = { sortKey, sortDir, onSort };

  return (
    <div>
      {/* 1. Mobile & Tablet Portrait Cards View (< lg) */}
      <div className="divide-y divide-slate-100 md:grid md:grid-cols-2 md:gap-3 md:divide-y-0 md:p-3 lg:hidden">
        {filteredSiswa.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-400 p-4">
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
                className="p-4 hover:bg-slate-50/60 transition-colors bg-white md:rounded-2xl md:border md:border-slate-200 space-y-3"
              >
                {/* Header Kartu: Nama & Status */}
                <div className="flex items-start justify-between gap-2">
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
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                      Aktif
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 shrink-0">
                      Belum ada presensi
                    </span>
                  )}
                </div>

                {/* Batang Proporsi Kehadiran */}
                <AttendanceBar
                  tepat={item.tepat_waktu}
                  telat={item.terlambat}
                  sakit={item.sakit || 0}
                  izin={item.izin || 0}
                />

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

      {/* 2. Desktop Table View (>= lg) */}
      <div className="hidden max-h-[calc(100dvh-18rem)] overflow-auto lg:block">
        <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[760px]">
          <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(226,232,240)]">
            <tr className="border-b border-slate-200 bg-slate-50">
              <SortableTh label="Siswa" field="nama" {...sortProps} />
              <SortableTh label="Kelas" field="kelas" {...sortProps} />
              <SortableTh
                label="Tepat Waktu"
                field="tepat_waktu"
                align="center"
                {...sortProps}
              />
              <SortableTh
                label="Terlambat"
                field="terlambat"
                align="center"
                {...sortProps}
              />
              <SortableTh
                label="Sakit"
                field="sakit"
                align="center"
                {...sortProps}
              />
              <SortableTh
                label="Izin"
                field="izin"
                align="center"
                {...sortProps}
              />
              <SortableTh
                label="Total Hadir"
                field="total_hadir"
                align="center"
                {...sortProps}
              />
              <SortableTh
                label="Kunjungan Perpus"
                field="kunjungan_perpus"
                align="center"
                {...sortProps}
              />
              <th className="py-3.5 px-6 text-right font-bold uppercase tracking-wider text-[11px] text-slate-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSiswa.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
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
                const jurInfo = getJurusanInfo(item.kelas) || {
                  badge: "bg-slate-100 text-slate-700 border-slate-200",
                  kode: item.kelas,
                };
                return (
                  <tr
                    key={item.siswa_id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3.5 px-6">
                      <p className="font-bold text-slate-900">{item.nama}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        NIS {item.nis}
                      </p>
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">
                          {item.kelas}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${jurInfo.badge}`}
                        >
                          {jurInfo.kode}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                      {item.tepat_waktu}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-amber-700">
                      {item.terlambat}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-rose-700">
                      {item.sakit || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-blue-700">
                      {item.izin || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-slate-900">
                        {item.total_hadir}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-1">
                        Hari
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-indigo-700">
                        {item.kunjungan_perpus}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      {isAktif ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          Belum ada presensi
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
