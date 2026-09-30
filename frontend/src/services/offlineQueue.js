/**
 * Offline Emergency Buffer & Auto-Sync Service (SMKN 21 Kiosk Mode).
 * Menangani penampungan data presensi siswa saat pemadaman internet / server down,
 * dan melakukan sinkronisasi otomatis ke server ketika jaringan pulih.
 */

import { presensiService } from "./presensiService";

const QUEUE_KEY = "smkn21_offline_attendance_queue";

export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function enqueueOfflineAttendance(item) {
  try {
    const queue = getOfflineQueue();
    const entry = {
      id: "off_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
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
    window.dispatchEvent(
      new CustomEvent("offline-attendance-queued", {
        detail: { count: queue.length, entry },
      }),
    );
    return entry;
  } catch (e) {
    console.error("Gagal menyimpan ke antrean offline:", e);
    return null;
  }
}

export function clearOfflineQueue() {
  try {
    localStorage.removeItem(QUEUE_KEY);
    window.dispatchEvent(new CustomEvent("offline-attendance-cleared"));
  } catch (e) {}
}

export async function syncOfflineQueueToServer() {
  const queue = getOfflineQueue();
  if (!queue || queue.length === 0) return { success: true, count: 0 };

  try {
    const res = await presensiService.syncOffline(queue);
    if (res && res.success) {
      clearOfflineQueue();
      window.dispatchEvent(
        new CustomEvent("offline-attendance-synced", { detail: res }),
      );
      return { success: true, count: queue.length, response: res };
    }
    return { success: false, message: res?.message || "Gagal sinkronisasi" };
  } catch (err) {
    console.warn("Gagal menyinkronkan antrean offline ke server:", err);
    return { success: false, error: err.message };
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
