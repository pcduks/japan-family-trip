/**
 * The six travellers, their facts and a "good" wish set that a sound builder
 * can satisfy on the fixture catalog without violations.
 */
import type { BuilderTraveller, Facts, TravellerId, Wish } from "../types";

export const fixtureTravellers: BuilderTraveller[] = [
  { id: "her", name: "Ela", who: "her" },
  { id: "pedro", name: "Pedro", who: "pedro" },
  { id: "mae", name: "Mãe", who: "parents" },
  { id: "pai", name: "Pai", who: "parents" },
  { id: "bro", name: "Irmão", who: "bros" },
  { id: "cunhada", name: "Cunhada", who: "bros" },
];

export const fixtureFacts: Record<TravellerId, Facts> = {
  her: { walk_km: "cidade", stairs: false, midday_rest: "sometimes", food_limits: ["raw egg"], early: false },
  pedro: { walk_km: "trilha", stairs: true, midday_rest: "no", food_limits: [], early: true },
  mae: { walk_km: "trilha", stairs: true, midday_rest: "no", food_limits: [], early: true },
  pai: { walk_km: "trilha", stairs: true, midday_rest: "no", food_limits: [], early: true },
  bro: { walk_km: "trilha", stairs: true, midday_rest: "no", food_limits: [], early: false },
  cunhada: { walk_km: "trilha", stairs: true, midday_rest: "no", food_limits: ["vegetarian"], early: false },
};

const w = (traveller_id: TravellerId, card_id: string, answer: Wish["answer"]): Wish => ({ traveller_id, card_id, answer });

/** Wishes that pull in different directions (snow north vs Kansai vs south) but stay satisfiable. */
export const fixtureWishes: Wish[] = [
  // her: calm, indoor, food, tea
  w("her", "TK-01", "must"),
  w("her", "KY-02", "must"),
  w("her", "HK-02", "must"),
  w("her", "KZ-04", "like"),
  w("her", "YD-03", "like"),
  w("her", "KY-07", "like"),
  w("her", "TK-11", "like"),
  w("her", "KW-01", "like"),
  w("her", "OS-02", "like"),
  w("her", "YD-02", "no"),
  w("her", "HR-04", "no"),
  // pedro: shrines, markets, Hiroshima
  w("pedro", "KY-01", "must"),
  w("pedro", "TK-03", "must"),
  w("pedro", "HR-01", "must"),
  w("pedro", "KY-05", "like"),
  w("pedro", "KZ-01", "like"),
  w("pedro", "NR-02", "like"),
  w("pedro", "TK-09", "like"),
  w("pedro", "YD-04", "like"),
  w("pedro", "FK-01", "like"),
  // parents: gardens, temples, food
  w("mae", "KZ-01", "must"),
  w("mae", "KY-06", "must"),
  w("mae", "NR-01", "must"),
  w("mae", "KY-03", "like"),
  w("mae", "HK-01", "like"),
  w("mae", "KZ-02", "like"),
  w("mae", "TK-06", "like"),
  w("mae", "KZ-05", "like"),
  w("pai", "KZ-02", "must"),
  w("pai", "HK-01", "must"),
  w("pai", "KY-03", "must"),
  w("pai", "KZ-01", "like"),
  w("pai", "TK-04", "like"),
  w("pai", "NR-01", "like"),
  w("pai", "HR-02", "like"),
  w("pai", "TY-03", "like"),
  // bros: snow, ski, views
  w("bro", "KZ-05", "must"),
  w("bro", "OS-01", "must"),
  w("bro", "HR-02", "must"),
  w("bro", "YD-01", "like"),
  w("bro", "KW-02", "like"),
  w("bro", "YD-02", "like"),
  w("bro", "TK-12", "like"),
  w("bro", "HK-04", "like"),
  w("bro", "TK-07", "no"),
  w("cunhada", "KZ-05", "must"),
  w("cunhada", "KW-01", "must"),
  w("cunhada", "OS-01", "must"),
  w("cunhada", "YD-01", "like"),
  w("cunhada", "KY-04", "like"),
  w("cunhada", "KM-01", "like"),
  w("cunhada", "HR-03", "like"),
  w("cunhada", "TY-01", "like"),
];
