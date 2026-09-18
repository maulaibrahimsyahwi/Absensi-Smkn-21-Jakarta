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
  Clock,
  Play,
  Pause,
  UserCheck,
  UserX,
  MapPin,
  Navigation,
  AlertTriangle,
  RefreshCw,
  GraduationCap,
} from "lucide-react";
import FaceSilhouetteGuide from "../components/FaceSilhouetteGuide";
import { useAuth } from "../context/AuthContext";
import {
  SMKN21_COORDINATES,
  calculateDistanceMeters,
  formatDistance,
  getCurrentLocation,
} from "../utils/geoUtils";

export default function AbsensiHarian() {
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
  const [currentTime, setCurrentTime] = useState("");
  const [countdown, setCountdown] = useState(3); // Countdown 3 detik
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isLiveVerified, setIsLiveVerified] = useState(false);
  const [eyeState, setEyeState] = useState("UNKNOWN");
  const [attendanceToday, setAttendanceToday] = useState(null);
  const blinkCycleRef = useRef({ hasBeenOpen: false, hasClosed: false });
  const canvasRef = useRef(null);
  const baselineOpenScoreRef = useRef(null);
  const openSamplesRef = useRef([]);

  // Pengecekan Presensi Hari Ini: Jika siswa sudah absen hari ini, cegah absen berulang
  useEffect(() => {
    const checkTodayAttendance = async () => {
      if (isSiswa && user?.id) {
        try {
          const res = await api.get("/presensi/status_today", {
            params: { siswa_id: user.id },
          });
          if (res.data?.already_attended) {
            setAttendanceToday(res.data);
          }
        } catch (err) {
          // Lanjutkan jika ada kendala jaringan sesaat
        }
      }
    };
    checkTodayAttendance();
  }, [isSiswa, user]);

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

  // Sedang menunggu sinyal GPS (wajib tunggu GPS sebelum bisa absen)
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

  // 1. Deteksi Kehadiran Wajah & Liveness Kedipan Mata Cepat & Adaptif
  const checkLiveness = useCallback(async () => {
    if (
      !webcamRef.current ||
      loading ||
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
    result,
    isGpsValid,
    isLiveVerified,
    attendanceToday,
    getLightweightFrame,
  ]);

  // Polling deteksi keaktifan cepat (~120ms jeda) agar kedipan 150-250ms pasti tertangkap
  useEffect(() => {
    let isMounted = true;
    let timerId = null;

    if (
      loading ||
      result ||
      !isGpsValid ||
      isLiveVerified ||
      attendanceToday?.already_attended
    ) {
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
      if (
        !loading &&
        !result &&
        isGpsValid &&
        !isLiveVerified &&
        !attendanceToday?.already_attended
      ) {
        await checkLiveness();
      }
      if (isMounted && !isLiveVerified && !attendanceToday?.already_attended) {
        timerId = setTimeout(runLivenessLoop, 120);
      }
    };

    runLivenessLoop();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [
    loading,
    result,
    isGpsValid,
    isLiveVerified,
    attendanceToday,
    checkLiveness,
  ]);

  const captureAndVerify = useCallback(async () => {
    if (!isGpsValid) return;
    if (attendanceToday?.already_attended) return;
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      setResult({
        success: false,
        message: "Kamera belum siap mengambil gambar. Menyiapkan ulang...",
      });
      setCountdown(3);
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const payload = {
        image: imageSrc,
        latitude: geoState.latitude,
        longitude: geoState.longitude,
        accuracy: geoState.accuracy,
        distance: geoState.distanceMeters,
        simulated: geoState.simulated,
        is_mock: geoState.isMock || false,
      };

      // Jika presensi mandiri oleh siswa yang login, kunci pencocokan HANYA ke wajah siswa tersebut
      if (isSiswa && user?.id) {
        payload.expected_siswa_id = user.id;
      }

      const response = await api.post("/verify_harian", payload);
      setResult({ success: true, message: response.data.message });

      // Jika siswa mandiri, langsung tandai sudah absen hari ini
      if (isSiswa) {
        setAttendanceToday({
          already_attended: true,
          data: {
            waktu: new Date().toLocaleTimeString("id-ID"),
            status: "Hadir",
            nama: user?.nama,
          },
        });
      }

      // Setelah berhasil, beri waktu 3 detik agar terbaca, lalu otomatis siap untuk siswa berikutnya
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
    } catch (err) {
      if (err.response?.data?.already_attended) {
        setAttendanceToday({
          already_attended: true,
          data: {
            waktu: err.response.data.waktu || "-",
            status: err.response.data.status || "Hadir",
            nama: user?.nama,
          },
        });
      }
      setResult({
        success: false,
        message:
          err.response?.data?.message ||
          "Wajah tidak cocok atau belum terdaftar. Menyiapkan pemindaian ulang...",
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
      }, 3500);
    } finally {
      setLoading(false);
    }
  }, [webcamRef, isGpsValid, geoState, isSiswa, user, attendanceToday]);

  // 2. Countdown Timer: HANYA BERJALAN JIKA KEDIPAN MATA TERVERIFIKASI (3 Detik)
  useEffect(() => {
    if (
      loading ||
      result ||
      !isGpsValid ||
      !isLiveVerified ||
      attendanceToday?.already_attended
    ) {
      if (!isLiveVerified) setCountdown(3);
      return;
    }

    if (countdown <= 0) {
      captureAndVerify();
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
    result,
    isGpsValid,
    attendanceToday,
    captureAndVerify,
  ]);

  // Siswa Alumni: Blokir akses ke presensi harian mandiri
  if (isSiswa && user?.status === "Alumni") {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800/90 backdrop-blur-md border border-slate-700/80 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-full uppercase tracking-wider mb-2 border border-amber-500/30">
              Status: Alumni / Lulus
            </span>
            <h2 className="text-xl font-bold text-white">
              Akses Presensi Tidak Tersedia
            </h2>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Halo, <strong>{user?.nama}</strong>. Akun Anda telah resmi
              berstatus sebagai Alumni SMKN 21 Jakarta. Siswa yang telah lulus
              tidak lagi memiliki kewajiban presensi harian sekolah.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to={"/portal-alumni"}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Portal Alumni
            </Link>
          </div>
        </div>
      </div>
    );
  }

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

      {/* 3. Presisi Siluet Kontur Wajah Manusia (Bukan Hanya Kotak) */}
      <FaceSilhouetteGuide
        isDetected={isFaceDetected}
        theme="blue"
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
          <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-semibold">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
            <span className="hidden sm:inline">GPS:</span>{" "}
            <span>Cek Radius...</span>
          </div>
        ) : geoState.simulated ? (
          <button
            type="button"
            onClick={toggleSimulation}
            title="Klik untuk matikan simulasi dev"
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900/90 backdrop-blur-md border border-purple-400/50 text-purple-200 text-xs font-semibold transition-all cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5 text-purple-300 flex-shrink-0" />
            <span className="hidden sm:inline">Mode Uji</span>
          </button>
        ) : geoState.isWithinRadius ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-950/80 backdrop-blur-md border border-emerald-400/50 text-emerald-200 text-xs font-semibold">
            <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <span className="hidden sm:inline">Area SMKN 21:</span>{" "}
            <span>{Math.round(geoState.distanceMeters || 0)}m</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-950/80 backdrop-blur-md border border-rose-400/50 text-rose-200 text-xs font-semibold">
            <MapPin className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
            <span className="hidden sm:inline">Luar Radius:</span>{" "}
            <span>{formatDistance(geoState.distanceMeters)}</span>
          </div>
        )}

        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-lg">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          <span className="font-bold text-[11px] sm:text-xs text-blue-300">
            {currentTime || "00:00:00 WIB"}
          </span>
        </div>
      </div>

      {/* 5. Loading Indicator Saat Memverifikasi */}
      {loading && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-3 z-30 pointer-events-none p-4 text-center">
          <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-blue-400" />
          <span className="text-xs sm:text-base font-bold tracking-wide">
            Sedang Mencocokkan Wajah dengan Database...
          </span>
        </div>
      )}

      {/* 6. Floating Result Banner (Muncul di layar kamera) */}
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
                  ? "Presensi Berhasil Terverifikasi!"
                  : "Presensi Belum Berhasil"}
              </p>
              <p className="text-xs sm:text-sm mt-1 opacity-90 break-words">
                {result.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overlay: Siswa Sudah Melakukan Presensi Hari Ini (1x Per Hari) */}
      {attendanceToday?.already_attended && (
        <div className="absolute inset-0 bg-slate-950/92 backdrop-blur-md flex flex-col items-center justify-center text-white z-50 p-4 sm:p-6 text-center animate-in fade-in duration-200">
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mb-5 shadow-xl shadow-emerald-950/50">
            <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Sudah Presensi Hari Ini</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1">
            Halo, {user?.nama || "Siswa SMKN 21"}!
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            Anda sudah tercatat melakukan presensi kehadiran harian untuk hari
            ini. Presensi mandiri dibatasi 1 kali per hari demi ketertiban
            absensi sekolah.
          </p>

          <div className="bg-white/10 border border-white/15 rounded-2xl p-4 w-full max-w-sm mb-6 text-left space-y-2 backdrop-blur-md">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Jam Presensi</span>
              <span className="font-bold text-white font-mono">
                {attendanceToday.data?.waktu || "-"} WIB
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Status Kehadiran</span>
              <span className="font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 text-[11px]">
                {attendanceToday.data?.status || "Hadir"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Siswa / Kelas</span>
              <span className="font-bold text-white">
                {user?.nama || attendanceToday.data?.nama}{" "}
                {user?.kelas ? `(${user.kelas})` : ""}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
            <Link
              to={backTarget}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Kembali</span>
            </Link>
          </div>
        </div>
      )}

      {/* 7A. Overlay Menunggu GPS (Wajib tunggu GPS sebelum bisa absen) */}
      {isGpsWaiting && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center text-white z-40 p-4 sm:p-6 text-center animate-in fade-in duration-200">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center mb-4 sm:mb-5">
            <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-blue-400" />
            <MapPin className="w-4 h-4 text-blue-300 absolute" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
            Menunggu Titik Lokasi GPS...
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-5 leading-relaxed">
            Presensi kehadiran mewajibkan verifikasi lokasi berada di lingkungan
            SMKN 21 Jakarta. Pastikan GPS perangkat Anda aktif dan izinkan akses
            lokasi pada browser.
          </p>

          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-blue-950/70 border border-blue-800/70 text-blue-300 text-xs font-semibold mb-6 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
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

      {/* 7B. Geofence Lock Screen Overlay (Jika di luar radius 10m atau sensor GPS error) */}
      {isGpsBlocked && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center text-white z-40 p-4 sm:p-6 text-center animate-in fade-in duration-300 overflow-y-auto max-h-screen py-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mb-4 sm:mb-5">
            <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
            {geoState.error
              ? "Akses Lokasi GPS Diperlukan"
              : "Di Luar Lingkungan SMKN 21"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-4 leading-relaxed">
            Presensi biometrik wajah hanya dapat dilakukan saat Anda berada di
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
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/25 cursor-pointer"
            >
              <span>Cek GPS Ulang</span>
            </button>

            <Link
              to="/izin"
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-amber-500/25"
            >
              <span>Ajukan Izin / Sakit</span>
            </Link>

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
            captureAndVerify();
          }}
          disabled={loading || !isGpsValid || !isLiveVerified}
          className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 font-bold text-white transition-all flex items-center gap-2 sm:gap-2.5 shadow-2xl shadow-blue-500/40 active:scale-95 disabled:opacity-50 backdrop-blur-md border border-white/20 text-xs sm:text-sm cursor-pointer disabled:cursor-not-allowed"
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
    </div>
  );
}
