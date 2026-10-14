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
const CHUNK_SIZE = 5; // Ukuran batch foto per request sinkronisasi (mencegah HTTP 413 Payload Too Large)

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

const TIME_ANCHOR_KEY = "smkn21_server_time_anchor";

/**
 * Menyimpan patokan waktu server resmi (Monotonic Time Anchor).
 * Memetakan selisih server_epoch_ms terhadap performance.now() browser
 * agar jam offline kebal dari manipulasi mundurnya jam lokal HP siswa.
 */
export function setServerTimeAnchor(serverTimestampStr: string): void {
  try {
    const serverMs = new Date(serverTimestampStr).getTime();
    if (!isNaN(serverMs) && typeof window !== "undefined") {
      const anchor = {
        serverMs,
        clientPerfNow: performance.now(),
      };
      sessionStorage.setItem(TIME_ANCHOR_KEY, JSON.stringify(anchor));
    }
  } catch {
    // Abaikan jika sessionStorage tidak tersedia
  }
}

/**
 * Menghitung estimasi waktu resmi server berdasarkan patokan monotonic performance.now().
 */
export function getEstimatedServerDate(): Date {
  try {
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem(TIME_ANCHOR_KEY);
      if (raw) {
        const anchor = JSON.parse(raw);
        if (anchor.serverMs && typeof anchor.clientPerfNow === "number") {
          const elapsed = performance.now() - anchor.clientPerfNow;
          if (elapsed >= 0 && elapsed < 86400000) {
            return new Date(anchor.serverMs + elapsed);
          }
        }
      }
    }
  } catch {
    // Fallback ke jam lokal
  }
  return new Date();
}

const emit = (name: string, detail?: unknown) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
};

const nowWib = (): string =>
  getEstimatedServerDate().toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" }); // e.g. "2026-10-07 04:45:00"

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

  const estDate = getEstimatedServerDate();
  const entry: OfflineAttendanceEntry = {
    ...input,
    id: generateEntryId(),
    status: input.status || "Tepat Waktu", // Label awal untuk tampilan offline; status resmi dihitung ulang oleh server
    waktu: input.waktu || nowWib(),
    captured_at: estDate.toISOString(),
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
 * Memproses secara kronologis (paling pagi lebih dulu), melakukan deduplikasi,
 * dan menggunakan Web Locks API lintas tab agar tidak terjadi balapan data ganda.
 */
export function syncOfflineQueueToServer(): Promise<SyncOfflineResult> {
  if (inFlight) return inFlight;

  const runSync = async (): Promise<SyncOfflineResult> => {
    if (!initialized) {
      await initOfflineQueue();
    }

    if (cache.length === 0) {
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

    // 1. Urutkan berdasarkan captured_at paling pagi (ASC) agar rekaman Tepat Waktu diproses lebih dulu
    const sortedBatch = [...cache].sort(
      (a, b) => Date.parse(a.captured_at) - Date.parse(b.captured_at),
    );

    // 2. Deduplikasi sisi klien untuk siswa mandiri pada tanggal & tipe yang sama (ambil yang paling pagi)
    const seenMandiriKey = new Set<string>();
    const redundantIds: string[] = [];
    const batchToSend: OfflineAttendanceEntry[] = [];

    for (const item of sortedBatch) {
      const datePart = (item.waktu || item.captured_at).slice(0, 10);
      const dedupKey =
        item.mode === "mandiri" && item.expected_siswa_id
          ? `${item.tipe || "harian"}:${item.expected_siswa_id}:${datePart}`
          : null;
      if (dedupKey && seenMandiriKey.has(dedupKey)) {
        redundantIds.push(item.id);
      } else {
        if (dedupKey) seenMandiriKey.add(dedupKey);
        batchToSend.push(item);
      }
    }

    if (redundantIds.length > 0) {
      cache = cache.filter((e) => !redundantIds.includes(e.id));
      await deleteManyFromIdb(redundantIds);
    }

    let totalDecided = 0;
    try {
      for (let i = 0; i < batchToSend.length; i += CHUNK_SIZE) {
        const part = batchToSend.slice(i, i + CHUNK_SIZE);
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
  };

  // Cegah balapan sinkronisasi multi-tab menggunakan Web Locks API
  if (
    typeof navigator !== "undefined" &&
    "locks" in navigator &&
    navigator.locks?.request
  ) {
    inFlight = navigator.locks.request(
      "smkn21_offline_sync_lock",
      { ifAvailable: true },
      async (lock) => {
        if (!lock) {
          return {
            success: true,
            count: 0,
            message: "Sinkronisasi antrean sedang dikerjakan oleh tab lain.",
          };
        }
        return await runSync();
      },
    ).finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  inFlight = runSync().finally(() => {
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
