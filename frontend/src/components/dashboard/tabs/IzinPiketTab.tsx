import React, { useMemo } from "react";
import { Inbox, Printer, LogIn, LogOut, Trash2 } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useTableSort } from "../../../hooks/useTableSort";
import Button from "../../ui/Button";
import SortableTh from "../../ui/SortableTh";
import type { IzinPiketItem } from "../../../types";

interface IzinPiketTabProps {
  filteredIzinPiket?: IzinPiketItem[];
  paginatedIzinPiket?: IzinPiketItem[];
  startIndex?: number;
  endIndex?: number;
  onOpenSlipModal?: (item: IzinPiketItem) => void;
  onDeleteIzin?: (id: number, nama: string) => void;
}

export default function IzinPiketTab({
  filteredIzinPiket = [],
  paginatedIzinPiket = [],
  startIndex,
  endIndex,
  onOpenSlipModal,
  onDeleteIzin,
}: IzinPiketTabProps) {
  const { isAdmin } = useAuth();
  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filteredIzinPiket,
    "id",
    "desc",
    ["id", "tanggal", "jam_ke"],
  );

  const displayList = useMemo(() => {
    if (endIndex !== undefined) {
      return sorted.slice(startIndex ?? 0, endIndex);
    }
    return paginatedIzinPiket.length > 0 ? paginatedIzinPiket : sorted;
  }, [sorted, startIndex, endIndex, paginatedIzinPiket]);

  const sortProps = { sortKey, sortDir, onSort };

  return (
    <div>
      {/* 1. Mobile & Tablet Portrait Cards View (< lg) */}
      <div className="divide-y divide-slate-100 md:grid md:grid-cols-2 md:gap-3 md:divide-y-0 md:p-3 lg:hidden">
        {filteredIzinPiket.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-400 p-4">
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
          displayList.map((item) => {
            const isMasuk = item.tipe === "Izin Masuk";

            return (
              <article
                key={item.id}
                className="p-4 hover:bg-slate-50/60 transition-colors space-y-3 bg-white md:rounded-2xl md:border md:border-slate-200"
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
                    </div>
                  </div>

                  {/* Badge Tipe */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${
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
                      Jam Pelajaran
                    </span>
                    <span className="font-bold text-slate-800">
                      Jam ke-{item.jam_ke}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Hari, Tanggal</span>
                    <span className="font-semibold text-slate-800">
                      {item.hari}, {item.tanggal_formatted || item.tanggal}
                    </span>
                  </div>
                  <div className="pt-1 border-t border-slate-200/40">
                    <span className="text-slate-500 font-medium block mb-0.5">
                      Alasan
                    </span>
                    <p className="text-slate-800 italic bg-white p-2.5 rounded-lg border border-slate-200/50 whitespace-normal break-words leading-relaxed text-xs">
                      "{item.alasan}"
                    </p>
                  </div>
                  <div className="pt-1 border-t border-slate-200/40 flex items-center justify-between text-slate-500 text-[11px]">
                    <span>Petugas Piket</span>
                    <span className="font-semibold text-slate-700">
                      {item.petugas_piket}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Printer className="w-3.5 h-3.5" />}
                    onClick={() => onOpenSlipModal && onOpenSlipModal(item)}
                  >
                    Cetak Slip
                  </Button>
                  {isAdmin && onDeleteIzin && (
                    <Button
                      size="sm"
                      variant="dangerSoft"
                      icon={<Trash2 className="w-3.5 h-3.5" />}
                      aria-label="Hapus surat izin"
                      onClick={() => onDeleteIzin(item.id, item.nama)}
                    >
                      Hapus
                    </Button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* 2. Desktop Table View (>= lg) */}
      <div className="hidden max-h-[calc(100dvh-18rem)] overflow-auto lg:block">
        <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[760px]">
          <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(226,232,240)]">
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="py-3.5 px-4 text-center w-12 font-bold uppercase tracking-wider text-[11px] text-slate-500">
                No
              </th>
              <SortableTh label="Siswa" field="nama" {...sortProps} />
              <SortableTh
                label="Jenis Izin"
                field="tipe"
                align="center"
                {...sortProps}
              />
              <SortableTh
                label="Jam Ke-"
                field="jam_ke"
                align="center"
                {...sortProps}
              />
              <SortableTh
                label="Hari & Tanggal"
                field="tanggal"
                {...sortProps}
              />
              <SortableTh label="Alasan" field="alasan" {...sortProps} />
              <SortableTh
                label="Petugas Piket"
                field="petugas_piket"
                {...sortProps}
              />
              <th className="py-3.5 px-4 text-center w-28 font-bold uppercase tracking-wider text-[11px] text-slate-500">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredIzinPiket.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center">
                    <Inbox className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
                    <p className="font-semibold text-slate-600 text-sm">
                      Tidak Ada Data Izin Meja Piket
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Belum ada surat izin yang diterbitkan dari meja guru piket.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              displayList.map((item, idx) => {
                const isMasuk = item.tipe === "Izin Masuk";

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                      {(startIndex ?? 0) + idx + 1}
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
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
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
                    </td>

                    {/* Jam Ke- */}
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
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
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      <span
                        className="truncate max-w-[120px] block"
                        title={item.petugas_piket}
                      >
                        {item.petugas_piket}
                      </span>
                    </td>

                    {/* Aksi */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenSlipModal && onOpenSlipModal(item)
                          }
                          className="press inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer"
                          title="Cetak E-Slip Resmi"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Slip</span>
                        </button>
                        {isAdmin && onDeleteIzin && (
                          <button
                            type="button"
                            onClick={() => onDeleteIzin(item.id, item.nama)}
                            className="press p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Surat Izin (Khusus Admin)"
                            aria-label={`Hapus izin ${item.nama}`}
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
