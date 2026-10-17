import type { Traveller } from "./types";

/** "Pedro and Fernanda": the first names of the people who change the route. */
export function plannerNames(travellers: Pick<Traveller, "name" | "role">[]): string {
  const names = travellers.filter((t) => t.role === "planner").map((t) => t.name.split(" ")[0]);
  if (names.length <= 1) return names[0] ?? "the planners";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function firstName(travellers: Pick<Traveller, "id" | "name">[], id: string | null | undefined): string {
  return travellers.find((t) => t.id === id)?.name.split(" ")[0] ?? "Someone";
}
