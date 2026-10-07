import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const openSheets: object[] = [];
let lockCount = 0;

const SIZE = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-3xl",
  xl: "sm:max-w-5xl",
} as const;

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  labelledBy?: string;
  size?: keyof typeof SIZE;
  widthClass?: string; // misal: "max-w-lg", menggantikan size
  closeOnBackdrop?: boolean; // default true
  tall?: boolean; // Setinggi layar di HP, cocok untuk modal form / tabel kalender
  children: React.ReactNode;
}

export default function Sheet({
  isOpen,
  onClose,
  labelledBy,
  size = "md",
  widthClass,
  closeOnBackdrop = true,
  tall = false,
  children,
}: SheetProps): React.JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose; // Mencegah onClose inline memicu re-attach effect

  useEffect(() => {
    if (!isOpen) return;
    const token = {};
    openSheets.push(token);
    if (lockCount++ === 0) {
      document.body.style.overflow = "hidden";
    }

    // Modal bersarang: hanya sheet paling atas yang merespons tombol Escape
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openSheets[openSheets.length - 1] === token) {
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onKey);
      const idx = openSheets.indexOf(token);
      if (idx !== -1) {
        openSheets.splice(idx, 1);
      }
      if (--lockCount === 0) {
        document.body.style.overflow = "";
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4"
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={closeOnBackdrop ? onClose : undefined}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      />

      {/* Sheet Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative flex w-full flex-col overflow-hidden rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl outline-hidden animate-in slide-in-from-bottom duration-300 ease-out-expo sm:h-auto sm:max-h-[90dvh] sm:rounded-3xl sm:pb-0 sm:slide-in-from-bottom-2 sm:zoom-in-95 ${
          tall ? "h-[92dvh]" : "max-h-[92dvh]"
        } ${widthClass ?? SIZE[size]}`}
      >
        {/* Handle Bar Drag Indicator khusus smartphone */}
        <div
          aria-hidden="true"
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-300 sm:hidden"
        />
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function SheetHeader({
  id,
  title,
  subtitle,
  icon,
  className = "",
  onClose,
  hideClose = false,
}: {
  id?: string;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  onClose: () => void;
  hideClose?: boolean;
}) {
  return (
    <div
      className={`flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-3 sm:p-5 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon && <div className="shrink-0">{icon}</div>}
        <div className="min-w-0">
          {title && (
            <h3 id={id} className="text-base font-bold text-slate-900 truncate">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {!hideClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="press grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

export function SheetBody({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-h-0 flex-1 overflow-y-auto px-5 pb-5 ${className}`}>
      {children}
    </div>
  );
}

export function SheetFooter({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid shrink-0 grid-cols-2 gap-2 border-t border-slate-100 bg-white px-5 py-3 sm:flex sm:justify-end ${className}`}
    >
      {children}
    </div>
  );
}
