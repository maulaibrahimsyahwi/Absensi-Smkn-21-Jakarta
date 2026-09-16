import React, { useRef, useState, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import axios from "axios";
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
} from "lucide-react";
import FaceSilhouetteGuide from "../components/FaceSilhouetteGuide";
import {
  SMKN21_COORDINATES,
  calculateDistanceMeters,
  formatDistance,
  getCurrentLocation,
} from "../utils/geoUtils";

export default function AbsensiHarian() {
  const webcamRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [currentTime, setCurrentTime] = useState("");
  const [countdown, setCountdown] = useState(3); // Countdown 3 detik
  const [isFaceDetected, setIsFaceDetected] = useState(false);

  // GPS Geofence State (Radius 50m SMKN 21)
  const [geoState, setGeoState] = useState({
    loading: true,
    latitude: null,
    longitude: null,
    distanceMeters: null,
    isWithinRadius: false,
    error: null,
    simulated: false,
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
        distanceMeters: dist,
        isWithinRadius: isWithin,
        error: null,
        simulated: false,
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
          distanceMeters: 14,
          error: null,
          latitude: SMKN21_COORDINATES.latitude,
          longitude: SMKN21_COORDINATES.longitude,
        };
      } else {
        checkGeofence();
        return { ...prev, simulated: false };
      }
    });
  };

  const isGeofenceBlocked =
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

  // 1. Deteksi Kehadiran Wajah / Orang di Depan Kamera
  const checkPresence = useCallback(async () => {
    if (!webcamRef.current || loading || result || isGeofenceBlocked) return;

    // Coba deteksi menggunakan browser FaceDetector API jika didukung
    if ("FaceDetector" in window) {
      try {
        const video = webcamRef.current.video;
        if (video && video.readyState >= 2) {
          const detector = new window.FaceDetector({
            fastMode: true,
            maxDetectedFaces: 1,
          });
          const faces = await detector.detect(video);
          setIsFaceDetected(faces.length > 0);
          return;
        }
      } catch (err) {
        // Fallback ke backend jika API browser dinonaktifkan
      }
    }

    // Fallback: Panggil backend ultra-fast detection
    try {
      const screenshot = webcamRef.current.getScreenshot();
      if (!screenshot) return;
      const res = await axios.post("http://localhost:5000/api/detect_face", {
        image: screenshot,
      });
      setIsFaceDetected(Boolean(res.data.face_detected));
    } catch (err) {
      // Jika kendala koneksi deteksi ringan, jangan blokir
    }
  }, [loading, result, isGeofenceBlocked]);

  // Polling deteksi keberadaan orang setiap 1 detik
  useEffect(() => {
    if (loading || result || isGeofenceBlocked) return;
    const interval = setInterval(checkPresence, 1000);
    return () => clearInterval(interval);
  }, [loading, result, isGeofenceBlocked, checkPresence]);

  const captureAndVerify = useCallback(async () => {
    if (isGeofenceBlocked) return;
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
      const response = await axios.post(
        "http://localhost:5000/api/verify_harian",
        {
          image: imageSrc,
        },
      );
      setResult({ success: true, message: response.data.message });
      // Setelah berhasil, beri waktu 4 detik agar terbaca, lalu otomatis siap untuk siswa berikutnya
      setTimeout(() => {
        setResult(null);
        setCountdown(3);
        setIsFaceDetected(false);
      }, 4000);
    } catch (err) {
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
      }, 3000);
    } finally {
      setLoading(false);
    }
  }, [webcamRef, isGeofenceBlocked]);

  // 2. Countdown Timer: HANYA BERJALAN JIKA ADA WAJAH TERDETEKSI (3 Detik)
  useEffect(() => {
    if (loading || result || isGeofenceBlocked) return;

    // JIKA TIDAK ADA ORANG / WAJAH, JANGAN MULAI PINDAI!
    if (!isFaceDetected) {
      setCountdown(3); // Reset waktu ke 3 detik dan tahan
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
    isFaceDetected,
    loading,
    result,
    isGeofenceBlocked,
    captureAndVerify,
  ]);

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

      {/* 2. Efek Garis Laser Scanner */}
      <div className="scanner-line"></div>

      {/* 3. Presisi Siluet Kontur Wajah Manusia (Bukan Hanya Kotak) */}
      <FaceSilhouetteGuide
        isDetected={isFaceDetected}
        theme="blue"
        countdown={countdown}
        loading={loading}
      />

      {/* 4. Top Floating Bar */}
      <div className="absolute top-3 sm:top-4 inset-x-3 sm:inset-x-6 flex items-center justify-between z-20 pointer-events-auto">
        <Link
          to="/"
          title="Kembali ke Beranda"
          aria-label="Kembali ke Beranda"
          className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl text-white bg-black/60 hover:bg-black/80 active:scale-95 backdrop-blur-md border border-white/20 transition-all shadow-lg group"
        >
          <ArrowLeft
            className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:-translate-x-0.5"
            strokeWidth={2.5}
          />
        </Link>

        {/* GPS Geofence Pill */}
        {geoState.loading ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-semibold">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
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
            <span className="hidden sm:inline">Mode Uji: </span>
            <span>SMKN 21 (&le;50m)</span>
          </button>
        ) : geoState.isWithinRadius ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-950/80 backdrop-blur-md border border-emerald-400/50 text-emerald-200 text-xs font-semibold">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
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
          <span className="text-blue-300 font-bold text-[11px] sm:text-xs">
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

      {/* 7. Geofence Lock Screen Overlay (Jika di luar radius 50m) */}
      {isGeofenceBlocked && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center text-white z-40 p-4 sm:p-6 text-center animate-in fade-in duration-300 overflow-y-auto max-h-screen py-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mb-4 sm:mb-5">
            <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
            Di Luar Radius SMKN 21
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-4 leading-relaxed">
            Presensi biometrik wajah hanya dapat dilakukan saat Anda berada di
            lingkungan sekolah SMKN 21 Jakarta
            {geoState.distanceMeters != null && (
              <span className="block mt-2 font-bold text-rose-300 bg-rose-950/60 border border-rose-800/60 rounded-lg py-1.5 px-3">
                Jarak Anda saat ini: ~{formatDistance(geoState.distanceMeters)}{" "}
                dari sekolah
              </span>
            )}
            {geoState.error && (
              <span className="block mt-1 text-amber-300 text-xs">
                Status Sensor: {geoState.error}
              </span>
            )}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-5">
            <button
              onClick={checkGeofence}
              disabled={geoState.loading}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/25 cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 ${geoState.loading ? "animate-spin" : ""}`}
              />
              <span>Cek Ulang GPS</span>
            </button>

            <Link
              to="/izin"
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-amber-500/25"
            >
              <MapPin className="w-4 h-4" />
              <span>Ajukan Izin / Sakit</span>
            </Link>

            <Link
              to="/"
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
                onClick={toggleSimulation}
                className="w-full py-2 px-3 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-indigo-400/40 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 text-indigo-200" />
                <span>Simulasi di SMKN 21 (Radius &le; 50m)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 8. Floating Bottom Button: Pindai Langsung */}
      <div className="absolute bottom-4 sm:bottom-6 inset-x-0 flex justify-center z-20 pointer-events-auto px-4">
        <button
          onClick={() => {
            setResult(null);
            captureAndVerify();
          }}
          disabled={loading || isGeofenceBlocked}
          className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 font-bold text-white transition-all flex items-center gap-2 sm:gap-2.5 shadow-2xl shadow-blue-500/40 active:scale-95 disabled:opacity-50 backdrop-blur-md border border-white/20 text-xs sm:text-sm"
        >
          <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Pindai Langsung</span>
        </button>
      </div>
    </div>
  );
}
