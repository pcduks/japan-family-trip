import { TRIP_END, TRIP_START } from "./types";

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(iso: string): number {
  return parseISO(iso).getUTCDay();
}

/** Every date of the trip, 20 Dec … 9 Jan (21 days). */
export function tripDates(): string[] {
  const out: string[] = [];
  for (let d = TRIP_START; d <= TRIP_END; d = addDays(d, 1)) out.push(d);
  return out;
}

export function stayEnd(stay: { startDate: string; nights: number }): string {
  return addDays(stay.startDate, stay.nights);
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export function formatDay(iso: string): string {
  const d = parseISO(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
