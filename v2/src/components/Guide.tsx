"use client";

import Link from "next/link";
import { useStore } from "./providers";
import { Back, Page, PageHeader, Section } from "./ui";

export function Guide() {
  const { snapshot, isPlanner } = useStore();
  const planners = snapshot.travellers.filter((t) => t.role === "planner").map((t) => t.name.split(" ")[0]);
  return (
    <Page>
      <Back href="/">Trip</Back>
      <PageHeader eyebrow="Start here" title="How this works">
        Three weeks in Japan over New Year, seven of us, one route to agree on by 25 October. Everything we found is here, with what each choice costs.
      </PageHeader>

      <Section title="Four tabs">
        <ol className="grid gap-3">
          <Step n={1} title="Trip" href="/">
            The route we are taking: the map, the 21 days, each stop and why it is that long, New Year’s Eve, and what it costs per couple against the S$15,000 target. Only {planners.join(" and ")} change it, so there is always exactly one.
          </Step>
          <Step n={2} title="Routes" href="/routes">
            The other ways to spend the same 20 nights, by style: snow, onsen, the west, the far north, the coast, food, two cities done slowly. Each opens as a full page like Trip. Build your own from any of them, or join two, and it gets its own page too.
          </Step>
          <Step n={3} title="Places" href="/places">
            Every area we looked at, on the map and by region. Each says what it is known for, what it is like on our dates, how long to stay and where to sleep. Every one of the {snapshot.places.length} places is in the list too.
          </Step>
          <Step n={4} title="Food" href="/food">
            How we eat as six, city by city, what Fernanda can eat, the ryokan meals and our own Tokyo list.
          </Step>
        </ol>
      </Section>

      <Section title="What we need from you">
        <ol className="grid gap-3">
          <Step n={1} title="Say Must, Nice or Skip" href="/">
            Open a stop on the Trip tab and the places its days visit are listed. Tap Must, Nice or Skip on the ones you have a view on. The family sees the count.
          </Step>
          <Step n={2} title="Tell us what is missing" href="/places">
            The “Something missing?” box on Places and on every area page. A place, a dish, a worry: one line is enough.
          </Step>
          <Step n={3} title="Shape a route of your own (optional)" href="/build">
            Start from any route, add or take nights, swap a place. The days, the map, the warnings and the cost follow every change. Save it and the family can open it from Routes.
          </Step>
          <Step n={4} title="Comment anywhere">
            Every route, stop and place has comments. A heart on a place says “me too”.
          </Step>
        </ol>
      </Section>

      <Section title="What gets pointed out">
        <ul className="grid gap-2 text-ink-2">
          <li><b className="text-ink">20 nights, no gaps.</b> The stays have to cover 20 Dec to 9 Jan; this is the one thing it insists on.</li>
          <li><b className="text-ink">One-night stops.</b> It mentions them, because a one-night stop costs half a day packing and checking in. Sometimes that is fine.</li>
          <li><b className="text-ink">Long moves on peak days.</b> 29–31 Dec and 2–4 Jan are the busiest travel days of the year in Japan. Short hops under an hour are fine.</li>
          <li><b className="text-ink">Closures.</b> Most museums close on Mondays and from 29 Dec to 3 Jan. The app flags anything planned on a closed day.</li>
          <li><b className="text-ink">New Year’s Eve dinner.</b> Restaurants close that night, so it is worth having dinner included wherever we sleep.</li>
          <li><b className="text-ink">Effort for her.</b> Every place carries a note for a pregnant traveller: stairs, ice, long walks, raw food. Long days and full afternoons get a mention too. These are suggestions; she decides on the day.</li>
          <li><b className="text-ink">Suggested nights.</b> Each stay shows how many nights make sense at your pace, with the reason, so a change is an informed one.</li>
        </ul>
      </Section>

      <Section title="Getting around">
        <ul className="grid gap-2 text-ink-2">
          <li>Tap your name, top right, for large text, dark mode, the full report{isPlanner ? ", the Family list" : ""} and sign out.</li>
          <li>Getting in: type the family code once, then tap your name. No password, no email. Tap your name at the top right to switch person on a shared phone.</li>
        </ul>
      </Section>

      <p className="text-sm text-muted">
        Dates: plan agreed and the New Year’s Eve ryokan booked by 31 Oct · flights 20 Dec – 9 Jan.{" "}
        <Link href="/">Back to the trip</Link>
      </p>
    </Page>
  );
}

function Step({ n, title, href, children }: { n: number; title: string; href?: string; children: React.ReactNode }) {
  const body = (
    <>
      <span className="display grid size-9 shrink-0 place-items-center rounded-full bg-accent text-[1.1rem] text-accent-ink">{n}</span>
      <span className="grid min-w-0 gap-0.5">
        <span className="font-semibold">{title}{href ? " →" : ""}</span>
        <span className="text-sm text-ink-2">{children}</span>
      </span>
    </>
  );
  return <li>{href ? <Link href={href} className="card flex gap-3 p-4 no-underline">{body}</Link> : <div className="card flex gap-3 p-4">{body}</div>}</li>;
}
