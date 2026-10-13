"use client";

import Image from "next/image";
import Link from "next/link";
import { PACE_ART, art } from "@/lib/art";
import { useState } from "react";
import type { MustDoVote, Pace, PaceVote, RankVote, Version } from "@/lib/types";
import { paceLabel } from "@/lib/versions";
import { useStore } from "./providers";
import { Avatar, Empty, Page, PageHeader, RegionDot, Section } from "./ui";

const PACE_BLURB: Record<Pace, string> = {
  gentle: "One main outing a day, done in the morning, then rest. Nobody is ever tired.",
  balanced: "One main outing, a 2–4 pm rest, then one short visit. Full days with a real break.",
  full: "Two main outings a day. A classic sightseeing trip; tiring by week two.",
};

export function Vote() {
  const { snapshot, me, isPlanner, setVote, revealRanks, rankRevealed, busy } = useStore();
  const myPace = snapshot.votes.find((v) => v.kind === "pace" && v.traveller_id === me?.travellerId) as PaceVote | undefined;
  const myMust = snapshot.votes.find((v) => v.kind === "mustdo" && v.traveller_id === me?.travellerId) as MustDoVote | undefined;
  const myRank = snapshot.votes.find((v) => v.kind === "rank" && v.traveller_id === me?.travellerId) as RankVote | undefined;
  const rankable = snapshot.versions.filter((v) => v.status !== "legacy" && v.shared !== false);
  const [order, setOrder] = useState<string[]>(() => {
    const saved = myRank?.value.order ?? [];
    return [...saved.filter((id) => rankable.some((v) => v.id === id)), ...rankable.filter((v) => !saved.includes(v.id)).map((v) => v.id)];
  });
  const [q, setQ] = useState("");
  const must = myMust?.value.places ?? [];

  const paceVotes = snapshot.votes.filter((v) => v.kind === "pace") as PaceVote[];
  const mustVotes = snapshot.votes.filter((v) => v.kind === "mustdo") as MustDoVote[];
  const rankVotes = snapshot.votes.filter((v) => v.kind === "rank") as RankVote[];
  const notAnswered = snapshot.travellers.filter((t) => !paceVotes.some((v) => v.traveller_id === t.id) || !mustVotes.some((v) => v.traveller_id === t.id));
  const notRanked = snapshot.travellers.filter((t) => !rankVotes.some((v) => v.traveller_id === t.id));

  const mustTally = tallyMustDos(mustVotes);
  const totals = rankTotals(rankVotes, rankable);

  const places = snapshot.places.filter((p) => p.size !== "meal");
  const filtered = q.trim() ? places.filter((p) => `${p.name} ${p.region} ${p.kind}`.toLowerCase().includes(q.toLowerCase())) : [];

  function moveRank(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  }

  const toggleMust = (id: string) => {
    const next = must.includes(id) ? must.filter((x) => x !== id) : must.length >= 2 ? [must[1], id] : [...must, id];
    setVote("mustdo", { places: next });
  };

  const versionName = (id: string) => snapshot.versions.find((v) => v.id === id)?.name ?? id;

  return (
    <Page>
      <PageHeader eyebrow="Align first, then plan" title="Vote">
        Your pace, your two must-dos, and your ranking of the versions. Pace and must-dos show live; rankings stay hidden until everyone has voted.
      </PageHeader>

      <Section title="1 · Your pace" aside={myPace ? `you chose ${paceLabel(myPace.value.pace)}` : "not answered"}>
        <div className="grid gap-2">
          {(["gentle", "balanced", "full"] as Pace[]).map((p) => (
            <button key={p} className={`card grid gap-1 overflow-hidden text-left ${myPace?.value.pace === p ? "ring-2 ring-accent" : ""}`} onClick={() => setVote("pace", { pace: p })} disabled={busy} aria-pressed={myPace?.value.pace === p}>
              <span className="relative block aspect-[3/1] w-full">
                <Image src={art(PACE_ART[p])} alt="" fill sizes="(max-width: 640px) 100vw, 640px" className="object-cover" />
              </span>
              <span className="grid gap-1 p-4 pt-3">
              <span className="flex items-center justify-between">
                <b className="text-[1.05rem]">{paceLabel(p)}</b>
                <span className="text-xs text-muted">{snapshot.pace.levels[p].walking_km} km a day</span>
              </span>
              <span className="text-sm text-ink-2">{PACE_BLURB[p]}</span>
              <span className="flex gap-1 pt-1">
                {paceVotes
                  .filter((v) => v.value.pace === p)
                  .map((v) => (
                    <Avatar key={v.traveller_id} traveller={v.traveller_id} travellers={snapshot.travellers} size={22} />
                  ))}
              </span>
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="2 · Two must-dos" aside={`${must.length}/2 picked`}>
        <ul className="grid gap-2">
          {must.map((id) => {
            const p = snapshot.places.find((x) => x.id === id);
            return (
              <li key={id} className="card flex items-center justify-between gap-2 p-3">
                <span className="flex items-center gap-2">
                  {p ? <RegionDot id={p.region} /> : null}
                  <Link href={`/places/${id}`} className="font-semibold no-underline">
                    {p?.name ?? id}
                  </Link>
                </span>
                <button className="btn btn-sm" onClick={() => toggleMust(id)}>
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
        <input placeholder="Search the library… e.g. Kenroku-en, snow, museum" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search places" />
        {q.trim() ? (
          <ul className="grid max-h-72 gap-1 overflow-auto">
            {filtered.slice(0, 20).map((p) => (
              <li key={p.id}>
                <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-bg-2" onClick={() => toggleMust(p.id)} disabled={busy}>
                  <RegionDot id={p.region} />
                  <span className="flex-1">
                    {p.name} <span className="text-xs text-muted">· {snapshot.regions.find((r) => r.id === p.region)?.name} · {p.size.replace("_", " ")}</span>
                  </span>
                  {must.includes(p.id) ? <span className="text-ok">✓</span> : null}
                </button>
              </li>
            ))}
            {!filtered.length ? <li className="px-2 text-sm text-muted">Nothing matches.</li> : null}
          </ul>
        ) : null}
      </Section>

      <Section title="3 · Rank the versions" aside={myRank ? "saved" : "not ranked"}>
        <ol className="grid gap-2">
          {order.map((id, i) => (
            <li key={id} className="card flex items-center gap-2 p-3">
              <span className="w-6 text-center font-bold text-muted">{i + 1}</span>
              <Link href={`/versions/${id}`} className="flex-1 font-semibold no-underline">
                {versionName(id)}
              </Link>
              <button className="btn btn-sm" onClick={() => moveRank(i, -1)} disabled={i === 0} aria-label="Move up">
                ↑
              </button>
              <button className="btn btn-sm" onClick={() => moveRank(i, 1)} disabled={i === order.length - 1} aria-label="Move down">
                ↓
              </button>
            </li>
          ))}
        </ol>
        <button className="btn btn-primary" onClick={() => setVote("rank", { order })} disabled={busy}>
          {myRank ? "Update my ranking" : "Save my ranking"}
        </button>
      </Section>

      <Section title="Where we stand" aside={`${snapshot.travellers.length} travellers`}>
        <div className="card grid gap-4 p-4">
          <div>
            <p className="eyebrow">Pace</p>
            <p>
              {(["gentle", "balanced", "full"] as Pace[]).map((p) => `${paceLabel(p)} ${paceVotes.filter((v) => v.value.pace === p).length}`).join(" · ")}
              {paceVotes.length ? (
                <span className="text-muted">
                  {" "}
                  · {new Set(paceVotes.map((v) => v.value.pace)).size === 1 ? "everyone agrees so far" : "not yet agreed"}
                </span>
              ) : null}
            </p>
          </div>
          <div>
            <p className="eyebrow">Must-dos</p>
            {mustTally.length ? (
              <ul className="grid gap-1">
                {mustTally.map(([id, who]) => {
                  const p = snapshot.places.find((x) => x.id === id);
                  return (
                    <li key={id} className="flex items-center gap-2">
                      {p ? <RegionDot id={p.region} /> : null}
                      <Link href={`/places/${id}`} className="no-underline">
                        {p?.name ?? id}
                      </Link>
                      <span className="ml-auto flex gap-0.5">
                        {who.map((t) => (
                          <Avatar key={t} traveller={t} travellers={snapshot.travellers} size={20} />
                        ))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted">No must-dos yet.</p>
            )}
          </div>
          <div>
            <p className="eyebrow">Hasn’t answered</p>
            <p>{notAnswered.length ? notAnswered.map((t) => t.name).join(", ") : "Everyone has answered pace and must-dos."}</p>
          </div>
          <div>
            <p className="eyebrow">Ranking</p>
            {rankRevealed ? (
              <ol className="grid gap-1">
                {totals.map(({ v, score, firsts }, i) => (
                  <li key={v.id} className="flex items-center gap-2">
                    <span className="w-6 text-center font-bold text-muted">{i + 1}</span>
                    <Link href={`/versions/${v.id}`} className="flex-1 no-underline">
                      {v.name}
                    </Link>
                    <span className="text-sm text-muted">
                      {score} pts · {firsts} first
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p>
                {rankVotes.length} of {snapshot.travellers.length} have ranked. Totals open when everyone has voted{notRanked.length ? ` (waiting on ${notRanked.map((t) => t.name).join(", ")})` : ""}.
                {isPlanner && rankVotes.length ? (
                  <button className="btn btn-sm ml-2" onClick={() => confirm("Reveal the ranking totals to everyone now?") && revealRanks()} disabled={busy}>
                    Reveal now
                  </button>
                ) : null}
              </p>
            )}
          </div>
        </div>
      </Section>
      {!rankable.length ? <Empty>No versions to rank.</Empty> : null}
    </Page>
  );
}

function tallyMustDos(mustVotes: MustDoVote[]): [string, string[]][] {
  const m = new Map<string, string[]>();
  for (const v of mustVotes) for (const p of v.value.places ?? []) m.set(p, [...(m.get(p) ?? []), v.traveller_id]);
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
}

/** Borda count: first place scores n points, last scores 1. */
export function rankTotals(rankVotes: RankVote[], rankable: Version[]): { v: Version; score: number; firsts: number }[] {
  const score = new Map<string, number>();
  const firsts = new Map<string, number>();
  for (const v of rankVotes) {
    const o = v.value.order ?? [];
    o.forEach((id, i) => {
      score.set(id, (score.get(id) ?? 0) + Math.max(0, o.length - i));
      if (i === 0) firsts.set(id, (firsts.get(id) ?? 0) + 1);
    });
  }
  return rankable.map((v) => ({ v, score: score.get(v.id) ?? 0, firsts: firsts.get(v.id) ?? 0 })).sort((a, b) => b.score - a.score);
}
