import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
  ClipboardCheck,
  Search,
  Printer,
  Trash2,
  AlertCircle,
  Loader2,
  LogIn,
  LogOut,
  PenTool,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Skeleton } from "../components/common/Skeleton";
import CustomDatePicker, {
  formatTanggalIndo,
} from "../components/CustomDatePicker";
import CustomDropdown from "../components/CustomDropdown";
import SlipIzinPiketModal from "../components/piket/SlipIzinPiketModal";
import DeleteIzinModal from "../components/piket/DeleteIzinModal";
import SignaturePadModal from "../components/SignaturePadModal";
import ToastNotification from "../components/common/ToastNotification";
import StudentPicker from "../components/common/StudentPicker";
import { useDebouncedRealtime } from "../hooks/useDebouncedRealtime";
import { unwrapList } from "../utils/api";
import { todayWib } from "../utils/date";
import { Siswa } from "../types/auth";

const NAMA_HARI_MAP = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const JAM_LIST = [
  { num: 1, label: "Jam ke-1", waktu: "06.45 - 07.30" },
  { num: 2, label: "Jam ke-2", waktu: "07.30 - 08.15" },
  { num: 3, label: "Jam ke-3", waktu: "08.15 - 09.00" },
  { num: 4, label: "Jam ke-4", waktu: "09.00 - 09.45" },
  { num: 5, label: "Jam ke-5", waktu: "10.00 - 10.40" },
  { num: 6, label: "Jam ke-6", waktu: "10.40 - 11.20" },
  { num: 7, label: "Jam ke-7", waktu: "11.20 - 12.00" },
  { num: 8, label: "Jam ke-8", waktu: "12.45 - 13.30" },
  { num: 9, label: "Jam ke-9", waktu: "13.30 - 14.15" },
  { num: 10, label: "Jam ke-10", waktu: "14.15 - 15.00" },
];

const JAM_MULAI_OPTIONS = JAM_LIST.map((j) => ({
  value: String(j.num),
  label: `${j.label} (${j.waktu})`,
}));

const QUICK_JAM_PRESETS = [
  { label: "Jam 1", mulai: "1", selesai: "1" },
  { label: "Jam 1 s/d 2", mulai: "1", selesai: "2" },
  { label: "Jam 1 s/d 4", mulai: "1", selesai: "4" },
  { label: "Jam 3 s/d 6", mulai: "3", selesai: "6" },
  { label: "Jam 5 s/d Selesai", mulai: "5", selesai: "Selesai" },
  { label: "Jam 1 s/d Selesai", mulai: "1", selesai: "Selesai" },
];

const computeJamKeString = (mulai: string, selesai: string): string => {
  const m = Number(mulai);
  if (selesai === "Selesai") {
    return `Jam ke-${m} s/d Selesai`;
  }
  const s = Number(selesai);
  if (s > m) {
    return `Jam ke-${m} s/d Jam ke-${s}`;
  }
  return `Jam ke-${m}`;
};

const getTodayStr = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getInitialValidWeekday = (): string => {
  const d = new Date();
  const day = d.getDay(); // 0: Minggu, 6: Sabtu
  if (day === 6)
    d.setDate(d.getDate() + 2); // Maju ke Senin berikutnya
  else if (day === 0) d.setDate(d.getDate() + 1); // Maju ke Senin
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const dayStr = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayStr}`;
};

export interface IzinPiketRecord {
  id: number | string;
  siswa_id: number;
  nama: string;
  nis: string;
  kelas: string;
  hari: string;
  tanggal: string;
  tanggal_formatted?: string;
  tipe: "Izin Masuk" | "Izin Meninggalkan Kelas" | string;
  jam_ke: string;
  alasan: string;
  petugas_piket: string;
  tanda_tangan_petugas?: string;
  tanda_tangan_siswa?: string;
  [key: string]: any;
}

export default function GuruPiket(): React.JSX.Element {
  const { user, isPiket, isAdmin, saveSignature } = useAuth();
  const backTarget = isPiket
    ? "/portal-piket"
    : isAdmin
      ? "/portal-admin"
      : "/";
  const todayStr = useMemo(() => todayWib(), []);

  // State Siswa Terpilih (menggunakan StudentPicker)
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);

  // State Formulir Penerbitan Surat
  const [tipe, setTipe] = useState("Izin Masuk"); // "Izin Masuk" atau "Izin Meninggalkan Kelas"
  const [tanggal, setTanggal] = useState(getInitialValidWeekday);
  const [jamMulai, setJamMulai] = useState("1");
  const [jamSelesai, setJamSelesai] = useState("1");
  const [jamKe, setJamKe] = useState("Jam ke-1");
  const [alasan, setAlasan] = useState("");
  const [petugasPiket, setPetugasPiket] = useState(
    () => user?.nama || "Guru Piket SMKN 21",
  );
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Selalu sinkronkan nama petugas piket dengan nama akun yang sedang aktif
  useEffect(() => {
    if (user?.nama) {
      setPetugasPiket(user.nama);
    }
  }, [user]);

  // Keamanan tanda tangan: hanya gunakan tanda tangan profil akun resmi (hindari kebocoran localStorage perangkat bersama)
  const currentSignature = user?.tanda_tangan;

  const handleSaveSignature = async (sigBase64: string) => {
    if (user) {
      await saveSignature(sigBase64);
    }
    setNotification({
      type: "success",
      message: "Tanda tangan digital Guru Piket berhasil disimpan ke akun!",
    });
  };

  // Opsi Jam Selesai dinamis berdasarkan Jam Mulai
  const jamSelesaiOptions = useMemo(() => {
    const numM = Number(jamMulai) || 1;
    const opts = [];
    for (let i = numM; i <= 10; i++) {
      const item = JAM_LIST.find((j) => j.num === i);
      if (item) {
        opts.push({
          value: String(i),
          label:
            i === numM
              ? `${item.label} (Hanya 1 Jam)`
              : `${item.label} (s/d ${item.waktu.split(" - ")[1]})`,
        });
      }
    }
    opts.push({
      value: "Selesai",
      label: "Sampai Selesai (Pulang Sekolah)",
    });
    return opts;
  }, [jamMulai]);

  const handleJamMulaiChange = (val: string) => {
    setJamMulai(val);
    const numM = Number(val);
    let newSelesai = jamSelesai;
    if (jamSelesai !== "Selesai" && Number(jamSelesai) < numM) {
      newSelesai = val;
      setJamSelesai(val);
    }
    setJamKe(computeJamKeString(val, newSelesai));
  };

  const handleJamSelesaiChange = (val: string) => {
    setJamSelesai(val);
    setJamKe(computeJamKeString(jamMulai, val));
  };

  const handlePresetJam = (mulai: string, selesai: string) => {
    setJamMulai(mulai);
    setJamSelesai(selesai);
    setJamKe(computeJamKeString(mulai, selesai));
  };

  // State Riwayat Izin Meja Piket
  const [riwayatList, setRiwayatList] = useState<IzinPiketRecord[]>([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(false);
  const [filterTanggalMode, setFilterTanggalMode] = useState<
    "today" | "all" | "custom"
  >("today");
  const [filterTanggalCustom, setFilterTanggalCustom] = useState(todayStr);
  const [riwayatSearch, setRiwayatSearch] = useState("");
  const reqIdRef = useRef(0);

  // Modal E-Slip
  const [selectedSlip, setSelectedSlip] = useState<IzinPiketRecord | null>(
    null,
  );

  // Form Submitting, Modal Hapus, & Floating Notification
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [deletingIzin, setDeletingIzin] = useState<IzinPiketRecord | null>(
    null,
  );
  const [deletingLoading, setDeletingLoading] = useState(false);

  // Auto-dismiss notification setelah 5 detik
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Hitung Hari Otomatis dari Tanggal
  const computedHari = useMemo(() => {
    if (!tanggal) return "Senin";
    try {
      const [year, month, day] = tanggal.split("-").map(Number);
      const dateObj = new Date(year, month - 1, day);
      return NAMA_HARI_MAP[dateObj.getDay()] || "Senin";
    } catch {
      return "Senin";
    }
  }, [tanggal]);

  // Fetch Riwayat Izin Piket dengan race guard
  const fetchRiwayat = async () => {
    const currentReqId = ++reqIdRef.current;
    setLoadingRiwayat(true);
    try {
      let tglParam = "ALL";
      if (filterTanggalMode === "today") {
        tglParam = todayStr;
      } else if (filterTanggalMode === "custom") {
        tglParam = filterTanggalCustom;
      }

      const res = await api.get("/piket/izin", {
        params: {
          tanggal: tglParam,
          search: riwayatSearch.trim() || undefined,
        },
      });
      if (currentReqId === reqIdRef.current) {
        setRiwayatList(unwrapList<IzinPiketRecord>(res.data));
      }
    } catch (err) {
      if (currentReqId === reqIdRef.current) {
        console.error("Gagal memuat riwayat izin piket:", err);
      }
    } finally {
      if (currentReqId === reqIdRef.current) {
        setLoadingRiwayat(false);
      }
    }
  };

  useEffect(() => {
    fetchRiwayat();
  }, [filterTanggalMode, filterTanggalCustom, riwayatSearch]);

  // Sinkronisasi data realtime otomatis dengan debounce 500ms
  useDebouncedRealtime(
    ["piket", "presensi", "siswa"],
    () => {
      fetchRiwayat();
    },
    500,
  );

  // Submit Formulir Izin Piket
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!selectedSiswa) {
      setFormError("Silakan pilih siswa yang mengajukan izin.");
      setNotification({
        type: "error",
        message:
          "Silakan pilih siswa yang mengajukan surat izin terlebih dahulu.",
      });
      return;
    }

    if (!petugasPiket.trim()) {
      setFormError("Nama Petugas Piket wajib diisi.");
      setNotification({
        type: "error",
        message: "Nama Petugas Guru Piket wajib diisi.",
      });
      return;
    }

    if (!alasan.trim()) {
      setFormError("Alasan keperluan izin wajib diisi.");
      setNotification({
        type: "error",
        message: "Alasan keperluan izin wajib diisi.",
      });
      return;
    }

    if (!currentSignature) {
      setFormError(
        "Guru Piket wajib menyertakan tanda tangan digital sebelum menerbitkan surat izin.",
      );
      setShowSignatureModal(true);
      setNotification({
        type: "error",
        message:
          "Guru Piket wajib membubuhkan tanda tangan digital sebelum menerbitkan surat izin.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        siswa_id: selectedSiswa.id,
        hari: computedHari,
        tanggal: tanggal,
        tipe: tipe,
        jam_ke: jamKe,
        alasan: alasan.trim(),
        petugas_piket: (
          user?.nama ||
          petugasPiket ||
          "Guru Piket SMKN 21"
        ).trim(),
        tanda_tangan_petugas: currentSignature,
        tanda_tangan_siswa: selectedSiswa.tanda_tangan || null,
      };

      const res = await api.post("/piket/izin", payload);

      if (res.data && res.data.success) {
        const createdData = res.data.data;

        // Buka E-Slip secara otomatis
        setSelectedSlip(createdData);

        // Reset form input spesifik siswa
        setSelectedSiswa(null);
        setAlasan("");
        setNotification({
          type: "success",
          message: `Surat ${tipe} untuk ${createdData.nama} (${createdData.kelas}) berhasil diterbitkan!`,
        });

        // Refresh riwayat
        fetchRiwayat();
      }
    } catch (err: any) {
      console.error("Gagal menerbitkan surat izin:", err);
      const errMsg =
        err.response?.data?.message ||
        "Terjadi kesalahan saat menerbitkan surat izin.";
      setFormError(errMsg);
      setNotification({
        type: "error",
        message: errMsg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Konfirmasi & Eksekusi Hapus Izin Piket via Modal
  const confirmDeleteIzin = async () => {
    if (!deletingIzin) return;
    setDeletingLoading(true);
    try {
      await api.delete(`/piket/izin/${deletingIzin.id}`);
      fetchRiwayat();
      setNotification({
        type: "success",
        message: `Surat izin untuk ${deletingIzin.nama} (${deletingIzin.kelas}) berhasil dihapus dari sistem.`,
      });
      setDeletingIzin(null);
    } catch (err: any) {
      console.error("Gagal menghapus surat izin:", err);
      setNotification({
        type: "error",
        message:
          err.response?.data?.message || "Gagal menghapus surat izin piket.",
      });
    } finally {
      setDeletingLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-6 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ================= HEADER SECTION ================= */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <Link
            to={backTarget}
            title={
              isAdmin ? "Kembali ke Beranda Admin" : "Kembali ke Beranda Piket"
            }
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors shadow-2xs flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5 break-words">
              Surat Ijin Masuk / Meninggalkan Kelas
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Portal penerbitan lembar izin resmi piket
            </p>
          </div>
        </div>
      </div>

      {/* ================= MAIN 2-COLUMN LAYOUT ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ================= KOLOM KIRI: FORMULIR PENERBITAN (5 Cols) ================= */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Formulir Penerbitan Surat
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {computedHari}, {formatTanggalIndo(tanggal, false)}
              </span>
            </div>

            {formError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {!currentSignature && (
              <div className="mb-4 bg-amber-500/10 border border-amber-500/30 text-slate-800 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 flex-shrink-0">
                    <PenTool className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 leading-tight">
                      Tanda Tangan Guru Piket Diperlukan
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Wajib membubuhkan tanda tangan digital sebelum menerbitkan
                      surat izin.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSignatureModal(true)}
                  className="w-full sm:w-auto px-3.5 py-2 min-h-[38px] bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer shadow-xs transition-all text-center flex items-center justify-center"
                >
                  Buat TTD
                </button>
              </div>
            )}

            {/* Informasi Petugas Piket yang Sedang Login */}
            <div className="mb-4 bg-slate-50 border border-slate-200/80 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <p className="text-[11px] text-slate-500 font-medium leading-tight">
                  Nama Petugas Piket
                </p>
                <p className="font-bold text-slate-800 text-xs truncate">
                  {user?.nama || "Guru Piket SMKN 21"}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* STEP 1: CARI & PILIH SISWA */}
              <StudentPicker
                label="1. Pilih Siswa"
                value={selectedSiswa}
                onChange={(s) => {
                  setSelectedSiswa(s);
                  setFormError("");
                }}
              />

              {/* STEP 2: KEPERLUAN IZIN (RADIO CARDS) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  2. Jenis Keperluan <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Pilihan 1: Izin Masuk */}
                  <button
                    type="button"
                    onClick={() => setTipe("Izin Masuk")}
                    className={`p-3 rounded-xl border text-left transition-colors duration-150 cursor-pointer flex flex-col justify-between ${
                      tipe === "Izin Masuk"
                        ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          tipe === "Izin Masuk"
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <LogIn className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-xs font-bold text-slate-900 break-words">
                        Ijin Masuk
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        Terlambat & minta izin masuk kelas
                      </p>
                    </div>
                  </button>

                  {/* Pilihan 2: Izin Meninggalkan Kelas */}
                  <button
                    type="button"
                    onClick={() => setTipe("Izin Meninggalkan Kelas")}
                    className={`p-3 rounded-xl border text-left transition-colors duration-150 cursor-pointer flex flex-col justify-between ${
                      tipe === "Izin Meninggalkan Kelas"
                        ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          tipe === "Izin Meninggalkan Kelas"
                            ? "bg-amber-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-xs font-bold text-slate-900 break-words">
                        Meninggalkan Kelas
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        Izin keluar / pulang lebih awal
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* STEP 3: TANGGAL & HARI */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    3. Tanggal Surat <span className="text-rose-500">*</span>
                  </label>
                </div>
                <CustomDatePicker
                  className="w-full"
                  value={tanggal}
                  onChange={(val) => setTanggal(val)}
                  minDate={todayStr}
                  disableWeekends={true}
                />
              </div>

              {/* STEP 4: JAM PELAJARAN KE- */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    4. Jam Pelajaran Ke-{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                    {jamKe}
                  </span>
                </div>

                {/* Dual Dropdown: Dari Jam .. Sampai Jam .. */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Dari Jam ke-
                    </label>
                    <CustomDropdown
                      className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all shadow-2xs"
                      value={jamMulai}
                      onChange={handleJamMulaiChange}
                      options={JAM_MULAI_OPTIONS}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Sampai Jam ke-
                    </label>
                    <CustomDropdown
                      className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all shadow-2xs"
                      value={jamSelesai}
                      onChange={handleJamSelesaiChange}
                      options={jamSelesaiOptions}
                    />
                  </div>
                </div>

                {/* Preset Cepat Jam Pelajaran */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-medium text-slate-400 mr-0.5">
                    Preset
                  </span>
                  {QUICK_JAM_PRESETS.map((p) => {
                    const isActive =
                      jamMulai === p.mulai && jamSelesai === p.selesai;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => handlePresetJam(p.mulai, p.selesai)}
                        className={`text-[10px] px-2 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                          isActive
                            ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 5: ALASAN KEPERLUAN */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    5. Alasan Keperluan <span className="text-rose-500">*</span>
                  </label>
                  <span
                    className={`text-[10px] font-semibold ${
                      alasan.length >= 80
                        ? "text-rose-600 font-bold"
                        : "text-slate-400"
                    }`}
                  >
                    {alasan.length} / 80 karakter
                  </span>
                </div>

                <textarea
                  rows={2}
                  maxLength={80}
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  placeholder="Contoh: Macet di jalan, ban motor bocor, atau sakit UKS..."
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all shadow-2xs resize-none"
                />
              </div>

              {/* TOMBOL TERBITKAN SURAT */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] ${
                    !currentSignature
                      ? "bg-slate-800 hover:bg-slate-900 shadow-slate-900/20"
                      : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menerbitkan Surat...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      <span>Terbitkan Surat</span>
                    </>
                  )}
                </button>
                {!currentSignature && (
                  <p className="text-[11px] text-amber-600 font-medium text-center mt-1.5 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>
                      Wajib memiliki tanda tangan digital sebelum menerbitkan
                      surat
                    </span>
                  </p>
                )}
              </div>
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 text-center">
            * E-slip yang diterbitkan dapat langsung dicetak atau ditunjukkan
            oleh siswa ke guru pengajar.
          </div>
        </div>

        {/* ================= KOLOM KANAN: RIWAYAT IZIN MEJA PIKET (7 Cols) ================= */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 flex flex-col">
          {/* Header Riwayat & Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Log Izin Meja Piket
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                {riwayatList.length} Surat
              </span>
            </div>
          </div>

          {/* Filter Bar Tanggal & Search */}
          <div className="space-y-2.5 mb-4">
            {/* Baris 1: Toggle Mode Tanggal & Custom Date Picker */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Toggle Tanggal Mode */}
              <div className="grid grid-cols-3 sm:inline-flex w-full sm:w-auto rounded-xl p-0.5 bg-slate-100 border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterTanggalMode("today")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors duration-150 cursor-pointer text-center ${
                    filterTanggalMode === "today"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTanggalMode("all")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors duration-150 cursor-pointer text-center ${
                    filterTanggalMode === "all"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTanggalMode("custom")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors duration-150 cursor-pointer text-center ${
                    filterTanggalMode === "custom"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Pilih Tanggal
                </button>
              </div>

              {/* Custom Date Picker jika mode custom */}
              {filterTanggalMode === "custom" && (
                <div className="w-full sm:w-auto min-w-[170px]">
                  <CustomDatePicker
                    size="sm"
                    value={filterTanggalCustom}
                    onChange={(val) => setFilterTanggalCustom(val)}
                  />
                </div>
              )}
            </div>

            {/* Baris 2: Search Input Riwayat Full Width */}
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={riwayatSearch}
                onChange={(e) => setRiwayatSearch(e.target.value)}
                placeholder="Cari siswa, kelas, atau alasan..."
                className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* List Cards Riwayat Izin Piket */}
          <div className="flex-1 overflow-y-auto max-h-[500px] sm:max-h-[600px] lg:max-h-[720px] overscroll-contain space-y-3 pr-1">
            {loadingRiwayat ? (
              <div className="space-y-2.5 py-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-36 rounded-md" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-48 rounded-md" />
                    <Skeleton className="h-3 w-full rounded-md" />
                  </div>
                ))}
              </div>
            ) : riwayatList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                <ClipboardCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">
                  Belum ada surat izin diterbitkan
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {filterTanggalMode === "today"
                    ? "Belum ada siswa yang mengajukan izin ke meja piket hari ini."
                    : "Tidak ada data izin yang cocok dengan filter tanggal/pencarian."}
                </p>
              </div>
            ) : (
              riwayatList.map((item) => {
                const isMasuk = item.tipe === "Izin Masuk";
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    {/* Info Siswa & Izin */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isMasuk
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          <span>{item.tipe}</span>
                        </span>

                        <span className="text-xs font-bold text-slate-900">
                          {item.nama}
                        </span>
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                          {item.kelas}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800">
                          {item.jam_ke}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>
                          {item.hari}, {item.tanggal_formatted || item.tanggal}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-400">
                          {item.petugas_piket}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 italic bg-slate-50 p-2 rounded-lg border border-slate-100 break-words">
                        "{item.alasan}"
                      </p>
                    </div>

                    {/* Tombol Aksi */}
                    <div className="flex items-center gap-2 sm:self-center flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <button
                        type="button"
                        onClick={() => setSelectedSlip(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 text-xs font-bold transition-colors cursor-pointer"
                        title="Lihat / Cetak E-Slip Surat Izin"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Cetak Slip</span>
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setDeletingIzin(item)}
                          className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus Surat Izin (Khusus Admin)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ================= MODAL SLIP IZIN PIKET RESMI ================= */}
      <SlipIzinPiketModal
        isOpen={Boolean(selectedSlip)}
        slipData={selectedSlip}
        onClose={() => setSelectedSlip(null)}
      />

      {/* ================= MODAL KONFIRMASI HAPUS SURAT IZIN ================= */}
      <DeleteIzinModal
        deletingIzin={deletingIzin}
        onClose={() => setDeletingIzin(null)}
        onConfirm={confirmDeleteIzin}
        loading={deletingLoading}
      />

      {/* ================= MODAL TANDA TANGAN DIGITAL GURU PIKET ================= */}
      <SignaturePadModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onSave={handleSaveSignature}
        initialSignature={currentSignature}
        title="Tanda Tangan Digital Guru Piket"
        signerName={petugasPiket || "Guru Piket"}
      />

      {/* Toast Notification Seragam */}
      <ToastNotification
        notification={notification}
        onClose={() => setNotification(null)}
      />
    </div>
  );
}
