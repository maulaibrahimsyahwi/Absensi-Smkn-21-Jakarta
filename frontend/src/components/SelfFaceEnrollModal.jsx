import React, { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Webcam from "react-webcam";
import api from "../services/api";
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Trash2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

/**
 * SelfFaceEnrollModal
 * Modal mandiri bagi siswa untuk mendaftarkan / memperbarui 3 sampel biometrik wajah mereka
 * langsung dari Portal Siswa tanpa membuka atau mengakses master data siswa di RegistrasiSiswa (Admin Only).
 */
export default function SelfFaceEnrollModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}) {
  const webcamRef = useRef(null);
  const [samples, setSamples] = useState([]);
  const [currentSlot, setCurrentSlot] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const slotGuides = [
    "1. Wajah Tampak Depan (Tatap Lurus Kamera)",
    "2. Sedikit Miring Kiri atau Tersenyum Ringan",
    "3. Sedikit Miring Kanan atau Variasi Ekspresi",
  ];

  // Ambil foto untuk slot aktif
  const takeSamplePhoto = useCallback(() => {
    if (!webcamRef.current) return;
    const screenshot = webcamRef.current.getScreenshot();
    if (screenshot) {
      setErrorMessage("");
      const newSamples = [...samples];
      newSamples[currentSlot] = screenshot;
      setSamples(newSamples);

      // Pindah ke slot berikutnya otomatis jika masih di bawah 2
      if (currentSlot < 2) {
        setCurrentSlot(currentSlot + 1);
      }
    }
  }, [webcamRef, currentSlot, samples]);

  const removeSample = (idx, e) => {
    e.stopPropagation();
    const newSamples = samples.filter((_, i) => i !== idx);
    setSamples(newSamples);
    setCurrentSlot(newSamples.length);
  };

  const handleSave = async () => {
    if (samples.length === 0) {
      setErrorMessage(
        "Harap ambil minimal 1 foto sampel wajah Anda sebelum menyimpan!",
      );
      return;
    }

    if (!user || !user.id) {
      setErrorMessage("Sesi pengguna tidak valid. Silakan login ulang.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const res = await api.post("/register_face", {
        siswa_id: user.id,
        images: samples,
      });

      if (res.data && res.data.success) {
        if (onSuccess) {
          onSuccess(res.data.message || "Biometrik wajah berhasil disimpan!");
        }
        handleClose();
      } else {
        setErrorMessage(
          res.data?.message || "Gagal menyimpan biometrik wajah.",
        );
      }
    } catch (err) {
      console.error("Gagal registrasi biometrik wajah:", err);
      setErrorMessage(
        err.response?.data?.message ||
          "Gagal memproses wajah. Pastikan wajah terlihat jelas tanpa masker dan cukup cahaya.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSamples([]);
    setCurrentSlot(0);
    setErrorMessage("");
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Perekaman Biometrik Wajah Mandiri
              </h2>
              <p className="text-[11px] text-slate-500">
                {user?.nama || "Siswa"} • NIS: {user?.nis || "-"} • Kelas:{" "}
                {user?.kelas || "-"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Area Kamera Webcam */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700">
                Lensa Kamera Selfie
              </span>
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                Sampel #{currentSlot + 1} dari 3
              </span>
            </div>

            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  facingMode: "user",
                  width: 640,
                  height: 480,
                }}
                className="w-full h-full object-cover"
              />

              {/* Face Guide Box Overlay */}
              <div className="absolute inset-8 sm:inset-10 border-2 border-dashed border-white/40 rounded-3xl pointer-events-none flex flex-col justify-between">
                <div className="flex justify-between p-2">
                  <div className="w-5 h-5 border-t-2 border-l-2 border-blue-400 rounded-tl-lg"></div>
                  <div className="w-5 h-5 border-t-2 border-r-2 border-blue-400 rounded-tr-lg"></div>
                </div>
                <div className="flex justify-between p-2">
                  <div className="w-5 h-5 border-b-2 border-l-2 border-blue-400 rounded-bl-lg"></div>
                  <div className="w-5 h-5 border-b-2 border-r-2 border-blue-400 rounded-br-lg"></div>
                </div>
              </div>

              {/* Guide Hint Text */}
              <div className="absolute bottom-2.5 inset-x-2 text-center pointer-events-none">
                <span className="bg-black/75 backdrop-blur-xs text-slate-200 text-[11px] font-medium px-3 py-1 rounded-full border border-white/10 shadow-sm inline-block max-w-full truncate">
                  {slotGuides[currentSlot]}
                </span>
              </div>
            </div>

            {/* Tombol Ambil Foto */}
            <button
              type="button"
              onClick={takeSamplePhoto}
              className="w-full mt-2.5 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Ambil Foto Sampel {currentSlot + 1}</span>
            </button>
          </div>

          {/* 3 Slot Sampel Wajah */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">
                Koleksi Sampel ({samples.length}/3)
              </span>
              <span className="text-[10px] text-slate-400">
                Klik kartu foto untuk memotret ulang
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[0, 1, 2].map((idx) => {
                const photo = samples[idx];
                const isCurrent = currentSlot === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => setCurrentSlot(idx)}
                    className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 cursor-pointer transition-all flex flex-col items-center justify-center p-1 ${
                      isCurrent
                        ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50"
                        : photo
                          ? "border-emerald-400 bg-white"
                          : "border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    {photo ? (
                      <>
                        <img
                          src={photo}
                          alt={`Sampel ${idx + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={(e) => removeSample(idx, e)}
                          className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-md transition-colors"
                          title="Hapus sampel"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-1 inset-x-1 text-center pointer-events-none">
                          <span className="bg-emerald-700/85 text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow-2xs">
                            Sampel {idx + 1}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-2">
                        <Camera className="w-4 h-4 text-slate-300 mx-auto mb-1" />
                        <span className="text-[10px] text-slate-400 font-medium block">
                          Slot {idx + 1}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] text-blue-600 font-bold block mt-0.5">
                            Aktif
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-blue-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Petunjuk Biometrik Presensi
            </p>
            <p className="text-slate-600 leading-relaxed">
              Kumpulkan 3 sampel dengan variasi sudut alami agar kamera presensi
              harian sekolah dapat mengenali wajah Anda secara akurat dan cepat.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting || samples.length === 0}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses Wajah...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Biometrik Wajah</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
