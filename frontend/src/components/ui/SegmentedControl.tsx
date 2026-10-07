import React from "react";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: SegmentedOption<T>[];
  ariaLabel?: string;
  className?: string;
}

export default function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel = "Pilihan",
  className = "",
}: SegmentedControlProps<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`relative grid rounded-xl bg-slate-100 p-1 select-none ${className}`}
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-lg bg-white shadow-sm transition-transform duration-300 ease-out-expo pointer-events-none"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`relative z-10 flex min-h-10 items-center justify-center gap-1.5 px-3 text-xs font-bold transition-colors cursor-pointer ${
            o.value === value ? "text-blue-700" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>{o.label}</span>
          {typeof o.count === "number" && (
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-extrabold ${
                o.value === value
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-200/80 text-slate-600"
              }`}
            >
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
