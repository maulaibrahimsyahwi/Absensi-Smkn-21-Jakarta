import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
  ArrowLeft,
  FileText,
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  UserCheck,
  Building2,
  Send,
  Loader2,
  X,
  HeartPulse,
  Mail,
  ShieldCheck,
  Info,
  MapPin,
  RefreshCw,
  PenTool,
  Lock,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getCurrentLocation } from "../utils/geoUtils";
import CustomDatePicker, {
  formatTanggalIndo,
} from "../components/CustomDatePicker";
import SignaturePadModal from "../components/SignaturePadModal";

export default function PengajuanIzin() {
  const { user, isSiswa, isPiket, isAdmin, saveSignature } = useAuth();
  const backTarget = isSiswa
    ? "/portal-siswa"
    : isPiket
      ? "/portal-piket"
      : isAdmin
        ? "/portal-admin"
        : "/";
  const [nis, setNis] = useState(isSiswa && user?.nis ? user.nis : "");
  const [checkingNis, setCheckingNis] = useState(false);
  const [siswaData, setSiswaData] = useState(
    isSiswa && user?.nis
      ? { id: user.id, nama: user.nama, nis: user.nis, kelas: user.kelas }
      : null,
  );
  const [nisError, setNisError] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];
  const [jenis, setJenis] = useState("Sakit"); // "Sakit" atau "Izin"
  const [tanggalMulai, setTanggalMulai] = useState(todayStr);
  const [tanggalSelesai, setTanggalSelesai] = useState(todayStr);
  const [alasan, setAlasan] = useState("");
  const [suratBukti, setSuratBukti] = useState(null); // base64 string
  const [suratPreview, setSuratPreview] = useState(null);
  const [studentSignature, setStudentSignature] = useState(
    user?.tanda_tangan || null,
  );
  const [showSigModal, setShowSigModal] = useState(false);

  // Auto-set siswa jika login sebagai siswa
  useEffect(() => {
    if (isSiswa && user?.nis) {
      setNis(user.nis);
      setSiswaData({
        id: user.id,
        nama: user.nama,
        nis: user.nis,
        kelas: user.kelas,
      });
      if (user.tanda_tangan) {
        setStudentSignature(user.tanda_tangan);
      }
    }
  }, [isSiswa, user]);

  const handleSaveSignature = async (dataUrl) => {
    setStudentSignature(dataUrl);
    if (user && isSiswa) {
      await saveSignature(dataUrl);
    }
  };

  // GPS Location State
  const [geoLoc, setGeoLoc] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: false,
    error: null,
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submittedData, setSubmittedData] = useState(null);

  const fileInputRef = useRef(null);

  // Fungsi mengambil titik lokasi GPS dari perangkat
  const ambilLokasiGPS = () => {
    setGeoLoc((prev) => ({ ...prev, loading: true, error: null }));
    getCurrentLocation()
      .then((loc) => {
        setGeoLoc({
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          loading: false,
          error: null,
          simulated: false,
        });
        setErrorMsg("");
      })
      .catch((err) => {
        setGeoLoc((prev) => ({
          ...prev,
          loading: false,
          error: err.message,
        }));
      });
  };

  // Simulasi lokasi GPS untuk pengujian pengembang di localhost
  const handleSimulasiLokasi = () => {
    setGeoLoc({
      latitude: -6.158,
      longitude: 106.852,
      accuracy: 15,
      loading: false,
      error: null,
      simulated: true,
    });
    setErrorMsg("");
  };

  // Deteksi lokasi GPS saat halaman dibuka
  useEffect(() => {
    ambilLokasiGPS();
  }, []);

  // Otomatis cek NIS saat pengguna selesai mengetik
  useEffect(() => {
    const trimmedNis = nis.trim();
    if (trimmedNis.length < 4) {
      setSiswaData(null);
      setNisError("");
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingNis(true);
      setNisError("");
      try {
        const res = await api.get(
          `/cek_siswa_nis/${encodeURIComponent(trimmedNis)}`,
        );
        if (res.data && res.data.success) {
          setSiswaData(res.data.siswa);
          setNisError("");
        } else {
          setSiswaData(null);
          setNisError("Siswa dengan NIS ini tidak ditemukan");
        }
      } catch (err) {
        setSiswaData(null);
        setNisError(
          err.response?.data?.message ||
            "NIS tidak terdaftar dalam sistem SMKN 21",
        );
      } finally {
        setCheckingNis(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [nis]);

  // Hitung jumlah hari durasi izin
  const hitungDurasiHari = () => {
    if (!tanggalMulai || !tanggalSelesai) return 1;
    const start = new Date(tanggalMulai);
    const end = new Date(tanggalSelesai);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  };

  // Kompresi dan convert foto surat ke base64
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("File lampiran harus berupa file gambar (JPG/PNG).");
      return;
    }

    // Maksimal 5MB sebelum resize
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Ukuran foto maksimal 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize di canvas jika terlalu besar untuk hemat bandwidth
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);
        setSuratBukti(compressedDataUrl);
        setSuratPreview(compressedDataUrl);
        setErrorMsg("");
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleHapusFoto = () => {
    setSuratBukti(null);
    setSuratPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (isSiswa && user?.status === "Alumni") {
      setErrorMsg("Akun berstatus Alumni / Lulus tidak dapat mengajukan izin.");
      return;
    }

    if (!siswaData) {
      setErrorMsg("Harap masukkan NIS yang valid dan terdaftar.");
      return;
    }

    if (!tanggalMulai || !tanggalSelesai) {
      setErrorMsg("Tanggal mulai dan selesai wajib dipilih.");
      return;
    }

    if (tanggalSelesai < tanggalMulai) {
      setErrorMsg("Tanggal selesai tidak boleh sebelum tanggal mulai.");
      return;
    }

    if (!alasan.trim()) {
      setErrorMsg("Alasan / keterangan ketidakhadiran wajib diisi.");
      return;
    }

    if (alasan.trim().length > 200) {
      setErrorMsg("Alasan ketidakhadiran maksimal 200 karakter.");
      return;
    }

    if (!suratBukti) {
      setErrorMsg(
        `Foto Surat Keterangan / Bukti wajib diunggah (${jenis === "Sakit" ? "Surat Dokter / Resep Obat" : "Surat Permohonan Orang Tua"}).`,
      );
      return;
    }

    if (!geoLoc.latitude || !geoLoc.longitude) {
      setErrorMsg(
        "Titik lokasi GPS wajib terdeteksi saat mengajukan izin / sakit. Harap aktifkan izin GPS browser Anda dan klik 'Refresh'.",
      );
      return;
    }

    if (!studentSignature) {
      setErrorMsg(
        "Tanda tangan digital siswa / orang tua wajib dibubuhkan sebelum mengajukan izin.",
      );
      setShowSigModal(true);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/pengajuan_izin", {
        nis: siswaData.nis,
        jenis,
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        alasan: alasan.trim(),
        surat_bukti: suratBukti,
        tanda_tangan_siswa: studentSignature || null,
        latitude: geoLoc.latitude,
        longitude: geoLoc.longitude,
        lokasi_teks: geoLoc.accuracy
          ? `Akurasi ±${Math.round(geoLoc.accuracy)}m`
          : null,
      });

      if (res.data && res.data.success) {
        setSubmittedData({
          ...res.data.data,
          latitude: geoLoc.latitude,
          longitude: geoLoc.longitude,
          durasi: hitungDurasiHari(),
        });
      } else {
        setErrorMsg(res.data?.message || "Gagal mengirim pengajuan izin.");
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
          "Terjadi kesalahan saat mengirim pengajuan. Pastikan koneksi server aktif.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSubmittedData(null);
    if (!isSiswa) {
      setNis("");
      setSiswaData(null);
      setStudentSignature(null);
    }
    setNisError("");
    setJenis("Sakit");
    setTanggalMulai(todayStr);
    setTanggalSelesai(todayStr);
    setAlasan("");
    setSuratBukti(null);
    setSuratPreview(null);
    setErrorMsg("");
    ambilLokasiGPS();
  };

  // Siswa Alumni: Blokir akses ke pengajuan surat izin / sakit
  if (isSiswa && user?.status === "Alumni") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 text-center shadow-xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600 shadow-inner">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase tracking-wider mb-2 border border-amber-200">
              Status: Alumni / Lulus
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Akses Pengajuan Izin Tidak Tersedia
            </h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Halo, <strong>{user?.nama}</strong>. Akun Anda telah resmi
              berstatus sebagai Alumni SMKN 21 Jakarta. Surat permohonan izin
              atau sakit hanya diperuntukkan bagi siswa aktif.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/portal-siswa"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-6 sm:py-10 px-3 sm:px-6 lg:px-8 max-w-3xl mx-auto flex flex-col justify-center">
      {submittedData ? (
        /* SUCCESS RECEIPT CARD */
        <div className="bg-white rounded-2xl border border-emerald-200/80 shadow-lg shadow-emerald-500/5 overflow-hidden p-4 sm:p-8 animate-in fade-in duration-300">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">
              Surat Keterangan Berhasil Diajukan!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mb-6">
              Pengajuan ketidakhadiran siswa telah masuk ke sistem dan menunggu
              verifikasi dari Guru Piket / Wali Kelas.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 sm:p-5 mb-6 space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Nama Siswa</span>
              <span className="font-bold text-slate-900 text-right">
                {submittedData.nama}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">NIS & Kelas</span>
              <span className="font-semibold text-slate-800 text-right">
                {submittedData.nis} ({submittedData.kelas})
              </span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">
                Jenis Pengajuan
              </span>
              <span
                className={`inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full text-xs ${
                  submittedData.jenis === "Sakit"
                    ? "bg-rose-100 text-rose-700 border border-rose-200"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}
              >
                {submittedData.jenis === "Sakit" ? "Sakit" : "Izin"}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Periode</span>
              <span className="font-semibold text-slate-800 text-right">
                {formatTanggalIndo(submittedData.tanggal_mulai, false)} s/d{" "}
                {formatTanggalIndo(submittedData.tanggal_selesai, false)} (
                {submittedData.durasi} Hari)
              </span>
            </div>
            <div className="flex justify-between items-start pb-2.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium flex-shrink-0">
                Alasan
              </span>
              <span className="font-medium text-slate-700 text-right max-w-xs break-words leading-relaxed">
                {submittedData.alasan}
              </span>
            </div>
            {submittedData.latitude && submittedData.longitude && (
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">
                  Titik Lokasi GPS
                </span>
                <a
                  href={`https://www.google.com/maps?q=${submittedData.latitude},${submittedData.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 text-xs bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Maps</span>
                </a>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">
                Status Verifikasi
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-xs bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3 h-3 animate-pulse" />
                Menunggu Konfirmasi Guru
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm transition-colors shadow-sm text-center cursor-pointer"
            >
              Ajukan Surat Lainnya
            </button>
            <Link
              to={backTarget}
              className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition-colors border border-slate-200 text-center"
            >
              Kembali
            </Link>
          </div>
        </div>
      ) : (
        /* SUBMISSION FORM */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-900/5 overflow-hidden">
          {/* Form Header */}
          <div className="px-5 py-5 sm:px-7 sm:py-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-white">
            <div className="flex items-center gap-3">
              <Link
                to="/portal-siswa"
                className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs text-slate-600 flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>

              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                  Pengajuan Surat Izin / Sakit
                </h1>
                <p className="text-xs text-slate-500">
                  Formulir mandiri untuk siswa dan orang tua murid SMKN 21
                  Jakarta
                </p>
              </div>
            </div>
          </div>

          {/* Form Body */}
          <form
            onSubmit={handleSubmit}
            className="p-4 sm:p-7 space-y-4 sm:space-y-5"
          >
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm text-rose-700 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Field 1: NIS Siswa & Real-time Check (Terkunci jika Siswa) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nomor Induk Siswa (NIS){" "}
                  <span className="text-rose-500">*</span>
                </label>
                {isSiswa && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 shadow-2xs">
                    <Lock className="w-3 h-3 text-blue-600" />
                    <span>Terkunci</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={isSiswa ? user?.nis || nis : nis}
                  readOnly={isSiswa}
                  onChange={
                    isSiswa
                      ? undefined
                      : (e) => setNis(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="Ketik NIS siswa (contoh: 21102)"
                  maxLength={18}
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl focus:outline-hidden transition-all ${
                    isSiswa
                      ? "bg-slate-100/90 border border-slate-300 text-slate-700 font-mono font-bold cursor-not-allowed select-none"
                      : siswaData
                        ? "bg-slate-50 border border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                        : nisError
                          ? "bg-slate-50 border border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:bg-white"
                          : "bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                  }`}
                  required
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
                  {isSiswa ? (
                    <Lock className="w-4 h-4 text-blue-600" />
                  ) : (
                    <>
                      {checkingNis && (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      )}
                      {siswaData && !checkingNis && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      )}
                    </>
                  )}
                </div>
              </div>

              {nisError && (
                <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {nisError}
                </p>
              )}
            </div>

            {/* Field 2: Tipe Izin (Sakit vs Izin) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Jenis Ketidakhadiran <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setJenis("Sakit")}
                  className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-colors duration-150 cursor-pointer ${
                    jenis === "Sakit"
                      ? "border-rose-500 bg-rose-50/70 ring-2 ring-rose-500/20 shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      jenis === "Sakit"
                        ? "bg-rose-500 text-white"
                        : "bg-rose-100 text-rose-600"
                    }`}
                  >
                    <HeartPulse className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      Sakit
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Surat dokter / keterangan medis
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setJenis("Izin")}
                  className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-colors duration-150 cursor-pointer ${
                    jenis === "Izin"
                      ? "border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      jenis === "Izin"
                        ? "bg-amber-500 text-white"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Izin</div>
                    <div className="text-[11px] text-slate-500">
                      Keperluan keluarga / mendesak
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Field 3: Rentang Tanggal (CustomDatePicker Modern) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tanggal Mulai <span className="text-rose-500">*</span>
                </label>
                <CustomDatePicker
                  value={tanggalMulai}
                  onChange={(val) => {
                    setTanggalMulai(val);
                    if (val > tanggalSelesai) {
                      setTanggalSelesai(val);
                    }
                  }}
                  className="w-full"
                  placeholder="Pilih tanggal mulai..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tanggal Selesai <span className="text-rose-500">*</span>
                </label>
                <CustomDatePicker
                  value={tanggalSelesai}
                  minDate={tanggalMulai}
                  onChange={(val) => setTanggalSelesai(val)}
                  className="w-full"
                  align="right"
                  placeholder="Pilih tanggal selesai..."
                />
              </div>
            </div>

            {/* Info Durasi */}
            <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 flex items-center justify-between text-xs text-blue-800">
              <span className="flex items-center gap-1.5">
                Durasi Ketidakhadiran
              </span>
              <span className="font-bold bg-white px-2 py-0.5 rounded-md border border-blue-200">
                {hitungDurasiHari()} Hari
              </span>
            </div>

            {/* Field 4: Alasan / Keterangan (Maks. 200 Karakter) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Alasan / Keterangan <span className="text-rose-500">*</span>
                </label>
                <span
                  className={`text-[11px] font-mono font-semibold ${
                    alasan.length >= 200
                      ? "text-rose-600 font-bold"
                      : alasan.length > 160
                        ? "text-amber-600"
                        : "text-slate-400"
                  }`}
                >
                  {alasan.length} / 200 karakter
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={200}
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                placeholder={
                  jenis === "Sakit"
                    ? "Contoh: Demam tinggi dan flu sejak kemarin, dokter menyarankan istirahat di rumah..."
                    : "Contoh: Menghadiri acara pernikahan keluarga inti di luar kota..."
                }
                className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:outline-hidden focus:ring-2 focus:bg-white transition-all ${
                  alasan.length >= 200
                    ? "border-amber-400 focus:ring-amber-500/20"
                    : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                }`}
                required
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Tuliskan keterangan secara ringkas dan jelas (maksimal 200
                karakter).
              </p>
            </div>

            {/* Field 5: Lampiran Foto Surat Bukti */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Foto Surat Keterangan / Bukti{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  {jenis === "Sakit"
                    ? "Surat Dokter / Resep"
                    : "Surat Orang Tua"}
                </span>
              </div>

              {suratPreview ? (
                <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-2 overflow-hidden flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={suratPreview}
                      alt="Pratinjau Surat"
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        Foto Surat Siap Diunggah
                      </p>
                      <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Tergabung dalam formulir
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleHapusFoto}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Hapus Foto"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-5 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/30"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-2">
                    <Camera className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">
                    Klik untuk ambil foto atau pilih dari galeri
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Format JPG, PNG (Maks. 5MB)
                  </p>
                </div>
              )}
            </div>

            {/* Field 6: Tanda Tangan Digital Siswa / Orang Tua (Wajib) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Tanda Tangan Digital Siswa / Orang Tua{" "}
                  <span className="text-rose-500">* </span>
                </label>
              </div>

              {studentSignature ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-white border border-slate-200 rounded-lg p-1 w-24 h-12 flex items-center justify-center flex-shrink-0">
                      <img
                        src={studentSignature}
                        alt="TTD Siswa"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        Tanda Tangan Terlampir
                      </p>
                      <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Dicantumkan
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowSigModal(true)}
                      className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer border border-blue-200"
                    >
                      Ubah
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentSignature(null)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Tanda Tangan"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSigModal(true)}
                  className="w-full border-2 border-dashed border-rose-300 hover:border-blue-400 rounded-xl p-3.5 flex items-center justify-center gap-2 text-xs font-bold text-rose-700 hover:text-blue-600 bg-rose-50/50 hover:bg-blue-50/30 transition-colors cursor-pointer shadow-2xs"
                >
                  <span>Tanda Tangan Digital Siswa / Orang Tua</span>
                </button>
              )}
            </div>

            {/* GPS Location Status Indicator (Wajib) */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                geoLoc.latitude
                  ? "bg-emerald-50/70 border-emerald-300"
                  : geoLoc.error
                    ? "bg-rose-50/70 border-rose-300"
                    : "bg-blue-50/60 border-blue-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      geoLoc.latitude
                        ? "bg-emerald-600 text-white"
                        : geoLoc.loading
                          ? "bg-blue-600 text-white animate-pulse"
                          : "bg-rose-600 text-white"
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 text-xs">
                        {geoLoc.loading
                          ? "Mendeteksi Titik GPS..."
                          : geoLoc.latitude
                            ? "Titik GPS Terdeteksi"
                            : "Akses GPS Diperlukan"}
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs mt-0.5 break-words">
                      {geoLoc.loading
                        ? "Sedang membaca koordinat GPS perangkat Anda..."
                        : geoLoc.latitude
                          ? `${geoLoc.latitude.toFixed(5)}, ${geoLoc.longitude.toFixed(5)} ${
                              geoLoc.accuracy
                                ? `±${Math.round(geoLoc.accuracy)}m`
                                : "Lokasi Valid"
                            }`
                          : geoLoc.error ||
                            "Sensor GPS tidak aktif atau izin ditolak oleh browser."}
                    </p>
                  </div>
                </div>

                {geoLoc.latitude ? (
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs flex-shrink-0 border border-emerald-200 flex items-center gap-1">
                    <span>Siap</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={ambilLokasiGPS}
                    disabled={geoLoc.loading}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex-shrink-0 transition-colors flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${geoLoc.loading ? "animate-spin" : ""}`}
                    />
                    <span>{geoLoc.loading ? "Mencari..." : "Refresh"}</span>
                  </button>
                )}
              </div>

              {/* Peringatan & tombol uji dev jika GPS belum aktif / error */}
              {!geoLoc.latitude && !geoLoc.loading && (
                <div className="mt-2.5 pt-2 border-t border-rose-200/80 text-[11px] text-rose-800 flex items-center justify-between gap-2 flex-wrap">
                  <span>
                    Pengajuan surat izin/sakit mewajibkan rekaman titik GPS
                    perangkat. Pastikan izin lokasi diizinkan.
                  </span>
                  {(window.location.hostname === "localhost" ||
                    window.location.hostname === "127.0.0.1") && (
                    <button
                      type="button"
                      onClick={handleSimulasiLokasi}
                      className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded border border-indigo-200 transition-colors cursor-pointer"
                    >
                      🧪 Uji GPS Dev
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Note Info */}
            <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <span>
                Setelah formulir dikirim, Guru Piket atau Wali Kelas akan
                memverifikasi permohonan ini di Dashboard Presensi agar
                kehadiran resmi tercatat sebagai <strong>{jenis}</strong>.
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                loading ||
                !siswaData ||
                !geoLoc.latitude ||
                !geoLoc.longitude ||
                !studentSignature
              }
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-md ${
                loading ||
                !siswaData ||
                !geoLoc.latitude ||
                !geoLoc.longitude ||
                !studentSignature
                  ? "bg-slate-300 cursor-not-allowed shadow-none text-slate-500"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20 cursor-pointer active:scale-[0.99]"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengirim Pengajuan...</span>
                </>
              ) : !geoLoc.latitude || !geoLoc.longitude ? (
                <span>Aktifkan GPS untuk Dapat Mengirim</span>
              ) : !studentSignature ? (
                <span>Bubuhkan Tanda Tangan Digital untuk Mengirim</span>
              ) : (
                <span>Kirim Surat Pengajuan {jenis}</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Signature Pad Modal Siswa */}
      <SignaturePadModal
        isOpen={showSigModal}
        onClose={() => setShowSigModal(false)}
        onSave={handleSaveSignature}
        initialSignature={studentSignature}
        title="Tanda Tangan Digital Siswa"
        signerName={siswaData?.nama || user?.nama || "Siswa"}
      />
    </div>
  );
}
