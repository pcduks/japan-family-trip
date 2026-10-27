/**
 * Where to sit on the train for the views, from data/seat-tips.json.
 *
 * Tips belong to a line, not a date: a move gets a tip when it runs from a
 * place at one end of the tip's stretch to a place at the other, in either
 * direction. So the same tip shows on whichever route is being viewed, and
 * follows a stop if the family moves it. Isomorphic: the loader, the actions
 * and the UI all use it.
 */
import seatTips from "../../data/seat-tips.json";
import type { Deadline } from "./types";

type End = Record<string, string | null>;

export interface SeatTip {
  id: string;
  line: string;
  /** "seat": where to sit; "note": something else to know on that train. */
  kind: "seat" | "note";
  weight: number;
  /** A few words for the day's train badge: "Seat E". */
  badge: string;
  headline: string;
  /** The words added to a booking reminder for this move; null for notes. */
  ask: string | null;
  where: string;
  when_from: Record<string, string>;
  when_default: [string | null, string | null];
  detail: string | null;
  ends: [End, End];
  sources: { label: string; url: string }[];
}

interface SeatData {
  checked: string;
  rule: string;
  tips: SeatTip[];
  stations: Record<string, string>;
  reminders: Deadline[];
}

const DATA = seatTips as unknown as SeatData;

export const SEAT_RULE = DATA.rule;
export const SEATS_CHECKED = DATA.checked;
export const SEAT_TIPS = DATA.tips;

export interface SeatTipOnLeg {
  tip: SeatTip;
  /** The station you board this train at, when the tip knows it. */
  board: string | null;
  /** When to look, for this direction and boarding station. */
  when: string | null;
}

/** The station for a place at one end of a tip's stretch, or undefined when the place is not at that end. "*" is any place. */
function at(end: End, region: string): string | null | undefined {
  if (region in end) return end[region];
  if ("*" in end) return end["*"];
  return undefined;
}

/** The tips for a move from one place to another, most useful first (ties keep the file's order). */
export function seatTipsFor(from: string, to: string, tips: SeatTip[] = SEAT_TIPS): SeatTipOnLeg[] {
  if (!from || !to || from === to) return [];
  const out: (SeatTipOnLeg & { order: number })[] = [];
  tips.forEach((tip, order) => {
    for (const dir of [0, 1] as const) {
      const board = at(tip.ends[dir], from);
      if (board === undefined || at(tip.ends[1 - dir], to) === undefined) continue;
      // A "*" end must not swallow the named end's own place.
      if (!(from in tip.ends[dir]) && !(to in tip.ends[1 - dir])) continue;
      const when = (board ? tip.when_from[board] : undefined) ?? tip.when_default[dir] ?? null;
      out.push({ tip, board, when, order });
      return;
    }
  });
  return out.sort((a, b) => b.tip.weight - a.tip.weight || a.order - b.order).map(({ tip, board, when }) => ({ tip, board, when }));
}

/** The one seat to ask for on a move: the most useful seat tip. */
export function mainSeatTip(from: string, to: string, tips: SeatTip[] = SEAT_TIPS): SeatTipOnLeg | null {
  return seatTipsFor(from, to, tips).find((t) => t.tip.kind === "seat") ?? null;
}

/** "Tokyo → Nagano for 24 Dec" → [["tokyo", "nagano"]]: the moves a booking reminder is about. */
export function legsInText(text: string, stations: Record<string, string> = DATA.stations): [string, string][] {
  const out: [string, string][] = [];
  for (const m of text.matchAll(/([A-Z][A-Za-z-]+)\s*(?:→|->)\s*([A-Z][A-Za-z-]+)/g)) {
    const a = stations[m[1]];
    const b = stations[m[2]];
    if (a && b && a !== b) out.push([a, b]);
  }
  return out;
}

/** A booking reminder with the seat to ask for added, once per seat, when it books a move with a view. */
export function withSeatAsk(d: Deadline, tips: SeatTip[] = SEAT_TIPS): Deadline {
  const asks: string[] = [];
  for (const [a, b] of legsInText(d.item)) {
    const ask = mainSeatTip(a, b, tips)?.tip.ask;
    if (ask && !asks.includes(ask) && !d.item.includes(ask)) asks.push(ask);
  }
  if (!asks.length) return d;
  const item = d.item.replace(/[.\s]+$/, "");
  return { ...d, item: `${item}. ${asks.join(". ")}.` };
}

export const SEAT_REMINDERS: Deadline[] = DATA.reminders.map((d) => ({ ...d, done: false }));
const REMINDER_BY_ID = new Map(SEAT_REMINDERS.map((d) => [d.id!, d]));

export function seatReminder(id: string): Deadline | undefined {
  return REMINDER_BY_ID.get(id);
}

/** The trip's deadlines with the seat letters added, plus the seat reservation dates not already stored (stored ones keep their done flag). */
export function withSeatReminders(rows: Deadline[]): Deadline[] {
  const have = new Set(rows.map((d) => d.id));
  const merged = rows.map((d) => {
    const r = d.id ? REMINDER_BY_ID.get(d.id) : undefined;
    return r ? { ...r, done: d.done } : withSeatAsk(d);
  });
  return [...merged, ...SEAT_REMINDERS.filter((d) => !have.has(d.id))];
}
