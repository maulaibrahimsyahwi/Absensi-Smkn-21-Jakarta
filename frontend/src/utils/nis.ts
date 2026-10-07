/**
 * Aturan Baku Format NIS (Nomor Induk Siswa) SMKN 21 Jakarta.
 * Digunakan bersama oleh formulir pendaftaran, edit siswa, dan parser impor Dapodik.
 */

export const NIS_RE = /^\d{4,18}$/;

/**
 * Membersihkan input NIS dari format angka desimal Excel (.0), spasi, atau karakter non-digit.
 */
export const normalizeNis = (v: unknown): string =>
  String(v ?? "")
    .trim()
    .replace(/\.0+$/, "")
    .replace(/\s+/g, "");

