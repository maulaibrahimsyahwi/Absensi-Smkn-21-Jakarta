/**
 * Unwraps API response that can be an array directly or wrapped in `{ data: [] }`.
 */
export const unwrapList = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  const inner = (payload as { data?: unknown } | null)?.data;
  return Array.isArray(inner) ? (inner as T[]) : [];
};
