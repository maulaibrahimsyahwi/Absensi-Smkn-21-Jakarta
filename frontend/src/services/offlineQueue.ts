/**
 * Offline Emergency Buffer & Auto-Sync Service (SMKN 21 Kiosk Mode).
 * Menangani penampungan data presensi siswa saat pemadaman internet / server down,
 * dan melakukan sinkronisasi otomatis ke server ketika jaringan pulih.
 */

import { presensiService } from "./presensiService";

const QUEUE_KEY = "smkn21_offline_attendance_queue";

export interface OfflineAttendanceEntry {
  id: string;
  siswa_id: number | string;
  nis: string;
  nama: string;
  status: string;
  waktu: string;
  captured_at: string;
  device_id: string | null;
  notes: string;
  [key: string]: unknown;
}

export interface OfflineAttendanceInput {
  siswa_id: number | string;
  nis: string;
  nama: string;
  status?: string;
  waktu?: string;
  device_id?: string | null;
  [key: string]: unknown;
}

export function getOfflineQueue(): OfflineAttendanceEntry[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}

export function enqueueOfflineAttendance(item: OfflineAttendanceInput): OfflineAttendanceEntry | null {
  try {
    const queue = getOfflineQueue();
    const entry: OfflineAttendanceEntry = {
      id: "off_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8),
      siswa_id: item.siswa_id,
      nis: item.nis,
      nama: item.nama,
      status: item.status || "Tepat Waktu",
      waktu:
        item.waktu ||
        new Date().toISOString().replace("T", " ").substring(0, 19),
      captured_at: new Date().toISOString(),
      device_id: item.device_id || null,
      notes: "Tersimpan di Buffer Lokal Kiosk",
    };

    queue.push(entry);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

    // Dispatch event untuk update badge UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent("offline-attendance-queued", {
          detail: { count: queue.length, entry },
        }),
      );
    }
    return entry;
  } catch (e) {
    console.error("Gagal menyimpan ke antrean offline:", e);
    return null;
  }
}

export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem(QUEUE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("offline-attendance-cleared"));
    }
  } catch (_e) {}
}

export interface SyncOfflineResult {
  success: boolean;
  count?: number;
  response?: unknown;
  message?: string;
  error?: string;
}

export async function syncOfflineQueueToServer(): Promise<SyncOfflineResult> {
  const queue = getOfflineQueue();
  if (!queue || queue.length === 0) return { success: true, count: 0 };

  try {
    const res = await presensiService.syncOffline(queue);
    if (res && res.success) {
      clearOfflineQueue();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent("offline-attendance-synced", { detail: res }),
        );
      }
      return { success: true, count: queue.length, response: res };
    }
    return { success: false, message: res?.message || "Gagal sinkronisasi" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("Gagal menyinkronkan antrean offline ke server:", err);
    return { success: false, error: message };
  }
}

// Inisialisasi event listener koneksi online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log(
      "[NETWORK] Terhubung kembali ke jaringan! Memulai sinkronisasi buffer offline...",
    );
    syncOfflineQueueToServer();
  });
}
