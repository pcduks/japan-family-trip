"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Version } from "@/lib/types";
import { copyVersion } from "@/lib/versions";
import { VersionCard } from "./Board";
import { useStore } from "./providers";
import { Empty, Page, PageHeader, Section } from "./ui";

export function VersionsList() {
  const { snapshot, me, isPlanner } = useStore();
  const visible = (v: Version) => v.shared !== false || v.owner === me?.travellerId || isPlanner;
  const plan = snapshot.versions.filter((v) => v.status === "plan");
  const alternatives = snapshot.versions.filter((v) => v.status === "alternative");
  const mine = snapshot.versions.filter((v) => v.status === "personal" && v.owner === me?.travellerId);
  const family = snapshot.versions.filter((v) => v.status === "personal" && v.owner !== me?.travellerId && visible(v));
  return (
    <Page wide>
      <PageHeader eyebrow="Copy any version, change it, suggest it" title="Versions" action={<Link href="/versions/new" className="btn btn-sm btn-primary shrink-0">+ New</Link>}>
        There is exactly one plan. Everyone can make their own versions; planners accept suggestions into the plan.
      </PageHeader>
      <Section title="The plan">
        {plan.map((v) => (
          <VersionCard key={v.id} v={v} href={`/versions/${v.id}`} />
        ))}
      </Section>
      <Section title="My versions">
        {mine.length ? mine.map((v) => <VersionCard key={v.id} v={v} href={`/versions/${v.id}`} />) : <Empty>None yet. Start from the plan or any alternative.</Empty>}
      </Section>
      <Section title="Family versions">{family.length ? family.map((v) => <VersionCard key={v.id} v={v} href={`/versions/${v.id}`} />) : <Empty>Nobody else has made one yet.</Empty>}</Section>
      <Section title="Alternatives from the research">
        {alternatives.map((v) => (
          <VersionCard key={v.id} v={v} href={`/versions/${v.id}`} />
        ))}
      </Section>
    </Page>
  );
}

export function NewVersion() {
  const { snapshot, me, saveVersion, busy } = useStore();
  const router = useRouter();
  const [from, setFrom] = useState(snapshot.versions.find((v) => v.status === "plan")?.id ?? snapshot.versions[0]?.id ?? "");
  const [name, setName] = useState(me ? `${me.name.split(" ")[0]}’s version` : "My version");
  const sources = snapshot.versions.filter((v) => v.status !== "legacy" && (v.shared !== false || v.owner === me?.travellerId));
  async function create() {
    const src = snapshot.versions.find((v) => v.id === from);
    if (!src || !me) return;
    const v = copyVersion(src, me.travellerId, name.trim() || "My version", snapshot.trip.start);
    await saveVersion(v);
    router.push(`/versions/${v.id}#stops`);
  }
  return (
    <Page>
      <PageHeader eyebrow="My versions" title="New version">
        Pick a starting point. Then drag the stops, tap a name to swap it, use +/− for nights; the rules check runs as you go and every change saves on its own.
      </PageHeader>
      <label className="grid gap-1">
        <span className="eyebrow">Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <fieldset className="grid gap-2">
        <legend className="eyebrow">Start from</legend>
        {sources.map((v) => (
          <label key={v.id} className={`card flex items-center gap-3 p-3 ${from === v.id ? "ring-2 ring-accent" : ""}`}>
            <input type="radio" name="from" className="min-h-0" checked={from === v.id} onChange={() => setFrom(v.id)} />
            <span>
              <b>{v.name}</b> <span className="text-sm text-muted">· {v.pace}</span>
              {v.gains ? <span className="block text-sm text-ink-2">{v.gains}</span> : null}
            </span>
          </label>
        ))}
      </fieldset>
      <button className="btn btn-primary" onClick={create} disabled={busy || !from}>
        Create and edit
      </button>
    </Page>
  );
}
