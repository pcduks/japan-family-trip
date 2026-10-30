import "server-only";
/**
 * Every write the app makes, run on the server with the service-role client
 * on behalf of the person in the cookies. The browser posts { action, ... }
 * to /api/act; the switch below is the whole contract.
 */
import type { DB } from "./supabase/types";
import type { Comment, Reaction, Stay, SuggestionDiff, TipExtracted, Version, VoteKind } from "./types";
import { cleanTip, isCat } from "./city";
import { foodDeadline } from "./food";
import type { Viewer } from "./supabase/server";
import { describeDiff } from "./versions";
import { rowToStay } from "./data/loader";
import { tripData } from "./data/file";
import { afterAccept, mergeOnto, sameRoute, stopNames, validRoute } from "./merge";
import { PINS_KEY, pinsFromSetting, withPin } from "./tokyo";

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

const TRIP = tripData().trip;

async function planRow(sb: DB): Promise<string> {
  const { data } = await sb.from("versions").select("id").eq("status", "plan").maybeSingle();
  const id = (data as Row | null)?.id as string | undefined;
  if (!id) throw new ActionError("No plan", 500);
  return id;
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
      if (before?.status === "plan" && beforeStays) {
        const bad = validRoute(v.stays, TRIP.start, TRIP.nights);
        if (bad) throw new ActionError(bad);
        // Someone changed the route while this was being edited: never overwrite it without asking.
        const base = Array.isArray(p.base) ? (p.base as Stay[]) : null;
        if (base && !sameRoute(base, beforeStays)) {
          if (p.onTop !== true) throw new ActionError(`changed:${describeDiff(base, beforeStays, regions as never).join("; ")}`, 409);
          const m = mergeOnto(base, v.stays, beforeStays, TRIP.start);
          if (m.kind === "clash") throw new ActionError(`Your change and the newer one both touch ${stopNames(m.stops, regions)}. Look at the route first.`, 409);
          if (m.kind === "already") return;
          v.stays = m.stays;
        }
      }
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
      const bad = validRoute(diff.stays, TRIP.start, TRIP.nights);
      if (bad) throw new ActionError(bad);
      const planId = await planRow(sb);
      const now = await planStays(sb, planId);
      const stored: SuggestionDiff = { ...diff, base: Array.isArray(diff.base) ? diff.base : now };
      // One open suggestion per person: sending again replaces the earlier one.
      fail(await sb.from("suggestions").delete().eq("author_id", me.travellerId).eq("status", "open"), "suggestions");
      fail(await sb.from("suggestions").insert({ from_version_id: (p.fromVersionId as string | null) ?? null, author_id: me.travellerId, diff: stored, comment: typeof p.comment === "string" ? p.comment : null }), "suggestions");
      return;
    }
    case "decideSuggestion": {
      if (me.role !== "planner") throw new ActionError("Planners only", 403);
      const id = String(p.id ?? "");
      const decision = p.decision === "accepted" ? "accepted" : "declined";
      const { data } = await sb.from("suggestions").select("*").eq("id", id).eq("status", "open").maybeSingle();
      const s = data as Row | null;
      if (!s) throw new ActionError("That suggestion is not open", 404);
      const diff = s.diff as SuggestionDiff;
      // "applied": a planner already saved the change (adjusted) on the trip; only mark it accepted.
      if (decision === "accepted" && p.applied !== true) {
        const planId = await planRow(sb);
        const before = await planStays(sb, planId);
        const r = afterAccept(diff, before, TRIP, regions);
        if (!r.ok) throw new ActionError(r.message, 409);
        const after = r.stays;
        if (after) {
          await replaceStays(sb, planId, after);
          if (diff.pace) fail(await sb.from("versions").update({ pace: diff.pace }).eq("id", planId), "versions");
          fail(await sb.from("plan_history").insert({ version_id: planId, actor_id: me.travellerId, change: { summary: describeDiff(before, after, regions as never), before, after, suggestion_id: id, suggested_by: s.author_id } }), "plan_history");
        }
      }
      const note = typeof p.note === "string" && p.note.trim() ? p.note.trim().slice(0, 500) : null;
      fail(await sb.from("suggestions").update({ status: decision, decided_by: me.travellerId, decided_at: now, diff: { ...diff, decision_note: note } }).eq("id", id), "suggestions");
      return;
    }
    case "setDeadlineDone": {
      if (me.role !== "planner") throw new ActionError("Planners only", 403);
      const id = String(p.id ?? "");
      // Food dates live in the app's data until first ticked; ticking stores them.
      const food = foodDeadline(id);
      if (food) fail(await sb.from("deadlines").upsert({ id, date: food.date, item: food.item, source: food.source ?? null, done: p.done === true }, { onConflict: "id" }), "deadlines");
      else fail(await sb.from("deadlines").update({ done: p.done === true }).eq("id", id), "deadlines");
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
      const change = h.change as { before: Stay[]; after: Stay[]; suggestion_id?: string | null };
      const current = await planStays(sb, versionId);
      // Undo only while the route is still what that change left; otherwise it would wipe a newer change.
      if (!sameRoute(current, change.after)) throw new ActionError("The route has changed since. Undo the newest change first.", 409);
      await replaceStays(sb, versionId, change.before);
      fail(await sb.from("plan_history").insert({ version_id: versionId, actor_id: me.travellerId, change: { summary: ["undid a change"], before: current, after: change.before, reverted: id } }), "plan_history");
      if (change.suggestion_id) fail(await sb.from("suggestions").update({ status: "open", decided_by: null, decided_at: null }).eq("id", change.suggestion_id), "suggestions");
      return;
    }
    case "addComment": {
      const body = String(p.body ?? "").trim();
      if (!body) return;
      fail(await sb.from("comments").insert({ author_id: me.travellerId, target_type: p.targetType as Comment["target_type"], target_id: String(p.targetId ?? ""), body }), "comments");
      return;
    }
    case "pinTokyoWalk": {
      const date = String(p.date ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ActionError("A date is required");
      const walk = p.walk == null ? null : Number(p.walk);
      if (walk != null && !(Number.isInteger(walk) && walk >= 0 && walk <= 10)) throw new ActionError("Unknown walk");
      const { data } = await sb.from("settings").select("value").eq("key", PINS_KEY).maybeSingle();
      const pins = withPin(pinsFromSetting((data as Row | null)?.value), date, walk);
      fail(await sb.from("settings").upsert({ key: PINS_KEY, value: { pins }, updated_at: now }, { onConflict: "key" }), "settings");
      return;
    }
    case "addTips": {
      const tips = (Array.isArray(p.tips) ? p.tips : []).map((t) => cleanTip(t)).filter((t): t is TipExtracted => !!t);
      if (!tips.length) throw new ActionError("Nothing to add");
      const caption = typeof p.caption === "string" && p.caption.trim() ? p.caption.trim().slice(0, 500) : null;
      const { data, error } = await sb
        .from("drops")
        .insert({ author_id: me.travellerId, caption, text: typeof p.text === "string" ? p.text.slice(0, 6000) : null, url: typeof p.url === "string" ? p.url.slice(0, 500) : null, processing_status: "done" })
        .select("id")
        .single();
      if (error) throw new ActionError(`drops: ${error.message}`, 500);
      const dropId = (data as Row).id as string;
      fail(await sb.from("drop_places").insert(tips.map((t) => ({ drop_id: dropId, extracted: { ...t, kind: "tip" }, match_confidence: t.google_place_id ? "high" : "none", confirmed_by: me.travellerId }))), "drop_places");
      return;
    }
    case "updateTip":
    case "deleteTip": {
      const id = String(p.id ?? "");
      const { data } = await sb.from("drop_places").select("id,extracted,drops(author_id)").eq("id", id).maybeSingle();
      const row = data as (Row & { drops?: { author_id?: string } | { author_id?: string }[] | null }) | null;
      if (!row) throw new ActionError("No such tip", 404);
      const drop = Array.isArray(row.drops) ? row.drops[0] : row.drops;
      if (me.role !== "planner" && drop?.author_id !== me.travellerId) throw new ActionError("Only whoever added a tip, or a planner, can change it", 403);
      if (action === "deleteTip") {
        if ((row.extracted as Record<string, unknown>).kind !== "tip") throw new ActionError("That drop is not a tip", 400);
        fail(await sb.from("drop_places").delete().eq("id", id), "drop_places");
        return;
      }
      const cur = row.extracted as Record<string, unknown>;
      if (cur.kind !== "tip") throw new ActionError("That drop is not a tip", 400);
      const next = { ...cur };
      if ("note" in p) next.note = typeof p.note === "string" && p.note.trim() ? p.note.trim().slice(0, 500) : null;
      if ("cat" in p) {
        if (!isCat(p.cat)) throw new ActionError("Unknown type");
        next.cat = p.cat;
      }
      if ("planned_for" in p) {
        const d = p.planned_for;
        if (d != null && !(typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d))) throw new ActionError("A date is required");
        next.planned_for = d ?? null;
      }
      if ("city" in p) {
        if (typeof p.city !== "string" || !regions.some((r) => r.id === p.city)) throw new ActionError("Unknown city");
        next.city = p.city;
      }
      fail(await sb.from("drop_places").update({ extracted: next }).eq("id", id), "drop_places");
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
