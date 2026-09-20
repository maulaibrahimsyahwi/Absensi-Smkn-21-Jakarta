import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import api from "../services/api";

import FormTambahSiswa from "../components/registrasi/FormTambahSiswa";
import TabelDaftarSiswa from "../components/registrasi/TabelDaftarSiswa";
import EditSiswaModal from "../components/registrasi/EditSiswaModal";
import DeleteSiswaModal from "../components/registrasi/DeleteSiswaModal";
import LuluskanModal from "../components/registrasi/LuluskanModal";
import ResetSiswaModals from "../components/registrasi/ResetSiswaModals";

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
    type: "tingkat_xii",
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

  // Edit / Delete / Reset Modals State
  const [editingSiswa, setEditingSiswa] = useState(null);
  const [deletingSiswa, setDeletingSiswa] = useState(null);
  const [reRecordingSiswa, setReRecordingSiswa] = useState(null);
  const [resettingPasswordSiswa, setResettingPasswordSiswa] = useState(null);
  const [resettingFaceSiswa, setResettingFaceSiswa] = useState(null);
  const [resettingSignatureSiswa, setResettingSignatureSiswa] = useState(null);
  const [resettingLoading, setResettingLoading] = useState(false);

  const fetchSiswa = async (isManual = false) => {
    setLoadingList(true);
    try {
      const delayPromise = isManual
        ? new Promise((resolve) => setTimeout(resolve, 450))
        : Promise.resolve();
      const [res] = await Promise.all([api.get("/siswa"), delayPromise]);
      const data = res.data || [];
      setSiswaList(data);
      if (isManual) {
        setNotification({
          type: "success",
          message: `Data siswa berhasil diperbarui (${data.length} siswa terdaftar).`,
        });
      }
    } catch (err) {
      console.error("Gagal mengambil data siswa:", err);
      if (isManual) {
        setNotification({
          type: "error",
          message: "Gagal memperbarui data siswa. Periksa koneksi backend.",
        });
      }
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchSiswa();
  }, []);

  // Auto-dismiss floating toast notification setelah 5 detik
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Ambil foto untuk slot yang aktif
  const takeSamplePhoto = useCallback(() => {
    if (!webcamRef.current) return;
    const screenshot = webcamRef.current.getScreenshot();
    if (screenshot) {
      const newSamples = [...samples];
      newSamples[currentSlot] = screenshot;
      setSamples(newSamples);

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

    const cleanNis = nis.trim();
    if (!cleanNis || !/^\d{4,18}$/.test(cleanNis)) {
      setNotification({
        type: "error",
        message: "NIS harus berupa angka antara 4 sampai 18 digit!",
      });
      return;
    }

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

    const cleanKelas = kelas.trim();
    if (!DAFTAR_KELAS_SMKN21.includes(cleanKelas)) {
      setNotification({
        type: "error",
        message:
          "Jurusan tidak valid! Jurusan resmi SMKN 21: PPLG, AKL, MPLB, atau BR.",
      });
      return;
    }

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

      if (!targetId) {
        const createRes = await api.post("/siswa", {
          nis: cleanNis,
          nama: cleanNama,
          kelas: cleanKelas,
        });
        targetId = createRes.data.id;
      }

      const faceRes = await api.post("/register_face", {
        siswa_id: targetId,
        images: samples,
      });

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
        const res = await api.post("/siswa/luluskan_tingkat", {
          tingkat: "XII",
        });
        setNotification({
          type: "success",
          message:
            res.data.message ||
            "Seluruh siswa kelas XII berhasil diluluskan menjadi Alumni.",
        });
      } else if (luluskanModalData.type === "selected") {
        const res = await api.post("/siswa/bulk_status", {
          siswa_ids: selectedIds,
          status: "Alumni",
        });
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
        const res = await api.patch(
          `/siswa/${luluskanModalData.targetSiswa.id}/status`,
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

  const handleAktifkanSingle = async (siswa) => {
    try {
      const res = await api.patch(`/siswa/${siswa.id}/status`, {
        status: "Aktif",
      });
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

  const confirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    try {
      const res = await api.post("/siswa/bulk_delete", {
        siswa_ids: selectedIds,
      });
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

  const confirmDeleteSiswa = async () => {
    if (!deletingSiswa) return;
    try {
      await api.delete(`/siswa/${deletingSiswa.id}`);
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
      await api.put(`/siswa/${editingSiswa.id}`, {
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

  const handleResetPasswordConfirm = async () => {
    if (!resettingPasswordSiswa) return;
    setResettingLoading(true);
    try {
      const res = await api.post(
        `/siswa/${resettingPasswordSiswa.id}/reset_password`,
      );
      setNotification({
        type: "success",
        message:
          res.data?.message ||
          `Kata sandi ${resettingPasswordSiswa.nama} berhasil direset ke default (NIS ${resettingPasswordSiswa.nis})`,
      });
      setResettingPasswordSiswa(null);
    } catch (err) {
      setNotification({
        type: "error",
        message:
          err.response?.data?.message || "Gagal mereset kata sandi siswa.",
      });
    } finally {
      setResettingLoading(false);
    }
  };

  const handleResetFaceConfirm = async () => {
    if (!resettingFaceSiswa) return;
    setResettingLoading(true);
    try {
      const res = await api.post(`/siswa/${resettingFaceSiswa.id}/reset_face`);
      setNotification({
        type: "success",
        message:
          res.data?.message ||
          `Biometrik wajah ${resettingFaceSiswa.nama} berhasil direset.`,
      });
      setResettingFaceSiswa(null);
      fetchSiswa();
    } catch (err) {
      setNotification({
        type: "error",
        message:
          err.response?.data?.message || "Gagal mereset biometrik wajah siswa.",
      });
    } finally {
      setResettingLoading(false);
    }
  };

  const handleResetSignatureConfirm = async () => {
    if (!resettingSignatureSiswa) return;
    setResettingLoading(true);
    try {
      const res = await api.post(
        `/siswa/${resettingSignatureSiswa.id}/reset_signature`,
      );
      setNotification({
        type: "success",
        message:
          res.data?.message ||
          `Tanda tangan digital ${resettingSignatureSiswa.nama} berhasil direset.`,
      });
      setResettingSignatureSiswa(null);
      fetchSiswa();
    } catch (err) {
      setNotification({
        type: "error",
        message:
          err.response?.data?.message ||
          "Gagal mereset tanda tangan digital siswa.",
      });
    } finally {
      setResettingLoading(false);
    }
  };

  // Perhitungan Data & Filter
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
    <div className="py-6 sm:py-8 px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Toast Notification Floating */}
      {notification && (
        <div
          className={`fixed top-20 right-4 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200 border max-w-md ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : notification.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          {notification.type === "success" && (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          )}
          {notification.type === "error" && (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          )}
          {notification.type === "info" && (
            <Info className="w-5 h-5 flex-shrink-0 text-blue-600" />
          )}
          <span className="text-xs sm:text-sm font-semibold">
            {notification.message}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <Link
            to="/portal-admin"
            title="Kembali ke Beranda Admin"
            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs text-slate-600 flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Pendaftaran Siswa SMKN 21
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Mengelola data dan biometrik wajah siswa SMKN 21 Jakarta
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchSiswa(true)}
          disabled={loadingList}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all shadow-2xs self-start sm:self-auto cursor-pointer disabled:opacity-50"
          title="Segarkan data siswa"
        >
          <RefreshCw
            className={`w-4 h-4 ${loadingList ? "animate-spin text-blue-600" : ""}`}
          />
          <span>{loadingList ? "Menyegarkan..." : "Refresh"}</span>
        </button>
      </div>

      {/* Main Grid: Form Left, Student Table Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-3">
        {/* Kolom Kiri: Form & Kamera Perekam */}
        <div className="lg:col-span-5">
          <FormTambahSiswa
            nis={nis}
            setNis={setNis}
            nama={nama}
            setNama={setNama}
            kelas={kelas}
            setKelas={setKelas}
            samples={samples}
            currentSlot={currentSlot}
            setCurrentSlot={setCurrentSlot}
            webcamRef={webcamRef}
            takeSamplePhoto={takeSamplePhoto}
            removeSample={removeSample}
            onSubmit={handleRegister}
            submitting={submitting}
            reRecordingSiswa={reRecordingSiswa}
            onCancelReRecord={() => {
              setReRecordingSiswa(null);
              setNis("");
              setNama("");
              setSamples([]);
            }}
            siswaList={siswaList}
          />
        </div>

        {/* Kolom Kanan: Tabel Siswa & Aksi */}
        <TabelDaftarSiswa
          siswaList={siswaList}
          filteredSiswa={filteredSiswa}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          kelasFilter={kelasFilter}
          setKelasFilter={setKelasFilter}
          uniqueKelas={uniqueKelas}
          selectedIds={selectedIds}
          isAllSelected={isAllSelected}
          isSomeSelected={isSomeSelected}
          toggleSelectAll={toggleSelectAll}
          toggleSelectSiswa={toggleSelectSiswa}
          totalAktif={totalAktif}
          totalAlumni={totalAlumni}
          totalKelasXIIAktif={totalKelasXIIAktif}
          onLuluskanTingkatXII={handleLuluskanTingkatXII}
          onLuluskanSelected={handleLuluskanSelected}
          onLuluskanSingle={handleLuluskanSingle}
          onAktifkanSingle={handleAktifkanSingle}
          onReRecord={(s) => {
            setReRecordingSiswa(s);
            setNis(s.nis);
            setNama(s.nama);
            setKelas(s.kelas);
            setSamples([]);
            setCurrentSlot(0);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onEdit={(s) => setEditingSiswa(s)}
          onDelete={(s) => setDeletingSiswa(s)}
          onResetPassword={(s) => setResettingPasswordSiswa(s)}
          onResetFace={(s) => setResettingFaceSiswa(s)}
          onResetSignature={(s) => setResettingSignatureSiswa(s)}
          onBulkDelete={() => setBulkDeleting(true)}
        />
      </div>

      {/* Modal Luluskan Siswa (Tingkat XII / Terpilih / Satuan) */}
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

      {/* Modal Konfirmasi Reset Password, Wajah, dan TTD Siswa */}
      <ResetSiswaModals
        resettingPasswordSiswa={resettingPasswordSiswa}
        setResettingPasswordSiswa={setResettingPasswordSiswa}
        handleResetPasswordConfirm={handleResetPasswordConfirm}
        resettingFaceSiswa={resettingFaceSiswa}
        setResettingFaceSiswa={setResettingFaceSiswa}
        handleResetFaceConfirm={handleResetFaceConfirm}
        resettingSignatureSiswa={resettingSignatureSiswa}
        setResettingSignatureSiswa={setResettingSignatureSiswa}
        handleResetSignatureConfirm={handleResetSignatureConfirm}
        loading={resettingLoading}
      />
    </div>
  );
}
