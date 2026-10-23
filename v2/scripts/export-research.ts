/**
 * Writes everything the app knows about the trip as Markdown files, for reading
 * or for handing to another assistant: the route, the other routes, the places,
 * where to stay, deadlines, budget and food. Numbers (costs, checks, how each
 * route feels, how each area fits) come from the app's own code.
 *
 *   npx tsx scripts/export-research.ts <out-dir>
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import areasJson from "../data/areas.json";
import budgetJson from "../data/budget.json";
import foodGuide from "../data/food-guide.json";
import lodgingJson from "../data/lodging.json";
import nbJson from "../data/neighbourhoods.json";
import placesGuide from "../data/places-guide.json";
import routeRules from "../data/route-rules.json";
import shortlistsJson from "../data/shortlists.json";
import stayGuide from "../data/stay-guide.json";
import versionsGuide from "../data/versions-guide.json";
import whyJson from "../data/why.json";
import dayPlans from "../data/day-plans.json";
import { budgetOf, fmtJpy, fmtSgd, stayCost } from "../src/lib/budget";
import { fileSnapshot } from "../src/lib/data/loader";
import { fmtRange } from "../src/lib/dates";
import { planDays } from "../src/lib/days";
import { FEEL_ROWS, feelOf } from "../src/lib/feel";
import { dayOutsOf, FIT_LABEL, fitOf } from "../src/lib/fit";
import { legBetween } from "../src/lib/legs";
import { stopKeys } from "../src/lib/merge";
import { checkVersion, type RulesContext } from "../src/lib/rules";
import type { Shortlist } from "../src/lib/shortlists";
import type { Version } from "../src/lib/types";
import { describeDiff, statsOf } from "../src/lib/versions";

const OUT = process.argv[2];
if (!OUT) throw new Error("Usage: export-research.ts <out-dir>");
const ROOT = join(__dirname, "..", "..");
const snap = fileSnapshot();
const rules: RulesContext = { trip: snap.trip, calendar: snap.calendar, pace: snap.pace, regions: snap.regions, places: snap.places };
const plan = snap.versions.find((v) => v.status === "plan")!;
const region = (id: string) => snap.regions.find((r) => r.id === id);
const rname = (id: string) => region(id)?.name ?? id;
const short = (id: string) => rname(id).split(",")[0].replace(/ \(.*\)$/, "");
const place = (id: string | null | undefined) => (id ? snap.places.find((p) => p.id === id) : undefined);
const VG = (versionsGuide as { versions: Record<string, Record<string, unknown>> }).versions;
const TODAY = new Date().toISOString().slice(0, 10);

// ---------- a plain JSON → Markdown renderer for the guide files ----------

const SKIP = new Set(["id", "from", "lat", "lng", "google_place_id", "photos", "instagram", "hashtags", "videos", "instagram_official", "map", "search", "slug"]);
const LABEL: Record<string, string> = { what_its_like: "What it's like", place_id: "Place", for_her: "For Fernanda", nye: "New Year's Eve", _about: "About this data" };
/** Fields that are the body of an item: shown without a label. */
const BODY = new Set(["blurb", "text", "why", "what", "note", "summary"]);
const human = (k: string) => LABEL[k] ?? k.replace(/^_+/, "").replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase());
const empty = (v: unknown) => v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length);
/** Place ids in the guides read as the place's name. */
const named = (k: string, v: unknown) => ((k === "place" || k === "place_id") && typeof v === "string" ? (place(v)?.name ?? v) : v);
const titleOf = (o: Record<string, unknown>) => (["title", "name", "label", "id", "date", "item"].map((k) => o[k]).find((x) => typeof x === "string") as string | undefined) ?? null;

function render(v: unknown, depth: number, lines: string[], indent = ""): void {
  if (v === null || v === undefined || v === "") return;
  if (typeof v !== "object") {
    lines.push(`${indent}${String(v)}`);
    return;
  }
  if (Array.isArray(v)) {
    for (const x of v) {
      if (x && typeof x === "object" && !Array.isArray(x)) {
        const o = x as Record<string, unknown>;
        const t = titleOf(o);
        const rest = Object.entries(o)
          .filter(([k, val]) => val !== t && !SKIP.has(k) && !empty(val))
          .map(([k, val]) => [k, named(k, val)] as [string, unknown]);
        const simple = rest.every(([, val]) => typeof val !== "object" || val === null);
        if (simple) {
          lines.push(`${indent}- ${t ? `**${t}**` : ""}${rest.length ? (t ? ": " : "") + rest.map(([k, val]) => (BODY.has(k) ? String(val) : `${human(k)}: ${val}`)).join(" · ") : ""}`);
        } else {
          lines.push(`${indent}- ${t ? `**${t}**` : ""}`);
          for (const [k, val] of rest) {
            if (typeof val !== "object") lines.push(`${indent}  - ${human(k)}: ${val}`);
            else {
              lines.push(`${indent}  - ${human(k)}:`);
              render(val, depth + 1, lines, indent + "    ");
            }
          }
        }
      } else if (Array.isArray(x)) render(x, depth, lines, indent);
      else lines.push(`${indent}- ${String(x)}`);
    }
    return;
  }
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (SKIP.has(k) || empty(val)) continue;
    if (typeof val !== "object") {
      lines.push(`${indent}${indent ? "- " : ""}**${human(k)}:** ${val}`);
      if (!indent) lines.push("");
    } else if (indent || depth > 5) {
      lines.push(`${indent}- **${human(k)}:**`);
      render(val, depth + 1, lines, indent + "  ");
    } else {
      lines.push("", `${"#".repeat(Math.min(6, depth))} ${human(k)}`, "");
      render(val, depth + 1, lines, indent);
      lines.push("");
    }
  }
}
const md = (v: unknown, depth = 3) => {
  const l: string[] = [];
  render(v, depth, l);
  return l.join("\n").replace(/\n{3,}/g, "\n\n");
};

// ---------- route pieces ----------

function stayTable(v: Version): string {
  const keys = stopKeys(v.stays);
  const rows = v.stays.map((s, i) => {
    const c = stayCost(s);
    const leg = i ? legBetween(v.stays[i - 1].region, s.region, snap.regions) : null;
    return `| ${i + 1} | ${rname(s.region)} | ${fmtRange(s.from, s.to)} | ${s.nights} | ${s.lodging ?? "—"} | ${leg ? `${leg.hours} h · ${leg.how}${leg.curated ? "" : " (estimate)"}` : "Arrive at Haneda"} | ${fmtJpy(c.perNight)} | ${s.note ?? ""} |`;
  });
  void keys;
  return ["| # | Stop | Dates | Nights | Stay in | Getting there | About a night for seven | Note |", "|---|---|---|---|---|---|---|---|", ...rows].join("\n");
}

function numbers(v: Version): string {
  const b = budgetOf(v, snap.regions);
  const st = statsOf(v, snap);
  const f = feelOf(v, snap, rules);
  const findings = checkVersion(v, rules);
  const lines = [
    `- **Nights:** ${st.nights} · **bases:** ${st.bases} · **moves:** ${st.moves} · **hours between bases:** ${st.travelHours}${st.travelEstimated ? " (some estimated)" : ""}`,
    `- **New Year's Eve in:** ${st.newYearsEve ? rname(st.newYearsEve.region) : "—"}`,
    `- **Cost:** about ${fmtSgd(b.perCoupleSgd)} per couple (target ${fmtSgd(b.targetPerCoupleSgd)}; ${b.headroomSgd >= 0 ? `${fmtSgd(b.headroomSgd)} under` : `${fmtSgd(-b.headroomSgd)} over`}). Whole group about ${fmtSgd(b.totalSgd)} (${fmtJpy(b.totalJpy)}).`,
    `  - Per couple: lodging ${fmtJpy(b.lodging)}, food ${fmtJpy(b.food)}, activities ${fmtJpy(b.activities)}, local transport ${fmtJpy(b.localTransport)}, train fares ${fmtJpy(b.fares)}, luggage ${fmtJpy(b.luggage)}, extras ${fmtJpy(b.extras)}. Rate ${b.currency.jpyPerSgd} JPY per SGD (${b.currency.asOf}).`,
    "",
    "**How it would feel**",
    "",
    ...FEEL_ROWS.map((r) => `- ${r.label}: **${f[r.key] === null ? "—" : r.fmt(f[r.key] as number)}** (${r.note})`),
    "",
    "**What the checks say**",
    "",
    ...(findings.length ? findings.map((x) => `- [${x.severity}] ${x.message}${x.source ? ` (source: ${x.source})` : ""}`) : ["- Nothing flagged."]),
  ];
  return lines.join("\n");
}

function days(v: Version): string {
  return planDays(v, snap)
    .map((d) => {
      const items = d.items.map((it) => {
        const p = place(it.place_id);
        return `  - ${it.slot}${it.crew !== "everyone" ? ` (${it.crew})` : ""}: ${p ? `**${p.name}**` : ""}${p && it.note ? " — " : ""}${it.note ?? ""}`;
      });
      return [`- **${d.date} · ${short(d.region)} · ${d.kind}:** ${d.title}${d.forHer ? `\n  - For Fernanda: ${d.forHer}` : ""}`, ...items].join("\n");
    })
    .join("\n");
}

// ---------- files ----------

mkdirSync(OUT, { recursive: true });
const files: { name: string; what: string }[] = [];
function write(name: string, what: string, body: string) {
  writeFileSync(join(OUT, name), body.replace(/\n{3,}/g, "\n\n").trim() + "\n");
  files.push({ name, what });
}

const travellers = snap.trip.travellers.map((t) => `- ${t.name ?? t.id}${t.role === "planner" ? " (planner)" : ""}${t.notes ? ` — ${t.notes}` : ""}`).join("\n");

// 01 the route
{
  const g = VG.plan ?? {};
  write(
    "01-our-route.md",
    "The route we are taking: stops, dates, journeys, cost, checks, the reasoning and every day planned.",
    [
      `# Our route: ${plan.name}`,
      "",
      `Trip: ${snap.trip.start} to ${snap.trip.end}, ${snap.trip.nights} nights, seven adults. Exported ${TODAY}.`,
      "",
      travellers,
      "",
      `**Gains:** ${plan.gains ?? ""}`,
      "",
      `**Gives up:** ${plan.gives_up ?? ""}`,
      "",
      "## Stops",
      "",
      stayTable(plan),
      "",
      "## The numbers",
      "",
      numbers(plan),
      "",
      "## The route in words",
      "",
      md(g, 3),
      "",
      "## Why this route",
      "",
      md(whyJson, 3),
      "",
      "## Day by day",
      "",
      days(plan),
    ].join("\n"),
  );
}

// 02 other routes
{
  const alts = snap.versions.filter((v) => v.status === "alternative");
  const legacy = snap.versions.filter((v) => v.status === "legacy");
  const feelTable = [
    `| | Our route | ${alts.map((v) => v.name).join(" | ")} |`,
    `|---|---|${alts.map(() => "---").join("|")}|`,
    ...FEEL_ROWS.map((r) => `| ${r.label} | ${[plan, ...alts].map((v) => { const n = feelOf(v, snap, rules)[r.key]; return n === null ? "—" : r.fmt(n as number); }).join(" | ")} |`),
    `| Cost per couple | ${[plan, ...alts].map((v) => fmtSgd(budgetOf(v, snap.regions).perCoupleSgd)).join(" | ")} |`,
  ].join("\n");
  write(
    "02-other-routes.md",
    "The ready-made changes to our route, compared with it, and the earlier whole routes we looked at before the 17 Oct review.",
    [
      "# Other routes",
      "",
      "Our route is the starting point. These are the ready-made changes to it that still pass the checks, then the earlier ideas kept for reference.",
      "",
      "## Side by side",
      "",
      feelTable,
      "",
      ...alts.flatMap((v) => [
        `## ${v.name}`,
        "",
        `**What changes from our route:** ${describeDiff(plan.stays, v.stays, snap.regions).join(" · ") || "Same stops and nights"}`,
        "",
        `**Gains:** ${v.gains ?? ""}`,
        "",
        `**Gives up:** ${v.gives_up ?? ""}`,
        "",
        stayTable(v),
        "",
        numbers(v),
        "",
        md(VG[v.id] ?? {}, 3),
        "",
        "### Day by day",
        "",
        days(v),
        "",
      ]),
      "## Earlier ideas (before the 17 Oct review)",
      "",
      "Whole routes we looked at earlier. Most no longer pass the checks; kept for reference.",
      "",
      ...legacy.flatMap((v) => {
        const g = VG[v.id] as { theme?: string; tagline?: string; feel?: string } | undefined;
        const b = budgetOf(v, snap.regions);
        return [`### ${g?.theme ?? v.name}`, "", g?.tagline ? `*${g.tagline}*` : "", "", v.stays.map((s) => `${short(s.region)} ${s.nights}`).join(" → ") + ` · about ${fmtSgd(b.perCoupleSgd)} per couple`, "", g?.feel ?? "", "", `Gains: ${v.gains ?? ""}`, "", `Gives up: ${v.gives_up ?? ""}`, ""];
      }),
    ].join("\n"),
  );
}

// 03 places
{
  const A = areasJson as unknown as { intro?: string; areas: Record<string, Record<string, unknown>>; heard_of?: unknown[] };
  const dayOuts = dayOutsOf(planDays(plan, snap), new Map(snap.places.map((p) => [p.id, p.region])));
  const PG = (placesGuide as { places: Record<string, unknown>; reputations?: unknown }).places;
  const SG = (stayGuide as { regions: Record<string, unknown> }).regions;
  const order = Object.keys(A.areas).sort((a, b) => {
    const rank = (id: string) => ["route", "daytrip", "change", "elsewhere"].indexOf(fitOf(id, plan.stays, snap.regions, dayOuts).fit);
    return rank(a) - rank(b);
  });
  write(
    "03-places.md",
    "Every part of Japan we looked at (42 areas): how it fits our route, what it is known for, what it is like on our dates, how long to stay, and every place to visit in it.",
    [
      "# Places",
      "",
      A.intro ?? "",
      "",
      "Areas are in order of how they fit our route: on it, a day out from it, would mean a change, another trip. The fit is worked out from the route and the journey times.",
      "",
      ...order.flatMap((id) => {
        const fit = fitOf(id, plan.stays, snap.regions, dayOuts);
        // The verdict's state and fit line were written by hand before the route changed; the computed fit above replaces them.
        const { zone, famous, verdict, ...a } = A.areas[id] as Record<string, unknown> & { verdict?: Record<string, unknown> };
        void zone;
        void famous;
        const { state, fit: _fit, ...v } = verdict ?? {};
        void state;
        void _fit;
        const places = snap.places.filter((p) => p.region === id);
        return [
          `## ${rname(id)}`,
          "",
          `**Fit:** ${FIT_LABEL[fit.fit]} — ${fit.line}`,
          "",
          md({ ...a, verdict: v }, 3),
          SG[id] ? `\n### How long to stay and what is on\n\n${md(SG[id], 4)}` : "",
          places.length ? `\n### Places to visit (${places.length})\n` : "",
          ...places.map((p) => {
            const extra = PG[p.id];
            return [
              `- **${p.name}** (${p.kind}, ${p.size}) — ${p.why}`,
              p.hours ? `  - Hours: ${p.hours}` : "",
              p.closures?.length ? `  - Closed: ${p.closures.map((c) => (typeof c === "string" ? c : JSON.stringify(c))).join("; ")}` : "",
              p.closed_weekdays?.length ? `  - Closed weekdays: ${p.closed_weekdays.join(", ")}` : "",
              `  - For Fernanda: ${p.effort_for_her}${p.effort_note ? `, ${p.effort_note}` : ""}`,
              p.price ? `  - Price: ${p.price}` : "",
              p.booking ? `  - Booking: ${typeof p.booking === "string" ? p.booking : JSON.stringify(p.booking)}` : "",
              p.links?.source ? `  - Source: ${p.links.source}` : "",
              extra ? md(extra, 6).split("\n").filter(Boolean).map((l) => `  ${l.startsWith("-") ? l : "- " + l}`).join("\n") : "",
            ]
              .filter(Boolean)
              .join("\n");
          }),
          "",
        ];
      }),
      A.heard_of?.length ? `## Names people have heard of, and where they are\n\n${md(A.heard_of, 3)}` : "",
    ].join("\n"),
  );
}

// 04 where to stay
{
  const NB = (nbJson as { stops: Record<string, unknown>; researched?: string }).stops;
  const SL = shortlistsJson as unknown as Record<string, Shortlist & { notes?: { title: string; text: string }[] }>;
  const L = lodgingJson as unknown as { ground_rules: unknown; types: unknown; regions: Record<string, unknown>; researched?: string };
  const keys = stopKeys(plan.stays);
  const stopSection = (k: string, i: number | null) => {
    const s = i === null ? null : plan.stays[i];
    const nb = NB[k] as { pick: string; why_pick: string; areas: Record<string, unknown>[]; tips: string[]; sources: { label: string; url: string }[] } | undefined;
    const sl = SL[k];
    const reg = k.split(":")[0];
    return [
      `## ${rname(reg)}${s ? ` · ${fmtRange(s.from, s.to)} · ${s.nights} nights · ${s.lodging}` : ""}`,
      "",
      nb
        ? [
            "### Which part of town",
            "",
            `**Our pick:** ${nb.areas.find((a) => a.id === nb.pick)?.name ?? nb.pick}. ${nb.why_pick}`,
            "",
            ...nb.areas.map((a) => `#### ${a.name}${a.id === nb.pick ? " (our pick)" : ""}\n\n${md({ ...a, name: undefined }, 5)}`),
            "",
            nb.tips.length ? `**When you book:**\n\n${nb.tips.map((t) => `- ${t}`).join("\n")}` : "",
            "",
            nb.sources.length ? `Sources: ${nb.sources.map((x) => `[${x.label}](${x.url})`).join(", ")}` : "",
          ].join("\n")
        : "",
      "",
      sl
        ? [
            `### Places to stay (${sl.candidates.length}, checked ${sl.checked}, best first for the seven of us)`,
            "",
            sl.summary,
            "",
            ...sl.candidates.map((p, n) =>
              [
                `#### ${n + 1}. ${p.name} — ${p.kind}, ${p.tier}`,
                "",
                `- Where: ${p.area}${p.in_pick_area ? "" : " (outside our pick)"}`,
                `- Why: ${p.why}`,
                `- For Fernanda: ${p.for_fernanda}`,
                p.watch_out ? `- Watch out: ${p.watch_out}` : "",
                `- Rooms for us: ${p.rooms_for_us}`,
                `- Beds: ${p.beds}`,
                `- Lift: ${p.lift}`,
                `- Bath: ${p.private_bath}`,
                `- New Year: ${p.new_year}`,
                `- Price: ${p.price}`,
                `- Cancelling: ${p.cancellation}`,
                p.licence ? `- Licence: ${p.licence}` : "",
                `- Book: ${p.book.map((b) => `[${b.label}](${b.url})`).join(" · ")}`,
                p.sources.length ? `- Sources: ${p.sources.join(" , ")}` : "",
              ]
                .filter(Boolean)
                .join("\n"),
            ),
            "",
            ...(sl.notes ?? []).map((x) => `**${x.title}:** ${x.text}\n`),
            "### Enquiry email (English)",
            "",
            "```",
            sl.enquiry.en,
            "```",
            "",
            "### Enquiry email (Japanese)",
            "",
            "```",
            sl.enquiry.ja,
            "```",
          ].join("\n")
        : "",
      "",
      L.regions[reg] && !k.includes(":") ? `### Earlier lodging notes for ${short(reg)} (researched for six)\n\n${md(L.regions[reg], 4)}` : "",
      "",
    ].join("\n");
  };
  const others = Object.keys(NB).filter((k) => !keys.includes(k));
  write(
    "04-where-to-stay.md",
    "For every stop: which part of town and why, the researched places to stay (rooms, beds, lift, bath, New Year, prices, links), the enquiry emails, and the parts of town for stops on the other routes.",
    [
      "# Where to stay",
      "",
      `Seven adults: three couples and Tatiana on her own. Fernanda will be 29–32 weeks pregnant: real beds, a lift or ground floor, a private bath, a short flat walk or taxi. Places to stay checked ${Object.values(SL)[0]?.checked ?? ""}; parts of town researched ${(nbJson as { researched?: string }).researched ?? ""}.`,
      "",
      "Book only on a place's own site or a big booking site, and never pay through a link someone sends you: fake 'confirm your booking' messages went out in autumn 2026 after a ryokan booking system (TEMAIRAZU) was hacked.",
      "",
      "## Ground rules",
      "",
      md(L.ground_rules, 3),
      "",
      "## Kinds of place",
      "",
      md(L.types, 3),
      "",
      ...keys.map((k, i) => stopSection(k, i)),
      others.length ? "# Stops on the other routes (part of town only)\n" : "",
      ...others.map((k) => stopSection(k, null)),
    ].join("\n"),
  );
}

// 05 deadlines, budget, rules
write(
  "05-deadlines-budget-rules.md",
  "Every booking deadline, how the budget is worked out, and the rules the checks use (busy travel days, how many nights a place can fill, hospitals).",
  [
    "# Deadlines, budget and the rules behind the checks",
    "",
    "## Deadlines",
    "",
    ...snap.deadlines
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => `- **${d.date}:** ${d.item}${d.source ? ` (${d.source})` : ""}`),
    "",
    "## Budget",
    "",
    md(budgetJson, 3),
    "",
    "## Route rules",
    "",
    md(routeRules, 3),
    "",
    "## The calendar",
    "",
    md(snap.calendar, 3),
    "",
    "## Pace",
    "",
    md(snap.pace, 3),
  ].join("\n"),
);

// 06 food
{
  const deep = join(ROOT, "v2", "data", "food-deep");
  const parts = readdirSync(deep)
    .filter((f) => f.endsWith(".json") && f !== "photos.json")
    .map((f) => {
      const d = JSON.parse(readFileSync(join(deep, f), "utf8")) as Record<string, unknown>;
      return `## ${d.name ?? f}\n\n${md({ ...d, name: undefined, slug: undefined }, 3)}`;
    });
  write("06-food.md", "How we eat on this trip, ryokan meals, what suits Fernanda, and the food guide for every town.", ["# Food", "", md(foodGuide, 2), "", "# Food by town", "", ...parts].join("\n"));
}

// 07 day plans per place
write("07-day-plans-by-place.md", "The ready-made day plans for every place (what a good day there looks like, which days it can't be done), which the routes are built from.", ["# Day plans by place", "", md(dayPlans, 2)].join("\n"));

// copies of the written research
const copy = (from: string, to: string, what: string) => {
  mkdirSync(join(OUT, to.split("/").slice(0, -1).join("/")), { recursive: true });
  copyFileSync(join(ROOT, from), join(OUT, to));
  files.push({ name: to, what });
};
copy("docs/research/route-review-2026-10-17.md", "research/route-review-2026-10-17.md", "The 17 Oct review of the route that led to dropping Takayama (latest reasoning on the route).");
for (const f of readdirSync(join(ROOT, "docs/research/plan-doc")).filter((f) => f.endsWith(".md"))) copy(`docs/research/plan-doc/${f}`, `research/plan-doc/${f}`, "The plan doc (12–13 Oct): the plan, why each stay is this long, what we're missing, region guides.");
for (const f of readdirSync(join(ROOT, "docs/research")).filter((f) => /^0\d-.*\.md$/.test(f))) copy(`docs/research/${f}`, `research/background/${f}`, "Background research from 1 Oct: events, closures, transport, lodging, pregnancy, regions.");
for (const f of readdirSync(join(ROOT, "docs/research/food")).filter((f) => /^\d\d-.*\.md$/.test(f))) copy(`docs/research/food/${f}`, `research/food/${f}`, "Food research: critics, sources, restaurants, shops by region.");

// index
const grouped = new Map<string, string[]>();
for (const f of files) grouped.set(f.what, [...(grouped.get(f.what) ?? []), f.name]);
writeFileSync(
  join(OUT, "00-README.md"),
  [
    "# Japan, winter 2026–27: everything we know",
    "",
    `Exported ${TODAY} from the family's trip app (regenerate with \`cd v2 && npx tsx scripts/export-research.ts ../docs/export\`). Seven adults, ${snap.trip.start} to ${snap.trip.end}.`,
    "",
    travellers,
    "",
    `Our route: ${plan.stays.map((s) => `${short(s.region)} ${s.nights}`).join(" → ")}.`,
    "",
    "**Which to trust when they disagree:** the numbered files (01–07) are the current state and are newest. `research/route-review-2026-10-17.md` is the latest reasoning on the route; it replaced the Takayama stop in `research/plan-doc/01-the-plan.md`. `research/background/` is the 1 Oct groundwork (still the source for closures, events, transport and pregnancy facts). Prices and availability for places to stay were checked on 23 Oct 2026 and change fast.",
    "",
    "## Files",
    "",
    ...Array.from(grouped).map(([what, names]) => `- ${names.length > 3 ? `\`${names[0].split("/").slice(0, -1).join("/")}/\` (${names.length} files)` : names.map((n) => `\`${n}\``).join(", ")}: ${what}`),
    "",
  ].join("\n"),
);
console.log(files.length + 1, "files in", OUT);
