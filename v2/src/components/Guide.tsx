"use client";

import Link from "next/link";
import { useStore } from "./providers";
import { Page, PageHeader, Section } from "./ui";

export function Guide() {
  const { snapshot, isPlanner } = useStore();
  const planners = snapshot.travellers.filter((t) => t.role === "planner").map((t) => t.name.split(" ")[0]);
  return (
    <Page>
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
          <Step n={1} title="Pick your pace" href="/vote">
            Gentle (one thing a day, then rest), Balanced (one main outing, a rest, one short visit) or Full (two main outings). This decides how many nights each place gets, so it is the first question.
          </Step>
          <Step n={2} title="Name two must-dos" href="/vote">
            The two places you would be sad to miss. The planners build the days around them.
          </Step>
          <Step n={3} title="Rank the versions" href="/vote">
            Put the versions in your order. Nobody sees the totals until everyone has voted, so vote honestly.
          </Step>
          <Step n={4} title="Move things around (optional)" href="/versions/plan#stops">
            On any version, drag a stop by its handle to reorder, tap its name to swap the place, use +/− for the nights, or add a stop from the list. The rules check runs as you go and changes save on their own. If it is not your version, your first change makes it yours; when you like it, tap “Suggest this to the plan”. The planners accept or decline, and every change to the plan is logged with a revert.
          </Step>
          <Step n={5} title="Comment anywhere">
            Every version, stay and place has comments. A heart on a place says “me too”.
          </Step>
        </ol>
      </Section>

      <Section title="The rules the app checks">
        <ul className="grid gap-2 text-ink-2">
          <li><b className="text-ink">20 nights, no gaps.</b> Stays must run from 20 Dec to 9 Jan.</li>
          <li><b className="text-ink">Two nights everywhere.</b> A one-night stop costs half a day packing.</li>
          <li><b className="text-ink">No long moves on peak days.</b> 29–31 Dec and 2–4 Jan are the busiest travel days of the year in Japan. Short hops under an hour are fine.</li>
          <li><b className="text-ink">Closures.</b> Most museums close on Mondays and from 29 Dec to 3 Jan. The app flags anything planned on a closed day.</li>
          <li><b className="text-ink">New Year’s Eve at a ryokan.</b> Restaurants close that night, so dinner should be included.</li>
          <li><b className="text-ink">Effort for her.</b> Every place carries a note for a pregnant traveller: stairs, ice, long walks, raw food.</li>
          <li><b className="text-ink">Suggested nights.</b> Each stay shows how many nights the research suggests at your pace, with the reason, so a change is an informed one.</li>
        </ul>
      </Section>

      <Section title="Getting around">
        <ul className="grid gap-2 text-ink-2">
          <li><b className="text-ink">Home</b> is the countdown, the plan as postcards, your next step and what’s coming up.</li>
          <li><b className="text-ink">Trip</b> is the plan, the alternatives and the budget; the board that compares them is inside it. <b className="text-ink">Food</b> is where we eat. <b className="text-ink">Places</b> is the library, with the map. <b className="text-ink">Vote</b> is where you answer.</li>
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
