import React from "react";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  BookOpen,
} from "lucide-react";
import { useCountUp } from "../../hooks/useCountUp";
import { Skeleton } from "../common/Skeleton";

export interface DashboardStats {
  total_siswa?: number;
  total_tepat_waktu?: number;
  total_terlambat?: number;
  total_sakit?: number;
  total_izin?: number;
  total_perpus?: number;
  [key: string]: unknown;
}

const TONE = {
  blue: { chip: "bg-blue-50 text-blue-600 ring-blue-100", value: "text-slate-900" },
  emerald: { chip: "bg-emerald-50 text-emerald-600 ring-emerald-100", value: "text-emerald-700" },
  amber: { chip: "bg-amber-50 text-amber-600 ring-amber-100", value: "text-amber-700" },
  rose: { chip: "bg-rose-50 text-rose-600 ring-rose-100", value: "text-rose-700" },
  indigo: { chip: "bg-indigo-50 text-indigo-600 ring-indigo-100", value: "text-indigo-700" },
} as const;

export function KpiCard({
  label,
  value,
  tone,
  icon,
  loading = false,
  hint,
  index = 0,
  className = "",
  children,
}: {
  label: string;
  value: number;
  tone: keyof typeof TONE;
  icon: React.ReactNode;
  loading?: boolean;
  hint?: string;
  index?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const n = useCountUp(value);
  const t = TONE[tone];

  return (
    <div
      className={`rise-in card-lift rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs ${className}`}
      style={{ "--i": index } as React.CSSProperties}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500">{label}</span>
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ring-1 ${t.chip}`}
        >
          {icon}
        </span>
      </div>

      {loading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <p
          className={`text-2xl font-extrabold tabular-nums tracking-tight sm:text-3xl ${t.value}`}
        >
          {n.toLocaleString("id-ID")}
        </p>
      )}

      {!loading && hint && (
        <p className="mt-1 text-xs text-slate-500 font-medium">{hint}</p>
      )}
      {!loading && children}
    </div>
  );
}

interface DashboardKpiCardsProps {
  stats?: DashboardStats;
  isPiket?: boolean;
  loading?: boolean;
}

export default function DashboardKpiCards({
  stats = {},
  isPiket = false,
  loading = false,
}: DashboardKpiCardsProps) {
  const tepat = stats.total_tepat_waktu || 0;
  const telat = stats.total_terlambat || 0;
  const sakit = stats.total_sakit || 0;
  const izin = stats.total_izin || 0;
  const ketepatan =
    tepat + telat > 0 ? Math.round((tepat / (tepat + telat)) * 100) : null;

  return (
    <div
      className={`mb-6 grid gap-3 sm:gap-4 ${
        isPiket
          ? "grid-cols-2 lg:grid-cols-4"
          : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      }`}
    >
      <KpiCard
        index={0}
        label="Total siswa"
        value={stats.total_siswa || 0}
        tone="blue"
        loading={loading}
        icon={<Users className="h-4 w-4" />}
      />

      <KpiCard
        index={1}
        label="Tepat waktu"
        value={tepat}
        tone="emerald"
        loading={loading}
        icon={<CheckCircle2 className="h-4 w-4" />}
        hint={ketepatan !== null ? `${ketepatan}% dari yang hadir` : undefined}
      />

      <KpiCard
        index={2}
        label="Terlambat"
        value={telat}
        tone="amber"
        loading={loading}
        icon={<AlertTriangle className="h-4 w-4" />}
      />

      <KpiCard
        index={3}
        label="Sakit dan izin"
        value={sakit + izin}
        tone="rose"
        loading={loading}
        icon={<HeartPulse className="h-4 w-4" />}
      >
        <div className="mt-2 flex gap-1.5 text-xs font-semibold">
          <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-rose-700 border border-rose-200/60">
            Sakit {sakit}
          </span>
          <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-blue-700 border border-blue-200/60">
            Izin {izin}
          </span>
        </div>
      </KpiCard>

      {!isPiket && (
        <KpiCard
          index={4}
          label="Kunjungan perpustakaan"
          value={stats.total_perpus || 0}
          tone="indigo"
          loading={loading}
          icon={<BookOpen className="h-4 w-4" />}
          className="col-span-2 sm:col-span-3 lg:col-span-1"
        />
      )}
    </div>
  );
}
