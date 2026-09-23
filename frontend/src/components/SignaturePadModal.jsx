import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, RotateCcw, Check, PenLine, ShieldCheck } from "lucide-react";

/**
 * Komponen Modal Canvas Tanda Tangan Digital responsif.
 * Mendukung input sentuhan layar smartphone (Touch) dan mouse komputer (Desktop).
 *
 * @param {boolean} isOpen Status terbuka/tutup modal
 * @param {function} onClose Handler saat modal ditutup
 * @param {function} onSave Handler callback saat tanda tangan disimpan: (base64PNG) => void
 * @param {string} title Judul modal (misal: 'Tanda Tangan Guru Piket')
 * @param {string} initialSignature Tanda tangan sebelumnya (jika ada)
 */
export default function SignaturePadModal({
  isOpen,
  onClose,
  onSave,
  title = "Tanda Tangan Digital",
  subtitle = "Goreskan tanda tangan Anda pada area kotak di bawah ini menggunakan jari atau mouse.",
  initialSignature = null,
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Inisialisasi ukuran canvas sesuai resolusi tampilan layar retina / high-DPI
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);

      ctx.strokeStyle = "#0f172a"; // Warna tinta: Slate 900
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Jika ada initialSignature, render ke canvas
      if (initialSignature) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          setHasDrawn(true);
        };
        img.src = initialSignature;
      } else {
        setHasDrawn(false);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, initialSignature]);

  if (!isOpen) return null;

  // Helper untuk mendapatkan koordinat relatif terhadap canvas
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
    if (e.touches) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    if (e.touches) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = (e) => {
    if (e && e.touches) e.preventDefault();
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const base64PNG = canvas.toDataURL("image/png");
    onSave(base64PNG);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
              <PenLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">{title}</h3>
              <p className="text-xs text-slate-500 line-clamp-1">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="p-5 flex flex-col items-center">
          <div className="w-full relative rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 overflow-hidden touch-none">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-48 cursor-crosshair block"
            />
            {/* Garis Dasar Tanda Tangan */}
            <div className="absolute bottom-6 left-6 right-6 border-b border-slate-300/80 pointer-events-none flex justify-between text-[10px] text-slate-400 font-medium select-none">
              <span>Garis tanda tangan</span>
              <span>SMKN 21 Jakarta</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-2 text-center">
            Goreskan tanda tangan Anda dengan rapi di atas garis dasar
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Bersihkan</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasDrawn}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm shadow-blue-600/30 cursor-pointer"
            >
              <span>Simpan TTD </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
