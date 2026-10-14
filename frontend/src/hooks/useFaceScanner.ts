import { useState, useRef, useCallback, useEffect, RefObject } from "react";
import api from "../services/api";

let sharedAudioCtx: AudioContext | null = null;
const getAudioCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  sharedAudioCtx ??= new Ctor();
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
};

/**
 * Custom Hook untuk mengelola audio synthesizer feedback presensi (Beep Sukses / Gagal)
 * menggunakan AudioContext tunggal bersama untuk mencegah batas browser audio context.
 */
export function useAudioFeedback() {
  const playSound = useCallback(
    (
      type: "success" | "warning" | "shutter" | "late" | "error" | string = "success",
    ) => {
      try {
        const ctx = getAudioCtx();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch {
            // ignore
          }
        };

        const now = ctx.currentTime;
        if (type === "shutter") {
          // Nada jepretan shutter kamera tajam (C6: 1046.5 Hz, ~80ms)
          osc.type = "sine";
          osc.frequency.setValueAtTime(1046.5, now);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
        } else if (type === "success") {
          // Nada ceria dua nada (D5 -> A5)
          osc.type = "sine";
          osc.frequency.setValueAtTime(587.33, now);
          osc.frequency.setValueAtTime(880.0, now + 0.1);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
        } else if (type === "late") {
          // Nada peringatan terlambat (A4: 440 Hz datar, ~250ms)
          osc.type = "triangle";
          osc.frequency.setValueAtTime(440.0, now);
          gain.gain.setValueAtTime(0.28, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.25);
        } else if (type === "error") {
          // Nada kegagalan turun (E4 -> A3: 329.63 -> 220 Hz)
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(329.63, now);
          osc.frequency.setValueAtTime(220.0, now + 0.12);
          gain.gain.setValueAtTime(0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
          osc.start(now);
          osc.stop(now + 0.32);
        } else {
          // Nada peringatan default (E4 -> C4)
          osc.type = "sine";
          osc.frequency.setValueAtTime(329.63, now);
          osc.frequency.setValueAtTime(261.63, now + 0.12);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
        }
      } catch {
        // AudioContext dibungkam jika browser membatasi autoplay
      }
    },
    [],
  );

  return { playSound };
}

export interface WebcamRefLike {
  video?: HTMLVideoElement | null;
}

/**
 * Mengompresi dan mengambil frame webcam ringan (320px) untuk inferensi cepat tanpa lag.
 */
export function getOptimizedWebcamFrame(
  webcamRef?: RefObject<WebcamRefLike | null> | { current: WebcamRefLike | null } | null,
  width = 320,
  quality = 0.65,
): string | null {
  if (!webcamRef?.current?.video) return null;
  const video = webcamRef.current.video;
  if (video.readyState < 2 || !video.videoWidth) return null;

  const canvas = document.createElement("canvas");
  const scale = width / video.videoWidth;
  canvas.width = width;
  canvas.height = Math.round(video.videoHeight * scale);

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

export interface UseLivenessDetectorProps {
  webcamRef: RefObject<WebcamRefLike | null> | { current: WebcamRefLike | null } | null;
  isActive?: boolean;
  onLiveVerified?: (token?: string | null) => void;
  pollIntervalMs?: number;
}

/**
 * Custom Hook untuk Liveness Detection adaptif (deteksi kedipan mata alami).
 */
export function useLivenessDetector({
  webcamRef,
  isActive = true,
  onLiveVerified,
  pollIntervalMs = 250,
}: UseLivenessDetectorProps) {
  const [isFaceDetected, setIsFaceDetected] = useState<boolean>(false);
  const [eyeState, setEyeState] = useState<"UNKNOWN" | "OPEN" | "CLOSED">("UNKNOWN");
  const [isLiveVerified, setIsLiveVerified] = useState<boolean>(false);
  const [livenessToken, setLivenessToken] = useState<string | null>(null);
  const [isOfflineFallback, setIsOfflineFallback] = useState<boolean>(false);

  const onVerifiedRef = useRef(onLiveVerified);
  useEffect(() => {
    onVerifiedRef.current = onLiveVerified;
  });
  const isLiveVerifiedRef = useRef(false);
  const isActiveRef = useRef(isActive);
  useEffect(() => {
    isActiveRef.current = isActive;
  });

  const blinkCycleRef = useRef<{ hasBeenOpen: boolean; hasClosed: boolean }>({
    hasBeenOpen: false,
    hasClosed: false,
  });
  const baselineOpenScoreRef = useRef<number | null>(null);
  const openSamplesRef = useRef<number[]>([]);
  const isCheckingRef = useRef<boolean>(false);
  const noFaceCountRef = useRef<number>(0);
  const livenessTokenRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const networkFailCountRef = useRef<number>(0);
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkLivenessFrame = useCallback(async () => {
    if (
      !webcamRef?.current ||
      isCheckingRef.current ||
      isLiveVerifiedRef.current ||
      !isActiveRef.current ||
      document.hidden
    )
      return;

    // Deteksi Mode Offline: Jika koneksi mati atau server gagal berturut-turut, jalankan offline fallback
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    if (isOffline || networkFailCountRef.current >= 2) {
      setIsOfflineFallback(true);
      setIsFaceDetected(true);
      setEyeState("OPEN");
      if (!offlineTimerRef.current && !isLiveVerifiedRef.current) {
        offlineTimerRef.current = setTimeout(() => {
          if (!isLiveVerifiedRef.current && isActiveRef.current) {
            const fallbackToken = "OFFLINE_FALLBACK_TOKEN";
            livenessTokenRef.current = fallbackToken;
            setLivenessToken(fallbackToken);
            isLiveVerifiedRef.current = true;
            setIsLiveVerified(true);
            onVerifiedRef.current?.(fallbackToken);
          }
        }, 1200);
      }
      return;
    }

    const frameData = getOptimizedWebcamFrame(webcamRef, 320, 0.65);
    if (!frameData) return;

    // Batalkan request sebelumnya jika server belum selesai merespons
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    isCheckingRef.current = true;
    try {
      const res = await api.post(
        "/detect_liveness",
        { image: frameData },
        { timeout: 2500, signal: abortControllerRef.current.signal },
      );
      const data = res.data;

      // Jaringan sehat, reset counter kegagalan
      networkFailCountRef.current = 0;
      setIsOfflineFallback(false);

      // Simpan token verifikasi jika server telah memvalidasi kedipan aktif
      if (data.liveness_token) {
        livenessTokenRef.current = data.liveness_token;
        setLivenessToken(data.liveness_token);
      }

      if (!data.face_detected) {
        setIsFaceDetected(false);
        setEyeState("UNKNOWN");
        blinkCycleRef.current = { hasBeenOpen: false, hasClosed: false };
        baselineOpenScoreRef.current = null;
        openSamplesRef.current = [];
        noFaceCountRef.current += 1;
        return;
      }

      noFaceCountRef.current = 0;
      setIsFaceDetected(true);
      const score = Number(data.openness_score || 0);

      const isClosedAbs = data.eye_state === "CLOSED" || score < 11.5;
      const isClosedRel =
        baselineOpenScoreRef.current !== null &&
        score < baselineOpenScoreRef.current * 0.72;
      const isEyeClosed = isClosedAbs || isClosedRel;

      const isOpenAbs = data.eye_state === "OPEN" && score >= 11.5;
      const isOpenRel =
        baselineOpenScoreRef.current !== null &&
        score >= baselineOpenScoreRef.current * 0.85;
      const isEyeOpen = isOpenAbs || isOpenRel;

      if (isEyeOpen && !isEyeClosed) {
        setEyeState("OPEN");
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
          // Pastikan callback verifikasi hanya dipicu saat token liveness resmi dari server sudah tersedia
          const verifiedToken = data.liveness_token || livenessTokenRef.current;
          if (verifiedToken) {
            isLiveVerifiedRef.current = true;
            setIsLiveVerified(true);
            onVerifiedRef.current?.(verifiedToken);
          }
        }
      } else if (isEyeClosed) {
        setEyeState("CLOSED");
        if (blinkCycleRef.current.hasBeenOpen) {
          blinkCycleRef.current.hasClosed = true;
        }
      }
    } catch (err: unknown) {
      const errorName = (err as { name?: string })?.name;
      if (errorName !== "CanceledError" && errorName !== "AbortError") {
        networkFailCountRef.current += 1;
        if (networkFailCountRef.current >= 2) {
          // Masuk ke Mode Offline Fallback setelah 2x kegagalan jaringan/server
          setIsOfflineFallback(true);
          setIsFaceDetected(true);
          setEyeState("OPEN");
          if (!offlineTimerRef.current && !isLiveVerifiedRef.current) {
            offlineTimerRef.current = setTimeout(() => {
              if (!isLiveVerifiedRef.current && isActiveRef.current) {
                const fallbackToken = "OFFLINE_FALLBACK_TOKEN";
                livenessTokenRef.current = fallbackToken;
                setLivenessToken(fallbackToken);
                isLiveVerifiedRef.current = true;
                setIsLiveVerified(true);
                onVerifiedRef.current?.(fallbackToken);
              }
            }, 1200);
          }
        }
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, [webcamRef]);

  // Polling terkendali berjarak aman & adaptif
  useEffect(() => {
    let isMounted = true;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    if (!isActive || isLiveVerified) {
      if (!isLiveVerified) {
        setIsFaceDetected(false);
        setEyeState("UNKNOWN");
        noFaceCountRef.current = 0;
      }
      return;
    }

    const runLoop = async () => {
      if (!isMounted) return;
      if (isActiveRef.current && !isLiveVerifiedRef.current && !document.hidden) {
        await checkLivenessFrame();
      }
      if (isMounted && !isLiveVerifiedRef.current) {
        const currentDelay =
          noFaceCountRef.current > 2
            ? Math.max(pollIntervalMs, 800)
            : pollIntervalMs;
        timerId = setTimeout(runLoop, currentDelay);
      }
    };

    runLoop();

    const handleVisibilityChange = () => {
      if (!document.hidden && isActiveRef.current && !isLiveVerifiedRef.current) {
        runLoop();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      abortControllerRef.current?.abort();
      if (offlineTimerRef.current) {
        clearTimeout(offlineTimerRef.current);
        offlineTimerRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (timerId) clearTimeout(timerId);
    };
  }, [isActive, isLiveVerified, checkLivenessFrame, pollIntervalMs]);

  const resetLiveness = useCallback(() => {
    isLiveVerifiedRef.current = false;
    abortControllerRef.current?.abort();
    if (offlineTimerRef.current) {
      clearTimeout(offlineTimerRef.current);
      offlineTimerRef.current = null;
    }
    networkFailCountRef.current = 0;
    setIsOfflineFallback(false);
    noFaceCountRef.current = 0;
    setIsLiveVerified(false);
    setIsFaceDetected(false);
    setEyeState("UNKNOWN");
    setLivenessToken(null);
    livenessTokenRef.current = null;
    blinkCycleRef.current = { hasBeenOpen: false, hasClosed: false };
    baselineOpenScoreRef.current = null;
    openSamplesRef.current = [];
    isCheckingRef.current = false;
  }, []);

  return {
    isFaceDetected,
    eyeState,
    isLiveVerified,
    livenessToken,
    isOfflineFallback,
    resetLiveness,
  };
}
