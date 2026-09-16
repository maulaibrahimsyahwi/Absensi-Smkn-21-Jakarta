/**
 * Data & Struktur Resmi Jurusan SMKN 21 Jakarta
 * Kurikulum Merdeka: PPLG, AKL, MPLB, BR
 */

export const JURUSAN_SMKN21 = [
  {
    kode: "PPLG",
    nama: "Pengembangan Perangkat Lunak & Gim",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    color: "blue",
  },
  {
    kode: "AKL",
    nama: "Akuntansi & Keuangan Lembaga",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    color: "emerald",
  },
  {
    kode: "MPLB",
    nama: "Manajemen Perkantoran & Layanan Bisnis",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    color: "amber",
  },
  {
    kode: "BR",
    nama: "Bisnis Ritel",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
    color: "purple",
  },
];

export const KELAS_PER_JURUSAN = {
  PPLG: [
    "X PPLG 1",
    "X PPLG 2",
    "XI PPLG 1",
    "XI PPLG 2",
    "XII PPLG 1",
    "XII PPLG 2",
  ],
  AKL: ["X AKL 1", "X AKL 2", "XI AKL 1", "XI AKL 2", "XII AKL 1", "XII AKL 2"],
  MPLB: [
    "X MPLB 1",
    "X MPLB 2",
    "XI MPLB 1",
    "XI MPLB 2",
    "XII MPLB 1",
    "XII MPLB 2",
  ],
  BR: ["X BR 1", "X BR 2", "XI BR 1", "XI BR 2", "XII BR 1", "XII BR 2"],
};

export const DAFTAR_KELAS_SMKN21 = Object.values(KELAS_PER_JURUSAN).flat();

export const KELAS_GROUPS_DROPDOWN = JURUSAN_SMKN21.map((jur) => ({
  group: `${jur.nama} (${jur.kode})`,
  badge: jur.kode,
  badgeClass: jur.badge,
  options: KELAS_PER_JURUSAN[jur.kode].map((k) => ({
    value: k,
    label: k,
  })),
}));

export const KELAS_FILTER_DROPDOWN = [
  { value: "ALL", label: "Semua Kelas" },
  ...KELAS_GROUPS_DROPDOWN,
];

/**
 * Mendapatkan informasi badge dan jurusan dari string kelas
 * @param {string} kelasStr Contoh: "X PPLG 1"
 */
export function getJurusanInfo(kelasStr) {
  if (!kelasStr) return null;
  for (const jur of JURUSAN_SMKN21) {
    if (kelasStr.toUpperCase().includes(jur.kode)) {
      return jur;
    }
  }
  return null;
}
