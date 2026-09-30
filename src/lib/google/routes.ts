import "server-only";
import { serverEnv } from "../env";
import { GoogleApiError } from "./places";

export interface LegEstimate {
  hours: number;
  km: number;
  mode: "DRIVE" | "TRANSIT";
  summary: string | null;
}

/** Routes API computeRoutes. TRANSIT coverage in Japan is what the §12 spike checks. */
export async function computeLeg(origin: string, destination: string, mode: "DRIVE" | "TRANSIT", departure?: string): Promise<LegEstimate | null> {
  const key = serverEnv().placesKey;
  if (!key) throw new GoogleApiError("GOOGLE_PLACES_API_KEY is not set", 503);
  const body: Record<string, unknown> = {
    origin: { address: origin },
    destination: { address: destination },
    travelMode: mode,
    languageCode: "en",
    regionCode: "JP",
  };
  if (mode === "DRIVE") body.routingPreference = "TRAFFIC_UNAWARE";
  if (mode === "TRANSIT" && departure) body.departureTime = departure;
  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.description",
    },
    body: JSON.stringify(body),
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new GoogleApiError(`Routes API: ${json?.error?.message ?? res.status}`, res.status);
  const r = json.routes?.[0];
  if (!r) return null;
  const seconds = Number(String(r.duration ?? "0s").replace("s", ""));
  return { hours: Math.round((seconds / 3600) * 4) / 4, km: Math.round((r.distanceMeters ?? 0) / 1000), mode, summary: r.description ?? null };
}
