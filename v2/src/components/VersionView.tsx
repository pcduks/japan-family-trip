"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DayByDay } from "./DayByDay";
import { versionGuide } from "@/lib/guide";
import { BudgetCard } from "./Budget";
import { checkVersion } from "@/lib/rules";
import type { Version } from "@/lib/types";
import { describeDiff, paceLabel, statsOf } from "@/lib/versions";
import { VersionStatsRow } from "./Board";
import { Comments } from "./Comments";
import { useStore } from "./providers";
import { Planner } from "./Planner";
import { Avatar, Back, Empty, FindingList, Page, PageHeader, RegionDot, Section } from "./ui";

export function VersionView({ id }: { id: string }) {
  const { snapshot, rules, me, isPlanner, deleteVersion, suggest, decideSuggestion, withdrawSuggestion, revertHistory, busy } = useStore();
  const router = useRouter();
  const v = snapshot.versions.find((x) => x.id === id) ?? snapshot.legacy_routes.find((x) => x.id === id);
  const [comment, setComment] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const version = v && "pace" in v ? (v as Version) : null;
  const findings = useMemo(() => (version ? checkVersion(version, rules) : []), [version, rules]);

  if (!v)
    return (
      <Page>
        <Back href="/route">The route</Back>
        <Empty>No such version.</Empty>
      </Page>
    );

  if (!version) {
    const legacy = v as (typeof snapshot.legacy_routes)[number];
    return (
      <Page>
        <Back href="/route">The route</Back>
        <PageHeader eyebrow="Legacy, for reference" title={legacy.name}>
          {legacy.title}. {legacy.note}.
        </PageHeader>
        <ul className="grid gap-1">
          {legacy.stays.map((s, i) => (
            <li key={i} className="flex items-center gap-2">
              <RegionDot id={s.place} /> {s.place} · {s.nights} nights
            </li>
          ))}
        </ul>
      </Page>
    );
  }

  const plan = snapshot.versions.find((x) => x.status === "plan");
  const canEdit = isPlanner || (version.status === "personal" && version.owner === me?.travellerId);
  const owner = version.owner === "planners" ? null : snapshot.travellers.find((t) => t.id === version.owner);
  const st = statsOf(version, snapshot);
  const openSuggestions = snapshot.suggestions.filter((s) => s.status === "open");
  const days = snapshot.days.filter((d) => d.version_id === version.id);
  const diffVsPlan = plan && version.id !== plan.id ? describeDiff(plan.stays, version.stays, snapshot.regions) : [];
  const guide = versionGuide(version.id);
  const regionName = (id: string) => snapshot.regions.find((r) => r.id === id)?.name ?? id;

  async function sendSuggestion() {
    if (!plan) return;
    const summary = describeDiff(plan.stays, version!.stays, snapshot.regions);
    if (version!.pace !== plan.pace) summary.unshift(`pace ${plan.pace} → ${version!.pace}`);
    await suggest(version!.id, { stays: version!.stays, pace: version!.pace !== plan.pace ? version!.pace : undefined, summary }, comment);
    setSuggesting(false);
    setComment("");
  }

  async function share() {
    const url = `${location.origin}/versions/${version!.id}`;
    try {
      if (navigator.share) await navigator.share({ title: version!.name, url });
      else {
        await navigator.clipboard.writeText(url);
        alert("Link copied.");
      }
    } catch {}
  }

  return (
    <Page>
      <Back href="/route">The route</Back>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            {version.status === "plan" ? "The plan · only planners edit it" : version.status === "alternative" ? "Alternative from the research" : owner ? `${owner.name}’s version` : "Version"}
            {version.shared === false ? <span className="chip">private</span> : null}
          </span>
        }
        title={
          <span className="flex items-center gap-2">
            {owner ? <Avatar traveller={owner} travellers={snapshot.travellers} /> : null}
            {version.name}
          </span>
        }
        action={<span className="chip shrink-0">{paceLabel(version.pace)}</span>}
      >
        {guide ? (
          <p className="display text-[1.35rem] leading-tight text-ink">
            {guide.theme.toLowerCase() === version.name.toLowerCase() ? null : <>{guide.theme}. </>}
            <span className="text-ink-2">{guide.tagline}</span>
          </p>
        ) : null}
        {version.gains ? (
          <p>
            <b className="text-ok">Gains:</b> {version.gains}
          </p>
        ) : null}
        {version.gives_up ? (
          <p>
            <b className="text-danger">Gives up:</b> {version.gives_up}
          </p>
        ) : null}
      </PageHeader>

      <VersionStatsRow v={version} />

      <div className="flex flex-wrap gap-2">
        <button className="btn btn-sm" onClick={share}>
          Share
        </button>
        <Link href={`/map?version=${version.id}`} className="btn btn-sm">
          Map
        </Link>
        {canEdit && version.status === "personal" ? (
          <button
            className="btn btn-sm text-danger"
            onClick={async () => {
              if (confirm(`Delete “${version.name}”?`)) {
                await deleteVersion(version.id);
                router.push("/trip");
              }
            }}
          >
            Delete
          </button>
        ) : null}
      </div>

      {suggesting && plan ? (
        <div className="card grid gap-3 p-4" id="suggest-box">
          <h2 className="text-[1.1rem]">Suggest this to the plan</h2>
          <p className="text-sm text-ink-2">The planners will see: {diffVsPlan.join("; ")}.</p>
          <FindingList findings={findings} compact />
          <textarea rows={2} placeholder="Why? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn btn-sm btn-primary" onClick={sendSuggestion} disabled={busy}>
              Send
            </button>
            <button className="btn btn-sm" onClick={() => setSuggesting(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {guide ? (
        <Section title="What it feels like">
          <p className="max-w-prose text-[1.02rem] leading-relaxed text-ink-2">{guide.feel}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <p className="eyebrow">What it contemplates</p>
              <ul className="grid gap-1.5 text-sm text-ink-2">
                {guide.activities.map((a, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden="true" className="text-accent">
                      ●
                    </span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid content-start gap-2 text-sm text-ink-2">
              <p className="eyebrow">Why, and for whom</p>
              <p>{guide.why}</p>
              <p>
                <b>Suits:</b> {guide.suits}
              </p>
              <p>
                <b>The trade:</b> {guide.trade}
              </p>
            </div>
          </div>
        </Section>
      ) : null}

      <Section title="Rules check" aside={`${findings.length ? `${findings.length} finding${findings.length === 1 ? "" : "s"}` : "all clear"}`}>
        <FindingList findings={findings} />
      </Section>

      <Section title="The stops" aside={`${st.nights} nights · ${st.bases} bases`} id="stops">
        <Planner key={version.id} version={version} onSuggest={plan && version.status === "personal" ? () => { setSuggesting(true); document.getElementById("suggest-box")?.scrollIntoView({ behavior: "smooth", block: "center" }); } : undefined} />
      </Section>

      <Section title="What it costs" aside="per couple, flights excluded">
        <BudgetCard v={version} regions={snapshot.regions} regionName={regionName} />
      </Section>

      {days.length ? (
        <Section title="Day by day" aside={`${days.length} days · from the plan doc`}>
          <p className="text-sm text-ink-2">The main thing each day, planned around what is open. “Early” is optional: whoever wants more goes early; the others join for breakfast.</p>
          <DayByDay days={days} />
        </Section>
      ) : null}

      {version.status === "plan" ? (
        <>
          <Section title="Suggestions" aside={openSuggestions.length ? `${openSuggestions.length} open` : "none open"}>
            {snapshot.suggestions.length ? (
              <ul className="grid gap-2">
                {snapshot.suggestions.map((s) => {
                  const author = snapshot.travellers.find((t) => t.id === s.author_id);
                  return (
                    <li key={s.id} className="card grid gap-2 p-4">
                      <div className="flex items-center gap-2">
                        <Avatar traveller={s.author_id} travellers={snapshot.travellers} size={24} />
                        <span className="font-semibold">{author?.name ?? s.author_id}</span>
                        <span className={`chip ${s.status === "accepted" ? "text-ok" : s.status === "declined" ? "text-muted" : ""}`}>{s.status}</span>
                        {s.from_version_id ? (
                          <Link href={`/versions/${s.from_version_id}`} className="text-sm text-muted">
                            from their version
                          </Link>
                        ) : null}
                      </div>
                      <ul className="list-disc pl-5 text-sm">
                        {s.diff.summary.map((l, i) => (
                          <li key={i}>{l}</li>
                        ))}
                      </ul>
                      {s.comment ? <p className="text-sm text-ink-2">“{s.comment}”</p> : null}
                      <FindingList findings={checkVersion({ ...version, stays: s.diff.stays, pace: s.diff.pace ?? version.pace }, rules)} compact />
                      {s.status === "open" ? (
                        <div className="flex gap-2">
                          {isPlanner ? (
                            <>
                              <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => decideSuggestion(s.id, "accepted")}>
                                Accept
                              </button>
                              <button className="btn btn-sm" disabled={busy} onClick={() => decideSuggestion(s.id, "declined")}>
                                Decline
                              </button>
                            </>
                          ) : null}
                          {s.author_id === me?.travellerId ? (
                            <button className="btn btn-sm" disabled={busy} onClick={() => withdrawSuggestion(s.id)}>
                              Withdraw
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty>No suggestions yet. Copy the plan, change it, then “Suggest to the plan”.</Empty>
            )}
          </Section>

          <Section title="History" aside={snapshot.history.length ? `${snapshot.history.length} changes` : "no changes yet"}>
            {snapshot.history.length ? (
              <ul className="grid gap-2">
                {snapshot.history.map((h) => {
                  const actor = snapshot.travellers.find((t) => t.id === h.actor_id);
                  return (
                    <li key={h.id} className="flex items-start justify-between gap-3 text-sm">
                      <span>
                        <b>{actor?.name ?? h.actor_id}</b> · {new Date(h.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}: {h.change.summary.join("; ") || "edited"}
                      </span>
                      {isPlanner ? (
                        <button className="btn btn-sm" disabled={busy} onClick={() => confirm("Revert the plan to before this change?") && revertHistory(h.id)}>
                          Revert
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </Section>
        </>
      ) : null}

      <Comments targetType="version" targetId={version.id} />
    </Page>
  );
}
