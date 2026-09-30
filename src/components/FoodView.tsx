"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { foodMarkId, type FoodMark } from "@/lib/family";
import { mapsSearchUrl } from "@/lib/links";
import { deleteRow, insertRow, upsertRow, useTable } from "@/lib/tables";
import type { Place } from "@/lib/types";
import { EkiStamp, type Motif } from "./EkiStamp";
import { PlaceSheet, sourceLabel } from "./PlaceSheet";
import { useStore } from "./providers";
import { Avatar, PageHeader, Section, firstName } from "./ui";

/** Group the saved list's free-text categories into a few filters. */
export function foodGroup(cat: string | null | undefined): string {
  const c = (cat ?? "").toLowerCase();
  if (/bar|club|beer|wine|izakaya|yokoch|pub/.test(c)) return "Bares";
  if (/coffee|cafe|café|breakfast|brunch|bakery/.test(c)) return "Café";
  if (/sushi/.test(c)) return "Sushi";
  if (/ramen|udon|soba|tsukemen|noodle/.test(c)) return "Lámen e udon";
  if (/museum/.test(c)) return "Outros";
  return "Restaurantes";
}

const GROUPS = ["Tudo", "Restaurantes", "Sushi", "Lámen e udon", "Café", "Bares", "Outros"];
type Tab = "all" | "want" | "been";

/** The family food list: want to go, been there (with a rating), pick for me, add from a Maps link. */
export function FoodView({ initialPlace }: { initialPlace: string | null }) {
  const { trip, me } = useStore();
  const { rows: marks } = useTable("food_marks");
  const food = useMemo(() => trip.places.filter((p) => p.kind === "food"), [trip.places]);
  const [tab, setTab] = useState<Tab>("all");
  const [group, setGroup] = useState("Tudo");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Place | null>(food.find((p) => p.slug === initialPlace) ?? null);
  const [picked, setPicked] = useState<Place | null>(null);
  const idx = new Map(trip.travellers.map((t, i) => [t.id, i]));
  const names = new Map(trip.travellers.map((t) => [t.id, t.name]));

  const myMark = (slug: string) => marks.find((m) => m.traveller_id === me?.travellerId && m.place_slug === slug);
  const marksFor = (slug: string) => marks.filter((m) => m.place_slug === slug);
  const areas = useMemo(() => {
    const counts = new Map<string, number>();
    food.forEach((p) => {
      const a = areaKey(p.area);
      counts.set(a, (counts.get(a) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([a]) => a);
  }, [food]);

  const shown = food.filter((p) => {
    const m = myMark(p.slug);
    return (
      (tab === "all" || m?.status === tab) &&
      (group === "Tudo" || foodGroup(p.category) === group) &&
      (!q || `${p.name} ${p.category} ${p.area} ${p.note}`.toLowerCase().includes(q.toLowerCase()))
    );
  });
  const byArea = areas.map((a) => [a, shown.filter((p) => areaKey(p.area) === a)] as const).filter(([, l]) => l.length);
  const wantN = marks.filter((m) => m.traveller_id === me?.travellerId && m.status === "want").length;
  const beenN = marks.filter((m) => m.traveller_id === me?.travellerId && m.status === "been").length;

  async function mark(slug: string, status: FoodMark["status"] | null, rating: number | null = null) {
    if (!me) return;
    const id = foodMarkId(me.travellerId, slug);
    if (!status) return deleteRow("food_marks", id);
    await upsertRow("food_marks", { id, traveller_id: me.travellerId, place_slug: slug, status, rating, updated_at: new Date().toISOString() });
  }

  function pick() {
    const pool = shown.filter((p) => !p.closedNote && myMark(p.slug)?.status !== "been");
    const list = pool.length ? pool : shown;
    if (!list.length) return;
    let next = list[randomIndex(list.length)];
    if (list.length > 1 && next.slug === picked?.slug) next = list[(list.indexOf(next) + 1) % list.length];
    setPicked(next);
  }

  return (
    <main className="mx-auto grid max-w-3xl gap-7 px-5 pb-12">
      <PageHeader eyebrow="Nossa lista de Tokyo" title="Comida" hand={`${food.length} lugares`}>
        Da lista do Pedro no Google Maps. Marque onde quer ir, onde já foi, e deixe o app escolher quando ninguém decide.
      </PageHeader>

      <section className="card grid gap-3 p-5" aria-live="polite">
        {picked ? (
          <div className="flex items-start gap-4">
            <EkiStamp key={picked.slug} motif="bowl" ink="var(--amber)" top={picked.name.slice(0, 22)} bottom={picked.area ?? "Tokyo"} size={96} rotate={-7} animate seed={picked.name.length} label="" />
            <div className="grid min-w-0 gap-1">
              <p className="eyebrow">Hoje vamos em…</p>
              <p className="font-display text-[1.9rem] leading-none">{picked.name}</p>
              <p className="text-sm text-muted">
                {picked.category}
                {picked.area ? ` · ${picked.area}` : ""}
              </p>
              {picked.note ? <p className="font-hand text-[1.05rem]">{picked.note}</p> : null}
              <div className="mt-1 flex flex-wrap gap-2">
                <a className="btn btn-sm" href={mapsSearchUrl({ query: picked.query, googlePlaceId: picked.googlePlaceId })} target="_blank" rel="noreferrer">
                  Abrir no Maps
                </a>
                <button className="btn btn-sm" onClick={() => setOpen(picked)}>
                  Ver fotos
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[1.05rem]">Sem ideia? Filtre por tipo e deixe o acaso escolher.</p>
        )}
        <button className="btn btn-accent" onClick={pick} disabled={!shown.length}>
          {picked ? "Sortear outro" : "Sorteie para mim"}
        </button>
      </section>

      <div className="grid gap-3">
        <div className="flex gap-1 rounded-full border border-rule bg-card p-1" role="tablist" aria-label="Minha lista">
          {(
            [
              ["all", `Todos · ${food.length}`],
              ["want", `Quero ir · ${wantN}`],
              ["been", `Já fui · ${beenN}`],
            ] as [Tab, string][]
          ).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex-1 rounded-full px-2 py-2 text-sm ${tab === k ? "bg-ink font-bold text-paper" : "text-ink-2"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5" role="group" aria-label="Tipo">
          {GROUPS.map((g) => (
            <button key={g} className="chip !min-h-9 text-sm" aria-pressed={group === g} onClick={() => setGroup(g)}>
              {g}
            </button>
          ))}
        </div>
        <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: tonkatsu, whisky, Shibuya…" aria-label="Buscar" />
      </div>

      {byArea.length ? (
        <div className="grid gap-6">
          {byArea.map(([a, list]) => (
            <section key={a} className="grid gap-2" aria-label={a}>
              <h2 className="sticky top-0 z-10 -mx-5 flex items-baseline justify-between bg-paper/95 px-5 py-2 backdrop-blur">
                <span className="text-[1.5rem]">{nbHyphen(a)}</span>
                <span className="font-sans text-sm text-muted">{list.length}</span>
              </h2>
              <ul className="grid gap-2">
                {list.map((p) => {
          const m = myMark(p.slug);
              const fam = marksFor(p.slug).filter((x) => x.traveller_id !== me?.travellerId);
              return (
                <li key={p.id} className="card grid gap-1.5 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <GroupStamp group={foodGroup(p.category)} />
                <button type="button" onClick={() => setOpen(p)} className="grid min-w-0 flex-1 gap-0.5 text-left">
                      <span className="font-display text-[1.45rem] leading-tight">{p.name}</span>
                      <span className="text-sm text-muted">
                        {p.category}
                        {p.area && areaKey(p.area) !== p.area ? ` · ${nbHyphen(p.area)}` : ""}
                        {p.listRating ? <span className="whitespace-nowrap">{` · ★\u00a0${p.listRating.split(" ")[0]}`}</span> : null}
                      </span>
                    </button>
                    <div className="flex shrink-0 gap-1 pt-0.5">
                      <button
                        className="grid size-10 place-items-center rounded-full border text-lg"
                        style={m?.status === "want" ? { background: "var(--vermilion)", borderColor: "var(--vermilion)", color: "var(--accent-ink)" } : { borderColor: "color-mix(in srgb, var(--vermilion) 40%, var(--rule))", color: "var(--vermilion)" }}
                        aria-pressed={m?.status === "want"}
                        aria-label={`Quero ir: ${p.name}`}
                        onClick={() => mark(p.slug, m?.status === "want" ? null : "want")}
                      >
                        {m?.status === "want" ? "♥" : "♡"}
                      </button>
                      <button
                        className="grid size-10 place-items-center rounded-full border text-lg"
                        style={m?.status === "been" ? { background: "var(--pine)", borderColor: "var(--pine)", color: "var(--paper)" } : { borderColor: "color-mix(in srgb, var(--pine) 40%, var(--rule))", color: "var(--pine)" }}
                        aria-pressed={m?.status === "been"}
                        aria-label={`Já fui: ${p.name}`}
                        onClick={() => mark(p.slug, m?.status === "been" ? null : "been", m?.rating ?? null)}
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                  {p.note ? <p className="font-hand text-[1.02rem] text-ink-2">{p.note}</p> : null}
                  {p.closedNote ? <p className="text-sm font-bold text-danger">Fechado temporariamente: confirme antes de ir.</p> : null}
                  {m?.status === "been" || fam.length ? (
                    <div className="flex items-center gap-2">
                      {m?.status === "been" ? (
                        <span className="flex" role="radiogroup" aria-label="Sua nota">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button key={n} role="radio" aria-checked={m.rating === n} aria-label={`${n} de 5`} className="px-0.5 text-xl leading-none" style={{ color: (m.rating ?? 0) >= n ? "var(--amber)" : "var(--rule)" }} onClick={() => mark(p.slug, "been", n)}>
                              ★
                            </button>
                          ))}
                        </span>
                      ) : null}
                      {fam.length ? (
                        <span className="ml-auto flex items-center gap-1" title={fam.map((x) => `${names.get(x.traveller_id)}: ${x.status === "want" ? "quer ir" : "já foi"}`).join(", ")}>
                          {fam.map((x) => (
                            <Avatar key={x.id} name={names.get(x.traveller_id) ?? "?"} index={idx.get(x.traveller_id) ?? 0} size={24} dim={x.status === "want"} />
                          ))}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
                    })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-muted">Nada com esses filtros.</p>
      )}

      <AddFromMaps />
      <TipsInbox food={food} onOpen={setOpen} />

      <PlaceSheet place={open} route={null} onClose={() => setOpen(null)} />
    </main>
  );
}

const GROUP_STAMP: Record<string, [Motif, string]> = {
  Restaurantes: ["bowl", "var(--amber)"],
  Sushi: ["wave", "var(--indigo)"],
  "Lámen e udon": ["bowl", "var(--vermilion)"],
  Café: ["leaf", "var(--pine)"],
  Bares: ["lantern", "var(--plum)"],
  Outros: ["torii", "var(--ink)"],
};

function GroupStamp({ group }: { group: string }) {
  const [motif, ink] = GROUP_STAMP[group] ?? GROUP_STAMP.Outros;
  return <EkiStamp motif={motif} ink={ink} size={46} rotate={-6} seed={group.length} label={group} />;
}

/** Keep "Naka-Meguro" on one line. */
function nbHyphen(s: string) {
  return s.replace(/-/g, "\u2011");
}

/** Event-time randomness for the picker (kept outside components for the React compiler). */
function randomIndex(n: number) {
  return Math.floor(Math.random() * n);
}

function areaKey(area: string | null | undefined): string {
  if (!area) return "Ver no mapa";
  return area.split(/\s[/(]/)[0].trim();
}

/** Paste a Google Maps link (or a name) to add a restaurant to the shared list. */
function AddFromMaps() {
  const { me, demo } = useStore();
  const router = useRouter();
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<{ busy: boolean; msg: string | null; ok?: boolean }>({ busy: false, msg: null });
  if (!me) return null;
  return (
    <Section title="Adicionar um lugar" id="add">
      <form
        className="card grid gap-3 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!link.trim()) return;
          setState({ busy: true, msg: null });
          const res = await fetch("/api/food/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ link: link.trim(), note: note.trim() || null }) });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) return setState({ busy: false, msg: body.error ?? "Não deu certo. Tente de novo." });
          setLink("");
          setNote("");
          setState({ busy: false, ok: true, msg: `${body.name} entrou na lista.` });
          router.refresh();
        }}
      >
        <p className="text-sm text-ink-2">No Google Maps, toque em Compartilhar → Copiar link, e cole aqui. Também funciona com o nome do lugar.</p>
        <input className="input" placeholder="https://maps.app.goo.gl/…" value={link} onChange={(e) => setLink(e.target.value)} aria-label="Link do Google Maps ou nome" />
        <input className="input" placeholder="Dica (opcional): peça o katsu especial" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Dica" />
        <div className="flex items-center justify-between gap-3">
          <span className={`text-sm ${state.ok ? "text-ok" : "text-danger"}`} role="status">
            {state.msg ?? (demo ? "No modo demonstração este botão não salva." : "")}
          </span>
          <button className="btn btn-primary shrink-0" disabled={state.busy || !link.trim()}>
            {state.busy ? "Buscando…" : "Adicionar"}
          </button>
        </div>
      </form>
    </Section>
  );
}

/**
 * Paste a link from Instagram (or anywhere) with a short note. Scraping
 * Instagram breaks its terms, so tips come in by hand and link back to the post.
 */
function TipsInbox({ food, onOpen }: { food: Place[]; onOpen: (p: Place) => void }) {
  const { me, trip } = useStore();
  const { rows } = useTable("tips");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [slug, setSlug] = useState("");
  const P = new Map(trip.places.map((p) => [p.slug, p]));
  const tips = [...rows].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")).slice(0, 30);
  return (
    <Section title="Dicas" id="tips-h" aside="do Instagram, de amigos…">
      {me ? (
        <form
          className="card grid gap-2 p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!url.trim() && !text.trim()) return;
            await insertRow("tips", {
              place_slug: slug || null,
              url: url.trim() || null,
              text: text.trim(),
              source: url.trim() ? sourceLabel(url.trim()) : null,
              created_by: me.travellerId,
              created_at: new Date().toISOString(),
            });
            setUrl("");
            setText("");
            setSlug("");
          }}
        >
          <input className="input" type="url" placeholder="Link do post (Instagram, TikTok…)" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Link" />
          <input className="input" placeholder="A dica" value={text} onChange={(e) => setText(e.target.value)} aria-label="Dica" />
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <select className="input" value={slug} onChange={(e) => setSlug(e.target.value)} aria-label="Lugar">
              <option value="">Sem lugar ainda</option>
              {food.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
            <button className="btn btn-primary">Salvar</button>
          </div>
        </form>
      ) : null}
      {tips.length ? (
        <ul className="grid gap-2">
          {tips.map((t) => {
            const place = t.place_slug ? P.get(t.place_slug) : null;
            return (
              <li key={t.id} className="card grid gap-1 p-4 text-sm">
                {place ? (
                  <button type="button" className="text-left font-display text-xl" onClick={() => onOpen(place)}>
                    {place.name}
                  </button>
                ) : null}
                {t.text ? <p className="font-hand text-[1.05rem]">{t.text}</p> : null}
                <p className="flex gap-3 text-xs text-muted">
                  {t.url ? (
                    <a href={t.url} target="_blank" rel="noreferrer" className="underline">
                      {t.source ?? sourceLabel(t.url)}
                    </a>
                  ) : null}
                  {t.created_by ? <span>{firstName(trip.travellers.find((x) => x.id === t.created_by)?.name ?? "")}</span> : null}
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Section>
  );
}
