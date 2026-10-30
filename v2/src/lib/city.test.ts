import { describe, expect, it } from "vitest";
import { fileSnapshot } from "./data/loader";
import { allPins, catFromText, cityAreas, cityDays, cityStays, cleanTip, fitOf, guidePins, heartsByTarget, isInstagramUrl, isMapsUrl, nameFromMapsUrl, ourPins, parseSavedCsv, planPins, savedBy, targetOf, tipFromRow, walkPins, whenOf, type Tip } from "./city";

const snap = fileSnapshot();

describe("categories and times", () => {
  it("reads a category out of any type text", () => {
    expect(catFromText("Cocktail bar")).toBe("bar");
    expect(catFromText("Coffee shop")).toBe("cafe");
    expect(catFromText("Japanese-Western grill")).toBe("food");
    expect(catFromText("Tempura")).toBe("food");
    expect(catFromText("museum", "Nezu Museum")).toBe("culture");
    expect(catFromText("garden")).toBe("park");
    expect(catFromText("Stationery store")).toBe("shop");
    expect(catFromText("Kissaten")).toBe("cafe");
    expect(catFromText("Bakery")).toBe("bakery");
    expect(catFromText("Night club")).toBe("bar");
  });
  it("suggests a time of day", () => {
    expect(whenOf("cafe")).toBe("morning");
    expect(whenOf("bar")).toBe("evening");
    expect(whenOf("shop")).toBe("afternoon");
    expect(whenOf("food")).toBe("any");
  });
});

describe("the layers for Tokyo", () => {
  it("plan pins come from the plan's Tokyo days and carry the date", () => {
    const pins = planPins("tokyo", snap);
    expect(pins.length).toBeGreaterThan(5);
    const tsukiji = pins.find((p) => p.ref.kind === "place" && p.ref.id === "tokyo-tsukiji");
    expect(tsukiji?.date).toBe("2026-12-21");
    expect(tsukiji?.cat).toBe("market");
  });
  it("walk pins exist for Tokyo only, guide pins for every guide city, ours from the saved list and tips", () => {
    expect(walkPins("tokyo").length).toBeGreaterThan(300);
    expect(walkPins("kyoto")).toEqual([]);
    expect(guidePins("tokyo").length).toBeGreaterThan(60);
    expect(guidePins("kyoto").length).toBeGreaterThan(10);
    const tip: Tip = { id: "t1", drop_id: "d1", author_id: "pedro", city: "tokyo", name: "Bar Benfiddich", cat: "bar", note: "Herbal cocktails", lat: 35.69, lng: 139.7, google_place_id: null, photo: null, maps_uri: null, type: null, address: null, source: "maps", source_url: null, source_handle: null, planned_for: "2026-12-22", created_at: "2026-10-30" };
    const ours = ourPins("tokyo", snap, [tip]);
    expect(ours.length).toBe(snap.food_list.length + 1);
    expect(ours.at(-1)?.date).toBe("2026-12-22");
    expect(allPins("tokyo", snap, []).length).toBeGreaterThan(450);
  });
  it("days and stays follow the route", () => {
    expect(cityDays("tokyo", snap).map((d) => d.date)).toEqual(["2026-12-20", "2026-12-21", "2026-12-22", "2026-12-23", "2027-01-07", "2027-01-08", "2027-01-09"]);
    expect(cityStays("tokyo", snap)).toEqual([
      { stop: 1, from: "2026-12-20", to: "2026-12-24" },
      { stop: 1, from: "2027-01-07", to: "2027-01-09" },
    ]);
    expect(cityStays("kyoto", snap)[0].stop).toBe(4);
  });
});

describe("where a pin fits", () => {
  it("knows the areas of a city, with the walks through them", () => {
    const areas = cityAreas("tokyo");
    expect(areas.find((a) => a.id === "asakusa")?.walks).toEqual([3]);
    expect(areas.some((a) => /Nihombashi/.test(a.name))).toBe(true);
    expect(cityAreas("kyoto").length).toBeGreaterThan(2);
    expect(cityAreas("kyoto").some((a) => a.name === "Arashiyama")).toBe(true);
    expect(cityAreas("kanazawa").some((a) => a.name === "Higashi Chaya")).toBe(true);
  });
  it("places a tip near Asakusa on walk 3 and on the Asakusa plan day", () => {
    const areas = cityAreas("tokyo");
    const days = cityDays("tokyo", snap);
    const placeCoords = new Map([["tokyo-asakusa", { lat: 35.7148, lng: 139.7967, name: "Asakusa and Senso-ji" }]]);
    const pin = ourPins("tokyo", snap, [{ id: "t", drop_id: "d", author_id: "pedro", city: "tokyo", name: "Fuglen Asakusa", cat: "cafe", note: null, lat: 35.7145, lng: 139.794, google_place_id: null, photo: null, maps_uri: null, type: null, address: null, source: "maps", source_url: null, source_handle: null, planned_for: null, created_at: "" }]).at(-1)!;
    const fit = fitOf(pin, {}, areas, days, placeCoords);
    expect(fit.area?.name).toBe("Asakusa");
    expect(fit.walks).toEqual([3]);
    expect(fit.days.map((d) => d.date)).toContain("2026-12-22");
    expect(fit.when).toBe("morning");
  });
  it("has nothing to say without coordinates", () => {
    const fit = fitOf(walkPins("tokyo")[0], {}, cityAreas("tokyo"), [], new Map());
    expect(fit.area).toBeNull();
    expect(fit.days).toEqual([]);
  });
});

describe("hearts and notes land on the thing itself", () => {
  it("walk spots and plan places keep their old targets; the rest get their own", () => {
    const walk = walkPins("tokyo")[0];
    expect(targetOf(walk)).toEqual({ type: "walk", id: (walk.ref as { id: string }).id });
    const plan = planPins("tokyo", snap)[0];
    expect(targetOf(plan)).toEqual({ type: "place", id: (plan.ref as { id: string }).id });
    const guide = guidePins("tokyo")[0];
    expect(targetOf(guide)).toEqual({ type: "pin", id: guide.id });
    const hearts = heartsByTarget([
      { id: "1", traveller_id: "pedro", target_type: "walk", target_id: (walk.ref as { id: string }).id, kind: "heart" },
      { id: "2", traveller_id: "mother", target_type: "walk", target_id: (walk.ref as { id: string }).id, kind: "heart" },
      { id: "3", traveller_id: "pedro", target_type: "pin", target_id: guide.id, kind: "not_for_us" },
    ]);
    expect(savedBy(walk, hearts)).toEqual(["pedro", "mother"]);
    expect(savedBy(guide, hearts)).toEqual([]);
  });
});

describe("tips in and out", () => {
  it("cleans what the browser sends", () => {
    expect(cleanTip(null)).toBeNull();
    expect(cleanTip({ name: " ", city: "tokyo" })).toBeNull();
    expect(cleanTip({ name: "X", city: "Tokyo!" })).toBeNull();
    const t = cleanTip({ name: "  Fuglen ", city: "tokyo", cat: "nope", type: "Coffee shop", lat: "35", lng: 139.7, source: "pigeon", planned_for: "tomorrow", note: "" });
    expect(t).toMatchObject({ name: "Fuglen", cat: "cafe", lat: null, lng: 139.7, source: "text", planned_for: null, note: null });
  });
  it("reads a tip row and tolerates junk", () => {
    const t = tipFromRow({ id: "r", drop_id: "d", extracted: { name: "X", city: "tokyo", cat: "nonsense", lat: "no" } }, { author_id: "pedro", created_at: "2026-10-30" });
    expect(t?.cat).toBe("food");
    expect(t?.lat).toBeNull();
    expect(tipFromRow({ id: "r", drop_id: "d", extracted: null }, { author_id: "pedro", created_at: "" })).toBeNull();
  });
  it("recognises links and pulls names from Maps links", () => {
    expect(isMapsUrl("https://maps.app.goo.gl/abc")).toBe(true);
    expect(isInstagramUrl("https://www.instagram.com/p/xyz/")).toBe(true);
    expect(nameFromMapsUrl("https://www.google.com/maps/place/Tonkatsu+Suzuki/@35.68,139.76,17z/data=!3m1")).toBe("Tonkatsu Suzuki");
    expect(nameFromMapsUrl("https://www.google.com/maps/search/?api=1&query=Fuglen%20Asakusa")).toBe("Fuglen Asakusa");
    expect(nameFromMapsUrl("https://maps.app.goo.gl/abc")).toBeNull();
  });
  it("parses a Takeout saved-list CSV", () => {
    const rows = parseSavedCsv('Title,Note,URL,Comment\n"Bar Benfiddich","Herbal cocktails, book",https://www.google.com/maps/place/Bar+Benfiddich/data=x,\n"Kakimori",,https://maps.app.goo.gl/q,"ink"\n');
    expect(rows).toEqual([
      { title: "Bar Benfiddich", note: "Herbal cocktails, book", url: "https://www.google.com/maps/place/Bar+Benfiddich/data=x" },
      { title: "Kakimori", note: "ink", url: "https://maps.app.goo.gl/q" },
    ]);
  });
});
