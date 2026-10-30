import "server-only";
/**
 * Turning what someone pasted or photographed into real places to confirm.
 * A Google Maps link gives a name (or a spot); an Instagram link gives its
 * caption when Instagram lets us read it; a screenshot or a paragraph is read
 * by Claude when the key is set, otherwise each line is tried as a name.
 * Every guess ends as a short list of Google candidates with a photo.
 */
import { extractPlacesFromDrop, type DropImage } from "../anthropic/extract";
import { catFromText, isInstagramUrl, isMapsUrl, nameFromMapsUrl, type TipSource } from "../city";
import { tripData } from "../data/file";
import type { SpotCat } from "../tokyo";
import { searchCandidates, spotById, type SpotHit } from "../google/places";
import { inBatches } from "../google/resolve";

export interface Guess {
  name: string;
  cat: SpotCat;
  note: string | null;
  source: TipSource;
  source_url: string | null;
  source_handle: string | null;
}

export interface Found {
  guess: Guess;
  candidates: SpotHit[];
}

export interface FindInput {
  city: string;
  text?: string;
  images?: DropImage[];
  /** Rows of an exported saved list: each is searched by title (its Maps link first when it names the place). */
  lines?: { title: string; note?: string | null; url?: string | null }[];
  /** Where to look first (the city centre, or an area the person is browsing). */
  bias?: { lat: number; lng: number; radiusM?: number };
}

export interface FindResult {
  items: Found[];
  /** Something the person should know: a link we could not read, a key that is missing. */
  hint: string | null;
}

const MAX_ITEMS = 40;
const hasReader = () => Boolean(process.env.ANTHROPIC_API_KEY);

function cityBias(city: string, bias?: FindInput["bias"]) {
  if (bias) return { lat: bias.lat, lng: bias.lng, radiusM: bias.radiusM ?? 3000 };
  const r = tripData().regions.find((x) => x.id === city);
  return r ? { lat: r.lat, lng: r.lng, radiusM: city === "tokyo" ? 25000 : 15000 } : undefined;
}

function cityName(city: string): string {
  return tripData().regions.find((x) => x.id === city)?.name ?? city;
}

const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;

export async function findTips(input: FindInput): Promise<FindResult> {
  const bias = cityBias(input.city, input.bias);
  const where = cityName(input.city);
  const text = (input.text ?? "").trim();
  if (input.lines?.length) return fromLines(input.lines, bias, where);
  // Three links at most, and only public web hosts: this server fetches them.
  const urls = [...new Set(text.match(URL_RE) ?? [])].filter(publicUrl).slice(0, 3);
  const rest = text.replace(URL_RE, " ").replace(/[ \t]+/g, " ").trim();
  const hints: string[] = [];
  const guesses: Guess[] = [];
  /** Pins found straight from a link, keyed by name so the search step can skip them. */
  const direct = new Map<string, SpotHit>();
  let freeText = rest;

  for (const url of urls) {
    if (isMapsUrl(url)) {
      const g = await fromMapsUrl(url);
      if (g.guess) guesses.push(g.guess);
      if (g.hit) {
        guesses.push({ name: g.hit.name, cat: catFromText(g.hit.type, g.hit.name), note: null, source: "maps", source_url: url, source_handle: null });
        direct.set(g.hit.name, g.hit);
      }
      if (!g.guess && !g.hit) hints.push("That Maps link didn't name a place. Paste the place's name too.");
    } else if (isInstagramUrl(url)) {
      const caption = await instagramCaption(url);
      if (caption) freeText = `${freeText}\n${caption}`.trim();
      else hints.push("Instagram won't show us that post. Paste its caption, or a screenshot, and we'll read the places out of it.");
    } else {
      // Any other page: its title and description are often enough.
      const meta = await pageMeta(url);
      if (meta) freeText = `${freeText}\n${meta}`.trim();
    }
  }

  const handle = freeText.match(/@([a-z0-9._]{2,30})/i)?.[1] ?? null;
  const sourceUrl = urls.find((u) => isInstagramUrl(u)) ?? urls.find((u) => !isMapsUrl(u)) ?? null;
  const source: TipSource = input.images?.length ? "screenshot" : sourceUrl && isInstagramUrl(sourceUrl) ? "instagram" : "text";

  if (input.images?.length || freeText) {
    if (hasReader()) {
      try {
        const x = await extractPlacesFromDrop({ images: input.images, text: freeText || undefined, url: sourceUrl ?? undefined });
        for (const p of x.places) {
          if (p.confidence === "low" && x.places.length > 3) continue;
          guesses.push({
            name: p.city_or_area && !new RegExp(p.city_or_area, "i").test(p.name) ? `${p.name}, ${p.city_or_area}` : p.name,
            cat: catFromText(p.type, p.dishes.join(" "), p.name),
            note: [p.why, p.dishes.length ? p.dishes.slice(0, 3).join(", ") : null, p.price_hint].filter(Boolean).join(" · ") || null,
            source,
            source_url: sourceUrl,
            source_handle: p.source_handle ?? handle,
          });
        }
        if (!x.places.length && (input.images?.length || freeText)) hints.push("No place names in there that we could read.");
      } catch (e) {
        hints.push(`Reading failed (${(e as Error).message}).`);
        guesses.push(...linesAsGuesses(freeText, source, sourceUrl, handle));
      }
    } else {
      if (input.images?.length) hints.push("Screenshots need the reading key (ANTHROPIC_API_KEY). Paste the names instead.");
      guesses.push(...linesAsGuesses(freeText, source, sourceUrl, handle));
    }
  }

  const unique = dedupe(guesses).slice(0, MAX_ITEMS);
  const items = await inBatches(unique, 4, async (g): Promise<Found> => {
    const hit = direct.get(g.name);
    if (hit) return { guess: g, candidates: [hit] };
    const q = /, |tokyo|kyoto|japan/i.test(g.name) ? g.name : `${g.name}, ${where}`;
    const candidates = await searchCandidates(q, bias, 3).catch(() => [] as SpotHit[]);
    return { guess: { ...g, cat: candidates[0] ? catFromText(candidates[0].type, g.cat === "food" ? "" : g.cat, g.name) : g.cat }, candidates };
  });
  return { items, hint: hints[0] ?? null };
}

function dedupe(gs: Guess[]): Guess[] {
  const seen = new Set<string>();
  return gs.filter((g) => {
    const k = g.name.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Without a reader: each short line is a name; a longer one is skipped. */
function linesAsGuesses(text: string, source: TipSource, sourceUrl: string | null, handle: string | null): Guess[] {
  return text
    .split(/\n|;|•|·/)
    .map((l) => l.replace(/^[\s\-–—*\d.)]+/, "").trim())
    .filter((l) => l.length >= 2 && l.length <= 60 && !/^@/.test(l))
    .map((l) => {
      const m = l.match(/^(.*?)\s*[-–—:(]\s*(.+?)\)?$/);
      const name = m ? m[1].trim() : l;
      const note = m ? m[2].trim() : null;
      return { name, cat: catFromText(note, name), note, source, source_url: sourceUrl, source_handle: handle };
    });
}

/** An exported list, row by row: the Maps link when it names the place, else the title near the city. */
async function fromLines(lines: NonNullable<FindInput["lines"]>, bias: ReturnType<typeof cityBias>, where: string): Promise<FindResult> {
  const rows = lines.filter((l) => l && typeof l.title === "string" && l.title.trim()).slice(0, 60);
  const items = await inBatches(rows, 4, async (l): Promise<Found> => {
    const title = l.title.trim().slice(0, 120);
    const note = typeof l.note === "string" && l.note.trim() ? l.note.trim().slice(0, 300) : null;
    const base: Guess = { name: title, cat: catFromText(note, title), note, source: "list", source_url: l.url ?? null, source_handle: null };
    if (l.url && isMapsUrl(l.url)) {
      const g = await fromMapsUrl(l.url).catch(() => ({ guess: null, hit: null }));
      if (g.hit) return { guess: { ...base, cat: catFromText(g.hit.type, note, title) }, candidates: [g.hit] };
    }
    const candidates = await searchCandidates(`${title}, ${where}`, bias, 2).catch(() => [] as SpotHit[]);
    return { guess: { ...base, cat: candidates[0] ? catFromText(candidates[0].type, note, title) : base.cat }, candidates };
  });
  return { items, hint: rows.length < lines.length ? `Only the first ${rows.length} rows were looked up; import the rest in another go.` : null };
}

/* --------------------------------------------------------------- links */

/** Only http(s) links to public hosts leave this server: no IP literals, localhost, private names or metadata endpoints. */
export function publicUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const h = u.hostname.toLowerCase();
    if (!h.includes(".") || /^\[|^\d+\.\d+\.\d+\.\d+$/.test(h)) return false;
    if (/(^|\.)(localhost|local|internal|lan|home|corp|arpa)$/.test(h) || /metadata|169\.254/.test(h)) return false;
    return true;
  } catch {
    return false;
  }
}

async function expand(url: string): Promise<string> {
  let u = url;
  for (let i = 0; i < 5; i++) {
    if (!publicUrl(u)) return url;
    const res = await fetch(u, { method: "GET", redirect: "manual", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000) }).catch(() => null);
    const loc = res?.headers.get("location");
    if (!res || !loc || res.status < 300 || res.status >= 400) return u;
    u = new URL(loc, u).toString();
  }
  return u;
}

/** The first bytes of a page's body, without reading the whole thing. */
async function readSome(res: Response, max = 200_000): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const dec = new TextDecoder();
  let out = "";
  while (out.length < max) {
    const { done, value } = await reader.read();
    if (done) break;
    out += dec.decode(value, { stream: true });
  }
  reader.cancel().catch(() => undefined);
  return out.slice(0, max);
}

async function fromMapsUrl(url: string): Promise<{ guess: Guess | null; hit: SpotHit | null }> {
  const full = /maps\.app\.goo\.gl|goo\.gl\/maps|\/maps\/@|\?q=|maps\.google/.test(url) && !/\/maps\/place\//.test(url) ? await expand(url) : url;
  let u: URL | null = null;
  try {
    u = new URL(full);
  } catch {}
  const placeId = u?.searchParams.get("query_place_id") ?? u?.searchParams.get("place_id") ?? null;
  if (placeId) {
    const hit = await spotById(placeId).catch(() => null);
    if (hit) return { guess: null, hit };
  }
  const name = nameFromMapsUrl(full);
  const at = full.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ?? full.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (name) {
    if (at) {
      const hits = await searchCandidates(name, { lat: Number(at[1]), lng: Number(at[2]), radiusM: 800 }, 1).catch(() => [] as SpotHit[]);
      if (hits[0]) return { guess: null, hit: hits[0] };
    }
    return { guess: { name, cat: catFromText(name), note: null, source: "maps", source_url: url, source_handle: null }, hit: null };
  }
  return { guess: null, hit: null };
}

const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

function meta(html: string, prop: string): string | null {
  const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, "i")) ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, "i"));
  return m ? decodeEntities(m[1]) : null;
}

function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
}

/** An Instagram post's caption from its page metadata, when Instagram serves it without a login. */
async function instagramCaption(url: string): Promise<string | null> {
  try {
    const res = await fetch(url.split("?")[0], { headers: { "User-Agent": UA, Accept: "text/html" }, signal: AbortSignal.timeout(7000), cache: "no-store", redirect: "manual" });
    if (!res.ok) return null;
    const html = await readSome(res);
    const parts = [meta(html, "og:title"), meta(html, "og:description"), meta(html, "description")].filter((x): x is string => !!x && x.length > 12);
    const joined = [...new Set(parts)].join("\n");
    return /log in|login/i.test(joined) && joined.length < 80 ? null : joined || null;
  } catch {
    return null;
  }
}

async function pageMeta(url: string): Promise<string | null> {
  try {
    if (!publicUrl(url)) return null;
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, signal: AbortSignal.timeout(7000), cache: "no-store", redirect: "manual" });
    if (!res.ok) return null;
    const html = await readSome(res);
    const title = meta(html, "og:title") ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null;
    const desc = meta(html, "og:description") ?? meta(html, "description");
    return [title, desc].filter(Boolean).join("\n") || null;
  } catch {
    return null;
  }
}
