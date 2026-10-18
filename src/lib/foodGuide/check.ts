import type { FoodCity, FoodTopic, Pregnancy } from "./types";

const PREG: Pregnancy[] = ["ok", "cuidado", "evitar"];

/** Schema problems in a city file; empty when it's fine. */
export function checkCity(c: FoodCity, file: string): string[] {
  const out: string[] = [];
  const at = (s: string) => out.push(`${file}: ${s}`);
  if (!c.slug || !c.name) at("needs slug and name");
  if (file !== `${c.slug}.json`) at(`file name should be ${c.slug}.json`);
  c.meibutsu?.forEach((m, i) => {
    if (!m.name_pt || !m.what_pt) at(`meibutsu[${i}] needs name_pt and what_pt`);
    if (m.pregnancy && !PREG.includes(m.pregnancy)) at(`meibutsu[${i}].pregnancy "${m.pregnancy}"`);
  });
  c.areas?.forEach((a, i) => {
    if (!a.name || !a.story_pt) at(`areas[${i}] needs name and story_pt`);
  });
  c.places?.forEach((p, i) => {
    if (!p.name) at(`places[${i}] needs name`);
    const s = p.tabelog?.score;
    if (s != null && (typeof s !== "number" || s < 2.5 || s > 5)) at(`places[${i}] (${p.name}) tabelog.score ${s}`);
    if (p.tabelog?.url && !/^https:\/\/(s\.)?tabelog\.com\//.test(p.tabelog.url)) at(`places[${i}] (${p.name}) tabelog.url ${p.tabelog.url}`);
  });
  c.shops?.forEach((s, i) => {
    if (!s.name || !s.what_pt) at(`shops[${i}] needs name and what_pt`);
  });
  return out;
}

export function checkTopic(t: FoodTopic, file: string): string[] {
  const out: string[] = [];
  const at = (s: string) => out.push(`${file}: ${s}`);
  if (!t.slug || !t.title_pt || !Array.isArray(t.sections)) at("needs slug, title_pt and sections");
  if (file !== `topics/${t.slug}.json`) at(`file name should be topics/${t.slug}.json`);
  t.sections?.forEach((s, i) => {
    if (!s.title_pt) at(`sections[${i}] needs title_pt`);
    s.items?.forEach((it, j) => {
      if (!it.name) at(`sections[${i}].items[${j}] needs name`);
      if (it.pregnancy && !PREG.includes(it.pregnancy)) at(`sections[${i}].items[${j}].pregnancy "${it.pregnancy}"`);
    });
  });
  return out;
}
