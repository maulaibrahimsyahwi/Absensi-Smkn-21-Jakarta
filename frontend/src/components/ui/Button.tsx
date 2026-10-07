import React from "react";
import { Loader2 } from "lucide-react";

const VARIANT = {
  primary: "bg-blue-600 text-white shadow-xs shadow-blue-600/20 hover:bg-blue-700",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
  dangerSoft: "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  soft: "bg-slate-100 text-slate-700 hover:bg-slate-200",
} as const;

const SIZE = {
  md: "min-h-11 px-4 text-sm",
  sm: "min-h-10 px-3 text-xs lg:min-h-9",
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANT;
  size?: keyof typeof SIZE;
  loading?: boolean;
  icon?: React.ReactNode;
}

export default function Button({
  variant = "soft",
  size = "md",
  loading = false,
  icon,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`press inline-flex items-center justify-center gap-1.5 rounded-xl font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : icon}
      {children}
    </button>
  );
}
