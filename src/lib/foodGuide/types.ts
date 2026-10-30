/** The family food guide ("Guia de comida"): one file per base plus topic files. See docs/research/food/GUIDE-SCHEMA.md. */

export type Pregnancy = "ok" | "cuidado" | "evitar";

export interface Meibutsu {
  name_pt: string;
  name_ja?: string;
  romaji?: string;
  what_pt: string;
  where_pt?: string;
  price_pt?: string;
  must?: boolean;
  pregnancy?: Pregnancy;
  pregnancy_pt?: string;
}

export interface FoodArea {
  name: string;
  name_ja?: string;
  kind?: string;
  story_pt: string;
  eat_pt?: string[];
  tips_pt?: string;
  dec_jan_pt?: string;
  query?: string;
}

export interface CriticNote {
  who: string;
  note_pt?: string;
  url?: string;
}

export interface FoodPlace {
  name: string;
  name_ja?: string;
  area?: string;
  genre_pt?: string;
  price_pt?: string;
  tabelog?: { score?: number | null; reviews?: number | null; url?: string; awards?: string };
  critics?: CriticNote[];
  why_pt?: string;
  order_pt?: string;
  pregnancy_pt?: string;
  group_pt?: string;
  booking_pt?: string;
  dec_jan_pt?: string;
  query?: string;
}

export interface FoodShop {
  name: string;
  name_ja?: string;
  what_pt: string;
  buy_pt?: string;
  price_pt?: string;
  dec_jan_pt?: string;
  query?: string;
}

export interface FoodCity {
  slug: string;
  name: string;
  tagline_pt?: string;
  history_pt?: string[];
  winter_pt?: string;
  meibutsu?: Meibutsu[];
  areas?: FoodArea[];
  places?: FoodPlace[];
  shops?: FoodShop[];
  sources?: string[];
}

export interface TopicItem {
  name: string;
  name_ja?: string;
  what_pt?: string;
  where_pt?: string;
  price_pt?: string;
  must?: boolean;
  pregnancy?: Pregnancy;
  tip_pt?: string;
}

export interface FoodTopic {
  slug: string;
  title_pt: string;
  intro_pt?: string[];
  sections: { title_pt: string; body_pt?: string; items?: TopicItem[] }[];
  sources?: string[];
}

/** What the hub needs without loading every file. */
export interface FoodCityMeta {
  slug: string;
  name: string;
  region: string;
  tagline_pt: string;
  counts: { meibutsu: number; areas: number; places: number; shops: number };
}
export interface FoodTopicMeta {
  slug: string;
  title_pt: string;
  items: number;
}
