import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  X,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sun,
  Flag,
  Upload,
  FileText,
  Check,
  Lock,
} from "lucide-react";
import { liburService, HolidayPayload } from "../../services/liburService";
import ModalPreviewSuratEdaran from "./ModalPreviewSuratEdaran";
import HolidayCalendarView from "./HolidayCalendarView";
import CustomDatePicker from "../CustomDatePicker";
import CustomDropdown from "../CustomDropdown";
import Sheet from "../ui/Sheet";

const KATEGORI_OPTIONS = [
  {
    value: "libur_semester",
    label: "Libur Semester / Kenaikan Kelas",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
  },
  {
    value: "libur_nasional",
    label: "Hari Libur Nasional",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
  },
  {
    value: "cuti_bersama",
    label: "Cuti Bersama Pemerintah",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
  },
  {
    value: "khusus",
    label: "Libur Khusus / Kegiatan Sekolah",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
  },
];

const DAMPAK_PRESENSI_OPTIONS = [
  {
    value: "libur",
    label: "Liburkan Sekolah (Tutup Presensi)",
  },
  {
    value: "masuk_khusus",
    label: "Wajib Masuk Khusus (Presensi Dibuka)",
  },
];

export interface ModalKalenderLiburProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshStatus?: () => void;
  initialTab?: "daftar" | "quick_se" | "import_file" | "tambah" | string;
}

export default function ModalKalenderLibur({
  isOpen,
  onClose,
  onRefreshStatus,
  initialTab = "daftar",
}: ModalKalenderLiburProps): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState(initialTab); // "daftar" | "quick_se" | "import_file" | "tambah"
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [liburList, setLiburList] = useState<any[]>([]);
  const [statusToday, setStatusToday] = useState<any>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [selectedTahun, setSelectedTahun] = useState(
    String(new Date().getFullYear()),
  );
  const [calendarMonth, setCalendarMonth] = useState<number>(
    new Date().getMonth(),
  );

  // Import File State
  const [importFileObj, setImportFileObj] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importStats, setImportStats] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Auto-dismiss floating notification after 4.5s
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Form State
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [formNama, setFormNama] = useState("");
  const [formKategori, setFormKategori] = useState("libur_semester");
  const [formTglMulai, setFormTglMulai] = useState("");
  const [formTglSelesai, setFormTglSelesai] = useState("");
  const [formTipeHari, setFormTipeHari] = useState<"libur" | "masuk_khusus">("libur");
  const [formKeterangan, setFormKeterangan] = useState("");
  const [formFileSurat, setFormFileSurat] = useState<File | null>(null);
  const [formFileUrl, setFormFileUrl] = useState("");
  const [formFileName, setFormFileName] = useState("");
  const [uploadingSurat, setUploadingSurat] = useState(false);
  const [previewSuratModal, setPreviewSuratModal] = useState<any>(null);

  // Modal konfirmasi hapus
  const [deletingItem, setDeletingItem] = useState<any>(null);

  // Quick Override Prompt Modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideAction, setOverrideAction] = useState<"libur" | "masuk_khusus">("libur");
  const [overrideNama, setOverrideNama] = useState("");
  const [overrideKet, setOverrideKet] = useState("");

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [listRes, statusRes] = await Promise.all([
        liburService.getHariLiburList({ tahun: selectedTahun }),
        liburService.getStatusToday(),
      ]);
      setLiburList(Array.isArray(listRes) ? listRes : []);
      setStatusToday(statusRes || null);
    } catch (err) {
      console.error("Gagal mengambil data kalender libur:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAllData();
    }
  }, [isOpen, selectedTahun]);

  const resetForm = () => {
    setEditingId(null);
    setFormNama("");
    setFormKategori("libur_semester");
    setFormTglMulai("");
    setFormTglSelesai("");
    setFormTipeHari("libur");
    setFormKeterangan("");
    setFormFileUrl("");
    setFormFileName("");
    setFormFileSurat(null);
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    setFormNama(item.nama);
    setFormKategori(item.kategori || "libur_semester");
    setFormTglMulai(item.tanggal_mulai || "");
    setFormTglSelesai(item.tanggal_selesai || item.tanggal_mulai || "");
    setFormTipeHari(
      item.tipe_hari === "masuk_khusus" ? "masuk_khusus" : "libur",
    );
    setFormKeterangan(item.keterangan || "");
    setFormFileUrl(item.lampiran_surat || "");
    setFormFileName(item.nama_file_surat || "");
    setFormFileSurat(null);
    setActiveTab("tambah");
  };

  const notifyHolidayChanged = () => {
    try {
      if (typeof BroadcastChannel !== "undefined") {
        const bcAuth = new BroadcastChannel("smkn21_auth_channel");
        bcAuth.postMessage({ type: "HOLIDAY_CHANGED" });
        setTimeout(() => bcAuth.close(), 100);

        const bcAbsensi = new BroadcastChannel("smkn21_absensi_channel");
        bcAbsensi.postMessage({ type: "HOLIDAY_CHANGED" });
        setTimeout(() => bcAbsensi.close(), 100);
      }
    } catch (e) {}
  };

  const handleSubmitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formNama.trim() || !formTglMulai) {
      setNotification({
        type: "error",
        message: "Nama kegiatan dan tanggal mulai wajib diisi.",
      });
      return;
    }

    setSubmitting(true);
    try {
      let finalFileUrl = formFileUrl;
      let finalFileName = formFileName;

      if (formFileSurat) {
        setUploadingSurat(true);
        try {
          const uploadRes = await liburService.uploadSuratEdaran(formFileSurat);
          if (uploadRes?.success) {
            const resData = (uploadRes.data || uploadRes) as any;
            finalFileUrl = resData.url || "";
            finalFileName = resData.filename || "";
          }
        } catch (errUpload) {
          console.error("Gagal mengunggah surat edaran:", errUpload);
          setNotification({
            type: "error",
            message:
              "Gagal mengunggah berkas Surat Edaran. Periksa format dan ukuran file.",
          });
          setSubmitting(false);
          setUploadingSurat(false);
          return;
        } finally {
          setUploadingSurat(false);
        }
      }

      const payload: HolidayPayload = {
        nama: formNama.trim(),
        kategori: formKategori,
        tanggal_mulai: formTglMulai,
        tanggal_selesai: formTglSelesai || formTglMulai,
        tipe_hari: formTipeHari,
        keterangan: formKeterangan.trim(),
        lampiran_surat: finalFileUrl || null,
        nama_file_surat: finalFileName || null,
        is_active: true,
      };

      if (editingId && !String(editingId).startsWith("auto_")) {
        await liburService.updateHariLibur(editingId, payload);
        setNotification({
          type: "success",
          message: `Jadwal '${payload.nama}' berhasil diperbarui.`,
        });
      } else {
        await liburService.createHariLibur(payload);
        setNotification({
          type: "success",
          message: `Jadwal '${payload.nama}' berhasil disimpan ke kalender sekolah.`,
        });
      }

      resetForm();
      setActiveTab("daftar");
      fetchAllData();
      notifyHolidayChanged();
      if (onRefreshStatus) onRefreshStatus();
    } catch (err: any) {
      const msg =
        err.response?.data?.message || "Gagal menyimpan jadwal libur.";
      setNotification({ type: "error", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      await liburService.deleteHariLibur(deletingItem.id);
      setNotification({
        type: "success",
        message: `Jadwal '${deletingItem.nama}' berhasil dihapus.`,
      });
      setDeletingItem(null);
      fetchAllData();
      notifyHolidayChanged();
      if (onRefreshStatus) onRefreshStatus();
    } catch (err) {
      setNotification({
        type: "error",
        message: "Gagal menghapus jadwal libur.",
      });
    }
  };

  const handleQuickOverride = async () => {
    setSubmitting(true);
    try {
      await liburService.quickOverrideToday({
        action: overrideAction,
        nama: overrideNama.trim(),
        keterangan: overrideKet.trim(),
      });
      setNotification({
        type: "success",
        message: `Status hari ini berhasil diubah: ${overrideAction === "libur" ? "Diliburkan Khusus" : "Wajib Masuk Khusus"}.`,
      });
      setShowOverrideModal(false);
      setOverrideNama("");
      setOverrideKet("");
      fetchAllData();
      notifyHolidayChanged();
      if (onRefreshStatus) onRefreshStatus();
    } catch (err) {
      setNotification({
        type: "error",
        message: "Gagal melakukan override hari ini.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validExts = [".xlsx", ".xls", ".csv"];
      const hasValidExt = validExts.some((ext) =>
        file.name.toLowerCase().endsWith(ext),
      );
      if (hasValidExt) {
        setImportFileObj(file);
        setImportStats(null);
      } else {
        setNotification({
          type: "error",
          message:
            "Format berkas harus berupa Excel (.xlsx, .xls) atau CSV (.csv).",
        });
      }
    }
  };

  const handleUploadFile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!importFileObj) {
      setNotification({
        type: "error",
        message:
          "Silakan pilih file Excel (.xlsx) atau CSV (.csv) terlebih dahulu.",
      });
      return;
    }
    setImportLoading(true);
    setImportStats(null);
    try {
      const formData = new FormData();
      formData.append("file", importFileObj);
      const res = await liburService.importFile(formData);
      if (res?.success) {
        setImportStats(res);
        setNotification({
          type: "success",
          message: res.message || "File kalender berhasil diimpor!",
        });
        setImportFileObj(null);
        await fetchAllData();
        notifyHolidayChanged();
        if (onRefreshStatus) onRefreshStatus();
      } else {
        setImportStats(res);
        setNotification({
          type: "error",
          message: res?.message || "Gagal mengimpor file kalender.",
        });
      }
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message || "Gagal mengunggah file kalender.";
      const errList = err.response?.data?.errors || [];
      setImportStats({
        message: errMsg,
        errors: errList,
        added: 0,
        skipped: 0,
        isError: true,
      });
      setNotification({
        type: "error",
        message: errMsg,
      });
    } finally {
      setImportLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Sheet isOpen={isOpen} onClose={onClose} labelledBy="modal-libur-title" size="xl" tall>
        {/* Header Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h2 id="modal-libur-title" className="text-base sm:text-lg font-bold tracking-tight truncate">
                Kalender Akademik & Hari Libur Sekolah
              </h2>
              <p className="text-xs text-purple-200 truncate">
                Kelola libur semester, tanggal merah, dan agenda khusus sekolah
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contextual Status Today Banner */}
        {statusToday && (
          <div className="mx-4 sm:mx-6 mt-3.5 p-3.5 rounded-2xl border bg-slate-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  statusToday.is_libur
                    ? "bg-rose-100 text-rose-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {statusToday.is_libur ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Flag className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-800">
                    Status Operasional Hari Ini ({statusToday.nama_hari || "Hari Ini"}):
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      statusToday.is_libur
                        ? "bg-rose-100 text-rose-800 border border-rose-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    {statusToday.is_libur ? "Sekolah Libur" : "Sekolah Aktif"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {statusToday.holiday_event?.nama ||
                    statusToday.message ||
                    (statusToday.is_libur
                      ? "Presensi ditutup otomatis sesuai kalender"
                      : "Presensi dan KBM tatap muka berlangsung normal")}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              {statusToday.is_libur ? (
                <button
                  type="button"
                  onClick={() => {
                    setOverrideAction("masuk_khusus");
                    setOverrideNama("Wajib Masuk Khusus Hari Ini");
                    setOverrideKet("");
                    setShowOverrideModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Buka presensi dan wajibkan siswa masuk hari ini"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Buka Presensi Hari Ini</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOverrideAction("libur");
                    setOverrideNama("Diliburkan Khusus Hari Ini");
                    setOverrideKet("");
                    setShowOverrideModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Liburkan sekolah secara mendadak hari ini"
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Liburkan Hari Ini</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Floating Notification */}
        {notification && (
          <div
            className={`mx-4 mt-3 p-3 rounded-2xl text-xs font-semibold flex items-center justify-between transition-all ${
              notification.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-600 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Selector Nav */}
        <div className="px-4 sm:px-6 pt-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setActiveTab("daftar");
                resetForm();
              }}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "daftar"
                  ? "border-purple-600 text-purple-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Daftar Libur</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600">
                {liburList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("import_file")}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "import_file"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Import Jadwal</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("tambah");
                if (!editingId) resetForm();
              }}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "tambah"
                  ? "border-purple-600 text-purple-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>{editingId ? "Edit Jadwal Libur" : "Tambah Jadwal"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setOverrideAction("masuk_khusus");
              setOverrideNama("Wajib Masuk Khusus Hari Ini");
              setOverrideKet("");
              setShowOverrideModal(true);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
            title="Wajibkan masuk & buka presensi hari ini (meski tgl merah/weekend)"
          >
            <span>Wajibkan Masuk</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setOverrideAction("libur");
              setOverrideNama("Diliburkan Khusus Hari Ini");
              setOverrideKet("");
              setShowOverrideModal(true);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
            title="Liburkan sekolah hari ini secara mendadak"
          >
            <span>Liburkan Hari Ini</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === "daftar" && (
            <div className="relative">
              {loading && (
                <div className="absolute inset-0 z-20 bg-white/70 backdrop-blur-2xs flex items-center justify-center rounded-2xl min-h-[300px]">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-md border border-slate-200 text-xs font-semibold text-slate-700">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    <span>Memperbarui kalender...</span>
                  </div>
                </div>
              )}
              <HolidayCalendarView
                events={liburList}
                selectedYear={selectedTahun}
                onSelectYear={(year) => setSelectedTahun(year)}
                selectedMonth={calendarMonth}
                onSelectMonth={(m) => setCalendarMonth(m)}
                isAdmin={true}
                onAddNewHoliday={(prefilledDate) => {
                  if (prefilledDate) {
                    setFormTglMulai(prefilledDate);
                    setFormTglSelesai(prefilledDate);
                  } else {
                    resetForm();
                  }
                  setActiveTab("tambah");
                }}
                onEditEvent={(item) => handleOpenEdit(item)}
                onDeleteEvent={(item) => setDeletingItem(item)}
                onPreviewSurat={(item) => setPreviewSuratModal(item)}
              />
            </div>
          )}

          {/* TAB 2: Impor File Excel / CSV Kaldik */}
          {activeTab === "import_file" && (
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Upload Drop Zone Form */}
              <form onSubmit={handleUploadFile} className="space-y-4">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all ${
                    isDragging
                      ? "border-indigo-500 bg-indigo-100/50 scale-[1.01]"
                      : "border-indigo-200 hover:border-indigo-400 bg-indigo-50/30"
                  }`}
                >
                  <input
                    type="file"
                    id="excelFileInput"
                    accept=".xlsx,.csv,.xls"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setImportFileObj(e.target.files[0]);
                        setImportStats(null);
                      }
                    }}
                    className="hidden"
                  />
                  {importFileObj ? (
                    <div className="space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Check className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {importFileObj.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {(importFileObj.size / 1024).toFixed(1)} KB • Siap
                          diimpor
                        </p>
                      </div>
                      <label
                        htmlFor="excelFileInput"
                        className="inline-block text-xs font-semibold text-indigo-600 hover:underline cursor-pointer pt-1"
                      >
                        Ganti File Lain
                      </label>
                    </div>
                  ) : (
                    <label
                      htmlFor="excelFileInput"
                      className="cursor-pointer space-y-2 block"
                    >
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {isDragging
                            ? "Lepaskan File Di Sini"
                            : "Klik atau Tarik File Excel / CSV ke Sini"}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Mendukung format .xlsx, .csv, atau .xls
                        </p>
                      </div>
                      <span className="inline-block px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-xs font-semibold text-indigo-700 shadow-2xs">
                        Pilih File dari Komputer
                      </span>
                    </label>
                  )}
                </div>

                {/* Tombol Submit Impor Jadwal */}
                <button
                  type="submit"
                  disabled={!importFileObj || importLoading}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {importLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengimpor Data Kalender...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Mulai Impor Jadwal Libur</span>
                    </>
                  )}
                </button>

                {/* Import Result Stats if any */}
                {importStats && (
                  <div
                    className={`p-4 rounded-2xl border space-y-2 animate-in fade-in ${
                      importStats.isError
                        ? "bg-rose-50 border-rose-200 text-rose-900"
                        : "bg-emerald-50 border-emerald-200 text-emerald-900"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {importStats.isError ? (
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      <p className="text-xs font-bold">{importStats.message}</p>
                    </div>
                    {!importStats.isError && (
                      <div className="text-[11px] text-emerald-800 flex gap-4 pl-7">
                        <span>
                          Ditambahkan <strong>{importStats.added}</strong>
                        </span>
                        <span>
                          Dilewati (Sudah Ada):{" "}
                          <strong>{importStats.skipped}</strong>
                        </span>
                      </div>
                    )}
                    {importStats.errors && importStats.errors.length > 0 && (
                      <div className="mt-2 pl-7 text-[11px] space-y-1">
                        <p className="font-semibold text-rose-800">
                          Catatan / Baris Bermasalah (
                          {importStats.errors.length}):
                        </p>
                        <div className="max-h-32 overflow-y-auto space-y-1 pr-2">
                          {importStats.errors.map((err: string, eIdx: number) => (
                            <p
                              key={eIdx}
                              className="text-rose-700 bg-rose-100/70 px-2.5 py-1 rounded-lg"
                            >
                              {err}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>
          )}

          {/* TAB 4: Form Tambah / Edit Manual */}
          {activeTab === "tambah" && (
            <form
              onSubmit={handleSubmitForm}
              className="max-w-3xl mx-auto space-y-2 animate-in fade-in duration-200"
            >
              {/* Card 1: Nama Agenda */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nama Hari Libur / Kegiatan{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    placeholder="Contoh: Libur Kenaikan Kelas TA 2025/2026 atau Hari Raya Idul Fitri"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-purple-400 focus:border-purple-400 focus:outline-hidden transition-all bg-white"
                  />
                </div>
              </div>

              {/* Card 2: Tanggal Pelaksanaan (CustomDatePicker) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Rentang Waktu Pelaksanaan
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Tanggal Mulai <span className="text-rose-500">*</span>
                    </label>
                    <CustomDatePicker
                      value={formTglMulai}
                      onChange={(val: string) => {
                        setFormTglMulai(val);
                        if (!formTglSelesai || formTglSelesai < val) {
                          setFormTglSelesai(val);
                        }
                      }}
                      placeholder="Pilih tanggal mulai..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Tanggal Selesai
                    </label>
                    <CustomDatePicker
                      value={formTglSelesai}
                      minDate={formTglMulai}
                      onChange={(val: string) => setFormTglSelesai(val)}
                      placeholder="Pilih tanggal selesai..."
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Klasifikasi & Dampak Presensi (CustomDropdown) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Klasifikasi & Kebijakan Presensi
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Kategori Agenda
                    </label>
                    <CustomDropdown
                      value={formKategori}
                      onChange={(val: string) => setFormKategori(val)}
                      options={KATEGORI_OPTIONS}
                      placeholder="Pilih kategori libur..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Dampak Terhadap Presensi
                    </label>
                    <CustomDropdown
                      value={formTipeHari}
                      onChange={(val: string) =>
                        setFormTipeHari(val as "libur" | "masuk_khusus")
                      }
                      options={DAMPAK_PRESENSI_OPTIONS}
                      placeholder="Pilih dampak presensi..."
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: Keterangan / Dasar Surat Edaran */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Keterangan / Nomor Surat Edaran (Opsional)
                </label>
                <textarea
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Contoh: Berdasarkan Surat Edaran Disdik DKI Jakarta No. 421/2026 tentang Libur Semester..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 focus:outline-hidden transition-all bg-white"
                />
              </div>

              {/* Card 5: Lampiran Berkas Surat Edaran */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Lampiran Berkas Surat Edaran
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    PDF, PNG, JPG maks. 10MB
                  </span>
                </div>

                {formFileUrl && !formFileSurat && (
                  <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-purple-600/10 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-purple-950 truncate">
                          {formFileName || "Berkas Surat Edaran Terlampir"}
                        </p>
                        <p className="text-[10px] text-purple-700">
                          Tersimpan di server
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewSuratModal({
                            nama: formNama || "Surat Edaran",
                            lampiran_surat: formFileUrl,
                            nama_file_surat: formFileName,
                          })
                        }
                        className="px-3 py-1.5 text-xs bg-white text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Pratinjau</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormFileUrl("");
                          setFormFileName("");
                          setFormFileSurat(null);
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-xl cursor-pointer transition-colors border border-rose-200/60"
                        title="Hapus lampiran"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {formFileSurat && (
                  <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-emerald-950 truncate">
                          {formFileSurat.name}
                        </p>
                        <p className="text-[10px] text-emerald-700">
                          {(formFileSurat.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormFileSurat(null)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors border border-rose-200/60"
                      title="Batalkan file ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {!formFileUrl && !formFileSurat && (
                  <div className="border-2 border-dashed border-slate-200 hover:border-purple-400 bg-slate-50/60 hover:bg-purple-50/30 rounded-2xl p-5 text-center transition-all cursor-pointer">
                    <input
                      type="file"
                      id="suratEdaranInput"
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            setNotification({
                              type: "error",
                              message: "Ukuran berkas melebihi batas 10MB.",
                            });
                            return;
                          }
                          setFormFileSurat(file);
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="suratEdaranInput"
                      className="cursor-pointer flex flex-col items-center justify-center gap-2 text-xs text-slate-600 hover:text-purple-700"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-2xs">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-slate-800">
                        Klik untuk memilih berkas Surat Edaran
                      </span>
                      <span className="text-[11px] text-slate-400">
                        PDF atau Foto Dokumen resmi untuk pratinjau siswa dan
                        guru (Maks. 10MB)
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Action Buttons (Sticky di bagian bawah form) */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs py-3 px-1 border-t border-slate-100 flex items-center justify-end gap-3 z-10">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setActiveTab("daftar");
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingSurat}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-600/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  <span>
                    {editingId
                      ? "Simpan Perubahan Jadwal"
                      : "Tambahkan ke Kalender"}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </Sheet>

      {/* Modal Konfirmasi Hapus */}
      <Sheet
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        labelledBy="delete-holiday-title"
        size="sm"
      >
        <div className="p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3 id="delete-holiday-title" className="font-bold text-base text-slate-900">
              Hapus Agenda Libur?
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Apakah Anda yakin ingin menghapus{" "}
              <strong>"{deletingItem?.nama}"</strong> dari kalender sekolah?
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeletingItem(null)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer flex-1"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex-1"
            >
              Ya, Hapus
            </button>
          </div>
        </div>
      </Sheet>

      {/* Modal Quick Override Today */}
      <Sheet
        isOpen={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        labelledBy="override-title"
        size="md"
      >
        <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  overrideAction === "libur"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {overrideAction === "libur" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Flag className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {overrideAction === "libur"
                    ? "Liburkan Sekolah Hari Ini"
                    : "Wajibkan Hadir Hari Ini"}
                </h3>
                <p className="text-xs text-slate-500">
                  Override status operasional khusus untuk hari ini saja
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kegiatan / Alasan
                </label>
                <input
                  type="text"
                  value={overrideNama}
                  onChange={(e) => setOverrideNama(e.target.value)}
                  placeholder="Contoh: Rapat Dewan Guru / Bencana Banjir / Upacara Bendera"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-purple-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keterangan Singkat
                </label>
                <textarea
                  value={overrideKet}
                  onChange={(e) => setOverrideKet(e.target.value)}
                  placeholder="Pesan yang akan tampil di layar scanner siswa..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-purple-400 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleQuickOverride}
                disabled={submitting}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  overrideAction === "libur"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : null}
                <span>Terapkan Hari Ini</span>
              </button>
            </div>
          </div>
      </Sheet>

      {/* Modal Preview Surat Edaran Resmi */}
      <ModalPreviewSuratEdaran
        isOpen={Boolean(previewSuratModal)}
        onClose={() => setPreviewSuratModal(null)}
        suratData={previewSuratModal}
      />
    </>
  );
}
