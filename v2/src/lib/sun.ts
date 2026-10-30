/**
 * Sunrise and sunset for a date and place, Japan time (UTC+9), from the NOAA
 * solar equations. Good to a minute or two, which is all the picture scroll
 * needs: in late December Tokyo gets under ten hours of daylight.
 */

const RAD = Math.PI / 180;

function dayOfYear(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86400000);
}

/** Minutes after local midnight (JST) of sunrise, solar noon and sunset. */
export function sunTimes(iso: string, lat: number, lng: number): { rise: number; noon: number; set: number; daylight: number } {
  const [y] = iso.split("-").map(Number);
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const g = ((2 * Math.PI) / (leap ? 366 : 365)) * (dayOfYear(iso) - 1);
  const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const cosHa = Math.cos(90.833 * RAD) / (Math.cos(lat * RAD) * Math.cos(decl)) - Math.tan(lat * RAD) * Math.tan(decl);
  const ha = Math.acos(Math.min(1, Math.max(-1, cosHa))) / RAD;
  const tz = 9 * 60;
  const noon = 720 - 4 * lng - eqTime + tz;
  const rise = noon - 4 * ha;
  const set = noon + 4 * ha;
  return { rise, noon, set, daylight: set - rise };
}

export function fmtClock(minutes: number): string {
  const m = Math.round(minutes);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

export function fmtHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h} h ${m}` : `${h} h`;
}
