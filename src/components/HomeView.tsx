"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { planDays, todayInJapan } from "@/lib/plan";
import { ROUTE_INK, ROUTE_MOTIF, placeStamp, stampLabel } from "@/lib/stamps";
import { TRIP_END, TRIP_START, compareRows, daysBetween, formatDay, placeMap, stampDate } from "@/lib/trip";
import type { Route } from "@/lib/types";
import { voteTally } from "@/lib/vote";
import { EkiStamp } from "./EkiStamp";
import { useWishesRevealed } from "./RetratoView";
import { useStore } from "./providers";
import { Avatar, PageHeader, firstName } from "./ui";
import { usePlans } from "./usePlans";

export const VOTE_DEADLINE = "2026-10-15";
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

export function HomeView() {
  const { trip, votes, me } = useStore();
  const { chosen, routeFor } = usePlans();
  const today = todayInJapan();
  const toGo = daysBetween(today, TRIP_START);
  const P = useMemo(() => placeMap(trip), [trip]);

  const hand =
    toGo > 1 ? `faltam ${toGo} dias!` : toGo === 1 ? "é amanhã!" : today <= TRIP_END ? "estamos no Japão!" : "que viagem!";

  return (
    <main className="mx-auto grid max-w-3xl gap-10 px-5 pb-10">
      <div className="grid gap-4">
        <PageHeader eyebrow="20 dez 2026 – 9 jan 2027" title={<>Seis pelo<br />Japão</>} hand={hand} />
        <HeroStamps />
        <p className="text-[1.08rem] leading-relaxed">
          Vinte noites, três casais e um inverno japonês: templos na neve, onsen, o Fuji no céu limpo de dezembro e um Ano-Novo que vamos
          lembrar.{" "}
          {chosen ? <>A rota está escolhida. Agora é preparar cada capítulo.</> : <>Primeiro, escolhemos a rota juntos.</>}
        </p>
      </div>

      {chosen ? (
        <Chapters route={routeFor(chosen)} places={P} planId={chosen.id} />
      ) : (
        <Decide votes={votes} meId={me?.travellerId ?? null} />
      )}
    </main>
  );
}

/** Three overlapping stamps as the cover art: Tokyo, Fuji, Kyoto. */
function HeroStamps() {
  return (
    <div className="relative mx-auto h-44 w-72" aria-hidden="true">
      <div className="absolute top-2 left-0">
        <EkiStamp motif="tower" ink="var(--vermilion)" top="Tokyo" bottom={stampDate(TRIP_START)} size={120} rotate={-10} seed={2} label="" />
      </div>
      <div className="absolute top-0 left-[5.5rem]">
        <EkiStamp motif="fuji" ink="var(--indigo)" top="Fujisan" bottom="冬 · 2026" size={132} rotate={6} seed={5} label="" />
      </div>
      <div className="absolute top-12 left-[11.5rem]">
        <EkiStamp motif="torii" ink="var(--plum)" top="Kyoto" bottom={stampDate("2027-01-01")} size={110} rotate={-4} shape="square" seed={9} label="" />
      </div>
    </div>
  );
}

function Decide({ votes, meId }: { votes: { travellerId: string; routeId: string; rank: number }[]; meId: string | null }) {
  const { trip } = useStore();
  const candidates = useMemo(() => trip.routes.filter((r) => r.isCandidate), [trip.routes]);
  const voted = new Set(votes.map((v) => v.travellerId));
  const iVoted = !!meId && voted.has(meId);
  const daysLeft = daysBetween(todayInJapan(), VOTE_DEADLINE);
  const { firsts } = voteTally(candidates, votes, trip.travellers.length);
  const rows = useMemo(() => compareRows(trip, candidates), [trip, candidates]);

  return (
    <>
      <section className="card grid gap-4 p-5" aria-labelledby="vote-h">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Capítulo zero</p>
            <h2 id="vote-h" className="text-[2rem] leading-tight">
              Qual Japão vamos viver?
            </h2>
          </div>
          <EkiStamp motif="ballot" ink="var(--vermilion)" top="Votação" bottom="até 15 · X" size={78} rotate={8} inked={iVoted} animate label={iVoted ? "Você já votou" : "Ainda não votou"} />
        </div>
        <ul className="flex flex-wrap gap-3" aria-label="Quem já votou">
          {trip.travellers.map((t, i) => (
            <li key={t.id} className="grid justify-items-center gap-1 text-xs">
              <Avatar name={t.name} index={i} size={40} dim={!voted.has(t.id)} />
              <span className={voted.has(t.id) ? "font-bold" : "text-muted"}>{firstName(t.name)}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          {voted.size} de {trip.travellers.length} votaram ·{" "}
          {daysLeft > 0 ? `a votação fecha em ${daysLeft} dia${daysLeft === 1 ? "" : "s"} (15 out)` : "a votação fechou"}

        </p>
        <DesejosCta />
        <Link href="/votar" className={`btn ${iVoted ? "" : "btn-accent"} text-base`}>
          {iVoted ? "Mudar meu voto" : "Dar meu voto"}
        </Link>
      </section>

      <section className="grid gap-5" aria-labelledby="routes-h">
        <div className="flex items-baseline justify-between">
          <h2 id="routes-h" className="text-[1.9rem]">
            As quatro rotas
          </h2>
          <Link href="/compare" className="text-sm font-bold text-vermilion no-underline">
            Comparar →
          </Link>
        </div>
        <ol className="grid gap-3">
          {candidates.map((r) => (
            <li key={r.id}>
              <RouteCover route={r} nye={rows.find((x) => x.key === "nye")!.cells[r.id].text} longest={rows.find((x) => x.key === "longest")!.cells[r.id]} comfort={rows.find((x) => x.key === "comfort")!.cells[r.id]} points={firsts(r.id)} showPoints={voted.size > 0} />
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

/** Routes with a woodblock cover in public/illustrations (made by scripts/illustrate.ts). */
const ILLUSTRATED = new Set(["A", "B", "C", "D"]);

function RouteCover({
  route,
  nye,
  longest,
  comfort,
  points,
  showPoints,
}: {
  route: Route;
  nye: string;
  longest: { text: string; detail?: string };
  comfort: { value: number | null; detail?: string };
  points: number;
  showPoints: boolean;
}) {
  const ink = ROUTE_INK[route.code] ?? "var(--ink)";
  const c = comfort.value ?? 0;
  return (
    <Link href={`/rotas/${route.code}`} className="card group grid gap-3 overflow-hidden p-4 pt-0 no-underline transition-transform hover:-translate-y-0.5">
      {ILLUSTRATED.has(route.code) ? (
        <Image src={`/illustrations/route-${route.code}.webp`} alt="" width={1200} height={660} sizes="(max-width: 48rem) 100vw, 48rem" className="-mx-4 aspect-[2/1] w-[calc(100%+2rem)] max-w-none object-cover" />
      ) : null}
      <div className={`flex items-start gap-4 ${ILLUSTRATED.has(route.code) ? "" : "pt-4"}`}>
        <EkiStamp className={ILLUSTRATED.has(route.code) ? "-mt-9 rounded-full bg-card p-1 shadow-sm" : ""} motif={ROUTE_MOTIF[route.code] ?? "torii"} ink={ink} top={route.name} bottom={`Rota ${route.code}`} size={80} rotate={route.code.charCodeAt(0) % 2 ? 7 : -7} seed={route.code.charCodeAt(0)} label="" />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <p className="eyebrow" style={{ color: ink }}>
            Rota {route.code}
            {showPoints ? ` · ${points} voto${points === 1 ? "" : "s"}` : ""}
          </p>
          <h3 className="text-[1.9rem] leading-none">{route.name}</h3>
          <p className="text-sm text-ink-2">{route.title}</p>
        </div>
        <span aria-hidden="true" className="self-center text-xl text-muted transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </div>
      <dl className="grid grid-cols-[1fr_1fr_auto] gap-3 border-t border-dashed border-rule pt-3 text-sm">
        <div className="min-w-0">
          <dt className="text-xs text-muted">Réveillon</dt>
          <dd className="truncate font-bold">{nye}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted">Trecho mais longo</dt>
          <dd className="truncate font-bold">{longest.text}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Conforto p/ ela</dt>
          <dd className="font-bold" aria-label={`${c} de 5`}>
            <span style={{ color: "var(--plum)" }}>{"●".repeat(c)}</span>
            <span className="text-rule">{"●".repeat(5 - c)}</span> <span className="text-xs font-normal text-muted">{c}/5</span>
          </dd>
        </div>
      </dl>
    </Link>
  );
}

function Chapters({ route, places, planId }: { route: Route; places: Map<string, { name: string; slug: string; kind: string; blurb: string }>; planId: string }) {
  const today = todayInJapan();
  void planDays;
  return (
    <section className="grid gap-4" aria-labelledby="ch-h">
      <div className="flex items-baseline justify-between">
        <h2 id="ch-h" className="text-[1.9rem]">
          Sumário
        </h2>
        <Link href={`/rotas/${route.code}`} className="text-sm">
          Mapa da rota
        </Link>
      </div>
      <ol className="grid gap-3">
        {route.stays.map((s, i) => {
          const p = places.get(s.place);
          const st = placeStamp(s.place, p?.kind);
          const lived = today >= s.startDate;
          return (
            <li key={s.id}>
              <Link href={`/plan/days?plan=${planId}&d=${s.startDate}`} className="card flex items-center gap-4 p-4 no-underline">
                <EkiStamp motif={st.motif} ink={st.ink} top={stampLabel(p?.name ?? s.place)} bottom={stampDate(s.startDate)} size={70} rotate={i % 2 ? 6 : -6} seed={i + 1} inked={lived} label="" />
                <span className="grid min-w-0 gap-0.5">
                  <span className="eyebrow">
                    Capítulo {ROMAN[i] ?? i + 1} · {formatDay(s.startDate)} · {s.nights} noite{s.nights > 1 ? "s" : ""}
                  </span>
                  <span className="font-display text-[1.6rem] leading-tight">{p?.name ?? s.place}</span>
                  {p?.blurb ? <span className="line-clamp-2 text-sm text-muted">{p.blurb}</span> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Desejos come before the vote: one line of state and the right button. */
function DesejosCta() {
  const { me } = useStore();
  const { revealed, done, missing } = useWishesRevealed();
  const iDid = done.some((t) => t.id === me?.travellerId);
  if (revealed)
    return (
      <Link href="/retrato" className="btn text-base no-underline">
        Ver o retrato da família
      </Link>
    );
  return (
    <div className="grid gap-2">
      <Link href="/desejos" className={`btn ${iDid ? "" : "btn-primary"} text-base no-underline`}>
        {iDid ? "Rever meus desejos" : "Dizer o que eu quero viver"}
      </Link>
      <p className="text-xs text-muted">
        {done.length} de {done.length + missing.length} já entregaram os desejos. As rotas nascem deles.
      </p>
    </div>
  );
}
