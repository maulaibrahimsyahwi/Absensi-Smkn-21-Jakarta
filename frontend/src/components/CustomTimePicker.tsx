import React from "react";
import { Clock } from "lucide-react";
import { INPUT_CLASS } from "./ui/Field";

export interface CustomTimePickerProps {
  value?: string;
  onChange?: (timeStr: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  accentColor?: "blue" | "rose" | "emerald";
  min?: string;
  max?: string;
  presets?: { label: string; time: string }[];
}

const DEFAULT_PRESETS = [
  { label: "Masuk", time: "06:30" },
  { label: "KBM", time: "07:00" },
  { label: "Istirahat 1", time: "09:45" },
  { label: "Istirahat 2", time: "12:00" },
  { label: "Pulang", time: "15:00" },
];

export default function CustomTimePicker({
  value = "",
  onChange,
  className = "",
  disabled = false,
  min = "05:00",
  max = "18:00",
  presets = DEFAULT_PRESETS,
}: CustomTimePickerProps) {
  const error =
    value && (value < min || value > max)
      ? `Jam harus antara ${min} dan ${max} WIB.`
      : "";

  return (
    <div className={className}>
      <div className="relative">
        <Clock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="time"
          value={value}
          min={min}
          max={max}
          step={60}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          onChange={(e) => onChange?.(e.target.value)}
          className={`${INPUT_CLASS} pl-10 font-mono`}
        />
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
