const TINGKAT = ["X", "XI", "XII"] as const;
export type Tingkat = (typeof TINGKAT)[number];

export const normalizeKelas = (v: string): string =>
  v.trim().toUpperCase().replace(/\s+/g, " ");

export const parseKelas = (kelas: string): { tingkat: Tingkat; rombel: string } | null => {
  const m = normalizeKelas(kelas).match(/^(XII|XI|X)\s+(.+)$/);
  return m ? { tingkat: m[1] as Tingkat, rombel: m[2] } : null;
};

export const isValidKelas = (v: string): boolean => parseKelas(v) !== null;

export const tingkatIndex = (t: Tingkat): number => TINGKAT.indexOf(t);

export const nextKelas = (kelas: string): string | null => {
  const p = parseKelas(kelas);
  if (!p) return null;
  const i = tingkatIndex(p.tingkat);
  return i < 2 ? `${TINGKAT[i + 1]} ${p.rombel}` : null; // XII tidak naik, hanya lulus
};
