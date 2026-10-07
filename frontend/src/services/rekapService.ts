import api from "./api";
import type { ApiResponse } from "../types";

export type RekapParams = Record<string, string | number | boolean | null | undefined>;

const cleanParams = (p: RekapParams): Record<string, string | number | boolean> =>
  Object.fromEntries(
    Object.entries(p).filter(([, v]) => v !== "" && v != null),
  ) as Record<string, string | number | boolean>;

const get = async <T = unknown>(
  url: string,
  params: RekapParams = {},
  signal?: AbortSignal,
): Promise<T> =>
  (await api.get<T>(url, { params: cleanParams(params), signal })).data;

/**
 * Layanan API Rekapitulasi & Riwayat Kehadiran Siswa SMKN 21 Jakarta.
 * Membersihkan parameter kosong untuk mencegah filter salah pada backend,
 * serta mendukung AbortSignal untuk mitigasi race condition pada filter tabel.
 */
export const rekapService = {
  getAvailableYears: (signal?: AbortSignal) =>
    get<number[]>("/rekap/available_years", {}, signal),

  getSiswaPeriode: <T = any>(p: RekapParams = {}, signal?: AbortSignal) =>
    get<T>("/rekap/siswa_periode", p, signal),

  getHarian: <T = any[]>(p: RekapParams = {}, signal?: AbortSignal) =>
    get<T>("/rekap/harian", p, signal),

  getPerpus: <T = any[]>(p: RekapParams = {}, signal?: AbortSignal) =>
    get<T>("/rekap/perpus", p, signal),
};

export default rekapService;
