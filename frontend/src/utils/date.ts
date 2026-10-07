/**
 * Utilitas penanggalan berbasis zona waktu Indonesia Barat (WIB / Asia/Jakarta).
 */
export const todayWib = (): string =>
  new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });

export const addDaysYmd = (ymd: string, days: number): string =>
  new Date(
    new Date(`${ymd}T00:00:00+07:00`).getTime() + days * 86_400_000,
  ).toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });

export const nowTimeWib = (): string => {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(new Date());
};

export const nowWib = (): string => {
  const now = new Date();
  const d = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  // format en-GB gives "DD/MM/YYYY, HH:mm"
  return `${d.replace(",", "")} WIB`;
};

export const nowYearWib = (): number => {
  const parts = todayWib().split("-");
  return parseInt(parts[0], 10) || new Date().getFullYear();
};

export const isExemptActive = (until?: string | null): boolean =>
  Boolean(until) && until! >= todayWib();

