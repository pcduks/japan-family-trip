/**
 * The deep food guide: per city (history, dishes, markets, Tabelog-checked
 * restaurants with critic notes, shops) and per topic (calendar, depachika,
 * station food, konbini, manners). Data in data/food-deep/, research in
 * docs/research/food/.
 */
import calendar from "../../data/food-deep/topics/calendar.json";
import depachika from "../../data/food-deep/topics/depachika.json";
import ekiben from "../../data/food-deep/topics/ekiben.json";
import etiquette from "../../data/food-deep/topics/etiquette.json";
import konbini from "../../data/food-deep/topics/konbini.json";
import hakone from "../../data/food-deep/hakone.json";
import hiroshima from "../../data/food-deep/hiroshima.json";
import kanazawa from "../../data/food-deep/kanazawa.json";
import kawaguchiko from "../../data/food-deep/kawaguchiko.json";
import kyoto from "../../data/food-deep/kyoto.json";
import nagano from "../../data/food-deep/nagano.json";
import nara from "../../data/food-deep/nara.json";
import takayama from "../../data/food-deep/takayama.json";
import tokyo from "../../data/food-deep/tokyo.json";
import yudanaka from "../../data/food-deep/yudanaka.json";

export type Pregnancy = "ok" | "careful" | "avoid";
/** Can the seven of us sit together: tables, a room, the counter bought out, two tables (4+3), unclear, or not. */
export type Seven = "yes" | "room" | "counter" | "split" | "ask" | "no";
export type Channel = "online" | "phone" | "walk-in" | "hotel" | "queue";
export type Meal = "lunch" | "dinner";
export type Weekday = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

export type DeepPlace = NonNullable<DeepCity["places"]>[number];
export type DeepDish = NonNullable<DeepCity["meibutsu"]>[number];
export type DeepArea = NonNullable<DeepCity["areas"]>[number];

export interface DeepCity {
  slug: string;
  name: string;
  tagline?: string;
  history?: string[];
  winter?: string;
  meibutsu?: { name: string; name_ja?: string; romaji?: string; what: string; where?: string; price?: string; must?: boolean; pregnancy?: Pregnancy; pregnancy_note?: string; glance?: string; story?: string }[];
  areas?: { name: string; name_ja?: string; kind?: string; story: string; eat?: string[]; tips?: string; dec_jan?: string; query?: string; glance?: string }[];
  places?: {
    name: string;
    name_ja?: string;
    area?: string;
    genre?: string;
    price?: string;
    tabelog?: { score?: number | null; reviews?: number | null; url?: string; awards?: string };
    critics?: { who: string; note?: string; url?: string }[];
    why?: string;
    order?: string;
    pregnancy_note?: string;
    group?: string;
    booking?: string;
    dec_jan?: string;
    query?: string;
    pregnancy?: Pregnancy;
    seven?: Seven;
    closed_weekdays?: Weekday[];
    closed_dates?: string[];
    meals?: Meal[];
    booking_channel?: Channel;
    booking_opens?: string;
    website?: string;
    glance?: string;
  }[];
  shops?: { name: string; name_ja?: string; what: string; buy?: string; price?: string; dec_jan?: string; query?: string }[];
  sources?: string[];
}

export interface DeepTopic {
  slug: string;
  title: string;
  intro?: string[];
  sections: { title: string; body?: string; items?: { name: string; name_ja?: string; what?: string; where?: string; price?: string; must?: boolean; pregnancy?: Pregnancy; tip?: string }[] }[];
  sources?: string[];
}

export const DEEP_CITIES: Record<string, DeepCity> = Object.fromEntries(
  ([tokyo, yudanaka, kanazawa, kyoto, nara, kawaguchiko, takayama, hakone, nagano, hiroshima] as unknown as DeepCity[]).map((c) => [c.slug, c]),
);

export const DEEP_TOPICS: Record<string, DeepTopic> = Object.fromEntries(
  ([calendar, depachika, ekiben, konbini, etiquette] as unknown as DeepTopic[]).map((t) => [t.slug, t]),
);

/** Which deep guides a Food tab shows (the Kyoto tab carries Nara, as the rest of Food does). */
export const DEEP_FOR_TAB: Record<string, string[]> = {
  tokyo: ["tokyo"],
  yudanaka: ["yudanaka", "nagano"],
  kanazawa: ["kanazawa"],
  takayama: ["takayama"],
  kyoto: ["kyoto", "nara"],
  kawaguchiko: ["kawaguchiko"],
  hakone: ["hakone"],
  hiroshima: ["hiroshima"],
};

/** Which region's food section covers a place's region (Gero sits with Takayama, Nara with Kyoto). */
export const FOOD_REGION: Record<string, string> = { tokyo: "tokyo", kanazawa: "kanazawa", shirakawago: "kanazawa", takayama: "takayama", gero: "takayama", okuhida: "takayama", kyoto: "kyoto", nara: "kyoto", kawaguchiko: "kawaguchiko", hakone: "hakone", yudanaka: "yudanaka", nagano: "yudanaka", hiroshima: "hiroshima" };

/** Tabs that only carry the deep guide (no section in data/food-guide.json), placed after the region they follow on the route. */
export const DEEP_ONLY_TABS: { id: string; label: string; after: string }[] = [
  { id: "yudanaka", label: "Yudanaka and Nagano", after: "tokyo" },
  { id: "hiroshima", label: "Hiroshima", after: "hakone" },
];

/** The how-to tabs: the calendar leads, the rest follow the cities. */
export const TOPIC_TABS: { id: string; label: string }[] = [
  { id: "calendar", label: "Book by…" },
  { id: "depachika", label: "Depachika" },
  { id: "ekiben", label: "Station food" },
  { id: "konbini", label: "Konbini" },
  { id: "etiquette", label: "Manners" },
];

const PREG: Pregnancy[] = ["ok", "careful", "avoid"];
const SEVEN: Seven[] = ["yes", "room", "counter", "split", "ask", "no"];
const CHANNEL: Channel[] = ["online", "phone", "walk-in", "hotel", "queue"];
const WEEKDAYS: Weekday[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Schema problems in the deep guide; empty when it's fine. */
export function checkDeep(): string[] {
  const out: string[] = [];
  for (const [slug, c] of Object.entries(DEEP_CITIES)) {
    if (!c.name) out.push(`${slug}: no name`);
    c.meibutsu?.forEach((m, i) => {
      if (!m.name || !m.what) out.push(`${slug}.meibutsu[${i}] needs name and what`);
      if (m.pregnancy && !PREG.includes(m.pregnancy)) out.push(`${slug}.meibutsu[${i}].pregnancy ${m.pregnancy}`);
    });
    c.areas?.forEach((a, i) => (!a.name || !a.story) && out.push(`${slug}.areas[${i}] needs name and story`));
    c.places?.forEach((p, i) => {
      if (!p.name) out.push(`${slug}.places[${i}] needs name`);
      const s = p.tabelog?.score;
      if (s != null && (typeof s !== "number" || s < 2.5 || s > 5)) out.push(`${slug}.places[${i}] tabelog ${s}`);
      if (p.tabelog?.url && !/^https:\/\/(s\.)?tabelog\.com\//.test(p.tabelog.url)) out.push(`${slug}.places[${i}] tabelog url ${p.tabelog.url}`);
      const at = `${slug}.places[${i}] ${p.name}`;
      if (p.pregnancy && !PREG.includes(p.pregnancy)) out.push(`${at}: pregnancy ${p.pregnancy}`);
      if (p.seven && !SEVEN.includes(p.seven)) out.push(`${at}: seven ${p.seven}`);
      if (p.booking_channel && !CHANNEL.includes(p.booking_channel)) out.push(`${at}: booking_channel ${p.booking_channel}`);
      p.closed_weekdays?.forEach((d) => !WEEKDAYS.includes(d) && out.push(`${at}: closed_weekdays ${d}`));
      p.closed_dates?.forEach((d) => !(/^\d{4}-\d{2}-\d{2}$/.test(d) && d >= "2026-12-20" && d <= "2027-01-09") && out.push(`${at}: closed_dates ${d}`));
      p.meals?.forEach((m) => !["lunch", "dinner"].includes(m) && out.push(`${at}: meals ${m}`));
      if (p.website && !/^https?:\/\//.test(p.website)) out.push(`${at}: website ${p.website}`);
      if (p.glance && p.glance.split(/\s+/).length > 16) out.push(`${at}: glance too long`);
    });
    c.shops?.forEach((s, i) => (!s.name || !s.what) && out.push(`${slug}.shops[${i}] needs name and what`));
  }
  for (const [slug, t] of Object.entries(DEEP_TOPICS)) {
    if (!t.title || !Array.isArray(t.sections)) out.push(`topic ${slug}: needs title and sections`);
    t.sections?.forEach((s, i) => {
      if (!s.title) out.push(`topic ${slug}.sections[${i}] needs title`);
      s.items?.forEach((it, j) => {
        if (!it.name) out.push(`topic ${slug}.sections[${i}].items[${j}] needs name`);
        if (it.pregnancy && !PREG.includes(it.pregnancy)) out.push(`topic ${slug}.sections[${i}].items[${j}].pregnancy ${it.pregnancy}`);
      });
    });
  }
  return out;
}
