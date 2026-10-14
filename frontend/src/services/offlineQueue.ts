/**
 * Buffer presensi darurat offline: Menyimpan BUKTI (foto + koordinat + fingerprint perangkat), bukan klaim.
 * Menggunakan IndexedDB sebagai media penyimpanan utama agar mampu menampung puluhan foto base64
 * tanpa terbentur batas kuota 5 MB localStorage.
 * Server memverifikasi biometrik wajah dan menentukan status kehadiran serta waktu resmi WIB saat sinkronisasi.
 */
import { presensiService, SyncOfflineResponse } from "./presensiService";
import {
  putToIdb,
  clearIdbQueue,
  getAllFromIdb,
  deleteManyFromIdb,
} from "./indexedDbQueue";

const LEGACY_STORAGE_KEY = "smkn21_offline_attendance_queue";
const TOKEN_KEY = "smkn21_auth_token";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // Foto biometrik offline dibatasi maksimal 24 jam demi privasi (UU PDP)
const CHUNK_SIZE = 20; // Ukuran batch foto per request sinkronisasi

export interface OfflineAttendanceEntry {
  id: string; // Kunci idempotensi unik per rekaman
  mode: "kiosk" | "mandiri";
  image: string; // Data URL JPEG foto wajah bukti
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  expected_siswa_id: number | string | null;
  device_id: string | null;
  captured_at: string; // ISO 8601 UTC timestamp saat pemotretan
  nama?: string;
  nis?: string;
  waktu?: string; // Format WIB string lokal
  status?: string;
  notes?: string;
  tipe?: string; // "harian" | "perpustakaan"
  keperluan?: string; // Catatan tujuan kunjungan perpustakaan
}

export type OfflineAttendanceInput = Omit<
  OfflineAttendanceEntry,
  "id" | "captured_at"
>;

export interface SyncOfflineResult {
  success: boolean;
  count?: number;
  message?: string;
  error?: string;
  response?: SyncOfflineResponse;
}

let cache: OfflineAttendanceEntry[] = [];
let initialized = false;
let inFlight: Promise<SyncOfflineResult> | null = null;

const emit = (name: string, detail?: unknown) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
};

const nowWib = (): string =>
  new Date().toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" }); // e.g. "2026-10-07 04:45:00"

const generateEntryId = (): string =>
  "off_" +
  (typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);

/**
 * Inisialisasi antrean offline dari IndexedDB dan migrasi antrean lama dari localStorage jika ada.
 */
export async function initOfflineQueue(): Promise<void> {
  try {
    const stored = (await getAllFromIdb()) || [];
    const knownIds = new Set(stored.map((e) => e.id));

    // Migrasi data lama dari localStorage (jika ada) ke IndexedDB
    try {
      const rawLegacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (rawLegacy) {
        const legacyEntries = JSON.parse(rawLegacy) as OfflineAttendanceEntry[];
        for (const entry of legacyEntries) {
          if (entry && entry.id && !knownIds.has(entry.id)) {
            await putToIdb(entry);
            stored.push(entry);
            knownIds.add(entry.id);
          }
        }
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch {
      // Abaikan jika parsing legacy gagal
    }

    // Filter entri yang valid (memiliki bukti gambar dan tidak melampaui batas retensi 24 jam)
    const validEntries: OfflineAttendanceEntry[] = [];
    const expiredIds: string[] = [];

    for (const e of stored) {
      const isTooOld =
        e.captured_at && Date.now() - Date.parse(e.captured_at) > MAX_AGE_MS;
      if (isTooOld || !e.image) {
        expiredIds.push(e.id);
      } else {
        validEntries.push(e);
      }
    }

    if (expiredIds.length > 0) {
      await deleteManyFromIdb(expiredIds);
    }

    cache = validEntries;
    initialized = true;
    emit("offline-attendance-queued", { count: cache.length });
  } catch (err) {
    console.warn("[OfflineQueue] Gagal menginisialisasi IndexedDB queue:", err);
  }
}

/**
 * Mengembalikan salinan antrean offline saat ini secara sinkron.
 */
export const getOfflineQueue = (): OfflineAttendanceEntry[] => [...cache];

/**
 * Menyimpan rekaman presensi darurat ke IndexedDB.
 * Mengembalikan entri yang tersimpan atau NULL jika memori perangkat penuh/gagal.
 * PEMANGGIL WAJIB MEMERIKSA NILAI RETURN NULL.
 */
export async function enqueueOfflineAttendance(
  input: OfflineAttendanceInput,
): Promise<OfflineAttendanceEntry | null> {
  if (!initialized) {
    await initOfflineQueue();
  }

  const entry: OfflineAttendanceEntry = {
    ...input,
    id: generateEntryId(),
    status: input.status || "Tepat Waktu", // Label awal untuk tampilan offline; status resmi dihitung ulang oleh server
    waktu: input.waktu || nowWib(),
    captured_at: new Date().toISOString(),
    device_id: input.device_id || null,
    notes: "Tersimpan di buffer offline",
  };

  try {
    await putToIdb(entry);
  } catch (err) {
    console.error("Gagal menyimpan antrean offline ke IndexedDB:", err);
    return null;
  }

  cache = [...cache, entry];
  registerPwaBackgroundSync();
  emit("offline-attendance-queued", { count: cache.length, entry });
  return entry;
}

/**
 * Registrasi Service Worker Background Sync untuk menyinkronkan saat jaringan pulih
 */
export function registerPwaBackgroundSync(): void {
  if (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "SyncManager" in window
  ) {
    navigator.serviceWorker.ready
      .then((reg: unknown) => {
        const r = reg as { sync?: { register: (tag: string) => Promise<void> } };
        return r.sync?.register("sync-attendance-queue");
      })
      .catch((err) => console.warn("[PWA] Registrasi Background Sync:", err));
  }
}

/**
 * Menyinkronkan antrean presensi darurat offline ke server.
 * Menggunakan kunci inFlight tunggal untuk mencegah duplikasi pengiriman konkuren.
 */
export function syncOfflineQueueToServer(): Promise<SyncOfflineResult> {
  if (inFlight) return inFlight;

  inFlight = (async (): Promise<SyncOfflineResult> => {
    if (!initialized) {
      await initOfflineQueue();
    }

    const batch = [...cache];
    if (batch.length === 0) {
      return { success: true, count: 0 };
    }

    // Pastikan terdapat token autentikasi sebelum mengirim ke server
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return {
        success: false,
        count: 0,
        message: "Perlu login untuk menyinkronkan antrean presensi offline.",
      };
    }

    let totalDecided = 0;
    try {
      for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
        const part = batch.slice(i, i + CHUNK_SIZE);
        const res: SyncOfflineResponse = await presensiService.syncOffline(part);

        if (!res || !res.success) {
          return {
            success: false,
            count: totalDecided,
            message: res?.message || "Gagal sinkronisasi batch presensi offline.",
          };
        }

        // Ambil ID entri yang telah diputuskan secara definitif oleh server (synced, duplicate, rejected)
        const decided = new Set<string>();
        if (Array.isArray(res.results)) {
          for (const r of res.results) {
            if (
              r.id &&
              (r.status === "synced" ||
                r.status === "duplicate" ||
                r.status === "rejected")
            ) {
              decided.add(r.id);
            }
          }
        } else {
          // Fallback untuk respons server legacy tanpa rincian status per-item
          part.forEach((e) => decided.add(e.id));
        }

        // Hapus hanya entri yang telah definitif diproses server, entri gagal/error tetap tersimpan untuk dicoba ulang
        if (decided.size > 0) {
          cache = cache.filter((e) => !decided.has(e.id));
          await deleteManyFromIdb([...decided]);
          totalDecided += decided.size;
        }
      }

      if (totalDecided > 0) {
        emit("offline-attendance-synced", { count: totalDecided });
      }
      return { success: true, count: totalDecided };
    } catch (err) {
      console.warn("Gagal menyinkronkan antrean offline:", err);
      return {
        success: false,
        count: totalDecided,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

/**
 * Membersihkan seluruh antrean IndexedDB.
 * PERINGATAN: Jangan dipanggil saat logout biasa agar presensi belum tersinkron tidak terbuang.
 */
export async function clearOfflineQueue(): Promise<void> {
  cache = [];
  await clearIdbQueue().catch(() => {});
  emit("offline-attendance-cleared");
}

// Inisialisasi otomatis dan penanganan pemicu sinkronisasi
if (typeof window !== "undefined") {
  initOfflineQueue();

  const trySyncIfPossible = () => {
    if (cache.length > 0 && navigator.onLine && localStorage.getItem(TOKEN_KEY)) {
      void syncOfflineQueueToServer();
    }
  };

  window.addEventListener("online", trySyncIfPossible);
  setInterval(trySyncIfPossible, 60_000); // Polling berkala jika online event tertunda

  // Dengarkan pesan dari Service Worker Background Sync
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "OFFLINE_SYNC_REQUEST") {
        trySyncIfPossible();
      }
    });
  }
}
