"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fitColor, fitLabel } from "@/lib/colors";
import { suggestNights } from "@/lib/nights";
import type { Region } from "@/lib/types";
import { swapInRegion } from "@/lib/versions";
import { useStore } from "./providers";
import { RegionCover } from "./RegionCover";
import { Back, Page, PageHeader, Section } from "./ui";

const GROUPS: { status: Region["status"][]; title: string; blurb: string }[] = [
  { status: ["candidate_fits", "option"], title: "Fits the dates", blurb: "These could replace a stay or add to one." },
  { status: ["candidate_maybe"], title: "Maybe", blurb: "Possible, with a catch." },
  { status: ["day_trip"], title: "Day trips", blurb: "No nights needed." },
  { status: ["not_this_trip"], title: "Not this trip", blurb: "Too far, too cold or too much for these dates." },
];

export function Missing() {
  const { snapshot, me, saveVersion } = useStore();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const plan = snapshot.versions.find((v) => v.status === "plan");

  async function makeSwap(region: Region) {
    if (!plan || !me) return;
    setBusyId(region.id);
    const { version } = swapInRegion(plan, region, snapshot.versions, me.travellerId, snapshot.trip.start);
    await saveVersion(version);
    router.push(`/versions/${version.id}#stops`);
  }

  return (
    <Page>
      <Back href="/">Explore</Back>
      <PageHeader eyebrow="Candidates" title="What we’re missing">
        Regions we researched but left out, with the fit verdict. One tap makes you a version with the swap, which you can then edit and suggest.{" "}
        <Link href="/plan?tab=missing">The full write-up is in the report.</Link>
      </PageHeader>
      {GROUPS.map((g) => {
        const list = snapshot.regions.filter((r) => g.status.includes(r.status));
        if (!list.length) return null;
        return (
          <Section key={g.title} title={g.title} aside={g.blurb}>
            <ul className="grid gap-3">
              {list.map((r) => {
                const placeCount = snapshot.places.filter((p) => p.region === r.id).length;
                const nights = r.suggested_nights ? suggestNights(r, "balanced", snapshot.places, snapshot.pace) : null;
                return (
                  <li key={r.id} className="card grid gap-2 overflow-hidden p-4">
                    <RegionCover regionId={r.id} className="-mx-4 -mt-4 aspect-[3/1]" sizes="(max-width: 640px) 100vw, 640px" />
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-[1.25rem]">{r.name}</h3>
                      <span className="chip" style={{ color: fitColor(r.status), borderColor: fitColor(r.status) }}>
                        {fitLabel(r.status)}
                      </span>
                    </div>
                    {r.summary ? <p className="text-ink-2">{r.summary}</p> : null}
                    {r.fit ? <p className="text-sm">{r.fit}</p> : null}
                    <p className="text-xs text-muted">
                      {nights?.researched != null ? `Suggested ${nights.researched} nights at Balanced · ` : ""}
                      {placeCount ? `${placeCount} places in the library · ` : ""}
                      {r.sources.length ? (
                        <a href={r.sources[0]} target="_blank" rel="noreferrer">
                          source
                        </a>
                      ) : (
                        "from the region guides"
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {g.status.includes("not_this_trip") ? null : (
                        <button className="btn btn-sm btn-primary" disabled={!plan || busyId === r.id} onClick={() => makeSwap(r)}>
                          Make a version with this swap
                        </button>
                      )}
                      {placeCount ? (
                        <Link href={`/places?region=${r.id}`} className="btn btn-sm">
                          Places
                        </Link>
                      ) : null}
                      <Link href={`/map?region=${r.id}`} className="btn btn-sm">
                        Map
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>
        );
      })}
    </Page>
  );
}
