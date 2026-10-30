/**
 * The Food tab's own data: place ids and the food booking dates.
 * Isomorphic: the loader, the actions and the UI all use it.
 */
import foodDeadlines from "../../data/food-deadlines.json";
import type { Deadline } from "./types";

/** "Otome Zushi" → "otome-zushi"; "Ōmichō" → "omicho". */
export function slug(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** A food place's stable id: `<city>/<slug of its name>`. */
export function placeId(city: string, name: string): string {
  return `${city}/${slug(name)}`;
}

export const FOOD_DEADLINES: Deadline[] = (foodDeadlines.deadlines as Deadline[]).map((d) => ({ ...d, done: false }));

const FOOD_BY_ID = new Map(FOOD_DEADLINES.map((d) => [d.id!, d]));

export function foodDeadline(id: string): Deadline | undefined {
  return FOOD_BY_ID.get(id);
}

/** The trip's deadlines plus the food ones not already stored; stored rows keep their done flag and gain the food fields. */
export function withFoodDeadlines(rows: Deadline[]): Deadline[] {
  const have = new Set(rows.map((d) => d.id));
  const merged = rows.map((d) => {
    const f = d.id ? FOOD_BY_ID.get(d.id) : undefined;
    return f ? { ...f, done: d.done } : d;
  });
  return [...merged, ...FOOD_DEADLINES.filter((d) => !have.has(d.id))];
}
