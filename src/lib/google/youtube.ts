import "server-only";
import { serverEnv } from "../env";
import { GoogleApiError } from "./places";

export interface VideoResult {
  id: string;
  title: string;
  channel: string;
  publishedAt: string;
  thumbnail: string;
  durationSeconds: number;
  views: number | null;
  embeddable: boolean;
}

const API = "https://www.googleapis.com/youtube/v3";

function key(): string {
  const k = serverEnv().youtubeKey;
  if (!k) throw new GoogleApiError("YOUTUBE_API_KEY is not set", 503);
  return k;
}

async function get(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams({ ...params, key: key() });
  const res = await fetch(`${API}/${path}?${qs}`, { cache: "no-store" });
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      msg = (await res.json())?.error?.message ?? msg;
    } catch {}
    throw new GoogleApiError(`YouTube API: ${msg}`, res.status);
  }
  return res.json();
}

/** ISO 8601 duration (PT1H2M3S) to seconds. */
export function isoDurationSeconds(iso: string): number {
  const m = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

/**
 * Search embeddable medium and long videos (2 × search.list = 200 units),
 * then confirm embeddability with videos.list (1 unit).
 */
export async function searchVideos(q: string): Promise<VideoResult[]> {
  const common = {
    part: "snippet",
    type: "video",
    videoEmbeddable: "true",
    order: "relevance",
    maxResults: "10",
    relevanceLanguage: "en",
    safeSearch: "moderate",
    q,
  };
  const [medium, long] = await Promise.all([
    get("search", { ...common, videoDuration: "medium" }),
    get("search", { ...common, videoDuration: "long" }),
  ]);
  const ids: string[] = [];
  for (const item of [...(medium.items ?? []), ...(long.items ?? [])]) {
    const id = item?.id?.videoId;
    if (id && !ids.includes(id)) ids.push(id);
  }
  if (!ids.length) return [];
  const details = await get("videos", { part: "snippet,status,contentDetails,statistics", id: ids.join(",") });
  const byId = new Map<string, VideoResult>();
  for (const v of details.items ?? []) {
    byId.set(v.id, {
      id: v.id,
      title: v.snippet?.title ?? "",
      channel: v.snippet?.channelTitle ?? "",
      publishedAt: v.snippet?.publishedAt ?? "",
      thumbnail: v.snippet?.thumbnails?.medium?.url ?? v.snippet?.thumbnails?.default?.url ?? "",
      durationSeconds: isoDurationSeconds(v.contentDetails?.duration ?? ""),
      views: v.statistics?.viewCount ? Number(v.statistics.viewCount) : null,
      embeddable: v.status?.embeddable === true,
    });
  }
  // Keep search relevance order; drop anything not embeddable.
  return ids.map((id) => byId.get(id)).filter((v): v is VideoResult => !!v && v.embeddable);
}
