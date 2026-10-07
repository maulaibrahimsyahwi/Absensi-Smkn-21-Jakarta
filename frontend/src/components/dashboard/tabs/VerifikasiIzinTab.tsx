import React, { useMemo } from "react";
import { Inbox, Eye, MapPin } from "lucide-react";
import { useTableSort } from "../../../hooks/useTableSort";
import { useNewIds } from "../../../hooks/useNewIds";
import Button from "../../ui/Button";
import SortableTh from "../../ui/SortableTh";
import type { AksiVerifikasi } from "../../../services/izinService";
import type { PengajuanIzinItem } from "../../../types";

interface VerifikasiIzinTabProps {
  filteredPengajuan?: PengajuanIzinItem[];
  paginatedPengajuan?: PengajuanIzinItem[];
  startIndex?: number;
  endIndex?: number;
  statusIzinFilter: string;
  verifyingId?: number | null;
  onVerifikasi: (id: number, status: AksiVerifikasi) => void;
  onOpenRejectModal: (item: PengajuanIzinItem) => void;
  onOpenSuratModal: (item: PengajuanIzinItem) => void;
}

const STATUS = {
  Menunggu: {
    pill: "bg-amber-50 text-amber-800 border-amber-200",
    bar: "border-l-amber-400",
  },
  Disetujui: {
    pill: "bg-emerald-50 text-emerald-800 border-emerald-200",
    bar: "border-l-emerald-400",
  },
  Ditolak: {
    pill: "bg-rose-50 text-rose-800 border-rose-200",
    bar: "border-l-rose-400",
  },
} as const;

export default function VerifikasiIzinTab({
  filteredPengajuan = [],
  paginatedPengajuan = [],
  startIndex,
  endIndex,
  statusIzinFilter,
  verifyingId,
  onVerifikasi,
  onOpenRejectModal,
  onOpenSuratModal,
}: VerifikasiIzinTabProps) {
  const { sorted, sortKey, sortDir, onSort } = useTableSort(
    filteredPengajuan,
    "created_at",
    "desc",
    ["created_at", "tanggal_mulai"],
  );

  const displayList = useMemo(() => {
    if (endIndex !== undefined) {
      return sorted.slice(startIndex ?? 0, endIndex);
    }
    return paginatedPengajuan.length > 0 ? paginatedPengajuan : sorted;
  }, [sorted, startIndex, endIndex, paginatedPengajuan]);

  const ids = useMemo(
    () => filteredPengajuan.map((p) => p.id),
    [filteredPengajuan],
  );
  const fresh = useNewIds(ids);

  const sortProps = { sortKey, sortDir, onSort };

  return (
    <div>
      {/* 1. Mobile & Tablet Portrait Cards View (< lg) */}
      <div className="divide-y divide-slate-100 md:grid md:grid-cols-2 md:gap-3 md:divide-y-0 md:p-3 lg:hidden">
        {filteredPengajuan.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-400 p-4">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2 stroke-1" />
            <p className="font-semibold text-slate-600 text-sm">
              Tidak Ada Pengajuan Izin / Sakit
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {statusIzinFilter !== "ALL"
                ? `Tidak ada pengajuan dengan status '${statusIzinFilter}'.`
                : "Belum ada pengajuan izin yang dikirimkan oleh siswa/orang tua."}
            </p>
          </div>
        ) : (
          displayList.map((item) => {
            const tone =
              STATUS[item.status_pengajuan as keyof typeof STATUS] ??
              STATUS.Ditolak;
            const isMenunggu = item.status_pengajuan === "Menunggu";
            const busy = verifyingId === item.id;
            const mapsHref =
              item.latitude && item.longitude
                ? item.maps_url ||
                  `https://www.google.com/maps?q=${item.latitude},${item.longitude}`
                : null;

            return (
              <article
                key={item.id}
                className={`space-y-3 border-l-4 bg-white p-4 md:rounded-2xl md:border md:border-l-4 md:border-slate-200 transition-colors ${
                  tone.bar
                } ${fresh.has(item.id) ? "animate-flash" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {item.nama}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <span className="font-mono">{item.nis}</span> &middot;{" "}
                      <span className="font-semibold text-slate-700">
                        {item.kelas}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${tone.pill}`}
                  >
                    {item.status_pengajuan}
                  </span>
                </div>

                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                  <dt className="text-slate-500">Jenis</dt>
                  <dd className="text-right font-bold text-slate-800">
                    {item.jenis}
                  </dd>
                  <dt className="text-slate-500">Periode</dt>
                  <dd className="text-right font-semibold text-slate-800">
                    {item.tanggal_mulai} s/d {item.tanggal_selesai}
                  </dd>
                </dl>

                <p className="rounded-xl bg-slate-50 p-3 text-sm italic leading-relaxed text-slate-700 break-words">
                  "{item.alasan}"
                </p>
                {item.catatan_guru && (
                  <p className="text-xs text-slate-600">
                    <span className="font-bold text-slate-700">
                      Catatan guru:
                    </span>{" "}
                    {item.catatan_guru}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {item.surat_bukti ? (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Eye className="h-3.5 w-3.5" />}
                      onClick={() => onOpenSuratModal(item)}
                    >
                      Lihat bukti
                    </Button>
                  ) : (
                    <span className="text-xs italic text-slate-400">
                      Tanpa lampiran foto
                    </span>
                  )}
                  {mapsHref && (
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="press inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 hover:bg-blue-100 lg:min-h-9"
                    >
                      <MapPin className="h-3.5 w-3.5" /> Lokasi
                    </a>
                  )}
                </div>

                {isMenunggu && (
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                    <Button
                      variant="dangerSoft"
                      disabled={busy}
                      onClick={() => onOpenRejectModal(item)}
                    >
                      Tolak
                    </Button>
                    <Button
                      variant="success"
                      loading={busy}
                      onClick={() => onVerifikasi(item.id, "Disetujui")}
                    >
                      Setujui
                    </Button>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* 2. Desktop Table View (>= lg) */}
      <div className="hidden max-h-[calc(100dvh-18rem)] overflow-auto lg:block">
        <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[920px]">
          <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(226,232,240)]">
            <tr className="border-b border-slate-200 bg-slate-50">
              <SortableTh
                label="Waktu Pengajuan"
                field="created_at"
                {...sortProps}
              />
              <SortableTh label="Siswa" field="nama" {...sortProps} />
              <SortableTh
                label="Jenis"
                field="jenis"
                align="center"
                {...sortProps}
              />
              <SortableTh
                label="Periode"
                field="tanggal_mulai"
                {...sortProps}
              />
              <SortableTh label="Alasan" field="alasan" {...sortProps} />
              <th className="px-4 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Bukti
              </th>
              <th className="px-4 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Lokasi GPS
              </th>
              <SortableTh
                label="Status"
                field="status_pengajuan"
                align="center"
                {...sortProps}
              />
              <th className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Verifikasi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPengajuan.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center">
                    <Inbox className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
                    <p className="font-semibold text-slate-600 text-sm">
                      Tidak Ada Pengajuan Izin / Sakit
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {statusIzinFilter !== "ALL"
                        ? `Tidak ada pengajuan dengan status '${statusIzinFilter}'.`
                        : "Belum ada pengajuan izin yang dikirimkan oleh siswa/orang tua."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              displayList.map((item) => {
                const isMenunggu = item.status_pengajuan === "Menunggu";
                const isDisetujui = item.status_pengajuan === "Disetujui";
                const busy = verifyingId === item.id;
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      fresh.has(item.id) ? "animate-flash" : ""
                    }`}
                  >
                    <td className="py-4 px-4 text-slate-500 font-medium whitespace-nowrap text-xs">
                      {item.created_at || "-"}
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-bold text-slate-900">{item.nama}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-semibold text-slate-700">
                          {item.kelas}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-mono text-slate-400">
                          {item.nis}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          item.jenis === "Sakit"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                      >
                        {item.jenis}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-700 whitespace-nowrap font-medium">
                      <div>{item.tanggal_mulai}</div>
                      <div className="text-[11px] text-slate-400">
                        s/d {item.tanggal_selesai}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-700 min-w-[200px] max-w-[300px]">
                      <div>"{item.alasan}"</div>
                      {item.catatan_guru && (
                        <div className="text-[11px] text-slate-600 mt-1.5 flex items-start gap-1 bg-amber-50/70 border border-amber-200/60 p-1.5 rounded-lg">
                          <span className="font-bold text-amber-900 shrink-0">
                            Catatan:
                          </span>
                          <span className="break-words">
                            {item.catatan_guru}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      {item.surat_bukti ? (
                        <button
                          type="button"
                          onClick={() => onOpenSuratModal(item)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Bukti</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          -
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      {item.latitude && item.longitude ? (
                        <a
                          href={
                            item.maps_url ||
                            `https://www.google.com/maps?q=${item.latitude},${item.longitude}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200/70 transition-colors"
                          title={`Koordinat: ${item.latitude}, ${item.longitude}`}
                        >
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                          <span>Maps</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          -
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          isMenunggu
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : isDisetujui
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-rose-50 text-rose-800 border-rose-200"
                        }`}
                      >
                        <span>{item.status_pengajuan}</span>
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      {isMenunggu ? (
                        <div className="inline-flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="dangerSoft"
                            disabled={busy}
                            onClick={() => onOpenRejectModal(item)}
                          >
                            Tolak
                          </Button>
                          <Button
                            size="sm"
                            variant="success"
                            loading={busy}
                            onClick={() => onVerifikasi(item.id, "Disetujui")}
                          >
                            Setujui
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">
                          Selesai
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
