import React from "react";
import {
  Inbox,
  Clock,
  Printer,
  LogIn,
  LogOut,
  Trash2,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { getJurusanInfo } from "../../../constants/schoolData";

export default function IzinPiketTab({
  filteredIzinPiket = [],
  paginatedIzinPiket = [],
  onOpenSlipModal,
  onDeleteIzin,
}) {
  return (
    <div>
      {/* 1. Mobile Cards View (< md) */}
      <div className="md:hidden divide-y divide-slate-100">
        {filteredIzinPiket.length === 0 ? (
          <div className="py-12 text-center text-slate-400 p-4">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2 stroke-1" />
            <p className="font-semibold text-slate-600 text-sm">
              Tidak Ada Data Izin Meja Piket
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Belum ada surat izin masuk atau keluar yang diterbitkan dari meja
              piket pada periode ini.
            </p>
          </div>
        ) : (
          paginatedIzinPiket.map((item) => {
            const jurInfo = getJurusanInfo(item.kelas) || {
              badge: "bg-slate-100 text-slate-700 border-slate-200",
              kode: item.kelas,
            };
            const isMasuk = item.tipe === "Izin Masuk";

            return (
              <div
                key={item.id}
                className="p-4 hover:bg-slate-50/60 transition-colors space-y-3"
              >
                {/* Header Card */}
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

                  {/* Badge Tipe */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex-shrink-0 ${
                      isMasuk
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {isMasuk ? (
                      <LogIn className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <LogOut className="w-3 h-3 text-amber-600" />
                    )}
                    <span>{item.tipe}</span>
                  </span>
                </div>

                {/* Details Box */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">
                      Jam Pelajaran:
                    </span>
                    <span className="font-bold text-slate-800">
                      {item.jam_ke}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">
                      Hari / Tanggal:
                    </span>
                    <span className="font-semibold text-slate-700">
                      {item.hari}, {item.tanggal_formatted || item.tanggal}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">
                      Petugas Piket:
                    </span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-indigo-600" />
                      {item.petugas_piket}
                    </span>
                  </div>
                  <div className="pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 font-medium block mb-0.5">
                      Alasan:
                    </span>
                    <p className="italic text-slate-700 bg-white p-2 rounded-lg border border-slate-200/50">
                      "{item.alasan}"
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onOpenSlipModal && onOpenSlipModal(item)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak E-Slip</span>
                  </button>
                  {onDeleteIzin && (
                    <button
                      type="button"
                      onClick={() => onDeleteIzin(item.id, item.nama)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Hapus Izin"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. Desktop Table View (>= md) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-4 w-12 text-center">No</th>
              <th className="py-3 px-4">Siswa</th>
              <th className="py-3 px-4">Keperluan</th>
              <th className="py-3 px-4">Jam Ke-</th>
              <th className="py-3 px-4">Hari / Tanggal</th>
              <th className="py-3 px-4">Alasan</th>
              <th className="py-3 px-4">Petugas Piket</th>
              <th className="py-3 px-4 text-center w-28">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredIzinPiket.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-12 text-center text-slate-400">
                  <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2 stroke-1" />
                  <p className="font-semibold text-slate-600 text-sm">
                    Tidak Ada Surat Izin Meja Piket
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Belum ada surat izin yang diterbitkan dari meja guru piket.
                  </p>
                </td>
              </tr>
            ) : (
              paginatedIzinPiket.map((item, idx) => {
                const jurInfo = getJurusanInfo(item.kelas) || {
                  badge: "bg-slate-100 text-slate-700 border-slate-200",
                  kode: item.kelas,
                };
                const isMasuk = item.tipe === "Izin Masuk";

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Siswa */}
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-slate-900 leading-tight">
                          {item.nama}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-mono">
                            NIS {item.nis}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[10px] font-bold text-slate-700">
                            {item.kelas}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Keperluan Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          isMasuk
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                      >
                        {isMasuk ? (
                          <LogIn className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <span>{item.tipe}</span>
                        )}
                      </span>
                    </td>

                    {/* Jam Ke- */}
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {item.jam_ke}
                    </td>

                    {/* Hari & Tanggal */}
                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                      <div className="font-semibold">{item.hari}</div>
                      <div className="text-[10px] text-slate-400">
                        {item.tanggal_formatted || item.tanggal}
                      </div>
                    </td>

                    {/* Alasan */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <p
                        className="text-slate-700 italic truncate"
                        title={item.alasan}
                      >
                        "{item.alasan}"
                      </p>
                    </td>

                    {/* Petugas Piket */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-slate-800 font-medium">
                        <span
                          className="truncate max-w-[120px]"
                          title={item.petugas_piket}
                        >
                          {item.petugas_piket}
                        </span>
                      </div>
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenSlipModal && onOpenSlipModal(item)
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer"
                          title="Cetak E-Slip Resmi"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteIzin && (
                          <button
                            type="button"
                            onClick={() => onDeleteIzin(item.id, item.nama)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Surat Izin"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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
