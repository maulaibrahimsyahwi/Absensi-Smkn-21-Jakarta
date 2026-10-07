import React from "react";

export interface CalloutProps {
  icon?: React.ReactNode;
  title?: string;
  variant?: "neutral" | "info" | "warning" | "success" | "danger";
  children: React.ReactNode;
  className?: string;
}

export default function Callout({
  icon,
  title,
  variant = "neutral",
  children,
  className = "",
}: CalloutProps) {
  const variantStyles = {
    neutral: "bg-slate-50 border-slate-200 text-slate-700",
    info: "bg-blue-50/60 border-blue-200/80 text-blue-900",
    warning: "bg-amber-50/60 border-amber-200/80 text-amber-900",
    success: "bg-emerald-50/60 border-emerald-200/80 text-emerald-900",
    danger: "bg-rose-50/60 border-rose-200/80 text-rose-900",
  };

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed ${variantStyles[variant]} ${className}`}
    >
      {(icon || title) && (
        <div className="flex items-center gap-2 font-bold mb-1.5">
          {icon}
          {title && <span>{title}</span>}
        </div>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}
