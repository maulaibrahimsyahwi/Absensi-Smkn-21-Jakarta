import { useEffect, useRef } from "react";
import api from "./api";

/**
 * Realtime Synchronization Service SMKN 21 Jakarta.
 * Menggabungkan 3 mekanisme sinkronisasi:
 * 1. BroadcastChannel API ("smkn21_realtime_bus") -> Sinkronisasi seketika (0ms) antar tab browser.
 * 2. Window Storage Event -> Fallback multi-jendela jika BroadcastChannel tidak aktif.
 * 3. Adaptive Micro-pulse Polling (/api/realtime/pulse) -> Sinkronisasi lintas perangkat fisik (Gate tablet vs Laptop guru)
 *    hanya membaca status ~120 byte tanpa membebani query SQL atau database locks.
 */

export interface RealtimeEventPayload {
  changedModules: string[];
  isLocalMutation: boolean;
}

export type RealtimeSubscriberCallback = (event: RealtimeEventPayload) => void;

export interface RealtimeSubscriber {
  modules: string[];
  callback: RealtimeSubscriberCallback;
}

class RealtimeBus {
  channelName: string;
  broadcastChannel: BroadcastChannel | null;
  subscribers: Set<RealtimeSubscriber>;
  lastVersion: number | string | null;
  lastModules: Record<string, number>;
  pulseTimer: ReturnType<typeof setInterval> | number | null;
  isPolling: boolean;

  constructor() {
    this.channelName = "smkn21_realtime_bus";
    this.broadcastChannel = null;
    this.subscribers = new Set<RealtimeSubscriber>();
    this.lastVersion = null;
    this.lastModules = {};
    this.pulseTimer = null;
    this.isPolling = false;

    this.initBroadcastChannel();
    this.initStorageListener();
    this.initVisibilityListener();
    this.startPulsePolling();
  }

  initBroadcastChannel(): void {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(this.channelName);
        this.broadcastChannel.onmessage = (event: MessageEvent) => {
          if (event.data && event.data.modules) {
            this.notifySubscribers(event.data.modules, false);
          }
        };
      } catch (err) {
        console.warn("[RealtimeBus] BroadcastChannel not supported:", err);
      }
    }
  }

  initStorageListener(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e: StorageEvent) => {
        if (e.key === "smkn21_realtime_sync_event" && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            if (data && data.modules) {
              this.notifySubscribers(data.modules, false);
            }
          } catch {
            // ignore JSON error
          }
        }
      });
    }
  }

  initVisibilityListener(): void {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
          // Tab kembali aktif dibuka, segera cek pulse
          this.checkPulse();
          this.restartPollingWithInterval(2500);
        } else {
          // Tab di background, kurangi frekuensi ke 15 detik
          this.restartPollingWithInterval(15000);
        }
      });

      window.addEventListener("focus", () => {
        this.checkPulse();
      });
    }
  }

  startPulsePolling(intervalMs = 2500): void {
    if (this.pulseTimer) clearInterval(this.pulseTimer);
    this.pulseTimer = setInterval(() => {
      this.checkPulse();
    }, intervalMs);
    // Jalankan satu kali segera
    this.checkPulse();
  }

  restartPollingWithInterval(intervalMs: number): void {
    if (this.pulseTimer) clearInterval(this.pulseTimer);
    this.pulseTimer = setInterval(() => {
      this.checkPulse();
    }, intervalMs);
  }

  async checkPulse(): Promise<void> {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const res = await api.get("/realtime/pulse");
      if (res.data && res.data.success) {
        const { version, modules } = res.data;

        if (this.lastVersion === null) {
          this.lastVersion = version;
          this.lastModules = modules || {};
          this.isPolling = false;
          return;
        }

        if (version !== this.lastVersion) {
          // Cari modul apa saja yang versinya berubah
          const changedModules: string[] = [];
          if (modules) {
            for (const [modKey, timestamp] of Object.entries(modules)) {
              if (
                !this.lastModules[modKey] ||
                (timestamp as number) > this.lastModules[modKey]
              ) {
                changedModules.push(modKey);
              }
            }
          }

          this.lastVersion = version;
          this.lastModules = modules || {};

          const notifyList =
            changedModules.length > 0 ? changedModules : ["all"];
          this.notifySubscribers(notifyList, false);
        }
      }
    } catch {
      // Endpoint pulse gagal / offline, abaikan tanpa mengganggu UI
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Panggil fungsi ini setelah ada aksi mutasi lokal di frontend (misal submit izin, scan presensi)
   * agar tab lain langsung mendapatkan sinyal perubahan seketika (0ms).
   */
  notifyLocalMutation(modules: string | string[] = ["all"]): void {
    const list = Array.isArray(modules) ? modules : [modules];

    // 1. Broadcast ke tab lain via BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          modules: list,
          timestamp: Date.now(),
        });
      } catch {
        // ignore
      }
    }

    // 2. Storage event fallback
    try {
      localStorage.setItem(
        "smkn21_realtime_sync_event",
        JSON.stringify({ modules: list, timestamp: Date.now() }),
      );
    } catch {
      // ignore
    }

    // 3. Beri tahu server agar perangkat lain juga menerima update
    api.post("/realtime/notify", { module: list[0] || "all" }).catch(() => {});

    // 4. Beri tahu listener internal tab saat ini
    this.notifySubscribers(list, true);
  }

  notifySubscribers(changedModules: string | string[], isLocalMutation = false): void {
    const changedSet = new Set(
      Array.isArray(changedModules) ? changedModules : [changedModules],
    );
    const hasAll = changedSet.has("all");

    this.subscribers.forEach((sub) => {
      try {
        if (
          hasAll ||
          sub.modules.some((mod) => changedSet.has(mod) || mod === "all")
        ) {
          sub.callback({
            changedModules: Array.from(changedSet),
            isLocalMutation,
          });
        }
      } catch (err) {
        console.error("[RealtimeBus] Subscriber error:", err);
      }
    });
  }

  subscribe(modules: string | string[], callback: RealtimeSubscriberCallback): () => void {
    const moduleList = Array.isArray(modules) ? modules : [modules];
    const subRecord: RealtimeSubscriber = {
      modules: moduleList,
      callback,
    };
    this.subscribers.add(subRecord);

    return () => {
      this.subscribers.delete(subRecord);
    };
  }
}

export const realtimeService = new RealtimeBus();

/**
 * Custom React Hook untuk berlangganan perubahan data realtime.
 */
export function useRealtimeSubscription(
  modules: string | string[],
  callback: RealtimeSubscriberCallback
): void {
  const cbRef = useRef<RealtimeSubscriberCallback>(callback);
  cbRef.current = callback;

  const moduleKey = Array.isArray(modules) ? modules.join(",") : modules;

  useEffect(() => {
    const unsub = realtimeService.subscribe(modules, (event) => {
      if (cbRef.current) {
        cbRef.current(event);
      }
    });

    return () => {
      unsub();
    };
  }, [moduleKey]);
}

export default realtimeService;
