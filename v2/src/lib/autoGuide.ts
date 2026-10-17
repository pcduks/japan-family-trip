/**
 * The story of a route nobody wrote a guide for (one the family built):
 * theme, tagline, what it feels like in travel order, what it does, how it
 * differs from where it started and from the route. Seeded routes keep their
 * written guide (data/versions-guide.json).
 */
import { areaInfo } from "./areas";
import { versionGuide, type VersionGuide } from "./guide";
import { describeDiff, movesOf, statsOf } from "./versions";
import type { Snapshot, Version } from "./types";

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const word = (n: number) => WORDS[n] ?? String(n);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const firstSentence = (s: string | undefined) => (s ? (s.match(/^[^.!?]*[.!?]/)?.[0] ?? s).trim() : "");

function hoursText(h: number): string {
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  if (!whole) return `${min} minutes`;
  return min ? `${whole} h ${min}` : whole === 1 ? "an hour" : `${whole} hours`;
}

export function guideFor(v: Version, snapshot: Pick<Snapshot, "versions" | "regions" | "pace" | "travellers">): VersionGuide {
  const own = versionGuide(v.id);
  if (own) return own;
  const name = (id: string) => snapshot.regions.find((r) => r.id === id)?.name.replace(/ Onsen$/, "") ?? id;
  const st = statsOf(v, snapshot);
  const moves = movesOf(v.stays, snapshot.regions);
  const nye = st.newYearsEve ? name(st.newYearsEve.region) : "a place still to choose";

  const parts = v.stays.map((s, i) => {
    const feel = firstSentence(areaInfo(s.region)?.feel);
    const nights = `${word(s.nights)} ${s.nights === 1 ? "night" : "nights"}`;
    if (i === 0) return `${cap(nights)} in ${name(s.region)} to start${feel ? `: ${feel}` : "."}`;
    const m = moves.find((x) => x.index === i);
    const back = v.stays.slice(0, i).some((x) => x.region === s.region);
    const how = m ? ` (${hoursText(m.hours)}, ${m.how})` : "";
    if (back) return `Back to ${name(s.region)}${how} for ${nights}${i === v.stays.length - 1 ? " before the flight" : ""}.`;
    return `Then to ${name(s.region)}${how} for ${nights}${feel ? `: ${feel}` : "."}`;
  });

  const seen = new Set<string>();
  const activities = v.stays
    .filter((s) => (seen.has(s.region) ? false : (seen.add(s.region), true)))
    .map((s) => {
      const k = areaInfo(s.region)?.known_for.map((x) => x.title.toLowerCase()).slice(0, 4) ?? [];
      return k.length ? `${name(s.region)}: ${k.join(", ")}` : name(s.region);
    });

  const parent = v.parent_version_id ? snapshot.versions.find((x) => x.id === v.parent_version_id) : null;
  const plan = snapshot.versions.find((x) => x.status === "plan");
  const author = snapshot.travellers.find((t) => t.id === v.owner)?.name.split(" ")[0];
  const fromParent = parent ? describeDiff(parent.stays, v.stays, snapshot.regions) : [];
  const fromPlan = plan && plan.id !== v.id ? describeDiff(plan.stays, v.stays, snapshot.regions) : [];
  const parentName = parent ? (versionGuide(parent.id)?.theme ?? parent.name) : null;
  const why = parent
    ? `${author ? `${author}’s` : "A"} route, started from “${parentName}”${fromParent.length ? `: ${fromParent.join("; ")}.` : ", unchanged so far."}`
    : `${author ? `${author}’s` : "A"} route, built stop by stop.`;
  const longest = moves.reduce((a, m) => Math.max(a, m.hours), 0);
  const suits =
    st.moves <= 4
      ? "Fernanda and the parents: few check-ins and long stays."
      : st.moves >= 8
        ? "João and Carolina, who want to see a lot; long on trains for Fernanda."
        : longest > 4
          ? `Most of the family, with one long move (${hoursText(longest)}) to plan around for Fernanda.`
          : "The whole family at a middle pace: every move four hours or less.";

  return {
    theme: v.name,
    tagline: `${cap(word(st.bases))} bases over ${st.nights} nights, ${word(st.moves)} check-ins, New Year’s Eve in ${nye}.`,
    feel: parts.join(" "),
    activities,
    why,
    suits,
    trade: fromPlan.length ? `Compared with the route: ${fromPlan.join("; ")}.` : "The same stops as the route.",
    stay_notes: {},
  };
}
