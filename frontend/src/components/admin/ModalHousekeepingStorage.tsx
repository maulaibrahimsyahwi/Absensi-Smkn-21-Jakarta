import React, { useState, useEffect } from "react";
import {
  HardDrive,
  Trash2,
  Database,
  FileImage,
  Archive,
  ShieldAlert,
  Loader2,
  X,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import api from "../../services/api";

interface StorageStats {
  database_size_mb: number;
  uploads_size_mb: number;
  uploads_file_count: number;
  backups_size_mb: number;
  backups_count: number;
  audit_logs_count: number;
  audit_logs_old_count: number;
}

interface ModalHousekeepingStorageProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export default function ModalHousekeepingStorage({
  isOpen,
  onClose,
  onSuccess,
}: ModalHousekeepingStorageProps) {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [daysToKeep, setDaysToKeep] = useState<number>(90);
  const [runVacuum, setRunVacuum] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchStats = async () => {
    setLoadingStats(true);
    setErrorMsg("");
    try {
      const res = await api.get<{ success: boolean; data?: StorageStats; message?: string }>("/admin/storage/stats");
      if (res.data?.success && res.data.data) {
        setStats(res.data.data);
      } else {
        setErrorMsg(res.data?.message || "Gagal memuat statistik storage.");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Terjadi kesalahan saat memuat kapasitas storage.";
      setErrorMsg(msg);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCleanup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const isConfirmed = window.confirm(
      `Konfirmasi Housekeeping:\nLog audit keamanan yang lebih lama dari ${daysToKeep} hari akan dihapus permanen${
        runVacuum ? " dan database SQLite akan di-VACUUM (deframgmentasi)" : ""
      }.\n\nLanjutkan proses pembersihan?`,
    );
    if (!isConfirmed) return;

    setCleaning(true);
    try {
      const res = await api.post<{
        success: boolean;
        message?: string;
        pruned_audit_logs?: number;
      }>("/admin/storage/cleanup", {
        days_to_keep: Number(daysToKeep),
        run_vacuum: runVacuum,
      });

      if (res.data?.success) {
        onSuccess(
          res.data.message ||
            `Pembersihan selesai! ${res.data.pruned_audit_logs || 0} audit log lama telah dipangkas.`,
        );
        fetchStats();
      } else {
        setErrorMsg(
          res.data?.message || "Gagal menjalankan housekeeping storage.",
        );
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Terjadi kesalahan saat menjalankan pembersihan storage.";
      setErrorMsg(msg);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 px-5 sm:px-6 py-4 sm:py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md">
              <HardDrive className="w-5 h-5 sm:w-6 sm:h-6 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                Pembersihan Storage & Housekeeping
              </h3>
              <p className="text-xs text-blue-200 mt-0.5">
                Rotasi cache, pemangkasan log kadaluarsa & defragmentasi DB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Statistik Storage Saat Ini */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Status Kapasitas Penyimpanan
              </label>
              <button
                type="button"
                onClick={fetchStats}
                disabled={loadingStats}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3 h-3 ${loadingStats ? "animate-spin" : ""}`}
                />
                <span>Segarkan</span>
              </button>
            </div>

            {loadingStats && !stats ? (
              <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Menghitung penggunaan disk...</span>
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Database */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-600 mb-1">
                    <Database className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[10px] font-bold uppercase truncate">
                      Database
                    </span>
                  </div>
                  <p className="text-base sm:text-lg font-black text-slate-800">
                    {stats.database_size_mb} MB
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    SQLite DB
                  </p>
                </div>

                {/* Uploads Foto */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-600 mb-1">
                    <FileImage className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[10px] font-bold uppercase truncate">
                      Uploads
                    </span>
                  </div>
                  <p className="text-base sm:text-lg font-black text-slate-800">
                    {stats.uploads_size_mb} MB
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {stats.uploads_file_count} Berkas
                  </p>
                </div>

                {/* Backups */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-600 mb-1">
                    <Archive className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[10px] font-bold uppercase truncate">
                      Cadangan
                    </span>
                  </div>
                  <p className="text-base sm:text-lg font-black text-slate-800">
                    {stats.backups_size_mb} MB
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {stats.backups_count} Arsip
                  </p>
                </div>

                {/* Audit Logs */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-600 mb-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
                    <span className="text-[10px] font-bold uppercase truncate">
                      Audit Log
                    </span>
                  </div>
                  <p className="text-base sm:text-lg font-black text-slate-800">
                    {stats.audit_logs_count}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {stats.audit_logs_old_count} &gt;90 Hari
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Form Opsi Pembersihan */}
          <form onSubmit={handleCleanup} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Batas Retensi Audit Log Keamanan
              </label>
              <select
                value={daysToKeep}
                onChange={(e) => setDaysToKeep(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
              >
                <option value={30}>Hapus log lebih lama dari 30 Hari</option>
                <option value={60}>Hapus log lebih lama dari 60 Hari</option>
                <option value={90}>
                  Hapus log lebih lama dari 90 Hari (Standar)
                </option>
                <option value={180}>
                  Hapus log lebih lama dari 180 Hari (6 Bulan)
                </option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Log audit yang lebih baru dari rentang ini tetap dipertahankan
                untuk kebutuhan pelaporan & verifikasi.
              </p>
            </div>

            {/* Opsi SQLite VACUUM */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <input
                type="checkbox"
                id="vacuum_db"
                checked={runVacuum}
                onChange={(e) => setRunVacuum(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
              <label
                htmlFor="vacuum_db"
                className="text-xs cursor-pointer select-none"
              >
                <span className="font-bold text-slate-900 block">
                  Jalankan Reklaim Ruang Harddisk (SQLite VACUUM)
                </span>
                <span className="text-slate-500 block text-[11px] mt-0.5 leading-relaxed">
                  Menghapus fragmentasi data dan mengembalikan ruang kosong
                  database kembali ke sistem operasi.
                </span>
              </label>
            </div>

            {/* Tombol Aksi */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                disabled={cleaning}
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={cleaning || loadingStats}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {cleaning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Membersihkan...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Eksekusi Pembersihan Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
