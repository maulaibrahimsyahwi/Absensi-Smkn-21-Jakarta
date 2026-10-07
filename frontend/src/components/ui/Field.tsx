import React from "react";

export const INPUT_CLASS =
  "w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400 transition-colors";

export interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export default function Field({
  label,
  required = false,
  hint,
  error,
  className = "",
  children,
}: FieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-xs font-bold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500 leading-relaxed">{hint}</p>}
      {error && <p role="alert" className="text-xs font-medium text-rose-600 leading-relaxed">{error}</p>}
    </div>
  );
}
