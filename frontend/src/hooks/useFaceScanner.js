import { useState, useRef, useCallback, useEffect } from "react";
import api from "../services/api";

/**
 * Custom Hook untuk mengelola audio synthesizer feedback presensi (Beep Sukses / Gagal)
 * tanpa memerlukan file audio eksternal.
 */
export function useAudioFeedback() {
  const playSound = useCallback((type = "success") => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        // Nada ceria dua nada (D5 -> A5)
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      } else {
        // Nada peringatan turun (E4 -> C4)
        osc.frequency.setValueAtTime(329.63, ctx.currentTime);
        osc.frequency.setValueAtTime(261.63, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {
      // AudioContext dibungkam jika browser membatasi autoplay
    }
  }, []);

  return { playSound };
}

/**
 * Mengompresi dan mengambil frame webcam ringan (320px) untuk inferensi cepat tanpa lag.
 */
export function getOptimizedWebcamFrame(
  webcamRef,
  width = 320,
  quality = 0.65,
) {
  if (!webcamRef?.current?.video) return null;
  const video = webcamRef.current.video;
  if (video.readyState < 2 || !video.videoWidth) return null;

  const canvas = document.createElement("canvas");
  const scale = width / video.videoWidth;
  canvas.width = width;
  canvas.height = Math.round(video.videoHeight * scale);

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Custom Hook untuk Liveness Detection adaptif (deteksi kedipan mata alami).
 */
export function useLivenessDetector({
  webcamRef,
  isActive = true,
  onLiveVerified,
  pollIntervalMs = 600,
}) {
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [eyeState, setEyeState] = useState("UNKNOWN");
  const [isLiveVerified, setIsLiveVerified] = useState(false);

  const blinkCycleRef = useRef({ hasBeenOpen: false, hasClosed: false });
  const baselineOpenScoreRef = useRef(null);
  const openSamplesRef = useRef([]);
  const isCheckingRef = useRef(false);

  const checkLivenessFrame = useCallback(async () => {
    if (
      !webcamRef?.current ||
      isCheckingRef.current ||
      isLiveVerified ||
      !isActive
    )
      return;

    const frameData = getOptimizedWebcamFrame(webcamRef, 320, 0.65);
    if (!frameData) return;

    isCheckingRef.current = true;
    try {
      const res = await api.post(
        "/detect_liveness",
        { image: frameData },
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
          if (onLiveVerified) onLiveVerified();
        }
      } else if (isEyeClosed) {
        setEyeState("CLOSED");
        if (blinkCycleRef.current.hasBeenOpen) {
          blinkCycleRef.current.hasClosed = true;
        }
      }
    } catch {
      // Abaikan kegagalan jaringan sesaat
    } finally {
      isCheckingRef.current = false;
    }
  }, [webcamRef, isActive, isLiveVerified, onLiveVerified]);

  // Polling terkendali berjarak aman (Sequential Async Loop)
  useEffect(() => {
    let isMounted = true;
    let timerId = null;

    if (!isActive || isLiveVerified) {
      if (!isLiveVerified) {
        setIsFaceDetected(false);
        setEyeState("UNKNOWN");
      }
      return;
    }

    const runLoop = async () => {
      if (!isMounted) return;
      if (isActive && !isLiveVerified) {
        await checkLivenessFrame();
      }
      if (isMounted && !isLiveVerified) {
        timerId = setTimeout(runLoop, pollIntervalMs);
      }
    };

    runLoop();

    return () => {
      isMounted = false;
      isCheckingRef.current = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [isActive, isLiveVerified, checkLivenessFrame, pollIntervalMs]);

  const resetLiveness = useCallback(() => {
    setIsLiveVerified(false);
    setIsFaceDetected(false);
    setEyeState("UNKNOWN");
    blinkCycleRef.current = { hasBeenOpen: false, hasClosed: false };
    baselineOpenScoreRef.current = null;
    openSamplesRef.current = [];
    isCheckingRef.current = false;
  }, []);

  return {
    isFaceDetected,
    eyeState,
    isLiveVerified,
    resetLiveness,
  };
}
