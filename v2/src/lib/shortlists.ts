/**
 * Places to stay we found for each stop (data/shortlists.json), keyed like the
 * stops ("tokyo", "tokyo:2"), with an enquiry email to send them.
 */
import data from "../../data/shortlists.json";

export interface ShortlistPlace {
  id: string;
  name: string;
  kind: string;
  area: string;
  in_pick_area: boolean;
  rooms_for_us: string;
  beds: string;
  lift: string;
  private_bath: string;
  for_fernanda: string;
  new_year: string;
  price: string;
  tier: "budget" | "mid" | "splurge";
  cancellation: string;
  licence?: string;
  why: string;
  watch_out: string;
  book: { label: string; url: string }[];
  sources: string[];
}

export interface Shortlist {
  stop: string;
  dates: string;
  checked: string;
  summary: string;
  candidates: ShortlistPlace[];
  enquiry: { en: string; ja: string };
  /** Things worth knowing at this stop that are not about one place. */
  notes?: { title: string; text: string }[];
}

const LISTS = data as Record<string, Shortlist>;

export function shortlistFor(stopKey: string): Shortlist | null {
  return LISTS[stopKey] ?? null;
}

/** The reaction and comment target for one place on one stop's list. */
export const lodgingTarget = (stopKey: string, id: string) => `${stopKey}:${id}`;
