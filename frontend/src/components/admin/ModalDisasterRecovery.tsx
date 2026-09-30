import React, { useState, useEffect } from "react";
import {
  Database,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  HardDrive,
  Archive,
} from "lucide-react";
import api from "../../services/api";

interface BackupItem {
  filename: string;
  size_kb?: number;
  created_at?: string;
  modified_at?: string;
}

interface ModalDisasterRecoveryProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalDisasterRecovery({
  isOpen,
  onClose,
}: ModalDisasterRecoveryProps) {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/backup");
      if (res.data?.success) {
        setBackups(res.data.data?.backups || []);
      }
    } catch (err) {
      console.error("Gagal mengambil daftar backup:", err);
      setNotification({
        type: "error",
        message: "Gagal memuat riwayat backup database.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setNotification(null);
      fetchBackups();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateBackup = async () => {
    setCreating(true);
    setNotification(null);
    try {
      const res = await api.post("/admin/backup");
      if (res.data?.success) {
        setNotification({
          type: "success",
          message:
            res.data.message ||
            "Snapshot backup database SQLite berhasil dibuat!",
        });
        fetchBackups();
      } else {
        setNotification({
          type: "error",
          message: res.data?.message || "Gagal membuat backup database.",
        });
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Terjadi kesalahan saat memproses backup.";
      setNotification({
        type: "error",
        message: errorMsg,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = (filename: string) => {
    const downloadUrl = `/api/admin/backup/download/${encodeURIComponent(filename)}`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Modal */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              Disaster Recovery & Backup Database Otomatis
            </h3>
            <p className="text-xs text-purple-600 font-semibold mt-0.5">
              Penyimpanan Snapshot & Unduhan Off-Site Storage
            </p>
          </div>
        </div>

        {notification && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              notification.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-rose-50 border border-rose-200 text-rose-700"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Status Card Otomatisasi */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 rounded-2xl space-y-3 mb-5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-sm">
                  Auto-Backup Scheduler Aktif
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Sistem secara otomatis mengeksekusi backup database harian pada
                pukul <strong>02:00 WIB</strong> dengan retensi penyimpanan{" "}
                <strong>30 hari bergulir</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCreateBackup}
              disabled={creating}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer transition-all disabled:opacity-50 shrink-0"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Backup Sekarang</span>
              )}
            </button>
          </div>
        </div>

        {/* Tabel Riwayat File Backup */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Daftar Berkas Snapshot
            </h4>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs max-h-72 overflow-y-auto">
            {loading && backups.length === 0 ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                <span>Memuat riwayat backup...</span>
              </div>
            ) : backups.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Archive className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-600">
                  Belum ada berkas backup
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Klik "Backup Sekarang" untuk membuat cadangan pertama.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Nama Berkas</th>
                    <th className="p-3">Ukuran</th>
                    <th className="p-3">Waktu Pembuatan</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {backups.map((b, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="p-3 font-mono font-medium text-slate-800 flex items-center gap-2">
                        <HardDrive className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span
                          className="truncate max-w-[200px]"
                          title={b.filename}
                        >
                          {b.filename}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        {b.size_kb ? `${b.size_kb} KB` : "-"}
                      </td>
                      <td className="p-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {b.created_at || b.modified_at || "-"}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDownload(b.filename)}
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title="Unduh salinan backup ke penyimpanan lokal atau Google Drive/Cloud"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh Off-Site</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
