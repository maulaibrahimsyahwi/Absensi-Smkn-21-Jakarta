import React from "react";
import {
  Inbox,
  Clock,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  Mail,
} from "lucide-react";
import { getJurusanInfo } from "../../../constants/schoolData";

export default function PresensiHarianTab({
  filteredHarian = [],
  paginatedHarian = [],
  periodeMode,
  namaBulanTerpilih,
  selectedTahun,
}) {
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
          paginatedHarian.map((item, index) => {
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
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${jurInfo.badge}`}
                      >
                        {jurInfo.kode}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex-shrink-0 ${
                      item.status === "Tepat Waktu"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : item.status === "Terlambat"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : item.status === "Sakit"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    {item.status === "Tepat Waktu" && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    )}
                    {item.status === "Terlambat" && (
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                    )}
                    {item.status === "Sakit" && (
                      <HeartPulse className="w-3 h-3 text-rose-600" />
                    )}
                    {item.status === "Izin" && (
                      <Mail className="w-3 h-3 text-blue-600" />
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
              <th className="py-3.5 px-6">Waktu Presensi</th>
              <th className="py-3.5 px-6">Nama Siswa</th>
              <th className="py-3.5 px-6">Kelas</th>
              <th className="py-3.5 px-6">Status Kehadiran</th>
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
              paginatedHarian.map((item, index) => {
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
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          item.status === "Tepat Waktu"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : item.status === "Terlambat"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : item.status === "Sakit"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
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
