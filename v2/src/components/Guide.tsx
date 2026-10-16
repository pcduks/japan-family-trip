"use client";

import Link from "next/link";
import { useStore } from "./providers";
import { Back, Page, PageHeader, Section } from "./ui";

export function Guide() {
  const { snapshot, isPlanner } = useStore();
  const planners = snapshot.travellers.filter((t) => t.role === "planner").map((t) => t.name.split(" ")[0]);
  return (
    <Page>
      <Back href="/">Explore</Back>
      <PageHeader eyebrow="Start here" title="How this works">
        Three weeks in Japan over New Year, seven of us, one plan to agree on by 25 October. This app holds the research, lets everyone say what they want, and shows what each choice costs.
      </PageHeader>

      <Section title="What you’re looking at">
        <ol className="grid gap-3">
          <Step n={1} title="The trip" href="/trip">
            What the plan feels like, where we sleep, for how long and why, with named places to book, what it costs per couple against the S$15,000 target, and the alternatives with the same detail. Only {planners.join(" and ")} can change the plan, so there is always exactly one.
          </Step>
          <Step n={2} title="The report" href="/plan">
            The full research behind it: why these places, why each stay is this long, what we left out, and a guide to every base with hours, prices and where to eat.
          </Step>
          <Step n={3} title="The alternatives" href="/board">
            Other ways to spend the same 20 nights: a gentler one, a fuller one, snow monkeys, art instead of Fuji, crab and onsen instead of Fuji. Each has its theme, what it feels like, what it does and why, and its budget. The board shows them side by side with the same numbers.
          </Step>
          <Step n={4} title="Places" href="/places">
            Everything we researched: {snapshot.places.length} places. Each page says why it’s worth it, when it’s open or closed over New Year, how hard it is for a pregnant traveller, and shows Google photos and reviews. A badge says whether it’s in the plan, and on which day.
          </Step>
          <Step n={5} title="Food" href="/food">
            Its own section: how we eat as six, what each place is about at the table, every researched restaurant with who recommends it and a link, what she can eat, the ryokan meals, and our own saved Tokyo list.
          </Step>
        </ol>
      </Section>

      <Section title="What we need from you">
        <ol className="grid gap-3">
          <Step n={1} title="Say Must, Nice or Skip" href="/route">
            On the Route page, under each stop, the places we would do there. Tap Must, Nice or Skip on the ones you have a view on. The family sees the count; nobody has to rank anything.
          </Step>
          <Step n={2} title="Tell us what is missing" href="/">
            The “Something missing?” box at the bottom of Explore and of every area page. A place, a dish, a worry: one line is enough.
          </Step>
          <Step n={3} title="Look at the trade-offs" href="/route">
            Every stop says what one more or one fewer night would change, and flags the days that would be idle. If a quiet day in a quiet town bothers you, that is where to say so.
          </Step>
          <Step n={4} title="Move things around (optional)" href="/route">
            Open the stops on the Route page: drag a stop to reorder, tap its name to swap the place, use +/− for the nights. The app points out closed days, long days and peak-day trains as you go, and changes save on their own. If it is not your version, your first change makes it yours; when you like it, tap “Suggest this to the plan”.
          </Step>
          <Step n={5} title="Comment anywhere">
            Every version, stay and place has comments. A heart on a place says “me too”. The pace vote and the ranking still exist under your name, top right, for whoever wants them.
          </Step>
        </ol>
      </Section>

      <Section title="What the app points out">
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
          <li>Three tabs. <b className="text-ink">Explore</b> is the map of everything we researched, grouped by where it is: on the route, within a day of it, then the rest of Japan. Tap an area for what it is known for, what it is like in our dates, what we would do there, and why it is in or out. <b className="text-ink">Route</b> is the route that came out of it, the facts and the whys, the alternatives drawn on the same map, the cost, and a way to try a change. <b className="text-ink">Food</b> is where we eat. The full report, the places list and the vote sit under your name at the top right.</li>
          <li>Tap your name, top right, for large text, dark mode{isPlanner ? ", the Family list" : ""} and sign out.</li>
          <li>Getting in: type the family code once, then tap your name. No password, no email. Tap your name at the top right to switch person on a shared phone.</li>
        </ul>
      </Section>

      <p className="text-sm text-muted">
        Dates: votes by 25 Oct · plan agreed and the New Year’s Eve ryokan booked by 31 Oct · flights 20 Dec – 9 Jan.{" "}
        <Link href="/">Back to home</Link>
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
