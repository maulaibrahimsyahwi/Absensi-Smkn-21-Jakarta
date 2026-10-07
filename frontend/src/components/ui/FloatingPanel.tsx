import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Pos = {
  left: number;
  width: number;
  maxH: number;
  top?: number;
  bottom?: number;
};

export interface FloatingPanelProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  align?: "left" | "right";
  width?: number | "anchor";
  maxHeight?: number;
  className?: string;
  children: React.ReactNode;
}

export default function FloatingPanel({
  anchorRef,
  open,
  onClose,
  align = "left",
  width = "anchor",
  maxHeight = 320,
  className = "",
  children,
}: FloatingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [pos, setPos] = useState<Pos | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const update = () => {
      const a = anchorRef.current;
      if (!a) return;
      const r = a.getBoundingClientRect();
      const w = width === "anchor" ? Math.max(r.width, 220) : width;
      const below = window.innerHeight - r.bottom - 12;
      const above = r.top - 12;
      const up = below < 220 && above > below;
      const maxH = Math.max(160, Math.min(maxHeight, up ? above : below));
      const left = Math.min(
        Math.max(8, align === "right" ? r.right - w : r.left),
        window.innerWidth - w - 8,
      );
      setPos(
        up
          ? { left, width: w, maxH, bottom: window.innerHeight - r.top + 6 }
          : { left, width: w, maxH, top: r.bottom + 6 },
      );
    };
    const onScroll = (e: Event) => {
      if (!panelRef.current?.contains(e.target as Node)) update();
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, anchorRef, align, width, maxHeight]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      closeRef.current();
    };
    // capture + stopPropagation: Escape hanya menutup popover, bukan Sheet di belakangnya
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, anchorRef]);

  if (!open || !pos) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        left: pos.left,
        width: pos.width,
        top: pos.top,
        bottom: pos.bottom,
        maxHeight: pos.maxH,
      }}
      className={`z-[75] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-100 ${className}`}
    >
      {children}
    </div>,
    document.body,
  );
}
