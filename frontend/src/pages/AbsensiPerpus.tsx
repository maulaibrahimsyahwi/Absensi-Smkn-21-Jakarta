import React, { useRef, useState, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import api from "../services/api";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Camera,
  Loader2,
  BookOpen,
  BookMarked,
  RotateCcw,
  FileText,
  X,
  PenLine,
  MapPin,
  Navigation,
  AlertTriangle,
  Sun,
  Flag,
} from "lucide-react";
import FaceSilhouetteGuide from "../components/FaceSilhouetteGuide";
import { useAuth } from "../context/AuthContext";
import { SMKN21_COORDINATES, formatDistance } from "../utils/geoUtils";
import { useAudioFeedback, useLivenessDetector } from "../hooks/useFaceScanner";
import useGeofence from "../hooks/useGeofence";
import { liburService } from "../services/liburService";
import ModalPreviewSuratEdaran from "../components/libur/ModalPreviewSuratEdaran";
import type { HolidayStatusToday } from "../types/libur";
import Sheet, {
  SheetHeader,
  SheetBody,
  SheetFooter,
} from "../components/ui/Sheet";
import Button from "../components/ui/Button";
import useWakeLock from "../hooks/useWakeLock";
import { getDeviceId } from "../utils/deviceFingerprint";
import { enqueueOfflineAttendance } from "../services/offlineQueue";

interface KeperluanOption {
  id: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

const KEPERLUAN_OPTIONS: KeperluanOption[] = [
  {
    id: "Membaca/Belajar",
    label: "Membaca / Belajar",
    desc: "Membaca buku atau belajar mandiri di perpustakaan",
    icon: BookOpen,
  },
  {
    id: "Meminjam Buku",
    label: "Meminjam Buku",
    desc: "Layanan sirkulasi peminjaman buku perpustakaan",
    icon: BookMarked,
  },
  {
    id: "Mengembalikan Buku",
    label: "Mengembalikan Buku",
    desc: "Pengembalian koleksi buku yang dipinjam",
    icon: RotateCcw,
  },
  {
    id: "Mengerjakan Tugas",
    label: "Mengerjakan Tugas",
    desc: "Mengerjakan tugas sekolah atau tugas kelompok",
    icon: FileText,
  },
  {
    id: "Lainnya",
    label: "Keperluan Lainnya",
    desc: "Tuliskan keperluan khusus kunjungan Anda",
    icon: PenLine,
  },
];

export default function AbsensiPerpus() {
  const { user, isSiswa, isPiket, isAdmin } = useAuth();
  const backTarget = isPiket
    ? "/portal-piket"
    : isAdmin
      ? "/portal-admin"
      : isSiswa
        ? "/portal-siswa"
        : "/";
  const webcamRef = useRef<Webcam | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [keperluan, setKeperluan] = useState("Membaca/Belajar");
  const [customKeperluan, setCustomKeperluan] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [countdown, setCountdown] = useState(3); // 3 detik
  const [holidayStatus, setHolidayStatus] = useState<HolidayStatusToday | null>(
    null,
  );
  const [showSuratPreview, setShowSuratPreview] = useState(false);

  const [camError, setCamError] = useState<string | null>(null);

  useWakeLock();
  const { playSound } = useAudioFeedback();

  // Pengecekan Hari Libur & Status Operasional Sekolah
  useEffect(() => {
    const fetchHoliday = async () => {
      try {
        const res = await liburService.getStatusToday();
        if (res?.success) {
          setHolidayStatus(res);
        }
      } catch (_e) {}
    };
    fetchHoliday();
  }, []);

  // GPS Geofence Hook (SMKN 21)
  const {
    geoState,
    checkGeofence,
    toggleSimulation,
    isGpsValid,
    isGpsWaiting,
    isGpsBlocked,
  } = useGeofence(SMKN21_COORDINATES);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " WIB",
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Pengecekan Hari Libur Terjadwal & Akhir Pekan
  const isRawWeekend = [0, 6].includes(new Date().getDay());
  const isSpecialSchoolDay = Boolean(holidayStatus?.is_special_school_day);
  const isHoliday = Boolean(holidayStatus?.is_holiday);
  // Layanan perpustakaan ditutup jika hari libur resmi, ATAU akhir pekan (kecuali jika ada kegiatan masuk khusus)
  const isPerpusClosed = isHoliday || (isRawWeekend && !isSpecialSchoolDay);

  // Liveness Detection Adaptif & Anti-DDoS Polling (~600ms sequential loop via useFaceScanner hook)
  const verifiedTokenRef = useRef<string | null>(null);
  const {
    isFaceDetected,
    eyeState,
    isLiveVerified,
    livenessToken,
    resetLiveness,
  } = useLivenessDetector({
    webcamRef,
    isActive:
      !isPerpusClosed && !loading && !showPopup && !result && isGpsValid,
    onLiveVerified: (token) => {
      if (token) verifiedTokenRef.current = token;
      setCountdown(3);
    },
    pollIntervalMs: 600,
  });

  // Auto-close popup setelah 30 detik tidak ada aktivitas agar kiosk tidak terblokir
  useEffect(() => {
    if (!showPopup) return;
    const timer = setTimeout(() => {
      setShowPopup(false);
      setCapturedImage(null);
      setCountdown(3);
      resetLiveness();
    }, 30000);
    return () => clearTimeout(timer);
  }, [showPopup, resetLiveness]);

  const captureFace = useCallback(() => {
    if (isPerpusClosed) return;
    if (!isGpsValid) return;
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setShowPopup(true);
      setResult(null);
    } else {
      setResult({
        success: false,
        message: "Kamera belum siap menangkap gambar. Mempersiapkan ulang...",
      });
      setCountdown(3);
    }
  }, [webcamRef, isGpsValid, isPerpusClosed]);

  const captureFaceRef = useRef<() => void>(() => {});
  captureFaceRef.current = captureFace;

  // 2. Countdown Timer: HANYA BERJALAN JIKA KEDIPAN MATA TERVERIFIKASI & GPS VALID (3 Detik)
  useEffect(() => {
    if (
      isPerpusClosed ||
      loading ||
      showPopup ||
      result ||
      !isGpsValid ||
      !isLiveVerified
    ) {
      if (!isLiveVerified) setCountdown(3);
      return;
    }

    if (countdown <= 0) {
      captureFaceRef.current();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [
    isPerpusClosed,
    countdown,
    isLiveVerified,
    loading,
    showPopup,
    result,
    isGpsValid,
  ]);

  const submitKunjungan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    let finalKeperluan = keperluan;
    if (keperluan === "Lainnya") {
      finalKeperluan = customKeperluan.trim() || "Keperluan Lainnya";
    }

    setLoading(true);
    setShowPopup(false);
    setResult(null);

    try {
      const response = await api.post("/verify_perpus", {
        image: capturedImage,
        keperluan: finalKeperluan,
        latitude: geoState.latitude,
        longitude: geoState.longitude,
        accuracy: geoState.accuracy,
        distance: geoState.distanceMeters,
        simulated: geoState.simulated,
        is_mock: geoState.isMock || false,
        liveness_token: verifiedTokenRef.current || livenessToken,
        device_id: getDeviceId(),
        client_timestamp: Date.now(),
      });
      playSound("success");
      setResult({ success: true, message: response.data.message });
      setTimeout(() => {
        setResult(null);
        setCustomKeperluan("");
        setKeperluan("Membaca/Belajar");
        setCountdown(3);
        resetLiveness();
      }, 4000);
    } catch (err: any) {
      playSound("error");
      const isNetworkOffline =
        !navigator.onLine || err.code === "ERR_NETWORK" || !err.response;
      if (isNetworkOffline && capturedImage) {
        const saved = await enqueueOfflineAttendance({
          mode: isSiswa ? "mandiri" : "kiosk",
          image: capturedImage,
          latitude: geoState.latitude,
          longitude: geoState.longitude,
          accuracy: geoState.accuracy,
          expected_siswa_id: isSiswa ? user?.id ?? null : null,
          device_id: getDeviceId(),
          tipe: "perpustakaan",
          keperluan: finalKeperluan,
          status: "Kunjungan Perpustakaan",
        });
        if (!saved) {
          setResult({
            success: false,
            message:
              "Penyimpanan perangkat penuh atau tidak tersedia. Presensi belum tersimpan, hubungi staf perpustakaan.",
          });
          return;
        }
        setResult({
          success: true,
          message:
            "Jaringan Terputus: Bukti foto kunjungan perpustakaan tersimpan di Buffer Darurat. Akan otomatis disinkronkan saat online.",
        });
        setTimeout(() => {
          setResult(null);
          setCountdown(3);
          resetLiveness();
        }, 3500);
        return;
      }
      setResult({
        success: false,
        message:
          err.response?.data?.message ||
          "Wajah tidak cocok atau terjadi kesalahan server. Mencoba kembali...",
      });
      setTimeout(() => {
        setResult(null);
        setCountdown(3);
        resetLiveness();
      }, 3000);
    } finally {
      setLoading(false);
      setCapturedImage(null);
    }
  };

  // Hari Libur atau Akhir Pekan: Perpustakaan Ditutup
  if (isPerpusClosed) {
    const namaHariIni =
      holidayStatus?.nama_hari ||
      new Date().toLocaleDateString("id-ID", { weekday: "long" });
    const isSemesterBreak =
      holidayStatus?.holiday_event?.kategori === "libur_semester";

    return (
      <div className="fixed inset-0 w-screen h-screen bg-slate-950 flex items-center justify-center p-4 select-none z-50">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg ${
              isHoliday
                ? isSemesterBreak
                  ? "bg-purple-500/15 border border-purple-500/30 text-purple-400 shadow-purple-500/10"
                  : "bg-rose-500/15 border border-rose-500/30 text-rose-400 shadow-rose-500/10"
                : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-emerald-500/10"
            }`}
          >
            {isHoliday ? (
              <Sun className="w-8 h-8" />
            ) : (
              <BookOpen className="w-8 h-8" />
            )}
          </div>
          <div className="space-y-2">
            {isHoliday && (
              <span
                className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider mb-1 border ${
                  isSemesterBreak
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                }`}
              >
                {isSemesterBreak ? "Libur Semester" : "Hari Libur Resmi"}
              </span>
            )}
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {isHoliday
                ? holidayStatus?.holiday_event?.nama || "Hari Libur Sekolah"
                : `Hari Libur Akhir Pekan (${namaHariIni})`}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              {isHoliday
                ? holidayStatus?.message ||
                  holidayStatus?.holiday_event?.keterangan ||
                  "Layanan perpustakaan SMKN 21 Jakarta sedang diliburkan sesuai kalender akademik."
                : "Layanan absensi kunjungan perpustakaan SMKN 21 Jakarta hanya dibuka pada hari sekolah aktif (Senin s/d Jumat)."}
            </p>
            <p className="text-xs text-slate-400">
              {isHoliday
                ? "Layanan kunjungan dan peminjaman buku akan dibuka kembali pada hari sekolah aktif berikutnya."
                : "Layanan perpustakaan akan dibuka kembali pada hari Senin."}
            </p>
            {holidayStatus?.holiday_event?.lampiran_surat && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowSuratPreview(true)}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-white border border-purple-500/40 font-bold rounded-xl transition-all text-xs cursor-pointer shadow-xs"
                >
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span> Lihat Surat Edaran Resmi</span>
                </button>
              </div>
            )}
          </div>
          <div className="pt-2">
            <Link
              to={backTarget}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all text-sm"
            >
              <span>Kembali</span>
            </Link>
          </div>
        </div>

        <ModalPreviewSuratEdaran
          isOpen={showSuratPreview}
          onClose={() => setShowSuratPreview(false)}
          suratData={holidayStatus?.holiday_event ?? null}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 h-dvh w-full bg-black overflow-hidden select-none">
      {camError ? (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-30">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mb-4">
            <Camera className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">
            Kamera Tidak Dapat Diakses
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-sm mb-6 leading-relaxed">
            {camError}. Pastikan izin kamera telah diberikan pada browser atau
            coba muat ulang halaman.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg transition cursor-pointer"
            >
              Muat Ulang Halaman
            </button>
            <Link
              to={backTarget}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs transition"
            >
              Kembali
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Kamera Fullscreen Memenuhi Layar */}
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            onUserMediaError={(err) =>
              setCamError(
                typeof err === "string"
                  ? err
                  : (err as any)?.message ||
                      "Akses kamera ditolak atau perangkat kamera tidak ditemukan.",
              )
            }
            videoConstraints={{
              facingMode: "user",
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            }}
            className="w-full h-full object-cover"
          />

          {/* 2. Garis Laser Pemindai Animasi */}
          <div className="scanner-line"></div>

          {/* 3. Presisi Siluet Kontur Wajah Manusia Emerald */}
          <FaceSilhouetteGuide
            isDetected={isFaceDetected}
            theme="emerald"
            countdown={countdown}
            loading={loading}
            isLiveVerified={isLiveVerified}
            eyeState={eyeState}
          />
        </>
      )}

      {/* 4. Top Floating Bar */}
      <div className="absolute top-3 sm:top-4 inset-x-3 sm:inset-x-6 flex items-center justify-between z-20 pointer-events-auto">
        <Link
          to={backTarget}
          title="Kembali ke Beranda"
          aria-label="Kembali ke Beranda"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl sm:rounded-2xl text-white bg-black/60 hover:bg-black/80 border border-white/20 backdrop-blur-md transition-all shadow-md group active:scale-95 text-xs font-bold"
        >
          <ArrowLeft
            className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:-translate-x-0.5"
            strokeWidth={2.5}
          />
          <span className="hidden sm:inline">Kembali</span>
        </Link>

        {/* GPS Geofence Pill */}
        {geoState.loading ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] sm:text-xs font-semibold">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
            <span className="hidden sm:inline">GPS:</span> Cek Radius...
          </div>
        ) : geoState.simulated ? (
          <button
            type="button"
            onClick={toggleSimulation}
            title="Klik untuk matikan simulasi dev"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900/90 backdrop-blur-md border border-purple-400/50 text-purple-200 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5 text-purple-300" />
            <span>Mode Uji: SMKN 21 (&le;10m)</span>
          </button>
        ) : geoState.isWithinRadius ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-950/80 backdrop-blur-md border border-emerald-400/50 text-emerald-200 text-[11px] sm:text-xs font-semibold">
            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Area SMKN 21:</span>{" "}
            <span>{Math.round(geoState.distanceMeters || 0)}m</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-950/80 backdrop-blur-md border border-rose-400/50 text-rose-200 text-[11px] sm:text-xs font-semibold">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Luar Radius:</span>{" "}
            <span>{formatDistance(geoState.distanceMeters)}</span>
          </div>
        )}

        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white text-[11px] sm:text-xs font-semibold shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-bold text-emerald-300">
            {currentTime || "00:00:00 WIB"}
          </span>
        </div>
      </div>

      {/* Banner Notifikasi Khusus jika Hari Masuk Khusus (Upacara / Event Sekolah) */}
      {isSpecialSchoolDay && !result && (
        <div className="absolute top-16 sm:top-18 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-20 pointer-events-none flex justify-center animate-in fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/90 border border-amber-400 text-slate-950 font-bold text-xs shadow-xl backdrop-blur-md">
            <Flag className="w-4 h-4 text-slate-950 shrink-0" />
            <span>
              Kegiatan Khusus:{" "}
              {holidayStatus?.holiday_event?.nama || "Wajib Masuk Sekolah"}
            </span>
          </div>
        </div>
      )}

      {/* 5. Loading State */}
      {loading && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-3 z-30 pointer-events-none p-4 text-center">
          <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-emerald-400" />
          <span className="text-xs sm:text-base font-bold tracking-wide">
            Sedang Memproses Kunjungan...
          </span>
        </div>
      )}

      {/* 6. Floating Result Banner */}
      {result && (
        <div className="absolute top-16 sm:top-20 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[500px] z-30 animate-in fade-in zoom-in-95 duration-200">
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border backdrop-blur-md shadow-2xl flex items-start gap-3 ${
              result.success
                ? "bg-emerald-950/90 border-emerald-400/80 text-emerald-100"
                : "bg-rose-950/90 border-rose-400/80 text-rose-100"
            }`}
          >
            {result.success ? (
              <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7 text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-sm sm:text-base leading-snug">
                {result.success
                  ? "Kunjungan Berhasil Dicatat!"
                  : "Gagal Mencatat Kunjungan"}
              </p>
              <p className="text-xs sm:text-sm mt-1 opacity-90 break-words">
                {result.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 7A. Overlay Menunggu GPS (Wajib tunggu GPS sebelum bisa absen perpus) */}
      {isGpsWaiting && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center text-white z-40 p-4 sm:p-6 text-center animate-in fade-in duration-200">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mb-4 sm:mb-5">
            <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-emerald-400" />
            <MapPin className="w-4 h-4 text-emerald-300 absolute" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
            Menunggu Titik Lokasi GPS...
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-5 leading-relaxed">
            Presensi perpustakaan mewajibkan verifikasi lokasi berada di
            lingkungan SMKN 21 Jakarta. Pastikan Lokasi perangkat Anda aktif dan
            izinkan akses lokasi pada browser
          </p>

          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-950/70 border border-emerald-800/70 text-emerald-300 text-xs font-semibold mb-6 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Mencari Sinyal Lokasi Sekolah...</span>
          </div>

          {/* Localhost dev simulation toggle */}
          {(window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1") && (
            <div className="pt-4 border-t border-white/10 max-w-xs w-full text-center">
              <p className="text-[11px] text-slate-400 mb-2 font-mono">
                [Mode Pengembang / Dev Test]
              </p>
              <button
                type="button"
                onClick={toggleSimulation}
                className="w-full py-2 px-3 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-indigo-400/40 cursor-pointer shadow-md"
              >
                <Navigation className="w-3.5 h-3.5 text-indigo-200" />
                <span>Simulasi di SMKN 21 (&le;10m)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 7B. Geofence Lock Screen Overlay (Jika di luar radius 10m atau GPS error) */}
      {isGpsBlocked && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center text-white z-40 p-4 sm:p-6 text-center animate-in fade-in duration-300 overflow-y-auto max-h-screen py-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mb-4 sm:mb-5">
            <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
            {geoState.error
              ? "Akses Lokasi Diperlukan"
              : "Di Luar Radius SMKN 21"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-4 leading-relaxed">
            Presensi perpustakaan hanya dapat dilakukan saat Anda berada di
            lingkungan sekolah SMKN 21 Jakarta
            {geoState.distanceMeters != null && (
              <span className="block mt-2 font-bold text-rose-300 bg-rose-950/60 border border-rose-800/60 rounded-lg py-1.5 px-3">
                Jarak Anda saat ini: ~{formatDistance(geoState.distanceMeters)}{" "}
                dari sekolah
              </span>
            )}
            {geoState.error && (
              <span className="block mt-2 font-bold text-amber-300 bg-amber-950/60 border border-amber-800/60 rounded-lg py-1.5 px-3">
                {geoState.error}
              </span>
            )}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-5">
            <button
              onClick={checkGeofence}
              disabled={geoState.loading}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/25 cursor-pointer"
            >
              <span>Cek Ulang Lokasi</span>
            </button>

            <Link
              to={backTarget}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs sm:text-sm transition-all border border-white/10"
            >
              Kembali
            </Link>
          </div>

          {/* Localhost dev simulation toggle */}
          {(window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1") && (
            <div className="pt-4 border-t border-white/10 max-w-xs w-full text-center">
              <p className="text-[11px] text-slate-400 mb-2 font-mono">
                [Mode Pengembang / Dev Test]
              </p>
              <button
                type="button"
                onClick={toggleSimulation}
                className="w-full py-2 px-3 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-indigo-400/40 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 text-indigo-200" />
                <span>Simulasi di SMKN 21 (&le;10m)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 8. Floating Bottom Button: Pindai Langsung & Stepper */}
      <div className="absolute bottom-4 sm:bottom-6 inset-x-0 flex flex-col items-center gap-2.5 z-20 pointer-events-auto px-4 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
        <button
          onClick={() => {
            if (!isLiveVerified) return;
            setResult(null);
            captureFace();
          }}
          disabled={loading || showPopup || !isGpsValid || !isLiveVerified}
          className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white transition-all flex items-center gap-2 sm:gap-2.5 shadow-2xl shadow-emerald-500/40 active:scale-95 disabled:opacity-50 backdrop-blur-md border border-white/20 text-xs sm:text-sm cursor-pointer disabled:cursor-not-allowed"
        >
          <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>
            {isGpsWaiting
              ? "Menunggu GPS..."
              : !isGpsValid
                ? "Di Luar Lingkungan SMKN 21"
                : !isFaceDetected
                  ? "Posisikan Wajah"
                  : !isLiveVerified
                    ? "Kedipkan Mata untuk Absen"
                    : "Pindai Langsung"}
          </span>
        </button>
      </div>

      {/* 9. Sheet: Pilih / Tulis Keperluan Kunjungan */}
      <Sheet
        isOpen={showPopup}
        onClose={() => {
          setShowPopup(false);
          setCapturedImage(null);
          setCountdown(3);
          resetLiveness();
        }}
        size="sm"
      >
        <SheetHeader
          title="Keperluan Kunjungan"
          subtitle="Pilih atau tuliskan tujuan Anda (Auto-close 30 detik)"
          icon={<BookOpen className="w-5 h-5 text-emerald-600" />}
          onClose={() => {
            setShowPopup(false);
            setCapturedImage(null);
            setCountdown(3);
            resetLiveness();
          }}
        />
        <form onSubmit={submitKunjungan}>
          <SheetBody className="space-y-3">
            {/* Option Selector Cards */}
            <div className="space-y-2">
              {KEPERLUAN_OPTIONS.map((item) => {
                const Icon = item.icon;
                const isSelected = keperluan === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setKeperluan(item.id)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all duration-150 flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p
                          className={`text-xs sm:text-sm font-semibold ${
                            isSelected ? "text-emerald-950" : "text-slate-800"
                          }`}
                        >
                          {item.label}
                        </p>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Kolom Tulis Keperluan Khusus / Lainnya */}
            {keperluan === "Lainnya" && (
              <div className="animate-in fade-in duration-150 pt-1">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tuliskan Keperluan Anda
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Contoh: Mengambil sertifikat, konsultasi..."
                  value={customKeperluan}
                  onChange={(e) => setCustomKeperluan(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-emerald-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-emerald-50/30 text-slate-800 placeholder:text-slate-400"
                />
              </div>
            )}
          </SheetBody>
          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPopup(false);
                setCapturedImage(null);
                setCountdown(3);
                resetLiveness();
              }}
              className="w-full sm:w-auto"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={
                loading || (keperluan === "Lainnya" && !customKeperluan.trim())
              }
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              <span>Konfirmasi & Simpan</span>
            </Button>
          </SheetFooter>
        </form>
      </Sheet>
    </div>
  );
}
