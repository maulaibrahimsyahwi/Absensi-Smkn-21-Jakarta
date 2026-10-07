import React, { useEffect, useId, useRef, useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import Button from "./Button";
import Sheet, { SheetBody, SheetHeader } from "./Sheet";
import { useMediaQuery } from "../../hooks/useMediaQuery";

export const EXPORT_FORMATS = {
  pdf: {
    format: "pdf",
    label: "Dokumen PDF",
    ext: ".pdf",
    hint: "Siap cetak dengan KOP sekolah",
    icon: <FileText className="h-4 w-4" />,
    tone: "bg-rose-50 text-rose-600",
  },
  xlsx: {
    format: "xlsx",
    label: "Microsoft Excel",
    ext: ".xlsx",
    hint: "Spreadsheet modern",
    icon: <FileSpreadsheet className="h-4 w-4" />,
    tone: "bg-emerald-50 text-emerald-600",
  },
  xls: {
    format: "xls",
    label: "Excel 97-2003",
    ext: ".xls",
    hint: "Untuk aplikasi lama",
    icon: <FileSpreadsheet className="h-4 w-4" />,
    tone: "bg-slate-100 text-slate-600",
  },
  csv: {
    format: "csv",
    label: "File CSV",
    ext: ".csv",
    hint: "Untuk diolah di aplikasi lain",
    icon: <Download className="h-4 w-4" />,
    tone: "bg-blue-50 text-blue-600",
  },
} as const;

export interface ExportOption<F extends string> {
  format: F;
  label: string;
  ext: string;
  hint?: string;
  icon: React.ReactNode;
  tone: string;
}

interface ExportMenuProps<F extends string> {
  title: string;
  subtitle?: string;
  options: readonly ExportOption<F>[];
  onSelect: (format: F) => void;
  className?: string;
}

export default function ExportMenu<F extends string>({
  title,
  subtitle,
  options,
  onSelect,
  className = "",
}: ExportMenuProps<F>) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open || isMobile) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, isMobile]);

  const list = (
    <ul role="menu" className="space-y-1 p-1.5 list-none m-0">
      {options.map((o) => (
        <li key={o.format} role="none">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSelect(o.format);
            }}
            className="press flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-slate-50 transition-colors cursor-pointer select-none"
          >
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${o.tone}`}
            >
              {o.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-900">
                {o.label}
              </span>
              {o.hint && (
                <span className="block text-xs text-slate-500">{o.hint}</span>
              )}
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              {o.ext}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div ref={ref} className={`relative ${className}`}>
      <Button
        variant="outline"
        className="w-full"
        aria-haspopup="menu"
        aria-expanded={open}
        icon={<Download className="h-4 w-4" />}
        onClick={() => setOpen((o) => !o)}
      >
        Unduh rekap
      </Button>

      {isMobile ? (
        <Sheet
          isOpen={open}
          onClose={() => setOpen(false)}
          size="sm"
          labelledBy={titleId}
        >
          <SheetHeader
            id={titleId}
            title={title}
            subtitle={subtitle}
            onClose={() => setOpen(false)}
          />
          <SheetBody>{list}</SheetBody>
        </Sheet>
      ) : (
        open && (
          <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-100">
            {subtitle && (
              <p className="border-b border-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-600">
                {subtitle}
              </p>
            )}
            {list}
          </div>
        )
      )}
    </div>
  );
}
