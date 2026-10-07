import { NIS_RE, normalizeNis } from "./nis";

const MAX_BYTES = 5 * 1024 * 1024; // Maksimal ukuran file 5 MB
const KELAS_RE = /^(X|XI|XII)\s[A-Z]{2,6}(\s\d{1,2})?$/;

export interface ParsedDapodikRow {
  index: number;
  nis: string;
  nama: string;
  kelas: string;
  jenis_kelamin: string;
  errorMessages?: string;
  [key: string]: unknown;
}

export interface ParseDapodikResult {
  validRows: ParsedDapodikRow[];
  invalidRows: ParsedDapodikRow[];
  totalDetected: number;
}

// Urutan prioritas pencarian kolom. NISN ditaruh paling akhir agar NIPD/NIS tidak tertimpa NISN 10-digit.
const ALIASES = {
  nis: ["nis", "nipd", "nomorinduk", "noinduk", "nisn"],
  nama: ["namalengkap", "namapesertadidik", "namasiswa", "nama", "pesertadidik"],
  kelas: ["rombel", "rombonganbelajar", "kelas"],
  jk: ["jeniskelamin", "jk", "lp", "gender", "kelamin"],
};

const L = new Set(["l", "lk", "laki", "lakilaki", "pria"]);
const P = new Set(["p", "pr", "perempuan", "wanita", "siswi"]);

const clean = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

function normalizeKelas(raw: string): string | null {
  const v = raw
    .toUpperCase()
    .replace(/[-_.]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^10\b/, "X")
    .replace(/^11\b/, "XI")
    .replace(/^12\b/, "XII");
  return KELAS_RE.test(v) ? v : null;
}

/**
 * Mengunduh template Excel berstandar format ekspor Dapodik.
 * Menggunakan dynamic import untuk menghemat ukuran bundle awal.
 */
export async function downloadDapodikTemplate(): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // Data header dan contoh baris siswa SMKN 21
  const wsData = [
    ["NIS", "Nama Lengkap", "Kelas", "Jenis Kelamin"],
    ["10241", "Ahmad Rizky Pratama", "X PPLG 1", "L"],
    ["10242", "Annisa Fitria", "X PPLG 1", "P"],
    ["10243", "Bagus Tri Saputra", "X PPLG 1", "L"],
    ["10244", "Dewi Lestari", "X PPLG 1", "P"],
    ["10245", "Fajar Hidayat", "XI MPLB 2", "L"],
    ["10246", "Siti Nurhaliza", "XII AKL 1", "P"],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws["!cols"] = [
    { wch: 14 }, // NIS
    { wch: 28 }, // Nama Lengkap
    { wch: 16 }, // Kelas
    { wch: 20 }, // Jenis Kelamin
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Daftar Siswa Dapodik");
  XLSX.writeFile(wb, "Template_Dapodik_Siswa_SMKN21.xlsx");
}

/**
 * Membaca dan memetakan file Excel/CSV siswa Dapodik dengan dynamic import xlsx.
 * Mencari header secara adaptif di 15 baris pertama untuk melewati judul export Dapodik.
 */
export async function parseDapodikFile(file: File): Promise<ParseDapodikResult> {
  if (file.size > MAX_BYTES) {
    throw new Error("Ukuran file terlalu besar (maksimal 5 MB).");
  }

  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error("File tidak memiliki lembar kerja (worksheet).");
  }

  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) {
    throw new Error("Lembar kerja pertama tidak dapat dibaca.");
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (!rows || rows.length === 0) {
    throw new Error("Lembar kerja kosong.");
  }

  // Cari baris header di 15 baris pertama (menangani baris judul Dapodik di atas tabel)
  const h = rows.slice(0, 15).findIndex((r) => {
    if (!Array.isArray(r)) return false;
    const k = r.map(clean);
    return ALIASES.nis.some((a) => k.includes(a)) && ALIASES.nama.some((a) => k.includes(a));
  });

  if (h < 0) {
    throw new Error("Baris header tidak ditemukan. Pastikan file memiliki kolom NIS dan Nama Lengkap.");
  }

  const headerRow = rows[h] as unknown[];
  const keys = headerRow.map(clean);
  const col = (al: string[]) => {
    for (const a of al) {
      const idx = keys.indexOf(a);
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const cNis = col(ALIASES.nis);
  const cNama = col(ALIASES.nama);
  const cKelas = col(ALIASES.kelas);
  const cJk = col(ALIASES.jk);

  if (cNis < 0 || cNama < 0) {
    throw new Error("Kolom NIS dan Nama Lengkap wajib ada di lembar kerja.");
  }

  const validRows: ParsedDapodikRow[] = [];
  const invalidRows: ParsedDapodikRow[] = [];
  const seen = new Map<string, number>();

  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    if (!r) continue;
    const nis = normalizeNis(r[cNis]);
    const nama = String(r[cNama] ?? "").replace(/\s+/g, " ").trim();
    const kelasRaw = cKelas >= 0 ? String(r[cKelas] ?? "") : "";
    const jkRaw = cJk >= 0 ? clean(r[cJk]) : "";

    if (!nis && !nama && !kelasRaw.trim()) continue;

    const rowNo = i + 1; // Nomor baris Excel
    const errors: string[] = [];

    if (!NIS_RE.test(nis)) {
      errors.push("NIS harus berupa 4-18 digit angka");
    } else if (seen.has(nis)) {
      errors.push(`NIS ganda dengan baris ${seen.get(nis)}`);
    } else {
      seen.set(nis, rowNo);
    }

    if (nama.length < 3) {
      errors.push("Nama minimal 3 karakter");
    }

    const kelas = normalizeKelas(kelasRaw);
    if (!kelas) {
      errors.push(`Format kelas tidak dikenali ("${kelasRaw.trim() || "kosong"}")`);
    }

    let jenis_kelamin = "";
    if (L.has(jkRaw)) {
      jenis_kelamin = "Laki-laki";
    } else if (P.has(jkRaw)) {
      jenis_kelamin = "Perempuan";
    } else {
      errors.push("Jenis kelamin tidak dikenali (gunakan L atau P)");
    }

    const item: ParsedDapodikRow = {
      index: rowNo,
      nis,
      nama,
      kelas: kelas ?? kelasRaw.trim(),
      jenis_kelamin,
    };

    if (errors.length > 0) {
      invalidRows.push({ ...item, errorMessages: errors.join("; ") });
    } else {
      validRows.push(item);
    }
  }

  return {
    validRows,
    invalidRows,
    totalDetected: validRows.length + invalidRows.length,
  };
}
