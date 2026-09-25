import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertOctagon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  User,
  GraduationCap,
  FileText,
  RotateCcw,
  Send,
  Loader2,
  ShieldAlert,
  Search,
  Check,
  Printer,
  ChevronDown,
  ArrowLeft,
  Lock,
  PenTool,
  Sparkles,
  X,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import logoSMKN21 from "../assets/Logo SMKN21.png";
import {
  MASTER_PELANGGARAN,
  ALLOWED_POIN,
  getKategoriPelanggaran,
} from "../data/pelanggaranData";
import {
  DAFTAR_KELAS_SMKN21,
  KELAS_GROUPS_DROPDOWN,
} from "../constants/schoolData";
import CustomDropdown from "../components/CustomDropdown";
import CustomDatePicker, {
  formatTanggalIndo,
} from "../components/CustomDatePicker";
import CustomTimePicker from "../components/CustomTimePicker";

// Helper: Format tanggal hari ini YYYY-MM-DD
const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper: Format jam saat ini HH:MM
const getCurrentTimeStr = () => {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

export default function CatatPelanggaran() {
  const { user, isSiswa, isPiket, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Proteksi ganda: Siswa dilarang mencatat pelanggaran
  useEffect(() => {
    if (isSiswa) {
      navigate("/portal-siswa", { replace: true });
    }
  }, [isSiswa, navigate]);

  const backTarget = isPiket
    ? "/portal-piket"
    : isAdmin
      ? "/portal-admin"
      : "/";

  // State Form Identitas Siswa
  const [namaSiswa, setNamaSiswa] = useState("");
  const [nis, setNis] = useState("");
  const [siswaId, setSiswaId] = useState(null);
  const [kelas, setKelas] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  // State Tanggal & Waktu Kejadian
  const [tanggal, setTanggal] = useState(getTodayDateStr);
  const [waktu, setWaktu] = useState(getCurrentTimeStr);

  // State Pelanggaran & Poin
  const [jenisPelanggaran, setJenisPelanggaran] = useState("");
  const [poin, setPoin] = useState("");
  const [keterangan, setKeterangan] = useState("");

  // State Guru / Tendik Penegur
  const [namaPenanggungJawab, setNamaPenanggungJawab] = useState(() =>
    isPiket && user?.nama ? user.nama : "",
  );

  // Search & Master Pelanggaran Dropdown
  const [violationSearch, setViolationSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const violationDropdownRef = useRef(null);

  // Quick Staf list & Student Autocomplete
  const [staffList, setStaffList] = useState([]);
  const [studentList, setStudentList] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const studentDropdownRef = useRef(null);

  // State Status & Signature
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successData, setSuccessData] = useState(null);

  // Canvas E-Signature
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Inisialisasi Canvas
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  useEffect(() => {
    setupCanvas();
    window.addEventListener("resize", setupCanvas);
    return () => window.removeEventListener("resize", setupCanvas);
  }, [successData]);

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        violationDropdownRef.current &&
        !violationDropdownRef.current.contains(e.target)
      ) {
        setIsDropdownOpen(false);
      }
      if (
        studentDropdownRef.current &&
        !studentDropdownRef.current.contains(e.target)
      ) {
        setIsStudentDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Prefill Data Siswa jika sedang login sebagai Siswa
  useEffect(() => {
    if (isSiswa && user) {
      setNamaSiswa(user.nama || "");
      setKelas(user.kelas || "");
      setNis(user.nis || "");
      setSiswaId(user.id || null);
    }
  }, [isSiswa, user]);

  // Set default nama penanggung jawab jika Guru Piket login
  useEffect(() => {
    if (isPiket && user?.nama && !namaPenanggungJawab) {
      setNamaPenanggungJawab(user.nama);
    }
  }, [isPiket, user, namaPenanggungJawab]);

  // Ambil daftar Staf & Siswa untuk autocomplete (jika piket/admin)
  useEffect(() => {
    if (isPiket || isAdmin) {
      api
        .get("/staf")
        .then((res) => {
          if (res.data?.data) {
            setStaffList(res.data.data);
          }
        })
        .catch(() => {});

      api
        .get("/siswa")
        .then((res) => {
          if (Array.isArray(res.data)) {
            // Hanya tampilkan siswa berstatus Aktif (bukan Alumni)
            setStudentList(res.data.filter((s) => s.status !== "Alumni"));
          }
        })
        .catch(() => {});
    }
  }, [isPiket, isAdmin]);

  // Handle pilih siswa dari database (Piket/Admin)
  const handleSelectStudent = (siswa) => {
    if (siswa.status === "Alumni") {
      setErrorMsg(`Siswa ${siswa.nama} sudah berstatus Alumni / Lulus.`);
      return;
    }
    setSelectedStudent(siswa);
    setNamaSiswa(siswa.nama || "");
    setKelas(siswa.kelas || "");
    setNis(siswa.nis || "");
    setSiswaId(siswa.id || null);
    setIsStudentDropdownOpen(false);
    setStudentSearch("");

    // Jika siswa sudah punya tanda tangan digital tersimpan, muat otomatis
    if (siswa.tanda_tangan) {
      loadSignatureImage(siswa.tanda_tangan);
    }
  };

  const handleClearSelectedStudent = () => {
    setSelectedStudent(null);
    setNamaSiswa("");
    setKelas("");
    setNis("");
    setSiswaId(null);
    setStudentSearch("");
    clearSignature();
  };

  // Muat tanda tangan tersimpan ke kanvas
  const loadSignatureImage = (dataUrl) => {
    const canvas = canvasRef.current;
    if (!canvas || !dataUrl) return;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 10, 10, rect.width - 20, rect.height - 20);
      setHasSignature(true);
    };
    img.src = dataUrl;
  };

  // Tombol gunakan TTD tersimpan untuk siswa
  const handleUseSavedSignature = () => {
    if (isSiswa && user?.tanda_tangan) {
      loadSignatureImage(user.tanda_tangan);
    }
  };

  // Filter jenis pelanggaran berdasarkan kata kunci pencarian (diurutkan dari poin terendah ke tertinggi)
  const filteredViolations = useMemo(() => {
    let list = MASTER_PELANGGARAN;
    if (violationSearch.trim()) {
      const q = violationSearch.toLowerCase();
      list = list.filter((item) => item.nama.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => a.poin_default - b.poin_default);
  }, [violationSearch]);

  // Saat jenis pelanggaran dipilih, otomatis tentukan poin bakunya
  const handleSelectViolation = (item) => {
    setJenisPelanggaran(item.nama);
    setPoin(String(item.poin_default));
    setIsDropdownOpen(false);
    setViolationSearch("");
  };

  // Set Waktu Sekarang
  const handleSetWaktuSekarang = () => {
    setTanggal(getTodayDateStr());
    setWaktu(getCurrentTimeStr());
  };

  // Canvas Drawing Handlers
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.closePath();
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (isSiswa && user?.status === "Alumni") {
      setErrorMsg(
        "Akun berstatus Alumni / Lulus tidak dapat mencatat pelanggaran.",
      );
      return;
    }

    if (!namaSiswa.trim()) {
      setErrorMsg("Nama Lengkap Siswa wajib diisi.");
      return;
    }
    if (!kelas) {
      setErrorMsg("Kelas siswa wajib dipilih.");
      return;
    }
    if (!jenisPelanggaran) {
      setErrorMsg("Jenis Pelanggaran wajib dipilih.");
      return;
    }
    if (!poin) {
      setErrorMsg("Poin Pelanggaran wajib ditentukan.");
      return;
    }
    if (!namaPenanggungJawab.trim()) {
      setErrorMsg("Nama Lengkap Guru / Tendik penanggung jawab wajib diisi.");
      return;
    }
    if (!hasSignature) {
      setErrorMsg(
        "Tanda tangan digital siswa wajib digoreskan pada area E-Signature.",
      );
      return;
    }

    const canvas = canvasRef.current;
    const signatureBase64 = canvas ? canvas.toDataURL("image/png") : "";

    // Bentuk string waktu lengkap (YYYY-MM-DD HH:MM:00)
    const formattedTanggalWaktu = `${tanggal} ${waktu || "00:00"}:00`;

    const payload = {
      nama_siswa: namaSiswa.trim(),
      nis: nis.trim() || "-",
      siswa_id: siswaId,
      kelas,
      tanggal_waktu: formattedTanggalWaktu,
      jenis_pelanggaran: jenisPelanggaran,
      poin: parseInt(poin, 10),
      nama_penanggung_jawab: namaPenanggungJawab.trim(),
      tanda_tangan_siswa: signatureBase64,
      keterangan: keterangan.trim(),
    };

    setSubmitting(true);
    try {
      const res = await api.post("/pelanggaran", payload);
      if (res.data && res.data.success) {
        setSuccessData(res.data.data);
      } else {
        setErrorMsg(
          res.data?.message || "Gagal menyimpan catatan pelanggaran.",
        );
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || "Terjadi kesalahan pada server.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const resetForm = () => {
    setSuccessData(null);
    if (!isSiswa) {
      setSelectedStudent(null);
      setNamaSiswa("");
      setNis("");
      setSiswaId(null);
      setKelas("");
      setStudentSearch("");
    }
    setJenisPelanggaran("");
    setPoin("");
    setKeterangan("");
    setTanggal(getTodayDateStr());
    setWaktu(getCurrentTimeStr());
    clearSignature();
  };

  // Siswa Alumni: Blokir akses ke pencatatan pelanggaran
  if (isSiswa && user?.status === "Alumni") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 text-center shadow-xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600 shadow-inner">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase tracking-wider mb-2 border border-amber-200">
              Alumni / Lulus
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Akses Pelanggaran Tidak Tersedia
            </h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Halo, <strong>{user?.nama}</strong>. Akun Anda telah resmi
              berstatus sebagai Alumni SMKN 21 Jakarta. Pencatatan pelanggaran
              siswa dan buku saku kedisiplinan hanya berlaku bagi siswa aktif.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/portal-siswa"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all text-sm"
            >
              Kembali ke Portal Alumni
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-6 sm:py-10 px-3 sm:px-6 lg:px-8 max-w-3xl mx-auto flex flex-col justify-center space-y-6">
      {/* Modal / Slip Sukses */}
      {successData && (
        <div className="bg-white rounded-2xl border border-emerald-200 p-6 sm:p-8 shadow-xl space-y-6 animate-in zoom-in-95">
          <div className="flex items-center gap-3 text-emerald-600">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Catatan Pelanggaran Berhasil Disimpan
              </h2>
              <p className="text-xs text-slate-500">
                Tercatat ke buku poin kedisiplinan dan portal siswa secara
                resmi.
              </p>
            </div>
          </div>

          {/* Kartu Bukti Pelanggaran */}
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/70 space-y-4 print:border-black">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-900 print:flex">
              <img
                src={logoSMKN21}
                alt="Logo SMKN 21"
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-extrabold uppercase tracking-tight text-slate-950 font-sans leading-tight">
                  SMKN 21 JAKARTA
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-600 font-sans">
                  Surat Bukti Catatan Pelanggaran Tata Tertib Siswa
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 mt-1">
                  {successData.jenis_pelanggaran}
                </h3>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xl font-extrabold text-rose-600">
                  {successData.poin} Poin
                </span>
                <p className="text-[11px] text-slate-500">
                  {successData.tanggal_waktu_formatted}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">
                  Nama Siswa
                </span>
                <span className="text-slate-900 font-bold text-sm block">
                  {successData.nama_siswa}
                </span>
                <p className="text-slate-500">
                  Kelas {successData.kelas} • NIS {successData.nis}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">
                  Guru / Tendik Penegur
                </span>
                <span className="text-slate-900 font-bold text-sm block">
                  {successData.nama_penanggung_jawab}
                </span>
              </div>
            </div>

            {/* Tanda Tangan Siswa */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 block font-medium">
                  Tanda Tangan Pengakuan Siswa
                </span>
                <div className="w-40 h-20 border border-slate-200 bg-white rounded-xl mt-1 flex items-center justify-center overflow-hidden">
                  <img
                    src={successData.tanda_tangan_siswa}
                    alt="Tanda Tangan Siswa"
                    className="max-h-full object-contain"
                  />
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-400">
                <p className="font-semibold text-slate-600">Tercatat Resmi</p>
                <p>SMKN 21 Jakarta</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handlePrintSlip}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Bukti Pelanggaran</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Catat Pelanggaran Lain
              </button>
              <button
                type="button"
                onClick={() => navigate(backTarget)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Utama */}
      {!successData && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Header Card Form */}
          <div className="p-4 sm:p-6 border-b border-slate-200/80 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-between gap-3">
                <Link
                  to="/portal-admin"
                  className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs text-slate-600 flex-shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                  Catat Pelanggaran Siswa/i
                </h1>
                <p className="text-xs text-slate-500">
                  {isSiswa
                    ? "Formulir mandiri pengakuan pelanggaran tata tertib SMKN 21 Jakarta"
                    : "Pencatatan pelanggaran & buku saku kedisiplinan SMKN 21 Jakarta"}
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-4 sm:p-7 space-y-5 sm:space-y-6"
          >
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* SECTION 1: IDENTITAS SISWA */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  1. Nama Siswa & Identitas{" "}
                  <span className="text-rose-500">*</span>
                </label>
                {isSiswa && (
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>Terkunci</span>
                  </span>
                )}
              </div>

              {/* Mode Siswa: Tampilan Card Terkunci */}
              {isSiswa ? (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                      {user?.nama?.charAt(0) || "S"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-tight">
                        {user?.nama}
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {user?.nis || "-"}{" "}
                      </p>
                    </div>
                  </div>
                </div>
              ) : selectedStudent ? (
                /* Mode Piket / Admin: Kartu Siswa Terpilih */
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                      {selectedStudent.nama?.charAt(0) || "S"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-tight">
                        {selectedStudent.nama}
                      </p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {selectedStudent.nis || "-"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSelectedStudent}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors cursor-pointer"
                    title="Ganti Siswa"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                /* Mode Piket / Admin: Autocomplete Search & Input Nama */
                <div className="space-y-2">
                  <div className="relative" ref={studentDropdownRef}>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Cari siswa terdaftar (Ketik Nama atau NIS)..."
                        value={studentSearch}
                        onChange={(e) => {
                          setStudentSearch(e.target.value);
                          setIsStudentDropdownOpen(true);
                        }}
                        onFocus={() => setIsStudentDropdownOpen(true)}
                        className="w-full text-xs sm:text-sm pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      />
                    </div>

                    {isStudentDropdownOpen &&
                      studentSearch.trim().length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto z-30 divide-y divide-slate-100 p-1">
                          {studentList
                            .filter(
                              (s) =>
                                s.nama
                                  .toLowerCase()
                                  .includes(studentSearch.toLowerCase()) ||
                                s.nis.includes(studentSearch),
                            )
                            .slice(0, 8)
                            .map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => handleSelectStudent(s)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                              >
                                <div>
                                  <p className="font-bold text-slate-800">
                                    {s.nama}
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    {s.kelas} • NIS {s.nis}
                                  </p>
                                </div>
                                <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">
                                  Pilih
                                </span>
                              </button>
                            ))}
                          {studentList.filter(
                            (s) =>
                              s.nama
                                .toLowerCase()
                                .includes(studentSearch.toLowerCase()) ||
                              s.nis.includes(studentSearch),
                          ).length === 0 && (
                            <div className="p-3 text-center text-xs text-slate-400">
                              Siswa tidak ditemukan. Anda dapat mengetik nama
                              lengkap secara manual di bawah.
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: KELAS SISWA (Menggunakan CustomDropdown Bertema SMKN 21) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Kelas Siswa <span className="text-rose-500">*</span>
              </label>
              <CustomDropdown
                value={kelas}
                onChange={setKelas}
                groups={KELAS_GROUPS_DROPDOWN}
                placeholder="Pilih Kelas Siswa..."
                icon={<GraduationCap className="w-4 h-4 text-blue-600" />}
                disabled={isSiswa || Boolean(selectedStudent)}
                className="w-full"
              />
            </div>

            {/* SECTION 3: TANGGAL & WAKTU KEJADIAN */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  3. Tanggal & Waktu Kejadian{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleSetWaktuSekarang}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors"
                >
                  <span>Waktu Sekarang</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tanggal menggunakan CustomDatePicker resmi */}
                <div>
                  <CustomDatePicker
                    value={tanggal}
                    onChange={setTanggal}
                    className="w-full"
                    placeholder="Pilih tanggal kejadian..."
                  />
                </div>

                {/* Input Jam / Waktu menggunakan CustomTimePicker resmi */}
                <div>
                  <CustomTimePicker
                    value={waktu}
                    onChange={setWaktu}
                    placeholder="Pilih jam kejadian..."
                    accentColor="rose"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: JENIS PELANGGARAN (Searchable Dropdown 44 Butir Baku) */}
            <div className="space-y-1.5 relative" ref={violationDropdownRef}>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                4. Jenis Pelanggaran <span className="text-rose-500">*</span>
              </label>

              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full text-left text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-white flex items-center justify-between cursor-pointer shadow-2xs transition-colors"
              >
                <span
                  className={
                    jenisPelanggaran
                      ? "font-semibold text-slate-900 truncate pr-2"
                      : "text-slate-400 font-medium"
                  }
                >
                  {jenisPelanggaran ||
                    "Pilih salah satu dari 44 butir pelanggaran..."}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-40 p-2.5 space-y-2 max-h-72 flex flex-col animate-in fade-in zoom-in-95">
                  <div className="relative flex-shrink-0">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ketik kata kunci pelanggaran..."
                      value={violationSearch}
                      onChange={(e) => setViolationSearch(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                      autoFocus
                    />
                  </div>

                  <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
                    {filteredViolations.map((item) => {
                      const kat = getKategoriPelanggaran(item.poin_default);
                      const isSelected = jenisPelanggaran === item.nama;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectViolation(item)}
                          className={`w-full text-left p-2.5 rounded-xl transition-colors flex items-center justify-between gap-3 cursor-pointer text-xs ${
                            isSelected
                              ? "bg-rose-50 text-rose-900 font-bold"
                              : "hover:bg-slate-50 text-slate-700 font-medium"
                          }`}
                        >
                          <span className="leading-relaxed">{item.nama}</span>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border flex-shrink-0 ${kat.badge}`}
                          >
                            {item.poin_default} Poin
                          </span>
                        </button>
                      );
                    })}
                    {filteredViolations.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">
                        Tidak pelanggaran yang cocok
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 5: POIN PELANGGARAN (Interactive Pill Group dengan Warna Tingkat Pelanggaran) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  5. Poin Pelanggaran <span className="text-rose-500">*</span>
                </label>
              </div>

              {/* Selector Opsi 6 Poin Baku dengan Penyesuaian Warna Tingkat */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                {ALLOWED_POIN.map((p) => {
                  const kat = getKategoriPelanggaran(p);
                  const isSelected = String(poin) === String(p);

                  // Styling warna tombol dinamis menyesuaikan tingkat poinnya
                  let pointStyle = "";
                  if (p <= 5) {
                    // Ringan (2, 5) -> Emerald / Green
                    pointStyle = isSelected
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/50 scale-[1.03]"
                      : "bg-emerald-50/50 hover:bg-emerald-100/70 border-emerald-200 text-emerald-800";
                  } else if (p <= 25) {
                    // Sedang (10, 25) -> Amber / Yellow
                    pointStyle = isSelected
                      ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/30 ring-2 ring-amber-400/50 scale-[1.03]"
                      : "bg-amber-50/50 hover:bg-amber-100/70 border-amber-200 text-amber-800";
                  } else if (p <= 50) {
                    // Berat (50) -> Orange
                    pointStyle = isSelected
                      ? "bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/30 ring-2 ring-orange-500/50 scale-[1.03]"
                      : "bg-orange-50/50 hover:bg-orange-100/70 border-orange-200 text-orange-800";
                  } else {
                    // Sangat Berat (100) -> Rose / Red
                    pointStyle = isSelected
                      ? "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/30 ring-2 ring-rose-500/50 scale-[1.03]"
                      : "bg-rose-50/50 hover:bg-rose-100/70 border-rose-200 text-rose-800";
                  }

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPoin(String(p))}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${pointStyle}`}
                    >
                      <span className="block text-base font-black">{p}</span>
                      <span
                        className={`block text-[10px] font-bold mt-0.5 ${
                          isSelected ? "text-white/90" : "opacity-75"
                        }`}
                      >
                        {kat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 6: NAMA GURU / TENDIK PENANGGUNG JAWAB (NAMA LENGKAP) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  6. Guru / Tendik Penegur{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  Nama Guru Yang Menegur
                </span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Ketik nama lengkap guru / tenaga kependidikan penegur..."
                  value={namaPenanggungJawab}
                  onChange={(e) => setNamaPenanggungJawab(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                  required
                />
              </div>
            </div>

            {/* SECTION 7: KETERANGAN / CATATAN TAMBAHAN (OPSIONAL) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                7. Keterangan Tambahan (Opsional)
              </label>
              <textarea
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Catatan tambahan mengenai kejadian (contoh: Ditegur di depan gerbang, tidak memakai dasi & sabuk)..."
                rows={2}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            {/* SECTION 8: TANDA TANGAN SISWA (E-SIGNATURE) */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  8. Tanda Tangan Pengakuan Siswa{" "}
                  <span className="text-rose-500">*</span>
                </label>

                <div className="flex items-center gap-2">
                  {isSiswa && user?.tanda_tangan && (
                    <button
                      type="button"
                      onClick={handleUseSavedSignature}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      <span>TTD Saya</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Goreskan tanda tangan digital siswa secara langsung pada area
                kotak di bawah menggunakan jari atau mouse sebagai tanda bukti
                pengakuan
              </p>

              <div className="border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-2xl p-2 bg-slate-50/50 transition-colors relative">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-40 bg-white rounded-xl touch-none cursor-crosshair border border-slate-200 shadow-inner"
                />
                {!hasSignature && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 gap-1.5">
                    <PenTool className="w-5 h-5 text-slate-300" />
                    <span className="text-xs font-semibold">
                      Area Tanda Tangan Digital Siswa
                    </span>
                    <span className="text-[10px] text-slate-300">
                      Sentuh atau goreskan di sini
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[11px] text-slate-400 text-center sm:text-left">
                Pelanggaran akan otomatis tercatat ke buku saku kedisiplinan dan
                portal siswa SMKN 21
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 active:scale-98 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer whitespace-nowrap"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <span>Simpan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
