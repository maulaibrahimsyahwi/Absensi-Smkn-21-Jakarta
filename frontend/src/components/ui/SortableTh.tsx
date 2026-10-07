import React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

interface SortableThProps {
  label?: string;
  field?: string;
  sortKey?: string;
  currentKey?: string;
  sortDir?: "asc" | "desc";
  direction?: "asc" | "desc";
  onSort: (key: string) => void;
  align?: "left" | "center" | "right";
  className?: string;
  children?: React.ReactNode;
}

export default function SortableTh({
  label,
  field,
  sortKey = "",
  currentKey,
  sortDir,
  direction,
  onSort,
  align = "left",
  className = "",
  children,
}: SortableThProps) {
  const targetField = field ?? (currentKey !== undefined ? sortKey : sortKey);
  const activeKey = currentKey !== undefined ? currentKey : sortKey;
  const dir = direction ?? sortDir ?? "asc";
  const active = activeKey === targetField;
  const displayText = children ?? label ?? targetField;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  const justify =
    align === "center"
      ? "justify-center"
      : align === "right"
        ? "justify-end"
        : "justify-start";

  return (
    <th
      scope="col"
      className={`px-4 py-0 ${className}`}
      aria-sort={
        active ? (dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(targetField)}
        className={`group flex min-h-11 w-full items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors hover:text-slate-900 cursor-pointer select-none ${justify} ${
          active ? "text-slate-900" : "text-slate-500"
        }`}
      >
        <span>{displayText}</span>
        <Icon
          className={`h-3 w-3 shrink-0 ${
            active
              ? "text-blue-600"
              : "text-slate-300 group-hover:text-slate-400"
          }`}
        />
      </button>
    </th>
  );
}
