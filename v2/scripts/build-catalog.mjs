// Turns the two research catalogues (docs/research/05, 06) into src/data/catalog.json:
// the 156 experience cards, each mapped to one of the app's areas. Run by sync-data.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "..", "docs", "research");

/** Catalogue "base" (then "region") → app area id. */
const BASE = {
  Nikkō: "nikko", Kinugawa: "nikko", Yumoto: "nikko", "Nikkō/Yumoto": "nikko",
  Kusatsu: "kusatsu", "Shima Onsen": "kusatsu",
  Karuizawa: "karuizawa",
  Nagano: "yudanaka", "Nagano (day)": "yudanaka", "Nagano/Shibu": "yudanaka", Shibu: "yudanaka", Nozawa: "yudanaka", Myōkō: "yudanaka",
  Matsumoto: "matsumoto", Shirahone: "matsumoto",
  Takayama: "takayama", "Takayama/Hirayu": "okuhida",
  Kanazawa: "kanazawa", "Toyama/Kanazawa": "kanazawa", Toyama: "kanazawa",
  Sendai: "south-tohoku", "Sendai/Yamagata": "south-tohoku", Zaō: "south-tohoku", "Zaō/Yamagata": "south-tohoku", "Aizu-Wakamatsu": "south-tohoku", "en route": "south-tohoku",
  Morioka: "north-tohoku", Towada: "north-tohoku", "Towada-ko/Hachinohe": "north-tohoku", Nyūtō: "north-tohoku", "Nyūtō/Tazawako": "north-tohoku",
  Yuzawa: "echigo-yuzawa", "Yuzawa/Tokyo": "echigo-yuzawa", "Yuzawa/Minakami": "echigo-yuzawa", Niigata: "echigo-yuzawa",
  Kawaguchiko: "kawaguchiko", Atami: "shuzenji",
  Kyoto: "kyoto", "Kyoto/Nara": "nara", Osaka: "osaka",
  Hiroshima: "hiroshima", Okayama: "okayama", "Okayama/Takamatsu": "okayama", Takamatsu: "okayama", "Takamatsu/Naoshima": "okayama", Naoshima: "okayama", Onomichi: "hiroshima", Matsuyama: "shikoku",
  Fukuoka: "kyushu", Yufuin: "kyushu", Kurokawa: "kyushu", Takachiho: "kyushu", Nagasaki: "kyushu", Kumamoto: "kyushu", Kagoshima: "kyushu", Yakushima: "kyushu",
  Sapporo: "hokkaido",
};
const REGION = { Nikkō: "nikko", "Nikkō→Aizu": "nikko", Hida: "takayama", Fuji: "kawaguchiko", Izu: "shuzenji", Kansai: "kyoto", Setouchi: "okayama", Kyushu: "kyushu", Hokkaido: "hokkaido", Kanazawa: "kanazawa", Noto: "kanazawa", Nagano: "yudanaka", Okuhida: "okuhida", Zaō: "south-tohoku", Sado: "echigo-yuzawa", Minakami: "echigo-yuzawa", Yonezawa: "south-tohoku", Yamagata: "south-tohoku", Matsushima: "south-tohoku" };
const KANSAI_BY_NAME = [[/Kōyasan|Koyasan|Okunoin|Fukuchi/i, "koyasan"], [/Kinosaki/i, "kinosaki"], [/Himeji/i, "okayama"], [/Nara|Tōdai|Todai|deer/i, "nara"], [/Arima|Kobe/i, "osaka"], [/Osaka|Kuromon|USJ|Minoo|Bunraku/i, "osaka"]];
const SETOUCHI_BY_NAME = [[/Hiroshima|Miyajima|Itsukushima|Misen|Onomichi|Shimanami|Iwakuni/i, "hiroshima"], [/Dōgo|Dogo|Matsuyama|Kotohira|Ritsurin/i, "shikoku"]];

function parse(file) {
  const lines = readFileSync(path.join(root, file), "utf8").split("\n");
  const out = [];
  for (const line of lines) {
    if (!/^\| [A-Z]{2,3}-[A-Z]*-?\d+ \|/.test(line)) continue;
    const c = line.split("|").slice(1, -1).map((x) => x.trim());
    if (c.length < 16) continue;
    const [id, name_pt, name_en, region, base, dates, suits, bump, effort, indoor, cost, hours, lead, ny, uniq, source] = c;
    let area = BASE[base] ?? REGION[region] ?? null;
    if (region === "Kansai") for (const [re, a] of KANSAI_BY_NAME) if (re.test(name_en) || re.test(base)) { area = a; break; }
    if (region === "Setouchi") for (const [re, a] of SETOUCHI_BY_NAME) if (re.test(name_en) || re.test(base)) { area = a; break; }
    if (!area) continue;
    out.push({ id, name: name_en.replace(/\*\*/g, ""), name_pt, area, base, dates, suits, bump: num(bump), effort: num(effort), indoor, cost, hours, lead, ny, uniqueness: num(uniq), source: source.replace(/\*\*/g, "") });
  }
  return out;
}
function num(s) {
  const m = String(s).match(/\d/);
  return m ? Number(m[0]) : null;
}

const cards = [...parse("05-north-west.md"), ...parse("06-south-west-hokkaido.md")];
const seen = new Set();
const unique = cards.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
unique.sort((a, b) => (b.uniqueness ?? 0) - (a.uniqueness ?? 0) || (b.bump ?? 0) - (a.bump ?? 0));
writeFileSync(path.join(here, "..", "src", "data", "catalog.json"), JSON.stringify(unique));
const byArea = {};
for (const c of unique) byArea[c.area] = (byArea[c.area] ?? 0) + 1;
console.log(`catalog: ${unique.length} cards`, byArea);
