import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  CheckCheck,
  X,
  ChevronRight,
  FileText,
} from "lucide-react";

/**
 * NotificationDropdown Component
 *
 * Komponen dropdown lonceng notifikasi interaktif di pojok kanan atas.
 * Menampilkan status persetujuan atau penolakan surat izin/sakit murid secara elegan.
 */
export default function NotificationDropdown({
  notifications = [],
  dismissedIds = [],
  onDismiss,
  onDismissAll,
  variant = "header", // "header" (di dalam hero banner biru) | "navbar" (di navbar putih)
  align = "right",
  role = "siswa", // "siswa" | "piket" | "admin"
  onNavigate,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isPiket = role === "piket" || role === "admin";

  // Filter notifikasi yang belum ditandai dibaca
  const unreadList = useMemo(() => {
    return notifications.filter((item) => {
      // Status 'Menunggu' selalu informatif, tapi hanya Disetujui/Ditolak yang bisa di-dismiss
      if (item.status_pengajuan === "Menunggu") return true;
      return !dismissedIds.includes(item.id);
    });
  }, [notifications, dismissedIds]);

  // Jumlah unread:
  // Untuk piket/guru: jumlah pengajuan siswa yang berstatus 'Menunggu' verifikasi
  // Untuk siswa: jumlah pengajuan yang sudah berstatus final (Disetujui / Ditolak) yang belum di-dismiss
  const unreadCount = useMemo(() => {
    if (isPiket) {
      return notifications.filter(
        (item) => item.status_pengajuan === "Menunggu",
      ).length;
    }
    return notifications.filter(
      (item) =>
        (item.status_pengajuan === "Disetujui" ||
          item.status_pengajuan === "Ditolak") &&
        !dismissedIds.includes(item.id),
    ).length;
  }, [notifications, dismissedIds, isPiket]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  // Styling tombol pemicu lonceng berdasarkan varian
  const buttonClasses =
    variant === "header"
      ? `relative p-2.5 rounded-2xl backdrop-blur-md transition-colors duration-150 cursor-pointer border ${
          isOpen
            ? "bg-white text-blue-900 shadow-md border-white"
            : "bg-white/15 hover:bg-white/25 text-white border-white/20 shadow-xs"
        }`
      : `relative p-2 rounded-xl border transition-colors duration-150 cursor-pointer ${
          isOpen
            ? "bg-blue-50 text-blue-600 border-blue-300 shadow-xs"
            : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200"
        }`;

  return (
    <div ref={dropdownRef} className="relative inline-block text-left z-50">
      {/* Tombol Lonceng Pemicu */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Pemberitahuan Status Surat Izin / Sakit"
        className={buttonClasses}
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" />

        {/* Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-md ring-2 ring-white animate-in zoom-in-75">
            {unreadCount > 9 ? "9+" : unreadCount}
            <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" />
          </span>
        )}
      </button>

      {/* Popover Dropdown Notifikasi */}
      {isOpen && (
        <div
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } mt-2 w-[calc(100vw-2.5rem)] max-w-sm sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-[60] text-slate-900`}
        >
          {/* Header Dropdown */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-50 to-blue-50/40 border-b border-slate-200/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                  {isPiket
                    ? "Verifikasi Izin & Sakit Siswa"
                    : "Status Surat Izin / Sakit"}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {isPiket
                    ? "Daftar pengajuan izin mandiri siswa"
                    : "Pemberitahuan resmi verifikasi sekolah"}
                </p>
              </div>
            </div>

            {unreadCount > 0 && onDismissAll && !isPiket && (
              <button
                type="button"
                onClick={() => {
                  onDismissAll();
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex-shrink-0"
                title="Tandai semua surat sebagai sudah dibaca"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tandai Dibaca</span>
              </button>
            )}
          </div>

          {/* Daftar Notifikasi */}
          <div className="max-h-80 sm:max-h-96 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <FileText className="w-9 h-9 mx-auto mb-2 text-slate-300 stroke-1" />
                <p className="text-xs font-semibold text-slate-600">
                  {isPiket
                    ? "Belum Ada Pengajuan Siswa"
                    : "Belum Ada Pengajuan Surat"}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isPiket
                    ? "Surat izin atau sakit yang diajukan siswa akan tampil di sini untuk ditinjau."
                    : "Surat izin/sakit yang Anda ajukan akan muncul di sini beserta status verifikasinya."}
                </p>
              </div>
            ) : unreadList.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-xs font-semibold text-slate-700">
                  {isPiket
                    ? "Semua Pengajuan Telah Ditinjau"
                    : "Semua Pemberitahuan Telah Dibaca"}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isPiket
                    ? "Tidak ada pengajuan izin siswa yang sedang menunggu verifikasi."
                    : "Tidak ada pemberitahuan baru yang membutuhkan perhatian Anda."}
                </p>
              </div>
            ) : (
              unreadList.map((notif) => {
                const isDisetujui = notif.status_pengajuan === "Disetujui";
                const isDitolak = notif.status_pengajuan === "Ditolak";
                const isMenunggu = notif.status_pengajuan === "Menunggu";

                return (
                  <div
                    key={notif.id}
                    className={`p-3.5 transition-colors ${
                      isDisetujui
                        ? "bg-emerald-50/40 hover:bg-emerald-50/80"
                        : isDitolak
                          ? "bg-rose-50/40 hover:bg-rose-50/80"
                          : "bg-amber-50/40 hover:bg-amber-50/80"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Icon Status */}
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs ${
                          isDisetujui
                            ? "bg-emerald-600 text-white"
                            : isDitolak
                              ? "bg-rose-600 text-white"
                              : "bg-amber-500 text-white"
                        }`}
                      >
                        {isDisetujui && <CheckCircle2 className="w-4 h-4" />}
                        {isDitolak && <AlertCircle className="w-4 h-4" />}
                        {isMenunggu && (
                          <Clock className="w-4 h-4 animate-pulse" />
                        )}
                      </div>

                      {/* Konten Keterangan Notifikasi */}
                      <div className="flex-1 min-w-0 space-y-1 text-left">
                        {/* Jika piket/guru, tampilkan nama siswa dan kelas */}
                        {isPiket && (
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-extrabold text-slate-900 truncate">
                              {notif.nama || "Siswa"}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                              {notif.kelas || "-"}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className={`text-xs font-bold leading-tight ${
                              isDisetujui
                                ? "text-emerald-800"
                                : isDitolak
                                  ? "text-rose-800"
                                  : "text-amber-800"
                            }`}
                          >
                            {isDisetujui &&
                              (isPiket
                                ? "Telah Disetujui"
                                : "Surat Telah DISETUJUI")}
                            {isDitolak &&
                              (isPiket
                                ? "Pengajuan Ditolak"
                                : "Pengajuan DITOLAK")}
                            {isMenunggu &&
                              (isPiket
                                ? "Menunggu Verifikasi Guru"
                                : "Menunggu Verifikasi Guru")}
                          </span>

                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                              isDisetujui
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : isDitolak
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {notif.jenis}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 font-medium">
                          Periode:{" "}
                          <span className="font-semibold text-slate-800">
                            {notif.tanggal_mulai} s/d {notif.tanggal_selesai}
                          </span>
                        </p>

                        {notif.alasan && (
                          <p className="text-[11px] text-slate-500 italic line-clamp-2">
                            "{notif.alasan}"
                          </p>
                        )}

                        {/* Catatan Khusus dari Guru Penegur / Piket */}
                        {notif.catatan_guru && !isPiket && (
                          <div className="p-2 rounded-lg bg-white/90 border border-slate-200/80 text-[11px] text-slate-700 mt-1">
                            <span className="font-bold text-slate-900 block mb-0.5">
                              Catatan Pihak Sekolah:
                            </span>
                            <span className="italic text-slate-800">
                              "{notif.catatan_guru}"
                            </span>
                          </div>
                        )}

                        {/* Aksi Khusus Guru Piket untuk item Menunggu */}
                        {isPiket && isMenunggu && (
                          <div className="pt-1.5 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-amber-700 font-medium">
                              Perlu persetujuan piket
                            </span>
                            {onNavigate && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsOpen(false);
                                  onNavigate();
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-md shadow-2xs transition-all cursor-pointer"
                              >
                                <span>Tinjau di Meja Piket</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Tombol Aksi per Item untuk Siswa */}
                        {!isMenunggu && !isPiket && onDismiss && (
                          <div className="pt-1.5 flex justify-end">
                            <button
                              type="button"
                              onClick={() => onDismiss(notif.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs transition-all cursor-pointer"
                            >
                              <span>Tandai Dibaca</span>
                              <X className="w-3 h-3 text-slate-400" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
