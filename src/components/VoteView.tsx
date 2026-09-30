"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { routeColor } from "@/lib/colors";
import { useStore } from "./providers";

/** P1.5: rank the routes, see live totals, hearts per place and who hasn't voted. */
export function VoteView() {
  const { trip, me, votes, hearts, submitRanking, resolvedTheme } = useStore();
  const routes = trip.routes.filter((r) => r.isCandidate);
  const n = routes.length;

  const mine = useMemo(
    () =>
      votes
        .filter((v) => v.travellerId === me?.travellerId)
        .sort((a, b) => a.rank - b.rank)
        .map((v) => v.routeId),
    [votes, me],
  );
  // A local draft while reordering; otherwise show my saved ranking (live).
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [announce, setAnnounce] = useState("");
  const saved = mine.length ? [...mine, ...routes.map((r) => r.id).filter((id) => !mine.includes(id))] : routes.map((r) => r.id);
  const order = draft ?? saved;
  const dirty = draft !== null;

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setDraft(next);
    const r = routes.find((x) => x.id === next[j])!;
    setAnnounce(`${r.code} ${r.name} moved to choice ${j + 1}`);
  };

  const save = async () => {
    setSaving(true);
    await submitRanking(order);
    setSaving(false);
    setDraft(null);
    setAnnounce("Ranking saved");
  };

  const results = routes
    .map((r) => {
      const rv = votes.filter((v) => v.routeId === r.id);
      return {
        route: r,
        points: rv.reduce((a, v) => a + (n + 1 - v.rank), 0),
        firsts: rv.filter((v) => v.rank === 1).length,
      };
    })
    .sort((a, b) => b.points - a.points || b.firsts - a.firsts);
  const maxPoints = Math.max(1, ...results.map((r) => r.points));
  const voted = new Set(votes.map((v) => v.travellerId));
  const waiting = trip.travellers.filter((t) => !voted.has(t.id));

  const P = new Map(trip.places.map((p) => [p.id, p]));
  const names = new Map(trip.travellers.map((t) => [t.id, t.name]));
  const hearted = [...hearts.reduce((m, h) => m.set(h.placeId, [...(m.get(h.placeId) ?? []), h.travellerId]), new Map<string, string[]>())]
    .map(([placeId, who]) => ({ place: P.get(placeId), who }))
    .filter((x) => x.place)
    .sort((a, b) => b.who.length - a.who.length);

  return (
    <main className="mx-auto grid max-w-3xl gap-5 px-4">
      <h1 className="text-2xl font-extrabold">Vote</h1>

      <section className="card grid gap-3 p-4" aria-labelledby="rank-h">
        <div>
          <h2 id="rank-h" className="text-lg font-extrabold">
            {me ? `${me.name}, rank the routes` : "Rank the routes"}
          </h2>
          <p className="text-sm text-muted">1 is your favourite. First place earns {n} points, last place 1.</p>
        </div>
        <ol className="grid gap-2">
          {order.map((id, i) => {
            const r = routes.find((x) => x.id === id);
            if (!r) return null;
            return (
              <li key={id} className="flex items-center gap-3 rounded-lg border border-line bg-paper p-2 pl-3">
                <span className="font-display text-2xl font-extrabold tabular-nums">{i + 1}</span>
                <span className="inline-block h-8 w-1.5 rounded-full" style={{ background: routeColor(r.code, r.color, resolvedTheme) }} />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">
                    {r.code} · {r.name}
                  </span>
                  <span className="block truncate text-xs text-muted">{r.title}</span>
                </span>
                <span className="flex gap-1">
                  <button className="btn btn-sm !min-w-11" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${r.name} up`}>
                    ↑
                  </button>
                  <button className="btn btn-sm !min-w-11" onClick={() => move(i, 1)} disabled={i === order.length - 1} aria-label={`Move ${r.name} down`}>
                    ↓
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" onClick={save} disabled={!me || saving || (!dirty && mine.length === n)}>
            {saving ? "Saving…" : mine.length ? "Update my ranking" : "Save my ranking"}
          </button>
          <span className="text-sm text-muted">{!dirty && mine.length === n ? "Saved ✓" : dirty ? "Not saved yet" : ""}</span>
          <span className="sr-only" role="status">
            {announce}
          </span>
        </div>
      </section>

      <section className="card grid gap-3 p-4" aria-labelledby="res-h">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="res-h" className="text-lg font-extrabold">
            Family results
          </h2>
          <span className="text-xs text-muted">Updates live</span>
        </div>
        <ul className="grid gap-2">
          {results.map(({ route: r, points, firsts }) => (
            <li key={r.id} className="grid gap-1">
              <div className="flex justify-between text-sm">
                <span className="font-bold">
                  {r.code} · {r.name}
                </span>
                <span className="tabular-nums">
                  {points} pts{firsts ? ` · ${firsts} first choice${firsts > 1 ? "s" : ""}` : ""}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-soft" aria-hidden="true">
                <div className="h-full rounded-full" style={{ width: `${(points / maxPoints) * 100}%`, background: routeColor(r.code, r.color, resolvedTheme) }} />
              </div>
            </li>
          ))}
        </ul>
        <p className="text-sm">
          {waiting.length === 0 ? (
            <span className="font-bold text-ok">Everyone has voted.</span>
          ) : (
            <>
              <span className="text-muted">Still to vote: </span>
              {waiting.map((t) => t.name).join(", ")}
            </>
          )}
        </p>
      </section>

      <section className="card grid gap-3 p-4" aria-labelledby="hearts-h">
        <h2 id="hearts-h" className="text-lg font-extrabold">
          Most hearted places
        </h2>
        {hearted.length ? (
          <ul className="grid gap-2">
            {hearted.slice(0, 25).map(({ place, who }) => (
              <li key={place!.id} className="flex items-baseline justify-between gap-3 text-sm">
                <Link href={place!.kind === "food" ? `/food?p=${place!.slug}` : `/?p=${place!.slug}`} className="font-bold">
                  {place!.name}
                </Link>
                <span className="text-right text-muted">
                  <span className="font-bold text-accent">♥ {who.length}</span> {who.map((id) => names.get(id) ?? "?").join(", ")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No hearts yet. Open any place on the map and tap ♡.</p>
        )}
      </section>
    </main>
  );
}
