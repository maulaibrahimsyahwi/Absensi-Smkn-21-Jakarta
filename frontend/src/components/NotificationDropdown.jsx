import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  CheckCheck,
  Check,
  Trash2,
  ChevronRight,
  FileText,
} from "lucide-react";

/**
 * NotificationDropdown Component
 *
 * Komponen dropdown lonceng notifikasi interaktif.
 * Mendukung fitur:
 * 1. "Tandai telah dibaca" (menghilangkan badge belum dibaca & mengubah tampilan, tetapi item tetap ada di riwayat)
 * 2. "Hapus notifikasi" (menghapus/membersihkan item dari daftar notifikasi)
 * 3. Aksi massal: "Tandai Semua Dibaca" & "Hapus Semua"
 */
export default function NotificationDropdown({
  notifications = [],
  dismissedIds: propDismissedIds,
  onDismiss: propOnDismiss,
  onDismissAll: propOnDismissAll,
  variant = "header", // "header" (hero banner) | "navbar" (navbar putih)
  align = "right",
  role = "siswa", // "siswa" | "piket" | "admin"
  userId,
  onNavigate,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isPiket = role === "piket" || role === "admin";

  const storageKeyRead = userId
    ? `smkn21_read_notifs_${role}_${userId}`
    : `smkn21_read_notifs_${role}`;
  const storageKeyDeleted = userId
    ? `smkn21_deleted_notifs_${role}_${userId}`
    : `smkn21_deleted_notifs_${role}`;

  // State notifikasi yang sudah dibaca (tetap ada di riwayat, badge hilang)
  const [readIds, setReadIds] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKeyRead);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // State notifikasi yang dihapus dari daftar
  const [deletedIds, setDeletedIds] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKeyDeleted);
      const initial = raw ? JSON.parse(raw) : [];
      // Backward compatibility dengan propDismissedIds jika ada
      if (Array.isArray(propDismissedIds)) {
        return Array.from(new Set([...initial, ...propDismissedIds]));
      }
      return initial;
    } catch {
      return propDismissedIds || [];
    }
  });

  // Sinkronisasi ke localStorage saat readIds berubah
  useEffect(() => {
    try {
      localStorage.setItem(storageKeyRead, JSON.stringify(readIds));
    } catch {
      // ignore
    }
  }, [readIds, storageKeyRead]);

  // Sinkronisasi ke localStorage saat deletedIds berubah
  useEffect(() => {
    try {
      localStorage.setItem(storageKeyDeleted, JSON.stringify(deletedIds));
    } catch {
      // ignore
    }
  }, [deletedIds, storageKeyDeleted]);

  // Filter notifikasi yang belum dihapus
  const visibleList = useMemo(() => {
    return notifications.filter((item) => !deletedIds.includes(item.id));
  }, [notifications, deletedIds]);

  // Menentukan apakah item tertentu belum dibaca
  const isItemUnread = (item) => {
    if (readIds.includes(item.id)) return false;
    if (isPiket) {
      return item.status_pengajuan === "Menunggu";
    }
    return (
      item.status_pengajuan === "Disetujui" ||
      item.status_pengajuan === "Ditolak"
    );
  };

  // Jumlah notifikasi unread
  const unreadCount = useMemo(() => {
    return visibleList.filter(isItemUnread).length;
  }, [visibleList, readIds, isPiket]);

  // Handler: Tandai satu notifikasi sebagai dibaca
  const handleMarkAsRead = (id) => {
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  // Handler: Tandai semua notifikasi sebagai dibaca
  const handleMarkAllAsRead = () => {
    const allIds = visibleList.map((item) => item.id);
    setReadIds((prev) => Array.from(new Set([...prev, ...allIds])));
  };

  // Handler: Hapus satu notifikasi dari daftar
  const handleDeleteNotif = (id) => {
    setDeletedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    if (propOnDismiss) {
      propOnDismiss(id);
    }
  };

  // Handler: Hapus semua notifikasi dari daftar
  const handleDeleteAllNotif = () => {
    const allIds = visibleList.map((item) => item.id);
    setDeletedIds((prev) => Array.from(new Set([...prev, ...allIds])));
    if (propOnDismissAll) {
      propOnDismissAll();
    }
  };

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

            {/* Aksi Massal Header */}
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex-shrink-0"
                  title="Tandai semua sebagai sudah dibaca"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Baca Semua</span>
                </button>
              )}

              {visibleList.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAllNotif}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer flex-shrink-0"
                  title="Hapus semua notifikasi dari daftar"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Hapus</span>
                </button>
              )}
            </div>
          </div>

          {/* Daftar Notifikasi */}
          <div className="max-h-80 sm:max-h-96 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {visibleList.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <FileText className="w-9 h-9 mx-auto mb-2 text-slate-300 stroke-1" />
                <p className="text-xs font-semibold text-slate-600">
                  {isPiket
                    ? "Belum Ada Pengajuan Siswa"
                    : "Tidak Ada Notifikasi"}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isPiket
                    ? "Surat izin atau sakit yang diajukan siswa akan tampil di sini untuk ditinjau."
                    : "Semua pemberitahuan surat izin dan kehadiran telah dibersihkan."}
                </p>
              </div>
            ) : (
              visibleList.map((notif) => {
                const isDisetujui = notif.status_pengajuan === "Disetujui";
                const isDitolak = notif.status_pengajuan === "Ditolak";
                const isMenunggu = notif.status_pengajuan === "Menunggu";
                const unread = isItemUnread(notif);

                return (
                  <div
                    key={notif.id}
                    className={`p-3.5 transition-colors border-l-4 ${
                      unread
                        ? isDisetujui
                          ? "bg-emerald-50/50 hover:bg-emerald-50/80 border-l-emerald-500 font-medium"
                          : isDitolak
                            ? "bg-rose-50/50 hover:bg-rose-50/80 border-l-rose-500 font-medium"
                            : "bg-amber-50/50 hover:bg-amber-50/80 border-l-amber-500 font-medium"
                        : "bg-white hover:bg-slate-50/80 border-l-transparent text-slate-600"
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

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {unread && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                                Baru
                              </span>
                            )}
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
                        </div>

                        <p className="text-[11px] text-slate-600 font-medium">
                          Periode{" "}
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
                              Catatan Pihak Sekolah
                            </span>
                            <span className="italic text-slate-800">
                              "{notif.catatan_guru}"
                            </span>
                          </div>
                        )}

                        {/* Aksi Khusus Guru Piket untuk item Menunggu */}
                        {isPiket && isMenunggu && onNavigate && (
                          <div className="pt-1.5 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-amber-700 font-medium">
                              Perlu persetujuan piket
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setIsOpen(false);
                                onNavigate();
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-md shadow-2xs transition-all cursor-pointer"
                            >
                              <span>Tinjau</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {/* Tombol Aksi per Item: Tandai Dibaca & Hapus */}
                        <div className="pt-2 flex items-center justify-end gap-1.5 border-t border-slate-100/60 mt-1.5">
                          {unread && (
                            <button
                              type="button"
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50/70 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md shadow-2xs transition-all cursor-pointer"
                              title="Tandai notifikasi ini telah dibaca"
                            >
                              <Check className="w-3 h-3 text-blue-600" />
                              <span>Tandai Dibaca</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteNotif(notif.id)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-2 py-0.5 rounded-md shadow-2xs transition-all cursor-pointer"
                            title="Hapus notifikasi ini"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        </div>
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
