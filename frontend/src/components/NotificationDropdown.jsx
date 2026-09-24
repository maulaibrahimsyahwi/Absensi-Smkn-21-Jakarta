import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  Trash2,
  ChevronRight,
  FileText,
  Wifi,
  ShieldAlert,
  AlertTriangle,
  Ticket,
  BookOpen,
  UserCheck,
} from "lucide-react";

/**
 * Format string tanggal / waktu ke teks lokal yang rapi & bersahabat
 */
function formatWaktu(waktuStr) {
  if (!waktuStr) return "";
  try {
    const d = new Date(waktuStr.replace(" ", "T"));
    if (isNaN(d.getTime())) return waktuStr;
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    const timeFormatted = d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (isToday) {
      return `Hari ini, ${timeFormatted} WIB`;
    }
    return `${d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    })}, ${timeFormatted} WIB`;
  } catch {
    return waktuStr;
  }
}

/**
 * Mengambil styling warna kartu, ikon, dan badge berdasarkan kategori notifikasi
 */
function getCategoryStyles(notif, unread) {
  const cat =
    notif.category ||
    (notif.status_pengajuan === "Disetujui"
      ? "success"
      : notif.status_pengajuan === "Ditolak"
        ? "danger"
        : notif.status_pengajuan === "Menunggu"
          ? "warning"
          : "info");

  switch (cat) {
    case "success":
      return {
        cardBg: unread
          ? "bg-emerald-50/70 hover:bg-emerald-50/90 border-l-emerald-500 font-medium"
          : "bg-white hover:bg-slate-50/80 border-l-transparent text-slate-600",
        iconBg: "bg-emerald-600 text-white",
        titleColor: "text-emerald-950",
        badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
      };
    case "danger":
      return {
        cardBg: unread
          ? "bg-rose-50/70 hover:bg-rose-50/90 border-l-rose-500 font-medium"
          : "bg-white hover:bg-slate-50/80 border-l-transparent text-slate-600",
        iconBg: "bg-rose-600 text-white",
        titleColor: "text-rose-950",
        badgeBg: "bg-rose-100 text-rose-800 border-rose-200",
      };
    case "warning":
      return {
        cardBg: unread
          ? "bg-amber-50/70 hover:bg-amber-50/90 border-l-amber-500 font-medium"
          : "bg-white hover:bg-slate-50/80 border-l-transparent text-slate-600",
        iconBg: "bg-amber-500 text-white",
        titleColor: "text-amber-950",
        badgeBg: "bg-amber-100 text-amber-800 border-amber-200",
      };
    case "info":
    default:
      return {
        cardBg: unread
          ? "bg-blue-50/70 hover:bg-blue-50/90 border-l-blue-500 font-medium"
          : "bg-white hover:bg-slate-50/80 border-l-transparent text-slate-600",
        iconBg: "bg-blue-600 text-white",
        titleColor: "text-blue-950",
        badgeBg: "bg-blue-100 text-blue-800 border-blue-200",
      };
  }
}

/**
 * Memilih ikon yang sesuai dengan tipe notifikasi
 */
function renderNotifIcon(notif) {
  if (notif.type === "pjj") {
    return <Wifi className="w-4 h-4" />;
  }
  if (notif.type === "pelanggaran") {
    return <ShieldAlert className="w-4 h-4" />;
  }
  if (notif.type === "milestone") {
    return <AlertTriangle className="w-4 h-4" />;
  }
  if (notif.type === "piket") {
    return <Ticket className="w-4 h-4" />;
  }
  if (notif.type === "perpus") {
    return <BookOpen className="w-4 h-4" />;
  }
  if (notif.type === "presensi") {
    return <Clock className="w-4 h-4" />;
  }
  if (notif.type === "akun") {
    return <UserCheck className="w-4 h-4" />;
  }

  // Fallback pengajuan izin/sakit
  if (notif.category === "success" || notif.status_pengajuan === "Disetujui") {
    return <CheckCircle2 className="w-4 h-4" />;
  }
  if (notif.category === "danger" || notif.status_pengajuan === "Ditolak") {
    return <AlertCircle className="w-4 h-4" />;
  }
  return <Clock className="w-4 h-4" />;
}

/**
 * Komponen Notifikasi yang Mendukung Gesture Slide (Geser Kiri: Baca, Geser Kanan: Hapus)
 */
function SwipeableNotificationItem({
  notif,
  unread,
  isPiket,
  onMarkAsRead,
  onDelete,
  onActionClick,
  onNavigate,
  setIsOpen,
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [isRemoving, setIsRemoving] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0, locked: null });

  const styles = getCategoryStyles(notif, unread);
  const isDisetujui = notif.status_pengajuan === "Disetujui";
  const isDitolak = notif.status_pengajuan === "Ditolak";
  const isMenunggu = notif.status_pengajuan === "Menunggu";

  // Touch Handlers untuk HP & Tablet
  const handleTouchStart = (e) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      locked: null,
    };
  };

  const handleTouchMove = (e) => {
    if (isRemoving) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartRef.current.x;
    const diffY = currentY - touchStartRef.current.y;

    // Deteksi arah dominan pertama kali
    if (touchStartRef.current.locked === null) {
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        if (Math.abs(diffX) > Math.abs(diffY)) {
          touchStartRef.current.locked = "horizontal";
        } else {
          touchStartRef.current.locked = "vertical";
        }
      }
    }

    if (touchStartRef.current.locked === "horizontal") {
      if (e.cancelable) e.preventDefault();
      // Batasi jarak geser maksimum 110px
      const clampedX = Math.max(-110, Math.min(110, diffX));
      setOffsetX(clampedX);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartRef.current.locked === "horizontal") {
      if (offsetX > 55) {
        // Slide ke kanan -> Hapus Notifikasi
        setIsRemoving(true);
        setTimeout(() => {
          onDelete(notif.id);
        }, 220);
      } else if (offsetX < -55) {
        // Slide ke kiri -> Tandai Dibaca
        if (unread) {
          onMarkAsRead(notif.id);
        }
        setOffsetX(0);
      } else {
        setOffsetX(0);
      }
    } else {
      setOffsetX(0);
    }
    touchStartRef.current = { x: 0, y: 0, locked: null };
  };

  const handleTouchCancel = () => {
    setOffsetX(0);
    touchStartRef.current = { x: 0, y: 0, locked: null };
  };

  return (
    <div className="relative overflow-hidden group">
      {/* Background Action Underlays untuk Gesture Slide di HP & Tablet */}
      <div className="absolute inset-0 flex items-center justify-between pointer-events-none select-none">
        {/* Kiri: Hapus (Merah, muncul saat digeser ke Kanan) */}
        <div
          className={`h-full w-1/2 bg-rose-500 flex items-center justify-start pl-4 gap-1.5 text-white font-bold text-xs transition-opacity duration-150 ${
            offsetX > 15 ? "opacity-100" : "opacity-0"
          }`}
        >
          <Trash2 className="w-4 h-4 text-white flex-shrink-0" />
          <span>Hapus</span>
        </div>

        {/* Kanan: Tandai Dibaca (Biru, muncul saat digeser ke Kiri) */}
        <div
          className={`h-full w-1/2 bg-blue-600 flex items-center justify-end pr-4 gap-1.5 text-white font-bold text-xs transition-opacity duration-150 ${
            offsetX < -15 ? "opacity-100" : "opacity-0"
          }`}
        >
          <span>Tandai Dibaca</span>
          <Check className="w-4 h-4 text-white flex-shrink-0" />
        </div>
      </div>

      {/* Front Card yang bergeser */}
      <div
        style={{
          transform: isRemoving
            ? "translateX(100%)"
            : `translateX(${offsetX}px)`,
          opacity: isRemoving ? 0 : 1,
          transition:
            isRemoving || offsetX === 0
              ? "transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.22s ease-out"
              : "none",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onClick={() => {
          if (unread) {
            onMarkAsRead(notif.id);
          }
        }}
        className={`relative p-3.5 transition-colors border-l-4 select-none cursor-pointer ${styles.cardBg}`}
      >
        <div className="flex items-start gap-2.5">
          {/* Icon Status */}
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs ${styles.iconBg}`}
          >
            {renderNotifIcon(notif)}
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
                className={`text-xs font-bold leading-tight ${styles.titleColor}`}
              >
                {notif.judul ||
                  (isDisetujui
                    ? isPiket
                      ? "Telah Disetujui"
                      : "Surat Telah DISETUJUI"
                    : isDitolak
                      ? isPiket
                        ? "Pengajuan Ditolak"
                        : "Pengajuan DITOLAK"
                      : "Menunggu Verifikasi Guru")}
              </span>

              <div className="flex items-center gap-1 flex-shrink-0">
                {unread && (
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                    Baru
                  </span>
                )}
                {(notif.badge || notif.jenis) && (
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase border ${styles.badgeBg}`}
                  >
                    {notif.badge || notif.jenis}
                  </span>
                )}
              </div>
            </div>

            {/* Pesan Utama Notifikasi */}
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              {notif.pesan ||
                (notif.tanggal_mulai ? (
                  <>
                    Periode{" "}
                    <span className="font-semibold text-slate-800">
                      {notif.tanggal_mulai} s/d {notif.tanggal_selesai}
                    </span>
                  </>
                ) : null)}
            </p>

            {/* Alasan legacy jika pesan tidak ada */}
            {notif.alasan && !notif.pesan && (
              <p className="text-[11px] text-slate-500 italic line-clamp-2">
                "{notif.alasan}"
              </p>
            )}

            {/* Catatan Khusus dari Guru Penegur / Piket */}
            {(notif.catatan || notif.catatan_guru) && !isPiket && (
              <div className="p-2 rounded-lg bg-white/90 border border-slate-200/80 text-[11px] text-slate-700 mt-1">
                <span className="font-bold text-slate-900 block mb-0.5">
                  Catatan Pihak Sekolah
                </span>
                <span className="italic text-slate-800">
                  "{notif.catatan || notif.catatan_guru}"
                </span>
              </div>
            )}

            {/* Timestamp waktu notifikasi */}
            {notif.waktu && (
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium pt-0.5">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{formatWaktu(notif.waktu)}</span>
              </div>
            )}

            {/* Tombol Aksi Cepat (misal: "Buka Presensi", "Daftar Wajah", dsb.) */}
            {notif.action_label && (
              <div className="pt-1.5 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-500 font-medium truncate">
                  {notif.type === "pjj"
                    ? "Presensi tanpa batasan lokasi"
                    : "Tindakan diperlukan"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    if (onActionClick) {
                      onActionClick(notif);
                    } else if (onNavigate) {
                      onNavigate(notif.action_url || notif);
                    }
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-md shadow-2xs transition-all cursor-pointer flex-shrink-0"
                >
                  <span>{notif.action_label}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
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
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * NotificationDropdown Component
 *
 * Komponen dropdown lonceng notifikasi interaktif multi-fitur.
 * Mendukung:
 * 1. Multi-fitur siswa: PJJ, Pelanggaran, E-Slip Meja Piket, Perpustakaan,
 *    Surat Izin/Sakit, Pengingat Presensi Pagi, Keamanan Akun/Wajah.
 * 2. Gesture slide di HP & Tablet: Slide Kanan -> Hapus, Slide Kiri -> Tandai Dibaca.
 * 3. Icon Check di tombol "Baca Semua" dihilangkan untuk tablet ke atas (sm:hidden).
 * 4. Aksi massal "Baca Semua" & "Hapus Semua".
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
  onActionClick,
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

  const [activeTab, setActiveTab] = useState("semua"); // "semua" | "unread"

  // Filter notifikasi yang belum dihapus
  const visibleList = useMemo(() => {
    return notifications.filter((item) => !deletedIds.includes(item.id));
  }, [notifications, deletedIds]);

  // Menentukan apakah item tertentu belum dibaca (sesuai kaidah notifikasi)
  const isItemUnread = useCallback(
    (item) => {
      if (readIds.includes(item.id)) return false;
      if (isPiket && item.status_pengajuan === "Menunggu") {
        return true;
      }
      return !readIds.includes(item.id);
    },
    [readIds, isPiket],
  );

  // Jumlah notifikasi unread
  const unreadCount = useMemo(() => {
    return visibleList.filter(isItemUnread).length;
  }, [visibleList, isItemUnread]);

  // Daftar notifikasi yang aktif ditampilkan sesuai filter Tab
  const displayedList = useMemo(() => {
    if (activeTab === "unread") {
      return visibleList.filter(isItemUnread);
    }
    return visibleList;
  }, [visibleList, activeTab, isItemUnread]);

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
        title={
          isPiket
            ? "Verifikasi Izin & Sakit Siswa"
            : "Pemberitahuan & Pusat Notifikasi Siswa"
        }
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

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-50 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Popover Dropdown Notifikasi */}
      {isOpen && (
        <div
          className={`max-sm:fixed max-sm:inset-x-3.5 max-sm:top-16 max-sm:w-auto max-sm:max-w-none sm:absolute ${
            align === "right" ? "sm:right-0" : "sm:left-0"
          } sm:top-full sm:mt-2 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-[60] text-slate-900`}
        >
          {/* Header Dropdown */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-50 to-blue-50/40 border-b border-slate-200/80">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">
                    {role === "admin"
                      ? "Pusat Notifikasi Administrator"
                      : role === "piket"
                        ? "Pusat Notifikasi Guru Piket"
                        : "Pusat Notifikasi Siswa"}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {isPiket
                      ? "Izin siswa menunggu, keterlambatan & dispensasi"
                      : "Pemberitahuan resmi sekolah & kehadiran"}
                  </p>
                </div>
              </div>

              {/* Aksi Massal Header */}
              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex-shrink-0"
                    title="Tandai semua sebagai sudah dibaca"
                  >
                    <Check className="w-3.5 h-3.5 md:hidden" />
                    <span>Baca Semua</span>
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

            {/* Tab Filter: Semua vs Belum Dibaca */}
            <div className="flex items-center gap-2 pt-3">
              <button
                type="button"
                onClick={() => setActiveTab("semua")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "semua"
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Semua{" "}
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                    {visibleList.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("unread")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "unread"
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>Belum Dibaca</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Daftar Notifikasi */}
          <div className="max-h-80 sm:max-h-96 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {displayedList.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <FileText className="w-9 h-9 mx-auto mb-2 text-slate-300 stroke-1" />
                <p className="text-xs font-semibold text-slate-600">
                  {activeTab === "unread"
                    ? "Semua Notifikasi Telah Dibaca"
                    : isPiket
                      ? "Belum Ada Aktivitas Piket"
                      : "Tidak Ada Notifikasi"}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {activeTab === "unread"
                    ? "Bagus! Tidak ada pemberitahuan baru yang memerlukan perhatian Anda."
                    : isPiket
                      ? "Izin yang menunggu verifikasi atau keterlambatan siswa hari ini akan tampil di sini."
                      : "Semua pemberitahuan sekolah dan aktivitas telah dibersihkan."}
                </p>
              </div>
            ) : (
              displayedList.map((notif) => (
                <SwipeableNotificationItem
                  key={notif.id}
                  notif={notif}
                  unread={isItemUnread(notif)}
                  isPiket={isPiket}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDeleteNotif}
                  onActionClick={onActionClick}
                  onNavigate={onNavigate}
                  setIsOpen={setIsOpen}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
