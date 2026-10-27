import { describe, expect, it } from "vitest";
import { tripData } from "./data/file";
import { legsOf } from "./journey";
import { legsInText, mainSeatTip, SEAT_REMINDERS, SEAT_TIPS, seatTipsFor, withSeatAsk, withSeatReminders } from "./seats";

const ids = (from: string, to: string) => seatTipsFor(from, to).map((t) => t.tip.id);

describe("seat tips by leg", () => {
  it("gives the Fuji side on the Tokaido shinkansen, either way, with the timing for where you board", () => {
    const east = mainSeatTip("kyoto", "kawaguchiko");
    expect(east?.tip.id).toBe("tokaido-fuji");
    expect(east?.tip.badge).toBe("Seat E");
    expect(east?.when).toMatch(/after Kyoto/);
    const west = mainSeatTip("kawaguchiko", "kyoto");
    expect(west?.tip.id).toBe("tokaido-fuji");
    expect(west?.when).toBe("right after Mishima");
    expect(mainSeatTip("hakone", "kyoto")?.when).toMatch(/after Odawara/);
    expect(mainSeatTip("tokyo", "kyoto")?.when).toMatch(/after Tokyo/);
    expect(mainSeatTip("yokohama", "kyoto")?.when).toMatch(/after Shin-Yokohama/);
    // Boarding somewhere the data has no minutes for still says which way to look.
    expect(mainSeatTip("osaka", "tokyo")?.when).toBe("just after Shizuoka");
    expect(ids("kyoto", "hakone")).toContain("tokaido-luggage");
  });

  it("gives Asama on Tokyo ↔ Nagano and the Alps on Nagano ↔ Kanazawa, either way", () => {
    expect(mainSeatTip("tokyo", "nagano")?.tip.id).toBe("hokuriku-asama");
    expect(mainSeatTip("nagano", "tokyo")?.tip.id).toBe("hokuriku-asama");
    expect(mainSeatTip("yudanaka", "kanazawa")?.tip.id).toBe("hokuriku-tateyama");
    expect(mainSeatTip("kanazawa", "tokyo")?.tip.id).toBe("hokuriku-tateyama");
    // Tokyo ↔ Kanazawa passes both: E first, A as the other side.
    expect(ids("tokyo", "kanazawa").slice(0, 2)).toEqual(["hokuriku-tateyama", "hokuriku-asama"]);
    // The Sea of Japan glimpse is not on the Tokyo – Nagano stretch.
    expect(ids("tokyo", "nagano")).not.toContain("hokuriku-itoigawa");
  });

  it("puts the Nagaden's front seats on every move to or from Yudanaka, boarding at Nagano", () => {
    const toOnsen = seatTipsFor("tokyo", "yudanaka");
    expect(toOnsen.map((t) => t.tip.id)).toEqual(["hokuriku-asama", "nagaden-yukemuri"]);
    expect(toOnsen[1].board).toBe("Nagano");
    expect(seatTipsFor("yudanaka", "nagano").map((t) => t.board)).toEqual(["Yudanaka"]);
    expect(ids("kanazawa", "yudanaka")).toEqual(["hokuriku-tateyama", "nagaden-yukemuri", "hokuriku-itoigawa"]);
  });

  it("gives nothing where there is no view to sit for", () => {
    expect(seatTipsFor("kanazawa", "kyoto")).toEqual([]); // west to Tsuruga, then the Thunderbird
    expect(seatTipsFor("kawaguchiko", "tokyo")).toEqual([]); // Fuji Excursion, not the shinkansen
    expect(seatTipsFor("kyoto", "nara")).toEqual([]);
    expect(seatTipsFor("tokyo", "tokyo")).toEqual([]);
    expect(seatTipsFor("", "kyoto")).toEqual([]);
  });

  it("gives the same tips to the plan and to a route that swaps the Fuji stop", () => {
    const d = tripData();
    for (const v of d.versions.filter((x) => x.status !== "legacy")) {
      const legs = legsOf(v.stays, d.regions);
      const fuji = legs.find((l) => l.fromRegion === "kyoto" && (l.toRegion === "kawaguchiko" || l.toRegion === "hakone"));
      if (fuji) expect(mainSeatTip(fuji.fromRegion, fuji.toRegion)?.tip.badge).toBe("Seat E");
      const onsen = legs.find((l) => l.toRegion === "yudanaka");
      if (onsen) expect(ids(onsen.fromRegion, onsen.toRegion)).toContain("nagaden-yukemuri");
    }
  });

  it("every tip has a source and a place at each end", () => {
    for (const t of SEAT_TIPS) {
      expect(t.sources.length, t.id).toBeGreaterThan(0);
      expect(Object.keys(t.ends[0]).length, t.id).toBeGreaterThan(0);
      expect(Object.keys(t.ends[1]).length, t.id).toBeGreaterThan(0);
    }
  });
});

describe("seat letters on the booking reminders", () => {
  it("reads the moves in a reminder", () => {
    expect(legsInText("10:00 JST: reserve the Kagayaki Nagano → Kanazawa for 27 Dec")).toEqual([["nagano", "kanazawa"]]);
    expect(legsInText("reserve the shinkansen Kyoto → Mishima for 5 Jan (or Kyoto → Odawara for Hakone)")).toEqual([
      ["kyoto", "kawaguchiko"],
      ["kyoto", "hakone"],
    ]);
  });

  it("adds the seat once, and leaves other reminders alone", () => {
    const fuji = withSeatAsk({ date: "2026-12-05", item: "10:00 JST: reserve the shinkansen Kyoto → Mishima for 5 Jan (or Kyoto → Odawara for Hakone)" });
    expect(fuji.item.match(/seat E/g)).toHaveLength(1);
    expect(fuji.item).toMatch(/Mt Fuji\.$/);
    expect(withSeatAsk(fuji).item).toBe(fuji.item);
    expect(withSeatAsk({ date: "2026-11-24", item: "reserve shinkansen seats Tokyo → Nagano for 24 Dec" }).item).toMatch(/seat A/);
    const thunderbird = { date: "2026-11-30", item: "reserve the 30 Dec trains, Hokuriku shinkansen Kanazawa → Tsuruga and the Thunderbird to Kyoto" };
    expect(withSeatAsk(thunderbird)).toBe(thunderbird);
  });

  it("adds the Nagaden dates once, keeping a stored tick", () => {
    expect(SEAT_REMINDERS.map((d) => d.date)).toEqual(["2026-11-23", "2026-11-25"]);
    const first = withSeatReminders([{ id: "dl-1", date: "2026-11-24", item: "reserve Tokyo → Nagano" }]);
    expect(first).toHaveLength(1 + SEAT_REMINDERS.length);
    const stored = withSeatReminders([{ id: SEAT_REMINDERS[0].id, date: "2026-11-23", item: "old text", done: true }]);
    expect(stored).toHaveLength(SEAT_REMINDERS.length);
    expect(stored[0]).toMatchObject({ item: SEAT_REMINDERS[0].item, done: true });
  });
});
