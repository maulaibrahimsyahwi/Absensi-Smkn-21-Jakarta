import React, { useState, useRef, useEffect, useMemo } from "react";
import { Clock, ChevronDown } from "lucide-react";

export interface CustomTimePickerProps {
  value?: string;
  onChange?: (timeStr: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  accentColor?: "blue" | "rose" | "emerald";
}

/**
 * CustomTimePicker Component
 * Pemilih waktu interaktif bertema SMKN 21 Jakarta.
 */
export default function CustomTimePicker({
  value = "",
  onChange,
  placeholder = "Pilih Waktu...",
  className = "",
  disabled = false,
  accentColor = "blue",
}: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [openUpward, setOpenUpward] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [manualInput, setManualInput] = useState<string>(value || "");

  // Parsing value "HH:MM" (Dibatasi jam sekolah 05:00 s/d 15:00 WIB)
  const parsedTime = useMemo(() => {
    let defaultH = "07";
    let defaultM = "00";
    if (!value || typeof value !== "string" || !value.includes(":")) {
      const now = new Date();
      let nowH = now.getHours();
      let nowM = now.getMinutes();
      if (nowH < 5) {
        nowH = 5;
        nowM = 0;
      } else if (nowH > 15 || (nowH === 15 && nowM > 0)) {
        nowH = 15;
        nowM = 0;
      }
      defaultH = String(nowH).padStart(2, "0");
      defaultM = String(nowM).padStart(2, "0");
      return { hours: defaultH, minutes: defaultM };
    }
    const [h, m] = value.split(":");
    let numH = parseInt(h, 10);
    let numM = parseInt(m, 10);
    if (isNaN(numH) || numH < 5) numH = 5;
    if (numH > 15) numH = 15;
    if (isNaN(numM) || numM < 0) numM = 0;
    if (numM > 59) numM = 59;
    if (numH === 15 && numM > 0) numM = 0;

    return {
      hours: String(numH).padStart(2, "0"),
      minutes: String(numM).padStart(2, "0"),
    };
  }, [value]);

  useEffect(() => {
    setManualInput(value || "");
  }, [value]);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 320 && rect.top > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  const handleApplyPreset = (presetTime: string) => {
    onChange?.(presetTime);
    setIsOpen(false);
  };

  const handleManualInputBlur = () => {
    const cleaned = manualInput.replace(/[^0-9:]/g, "");
    let h = "";
    let m = "";

    if (cleaned.includes(":")) {
      const parts = cleaned.split(":");
      h = parts[0];
      m = parts[1] || "00";
    } else if (cleaned.length === 3) {
      h = cleaned.slice(0, 1);
      m = cleaned.slice(1, 3);
    } else if (cleaned.length === 4) {
      h = cleaned.slice(0, 2);
      m = cleaned.slice(2, 4);
    }

    let numH = parseInt(h, 10);
    let numM = parseInt(m, 10);

    if (isNaN(numH) || numH < 5) numH = 5;
    if (numH > 15) numH = 15;
    if (isNaN(numM) || numM < 0) numM = 0;
    if (numM > 59) numM = 59;
    if (numH === 15 && numM > 0) numM = 0;

    const finalVal = `${String(numH).padStart(2, "0")}:${String(numM).padStart(2, "0")}`;
    onChange?.(finalVal);
    setManualInput(finalVal);
  };

  const schoolPresets = [
    { label: "Pagi", time: "05:30", desc: "05:30" },
    { label: "Masuk", time: "06:30", desc: "06:30" },
    { label: "KBM", time: "07:00", desc: "07:00" },
    { label: "Istirahat 1", time: "09:45", desc: "09:45" },
    { label: "Istirahat 2", time: "12:00", desc: "12:00" },
    { label: "Pulang", time: "15:00", desc: "15:00" },
  ];

  const ringFocusClass =
    accentColor === "rose"
      ? "focus-within:ring-rose-500 focus:ring-rose-500"
      : accentColor === "emerald"
        ? "focus-within:ring-emerald-500 focus:ring-emerald-500"
        : "focus-within:ring-blue-500 focus:ring-blue-500";

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full ${className}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border transition-all text-left cursor-pointer bg-white text-slate-800 ${
          isOpen
            ? `border-blue-500 ring-2 ${ringFocusClass} shadow-xs`
            : "border-slate-200 hover:border-slate-300 shadow-2xs"
        } ${disabled ? "bg-slate-100 opacity-60 cursor-not-allowed" : ""}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Clock
            className={`w-4 h-4 flex-shrink-0 ${
              value
                ? accentColor === "rose"
                  ? "text-rose-600"
                  : "text-blue-600"
                : "text-slate-400"
            }`}
          />
          <div className="min-w-0">
            {value ? (
              <span className="font-bold text-xs sm:text-sm text-slate-900 tracking-wide font-mono">
                {value}{" "}
                <span className="text-[11px] font-semibold text-slate-400 font-sans">
                  WIB
                </span>
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-medium">
                {placeholder}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 z-50 w-full sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-3.5 animate-in fade-in zoom-in-95 duration-150 ${
            openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800">
              Pilih waktu kejadian
            </span>
          </div>

          <div className="mb-3">
            <div className="grid grid-cols-3 gap-1.5">
              {schoolPresets.map((p) => {
                const isSelected = value === p.time;
                return (
                  <button
                    key={p.time}
                    type="button"
                    onClick={() => handleApplyPreset(p.time)}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all border text-center cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80"
                    }`}
                  >
                    <span className="block font-bold">{p.label}</span>
                    <span
                      className={`text-[10px] ${
                        isSelected ? "text-blue-100" : "text-slate-400"
                      }`}
                    >
                      {p.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-1">
              <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                Manual
              </span>
              <input
                type="text"
                maxLength={5}
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onBlur={handleManualInputBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleManualInputBlur();
                    setIsOpen(false);
                  }
                }}
                placeholder="07:30"
                className="w-20 text-xs font-mono font-bold px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-center focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                handleManualInputBlur();
                setIsOpen(false);
              }}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
