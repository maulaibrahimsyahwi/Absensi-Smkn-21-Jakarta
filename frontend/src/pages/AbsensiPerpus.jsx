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
  Clock,
  BookMarked,
  RotateCcw,
  FileText,
  Sparkles,
  X,
  PenLine,
  Pause,
  Play,
  MapPin,
  Navigation,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import FaceSilhouetteGuide from "../components/FaceSilhouetteGuide";
import { useAuth } from "../context/AuthContext";
import {
  SMKN21_COORDINATES,
  calculateDistanceMeters,
  formatDistance,
  getCurrentLocation,
} from "../utils/geoUtils";

const KEPERLUAN_OPTIONS = [
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
  const webcamRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [keperluan, setKeperluan] = useState("Membaca/Belajar");
  const [customKeperluan, setCustomKeperluan] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [countdown, setCountdown] = useState(3); // 3 detik
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isLiveVerified, setIsLiveVerified] = useState(false);
  const [eyeState, setEyeState] = useState("UNKNOWN");
  const blinkCycleRef = useRef({ hasBeenOpen: false, hasClosed: false });
  const canvasRef = useRef(null);
  const baselineOpenScoreRef = useRef(null);
  const openSamplesRef = useRef([]);

  // WakeLock: Mencegah layar redup (auto-dim) atau sleep saat bersiap absen
  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch (err) {
        // Abaikan jika ditolak peramban
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  // GPS Geofence State (Radius 10m SMKN 21)
  const [geoState, setGeoState] = useState({
    loading: true,
    latitude: null,
    longitude: null,
    accuracy: null,
    distanceMeters: null,
    isWithinRadius: false,
    error: null,
    simulated: false,
    isMock: false,
  });

  const checkGeofence = useCallback(async () => {
    setGeoState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const loc = await getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      const dist = calculateDistanceMeters(
        loc.latitude,
        loc.longitude,
        SMKN21_COORDINATES.latitude,
        SMKN21_COORDINATES.longitude,
      );
      const isWithin = dist <= SMKN21_COORDINATES.radiusMeters;
      setGeoState({
        loading: false,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        distanceMeters: dist,
        isWithinRadius: isWithin,
        error: null,
        simulated: false,
        isMock: loc.isMock || false,
      });
    } catch (err) {
      setGeoState((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "Gagal memperoleh titik koordinat GPS",
      }));
    }
  }, []);

  useEffect(() => {
    checkGeofence();
  }, [checkGeofence]);

  const toggleSimulation = () => {
    setGeoState((prev) => {
      const nextSim = !prev.simulated;
      if (nextSim) {
        return {
          loading: false,
          simulated: true,
          isWithinRadius: true,
          distanceMeters: 8,
          accuracy: 5,
          error: null,
          latitude: SMKN21_COORDINATES.latitude,
          longitude: SMKN21_COORDINATES.longitude,
          isMock: false,
        };
      } else {
        checkGeofence();
        return { ...prev, simulated: false };
      }
    });
  };

  // Status Validitas GPS: HANYA BENAR JIKA SUDAH SELESAI MENGAMBIL LOKASI DAN BERADA DALAM RADIUS
  const isGpsValid =
    !geoState.loading && (geoState.isWithinRadius || geoState.simulated);

  // Sedang menunggu sinyal GPS (wajib tunggu GPS sebelum bisa absen perpus)
  const isGpsWaiting = geoState.loading;

  // Terblokir karena di luar radius sekolah atau terjadi error pada sensor GPS
  const isGpsBlocked =
    !geoState.loading && !geoState.isWithinRadius && !geoState.simulated;

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

  // Frame Ringan (<12KB) untuk responsivitas tinggi (8-10 FPS)
  const getLightweightFrame = useCallback(() => {
    if (!webcamRef.current) return null;
    const video = webcamRef.current.video;
    if (!video || video.readyState < 2) return null;

    try {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement("canvas");
        canvasRef.current.width = 320;
        canvasRef.current.height = 240;
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, 320, 240);
      return canvas.toDataURL("image/jpeg", 0.6);
    } catch (err) {
      return webcamRef.current.getScreenshot();
    }
  }, []);

  // 1. Deteksi Keberadaan Wajah & Liveness Kedipan Mata Cepat & Adaptif
  const checkLiveness = useCallback(async () => {
    if (
      !webcamRef.current ||
      loading ||
      showPopup ||
      result ||
      !isGpsValid ||
      isLiveVerified
    )
      return;

    try {
      const frameData = getLightweightFrame();
      if (!frameData) return;

      const res = await api.post(
        "/detect_liveness",
        {
          image: frameData,
        },
        { timeout: 2500 },
      );

      const data = res.data;
      if (!data.face_detected) {
        setIsFaceDetected(false);
        setEyeState("UNKNOWN");
        blinkCycleRef.current = { hasBeenOpen: false, hasClosed: false };
        baselineOpenScoreRef.current = null;
        openSamplesRef.current = [];
        return;
      }

      setIsFaceDetected(true);
      const score = Number(data.openness_score || 0);

      // Logika adaptif personal baseline + threshold absolut
      const isClosedAbs = data.eye_state === "CLOSED" || score < 11.5;
      const isClosedRel =
        baselineOpenScoreRef.current &&
        score < baselineOpenScoreRef.current * 0.72;
      const isEyeClosed = isClosedAbs || isClosedRel;

      const isOpenAbs = data.eye_state === "OPEN" && score >= 11.5;
      const isOpenRel =
        baselineOpenScoreRef.current &&
        score >= baselineOpenScoreRef.current * 0.85;
      const isEyeOpen = isOpenAbs || isOpenRel;

      if (isEyeOpen && !isEyeClosed) {
        setEyeState("OPEN");

        // Kalibrasi baseline pribadi mata terbuka
        if (openSamplesRef.current.length < 6) {
          openSamplesRef.current.push(score);
          const sum = openSamplesRef.current.reduce((a, b) => a + b, 0);
          baselineOpenScoreRef.current = sum / openSamplesRef.current.length;
        }

        if (!blinkCycleRef.current.hasBeenOpen) {
          blinkCycleRef.current.hasBeenOpen = true;
        } else if (
          blinkCycleRef.current.hasBeenOpen &&
          blinkCycleRef.current.hasClosed
        ) {
          // Siklus Kedipan Berhasil: OPEN -> CLOSED -> OPEN
          setIsLiveVerified(true);
          setCountdown(3);
        }
      } else if (isEyeClosed) {
        setEyeState("CLOSED");
        if (blinkCycleRef.current.hasBeenOpen) {
          blinkCycleRef.current.hasClosed = true;
        }
      }
    } catch (err) {
      // Abaikan kendala jaringan sesaat selama polling cepat
    }
  }, [
    loading,
    showPopup,
    result,
    isGpsValid,
    isLiveVerified,
    getLightweightFrame,
  ]);

  // Polling deteksi keaktifan cepat (~120ms jeda) agar kedipan 150-250ms pasti tertangkap
  useEffect(() => {
    let isMounted = true;
    let timerId = null;

    if (loading || showPopup || result || !isGpsValid || isLiveVerified) {
      if (!isLiveVerified) {
        setIsFaceDetected(false);
        setEyeState("UNKNOWN");
        blinkCycleRef.current = { hasBeenOpen: false, hasClosed: false };
        baselineOpenScoreRef.current = null;
        openSamplesRef.current = [];
      }
      return;
    }

    const runLivenessLoop = async () => {
      if (!isMounted) return;
      if (!loading && !showPopup && !result && isGpsValid && !isLiveVerified) {
        await checkLiveness();
      }
      if (isMounted && !isLiveVerified) {
        timerId = setTimeout(runLivenessLoop, 120);
      }
    };

    runLivenessLoop();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [loading, showPopup, result, isGpsValid, isLiveVerified, checkLiveness]);

  const captureFace = useCallback(() => {
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
  }, [webcamRef, isGpsValid]);

  // 2. Countdown Timer: HANYA BERJALAN JIKA KEDIPAN MATA TERVERIFIKASI & GPS VALID (3 Detik)
  useEffect(() => {
    if (loading || showPopup || result || !isGpsValid || !isLiveVerified) {
      if (!isLiveVerified) setCountdown(3);
      return;
    }

    if (countdown <= 0) {
      captureFace();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [
    countdown,
    isLiveVerified,
    loading,
    showPopup,
    result,
    isGpsValid,
    captureFace,
  ]);

  const submitKunjungan = async (e) => {
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
      });
      setResult({ success: true, message: response.data.message });
      setTimeout(() => {
        setResult(null);
        setCustomKeperluan("");
        setKeperluan("Membaca/Belajar");
        setCountdown(3);
        setIsFaceDetected(false);
        setIsLiveVerified(false);
        setEyeState("UNKNOWN");
        blinkCycleRef.current = { hasBeenOpen: false, hasClosed: false };
        baselineOpenScoreRef.current = null;
        openSamplesRef.current = [];
      }, 4000);
    } catch (err) {
      setResult({
        success: false,
        message:
          err.response?.data?.message ||
          "Wajah tidak cocok atau terjadi kesalahan server. Mencoba kembali...",
      });
      setTimeout(() => {
        setResult(null);
        setCountdown(3);
        setIsFaceDetected(false);
        setIsLiveVerified(false);
        setEyeState("UNKNOWN");
        blinkCycleRef.current = { hasBeenOpen: false, hasClosed: false };
        baselineOpenScoreRef.current = null;
        openSamplesRef.current = [];
      }, 3000);
    } finally {
      setLoading(false);
      setCapturedImage(null);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-black overflow-hidden select-none">
      {/* 1. Kamera Fullscreen Memenuhi Layar */}
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
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
            lingkungan SMKN 21 Jakarta (radius &le; 10m). Pastikan GPS perangkat
            Anda aktif dan izinkan akses lokasi pada browser.
          </p>

          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-950/70 border border-emerald-800/70 text-emerald-300 text-xs font-semibold mb-6 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Mencari Sinyal GPS Lokasi Sekolah...</span>
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
              ? "Akses Lokasi GPS Diperlukan"
              : "Di Luar Radius SMKN 21"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-4 leading-relaxed">
            Presensi perpustakaan hanya dapat dilakukan saat Anda berada di
            lingkungan sekolah SMKN 21 Jakarta (radius &le; 10 meter).
            {geoState.distanceMeters != null && (
              <span className="block mt-2 font-bold text-rose-300 bg-rose-950/60 border border-rose-800/60 rounded-lg py-1.5 px-3">
                Jarak Anda saat ini: ~{formatDistance(geoState.distanceMeters)}{" "}
                dari sekolah
              </span>
            )}
            {geoState.error && (
              <span className="block mt-2 font-bold text-amber-300 bg-amber-950/60 border border-amber-800/60 rounded-lg py-1.5 px-3">
                Kendala GPS: {geoState.error}
              </span>
            )}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-5">
            <button
              onClick={checkGeofence}
              disabled={geoState.loading}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/25 cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 ${geoState.loading ? "animate-spin" : ""}`}
              />
              <span>Cek Ulang GPS</span>
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
                [Mode Pengembangan / Dev Test]
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

      {/* 8. Floating Bottom Button: Pindai Langsung */}
      <div className="absolute bottom-4 sm:bottom-6 inset-x-0 flex justify-center z-20 pointer-events-auto px-4">
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
                ? "Di Luar Radius SMKN 21"
                : !isFaceDetected
                  ? "Arahkan Wajah ke Siluet"
                  : !isLiveVerified
                    ? "Kedipkan Mata untuk Absen"
                    : "Pindai Langsung"}
          </span>
        </button>
      </div>

      {/* 8. Interactive Modal: Pilih / Tulis Keperluan Kunjungan */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200/80 px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Keperluan Kunjungan
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Pilih atau tuliskan tujuan Anda
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPopup(false);
                  setCountdown(3);
                  setIsFaceDetected(false);
                  setIsLiveVerified(false);
                  setEyeState("UNKNOWN");
                  blinkCycleRef.current = {
                    hasBeenOpen: false,
                    hasClosed: false,
                  };
                  baselineOpenScoreRef.current = null;
                  openSamplesRef.current = [];
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={submitKunjungan}
              className="p-4 sm:p-6 overflow-y-auto flex-1"
            >
              {/* Snapshot Thumbnail */}
              {capturedImage && (
                <div className="mb-4 flex items-center gap-3 p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <img
                    src={capturedImage}
                    alt="Wajah Terpindai"
                    className="w-12 h-12 rounded-xl object-cover border border-slate-300"
                  />
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                      <Camera className="w-3 h-3" /> Foto Terambil
                    </span>
                    <p className="text-xs text-slate-600 mt-1">
                      Pilih atau ketik keperluan di bawah untuk verifikasi.
                    </p>
                  </div>
                </div>
              )}

              {/* Option Selector Cards */}
              <div className="space-y-2 mb-4">
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
                <div className="mb-4 animate-in fade-in duration-150">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tuliskan Keperluan Anda
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Contoh: Mengambil sertifikat, konsultasi skripsi..."
                    value={customKeperluan}
                    onChange={(e) => setCustomKeperluan(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-emerald-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-emerald-50/30 text-slate-800 placeholder:text-slate-400"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPopup(false);
                    setCountdown(3);
                    setIsFaceDetected(false);
                    setIsLiveVerified(false);
                    setEyeState("UNKNOWN");
                    blinkCycleRef.current = {
                      hasBeenOpen: false,
                      hasClosed: false,
                    };
                    baselineOpenScoreRef.current = null;
                    openSamplesRef.current = [];
                  }}
                  className="flex-1 py-2.5 px-4 text-xs sm:text-sm font-semibold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    loading ||
                    (keperluan === "Lainnya" && !customKeperluan.trim())
                  }
                  className="flex-1 py-2.5 px-4 text-xs sm:text-sm font-bold rounded-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  <span>Konfirmasi & Simpan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
