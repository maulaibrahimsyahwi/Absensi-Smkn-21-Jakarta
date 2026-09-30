import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, RotateCcw, PenLine } from "lucide-react";

export interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (base64PNG: string) => void;
  title?: string;
  subtitle?: string;
  description?: string;
  signerName?: string;
  initialSignature?: string | null;
  initialImage?: string | null;
}

/**
 * Komponen Modal Canvas Tanda Tangan Digital responsif.
 * Mendukung input sentuhan layar smartphone (Touch) dan mouse komputer (Desktop).
 */
export default function SignaturePadModal({
  isOpen,
  onClose,
  onSave,
  title = "Tanda Tangan Digital",
  subtitle = "Goreskan tanda tangan Anda pada area kotak di bawah ini menggunakan jari atau mouse.",
  description,
  signerName,
  initialSignature = null,
  initialImage = null,
}: SignaturePadModalProps): React.JSX.Element | null {
  const effectiveSubtitle = description || subtitle || (signerName ? `Tanda tangan digital untuk ${signerName}` : undefined);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const startingSignature = initialSignature || initialImage;

  useEffect(() => {
    if (!isOpen) return;

    // Inisialisasi ukuran canvas sesuai resolusi tampilan layar retina / high-DPI
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);

      ctx.strokeStyle = "#0f172a"; // Warna tinta: Slate 900
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Jika ada startingSignature, render ke canvas
      if (startingSignature) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          setHasDrawn(true);
        };
        img.src = startingSignature;
      } else {
        setHasDrawn(false);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, startingSignature]);

  if (!isOpen) return null;

  // Helper untuk mendapatkan koordinat relatif terhadap canvas
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e && e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    const mouseEvent = e as React.MouseEvent<HTMLCanvasElement>;
    return {
      x: mouseEvent.clientX - rect.left,
      y: mouseEvent.clientY - rect.top,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if ("touches" in e && e.touches) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawing) return;
    if ("touches" in e && e.touches) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = (
    e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (e && "touches" in e && e.touches) e.preventDefault();
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
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
              <p className="text-xs text-slate-500 line-clamp-1">{effectiveSubtitle}</p>
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
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Bersihkan</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 min-h-[40px] text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer active:scale-95"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasDrawn}
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm shadow-blue-600/30 cursor-pointer active:scale-95"
            >
              <span>Simpan TTD</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
