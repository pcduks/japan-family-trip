/** Route inks per theme (hex, because the Google map needs real colours). */
const LIGHT: Record<string, string> = { A: "#2d4a7a", B: "#2e6a4e", C: "#bb3b27", D: "#7b3a5c", M: "#86591a" };
const DARK: Record<string, string> = { A: "#93acdb", B: "#83bb9c", C: "#ec8a72", D: "#d19ab8", M: "#dcae60" };

export function routeColor(code: string, fallback: string, theme: "light" | "dark"): string {
  return (theme === "dark" ? DARK[code] : LIGHT[code]) ?? fallback;
}

/** Text colour that reads on top of a route colour. */
export function onRouteColor(theme: "light" | "dark"): string {
  return theme === "dark" ? "#12161e" : "#fffaf2";
}

/** A stable ink per traveller, for avatars and "who's going". */
const PERSON_INKS = ["var(--vermilion)", "var(--indigo)", "var(--pine)", "var(--plum)", "var(--amber)", "var(--ink-2)"];
export function personInk(index: number): string {
  return PERSON_INKS[((index % PERSON_INKS.length) + PERSON_INKS.length) % PERSON_INKS.length];
}
