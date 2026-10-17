"use client";

import Link from "next/link";
import { useState } from "react";
import { guideFor } from "@/lib/autoGuide";
import { fmtDay } from "@/lib/dates";
import { firstName, plannerNames } from "@/lib/people";
import type { Comment } from "@/lib/types";
import { useStore } from "./providers";
import { Avatar, Back, Empty, Page, PageHeader, Section } from "./ui";

const when = (iso: string | null | undefined) => (iso ? fmtDay(iso.slice(0, 10), false) : "");

/**
 * Where the family's voice lands: routes sent to the planners (accept puts
 * the route in place, decline keeps it as it is), the wishes from the area
 * pages, comments on routes, and every change to the route with a way to
 * undo it.
 */
export function Inbox() {
  const { snapshot, me, isPlanner, decideSuggestion, withdrawSuggestion, revertHistory } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const planners = plannerNames(snapshot.travellers);
  const act = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };
  const open = snapshot.suggestions.filter((s) => s.status === "open" && (isPlanner || s.author_id === me?.travellerId));
  const decided = snapshot.suggestions.filter((s) => s.status !== "open" && (isPlanner || s.author_id === me?.travellerId)).slice(0, 10);
  const wishes = snapshot.comments.filter((c) => c.target_type === "wish").slice().reverse();
  const routeComments = snapshot.comments.filter((c) => c.target_type === "version").slice().reverse();
  const where = (c: Comment) => (c.target_id === "trip" ? "the trip" : (snapshot.regions.find((r) => r.id === c.target_id)?.name ?? c.target_id));
  const routeName = (id: string | null) => {
    const v = snapshot.versions.find((x) => x.id === id);
    return v ? (v.status === "plan" ? "the route" : guideFor(v, snapshot).theme) : "a route";
  };
  const routeHref = (id: string | null) => (snapshot.versions.find((x) => x.id === id)?.status === "plan" ? "/" : `/routes/${id}`);

  return (
    <Page>
      <Back href="/">Trip</Back>
      <PageHeader title="Inbox">
        {isPlanner
          ? "What the family has sent: routes to consider, wishes, comments on routes, and every change to the route, with a way to undo it."
          : `What you have sent to ${planners}, what they decided, and what everyone has said about the routes.`}
      </PageHeader>

      <Section title="Routes sent to consider" aside={open.length ? `${open.length} waiting` : undefined}>
        {open.length ? (
          <ul className="grid gap-3">
            {open.map((s) => (
              <li key={s.id} className="card grid gap-2 p-4">
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Avatar traveller={s.author_id} travellers={snapshot.travellers} size={24} />
                  {firstName(snapshot.travellers, s.author_id)} · {when(s.created_at)}
                </p>
                {s.from_version_id ? (
                  <Link href={routeHref(s.from_version_id)} className="display text-[1.15rem] leading-tight">
                    {routeName(s.from_version_id)} →
                  </Link>
                ) : null}
                {s.comment ? <p className="text-ink-2">“{s.comment}”</p> : null}
                <ul className="grid gap-0.5 text-sm text-ink-2">
                  {s.diff.summary.map((line) => (
                    <li key={line}>· {line}</li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  {isPlanner ? (
                    <>
                      <button className="btn btn-sm btn-primary" disabled={busy === s.id} onClick={() => act(s.id, () => decideSuggestion(s.id, "accepted"))}>
                        Make it the route
                      </button>
                      <button className="btn btn-sm" disabled={busy === s.id} onClick={() => act(s.id, () => decideSuggestion(s.id, "declined"))}>
                        Keep the route as it is
                      </button>
                    </>
                  ) : null}
                  {s.author_id === me?.travellerId ? (
                    <button className="btn btn-sm" disabled={busy === s.id} onClick={() => act(s.id, () => withdrawSuggestion(s.id))}>
                      Take it back
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>{isPlanner ? "Nothing waiting. When someone sends a route from its page, it lands here." : `Nothing waiting. Build a route, then send it to ${planners} from its page.`}</Empty>
        )}
        {decided.length ? (
          <ul className="grid gap-1 text-sm text-muted">
            {decided.map((s) => (
              <li key={s.id}>
                {firstName(snapshot.travellers, s.author_id)}’s “{routeName(s.from_version_id)}”: {s.status === "accepted" ? "made the route" : "kept as an idea"} by {firstName(snapshot.travellers, s.decided_by)} on {when(s.decided_at)}
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section title="Wishes" aside={wishes.length ? `${wishes.length}` : undefined}>
        {wishes.length ? (
          <ul className="grid gap-2">
            {wishes.map((c) => (
              <li key={c.id} className="flex gap-2">
                <Avatar traveller={c.author_id} travellers={snapshot.travellers} size={26} />
                <div className="min-w-0">
                  <p className="text-xs text-muted">
                    {firstName(snapshot.travellers, c.author_id)} · {when(c.created_at)} ·{" "}
                    {c.target_id === "trip" ? "the trip" : <Link href={`/areas/${c.target_id}`}>{where(c)}</Link>}
                  </p>
                  <p>{c.body}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No wishes yet. Anyone can send one from the bottom of Places or of any area page.</Empty>
        )}
      </Section>

      <Section title="Comments on routes" aside={routeComments.length ? `${routeComments.length}` : undefined}>
        {routeComments.length ? (
          <ul className="grid gap-2">
            {routeComments.map((c) => (
              <li key={c.id} className="flex gap-2">
                <Avatar traveller={c.author_id} travellers={snapshot.travellers} size={26} />
                <div className="min-w-0">
                  <p className="text-xs text-muted">
                    {firstName(snapshot.travellers, c.author_id)} · {when(c.created_at)} · <Link href={routeHref(c.target_id)}>{routeName(c.target_id)}</Link>
                  </p>
                  <p className="whitespace-pre-wrap">{c.body}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No comments yet. Every route has a comment box at the bottom of its page.</Empty>
        )}
      </Section>

      <Section title="Changes to the route" aside={snapshot.history.length ? `${snapshot.history.length}` : undefined}>
        {snapshot.history.length ? (
          <ul className="grid gap-2">
            {snapshot.history.map((h, i) => (
              <li key={h.id} className="card grid gap-1 p-3 text-sm">
                <p className="text-xs text-muted">
                  {firstName(snapshot.travellers, h.actor_id)} · {when(h.at)}
                </p>
                <ul className="text-ink-2">
                  {h.change.summary.map((line) => (
                    <li key={line}>· {line}</li>
                  ))}
                </ul>
                {isPlanner && i === 0 ? (
                  <button className="btn btn-sm justify-self-start" disabled={busy === h.id} onClick={() => act(h.id, () => revertHistory(h.id))}>
                    Undo this change
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>The route has not changed since it was written.</Empty>
        )}
      </Section>
    </Page>
  );
}
