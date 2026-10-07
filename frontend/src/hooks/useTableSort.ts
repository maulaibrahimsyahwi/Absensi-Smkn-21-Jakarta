import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

export function useTableSort<T>(
  rows: T[],
  initialKey: string,
  initialDir: SortDir = "asc",
  descFirst: string[] = [],
) {
  const [sortKey, setSortKey] = useState(initialKey);
  const [sortDir, setSortDir] = useState<SortDir>(initialDir);

  const onSort = (key: string) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(descFirst.includes(key) ? "desc" : "asc");
    }
  };

  const sorted = useMemo(() => {
    const collator = new Intl.Collator("id", { numeric: true, sensitivity: "base" });
    return [...rows].sort((a, b) => {
      const va = (a as Record<string, unknown>)[sortKey] ?? "";
      const vb = (b as Record<string, unknown>)[sortKey] ?? "";
      const r =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : collator.compare(String(va), String(vb));
      return sortDir === "asc" ? r : -r;
    });
  }, [rows, sortKey, sortDir]);

  return { sorted, sortKey, sortDir, onSort, setSortKey, setSortDir };
}
