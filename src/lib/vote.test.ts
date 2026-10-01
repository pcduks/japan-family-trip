import { describe, expect, it } from "vitest";
import { voteTally } from "./vote";

const routes = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("voteTally", () => {
  it("ranks by favourites and uses second choices to break ties", () => {
    const t = voteTally(
      routes,
      [
        { travellerId: "1", routeId: "a", rank: 1 },
        { travellerId: "2", routeId: "b", rank: 1 },
        { travellerId: "1", routeId: "b", rank: 2 },
      ],
      6,
    );
    expect(t.ranking.map((r) => r.id)).toEqual(["b", "a", "c"]);
    expect(t.majority).toBe(false);
  });

  it("needs more than half of all travellers for a majority", () => {
    const v = (id: string, r: string) => ({ travellerId: id, routeId: r, rank: 1 });
    expect(voteTally(routes, [v("1", "a"), v("2", "a"), v("3", "a")], 6).majority).toBe(false);
    expect(voteTally(routes, [v("1", "a"), v("2", "a"), v("3", "a"), v("4", "a")], 6).majority).toBe(true);
    expect(voteTally(routes, [], 6).leader).toBeNull();
  });
});
