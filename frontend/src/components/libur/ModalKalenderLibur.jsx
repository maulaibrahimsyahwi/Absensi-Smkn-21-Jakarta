import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  X,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Loader2,
  Sun,
  Flag,
  CalendarDays,
  Search,
  Filter,
  Zap,
  BookOpen,
  Upload,
  FileSpreadsheet,
  FileText,
  Send,
  Check,
  Lock,
  Paperclip,
  ExternalLink,
  Eye,
  Download,
} from "lucide-react";
import { liburService } from "../../services/liburService";
import ModalPreviewSuratEdaran from "./ModalPreviewSuratEdaran";

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

export default function ModalKalenderLibur({
  isOpen,
  onClose,
  onRefreshStatus,
  initialTab = "daftar",
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // "daftar" | "quick_se" | "import_file" | "tambah"
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [liburList, setLiburList] = useState([]);
  const [statusToday, setStatusToday] = useState(null);
  const [notification, setNotification] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTahun, setSelectedTahun] = useState(
    String(new Date().getFullYear()),
  );

  // Import File State
  const [importFileObj, setImportFileObj] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importStats, setImportStats] = useState(null);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [formNama, setFormNama] = useState("");
  const [formKategori, setFormKategori] = useState("libur_semester");
  const [formTglMulai, setFormTglMulai] = useState("");
  const [formTglSelesai, setFormTglSelesai] = useState("");
  const [formTipeHari, setFormTipeHari] = useState("libur");
  const [formKeterangan, setFormKeterangan] = useState("");
  const [formFileSurat, setFormFileSurat] = useState(null);
  const [formFileUrl, setFormFileUrl] = useState("");
  const [formFileName, setFormFileName] = useState("");
  const [uploadingSurat, setUploadingSurat] = useState(false);
  const [previewSuratModal, setPreviewSuratModal] = useState(null);

  const currentYearNum =
    parseInt(selectedTahun, 10) || new Date().getFullYear();

  const presetTemplates = useMemo(
    () => [
      {
        label: "Libur Semester Ganjil",
        emoji: "📚",
        nama: `Libur Akhir Semester Ganjil TA ${currentYearNum}/${currentYearNum + 1}`,
        kategori: "libur_semester",
        tglMulai: `${currentYearNum}-12-22`,
        tglSelesai: `${currentYearNum + 1}-01-03`,
        tipeHari: "libur",
        keterangan: "Libur akhir semester ganjil kalender pendidikan Disdik",
      },
      {
        label: "Libur Kenaikan Kelas (Genap)",
        emoji: "🎓",
        nama: `Libur Kenaikan Kelas & Akhir Semester Genap ${currentYearNum}`,
        kategori: "libur_semester",
        tglMulai: `${currentYearNum}-06-23`,
        tglSelesai: `${currentYearNum}-07-06`,
        tipeHari: "libur",
        keterangan: "Libur akhir semester genap / kenaikan kelas SMKN 21",
      },
      {
        label: "Upacara HUT RI 17 Agustus",
        emoji: "🇮🇩",
        nama: `Upacara Peringatan HUT Kemerdekaan RI ke-${currentYearNum - 1945}`,
        kategori: "khusus",
        tglMulai: `${currentYearNum}-08-17`,
        tglSelesai: `${currentYearNum}-08-17`,
        tipeHari: "masuk_khusus",
        keterangan: "Upacara bendera peringatan kemerdekaan (wajib hadir)",
      },
      {
        label: "Libur Awal Ramadhan",
        emoji: "🌙",
        nama: `Libur Awal Bulan Suci Ramadhan ${currentYearNum}`,
        kategori: "khusus",
        tglMulai: `${currentYearNum}-03-02`,
        tglSelesai: `${currentYearNum}-03-04`,
        tipeHari: "libur",
        keterangan: "Pemberhentian sementara KBM awal Ramadhan",
      },
    ],
    [currentYearNum],
  );

  // Modal konfirmasi hapus
  const [deletingItem, setDeletingItem] = useState(null);

  // Quick Override Prompt Modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideAction, setOverrideAction] = useState("libur"); // "libur" | "masuk_khusus"
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

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setFormNama(item.nama);
    setFormKategori(item.kategori || "libur_semester");
    setFormTglMulai(item.tanggal_mulai || "");
    setFormTglSelesai(item.tanggal_selesai || item.tanggal_mulai || "");
    setFormTipeHari(item.tipe_hari || "libur");
    setFormKeterangan(item.keterangan || "");
    setFormFileUrl(item.lampiran_surat || "");
    setFormFileName(item.nama_file_surat || "");
    setFormFileSurat(null);
    setActiveTab("tambah");
  };

  const handleSubmitForm = async (e) => {
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
            finalFileUrl = uploadRes.url;
            finalFileName = uploadRes.filename;
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

      const payload = {
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
      if (onRefreshStatus) onRefreshStatus();
    } catch (err) {
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

  const handleResetOverride = async () => {
    if (
      !window.confirm("Kembalikan status hari ini ke jadwal kalender normal?")
    )
      return;
    setSubmitting(true);
    try {
      await liburService.quickOverrideToday({ action: "reset" });
      setNotification({
        type: "success",
        message: "Status hari ini telah dikembalikan ke kalender normal.",
      });
      fetchAllData();
      if (onRefreshStatus) onRefreshStatus();
    } catch (err) {
      setNotification({
        type: "error",
        message: "Gagal mereset status hari ini.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncNational = async () => {
    setSyncing(true);
    try {
      const res = await liburService.syncNational(selectedTahun);
      if (res?.success) {
        setNotification({
          type: "success",
          message:
            res.message ||
            `Berhasil menyinkronkan libur nasional tahun ${selectedTahun}.`,
        });
        await fetchAllData();
        if (onRefreshStatus) onRefreshStatus();
      } else {
        setNotification({
          type: "error",
          message:
            res?.message || "Gagal menyinkronkan kalender libur nasional.",
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        message:
          err.response?.data?.message ||
          "Terjadi kesalahan saat menyinkronkan libur nasional.",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncAcademic = async () => {
    setSyncing(true);
    try {
      const res = await liburService.syncAcademic(selectedTahun);
      if (res?.success) {
        setNotification({
          type: "success",
          message:
            res.message ||
            `Berhasil menambahkan libur semester tahun ${selectedTahun}.`,
        });
        await fetchAllData();
        if (onRefreshStatus) onRefreshStatus();
      } else {
        setNotification({
          type: "error",
          message: res?.message || "Gagal menambahkan libur semester.",
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        message:
          err.response?.data?.message ||
          "Terjadi kesalahan saat menambahkan libur semester.",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleUploadFile = async (e) => {
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
        if (onRefreshStatus) onRefreshStatus();
      } else {
        setImportStats(res);
        setNotification({
          type: "error",
          message: res?.message || "Gagal mengimpor file kalender.",
        });
      }
    } catch (err) {
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

  const handleDownloadTemplate = async () => {
    try {
      await liburService.downloadTemplate();
    } catch (err) {
      setNotification({
        type: "error",
        message: "Gagal mengunduh template Excel.",
      });
    }
  };

  const filteredList = useMemo(() => {
    return liburList.filter((item) => {
      const q = searchTerm.toLowerCase();
      return (
        item.nama?.toLowerCase().includes(q) ||
        item.keterangan?.toLowerCase().includes(q) ||
        item.kategori?.toLowerCase().includes(q)
      );
    });
  }, [liburList, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs select-none animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Modal */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-purple-300 shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold tracking-tight truncate">
                Kalender Akademik & Hari Libur Sekolah
              </h2>
              <p className="text-xs text-purple-200 truncate">
                Kelola libur semester, tanggal merah, upacara khusus, & override
                presensi
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

        {/* Banner Status Hari Ini & Quick Override Bar */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-3.5 h-3.5 rounded-full shrink-0 animate-pulse ${
                statusToday?.is_holiday
                  ? "bg-rose-500 ring-4 ring-rose-100"
                  : statusToday?.is_special_school_day
                    ? "bg-blue-500 ring-4 ring-blue-100"
                    : statusToday?.is_weekend
                      ? "bg-amber-500 ring-4 ring-amber-100"
                      : "bg-emerald-500 ring-4 ring-emerald-100"
              }`}
            />
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Status Presensi Hari Ini ({statusToday?.nama_hari || "Hari Ini"}
                )
              </div>
              <div className="text-sm font-bold text-slate-800 truncate">
                {statusToday?.is_holiday
                  ? `🔴 Libur: ${statusToday?.holiday_event?.nama || "Libur Sekolah"}`
                  : statusToday?.is_special_school_day
                    ? `🔵 Wajib Masuk Khusus: ${statusToday?.holiday_event?.nama}`
                    : statusToday?.is_weekend
                      ? `🟡 Libur Akhir Pekan (${statusToday?.nama_hari})`
                      : "🟢 Hari Sekolah Aktif (Presensi Buka)"}
              </div>
            </div>
          </div>

          {/* Quick Override Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
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
              <Sun className="w-3.5 h-3.5 text-rose-600" />
              <span>Liburkan Hari Ini</span>
            </button>

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
              <Flag className="w-3.5 h-3.5 text-blue-600" />
              <span>Wajibkan Masuk</span>
            </button>

            {statusToday?.holiday_event?.kategori === "khusus" && (
              <button
                type="button"
                onClick={handleResetOverride}
                disabled={submitting}
                className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                title="Batalkan override dan kembalikan ke jadwal kalender normal"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

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
              <CalendarDays className="w-4 h-4" />
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
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <span>📥 Import Excel/CSV</span>
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
              <Plus className="w-4 h-4" />
              <span>{editingId ? "Edit Jadwal Libur" : "Tambah Manual"}</span>
            </button>
          </div>

          {activeTab === "daftar" && (
            <div className="flex items-center gap-2 pb-2">
              <select
                value={selectedTahun}
                onChange={(e) => setSelectedTahun(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:ring-2 focus:ring-purple-400 focus:outline-hidden"
              >
                {[0, 1, -1].map((offset) => {
                  const y = new Date().getFullYear() + offset;
                  return (
                    <option key={y} value={String(y)}>
                      Tahun {y}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === "daftar" && (
            <>
              {/* Automation Quick Actions Banner */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-2.5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <h4 className="text-xs sm:text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                        🟢 Kalender Libur Nasional Otomatis Aktif (2024 - 2030+)
                      </h4>
                    </div>
                    <p className="text-[11px] text-emerald-800/80 leading-relaxed max-w-xl">
                      Seluruh tanggal merah resmi SKB 3 Menteri sudah otomatis
                      terintegrasi dan aktif untuk tahun {selectedTahun} tanpa
                      perlu klik atau sinkron manual.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("import_file")}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                      title="Upload file spreadsheet jadwal libur dari TU/Dinas"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>📥 Upload Excel / CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSyncAcademic}
                      disabled={syncing}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                      title="Impor rentang libur semester ganjil, genap, dan awal puasa"
                    >
                      {syncing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <BookOpen className="w-3.5 h-3.5" />
                      )}
                      <span>📚 Impor Libur Semester</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nama hari libur, kategori, atau nomor edaran..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm bg-slate-50/60 focus:bg-white focus:ring-2 focus:ring-purple-400 focus:outline-hidden transition-all"
                />
              </div>

              {loading ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  <p className="text-xs font-semibold text-slate-500">
                    Memuat kalender libur sekolah...
                  </p>
                </div>
              ) : filteredList.length === 0 ? (
                <div className="py-12 px-4 text-center bg-slate-50/70 border-2 border-dashed border-slate-200 rounded-3xl space-y-3.5">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 shadow-xs">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-slate-800">
                      Belum Ada Agenda Libur Terjadwal untuk Tahun{" "}
                      {selectedTahun}
                    </div>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      Gunakan fitur di bawah untuk mengimpor jadwal libur
                      semester atau unggah spreadsheet kalender sekolah.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab("import_file")}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>📥 Upload Excel / CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSyncAcademic}
                      disabled={syncing}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>📚 Impor Libur Semester & Kenaikan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("tambah")}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Manual</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredList.map((item) => {
                    const katObj = KATEGORI_OPTIONS.find(
                      (k) => k.value === item.kategori,
                    );
                    const isMasukKhusus = item.tipe_hari === "masuk_khusus";
                    const isBuiltin = Boolean(item.is_builtin);

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border transition-all hover:shadow-md space-y-3 relative ${
                          isMasukKhusus
                            ? "bg-blue-50/40 border-blue-200/80"
                            : isBuiltin
                              ? "bg-emerald-50/20 border-emerald-200/60"
                              : "bg-white border-slate-200/80"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border mb-1.5 ${
                                isBuiltin
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                  : isMasukKhusus
                                    ? "bg-blue-100 text-blue-800 border-blue-200"
                                    : katObj?.badgeColor ||
                                      "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {isBuiltin
                                ? "🟢 Nasional Otomatis"
                                : isMasukKhusus
                                  ? "🔵 Wajib Masuk Khusus"
                                  : katObj?.label || item.kategori}
                            </span>
                            <h3 className="font-bold text-sm text-slate-900 leading-snug break-words">
                              {item.nama}
                            </h3>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title={
                                isBuiltin
                                  ? "Ubah status atau sesuaikan tanggal libur ini"
                                  : "Edit / Geser Tanggal"
                              }
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {isBuiltin ? (
                              <span
                                className="p-1.5 rounded-lg text-slate-300 cursor-not-allowed inline-flex items-center"
                                title="Hari libur resmi SKB 3 Menteri otomatis. Gunakan tombol Edit jika sekolah masuk pada hari ini."
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeletingItem(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Hapus Agenda"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Rentang Tanggal */}
                        <div className="bg-slate-50/80 rounded-xl p-2.5 text-xs text-slate-600 flex items-center justify-between border border-slate-100">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                            <span className="font-semibold text-slate-800">
                              {item.tanggal_mulai === item.tanggal_selesai
                                ? item.tanggal_mulai
                                : `${item.tanggal_mulai} s/d ${item.tanggal_selesai}`}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-slate-400">
                            {item.tipe_hari === "masuk_khusus"
                              ? "Presensi Buka"
                              : "Presensi Tutup"}
                          </span>
                        </div>

                        {item.keterangan && (
                          <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-100 break-words">
                            "{item.keterangan}"
                          </p>
                        )}

                        {/* Tombol Preview Surat Edaran jika ada lampiran */}
                        {item.lampiran_surat && (
                          <div className="pt-0.5">
                            <button
                              type="button"
                              onClick={() => setPreviewSuratModal(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                            >
                              <FileText className="w-3.5 h-3.5 text-purple-600" />
                              <span>📄 Lihat Surat Edaran Resmi</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* TAB 2: Impor File Excel / CSV Kaldik */}
          {activeTab === "import_file" && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="bg-indigo-50/70 border border-indigo-200/80 p-4 rounded-2xl flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                    Impor File Kalender Akademik SMKN 21
                  </h4>
                  <p className="text-xs text-indigo-900/80 leading-relaxed">
                    Punya rekap jadwal libur tahunan dari Tata Usaha (TU) atau
                    Waka Kurikulum? Unggah file Excel (.xlsx) atau CSV (.csv)
                    untuk memasukkan seluruh agenda libur 1 tahun ajaran secara
                    otomatis tanpa input satu per satu.
                  </p>
                </div>
              </div>

              {/* Download Template Bar */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-800">
                    Belum punya format tabel yang sesuai?
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Unduh template resmi SMKN 21 yang sudah dilengkapi contoh
                    pengisian.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-indigo-700 text-xs font-bold shadow-2xs transition-all cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Unduh Template (.xlsx)</span>
                </button>
              </div>

              {/* Upload Drop Zone Form */}
              <form onSubmit={handleUploadFile} className="space-y-4">
                <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 rounded-3xl p-6 sm:p-8 text-center transition-all">
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
                          Klik untuk Memilih File Excel atau CSV
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
                          ✅ Ditambahkan: <strong>{importStats.added}</strong>
                        </span>
                        <span>
                          ℹ️ Dilewati (Sudah Ada):{" "}
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
                          {importStats.errors.map((err, eIdx) => (
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

                {/* Submit Button */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setImportFileObj(null);
                      setImportStats(null);
                      setActiveTab("daftar");
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!importFileObj || importLoading}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {importLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>Unggah & Impor Kalender</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: Form Tambah / Edit Manual */}
          {activeTab === "tambah" && (
            <form
              onSubmit={handleSubmitForm}
              className="max-w-2xl mx-auto space-y-4"
            >
              <div className="bg-purple-50/50 border border-purple-200/70 p-4 rounded-2xl flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 shrink-0" />
                <p className="text-xs text-purple-900 leading-relaxed">
                  Jadwal libur yang didaftarkan di sini akan otomatis menutup
                  scanner presensi dari hari Senin sampai Jumat, membekukan
                  auto-alpa, dan mengecualikannya dari hari efektif belajar.
                </p>
              </div>

              {/* Pintasan Template Presets (Hanya tampil saat mode Tambah, bukan Edit) */}
              {!editingId && (
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      Pintasan Template Cepat (1-Klik Isi Form):
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Klik untuk isi formulir otomatis
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {presetTemplates.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFormNama(tmpl.nama);
                          setFormKategori(tmpl.kategori);
                          setFormTglMulai(tmpl.tglMulai);
                          setFormTglSelesai(tmpl.tglSelesai);
                          setFormTipeHari(tmpl.tipeHari);
                          setFormKeterangan(tmpl.keterangan);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200/80 bg-white hover:bg-purple-50 hover:border-purple-300 text-purple-900 text-xs font-semibold shadow-2xs transition-all cursor-pointer active:scale-95"
                      >
                        <span>{tmpl.emoji}</span>
                        <span>{tmpl.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Nama Hari Libur */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. Nama Hari Libur / Kegiatan{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Contoh: Libur Semester Ganjil TA 2025/2026 atau Hari Raya Idul Fitri"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-purple-400 focus:outline-hidden"
                />
              </div>

              {/* Kategori & Tipe Hari */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    2. Kategori Libur
                  </label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-purple-400 focus:outline-hidden bg-white"
                  >
                    {KATEGORI_OPTIONS.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    3. Dampak Presensi
                  </label>
                  <select
                    value={formTipeHari}
                    onChange={(e) => setFormTipeHari(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-purple-400 focus:outline-hidden bg-white"
                  >
                    <option value="libur">
                      🔴 Liburkan Sekolah (Tutup Presensi)
                    </option>
                    <option value="masuk_khusus">
                      🔵 Wajib Masuk Khusus (Upacara / Presensi Tetap Buka)
                    </option>
                  </select>
                </div>
              </div>

              {/* Tanggal Mulai & Selesai */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    4. Tanggal Mulai <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formTglMulai}
                    onChange={(e) => {
                      setFormTglMulai(e.target.value);
                      if (!formTglSelesai || formTglSelesai < e.target.value) {
                        setFormTglSelesai(e.target.value);
                      }
                    }}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-purple-400 focus:outline-hidden bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    5. Tanggal Selesai (Jika Rentang)
                  </label>
                  <input
                    type="date"
                    value={formTglSelesai}
                    min={formTglMulai}
                    onChange={(e) => setFormTglSelesai(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-purple-400 focus:outline-hidden bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    *Kosongkan jika hanya 1 hari tanggal merah.
                  </p>
                </div>
              </div>

              {/* Keterangan / Catatan Tambahan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  6. Keterangan / Dasar Surat Edaran
                </label>
                <textarea
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Contoh: Berdasarkan Surat Edaran Disdik DKI Jakarta No. 421/2026 tentang Libur Semester"
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-purple-400 focus:outline-hidden"
                />
              </div>

              {/* 7. Lampiran Berkas Surat Edaran Resmi */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                    7. Lampiran Berkas Surat Edaran (Opsional)
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal lowercase">
                    (PDF, PNG, JPG, maks. 10MB)
                  </span>
                </label>

                {formFileUrl && !formFileSurat && (
                  <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-purple-950 truncate">
                          {formFileName || "Berkas Surat Edaran Terlampir"}
                        </p>
                        <p className="text-[10px] text-purple-700 truncate">
                          Tersimpan di sistem
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewSuratModal({
                            nama: formNama || "Surat Edaran",
                            lampiran_surat: formFileUrl,
                            nama_file_surat: formFileName,
                          })
                        }
                        className="px-2.5 py-1 text-xs bg-white text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg font-medium cursor-pointer transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Pratinjau</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormFileUrl("");
                          setFormFileName("");
                          setFormFileSurat(null);
                        }}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                        title="Hapus lampiran"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {formFileSurat && (
                  <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-emerald-950 truncate">
                          {formFileSurat.name}
                        </p>
                        <p className="text-[10px] text-emerald-700">
                          {(formFileSurat.size / 1024).toFixed(1)} KB • Siap
                          diunggah saat simpan
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormFileSurat(null)}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                      title="Batalkan file ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {!formFileUrl && !formFileSurat && (
                  <div className="border border-dashed border-slate-300 hover:border-purple-400 bg-slate-50/50 hover:bg-purple-50/30 rounded-2xl p-3 text-center transition-colors">
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
                      className="cursor-pointer flex items-center justify-center gap-2 text-xs text-slate-600 hover:text-purple-700 py-1"
                    >
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span>Unggah PDF atau Foto Surat Edaran Resmi</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setActiveTab("daftar");
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
      </div>

      {/* Modal Konfirmasi Hapus */}
      {deletingItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Hapus Agenda Libur?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus{" "}
                <strong>"{deletingItem.nama}"</strong> dari kalender sekolah?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer flex-1"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex-1"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Quick Override Today */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100 animate-in zoom-in-95">
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
        </div>
      )}

      {/* Modal Preview Surat Edaran Resmi */}
      <ModalPreviewSuratEdaran
        isOpen={Boolean(previewSuratModal)}
        onClose={() => setPreviewSuratModal(null)}
        suratData={previewSuratModal}
      />
    </div>
  );
}
