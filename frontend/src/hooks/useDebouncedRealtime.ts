import { useEffect, useRef } from "react";
import { useRealtimeSubscription } from "../services/realtimeService";

export function useDebouncedRealtime(
  channels: string[],
  onChange: () => void,
  delay = 1200,
) {
  const latest = useRef(onChange);
  latest.current = onChange;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useRealtimeSubscription(channels, () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => latest.current(), delay);
  });

  useEffect(() => () => clearTimeout(timer.current), []);
}
