import type { SpotCat } from "@/lib/tokyo";

/** Small line glyphs per spot category, drawn in a 24×24 box; stroke follows currentColor. */
const PATHS: Record<SpotCat, string> = {
  cafe: "M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8zM16 10h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2",
  bakery: "M4 12a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v6H4zM9 8v10M15 8v10",
  food: "M3 11h18a9 9 0 0 1-18 0zM8 3l2 7M16 3l-2 7",
  sweets: "M8 10a4 4 0 1 1 8 0v1H8zM8 11l4 10 4-10",
  bar: "M6 3h12l-6 9v6M8 21h8M8 7h8",
  shop: "M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2",
  book: "M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h7z",
  park: "M12 21v-6M12 15c-5 0-7-4-7-7 4 0 7 2 7 7zm0 0c5 0 7-4 7-7-4 0-7 2-7 7z",
  culture: "M4 5q8-3 16 0M6 9h12M8 5v16M16 5v16",
  market: "M3 10h18l-2 10H5zM8 10l3-6M16 10l-3-6M9 14v3M15 14v3",
  view: "M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  spa: "M4 15q4-3 8 0t8 0M4 19q4-3 8 0t8 0M9 11q-2-2 0-4t0-4M15 11q-2-2 0-4t0-4",
  transit: "M6 4h12v12H6zM6 10h12M9 16l-2 4M15 16l2 4M9 13h.01M15 13h.01",
};

export function CatIcon({ cat, size = 16, className = "" }: { cat: SpotCat; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={PATHS[cat]} />
    </svg>
  );
}
