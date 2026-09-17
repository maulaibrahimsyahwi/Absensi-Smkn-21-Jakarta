import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import {
  ClipboardCheck,
  Search,
  User,
  Calendar,
  Clock,
  Printer,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PlusCircle,
  X,
  FileText,
  ShieldCheck,
  LogIn,
  LogOut,
  RefreshCw,
  Sparkles,
  Filter,
} from "lucide-react";
import CustomDatePicker, {
  formatTanggalIndo,
} from "../components/CustomDatePicker";
import CustomDropdown from "../components/CustomDropdown";
import SlipIzinPiketModal from "../components/piket/SlipIzinPiketModal";

const NAMA_HARI_MAP = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const JAM_PELAJARAN_OPTIONS = [
  { value: "Jam ke-1", label: "Jam ke-1 (06.45 - 07.30)" },
  { value: "Jam ke-2", label: "Jam ke-2 (07.30 - 08.15)" },
  { value: "Jam ke-3", label: "Jam ke-3 (08.15 - 09.00)" },
  { value: "Jam ke-4", label: "Jam ke-4 (09.00 - 09.45)" },
  { value: "Istirahat ke-1", label: "Istirahat ke-1 (09.45 - 10.00)" },
  { value: "Jam ke-5", label: "Jam ke-5 (10.00 - 10.40)" },
  { value: "Jam ke-6", label: "Jam ke-6 (10.40 - 11.20)" },
  { value: "Jam ke-7", label: "Jam ke-7 (11.20 - 12.00)" },
  { value: "Istirahat ke-2", label: "Istirahat ke-2 (12.00 - 12.45)" },
  { value: "Jam ke-8", label: "Jam ke-8 (12.45 - 13.30)" },
  { value: "Jam ke-9", label: "Jam ke-9 (13.30 - 14.15)" },
  { value: "Jam ke-10", label: "Jam ke-10 (14.15 - 15.00)" },
  { value: "Jam ke-1 s/d 2", label: "Jam ke-1 s/d 2" },
  { value: "Jam ke-3 s/d 4", label: "Jam ke-3 s/d 4" },
  { value: "Jam ke-5 s/d 6", label: "Jam ke-5 s/d 6" },
  { value: "Jam ke-7 s/d 8", label: "Jam ke-7 s/d 8" },
];

const QUICK_ALASAN_MASUK = [
  "Terlambat bangun / macet perjalanan",
  "Kendala kendaraan / ban bocor",
  "Urusan keluarga mendesak pagi hari",
  "Menyelesaikan keperluan administrasi",
  "Kondisi fisik kurang fit di pagi hari",
];

const QUICK_ALASAN_KELUAR = [
  "Sakit / istirahat di ruang UKS",
  "Urusan administrasi perbankan / KJP",
  "Dispensasi kegiatan lomba / dinas luar",
  "Urusan keluarga mendadak & mendesak",
  "Pemeriksaan kesehatan ke Puskesmas/RS",
];

export default function GuruPiket() {
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // State Daftar Siswa Aktif untuk Autocomplete
  const [siswaList, setSiswaList] = useState([]);
  const [loadingSiswa, setLoadingSiswa] = useState(false);
  const [siswaSearchInput, setSiswaSearchInput] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // State Formulir Penerbitan Surat
  const [tipe, setTipe] = useState("Izin Masuk"); // "Izin Masuk" atau "Izin Meninggalkan Kelas"
  const [tanggal, setTanggal] = useState(todayStr);
  const [jamKe, setJamKe] = useState("Jam ke-1");
  const [alasan, setAlasan] = useState("");
  const [petugasPiket, setPetugasPiket] = useState(() => {
    return localStorage.getItem("smkn21_petugas_piket") || "";
  });

  // State Riwayat Izin Meja Piket
  const [riwayatList, setRiwayatList] = useState([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(false);
  const [filterTanggalMode, setFilterTanggalMode] = useState("today"); // "today", "all", "custom"
  const [filterTanggalCustom, setFilterTanggalCustom] = useState(todayStr);
  const [riwayatSearch, setRiwayatSearch] = useState("");

  // Modal E-Slip
  const [selectedSlip, setSelectedSlip] = useState(null);

  // Form Submitting & Alert
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successToast, setSuccessToast] = useState("");

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

  // Simpan Nama Petugas Piket ke localStorage
  const handlePetugasChange = (val) => {
    setPetugasPiket(val);
    localStorage.setItem("smkn21_petugas_piket", val);
  };

  // Fetch Siswa Aktif
  useEffect(() => {
    const fetchSiswa = async () => {
      setLoadingSiswa(true);
      try {
        const res = await axios.get("http://localhost:5000/api/siswa", {
          params: { status: "Aktif" },
        });
        setSiswaList(res.data || []);
      } catch (err) {
        console.error("Gagal memuat siswa:", err);
      } finally {
        setLoadingSiswa(false);
      }
    };
    fetchSiswa();
  }, []);

  // Fetch Riwayat Izin Piket
  const fetchRiwayat = async () => {
    setLoadingRiwayat(true);
    try {
      let tglParam = "ALL";
      if (filterTanggalMode === "today") {
        tglParam = todayStr;
      } else if (filterTanggalMode === "custom") {
        tglParam = filterTanggalCustom;
      }

      const res = await axios.get("http://localhost:5000/api/piket/izin", {
        params: {
          tanggal: tglParam,
          search: riwayatSearch.trim() || undefined,
        },
      });
      setRiwayatList(res.data || []);
    } catch (err) {
      console.error("Gagal memuat riwayat izin piket:", err);
    } finally {
      setLoadingRiwayat(false);
    }
  };

  useEffect(() => {
    fetchRiwayat();
  }, [filterTanggalMode, filterTanggalCustom, riwayatSearch]);

  // Autocomplete Siswa Search
  const filteredSiswaOptions = useMemo(() => {
    if (!siswaSearchInput.trim()) return siswaList.slice(0, 8);
    const query = siswaSearchInput.toLowerCase();
    return siswaList
      .filter(
        (s) =>
          s.nama?.toLowerCase().includes(query) ||
          s.nis?.toLowerCase().includes(query) ||
          s.kelas?.toLowerCase().includes(query),
      )
      .slice(0, 10);
  }, [siswaList, siswaSearchInput]);

  // Handle outside click for autocomplete
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Submit Formulir Izin Piket
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!selectedSiswa) {
      setFormError("Silakan pilih siswa yang mengajukan izin.");
      return;
    }

    if (!petugasPiket.trim()) {
      setFormError("Nama Petugas Piket wajib diisi.");
      return;
    }

    if (!alasan.trim()) {
      setFormError("Alasan keperluan izin wajib diisi.");
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
        petugas_piket: petugasPiket.trim(),
      };

      const res = await axios.post(
        "http://localhost:5000/api/piket/izin",
        payload,
      );

      if (res.data && res.data.success) {
        const createdData = res.data.data;

        // Buka E-Slip secara otomatis
        setSelectedSlip(createdData);

        // Reset form input spesifik siswa
        setSelectedSiswa(null);
        setSiswaSearchInput("");
        setAlasan("");
        setSuccessToast(
          `Surat ${tipe} untuk ${createdData.nama} berhasil diterbitkan!`,
        );

        // Refresh riwayat
        fetchRiwayat();
      }
    } catch (err) {
      console.error("Gagal menerbitkan surat izin:", err);
      setFormError(
        err.response?.data?.message ||
          "Terjadi kesalahan saat menerbitkan surat izin.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Hapus Izin Piket
  const handleDeleteIzin = async (id, namaSiswa) => {
    if (
      !window.confirm(
        `Apakah Anda yakin ingin menghapus surat izin untuk ${namaSiswa}?`,
      )
    ) {
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/api/piket/izin/${id}`);
      fetchRiwayat();
      setSuccessToast("Surat izin berhasil dihapus dari sistem.");
    } catch (err) {
      alert("Gagal menghapus surat izin piket.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-6 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ================= HEADER SECTION ================= */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 flex-shrink-0">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              Surat Ijin Masuk / Meninggalkan Kelas
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Portal penerbitan lembar izin resmi piket
            </p>
          </div>
        </div>

        {/* Input Nama Petugas Piket (Sticky / Quick Setup) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 border border-slate-200/80 p-3 rounded-xl w-full sm:w-auto sm:min-w-[260px]">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="text-xs font-bold whitespace-nowrap">
              Petugas Piket
            </span>
          </div>
          <input
            type="text"
            value={petugasPiket}
            onChange={(e) => handlePetugasChange(e.target.value)}
            placeholder="Ketik Nama Anda / Guru Piket"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 flex-1"
          />
        </div>
      </div>

      {/* ================= TOAST NOTIFICATION ================= */}
      {successToast && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs sm:text-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast("")}
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* STEP 1: CARI & PILIH SISWA */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. Pilih Siswa <span className="text-rose-500">*</span>
                </label>

                {selectedSiswa ? (
                  /* Kartu Siswa Terpilih */
                  <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 border border-blue-200 animate-in fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                        {selectedSiswa.nama?.charAt(0) || "S"}
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                          {selectedSiswa.nama}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          NIS: {selectedSiswa.nis} • Kelas:{" "}
                          <span className="font-bold text-blue-700">
                            {selectedSiswa.kelas}
                          </span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSiswa(null);
                        setSiswaSearchInput("");
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors cursor-pointer"
                      title="Ganti Siswa"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  /* Input Autocomplete Siswa */
                  <div className="relative">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={siswaSearchInput}
                        onChange={(e) => {
                          setSiswaSearchInput(e.target.value);
                          setIsDropdownOpen(true);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        placeholder="Ketik Nama, NIS, atau Kelas..."
                        className="w-full text-xs sm:text-sm pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-2xs"
                      />
                      {loadingSiswa && (
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                      )}
                    </div>

                    {/* Dropdown Menu Hasil Autocomplete */}
                    {isDropdownOpen && (
                      <div
                        ref={dropdownRef}
                        className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto z-30 divide-y divide-slate-100"
                      >
                        {filteredSiswaOptions.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-400">
                            Tidak ada siswa yang cocok
                          </div>
                        ) : (
                          filteredSiswaOptions.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSelectedSiswa(s);
                                setIsDropdownOpen(false);
                                setFormError("");
                              }}
                              className="w-full text-left px-3.5 py-2 hover:bg-blue-50/80 transition-colors flex items-center justify-between group cursor-pointer"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                                  {s.nama}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  NIS: {s.nis} • {s.kelas}
                                </p>
                              </div>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700">
                                Pilih
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

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
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
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
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    3. Tanggal Surat
                  </label>
                  <CustomDatePicker
                    value={tanggal}
                    onChange={(val) => setTanggal(val)}
                  />
                </div>
              </div>

              {/* STEP 4: JAM PELAJARAN KE- */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  4. Jam Pelajaran Ke- <span className="text-rose-500">*</span>
                </label>
                <CustomDropdown
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all shadow-2xs"
                  value={jamKe}
                  onChange={(val) => setJamKe(val)}
                  options={JAM_PELAJARAN_OPTIONS}
                  placeholder="Pilih Jam Pelajaran..."
                />
              </div>

              {/* STEP 5: ALASAN KEPERLUAN & QUICK CHIPS */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    5. Alasan Keperluan <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Pilih saran cepat atau ketik sendiri
                  </span>
                </div>

                <textarea
                  rows={2}
                  value={alasan}
                  onChange={(e) => setAlasan(e.target.value)}
                  placeholder="Contoh: Ban motor kempes di jalan, urusan bank KJP, atau sakit kepala..."
                  className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all shadow-2xs resize-none"
                />
              </div>

              {/* TOMBOL TERBITKAN SURAT */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Tombol Refresh */}
            <button
              type="button"
              onClick={fetchRiwayat}
              disabled={loadingRiwayat}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  loadingRiwayat ? "animate-spin text-blue-600" : ""
                }`}
              />
              <span>Segarkan</span>
            </button>
          </div>

          {/* Filter Bar Tanggal & Search */}
          <div className="space-y-2.5 mb-4">
            {/* Baris 1: Toggle Mode Tanggal & Custom Date Picker */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Toggle Tanggal Mode */}
              <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterTanggalMode("today")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
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
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
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
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
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
          <div className="flex-1 overflow-y-auto max-h-[600px] space-y-3 pr-1">
            {loadingRiwayat ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <p className="text-xs">Memuat riwayat izin meja piket...</p>
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
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isMasuk
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {isMasuk ? (
                            <LogIn className="w-3 h-3" />
                          ) : (
                            <LogOut className="w-3 h-3" />
                          )}
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
                          Piket: {item.petugas_piket}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                        "{item.alasan}"
                      </p>
                    </div>

                    {/* Tombol Aksi */}
                    <div className="flex items-center gap-1.5 sm:self-center flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <button
                        type="button"
                        onClick={() => setSelectedSlip(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors cursor-pointer"
                        title="Lihat / Cetak E-Slip Surat Izin"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>E-Slip</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteIzin(item.id, item.nama)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus Izin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
    </div>
  );
}
