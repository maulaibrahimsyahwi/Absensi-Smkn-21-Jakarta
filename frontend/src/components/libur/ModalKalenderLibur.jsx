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
  CalendarClock,
} from "lucide-react";
import { liburService } from "../../services/liburService";
import ModalPreviewSuratEdaran from "./ModalPreviewSuratEdaran";
import CustomDatePicker from "../CustomDatePicker";
import CustomDropdown from "../CustomDropdown";

const KATEGORI_OPTIONS = [
  {
    value: "libur_semester",
    label: "Libur Semester / Kenaikan Kelas",
    sublabel: "Kalender Pendidikan Resmi Disdik",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
  },
  {
    value: "libur_nasional",
    label: "Hari Libur Nasional",
    sublabel: "SKB 3 Menteri Resmi",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
  },
  {
    value: "cuti_bersama",
    label: "Cuti Bersama Pemerintah",
    sublabel: "Instruksi Pemerintah / Bersama",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
  },
  {
    value: "khusus",
    label: "Libur Khusus / Kegiatan Sekolah",
    sublabel: "Surat Edaran Internal SMKN 21",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
  },
];

const DAMPAK_PRESENSI_OPTIONS = [
  {
    value: "libur",
    label: "Liburkan Sekolah (Tutup Presensi)",
    sublabel: "Siswa & piket diliburkan otomatis",
  },
  {
    value: "masuk_khusus",
    label: "Wajib Masuk Khusus (Presensi Dibuka)",
    sublabel: "Upacara / agenda wajib di tgl merah",
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
        nama: `Libur Akhir Semester Ganjil TA ${currentYearNum}/${currentYearNum + 1}`,
        kategori: "libur_semester",
        tglMulai: `${currentYearNum}-12-22`,
        tglSelesai: `${currentYearNum + 1}-01-03`,
        tipeHari: "libur",
        keterangan: "Libur akhir semester ganjil kalender pendidikan Disdik",
      },
      {
        label: "Libur Kenaikan Kelas (Genap)",
        nama: `Libur Kenaikan Kelas & Akhir Semester Genap ${currentYearNum}`,
        kategori: "libur_semester",
        tglMulai: `${currentYearNum}-06-23`,
        tglSelesai: `${currentYearNum}-07-06`,
        tipeHari: "libur",
        keterangan: "Libur akhir semester genap / kenaikan kelas SMKN 21",
      },
      {
        label: "Upacara HUT RI 17 Agustus",
        nama: `Upacara Peringatan HUT Kemerdekaan RI ke-${currentYearNum - 1945}`,
        kategori: "khusus",
        tglMulai: `${currentYearNum}-08-17`,
        tglSelesai: `${currentYearNum}-08-17`,
        tipeHari: "masuk_khusus",
        keterangan: "Upacara bendera peringatan kemerdekaan (wajib hadir)",
      },
      {
        label: "Libur Awal Ramadhan",
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
      notifyHolidayChanged();
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
      notifyHolidayChanged();
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
        notifyHolidayChanged();
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
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold tracking-tight truncate">
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
            <>
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
                    <CalendarClock className="w-6 h-6" />
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
                                ? "Nasional"
                                : isMasukKhusus
                                  ? "Wajib Masuk Khusus"
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
                              <span>Lihat Surat Edaran Resmi</span>
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
              </form>
            </div>
          )}

          {/* TAB 4: Form Tambah / Edit Manual */}
          {activeTab === "tambah" && (
            <form
              onSubmit={handleSubmitForm}
              className="max-w-3xl mx-auto space-y-5 animate-in fade-in duration-200"
            >
              {/* Header Title Card */}
              <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-100 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    {editingId ? (
                      <Edit2 className="w-5 h-5" />
                    ) : (
                      <CalendarClock className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                      {editingId
                        ? "Edit Agenda Kalender Sekolah"
                        : "Tambah Agenda Kalender Sekolah"}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {editingId
                        ? "Perbarui tanggal, dampak presensi, atau berkas surat edaran resmi."
                        : "Konfigurasi jadwal libur semester, hari libur nasional, atau kegiatan masuk khusus."}
                    </p>
                  </div>
                </div>
                {editingId && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                    Mode Edit
                  </span>
                )}
              </div>

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
                <p className="text-[11px] text-slate-400">
                  Nama ini akan ditampilkan pada kalender akademik dan portal
                  siswa/guru.
                </p>
              </div>

              {/* Card 2: Tanggal Pelaksanaan (CustomDatePicker) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <CalendarDays className="w-4 h-4 text-purple-600 shrink-0" />
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
                      onChange={(val) => {
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
                      Tanggal Selesai (Opsional)
                    </label>
                    <CustomDatePicker
                      value={formTglSelesai}
                      minDate={formTglMulai}
                      onChange={(val) => setFormTglSelesai(val)}
                      placeholder="Pilih tanggal selesai..."
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      *Samakan dengan tanggal mulai jika agenda hanya 1 hari.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 3: Klasifikasi & Dampak Presensi (CustomDropdown) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Filter className="w-4 h-4 text-purple-600 shrink-0" />
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
                      onChange={(val) => setFormKategori(val)}
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
                      onChange={(val) => setFormTipeHari(val)}
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
                    <Paperclip className="w-4 h-4 text-purple-600 shrink-0" />
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Lampiran Berkas Surat Edaran (Opsional)
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
                        <Eye className="w-3.5 h-3.5" />
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
                          {(formFileSurat.size / 1024).toFixed(1)} KB (Siap
                          diunggah)
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
                        PDF atau Foto Dokumen resmi untuk pratinjau siswa dan guru
                        (Maks. 10MB)
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
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
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-600/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
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
