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

export function validJourneyTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Resolve a Brasília wall-clock time without depending on the device's time zone. */
export function journeyStartInstant(value: string, time: string): number | null {
  const date = journeyDate(value);
  if (!date || !validJourneyTime(time)) return null;
  const target = Date.parse(`${date}T${time}:00Z`);
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: JOURNEY_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  let instant = target;
  for (let i = 0; i < 3; i++) {
    const parts = formatter.formatToParts(new Date(instant));
    const get = (type: string) => parts.find(part => part.type === type)?.value ?? "";
    const displayed = Date.parse(`${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:00Z`);
    const correction = target - displayed;
    if (correction === 0) return instant;
    instant += correction;
  }
  return null;
}

export function journeyElapsed(value: string, time: string, now = new Date()) {
  const start = journeyStartInstant(value, time);
  const seconds = Math.floor(Math.max(0, start === null ? 0 : now.getTime() - start) / 1000);
  return { days: Math.floor(seconds / 86400), hours: Math.floor(seconds / 3600) % 24, minutes: Math.floor(seconds / 60) % 60, seconds: seconds % 60 };
}
