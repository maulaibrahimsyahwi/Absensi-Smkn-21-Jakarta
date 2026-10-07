import { useEffect, useRef, useState } from "react";

export function useNewIds(ids: Array<string | number>) {
  const seen = useRef<Set<string | number> | null>(null);
  const [fresh, setFresh] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(ids);
      return;
    }
    const added = ids.filter((id) => !seen.current!.has(id));
    if (!added.length) return;
    added.forEach((id) => seen.current!.add(id));
    setFresh(new Set(added));
    const t = setTimeout(() => setFresh(new Set()), 2500);
    return () => clearTimeout(t);
  }, [ids]);

  return fresh;
}
