import React, { useState, useEffect, useMemo } from "react";
import { GraduationCap } from "lucide-react";
import CustomDropdown, { DropdownGroup } from "../CustomDropdown";
import {
  DAFTAR_KELAS_SMKN21,
  KELAS_GROUPS_DROPDOWN,
} from "../../constants/schoolData";
import { INPUT_CLASS } from "../ui/Field";
import { isValidKelas, normalizeKelas } from "../../utils/kelas";
import { Siswa } from "../../types/siswa";

export interface KelasPickerProps {
  value: string;
  onChange: (v: string) => void;
  siswaList?: Siswa[];
  groups?: DropdownGroup[];
  disabled?: boolean;
  resetKey?: string | number;
}

export default function KelasPicker({
  value,
  onChange,
  siswaList = [],
  groups,
  disabled,
  resetKey,
}: KelasPickerProps) {
  const [custom, setCustom] = useState(false);

  useEffect(() => {
    setCustom(Boolean(value) && !DAFTAR_KELAS_SMKN21.includes(value));
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const available = useMemo<DropdownGroup[]>(() => {
    const known = new Set<string>(DAFTAR_KELAS_SMKN21);
    const extra = Array.from(
      new Set(
        siswaList.map((s) => s.kelas).filter((k) => k && !known.has(k)),
      ),
    ).sort();
    const out: DropdownGroup[] = [...(groups || KELAS_GROUPS_DROPDOWN)];
    if (extra.length) {
      out.push({
        group: "Kelas tambahan terdaftar",
        badge: "AKTIF",
        badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-200",
        options: extra.map((k) => ({ value: k, label: k })),
      });
    }
    out.push({
      group: "Opsi tambahan",
      badge: "+",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
      options: [{ value: "__CUSTOM__", label: "+ Kelas baru..." }],
    });
    return out;
  }, [groups, siswaList]);

  const invalid = custom && value !== "" && !isValidKelas(value);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs font-bold text-slate-700">
          Kelas dan jurusan <span className="text-rose-500">*</span>
        </p>
        {custom && (
          <button
            type="button"
            onClick={() => setCustom(false)}
            className="min-h-9 text-xs font-semibold text-blue-700 cursor-pointer hover:underline"
          >
            Pilih dari daftar
          </button>
        )}
      </div>
      {custom ? (
        <>
          <input
            value={value}
            autoFocus
            disabled={disabled}
            aria-invalid={invalid || undefined}
            placeholder="Contoh: X PPLG 3"
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            onBlur={() => onChange(normalizeKelas(value))}
            className={`${INPUT_CLASS} font-mono uppercase`}
          />
          <p
            className={`mt-1 text-xs ${
              invalid ? "font-medium text-rose-600" : "text-slate-500"
            }`}
          >
            Tingkat (X / XI / XII), spasi, lalu rombel. Contoh: X PPLG atau X
            PPLG 3.
          </p>
        </>
      ) : (
        <CustomDropdown
          value={value}
          groups={available}
          disabled={disabled}
          className="w-full"
          size="lg"
          placeholder="Pilih kelas dan jurusan"
          icon={<GraduationCap className="h-4 w-4 text-blue-600" />}
          onChange={(v: string) =>
            v === "__CUSTOM__" ? (setCustom(true), onChange("")) : onChange(v)
          }
        />
      )}
    </div>
  );
}
