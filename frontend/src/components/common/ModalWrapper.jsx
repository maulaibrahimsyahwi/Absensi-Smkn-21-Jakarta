import React, { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Komponen pembungkus modal dialog standar yang seragam, responsif, dan aksesibel.
 * Menangani klik backdrop, tombol Escape keyboard, dan penguncian scroll layar.
 */
export default function ModalWrapper({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-lg",
  showCloseButton = true,
  closeOnBackdrop = true,
  className = "",
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Kunci scroll halaman saat modal aktif
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`bg-white rounded-3xl shadow-2xl border border-slate-100 w-full ${maxWidth} max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0">
            <div>
              {title && (
                <h3 className="font-bold text-slate-800 text-base sm:text-lg">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup dialog modal"
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Konten Modal dengan vertical scroll */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1">{children}</div>
      </div>
    </div>
  );
}
