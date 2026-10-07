import React from "react";
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";

export interface InlineAlertProps {
  type?: "info" | "warning" | "error" | "success";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const STYLES = {
  info: {
    bg: "bg-blue-50/80 border-blue-200/80 text-blue-900",
    icon: <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />,
  },
  warning: {
    bg: "bg-amber-50/80 border-amber-200/80 text-amber-900",
    icon: <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />,
  },
  error: {
    bg: "bg-rose-50/80 border-rose-200/80 text-rose-900",
    icon: <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />,
  },
  success: {
    bg: "bg-emerald-50/80 border-emerald-200/80 text-emerald-900",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />,
  },
} as const;

export default function InlineAlert({
  type = "info",
  title,
  children,
  className = "",
}: InlineAlertProps) {
  const conf = STYLES[type];

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-xs sm:text-sm leading-relaxed ${conf.bg} ${className}`}
    >
      {conf.icon}
      <div className="flex-1 space-y-0.5 min-w-0">
        {title && <p className="font-bold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
