import { useEffect, useRef } from "react";
import api from "./api";

/**
 * Realtime Synchronization Service SMKN 21 Jakarta.
 * Menggabungkan 3 mekanisme sinkronisasi:
 * 1. BroadcastChannel API ("smkn21_realtime_bus") -> Sinkronisasi seketika (0ms) antar tab browser.
 * 2. Window Storage Event -> Fallback multi-jendela jika BroadcastChannel tidak aktif.
 * 3. Lazy Micro-pulse Polling (/api/realtime/pulse) -> Sinkronisasi lintas perangkat fisik dengan backoff & jitter.
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
  pulseTimer: ReturnType<typeof setTimeout> | null = null;
  isPolling: boolean;
  failures = 0;
  seen: string[] = [];

  constructor() {
    this.channelName = "smkn21_realtime_bus";
    this.broadcastChannel = null;
    this.subscribers = new Set<RealtimeSubscriber>();
    this.lastVersion = null;
    this.lastModules = {};
    this.isPolling = false;

    this.initBroadcastChannel();
    this.initStorageListener();
    this.initVisibilityListener();
  }

  initBroadcastChannel(): void {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(this.channelName);
        this.broadcastChannel.onmessage = (event: MessageEvent) => {
          if (!this.firstSeen(event.data?.id)) return;
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
            if (!this.firstSeen(data?.id)) return;
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
    if (typeof document === "undefined") return;
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.subscribers.size) {
        this.checkPulse().finally(() => this.schedule());
      }
    });
  }

  private delay(): number {
    const base = document.hidden ? 30_000 : 4_000;
    return Math.min(60_000, base * 2 ** this.failures) * (0.85 + Math.random() * 0.3); // backoff + jitter
  }

  private schedule(): void {
    if (this.pulseTimer) clearTimeout(this.pulseTimer);
    if (this.subscribers.size === 0) return;
    this.pulseTimer = setTimeout(async () => {
      await this.checkPulse();
      this.schedule();
    }, this.delay());
  }

  startPulsePolling(): void {
    this.checkPulse().finally(() => this.schedule());
  }

  stopPulsePolling(): void {
    if (this.pulseTimer) clearTimeout(this.pulseTimer);
    this.pulseTimer = null;
    this.lastVersion = null; // pelanggan baru mulai dari baseline baru
  }

  private firstSeen(id?: string): boolean {
    if (!id) return true;
    if (this.seen.includes(id)) return false;
    this.seen.push(id);
    if (this.seen.length > 30) this.seen.shift();
    return true;
  }

  async checkPulse(): Promise<void> {
    if (this.isPolling || !navigator.onLine || !localStorage.getItem("smkn21_auth_token")) return;
    this.isPolling = true;

    try {
      const res = await api.get("/realtime/pulse");
      this.failures = 0;
      if (res.data && res.data.success) {
        const { version, modules } = res.data;

        if (this.lastVersion === null) {
          this.lastVersion = version;
          this.lastModules = modules || {};
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
      this.failures = Math.min(this.failures + 1, 4);
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
    const evt = { modules: list, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` };

    try {
      this.broadcastChannel?.postMessage(evt);
    } catch {
      // ignore
    }

    try {
      localStorage.setItem("smkn21_realtime_sync_event", JSON.stringify(evt));
    } catch {
      // ignore
    }

    Promise.allSettled(list.map((m) => api.post("/realtime/notify", { module: m })));
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
    if (this.subscribers.size === 1) this.startPulsePolling();

    return () => {
      this.subscribers.delete(subRecord);
      if (this.subscribers.size === 0) this.stopPulsePolling();
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
