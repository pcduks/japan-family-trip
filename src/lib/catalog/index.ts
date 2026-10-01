import type { Base, Catalog, ExperienceCard, TransitLeg } from "./types";
import cards from "../../../data/experiences.json";
import bases from "../../../data/bases.json";
import transit from "../../../data/transit.json";

export type { Base, Catalog, ExperienceCard, TransitLeg } from "./types";

/** The researched catalog, bundled read-only like trip-data.json. */
export function loadCatalog(): Catalog {
  return {
    cards: cards as unknown as ExperienceCard[],
    bases: bases as unknown as Base[],
    transit: transit as unknown as TransitLeg[],
    generated_at: "",
  };
}

export function cardById(catalog: Catalog, id: string): ExperienceCard | undefined {
  return catalog.cards.find((c) => c.id === id);
}

export function baseBySlug(catalog: Catalog, slug: string): Base | undefined {
  return catalog.bases.find((b) => b.slug === slug);
}

/** Legs are stored once; lookups are symmetric. */
export function legBetween(catalog: Catalog, from: string, to: string): TransitLeg | undefined {
  return catalog.transit.find((l) => (l.from === from && l.to === to) || (l.from === to && l.to === from));
}

/** The 36-card trunk deck, in the fixed order everyone sees. */
export function deckCards(catalog: Catalog): ExperienceCard[] {
  return catalog.cards.filter((c) => c.deck_group).sort((a, b) => (a.deck_order ?? 0) - (b.deck_order ?? 0));
}
