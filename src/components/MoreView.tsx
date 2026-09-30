"use client";

import Link from "next/link";
import { useStore } from "./providers";

const LINKS = [
  { href: "/compare", title: "Compare routes", text: "Side-by-side table of the four options" },
  { href: "/vote", title: "Vote", text: "Rank the routes, see hearts and who hasn't voted" },
  { href: "/guides/tokyo", title: "Tokyo for Six", text: "Day plans, neighbourhoods and izakaya nights" },
  { href: "/guides/kyoto", title: "Kyoto for Six", text: "Day themes, Gion etiquette and calm evenings" },
  { href: "/plan/bookings", title: "Bookings", text: "Deadlines, shinkansen reminders and confirmations" },
  { href: "/plan/budget", title: "Budget", text: "Per person in yen and SGD" },
  { href: "/documents", title: "Documents", text: "Fit-to-fly letter, insurance, passports (private)" },
];

export function MoreView() {
  const { me } = useStore();
  const links = me?.role === "planner" ? [...LINKS, { href: "/curate", title: "Curate media", text: "Pin videos and photos for each place" }] : LINKS;
  return (
    <main className="mx-auto grid max-w-3xl gap-4 px-4">
      <h1 className="text-2xl font-extrabold">More</h1>
      <ul className="grid gap-2 sm:grid-cols-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="card grid h-full gap-0.5 p-4 no-underline hover:border-ink">
              <span className="font-bold">{l.title}</span>
              <span className="text-sm text-muted">{l.text}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">Theme, large text and the photos-only mode are under the settings button at the top.</p>
    </main>
  );
}
