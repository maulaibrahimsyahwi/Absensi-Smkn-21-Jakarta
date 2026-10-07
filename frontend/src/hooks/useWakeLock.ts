import { useEffect } from "react";

export function useWakeLock(enabled = true) {
  useEffect(() => {
    if (
      !enabled ||
      typeof navigator === "undefined" ||
      !("wakeLock" in navigator)
    )
      return;
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        /* ditolak browser */
      }
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      document.removeEventListener("visibilitychange", acquire);
      lock?.release().catch(() => {});
    };
  }, [enabled]);
}

export default useWakeLock;
