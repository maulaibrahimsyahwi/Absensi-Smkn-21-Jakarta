import React from "react";
import {
  Inbox,
  Clock,
  CheckCircle2,
  X,
  Eye,
  MapPin,
  Loader2,
  Check,
} from "lucide-react";
import { getJurusanInfo } from "../../../constants/schoolData";

export default function VerifikasiIzinTab({
  filteredPengajuan = [],
  paginatedPengajuan = [],
  statusIzinFilter,
  verifyingId,
  onVerifikasi,
  onOpenRejectModal,
  onOpenSuratModal,
}) {
  return (
    <div>
      {/* 1. Mobile Cards View (< md) */}
      <div className="md:hidden divide-y divide-slate-100">
        {filteredPengajuan.length === 0 ? (
          <div className="py-12 text-center text-slate-400 p-4">
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
          paginatedPengajuan.map((item) => {
            const jurInfo = getJurusanInfo(item.kelas) || {
              badge: "bg-slate-100 text-slate-700 border-slate-200",
              kode: item.kelas,
            };
            const isMenunggu = item.status_pengajuan === "Menunggu";
            const isDisetujui = item.status_pengajuan === "Disetujui";
            return (
              <div
                key={item.id}
                className="p-4 hover:bg-slate-50/60 transition-colors space-y-3"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">
                      {item.nama}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-slate-400 font-mono">
                        NIS: {item.nis}
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

                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex-shrink-0 ${
                      isMenunggu
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : isDisetujui
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-rose-50 text-rose-800 border-rose-200"
                    }`}
                  >
                    {isMenunggu && (
                      <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                    )}
                    {isDisetujui && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    )}
                    {!isMenunggu && !isDisetujui && (
                      <X className="w-3 h-3 text-rose-600" />
                    )}
                    <span>{item.status_pengajuan}</span>
                  </span>
                </div>

                {/* Details Box */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Jenis</span>
                    <span
                      className={`font-bold px-2 py-0.2 rounded-md ${
                        item.jenis === "Sakit"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.jenis === "Sakit" ? "Sakit" : "Izin"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Periode</span>
                    <span className="font-semibold text-slate-800">
                      {item.tanggal_mulai} s/d {item.tanggal_selesai}
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
                  {item.catatan_guru && (
                    <div className="pt-1 border-t border-slate-200/40 text-slate-600 text-xs">
                      <span className="font-bold text-slate-700">
                        Catatan Guru
                      </span>{" "}
                      {item.catatan_guru}
                    </div>
                  )}
                  {item.latitude && item.longitude && (
                    <div className="pt-1.5 border-t border-slate-200/40 flex items-center justify-between">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span>Lokasi </span>
                      </span>
                      <a
                        href={
                          item.maps_url ||
                          `https://www.google.com/maps?q=${item.latitude},${item.longitude}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200/70 transition-colors"
                      >
                        <MapPin className="w-3 h-3 text-blue-600" />
                        <span> Maps</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Surat & Actions */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  {item.surat_bukti ? (
                    <button
                      type="button"
                      onClick={() => onOpenSuratModal(item)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200/70 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lihat Bukti</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">
                      Tanpa lampiran foto
                    </span>
                  )}

                  {isMenunggu && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={verifyingId === item.id}
                        onClick={() => onVerifikasi(item.id, "Disetujui")}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                      >
                        {verifyingId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span>Setujui</span>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={verifyingId === item.id}
                        onClick={() => onOpenRejectModal(item)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                      >
                        <span>Tolak</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. Desktop Table View (>= md) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[920px]">
          <thead>
            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-5">Waktu Pengajuan</th>
              <th className="py-3.5 px-5">Siswa</th>
              <th className="py-3.5 px-4 text-center">Jenis</th>
              <th className="py-3.5 px-5">Periode</th>
              <th className="py-3.5 px-5 min-w-[200px] max-w-[300px]">
                Alasan
              </th>
              <th className="py-3.5 px-4 text-center">Surat Bukti</th>
              <th className="py-3.5 px-4 text-center">Lokasi GPS</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-5 text-right">Verifikasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPengajuan.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-12 text-center text-slate-400">
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
              paginatedPengajuan.map((item) => {
                const isMenunggu = item.status_pengajuan === "Menunggu";
                const isDisetujui = item.status_pengajuan === "Disetujui";
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-4 px-5 text-slate-500 font-medium whitespace-nowrap text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.created_at}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div>
                        <p className="font-bold text-slate-900">{item.nama}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-semibold text-slate-700">
                            {item.kelas}
                          </span>
                        </div>
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
                        {item.jenis === "Sakit" ? "Sakit" : "Izin"}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-700 whitespace-nowrap font-medium">
                      <div>{item.tanggal_mulai}</div>
                      <div className="text-[11px] text-slate-400">
                        s/d {item.tanggal_selesai}
                      </div>
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-700 min-w-[200px] max-w-[300px]">
                      <div className="whitespace-normal break-words leading-relaxed bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70 font-medium text-slate-800 shadow-2xs">
                        "{item.alasan}"
                      </div>
                      {item.catatan_guru && (
                        <div className="text-[11px] text-slate-600 mt-1.5 flex items-start gap-1 bg-amber-50/70 border border-amber-200/60 p-1.5 rounded-lg">
                          <span className="font-bold text-amber-900 flex-shrink-0">
                            Catatan
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
                          <span>Lihat Foto</span>
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
                          <button
                            type="button"
                            disabled={verifyingId === item.id}
                            onClick={() => onVerifikasi(item.id, "Disetujui")}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                          >
                            {verifyingId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Setujui</span>
                          </button>
                          <button
                            type="button"
                            disabled={verifyingId === item.id}
                            onClick={() => onOpenRejectModal(item)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">
                          Selesai diverifikasi
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
