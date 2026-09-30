/**
 * Device Fingerprint Identifier untuk SMKN 21 Jakarta.
 * Menghasilkan UUID unik persisten per perangkat browser untuk mendeteksi
 * titip absen (1 HP dipakai bergantian oleh banyak siswa).
 */

const STORAGE_KEY = "smkn21_device_id";

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id || typeof id !== "string" || id.length < 16) {
      // Generate crypto-random UUID
      if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
        id = "dev_" + window.crypto.randomUUID();
      } else {
        id =
          "dev_" +
          Math.random().toString(36).substring(2, 15) +
          "_" +
          Date.now().toString(36);
      }
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch (_e) {
    // Fallback jika localStorage diblokir
    return "dev_fallback_" + Math.random().toString(36).substring(2, 10);
  }
}
