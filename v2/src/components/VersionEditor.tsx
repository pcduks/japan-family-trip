"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type DragEvent } from "react";
import { fmtRange } from "@/lib/dates";
import { checkVersion } from "@/lib/rules";
import type { Lodging, Pace, Stay, Version } from "@/lib/types";
import { relayout } from "@/lib/versions";
import { useStore } from "./providers";
import { StayNights } from "./StayNights";
import { TimelineLane } from "./Timeline";
import { Back, FindingList, Page, PageHeader, RegionDot } from "./ui";

const LODGING: (Lodging | "")[] = ["", "hotel", "rental", "ryokan"];

export function VersionEditor({ id }: { id: string }) {
  const { snapshot, rules, me, isPlanner, saveVersion, busy } = useStore();
  const router = useRouter();
  const original = snapshot.versions.find((v) => v.id === id);
  const [draft, setDraft] = useState<Version | null>(original ? { ...original, stays: original.stays.map((s) => ({ ...s })) } : null);
  const [note, setNote] = useState("");
  const [dragging, setDragging] = useState<number | null>(null);
  const findings = useMemo(() => (draft ? checkVersion(draft, rules) : []), [draft, rules]);
  const regionsForPicker = [...snapshot.regions].sort((a, b) => (a.status === "in_plan" ? 0 : 1) - (b.status === "in_plan" ? 0 : 1) || a.name.localeCompare(b.name));

  if (!original || !draft)
    return (
      <Page>
        <Back href="/versions">Versions</Back>
        <p className="text-muted">No such version.</p>
      </Page>
    );
  const canEdit = isPlanner || (original.status === "personal" && original.owner === me?.travellerId);
  if (!canEdit)
    return (
      <Page>
        <Back href={`/versions/${id}`}>Back</Back>
        <p className="text-muted">Only the owner (or a planner) can edit this version. Copy it instead.</p>
      </Page>
    );

  const setStays = (stays: Stay[]) => setDraft({ ...draft, stays: relayout(stays, snapshot.trip.start) });
  const update = (i: number, patch: Partial<Stay>) => setStays(draft.stays.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= draft.stays.length) return;
    const list = [...draft.stays];
    [list[i], list[j]] = [list[j], list[i]];
    setStays(list);
  };
  const remove = (i: number) => setStays(draft.stays.filter((_, k) => k !== i));
  const add = () => {
    const last = draft.stays[draft.stays.length - 1];
    const region = last?.region === "tokyo" ? "hakone" : "tokyo";
    const list = [...draft.stays];
    if (last && last.nights > 2) list[list.length - 1] = { ...last, nights: last.nights - 2 };
    setStays([...list, { region, from: "", to: "", nights: 2, lodging: null, note: null }]);
  };
  const total = draft.stays.reduce((a, s) => a + s.nights, 0);

  const onDragStart = (i: number) => (e: DragEvent) => {
    setDragging(i);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDrop = (i: number) => (e: DragEvent) => {
    e.preventDefault();
    if (dragging == null || dragging === i) return;
    const list = [...draft.stays];
    const [item] = list.splice(dragging, 1);
    list.splice(i, 0, item);
    setDragging(null);
    setStays(list);
  };

  async function save() {
    if (!draft) return;
    await saveVersion({ ...draft, name: draft.name.trim() || original!.name }, note.trim() || undefined);
    router.push(`/versions/${draft.id}`);
  }

  return (
    <Page>
      <Back href={`/versions/${id}`}>Cancel</Back>
      <PageHeader eyebrow={original.status === "plan" ? "Editing the plan (every change is logged)" : "Editing your version"} title={<input className="w-full text-[1.4rem] font-bold" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} aria-label="Version name" />}>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="seg" role="group" aria-label="Pace">
            {(["gentle", "balanced", "full"] as Pace[]).map((p) => (
              <button key={p} aria-pressed={draft.pace === p} onClick={() => setDraft({ ...draft, pace: p })}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          {original.status === "personal" ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="min-h-0" checked={draft.shared !== false} onChange={(e) => setDraft({ ...draft, shared: e.target.checked })} /> Visible to the family
            </label>
          ) : null}
        </div>
      </PageHeader>

      <div className="sticky top-0 z-10 grid gap-2 bg-bg py-2">
        <TimelineLane stays={draft.stays} trip={snapshot.trip} calendar={snapshot.calendar} regions={snapshot.regions} height={40} />
        <div className="flex items-center justify-between text-sm">
          <span className={total === snapshot.trip.nights ? "text-ok" : "text-danger"}>
            {total} / {snapshot.trip.nights} nights
          </span>
          <span className="text-muted">{findings.filter((f) => f.severity === "error").length ? "fix the errors to pass" : findings.filter((f) => f.severity === "warn").length ? `${findings.filter((f) => f.severity === "warn").length} warnings` : "rules ok"}</span>
        </div>
      </div>

      <ol className="grid gap-3">
        {draft.stays.map((s, i) => (
          <li key={i} draggable onDragStart={onDragStart(i)} onDragOver={(e) => e.preventDefault()} onDrop={onDrop(i)} className={`card grid gap-3 p-4 ${dragging === i ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-2">
              <span className="cursor-grab text-muted" aria-hidden="true" title="Drag to reorder">
                ⋮⋮
              </span>
              <RegionDot id={s.region} size={14} />
              <select className="min-w-0 flex-1" value={s.region} onChange={(e) => update(i, { region: e.target.value })} aria-label="Region">
                {regionsForPicker.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {r.status === "in_plan" ? "" : ` (${r.status.replace("_", " ")})`}
                  </option>
                ))}
              </select>
              <span className="text-sm whitespace-nowrap text-muted">{fmtRange(s.from, s.to)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-full border border-rule">
                <button className="min-h-10 px-3 text-lg" onClick={() => update(i, { nights: Math.max(0, s.nights - 1) })} aria-label="One night less">
                  −
                </button>
                <span className="min-w-16 text-center font-semibold">
                  {s.nights} night{s.nights === 1 ? "" : "s"}
                </span>
                <button className="min-h-10 px-3 text-lg" onClick={() => update(i, { nights: s.nights + 1 })} aria-label="One night more">
                  +
                </button>
              </div>
              <select value={s.lodging ?? ""} onChange={(e) => update(i, { lodging: (e.target.value || null) as Lodging | null })} aria-label="Lodging">
                {LODGING.map((l) => (
                  <option key={l} value={l}>
                    {l || "lodging?"}
                  </option>
                ))}
              </select>
              <span className="ml-auto flex gap-1">
                <button className="btn btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                  ↑
                </button>
                <button className="btn btn-sm" onClick={() => move(i, 1)} disabled={i === draft.stays.length - 1} aria-label="Move down">
                  ↓
                </button>
                <button className="btn btn-sm text-danger" onClick={() => remove(i)} aria-label="Remove stay">
                  ✕
                </button>
              </span>
            </div>
            <input placeholder="Note (e.g. New Year's Eve, via Shirakawa-go)" value={s.note ?? ""} onChange={(e) => update(i, { note: e.target.value || null })} aria-label="Note" />
            <StayNights stay={s} pace={draft.pace} allStays={draft.stays} />
            <FindingList findings={findings.filter((f) => f.stayIndex === i)} compact />
          </li>
        ))}
      </ol>
      <button className="btn" onClick={add}>
        + Add a stay
      </button>

      <div className="grid gap-2">
        <h2 className="text-[1.1rem]">Rules check</h2>
        <FindingList findings={findings.filter((f) => f.stayIndex == null)} />
      </div>

      {original.status === "plan" ? <input placeholder="What changed and why (goes in the history)" value={note} onChange={(e) => setNote(e.target.value)} /> : null}
      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          Save
        </button>
        <Link href={`/versions/${id}`} className="btn">
          Cancel
        </Link>
      </div>
    </Page>
  );
}
