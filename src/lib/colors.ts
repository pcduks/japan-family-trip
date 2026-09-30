/** Route colours tuned for each theme (dark variants from the prototype). */
const DARK: Record<string, string> = { A: "#86a9e0", B: "#7fb497", C: "#e27b62", D: "#d6b163", M: "#b3a3dc" };
const LIGHT: Record<string, string> = { M: "#6b5b95" };

export function routeColor(code: string, fallback: string, theme: "light" | "dark"): string {
  return (theme === "dark" ? DARK[code] : LIGHT[code]) ?? fallback;
}

/** Text colour that reads on top of a route colour. */
export function onRouteColor(theme: "light" | "dark"): string {
  return theme === "dark" ? "#11151c" : "#ffffff";
}
