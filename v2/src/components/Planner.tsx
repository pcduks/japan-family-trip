"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { budgetOf, fmtSgd } from "@/lib/budget";
import { regionColor, fitLabel } from "@/lib/colors";
import { fmtDay, fmtRange } from "@/lib/dates";
import { stayNote } from "@/lib/guide";
import { LODGING_TYPES } from "@/lib/lodging";
import { checkVersion, type Finding } from "@/lib/rules";
import type { Lodging, Pace, Region, Stay, Version } from "@/lib/types";
import { copyVersion, movesOf, newId, rebalance, relayout } from "@/lib/versions";
import { useStore } from "./providers";
import { RegionCover } from "./RegionCover";
import { StayLodging } from "./StayLodging";
import { StayNights } from "./StayNights";
import { TimelineLane } from "./Timeline";
import { FindingList, RegionDot } from "./ui";

const SPRING = { type: "spring", stiffness: 420, damping: 32 } as const;
const PACES: Pace[] = ["gentle", "balanced", "full"];
const LODGINGS: Lodging[] = ["hotel", "rental", "ryokan"];

type Status = "idle" | "saving" | "saved" | "error";

/**
 * The itinerary as something you move with your thumb: drag the handle to
 * reorder, tap a name to swap the place, +/− for nights, tap “Add a stop”.
 * Changes save on their own. Someone who may not edit this version gets
 * their own copy the moment they change something.
 */
export function Planner({ version, onSuggest, onDraft, keepTotal }: { version: Version; onSuggest?: () => void; /** Draft mode: report every change here and save nothing. */ onDraft?: (v: Version) => void; /** Keep the trip at this many nights: a night added here is taken from elsewhere. */ keepTotal?: number }) {
  const { snapshot, rules, me, isPlanner, saveVersion, demo } = useStore();
  const router = useRouter();
  const canEdit = isPlanner || (version.status === "personal" && version.owner === me?.travellerId);
  const plan = snapshot.versions.find((v) => v.status === "plan");

  const [draft, setDraft] = useState<Version>(version);
  const [synced, setSynced] = useState<Version>(version);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [undo, setUndo] = useState<Version[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ mode: "swap"; index: number } | { mode: "add" } | null>(null);
  const [openStay, setOpenStay] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const forkRef = useRef<string | null>(null);
  const [forked, setForked] = useState(false);

  // Follow the server while nothing is being edited here (someone else may have changed it).
  if (version !== synced && !dirty && !onDraft) {
    setSynced(version);
    setDraft(version);
  }

  const findings = useMemo(() => checkVersion(draft, rules), [draft, rules]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = draft.stays.map((s, i) => s.id ?? `stay-${i}`);
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    commit(arrayMove(draft.stays, from, to));
  };
  const moves = useMemo(() => movesOf(draft.stays, snapshot.regions), [draft.stays, snapshot.regions]);
  const total = draft.stays.reduce((a, s) => a + s.nights, 0);
  const budget = useMemo(() => budgetOf(draft, snapshot.regions), [draft, snapshot.regions]);
  const errors = findings.filter((f) => f.severity === "error").length;
  const warns = findings.filter((f) => f.severity === "warn").length;
  const myMustDos = (snapshot.votes.find((x) => x.kind === "mustdo" && x.traveller_id === me?.travellerId)?.value as { places?: string[] } | undefined)?.places;

  const persist = useCallback(
    async (next: Version) => {
      if (!me) return;
      setStatus("saving");
      try {
        if (canEdit) {
          await saveVersion(next);
          setStatus("saved");
          setDirty(false);
          return;
        }
        const first = me.name.split(" ")[0];
        if (forkRef.current) {
          await saveVersion({ ...next, id: forkRef.current, status: "personal", owner: me.travellerId, parent_version_id: version.id });
          setStatus("saved");
          return;
        }
        const mine = copyVersion(next, me.travellerId, `${first}’s ${version.status === "personal" ? "copy of " + version.name : version.name.replace(/^The plan.*/i, "plan")}`, snapshot.trip.start);
        mine.parent_version_id = version.id;
        mine.pace = next.pace;
        forkRef.current = mine.id;
        setForked(true);
        await saveVersion(mine);
        setStatus("saved");
        setToast(demo ? "This is now your own version (demo: this browser only)." : "This is now your own version. Shape it, then suggest it to the plan.");
        router.replace(`/versions/${mine.id}`);
      } catch {
        setStatus("error");
      }
    },
    [canEdit, me, saveVersion, version.id, version.name, version.status, snapshot.trip.start, router, demo],
  );

  const commit = useCallback(
    (stays: Stay[], patch: Partial<Version> = {}) => {
      const next: Version = { ...draft, ...patch, stays: relayout(stays, snapshot.trip.start) };
      setUndo((u) => [...u.slice(-19), draft]);
      setDraft(next);
      if (onDraft) {
        onDraft(next);
        return;
      }
      setDirty(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => persist(next), canEdit ? 1200 : 500);
    },
    [draft, snapshot.trip.start, persist, canEdit, onDraft],
  );
  /** Commit, first moving nights around so the trip keeps its length (when asked to). */
  const commitBalanced = (stays: Stay[], changed: number) => {
    if (!keepTotal) return commit(stays);
    const r = rebalance(stays, changed, keepTotal, snapshot.regions);
    if (r.note) setToast(r.note.charAt(0).toUpperCase() + r.note.slice(1));
    commit(r.stays);
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const update = (i: number, patch: Partial<Stay>) => {
    const stays = draft.stays.map((s, k) => (k === i ? { ...s, ...patch } : s));
    if (patch.nights != null && patch.nights !== draft.stays[i].nights) commitBalanced(stays, i);
    else commit(stays);
  };
  const remove = (i: number) => {
    const gone = draft.stays[i];
    const rest = draft.stays.filter((_, k) => k !== i);
    if (keepTotal && gone && rest.length) {
      const to = Math.max(0, i - 1);
      rest[to] = { ...rest[to], nights: rest[to].nights + gone.nights };
      setToast(`${gone.nights} ${gone.nights === 1 ? "night" : "nights"} moved to ${snapshot.regions.find((r) => r.id === rest[to].region)?.name ?? rest[to].region}.`);
    }
    commit(rest);
  };
  const undoLast = () => {
    const prev = undo[undo.length - 1];
    if (!prev) return;
    setUndo((u) => u.slice(0, -1));
    setDraft(prev);
    if (onDraft) {
      onDraft(prev);
      return;
    }
    setDirty(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(prev), 600);
  };
  const suggestedNights = (r: Region): number => {
    const n = r.suggested_nights?.[draft.pace] ?? r.suggested_nights?.balanced ?? 2;
    const parsed = typeof n === "number" ? n : parseInt(String(n), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
  };
  const addStop = (regionId: string) => {
    const r = snapshot.regions.find((x) => x.id === regionId);
    const stay: Stay = { id: newId(), region: regionId, from: "", to: "", nights: r ? suggestedNights(r) : 2, lodging: null, note: null };
    const list = [...draft.stays];
    const last = list[list.length - 1];
    const at = last && last.region === "tokyo" && list.length > 1 ? list.length - 1 : list.length;
    list.splice(at, 0, stay);
    commitBalanced(list, at);
    setOpenStay(stay.id!);
  };
  const fitTo = (target: number) => {
    const list = draft.stays.map((s) => ({ ...s }));
    let guard = 60;
    while (list.reduce((a, s) => a + s.nights, 0) !== target && guard-- > 0) {
      const sum = list.reduce((a, s) => a + s.nights, 0);
      const candidates = sum > target ? list.filter((s) => s.nights > 2) : list;
      if (!candidates.length) break;
      const longest = candidates.reduce((a, s) => (s.nights > a.nights ? s : a), candidates[0]);
      longest.nights += sum > target ? -1 : 1;
    }
    commit(list);
  };

  const lastTokyoIndex = draft.stays.length - 1;
  const differsFromPlan = plan && draft.id !== plan.id && JSON.stringify(plan.stays.map((s) => [s.region, s.nights])) !== JSON.stringify(draft.stays.map((s) => [s.region, s.nights]));

  return (
    <div className="grid gap-4">
      {/* Sticky summary: the timeline moves as you edit. */}
      <div className="sticky top-0 z-20 -mx-4 grid gap-2 bg-bg/95 px-4 py-2 backdrop-blur">
        <TimelineLane stays={draft.stays} trip={snapshot.trip} calendar={snapshot.calendar} regions={snapshot.regions} height={40} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className={`font-semibold ${total === snapshot.trip.nights ? "text-ok" : "text-danger"}`}>
            <AnimatedNumber value={total} /> / {snapshot.trip.nights} nights
          </span>
          {total !== snapshot.trip.nights ? (
            <button className="btn btn-sm" onClick={() => fitTo(snapshot.trip.nights)}>
              Fit to {snapshot.trip.nights}
            </button>
          ) : null}
          <span className={errors ? "text-danger" : warns ? "text-warn" : "text-ok"}>{errors ? `${errors} to fix` : warns ? `${warns} warning${warns > 1 ? "s" : ""}` : "nothing to flag"}</span>
          <span className="text-muted">{fmtSgd(budget.perCoupleSgd)} per couple</span>
          <span className="ml-auto flex items-center gap-2">
            {undo.length ? (
              <button className="btn btn-sm" onClick={undoLast}>
                Undo
              </button>
            ) : null}
            {onDraft ? null : <SaveStatus status={status} canEdit={canEdit} forked={forked} />}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="seg" role="group" aria-label="Pace">
          {PACES.map((p) => (
            <button key={p} aria-pressed={draft.pace === p} onClick={() => commit(draft.stays, { pace: p })}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">{onDraft ? `Drag the handle to reorder, tap a name to swap it, +/− for nights${keepTotal ? ` (the trip stays at ${keepTotal} nights)` : ""}. Nothing is saved until you save it.` : canEdit ? "Drag the handle to reorder. Tap a name to swap it. Changes save on their own." : "Change anything and it becomes your own version to shape and suggest."}</p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} autoScroll={false} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol className="grid gap-3 select-none" style={{ overflowAnchor: "none" }}>
            <AnimatePresence initial={false}>
          {draft.stays.map((s, i) => {
            const region = snapshot.regions.find((r) => r.id === s.region);
            const move = moves.find((m) => m.index === i);
            const stayFindings = findings.filter((f) => f.stayIndex === i);
            return (
              <StayCard
                key={ids[i]}
                sortId={ids[i]}
                stay={s}
                index={i}
                region={region}
                move={move ? { hours: move.hours, how: move.how, curated: move.curated, date: move.date } : null}
                findings={stayFindings}
                note={stayNote(draft.id, draft.stays, i)}
                pace={draft.pace}
                allStays={draft.stays}
                mustDos={myMustDos}
                open={openStay === (s.id ?? "")}
                onToggle={() => setOpenStay(openStay === s.id ? null : (s.id ?? null))}
                onNights={(n) => update(i, { nights: Math.max(1, n) })}
                onLodging={(l) => update(i, { lodging: l })}
                onNote={(n) => update(i, { note: n })}
                onSwap={() => setPicker({ mode: "swap", index: i })}
                onRemove={() => remove(i)}
                isLast={i === lastTokyoIndex}
              />
            );
          })}
            </AnimatePresence>
          </ol>
        </SortableContext>
      </DndContext>

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={() => setPicker({ mode: "add" })}>
          + Add a stop
        </button>
        {differsFromPlan && draft.status === "personal" && onSuggest ? (
          <button className="btn" onClick={onSuggest}>
            Suggest this to the plan
          </button>
        ) : null}
      </div>

      <FindingList findings={findings.filter((f) => f.stayIndex == null)} />

      <RegionPicker
        open={picker !== null}
        title={picker?.mode === "add" ? "Add a stop" : "Swap this stop for"}
        current={picker?.mode === "swap" ? draft.stays[picker.index]?.region : undefined}
        regions={snapshot.regions}
        pace={draft.pace}
        onClose={() => setPicker(null)}
        onPick={(id) => {
          if (picker?.mode === "swap") update(picker.index, { region: id, note: null });
          else addStop(id);
          setPicker(null);
        }}
      />

      <AnimatePresence>
        {toast ? (
          <motion.div
            key="toast"
            className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-md rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-bg shadow-[var(--glow)]"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={SPRING}
            role="status"
          >
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SaveStatus({ status, canEdit, forked }: { status: Status; canEdit: boolean; forked: boolean }) {
  const text = status === "saving" ? "Saving…" : status === "saved" ? (canEdit || forked ? "Saved" : "Saved as your version") : status === "error" ? "Could not save" : canEdit ? "" : "";
  return (
    <AnimatePresence mode="wait" initial={false}>
      {text ? (
        <motion.span key={text} className={`text-xs ${status === "error" ? "text-danger" : "text-muted"}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {text}
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  return (
    <span className="inline-grid overflow-hidden align-baseline">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} className="inline-block" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.18 }}>
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

interface CardProps {
  sortId: string;
  stay: Stay;
  index: number;
  region: Region | undefined;
  move: { hours: number; how: string; curated: boolean; date: string } | null;
  findings: Finding[];
  note: string | null;
  pace: Pace;
  allStays: Stay[];
  mustDos?: string[];
  open: boolean;
  isLast: boolean;
  onToggle: () => void;
  onNights: (n: number) => void;
  onLodging: (l: Lodging | null) => void;
  onNote: (n: string | null) => void;
  onSwap: () => void;
  onRemove: () => void;
}

function StayCard({ sortId, stay: s, region, move, findings, note, pace, allStays, mustDos, open, onToggle, onNights, onLodging, onNote, onSwap, onRemove }: CardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: sortId });
  const color = regionColor(s.region);
  return (
    <motion.li
      ref={setNodeRef}
      className="relative grid gap-2"
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 20 : undefined }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: isDragging ? 1.02 : 1, boxShadow: isDragging ? "0 18px 40px -18px rgba(0,0,0,.5)" : "0 0 0 0 rgba(0,0,0,0)" }}
      exit={{ opacity: 0, scale: 0.92, height: 0, marginTop: -12 }}
      transition={SPRING}
    >
      {move ? (
        <p className="flex flex-wrap items-center gap-x-2 pl-3 text-sm text-muted">
          ↓ {move.hours}
          {move.curated ? "" : "~"} h · {move.how} · {fmtDay(move.date)}
        </p>
      ) : null}
      <div className="card overflow-hidden" style={{ borderLeft: `5px solid ${color}` }}>
        <div className="flex items-stretch">
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="flex w-11 shrink-0 cursor-grab touch-none items-center justify-center text-muted active:cursor-grabbing"
            style={{ touchAction: "none" }}
            aria-label={`Drag ${region?.name ?? s.region} to reorder`}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
              <circle cx="9" cy="6" r="1.8" />
              <circle cx="15" cy="6" r="1.8" />
              <circle cx="9" cy="12" r="1.8" />
              <circle cx="15" cy="12" r="1.8" />
              <circle cx="9" cy="18" r="1.8" />
              <circle cx="15" cy="18" r="1.8" />
            </svg>
          </button>
          <button className="w-16 shrink-0 self-stretch overflow-hidden sm:w-28" onClick={onSwap} aria-label="Swap this place">
            <RegionCover regionId={s.region} className="h-full w-full" sizes="120px" />
          </button>
          <div className="grid min-w-0 flex-1 gap-2 py-3 pr-3 pl-3">
            <div className="grid gap-0.5">
              <button className="flex min-w-0 items-center gap-2 text-left" onClick={onSwap}>
                <RegionDot id={s.region} size={12} />
                <span className="display text-[1.25rem] leading-tight">{region?.name ?? s.region}</span>
                <span aria-hidden="true" className="text-muted">
                  ⇄
                </span>
              </button>
              <span className="text-sm text-muted">{s.from ? fmtRange(s.from, s.to) : ""}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-full border border-rule bg-bg">
                <button className="min-h-10 min-w-10 px-2 text-xl leading-none" onClick={() => onNights(s.nights - 1)} aria-label="One night less" disabled={s.nights <= 1}>
                  −
                </button>
                <span className="min-w-[4.6rem] text-center text-sm font-semibold">
                  <AnimatedNumber value={s.nights} /> night{s.nights === 1 ? "" : "s"}
                </span>
                <button className="min-h-10 min-w-10 px-2 text-xl leading-none" onClick={() => onNights(s.nights + 1)} aria-label="One night more">
                  +
                </button>
              </div>
              <div className="seg" role="group" aria-label="Lodging">
                {LODGINGS.map((l) => (
                  <button key={l} aria-pressed={s.lodging === l} onClick={() => onLodging(s.lodging === l ? null : l)} className="!px-2 !text-xs">
                    {LODGING_TYPES[l].label}
                  </button>
                ))}
              </div>
            </div>
            {s.note ? <p className="text-sm text-ink-2">{s.note}</p> : null}
            {findings.length ? <FindingList findings={findings} compact /> : null}
            <button className="text-left text-sm text-muted" onClick={onToggle} aria-expanded={open}>
              {open ? "▴ Less" : "▾ Why this long, where to stay, notes"}
            </button>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div key="more" className="grid gap-3 border-t border-rule px-3 pt-3 pb-3" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: "hidden" }}>
              {note ? (
                <p className="text-sm text-ink-2">
                  <b>Why {s.nights} night{s.nights === 1 ? "" : "s"}:</b> {note}
                </p>
              ) : null}
              <StayNights stay={s} pace={pace} allStays={allStays} mustDos={mustDos} />
              <input placeholder="A note for this stop (New Year’s Eve, via Shirakawa-go…)" value={s.note ?? ""} onChange={(e) => onNote(e.target.value || null)} aria-label="Note" />
              <StayLodging stay={s} region={region} />
              <button className="btn btn-sm justify-self-start text-danger" onClick={onRemove} aria-label={`Remove ${region?.name ?? s.region}`}>
                Remove this stop
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.li>
  );
}

/** Bottom sheet of places to swap in or add, in-plan first, then the candidates. */
function RegionPicker({ open, title, current, regions, pace, onClose, onPick }: { open: boolean; title: string; current?: string; regions: Region[]; pace: Pace; onClose: () => void; onPick: (id: string) => void }) {
  const order: Record<string, number> = { in_plan: 0, option: 1, candidate_fits: 2, day_trip: 3, candidate_maybe: 4, not_this_trip: 5 };
  const list = [...regions].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.name.localeCompare(b.name));
  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto grid max-h-[85vh] max-w-2xl grid-rows-[auto_1fr] gap-3 rounded-t-3xl bg-bg p-4 pb-[max(1rem,env(safe-area-inset-bottom))] outline-none" aria-describedby={undefined}>
          <div className="flex items-center justify-between">
            <Dialog.Title className="display text-[1.5rem]">{title}</Dialog.Title>
            <Dialog.Close className="btn btn-sm">Close</Dialog.Close>
          </div>
          <ul className="grid grid-cols-2 gap-2 overflow-y-auto pb-2 sm:grid-cols-3">
            {list.map((r) => {
              const n = r.suggested_nights?.[pace] ?? r.suggested_nights?.balanced;
              return (
                <li key={r.id}>
                  <button className={`card grid w-full overflow-hidden text-left transition-transform active:scale-95 ${current === r.id ? "ring-2 ring-accent" : ""}`} onClick={() => onPick(r.id)}>
                    <RegionCover regionId={r.id} className="aspect-[3/2]">
                      <span className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-[0.65rem] font-bold text-white" style={{ background: regionColor(r.id) }}>
                        {fitLabel(r.status)}
                      </span>
                    </RegionCover>
                    <span className="grid gap-0.5 p-2.5">
                      <span className="display text-[1.05rem] leading-tight">{r.name}</span>
                      <span className="text-xs text-muted">{n ? `${n} nights at ${pace}` : r.summary ?? ""}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
