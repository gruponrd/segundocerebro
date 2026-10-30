const DAY_MS = 86_400_000;
export const JOURNEY_TIME_ZONE = "America/Sao_Paulo";

/** A journey starts on a calendar day, not on a UTC instant. */
export function journeyToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: JOURNEY_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function validJourneyDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

/** Read legacy ISO values without rewriting them or shifting their date prefix. */
export function journeyDate(value: string): string | null {
  const date = value.slice(0, 10);
  if (!validJourneyDate(date)) return null;
  if (value !== date && (!/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value)))) return null;
  return date;
}

export function journeyDays(value: string, now = new Date()): number {
  const start = journeyDate(value);
  if (!start) return 0;
  return Math.max(0, Math.round((Date.parse(`${journeyToday(now)}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS));
}

export function journeyDateLabel(value: string): string {
  const date = journeyDate(value);
  return date ? date.split("-").reverse().join("/") : "Data inválida";
}
