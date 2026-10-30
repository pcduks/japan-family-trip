import "server-only";
import { serverEnv } from "../env";
import { GoogleApiError } from "./places";

export interface VideoResult {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
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

/** Search embeddable videos (100 units) and confirm embeddability (1 unit). Planners only. */
export async function searchVideos(q: string): Promise<VideoResult[]> {
  const r = await get("search", { part: "snippet", type: "video", videoEmbeddable: "true", order: "relevance", maxResults: "8", relevanceLanguage: "en", safeSearch: "moderate", q });
  const ids: string[] = (r.items ?? []).map((i: { id?: { videoId?: string } }) => i?.id?.videoId).filter(Boolean);
  if (!ids.length) return [];
  const details = await get("videos", { part: "snippet,status", id: ids.join(",") });
  const byId = new Map<string, VideoResult>();
  for (const v of details.items ?? []) {
    byId.set(v.id, {
      id: v.id,
      title: v.snippet?.title ?? "",
      channel: v.snippet?.channelTitle ?? "",
      thumbnail: v.snippet?.thumbnails?.medium?.url ?? "",
      embeddable: v.status?.embeddable === true,
    });
  }
  return ids.map((id) => byId.get(id)).filter((v): v is VideoResult => !!v && v.embeddable);
}

/** The video id from any YouTube URL, or null. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
