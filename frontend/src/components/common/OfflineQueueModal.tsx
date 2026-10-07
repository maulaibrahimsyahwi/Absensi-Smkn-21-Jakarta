import React, { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  RefreshCw,
  User,
  WifiOff,
  Wifi,
  AlertTriangle,
} from "lucide-react";
import Sheet, { SheetBody, SheetFooter, SheetHeader } from "../ui/Sheet";
import Button from "../ui/Button";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import {
  OfflineAttendanceEntry,
  syncOfflineQueueToServer,
  clearOfflineQueue,
  getOfflineQueue,
} from "../../services/offlineQueue";

const QUEUE_EVENTS = [
  "offline-attendance-queued",
  "offline-attendance-synced",
  "offline-attendance-cleared",
];

interface OfflineQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSynced?: (count: number) => void;
}

export default function OfflineQueueModal({
  isOpen,
  onClose,
  onSynced,
}: OfflineQueueModalProps) {
  const online = useOnlineStatus();
  const [queue, setQueue] = useState<OfflineAttendanceEntry[]>(() =>
    getOfflineQueue(),
  );
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const refresh = useCallback(() => setQueue(getOfflineQueue()), []);

  useEffect(() => {
    if (!isOpen) return;
    refresh();
    setStatus(null);
    setConfirmClear(false);
    QUEUE_EVENTS.forEach((e) => window.addEventListener(e, refresh));
    return () =>
      QUEUE_EVENTS.forEach((e) => window.removeEventListener(e, refresh));
  }, [isOpen, refresh]);

  const handleSync = async () => {
    setSyncing(true);
    setStatus(null);
    try {
      const res = await syncOfflineQueueToServer();
      if (res.success) {
        setStatus({
          type: "success",
          message: `${res.count ?? 0} presensi berhasil dikirim ke server.`,
        });
        refresh();
        if (onSynced && res.count) onSynced(res.count);
      } else {
        setStatus({
          type: "error",
          message:
            res.message || res.error || "Gagal menyinkronkan ke server.",
        });
      }
    } catch {
      setStatus({
        type: "error",
        message: "Terjadi kesalahan jaringan saat sinkronisasi.",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleClear = () => {
    clearOfflineQueue();
    refresh();
    setConfirmClear(false);
    setStatus({ type: "success", message: "Antrean offline dikosongkan." });
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      labelledBy="offline-queue-title"
    >
      <SheetHeader
        id="offline-queue-title"
        title="Buffer presensi offline"
        subtitle={`${queue.length} presensi menunggu dikirim`}
        onClose={onClose}
      />
      <SheetBody>
        <div
          className={`mb-3 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${
            online
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {online ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          <span>
            {online ? "Online, siap disinkronkan" : "Offline, menunggu jaringan"}
          </span>
        </div>

        {status && (
          <div
            role="status"
            className={`mb-3 flex items-start gap-2 rounded-xl border p-3 text-xs ${
              status.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{status.message}</span>
          </div>
        )}

        {queue.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-emerald-500/50" />
            <p className="text-sm font-semibold text-slate-700">
              Semua presensi sudah tersinkron
            </p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
              Tidak ada data tertunda di perangkat ini.
            </p>
          </div>
        ) : (
          <>
            <ul className="space-y-2 list-none p-0 m-0">
              {queue.map((item, idx) => (
                <li
                  key={item.id || idx}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-bold text-slate-900">
                      <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {item.nama || (item.mode === "kiosk" ? "Presensi Wajah Kiosk" : `Presensi Siswa (${item.expected_siswa_id || "Mandiri"})`)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      {item.nis ? <span className="font-mono">{item.nis}</span> : null}
                      <Clock className="h-3 w-3" />
                      {item.waktu || (item.captured_at ? new Date(item.captured_at).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" }) : "-")}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    {item.status || "Antrean Darurat"}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              disabled={syncing}
              className="mt-4 min-h-10 text-xs font-semibold text-slate-500 hover:text-rose-600 cursor-pointer"
            >
              Kosongkan antrean
            </button>
          </>
        )}
      </SheetBody>

      {confirmClear ? (
        <div className="space-y-2 border-t border-rose-100 bg-rose-50 px-5 py-3">
          <p className="text-sm font-semibold text-rose-900">
            Hapus {queue.length} presensi yang belum terkirim?
          </p>
          <p className="text-xs text-rose-700">
            Data ini hanya ada di perangkat ini dan tidak bisa dipulihkan.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setConfirmClear(false)}>
              Batal
            </Button>
            <Button variant="danger" onClick={handleClear}>
              Ya, hapus
            </Button>
          </div>
        </div>
      ) : (
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          <Button
            variant="primary"
            loading={syncing}
            disabled={!online || queue.length === 0}
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={handleSync}
          >
            {online ? "Sinkronkan" : "Menunggu jaringan"}
          </Button>
        </SheetFooter>
      )}
    </Sheet>
  );
}
