import React, { useEffect, useId, useState } from "react";
import { Loader2, Search } from "lucide-react";
import api from "../../services/api";
import { unwrapList } from "../../utils/api";
import { INPUT_CLASS } from "../ui/Field";
import Button from "../ui/Button";
import { Siswa } from "../../types/auth";

export default function StudentPicker({
  value,
  onChange,
  label = "Siswa",
}: {
  value: Siswa | null;
  onChange: (s: Siswa | null) => void;
  label?: string;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Siswa[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (value || q.length < 2) {
      setResults([]);
      return;
    }
    let stale = false;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get("/siswa", {
          params: { search: q, status: "Aktif", limit: 10 },
        });
        if (!stale) {
          setResults(
            unwrapList<Siswa>(res.data)
              .filter((s) => s.status !== "Alumni")
              .slice(0, 10),
          );
        }
      } catch {
        if (!stale) setResults([]);
      } finally {
        if (!stale) setLoading(false);
      }
    }, 280);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [query, value]);

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-bold text-slate-700"
      >
        {label} <span className="text-rose-500">*</span>
      </label>
      {value ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">
              {value.nama}
            </p>
            <p className="text-xs text-slate-600">
              <span className="font-mono">{value.nis}</span> &middot;{" "}
              {value.kelas}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onChange(null);
              setQuery("");
            }}
          >
            Ganti
          </Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id={id}
              type="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ketik nama atau NIS (min. 2 huruf)"
              className={`${INPUT_CLASS} pl-10`}
            />
            {loading && (
              <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
            )}
          </div>
          {results.length > 0 && (
            <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              {results.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(s);
                      setQuery("");
                      setResults([]);
                    }}
                    className="flex min-h-12 w-full flex-col items-start justify-center px-3 py-2 text-left hover:bg-blue-50/60 transition-colors cursor-pointer"
                  >
                    <span className="text-sm font-semibold text-slate-900">
                      {s.nama}
                    </span>
                    <span className="text-xs text-slate-500">
                      <span className="font-mono">{s.nis}</span> &middot;{" "}
                      {s.kelas}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
