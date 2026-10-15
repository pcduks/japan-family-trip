/**
 * Curated travel times between regions (hours, door to door by rail or bus),
 * from the plan doc. The Routes API spike (12 Oct 2026) returned no TRANSIT
 * routes in Japan, so these stay curated; a Google Maps transit link is
 * offered next to every move.
 */
import type { Region } from "./types";

interface Leg {
  hours: number;
  how: string;
}

const CURATED: Record<string, Leg> = {
  "tokyo>kanazawa": { hours: 2.5, how: "Hokuriku shinkansen" },
  "tokyo>kyoto": { hours: 2.25, how: "Tokaido shinkansen" },
  "tokyo>hakone": { hours: 1.5, how: "Romancecar from Shinjuku" },
  "tokyo>kawaguchiko": { hours: 2, how: "Fuji Excursion limited express from Shinjuku" },
  "hakone>kawaguchiko": { hours: 2, how: "Bus via Gotemba" },
  "tokyo>yudanaka": { hours: 2.5, how: "Shinkansen to Nagano, then Nagano Electric Railway" },
  "tokyo>nikko": { hours: 2, how: "Tobu limited express" },
  "tokyo>kamakura": { hours: 1, how: "JR Yokosuka line" },
  "tokyo>echigo-yuzawa": { hours: 1.25, how: "Joetsu shinkansen" },
  "tokyo>takayama": { hours: 4, how: "Shinkansen to Nagoya, then Hida limited express" },
  "tokyo>okayama": { hours: 3.25, how: "Tokaido–Sanyo shinkansen" },
  "tokyo>hiroshima": { hours: 4, how: "Tokaido–Sanyo shinkansen" },
  "tokyo>kinosaki": { hours: 5.5, how: "Shinkansen to Kyoto, then Kinosaki limited express" },
  "tokyo>ginzan": { hours: 3.5, how: "Yamagata shinkansen to Oishida, then bus" },
  "tokyo>shuzenji": { hours: 2.25, how: "Odoriko limited express" },
  "tokyo>kusatsu": { hours: 3.5, how: "Limited express to Naganohara, then bus" },
  "tokyo>gero": { hours: 3.5, how: "Shinkansen to Nagoya, then Hida limited express" },
  "kanazawa>shirakawago": { hours: 1.25, how: "Nohi bus" },
  "kanazawa>takayama": { hours: 2.5, how: "Nohi bus, stopping in Shirakawa-go" },
  "kanazawa>yudanaka": { hours: 2.25, how: "Shinkansen to Nagano, then Nagano Electric Railway" },
  "kanazawa>kyoto": { hours: 2.25, how: "Thunderbird limited express" },
  "kanazawa>gero": { hours: 3.25, how: "Bus to Takayama, then Hida limited express" },
  "shirakawago>takayama": { hours: 0.9, how: "Nohi bus" },
  "takayama>gero": { hours: 0.75, how: "Hida limited express" },
  "takayama>okuhida": { hours: 1.5, how: "Nohi bus" },
  "takayama>kyoto": { hours: 3.5, how: "Hida limited express to Nagoya, then shinkansen" },
  "okuhida>gero": { hours: 2.25, how: "Bus to Takayama, then Hida limited express" },
  "okuhida>kyoto": { hours: 5, how: "Bus to Takayama, Hida to Nagoya, then shinkansen" },
  "gero>kyoto": { hours: 2, how: "Hida limited express via Nagoya; one direct train a day" },
  "kyoto>nara": { hours: 0.75, how: "Kintetsu or JR Nara line" },
  "kyoto>hakone": { hours: 3.25, how: "Hikari to Odawara, then Hakone Tozan" },
  "kyoto>kawaguchiko": { hours: 4.25, how: "Shinkansen to Mishima, then the Fujikyu bus" },
  "kyoto>okayama": { hours: 1, how: "Sanyo shinkansen" },
  "kyoto>hiroshima": { hours: 1.75, how: "Sanyo shinkansen" },
  "kyoto>kinosaki": { hours: 2.5, how: "Kinosaki limited express" },
  "kyoto>ginzan": { hours: 6, how: "Shinkansen to Tokyo and Oishida, then bus" },
  "kyoto>shuzenji": { hours: 3, how: "Shinkansen to Mishima, then Izu-Hakone railway" },
  "kyoto>kusatsu": { hours: 5.5, how: "Shinkansen to Tokyo, then limited express and bus" },
  "kyoto>koyasan": { hours: 2.5, how: "Nankai from Osaka, then cable car" },
  "okayama>hiroshima": { hours: 0.75, how: "Sanyo shinkansen" },
  "okayama>hakone": { hours: 4, how: "Shinkansen to Odawara" },
  "hiroshima>hakone": { hours: 4.5, how: "Shinkansen to Odawara" },
  "kinosaki>hakone": { hours: 5.5, how: "Limited express to Kyoto, then shinkansen" },
  "hakone>tokyo": { hours: 1.5, how: "Romancecar to Shinjuku" },
  "shuzenji>hakone": { hours: 1.5, how: "Train to Mishima and Odawara" },
};

export function legKey(a: string, b: string): string {
  return `${a}>${b}`;
}

function haversineKm(a: Region, b: Region): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export interface LegEstimate {
  hours: number;
  how: string;
  /** false when the number is a distance-based guess rather than curated. */
  curated: boolean;
}

export function legBetween(from: string, to: string, regions: Region[]): LegEstimate {
  if (from === to) return { hours: 0, how: "Same base", curated: true };
  const hit = CURATED[legKey(from, to)] ?? CURATED[legKey(to, from)];
  if (hit) return { ...hit, curated: true };
  const a = regions.find((r) => r.id === from);
  const b = regions.find((r) => r.id === to);
  if (!a || !b) return { hours: 3, how: "Unknown leg", curated: false };
  const km = haversineKm(a, b);
  // Rough rail average including transfers; rounded to the quarter hour.
  const hours = Math.max(0.5, Math.round((km / 110 + 0.75) * 4) / 4);
  return { hours, how: `About ${Math.round(km)} km; estimated`, curated: false };
}

/** Google Maps transit directions between two region centres. */
export function transitLink(from: Region, to: Region): string {
  const q = (r: Region) => encodeURIComponent(`${r.name} Station, Japan`);
  return `https://www.google.com/maps/dir/?api=1&origin=${q(from)}&destination=${q(to)}&travelmode=transit`;
}
