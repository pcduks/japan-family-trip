/** Types and pure helpers for the family features: notes, packing, expenses, food. */

export interface Note {
  id: string;
  traveller_id: string;
  date: string | null;
  place_slug: string | null;
  text: string;
  created_at?: string;
}

export interface PackingItem {
  id: string;
  traveller_id: string;
  text: string;
  category: string;
  checked: boolean;
  sort: number;
  created_at?: string;
}

export interface Expense {
  id: string;
  paid_by: string;
  amount_jpy: number;
  description: string;
  date: string | null;
  split_couples: string[];
  created_by: string | null;
  created_at?: string;
}

export interface FoodMark {
  id: string; // `${traveller_id}:${place_slug}`
  traveller_id: string;
  place_slug: string;
  status: "want" | "been";
  rating: number | null;
  updated_at?: string;
}

export const foodMarkId = (travellerId: string, slug: string) => `${travellerId}:${slug}`;

/* ------------------------------------------------------------ packing */

export type PackingPreset = "base" | "inverno" | "gravidez" | "pais";

export const PACKING_CATEGORIES: Record<string, string> = {
  docs: "Documentos",
  roupa: "Roupa de inverno",
  saude: "Saúde",
  tech: "Eletrônicos",
  geral: "Outros",
};

const PRESETS: Record<PackingPreset, [string, string][]> = {
  base: [
    ["docs", "Passaporte (validade até julho de 2027)"],
    ["docs", "Seguro-viagem impresso e no celular"],
    ["docs", "Cartão de crédito sem IOF + um reserva"],
    ["docs", "Ienes em espécie para os primeiros dias"],
    ["tech", "Adaptador de tomada tipo A (Japão)"],
    ["tech", "Carregador portátil (bateria na bagagem de mão)"],
    ["tech", "eSIM ou chip de dados instalado"],
    ["geral", "Sacola para roupa suja"],
    ["geral", "Garrafinha de água"],
  ],
  inverno: [
    ["roupa", "Casaco quente impermeável"],
    ["roupa", "Segunda pele (blusa e calça térmicas)"],
    ["roupa", "Gorro, luvas e cachecol"],
    ["roupa", "Meias grossas (várias)"],
    ["roupa", "Sapato impermeável com sola que não escorrega"],
    ["roupa", "Garras antiderrapantes para neve e gelo"],
    ["saude", "Hidratante e protetor labial"],
  ],
  gravidez: [
    ["docs", "Atestado de aptidão para voo (fit-to-fly), 10–19 dez"],
    ["docs", "Cartão do pré-natal e exames recentes"],
    ["docs", "Contato da obstetra e do plano de saúde"],
    ["saude", "Meias de compressão para o voo"],
    ["saude", "Vitaminas do pré-natal para as 3 semanas"],
    ["saude", "Travesseiro de viagem / apoio lombar"],
    ["roupa", "Calças confortáveis com cós de gestante"],
  ],
  pais: [
    ["saude", "Remédios de uso contínuo + receitas em inglês"],
    ["saude", "Óculos reserva"],
    ["docs", "Cópia do passaporte na mala e no celular"],
    ["tech", "Celular com o app instalado e letras grandes"],
  ],
};

export function presetItems(preset: PackingPreset): { category: string; text: string }[] {
  return PRESETS[preset].map(([category, text]) => ({ category, text }));
}

/* ----------------------------------------------------------- expenses */

export interface CoupleBalance {
  couple: string;
  paid: number;
  share: number;
  /** positive = others owe this couple */
  balance: number;
}

/**
 * Per-couple balances. Each expense is split equally between the couples in
 * split_couples (or all couples when empty).
 */
export function coupleBalances(expenses: Expense[], coupleOf: Map<string, string>, couples: string[]): CoupleBalance[] {
  const paid = new Map(couples.map((c) => [c, 0]));
  const share = new Map(couples.map((c) => [c, 0]));
  for (const e of expenses) {
    const payer = coupleOf.get(e.paid_by);
    if (payer) paid.set(payer, (paid.get(payer) ?? 0) + e.amount_jpy);
    const split = (e.split_couples.length ? e.split_couples : couples).filter((c) => share.has(c));
    if (!split.length) continue;
    const each = e.amount_jpy / split.length;
    for (const c of split) share.set(c, (share.get(c) ?? 0) + each);
  }
  return couples.map((c) => ({ couple: c, paid: paid.get(c) ?? 0, share: share.get(c) ?? 0, balance: (paid.get(c) ?? 0) - (share.get(c) ?? 0) }));
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

/** Fewest transfers that settle everyone (greedy, fine for three couples). */
export function settleUp(balances: CoupleBalance[]): Transfer[] {
  const debtors = balances.filter((b) => b.balance < -0.5).map((b) => ({ c: b.couple, v: -b.balance }));
  const creditors = balances.filter((b) => b.balance > 0.5).map((b) => ({ c: b.couple, v: b.balance }));
  debtors.sort((a, b) => b.v - a.v);
  creditors.sort((a, b) => b.v - a.v);
  const out: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amt = Math.min(debtors[i].v, creditors[j].v);
    out.push({ from: debtors[i].c, to: creditors[j].c, amount: Math.round(amt) });
    debtors[i].v -= amt;
    creditors[j].v -= amt;
    if (debtors[i].v < 0.5) i++;
    if (creditors[j].v < 0.5) j++;
  }
  return out;
}

/* --------------------------------------------------------- google maps */

/**
 * Pull a searchable name and coordinates out of a Google Maps link, e.g.
 * https://www.google.com/maps/place/Tonkatsu+Suzuki/@35.68,139.76,17z/...
 * Short links (maps.app.goo.gl) must be expanded server-side first.
 */
export function parseMapsUrl(url: string): { name: string | null; lat: number | null; lng: number | null; placeId: string | null } {
  let name: string | null = null;
  let lat: number | null = null;
  let lng: number | null = null;
  let placeId: string | null = null;
  try {
    const u = new URL(url);
    const place = u.pathname.match(/\/maps\/place\/([^/]+)/);
    if (place) name = decodeURIComponent(place[1].replace(/\+/g, " "));
    const q = u.searchParams.get("q") ?? u.searchParams.get("query");
    if (!name && q && !/^-?\d/.test(q)) name = q;
    const at = u.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ?? url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (at) {
      lat = Number(at[1]);
      lng = Number(at[2]);
    }
    placeId = u.searchParams.get("query_place_id") ?? u.searchParams.get("place_id");
    const cid = url.match(/!1s(ChIJ[\w-]+)/);
    if (!placeId && cid) placeId = cid[1];
  } catch {}
  return { name, lat, lng, placeId };
}

/* ------------------------------------------------------------ desejos */

export type WishAnswer = "no" | "like" | "must";

/** One row per traveller and card; id = `${traveller_id}:${card_id}`. */
export interface Wish {
  id: string;
  traveller_id: string;
  card_id: string;
  answer: WishAnswer;
  updated_at?: string;
}

export interface WishFacts {
  walk_km?: "bairro" | "cidade" | "trilha";
  stairs?: boolean;
  midday_rest?: "need" | "sometimes" | "no";
  food_limits?: string[];
  early?: boolean;
  /** The forced Réveillon choice: a base slug. */
  ny_choice?: string;
  /** Answered together with the planner ("Fazer junto"). */
  with_help?: boolean;
  /** Optional free text from the finish screen. */
  missing?: string;
}

/** id = traveller id. finished_at reveals nothing by itself; answers unlock when all have finished. */
export interface WishProfile {
  id: string;
  facts: WishFacts;
  finished_at: string | null;
  updated_at?: string;
}

export const wishId = (travellerId: string, cardId: string) => `${travellerId}:${cardId}`;
export const MAX_MUST = 3;
