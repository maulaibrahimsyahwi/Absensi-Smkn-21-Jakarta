import type { OfflineAttendanceEntry } from "./offlineQueue";

const DB_NAME = "smkn21_offline_db";
const STORE_NAME = "attendance_queue";
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      return reject(new Error("IndexedDB tidak didukung pada peramban ini."));
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

// Menunggu hingga transaksi benar-benar selesai di-commit (tx.oncomplete)
function withStore<T = void>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const req = fn(tx.objectStore(STORE_NAME)) as IDBRequest<T> | undefined;
        tx.oncomplete = () => resolve(req ? req.result : undefined);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

export async function getAllFromIdb(): Promise<OfflineAttendanceEntry[]> {
  try {
    return (await withStore<OfflineAttendanceEntry[]>("readonly", (s) => s.getAll())) ?? [];
  } catch (err) {
    console.warn("[IndexedDB] Gagal membaca antrean:", err);
    return [];
  }
}

// Galat penulisan diteruskan agar pemanggil mengetahui jika penyimpanan gagal
export const putToIdb = (entry: OfflineAttendanceEntry) =>
  withStore("readwrite", (s) => s.put(entry));

export const removeFromIdb = (id: string) =>
  withStore("readwrite", (s) => s.delete(id));

export const deleteManyFromIdb = (ids: string[]) =>
  withStore("readwrite", (s) => {
    ids.forEach((id) => s.delete(id));
  });

export const clearIdbQueue = () =>
  withStore("readwrite", (s) => s.clear());
