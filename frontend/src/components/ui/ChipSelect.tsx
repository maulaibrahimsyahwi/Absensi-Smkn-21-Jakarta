import React from "react";

export interface ChipSelectProps<T extends string> {
  label?: string;
  value: T;
  onChange: (val: T) => void;
  options: readonly T[] | T[];
  grid?: boolean;
  className?: string;
}

export default function ChipSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  grid = false,
  className = "",
}: ChipSelectProps<T>) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <p className="text-xs font-bold text-slate-700">{label}</p>}
      <div
        className={
          grid
            ? "grid grid-cols-1 sm:grid-cols-2 gap-2"
            : "flex flex-wrap gap-2"
        }
      >
        {options.map((opt) => {
          const isSelected = opt === value;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              aria-pressed={isSelected}
              className={`press min-h-10 text-left rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? "border-blue-600 bg-blue-50/80 text-blue-700 ring-2 ring-blue-600/20 shadow-xs"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
