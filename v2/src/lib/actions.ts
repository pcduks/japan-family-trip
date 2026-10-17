import "server-only";
/**
 * Every write the app makes, run on the server with the service-role client
 * on behalf of the person in the cookies. The browser posts { action, ... }
 * to /api/act; the switch below is the whole contract.
 */
import type { DB } from "./supabase/types";
import type { Comment, Reaction, Stay, SuggestionDiff, Version, VoteKind } from "./types";
import type { Viewer } from "./supabase/server";
import { describeDiff } from "./versions";
import { rowToStay } from "./data/loader";

type Row = Record<string, unknown>;

class ActionError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

function fail(r: { error: { message: string } | null }, label: string) {
  if (r.error) throw new ActionError(`${label}: ${r.error.message}`, 500);
}

async function planStays(sb: DB, versionId: string): Promise<Stay[]> {
  const { data, error } = await sb.from("stays").select("*").eq("version_id", versionId).order("sort");
  if (error) throw new ActionError(error.message, 500);
  return ((data ?? []) as Row[]).map(rowToStay);
}

async function replaceStays(sb: DB, versionId: string, stays: Stay[]) {
  fail(await sb.from("stays").delete().eq("version_id", versionId), "stays");
  if (stays.length)
    fail(await sb.from("stays").insert(stays.map((s, i) => ({ version_id: versionId, region_id: s.region, start_date: s.from, end_date: s.to, lodging_type: s.lodging, note: s.note, sort: i }))), "stays");
  fail(await sb.from("versions").update({ updated_at: new Date().toISOString() }).eq("id", versionId), "versions");
}

async function canEditVersion(sb: DB, me: Viewer, id: string): Promise<Row | null> {
  const { data } = await sb.from("versions").select("*").eq("id", id).maybeSingle();
  const row = (data as Row | null) ?? null;
  if (!row) return null;
  if (me.role === "planner") return row;
  if (row.status === "personal" && row.owner_id === me.travellerId) return row;
  throw new ActionError("Only the owner or a planner can change this version", 403);
}

export async function runAction(sb: DB, me: Viewer, action: string, p: Record<string, unknown>, regions: { id: string; name: string }[]): Promise<void> {
  const now = new Date().toISOString();
  switch (action) {
    case "saveVersion": {
      const v = p.version as Version;
      const note = typeof p.note === "string" && p.note.trim() ? p.note.trim() : null;
      if (!v?.id || !Array.isArray(v.stays)) throw new ActionError("A version with stays is required");
      const before = await canEditVersion(sb, me, v.id);
      if (!before && me.role !== "planner" && v.status !== "personal") throw new ActionError("Members create personal versions only", 403);
      if (!before && v.status === "personal" && v.owner !== me.travellerId) throw new ActionError("A personal version belongs to its author", 403);
      const beforeStays = before ? await planStays(sb, v.id) : null;
      const row: Row = {
        id: v.id,
        name: String(v.name ?? "").trim().slice(0, 80) || "Untitled",
        owner_id: v.status === "personal" ? (before?.owner_id as string | null) ?? me.travellerId : (before?.owner_id as string | null) ?? null,
        pace: v.pace,
        status: before ? (before.status as string) : v.status,
        parent_version_id: v.parent_version_id ?? (before?.parent_version_id as string | null) ?? null,
        gains: v.gains ?? null,
        gives_up: v.gives_up ?? null,
        shared: v.shared ?? true,
        updated_at: now,
      };
      fail(await sb.from("versions").upsert(row, { onConflict: "id" }), "versions");
      await replaceStays(sb, v.id, v.stays);
      if (before && before.status === "plan" && beforeStays) {
        const summary = describeDiff(beforeStays, v.stays, regions as never);
        if (summary.length || note)
          fail(await sb.from("plan_history").insert({ version_id: v.id, actor_id: me.travellerId, change: { summary: note ? [note, ...summary] : summary, before: beforeStays, after: v.stays } }), "plan_history");
      }
      return;
    }
    case "deleteVersion": {
      const id = String(p.id ?? "");
      const row = await canEditVersion(sb, me, id);
      if (!row) return;
      if (row.status === "plan") throw new ActionError("The plan cannot be deleted", 403);
      fail(await sb.from("versions").delete().eq("id", id), "versions");
      return;
    }
    case "setVote": {
      const kind = p.kind as VoteKind;
      if (!["pace", "rank", "mustdo"].includes(kind)) throw new ActionError("Unknown vote kind");
      fail(await sb.from("votes").upsert({ traveller_id: me.travellerId, kind, value: p.value ?? {}, updated_at: now }, { onConflict: "traveller_id,kind" }), "votes");
      return;
    }
    case "revealRanks": {
      if (me.role !== "planner") throw new ActionError("Planners only", 403);
      fail(await sb.from("settings").upsert({ key: "votes", value: { rank_revealed: true }, updated_at: now }, { onConflict: "key" }), "settings");
      return;
    }
    case "suggest": {
      const diff = p.diff as SuggestionDiff;
      if (!diff || !Array.isArray(diff.stays)) throw new ActionError("A diff with stays is required");
      fail(await sb.from("suggestions").insert({ from_version_id: (p.fromVersionId as string | null) ?? null, author_id: me.travellerId, diff, comment: typeof p.comment === "string" ? p.comment : null }), "suggestions");
      return;
    }
    case "decideSuggestion": {
      if (me.role !== "planner") throw new ActionError("Planners only", 403);
      const id = String(p.id ?? "");
      const decision = p.decision === "accepted" ? "accepted" : "declined";
      const { data } = await sb.from("suggestions").select("*").eq("id", id).eq("status", "open").maybeSingle();
      const s = data as Row | null;
      if (!s) throw new ActionError("That suggestion is not open", 404);
      if (decision === "accepted") {
        const { data: planRow } = await sb.from("versions").select("id").eq("status", "plan").maybeSingle();
        const planId = (planRow as Row | null)?.id as string | undefined;
        if (!planId) throw new ActionError("No plan", 500);
        const diff = s.diff as SuggestionDiff;
        const before = await planStays(sb, planId);
        await replaceStays(sb, planId, diff.stays);
        if (diff.pace) fail(await sb.from("versions").update({ pace: diff.pace }).eq("id", planId), "versions");
        fail(await sb.from("plan_history").insert({ version_id: planId, actor_id: me.travellerId, change: { summary: diff.summary, before, after: diff.stays, suggestion_id: id, suggested_by: s.author_id } }), "plan_history");
      }
      fail(await sb.from("suggestions").update({ status: decision, decided_by: me.travellerId, decided_at: now }).eq("id", id), "suggestions");
      return;
    }
    case "setDeadlineDone": {
      if (me.role !== "planner") throw new ActionError("Planners only", 403);
      fail(await sb.from("deadlines").update({ done: p.done === true }).eq("id", String(p.id ?? "")), "deadlines");
      return;
    }
    case "withdrawSuggestion": {
      const id = String(p.id ?? "");
      const q = sb.from("suggestions").delete().eq("id", id);
      fail(await (me.role === "planner" ? q : q.eq("author_id", me.travellerId)), "suggestions");
      return;
    }
    case "revertHistory": {
      if (me.role !== "planner") throw new ActionError("Planners only", 403);
      const id = String(p.id ?? "");
      const { data } = await sb.from("plan_history").select("*").eq("id", id).maybeSingle();
      const h = data as Row | null;
      if (!h) throw new ActionError("No such change", 404);
      const versionId = h.version_id as string;
      const change = h.change as { before: Stay[] };
      const current = await planStays(sb, versionId);
      await replaceStays(sb, versionId, change.before);
      fail(await sb.from("plan_history").insert({ version_id: versionId, actor_id: me.travellerId, change: { summary: ["reverted a change"], before: current, after: change.before, reverted: id } }), "plan_history");
      return;
    }
    case "addComment": {
      const body = String(p.body ?? "").trim();
      if (!body) return;
      fail(await sb.from("comments").insert({ author_id: me.travellerId, target_type: p.targetType as Comment["target_type"], target_id: String(p.targetId ?? ""), body }), "comments");
      return;
    }
    case "toggleReaction": {
      const targetType = String(p.targetType ?? "");
      const targetId = String(p.targetId ?? "");
      const kind = p.kind as Reaction["kind"];
      const { data } = await sb.from("reactions").select("id").eq("traveller_id", me.travellerId).eq("target_type", targetType).eq("target_id", targetId).eq("kind", kind).maybeSingle();
      const existing = data as Row | null;
      if (existing) fail(await sb.from("reactions").delete().eq("id", existing.id), "reactions");
      else fail(await sb.from("reactions").insert({ traveller_id: me.travellerId, target_type: targetType, target_id: targetId, kind }), "reactions");
      return;
    }
    default:
      throw new ActionError(`Unknown action ${action}`);
  }
}

export { ActionError };
