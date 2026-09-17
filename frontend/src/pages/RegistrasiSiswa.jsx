import React, { useState, useEffect, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  UserPlus,
  Camera,
  CheckCircle2,
  AlertCircle,
  Users,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Trash2,
  Edit2,
  X,
  Search,
  Check,
  HelpCircle,
  GraduationCap,
  Sparkles,
  Filter,
  CheckSquare,
  Square,
  UserCheck,
} from "lucide-react";
import CustomDropdown from "../components/CustomDropdown";
import EditSiswaModal from "../components/registrasi/EditSiswaModal";
import DeleteSiswaModal from "../components/registrasi/DeleteSiswaModal";
import LuluskanModal from "../components/registrasi/LuluskanModal";
import {
  JURUSAN_SMKN21,
  KELAS_PER_JURUSAN,
  DAFTAR_KELAS_SMKN21,
  KELAS_GROUPS_DROPDOWN,
  getJurusanInfo,
} from "../constants/schoolData";

// Re-export untuk kompatibilitas backward
export {
  JURUSAN_SMKN21,
  KELAS_PER_JURUSAN,
  DAFTAR_KELAS_SMKN21,
  KELAS_GROUPS_DROPDOWN,
  getJurusanInfo,
};

export default function RegistrasiSiswa() {
  const webcamRef = useRef(null);
  const [siswaList, setSiswaList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [jurusanFilter, setJurusanFilter] = useState("ALL");
  const [kelasFilter, setKelasFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL"); // "ALL" | "Aktif" | "Alumni"

  // Multi-select & Bulk Action state
  const [selectedIds, setSelectedIds] = useState([]);
  const [luluskanModalData, setLuluskanModalData] = useState({
    isOpen: false,
    type: "tingkat_xii", // "tingkat_xii" | "selected" | "single"
    targetSiswa: null,
  });
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [nis, setNis] = useState("");
  const [nama, setNama] = useState("");
  const [kelas, setKelas] = useState("X PPLG 1");
  const [samples, setSamples] = useState([]); // Array of base64 images (1 to 3)
  const [currentSlot, setCurrentSlot] = useState(0); // 0, 1, or 2
  const [notification, setNotification] = useState(null);

  // Edit / Delete State
  const [editingSiswa, setEditingSiswa] = useState(null);
  const [deletingSiswa, setDeletingSiswa] = useState(null);
  const [reRecordingSiswa, setReRecordingSiswa] = useState(null);

  const fetchSiswa = async () => {
    setLoadingList(true);
    try {
      const res = await axios.get("http://localhost:5000/api/siswa");
      setSiswaList(res.data || []);
    } catch (err) {
      console.error("Gagal mengambil data siswa:", err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchSiswa();
  }, []);

  // Ambil foto untuk slot yang aktif
  const takeSamplePhoto = useCallback(() => {
    if (!webcamRef.current) return;
    const screenshot = webcamRef.current.getScreenshot();
    if (screenshot) {
      const newSamples = [...samples];
      newSamples[currentSlot] = screenshot;
      setSamples(newSamples);

      // Pindah ke slot berikutnya otomatis jika masih di bawah 3
      if (currentSlot < 2) {
        setCurrentSlot(currentSlot + 1);
      }
      setNotification({
        type: "info",
        message: `Foto sampel ke-${currentSlot + 1} berhasil diambil!`,
      });
    }
  }, [webcamRef, currentSlot, samples]);

  const removeSample = (index) => {
    const newSamples = samples.filter((_, idx) => idx !== index);
    setSamples(newSamples);
    setCurrentSlot(newSamples.length);
  };

  // Simpan data siswa & sampel wajah
  const handleRegister = async (e) => {
    e.preventDefault();

    // 1. Validasi NIS
    const cleanNis = nis.trim();
    if (!cleanNis || !/^\d{4,18}$/.test(cleanNis)) {
      setNotification({
        type: "error",
        message: "NIS harus berupa angka antara 4 sampai 18 digit!",
      });
      return;
    }

    // 2. Validasi Nama
    const cleanNama = nama.trim();
    if (cleanNama.length < 3) {
      setNotification({
        type: "error",
        message: "Nama lengkap siswa minimal 3 huruf!",
      });
      return;
    }
    if (!/^[a-zA-Z\s\.\',\-]+$/.test(cleanNama)) {
      setNotification({
        type: "error",
        message:
          "Nama siswa hanya boleh berupa huruf, spasi, titik, atau tanda petik!",
      });
      return;
    }

    // 3. Validasi Kelas & Jurusan
    const cleanKelas = kelas.trim();
    if (!DAFTAR_KELAS_SMKN21.includes(cleanKelas)) {
      setNotification({
        type: "error",
        message:
          "Jurusan tidak valid! Jurusan resmi SMKN 21: PPLG, AKL, MPLB, atau BR.",
      });
      return;
    }

    // 4. Validasi Foto Sampel
    if (samples.length === 0) {
      setNotification({
        type: "error",
        message:
          "Harap ambil minimal 1 foto sampel wajah siswa terlebih dahulu!",
      });
      return;
    }

    setSubmitting(true);
    setNotification(null);

    try {
      let targetId = reRecordingSiswa ? reRecordingSiswa.id : null;

      // Buat siswa baru jika bukan rekam ulang
      if (!targetId) {
        const createRes = await axios.post("http://localhost:5000/api/siswa", {
          nis: cleanNis,
          nama: cleanNama,
          kelas: cleanKelas,
        });
        targetId = createRes.data.id;
      }

      // Kirim seluruh sampel wajah ke backend (multi-sample)
      const faceRes = await axios.post(
        "http://localhost:5000/api/register_face",
        {
          siswa_id: targetId,
          images: samples,
        },
      );

      setNotification({
        type: "success",
        message:
          faceRes.data.message ||
          `Berhasil mendaftarkan ${cleanNama} (${cleanKelas}) dengan ${samples.length} sampel wajah!`,
      });

      // Reset form
      setNis("");
      setNama("");
      setSamples([]);
      setCurrentSlot(0);
      setReRecordingSiswa(null);
      fetchSiswa();
    } catch (err) {
      setNotification({
        type: "error",
        message:
          err.response?.data?.message ||
          "Gagal mendaftarkan siswa atau biometrik wajah. Pastikan wajah terlihat jelas.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Luluskan & Status Actions
  const handleLuluskanTingkatXII = () => {
    setLuluskanModalData({
      isOpen: true,
      type: "tingkat_xii",
      targetSiswa: null,
    });
  };

  const handleLuluskanSelected = () => {
    if (selectedIds.length === 0) return;
    setLuluskanModalData({
      isOpen: true,
      type: "selected",
      targetSiswa: null,
    });
  };

  const handleLuluskanSingle = (siswa) => {
    setLuluskanModalData({
      isOpen: true,
      type: "single",
      targetSiswa: siswa,
    });
  };

  const confirmLuluskanModal = async () => {
    setActionLoading(true);
    try {
      if (luluskanModalData.type === "tingkat_xii") {
        const res = await axios.post(
          "http://localhost:5000/api/siswa/luluskan_tingkat",
          { tingkat: "XII" },
        );
        setNotification({
          type: "success",
          message:
            res.data.message ||
            "Seluruh siswa kelas XII berhasil diluluskan menjadi Alumni.",
        });
      } else if (luluskanModalData.type === "selected") {
        const res = await axios.post(
          "http://localhost:5000/api/siswa/bulk_status",
          { siswa_ids: selectedIds, status: "Alumni" },
        );
        setNotification({
          type: "success",
          message:
            res.data.message ||
            `${selectedIds.length} siswa berhasil diluluskan menjadi Alumni.`,
        });
        setSelectedIds([]);
      } else if (
        luluskanModalData.type === "single" &&
        luluskanModalData.targetSiswa
      ) {
        const res = await axios.patch(
          `http://localhost:5000/api/siswa/${luluskanModalData.targetSiswa.id}/status`,
          { status: "Alumni" },
        );
        setNotification({
          type: "success",
          message:
            res.data.message ||
            `Siswa ${luluskanModalData.targetSiswa.nama} berhasil diubah menjadi Alumni.`,
        });
      }
      setLuluskanModalData({
        isOpen: false,
        type: "tingkat_xii",
        targetSiswa: null,
      });
      fetchSiswa();
    } catch (err) {
      setNotification({
        type: "error",
        message:
          err.response?.data?.message || "Gagal memproses kelulusan siswa.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Aktifkan Kembali Siswa (Reactivate)
  const handleAktifkanSelected = async () => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    try {
      const res = await axios.post(
        "http://localhost:5000/api/siswa/bulk_status",
        {
          siswa_ids: selectedIds,
          status: "Aktif",
        },
      );
      setNotification({
        type: "success",
        message:
          res.data.message ||
          `${selectedIds.length} siswa berhasil diaktifkan kembali.`,
      });
      setSelectedIds([]);
      fetchSiswa();
    } catch (err) {
      setNotification({
        type: "error",
        message: err.response?.data?.message || "Gagal mengaktifkan siswa.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAktifkanSingle = async (siswa) => {
    try {
      const res = await axios.patch(
        `http://localhost:5000/api/siswa/${siswa.id}/status`,
        { status: "Aktif" },
      );
      setNotification({
        type: "success",
        message:
          res.data.message ||
          `Siswa ${siswa.nama} berhasil diaktifkan kembali.`,
      });
      fetchSiswa();
    } catch (err) {
      setNotification({
        type: "error",
        message: err.response?.data?.message || "Gagal mengaktifkan siswa.",
      });
    }
  };

  // Hapus Massal (Permanent Bulk Delete)
  const confirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    try {
      const res = await axios.post(
        "http://localhost:5000/api/siswa/bulk_delete",
        { siswa_ids: selectedIds },
      );
      setNotification({
        type: "success",
        message:
          res.data.message ||
          `${selectedIds.length} data siswa berhasil dihapus dari database.`,
      });
      setSelectedIds([]);
      setBulkDeleting(false);
      fetchSiswa();
    } catch (err) {
      setNotification({
        type: "error",
        message:
          err.response?.data?.message ||
          "Gagal menghapus data siswa secara massal.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Hapus Siswa Satuan (Single Permanent Delete)
  const confirmDeleteSiswa = async () => {
    if (!deletingSiswa) return;
    try {
      await axios.delete(`http://localhost:5000/api/siswa/${deletingSiswa.id}`);
      setNotification({
        type: "success",
        message: `Siswa ${deletingSiswa.nama} berhasil dihapus dari database.`,
      });
      setDeletingSiswa(null);
      setSelectedIds((prev) => prev.filter((id) => id !== deletingSiswa.id));
      fetchSiswa();
    } catch (err) {
      setNotification({
        type: "error",
        message: err.response?.data?.message || "Gagal menghapus siswa.",
      });
    }
  };

  // Update Data Siswa
  const handleUpdateSiswa = async (e) => {
    e.preventDefault();
    if (!editingSiswa) return;

    const cleanNis = String(editingSiswa.nis || "").trim();
    if (!cleanNis || !/^\d{4,18}$/.test(cleanNis)) {
      setNotification({
        type: "error",
        message: "NIS harus berupa angka antara 4 sampai 18 digit!",
      });
      return;
    }

    const cleanNama = String(editingSiswa.nama || "").trim();
    if (cleanNama.length < 3 || !/^[a-zA-Z\s\.\',\-]+$/.test(cleanNama)) {
      setNotification({
        type: "error",
        message:
          "Nama siswa minimal 3 huruf dan tidak boleh mengandung angka/simbol aneh!",
      });
      return;
    }

    const cleanKelas = String(editingSiswa.kelas || "").trim();
    if (!DAFTAR_KELAS_SMKN21.includes(cleanKelas)) {
      setNotification({
        type: "error",
        message:
          "Jurusan tidak valid! Pilih jurusan resmi SMKN 21: PPLG, AKL, MPLB, atau BR.",
      });
      return;
    }

    try {
      await axios.put(`http://localhost:5000/api/siswa/${editingSiswa.id}`, {
        nis: cleanNis,
        nama: cleanNama,
        kelas: cleanKelas,
        status: editingSiswa.status || "Aktif",
      });
      setNotification({
        type: "success",
        message: `Data ${cleanNama} (${cleanKelas}) berhasil diperbarui.`,
      });
      setEditingSiswa(null);
      fetchSiswa();
    } catch (err) {
      setNotification({
        type: "error",
        message: err.response?.data?.message || "Gagal memperbarui data siswa.",
      });
    }
  };

  const totalAktif = siswaList.filter(
    (s) => (s.status || "Aktif") === "Aktif",
  ).length;
  const totalAlumni = siswaList.filter((s) => s.status === "Alumni").length;
  const totalKelasXIIAktif = siswaList.filter(
    (s) => s.kelas?.startsWith("XII") && (s.status || "Aktif") === "Aktif",
  ).length;

  const filteredSiswa = siswaList.filter((s) => {
    const matchSearch =
      s.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.kelas?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchJurusan =
      jurusanFilter === "ALL" ||
      (s.kelas && s.kelas.toUpperCase().includes(jurusanFilter));
    const matchKelas = kelasFilter === "ALL" || s.kelas === kelasFilter;
    const sStatus = s.status || "Aktif";
    const matchStatus = statusFilter === "ALL" || sStatus === statusFilter;
    return matchSearch && matchJurusan && matchKelas && matchStatus;
  });

  const uniqueKelas = Array.from(new Set(siswaList.map((s) => s.kelas))).filter(
    Boolean,
  );

  // Checkbox helpers
  const allFilteredIds = filteredSiswa.map((s) => s.id);
  const isAllSelected =
    filteredSiswa.length > 0 &&
    allFilteredIds.every((id) => selectedIds.includes(id));
  const isSomeSelected =
    filteredSiswa.some((s) => selectedIds.includes(s.id)) && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !allFilteredIds.includes(id)),
      );
    } else {
      setSelectedIds((prev) =>
        Array.from(new Set([...prev, ...allFilteredIds])),
      );
    }
  };

  const toggleSelectSiswa = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="py-6 sm:py-8 px-3.5 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs text-slate-600 flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Pendaftaran Siswa SMKN 21
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Mengelola data siswa
            </p>
          </div>
        </div>

        <button
          onClick={fetchSiswa}
          disabled={loadingList}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw
            className={`w-4 h-4 ${loadingList ? "animate-spin text-blue-600" : ""}`}
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notification banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl border mb-6 flex items-start justify-between gap-3 animate-in fade-in duration-150 ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : notification.type === "info"
                ? "bg-blue-50 border-blue-200 text-blue-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-start gap-3">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <div className="text-xs sm:text-sm font-medium leading-relaxed">
              {notification.message}
            </div>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Form & Multi-Sample Capture Left, Student Management Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Kolom Kiri: Form & Kamera Perekam Multi-Sampel */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">
                {reRecordingSiswa
                  ? `Rekam Ulang Wajah: ${reRecordingSiswa.nama}`
                  : "Daftarkan Siswa & Sampel Wajah"}
              </h2>
            </div>
            {reRecordingSiswa && (
              <button
                onClick={() => {
                  setReRecordingSiswa(null);
                  setNis("");
                  setNama("");
                  setSamples([]);
                }}
                className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
              >
                Batal
              </button>
            )}
          </div>

          <form onSubmit={handleRegister}>
            <div className="space-y-3.5 mb-5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Nomor Induk Siswa (NIS)
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Hanya angka (4-18 digit)
                  </span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="Contoh: 20261001"
                  value={nis}
                  onChange={(e) => setNis(e.target.value.replace(/\D/g, ""))}
                  disabled={reRecordingSiswa !== null}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 disabled:bg-slate-100 font-mono"
                />
                {nis.length > 0 && nis.length < 4 && (
                  <p className="text-[11px] text-amber-600 mt-1 font-medium">
                    * NIS minimal 4 digit angka
                  </p>
                )}
                {!reRecordingSiswa &&
                  siswaList.some((s) => s.nis === nis) &&
                  nis.length >= 4 && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">
                      * NIS {nis} sudah terdaftar di database
                    </p>
                  )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Nama Lengkap Siswa
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Minimal 3 karakter
                  </span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Rizky Pratama"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  disabled={reRecordingSiswa !== null}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 disabled:bg-slate-100"
                />
                {nama.trim().length > 0 && nama.trim().length < 3 && (
                  <p className="text-[11px] text-amber-600 mt-1 font-medium">
                    * Nama minimal 3 karakter huruf
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Kelas & Jurusan SMKN 21
                  </label>
                  <span className="text-[10px] bg-slate-50/50 font-semibold">
                    Pilih salah satu jurusan
                  </span>
                </div>
                <CustomDropdown
                  value={kelas}
                  onChange={setKelas}
                  groups={KELAS_GROUPS_DROPDOWN}
                  disabled={reRecordingSiswa !== null}
                  className="w-full"
                  placeholder="Pilih Kelas & Jurusan SMKN 21"
                  icon={<GraduationCap className="w-4 h-4 text-blue-600" />}
                />
              </div>
            </div>

            {/* Area Kamera */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Kamera Perekam Sampel
                </label>
                <span className="text-[11px] text-blue-600 font-semibold">
                  Foto {currentSlot + 1} dari 3
                </span>
              </div>

              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-950 border border-slate-700 flex items-center justify-center">
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    facingMode: "user",
                    width: 640,
                    height: 480,
                  }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-8 border-2 border-dashed border-white/40 rounded-xl pointer-events-none flex flex-col justify-between">
                  <div className="flex justify-between p-1">
                    <div className="w-4 h-4 border-t-2 border-l-2 border-blue-400"></div>
                    <div className="w-4 h-4 border-t-2 border-r-2 border-blue-400"></div>
                  </div>
                  <div className="flex justify-between p-1">
                    <div className="w-4 h-4 border-b-2 border-l-2 border-blue-400"></div>
                    <div className="w-4 h-4 border-b-2 border-r-2 border-blue-400"></div>
                  </div>
                </div>

                <div className="absolute bottom-2 inset-x-0 text-center pointer-events-none">
                  <span className="bg-black/70 text-slate-200 text-[10px] font-medium px-2.5 py-0.5 rounded-full">
                    {currentSlot === 0
                      ? "Tampak Depan"
                      : currentSlot === 1
                        ? "Sedikit Miring Kiri"
                        : "Sedikit Miring Kanan"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={takeSamplePhoto}
                className="w-full mt-2.5 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Ambil Foto {currentSlot + 1}</span>
              </button>
            </div>

            {/* 3 Slot Sampel Wajah (Multi-Sample Preview) */}
            <div className="mb-5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">
                  Sampel Terkumpul ({samples.length}/3)
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((idx) => {
                  const photo = samples[idx];
                  const isCurrent = currentSlot === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setCurrentSlot(idx)}
                      className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 cursor-pointer transition-all flex flex-col items-center justify-center ${
                        isCurrent
                          ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50"
                          : photo
                            ? "border-emerald-400 bg-white"
                            : "border-dashed border-slate-300 bg-white"
                      }`}
                    >
                      {photo ? (
                        <>
                          <img
                            src={photo}
                            alt={`Sampel ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSample(idx);
                            }}
                            className="absolute top-1 right-1 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center hover:bg-rose-700 active:scale-90 transition-transform shadow-sm cursor-pointer"
                            title="Hapus Sampel Ini"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.2 rounded bg-black/60 text-white text-[9px] font-bold">
                            #{idx + 1}
                          </span>
                        </>
                      ) : (
                        <div className="text-center p-1">
                          <Camera className="w-4 h-4 mx-auto text-slate-300 mb-1" />
                          <span className="text-[10px] font-semibold text-slate-400">
                            Foto {idx + 1}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || samples.length === 0}
              className="w-full py-3 px-6 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>
                  {reRecordingSiswa
                    ? `Perbarui Biometrik (${samples.length} Sampel)`
                    : `Simpan ${samples.length} Foto`}
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Kolom Kanan: Database Siswa Terdaftar (CRUD Management) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                Data Siswa Terdaftar
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                Total {siswaList.length} Siswa
              </span>
            </div>
          </div>

          {/* Filter Status Siswa Tabs (Semua, Aktif, Alumni) */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl mb-3.5 self-start overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semua ({siswaList.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Aktif")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                statusFilter === "Aktif"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Aktif ({totalAktif})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Alumni")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                statusFilter === "Alumni"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Alumni / Lulus ({totalAlumni})</span>
            </button>
          </div>

          {/* Search, Filter Kelas, & Tombol Cepat Luluskan Kelas XII */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama, NIS, atau kelas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <CustomDropdown
                value={kelasFilter}
                onChange={setKelasFilter}
                options={[
                  { value: "ALL", label: "Semua Kelas" },
                  ...uniqueKelas.map((k) => ({ value: k, label: k })),
                ]}
                icon={<Filter className="w-3.5 h-3.5 text-slate-400" />}
                className="w-full sm:w-auto"
                align="right"
              />

              {/* Tombol Luluskan Sekaligus Tingkat XII */}
              <button
                type="button"
                onClick={handleLuluskanTingkatXII}
                disabled={totalKelasXIIAktif === 0}
                title={
                  totalKelasXIIAktif > 0
                    ? `Luluskan sekaligus ${totalKelasXIIAktif} siswa kelas XII yang aktif`
                    : "Tidak ada siswa kelas XII yang aktif"
                }
                className="py-2 px-3 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap flex-shrink-0"
              >
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">Luluskan Kelas XII</span>
                <span className="sm:hidden">Luluskan XII</span>
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                  {totalKelasXIIAktif}
                </span>
              </button>
            </div>
          </div>

          {/* 1. Mobile Cards View (< md) */}
          <div className="md:hidden divide-y divide-slate-100 max-h-[560px] overflow-y-auto border border-slate-100 rounded-xl">
            {filteredSiswa.length === 0 ? (
              <div className="text-center py-12 text-slate-400 p-4">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2 stroke-1" />
                <p className="font-semibold text-slate-600 text-xs">
                  Tidak ada siswa ditemukan
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Coba ubah kata kunci atau filter status/kelas.
                </p>
              </div>
            ) : (
              filteredSiswa.map((s) => {
                const jurInfo = getJurusanInfo(s.kelas);
                const isSelected = selectedIds.includes(s.id);
                const isAlumni = s.status === "Alumni";

                return (
                  <div
                    key={s.id}
                    className={`p-3.5 transition-colors ${
                      isSelected ? "bg-blue-50/50" : "hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 mb-2">
                      {/* Checkbox Siswa */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectSiswa(s.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 mt-0.5 cursor-pointer"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-slate-900 text-sm truncate">
                            {s.nama}
                          </p>

                          {/* Status Badge */}
                          {isAlumni ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <span>Alumni</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span>Aktif</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[11px] text-slate-400 font-mono">
                            NIS: {s.nis}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[11px] font-bold text-slate-700">
                            {s.kelas}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${jurInfo.badge}`}
                          >
                            {jurInfo.kode}
                          </span>
                        </div>
                      </div>

                      {s.terdaftar ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{s.sample_count || 1} Foto</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">
                          Belum Ada
                        </span>
                      )}
                    </div>

                    {/* Tombol Aksi Touch-Friendly di Mobile */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 flex-wrap">
                      {/* Luluskan atau Aktifkan Kembali */}
                      {isAlumni ? (
                        <button
                          type="button"
                          onClick={() => handleAktifkanSingle(s)}
                          className="py-1.5 px-2 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>Aktifkan</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleLuluskanSingle(s)}
                          className="py-1.5 px-2 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>Luluskan</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setReRecordingSiswa(s);
                          setNis(s.nis);
                          setNama(s.nama);
                          setKelas(s.kelas);
                          setSamples([]);
                          setCurrentSlot(0);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="py-1.5 px-2 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Rekam</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingSiswa(s)}
                        className="py-1.5 px-2.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingSiswa(s)}
                        className="py-1.5 px-2.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer ml-auto"
                        title="Hapus Permanen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 2. Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[560px] flex-1 border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse text-xs min-w-[580px]">
              <thead className="sticky top-0 bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 z-10">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeSelected;
                      }}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      title="Pilih Semua Siswa pada Daftar"
                    />
                  </th>
                  <th className="p-3">Siswa</th>
                  <th className="p-3">Kelas & Status</th>
                  <th className="p-3">Biometrik Wajah</th>
                  <th className="p-3 text-right">Kelola / Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSiswa.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center py-12 text-slate-400"
                    >
                      Tidak ada siswa ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredSiswa.map((s) => {
                    const isSelected = selectedIds.includes(s.id);
                    const isAlumni = s.status === "Alumni";

                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors ${
                          isSelected ? "bg-blue-50/50" : "hover:bg-slate-50/60"
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectSiswa(s.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{s.nama}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            NIS: {s.nis}
                          </p>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800 text-xs">
                              {s.kelas}
                            </span>
                            {/* Badge Status Aktif / Alumni */}
                            {isAlumni ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <span>Alumni</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span>Aktif</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          {s.terdaftar ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span>{s.sample_count || 1} Foto</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Belum Ada
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle Status: Luluskan atau Aktifkan */}
                            {isAlumni ? (
                              <button
                                title="Aktifkan Kembali Siswa Ini"
                                onClick={() => handleAktifkanSingle(s)}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors border border-emerald-200 cursor-pointer"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                title="Luluskan Siswa Ini ke Status Alumni"
                                onClick={() => handleLuluskanSingle(s)}
                                className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors border border-indigo-200 cursor-pointer"
                              >
                                <GraduationCap className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Rekam Wajah */}
                            <button
                              title="Rekam Ulang Sampel Wajah"
                              onClick={() => {
                                setReRecordingSiswa(s);
                                setNis(s.nis);
                                setNama(s.nama);
                                setKelas(s.kelas);
                                setSamples([]);
                                setCurrentSlot(0);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors border border-blue-200/60 cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Siswa */}
                            <button
                              title="Edit Data Siswa"
                              onClick={() => setEditingSiswa(s)}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Hapus Siswa Permanen */}
                            <button
                              title="Hapus Permanen dari Database"
                              onClick={() => setDeletingSiswa(s)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors border border-rose-200 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Floating Action Bar saat ada siswa dipilih */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3 border border-slate-700 animate-in slide-in-from-bottom-5 duration-200 max-w-[95vw] overflow-x-auto">
          <div className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap">
            <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
            <span>{selectedIds.length} Siswa Dipilih</span>
          </div>

          <button
            type="button"
            onClick={handleLuluskanSelected}
            disabled={actionLoading}
            className="py-1.5 px-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
          >
            <span>Luluskan ke Alumni</span>
          </button>

          <button
            type="button"
            onClick={handleAktifkanSelected}
            disabled={actionLoading}
            className="py-1.5 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
          >
            <span>Aktifkan Kembali</span>
          </button>

          <button
            type="button"
            onClick={() => setBulkDeleting(true)}
            disabled={actionLoading}
            className="py-1.5 px-3 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
          >
            <span>Hapus</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Batalkan Pilihan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal Kelulusan Siswa (Tingkat XII, Terpilih, atau Tunggal) */}
      <LuluskanModal
        isOpen={luluskanModalData.isOpen}
        onClose={() =>
          setLuluskanModalData({
            isOpen: false,
            type: "tingkat_xii",
            targetSiswa: null,
          })
        }
        onConfirm={confirmLuluskanModal}
        type={luluskanModalData.type}
        targetSiswa={luluskanModalData.targetSiswa}
        selectedCount={selectedIds.length}
        loading={actionLoading}
      />

      {/* Modal Hapus Siswa (Single & Bulk) */}
      <DeleteSiswaModal
        deletingSiswa={deletingSiswa}
        setDeletingSiswa={setDeletingSiswa}
        confirmDeleteSiswa={confirmDeleteSiswa}
        isBulk={bulkDeleting}
        selectedCount={selectedIds.length}
        confirmBulkDelete={confirmBulkDelete}
        onCloseBulk={() => setBulkDeleting(false)}
        loading={actionLoading}
      />

      {/* Modal Edit Siswa */}
      <EditSiswaModal
        editingSiswa={editingSiswa}
        setEditingSiswa={setEditingSiswa}
        handleUpdateSiswa={handleUpdateSiswa}
        groups={KELAS_GROUPS_DROPDOWN}
      />
    </div>
  );
}
