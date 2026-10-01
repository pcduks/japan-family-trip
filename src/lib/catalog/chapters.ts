import chaptersJson from "../../../data/chapters.json";
import type { Catalog, ExperienceCard } from "./types";

/**
 * A chapter: a region with a personality, the top-down step before the card
 * deck. Seven of them cover the catalog. Each one says plainly what the
 * nights of 24 and 31 December look like, because those two evenings decide
 * the trip more than any single experience.
 */
export interface Chapter {
  id: string;
  name_pt: string;
  /** Two lines, the invitation. */
  promise_pt: string;
  /** "Um dia típico": three short sentences. */
  typical_day_pt: string[];
  tradeoffs: {
    /** 1 mild, 2 cold, 3 very cold. */
    cold: 1 | 2 | 3;
    /** 1 little train, 2 a long leg, 3 several long legs. */
    train: 1 | 2 | 3;
    /** Fit for her at 30 weeks: 1 easy, 2 with care, 3 demanding. */
    her: 1 | 2 | 3;
    note_pt: string;
  };
  /** Base slugs the chapter is built from, main base first. */
  bases: string[];
  /** The perinatal city used for 29 Dec – 3 Jan when this chapter holds New Year; null when it cannot. */
  ny_base: string | null;
  /** Night of 24 December. */
  xmas_eve: { where_pt: string; open_pt: string; evening_pt: string };
  /** Night of 31 December. */
  nye: { where_pt: string; open_pt: string; evening_pt: string };
  /** Deck card ids that belong to this chapter, in display order. */
  cards: string[];
  /** Two or three concrete things, for the card's back. */
  examples_pt: string[];
  /** Short budget line, e.g. "mais caro: hospedagem de neve". */
  cost_pt: string;
  /** Up to three Google Places text queries for real photos, one per example. */
  photo_queries?: string[];
  order: number;
}

export type ChapterAnswer = "yes" | "meh" | "no";

export function loadChapters(): Chapter[] {
  return [...(chaptersJson as unknown as Chapter[])].sort((a, b) => a.order - b.order);
}

export function chapterCards(chapter: Chapter, catalog: Catalog): ExperienceCard[] {
  const by = new Map(catalog.cards.map((c) => [c.id, c]));
  return chapter.cards.map((id) => by.get(id)).filter((c): c is ExperienceCard => Boolean(c));
}
