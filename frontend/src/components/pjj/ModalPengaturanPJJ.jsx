import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Calendar,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  School,
  Laptop,
  CheckSquare,
  Square,
  Building,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  DAFTAR_KELAS_SMKN21,
  JURUSAN_SMKN21,
  KELAS_PER_JURUSAN,
} from "../../constants/schoolData";
import CustomDatePicker from "../CustomDatePicker";

export default function ModalPengaturanPJJ({ isOpen, onClose, onUpdated }) {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form State
  const [isActive, setIsActive] = useState(false);
  const [tipeLingkup, setTipeLingkup] = useState("tingkat"); // 'semua' | 'tingkat' | 'kelas'
  const [tingkatAktif, setTingkatAktif] = useState([]); // ['X', 'XI', 'XII']
  const [kelasAktif, setKelasAktif] = useState([]); // ['X PPLG 1', ...]
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [keterangan, setKeterangan] = useState("");

  // UI Accordion State per Jurusan
  const [expandedJurusan, setExpandedJurusan] = useState({
    PPLG: false,
    AKL: false,
    MPLB: false,
    BR: false,
  });

  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  // Tanggal hari kerja sekolah yang valid pertama (bila hari ini Sabtu/Minggu, lompat ke Senin)
  const defaultSchoolDayStr = useMemo(() => {
    const d = new Date();
    const day = d.getDay(); // 0 = Minggu, 6 = Sabtu
    if (day === 6) d.setDate(d.getDate() + 2);
    else if (day === 0) d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dayStr = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dayStr}`;
  }, []);

  // Fetch status PJJ saat modal dibuka
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    api
      .get("/pjj/status")
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          const d = res.data.data;
          setIsActive(Boolean(d.is_active));
          setTipeLingkup(d.tipe_lingkup || "tingkat");
          setTingkatAktif(
            Array.isArray(d.tingkat_aktif) ? d.tingkat_aktif : [],
          );
          setKelasAktif(Array.isArray(d.kelas_aktif) ? d.kelas_aktif : []);

          // Pastikan tanggal awal bukan hari yang sudah lewat atau hari libur akhir pekan
          let initialMulai = d.tanggal_mulai || defaultSchoolDayStr;
          if (initialMulai < todayStr) {
            initialMulai = defaultSchoolDayStr;
          } else {
            const [y, m, dayNum] = initialMulai.split("-").map(Number);
            const dow = new Date(y, m - 1, dayNum).getDay();
            if (dow === 0 || dow === 6) {
              initialMulai = defaultSchoolDayStr;
            }
          }

          let initialSelesai = d.tanggal_selesai || initialMulai;
          if (initialSelesai < initialMulai) {
            initialSelesai = initialMulai;
          } else {
            const [y, m, dayNum] = initialSelesai.split("-").map(Number);
            const dow = new Date(y, m - 1, dayNum).getDay();
            if (dow === 0 || dow === 6) {
              initialSelesai = initialMulai;
            }
          }

          setTanggalMulai(initialMulai);
          setTanggalSelesai(initialSelesai);
          setKeterangan(d.keterangan || "");
        }
      })
      .catch((err) => {
        console.error("Gagal mengambil status PJJ:", err);
        setErrorMsg("Gagal memuat konfigurasi PJJ terkini dari server.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, todayStr, defaultSchoolDayStr]);

  // SMART PRESETS
  const applyPreset = (presetName) => {
    setErrorMsg("");
    if (presetName === "SEMUA_PJJ") {
      setIsActive(true);
      setTipeLingkup("semua");
      setTingkatAktif(["X", "XI", "XII"]);
      setKelasAktif([...DAFTAR_KELAS_SMKN21]);
      setKeterangan("Seluruh Siswa Pembelajaran Daring");
    } else if (presetName === "X_XI_PJJ") {
      setIsActive(true);
      setTipeLingkup("tingkat");
      setTingkatAktif(["X", "XI"]);
      const filtered = DAFTAR_KELAS_SMKN21.filter(
        (k) => k.startsWith("X ") || k.startsWith("XI "),
      );
      setKelasAktif(filtered);
      setKeterangan("Kelas X & XI PJJ (Kelas XII Masuk Sekolah / Ujian)");
    } else if (presetName === "XII_ONLY_PJJ") {
      setIsActive(true);
      setTipeLingkup("tingkat");
      setTingkatAktif(["XII"]);
      const filtered = DAFTAR_KELAS_SMKN21.filter((k) => k.startsWith("XII "));
      setKelasAktif(filtered);
      setKeterangan("Hanya Kelas XII PJJ (Kelas X & XI Masuk Sekolah)");
    } else if (presetName === "NORMAL_PTM") {
      setIsActive(false);
      setTipeLingkup("tingkat");
      setTingkatAktif([]);
      setKelasAktif([]);
      setKeterangan("Normal Pembelajaran Tatap Muka (PTM)");
    }
  };

  // Toggle Tingkat (X, XI, XII)
  const toggleTingkat = (tingkat) => {
    let nextTingkat = [...tingkatAktif];
    if (nextTingkat.includes(tingkat)) {
      nextTingkat = nextTingkat.filter((t) => t !== tingkat);
    } else {
      nextTingkat.push(tingkat);
    }
    setTingkatAktif(nextTingkat);

    // Otomatis sinkronkan kelasAktif
    const kelasTingkat = DAFTAR_KELAS_SMKN21.filter((k) =>
      k.startsWith(`${tingkat} `),
    );
    if (nextTingkat.includes(tingkat)) {
      setKelasAktif((prev) => Array.from(new Set([...prev, ...kelasTingkat])));
    } else {
      setKelasAktif((prev) => prev.filter((k) => !k.startsWith(`${tingkat} `)));
    }

    if (nextTingkat.length === 3) {
      setTipeLingkup("semua");
    } else if (nextTingkat.length > 0) {
      setTipeLingkup("tingkat");
    }
  };

  // Toggle Kelas Individual
  const toggleKelas = (kelasName) => {
    setTipeLingkup("kelas");
    setKelasAktif((prev) => {
      if (prev.includes(kelasName)) {
        return prev.filter((k) => k !== kelasName);
      } else {
        return [...prev, kelasName];
      }
    });
  };

  // Toggle Semua Kelas dalam Jurusan
  const toggleJurusan = (kodeJurusan) => {
    const listKelas = KELAS_PER_JURUSAN[kodeJurusan] || [];
    const allSelected = listKelas.every((k) => kelasAktif.includes(k));

    setTipeLingkup("kelas");
    if (allSelected) {
      setKelasAktif((prev) => prev.filter((k) => !listKelas.includes(k)));
    } else {
      setKelasAktif((prev) => Array.from(new Set([...prev, ...listKelas])));
    }
  };

  // Simpan Konfigurasi
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      setErrorMsg(
        "Akses ditolak: Hanya akun Administrator yang memiliki hak mengubah konfigurasi Mode PJJ.",
      );
      return;
    }
    setErrorMsg("");
    setSuccessMsg("");
    setSubmitting(true);

    try {
      if (isActive) {
        if (!tanggalMulai) {
          setErrorMsg("Tanggal mulai daring wajib dipilih.");
          setSubmitting(false);
          return;
        }
        if (!tanggalSelesai) {
          setErrorMsg("Tanggal selesai daring wajib dipilih.");
          setSubmitting(false);
          return;
        }
        if (tanggalMulai < todayStr) {
          setErrorMsg(
            "Tanggal mulai daring tidak boleh merupakan hari yang sudah berlalu.",
          );
          setSubmitting(false);
          return;
        }
        if (tanggalSelesai < tanggalMulai) {
          setErrorMsg(
            "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.",
          );
          setSubmitting(false);
          return;
        }

        const [y1, m1, d1] = tanggalMulai.split("-").map(Number);
        const dow1 = new Date(y1, m1 - 1, d1).getDay();
        if (dow1 === 0 || dow1 === 6) {
          setErrorMsg(
            "Tanggal mulai daring tidak boleh jatuh pada hari Sabtu atau Minggu (hari libur).",
          );
          setSubmitting(false);
          return;
        }

        const [y2, m2, d2] = tanggalSelesai.split("-").map(Number);
        const dow2 = new Date(y2, m2 - 1, d2).getDay();
        if (dow2 === 0 || dow2 === 6) {
          setErrorMsg(
            "Tanggal selesai daring tidak boleh jatuh pada hari Sabtu atau Minggu (hari libur).",
          );
          setSubmitting(false);
          return;
        }
      }

      const payload = {
        is_active: isActive,
        tipe_lingkup: tipeLingkup,
        tingkat_aktif: tingkatAktif,
        kelas_aktif: kelasAktif,
        tanggal_mulai: tanggalMulai || todayStr,
        tanggal_selesai: tanggalSelesai || todayStr,
        keterangan:
          keterangan.trim() || (isActive ? "Mode PJJ Daring" : "Normal PTM"),
      };

      const res = await api.post("/pjj/settings", payload);
      if (res.data?.success) {
        setSuccessMsg(
          res.data.message || "Pengaturan Mode PJJ berhasil disimpan!",
        );
        if (onUpdated) {
          onUpdated(res.data.data);
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error("Gagal memperbarui pengaturan PJJ:", err);
      setErrorMsg(
        err.response?.data?.message ||
          "Gagal menyimpan konfigurasi PJJ ke server.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-750 to-slate-900 p-5 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Laptop className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                Pengaturan Mode Daring
              </h3>
              <p className="text-xs text-blue-200">
                Pembelajaran Daring Berdasarkan Kelas & Tingkat
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
              <p className="text-xs">Memuat konfigurasi PJJ...</p>
            </div>
          ) : (
            <form id="pjj-form" onSubmit={handleSubmit} className="space-y-5">
              {/* STATUS TOGGLE MASTER */}
              <div
                className={`p-4 rounded-2xl border transition-colors flex items-center justify-between gap-4 ${
                  isActive
                    ? "bg-indigo-50/70 border-indigo-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isActive
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isActive ? (
                      <Wifi className="w-5 h-5" />
                    ) : (
                      <WifiOff className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Status Mode Daring{" "}
                      <span className="text-xs font-normal text-slate-500 ml-1">
                        {isActive ? "AKTIF" : "NONAKTIF"}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      {isActive
                        ? "Siswa pada kelas terpilih diizinkan presensi dari rumah"
                        : "Seluruh siswa wajib presensi langsung di sekolah"}
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setIsActive(val);
                      if (
                        val &&
                        tingkatAktif.length === 0 &&
                        kelasAktif.length === 0
                      ) {
                        applyPreset("SEMUA_PJJ");
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {isActive && (
                <>
                  {/* 1. TOGGLE PER TINGKAT (X, XI, XII) */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Pilihan Kelas
                    </label>
                    {/* SMART PRESETS (1-CLICK) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => applyPreset("SEMUA_PJJ")}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center text-center gap-1 transition-all cursor-pointer ${
                          tipeLingkup === "semua"
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        <span>Semua Siswa</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyPreset("X_XI_PJJ")}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center text-center gap-1 transition-all cursor-pointer ${
                          tipeLingkup === "tingkat" &&
                          tingkatAktif.includes("X") &&
                          tingkatAktif.includes("XI") &&
                          !tingkatAktif.includes("XII")
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        <span>Kelas 10 & 11 Daring</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyPreset("XII_ONLY_PJJ")}
                        className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center text-center gap-1 transition-all cursor-pointer ${
                          tipeLingkup === "tingkat" &&
                          tingkatAktif.length === 1 &&
                          tingkatAktif.includes("XII")
                            ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        <span>Hanya Kelas 12 Daring</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      {["X", "XI", "XII"].map((tingkat) => {
                        const isTingkatActive = tingkatAktif.includes(tingkat);
                        return (
                          <button
                            key={tingkat}
                            type="button"
                            onClick={() => toggleTingkat(tingkat)}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                              isTingkatActive
                                ? "bg-white text-indigo-700 border-indigo-300 shadow-xs ring-2 ring-indigo-500/20"
                                : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-white"
                            }`}
                          >
                            <span>Kelas {tingkat}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. RINCIAN PER JURUSAN & KELAS (ACCORDION DETAIL) */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                    <div className="bg-slate-100/80 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>
                        Rincian Kelas ({kelasAktif.length} dari{" "}
                        {DAFTAR_KELAS_SMKN21.length} Kelas )
                      </span>
                    </div>

                    {Object.entries(KELAS_PER_JURUSAN).map(
                      ([kodeJurusan, listKelas]) => {
                        const jurInfo = JURUSAN_SMKN21.find(
                          (j) => j.kode === kodeJurusan,
                        ) || {
                          nama: kodeJurusan,
                        };
                        const isExpanded = expandedJurusan[kodeJurusan];
                        const selectedInJurusan = listKelas.filter((k) =>
                          kelasAktif.includes(k),
                        ).length;
                        const allInJurusan =
                          listKelas.length === selectedInJurusan;

                        return (
                          <div key={kodeJurusan} className="bg-white">
                            <div className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <button
                                  type="button"
                                  onClick={() => toggleJurusan(kodeJurusan)}
                                  className="text-slate-500 hover:text-indigo-600 cursor-pointer"
                                  title={
                                    allInJurusan
                                      ? "Hapus semua kelas"
                                      : "Pilih semua kelas"
                                  }
                                >
                                  {allInJurusan ? (
                                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-300" />
                                  )}
                                </button>
                                <div
                                  onClick={() =>
                                    setExpandedJurusan((prev) => ({
                                      ...prev,
                                      [kodeJurusan]: !prev[kodeJurusan],
                                    }))
                                  }
                                  className="cursor-pointer min-w-0"
                                >
                                  <span className="font-bold text-xs text-slate-800">
                                    {kodeJurusan}
                                  </span>
                                  <span className="text-xs text-slate-500 ml-1.5 truncate hidden sm:inline">
                                    {jurInfo.nama}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    selectedInJurusan > 0
                                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  {selectedInJurusan} / {listKelas.length}{" "}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedJurusan((prev) => ({
                                      ...prev,
                                      [kodeJurusan]: !prev[kodeJurusan],
                                    }))
                                  }
                                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Kelas Grid saat Accordion Terbuka */}
                            {isExpanded && (
                              <div className="p-3.5 pt-1 bg-slate-50/50 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {listKelas.map((kelas) => {
                                  const isSelected = kelasAktif.includes(kelas);
                                  return (
                                    <button
                                      key={kelas}
                                      type="button"
                                      onClick={() => toggleKelas(kelas)}
                                      className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                                        isSelected
                                          ? "bg-indigo-50 text-indigo-800 border-indigo-200 font-bold"
                                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                      }`}
                                    >
                                      <span>{kelas}</span>
                                      {isSelected && (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>

                  {/* 3. PERIODE WAKTU & KETERANGAN ALASAN PJJ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          Tanggal Mulai Daring{" "}
                          <span className="text-rose-500">*</span>
                        </label>
                      </div>
                      <CustomDatePicker
                        className="w-full"
                        value={tanggalMulai}
                        onChange={(val) => {
                          setTanggalMulai(val);
                          if (tanggalSelesai && val > tanggalSelesai) {
                            setTanggalSelesai(val);
                          }
                        }}
                        minDate={todayStr}
                        disableWeekends={true}
                        placeholder="Pilih tanggal mulai..."
                        align="left"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          Tanggal Selesai Daring{" "}
                          <span className="text-rose-500">*</span>
                        </label>
                      </div>
                      <CustomDatePicker
                        className="w-full"
                        value={tanggalSelesai}
                        onChange={(val) => setTanggalSelesai(val)}
                        minDate={tanggalMulai || todayStr}
                        disableWeekends={true}
                        placeholder="Pilih tanggal selesai..."
                        align="right"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Catatan Kebijakan Daring
                    </label>
                    <input
                      type="text"
                      value={keterangan}
                      onChange={(e) => setKeterangan(e.target.value)}
                      placeholder="Contoh: Persiapan Ruang Ujian LSP / Cuaca Ekstrem / Banjir"
                      className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-slate-500">
            {isActive ? (
              <span className="font-semibold text-indigo-700">
                Mode Daring Aktif
              </span>
            ) : (
              <span>Seluruh kelas masuk normal</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/80 transition-colors cursor-pointer"
            >
              Batal
            </button>
            {isAdmin ? (
              <button
                type="submit"
                form="pjj-form"
                disabled={submitting || loading}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2 transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Perubahan</span>
                )}
              </button>
            ) : (
              <span className="text-xs text-amber-600 font-semibold px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200">
                Mode Lihat (Khusus Admin)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
