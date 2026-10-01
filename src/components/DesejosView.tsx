"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useMemo, useState } from "react";
import { deckCards, loadCatalog, type ExperienceCard } from "@/lib/catalog";
import { MAX_MUST, wishId, type WishAnswer, type WishFacts } from "@/lib/family";
import { useSetting, useTable, upsertRow } from "@/lib/tables";
import { EkiStamp, type Motif } from "./EkiStamp";
import { useStore } from "./providers";
import { Avatar, PageHeader, firstName } from "./ui";

/** Deck groups in the fixed order everyone sees, with the divider line for each. */
const GROUPS: { key: NonNullable<ExperienceCard["deck_group"]>; title: string; line: string; motif: Motif; ink: string }[] = [
  { key: "noite-tranquila", title: "Noite tranquila", line: "Agora: onde dormir e descansar", motif: "onsen", ink: "var(--pine)" },
  { key: "dia-de-rua", title: "Dia de rua", line: "Agora: cidade, bairros e gente", motif: "tower", ink: "var(--vermilion)" },
  { key: "natureza", title: "Natureza", line: "Agora: montanha, lago e mar", motif: "fuji", ink: "var(--indigo)" },
  { key: "comida", title: "Comida", line: "Agora: o que a estação põe na mesa", motif: "bowl", ink: "var(--amber)" },
  { key: "reveillon", title: "Réveillon", line: "Agora: a virada do ano", motif: "bell", ink: "var(--plum)" },
  { key: "neve", title: "Neve", line: "Agora: coisas de neve", motif: "snow", ink: "var(--indigo)" },
];

const ANSWERS: { key: WishAnswer; label: string; hint: string }[] = [
  { key: "no", label: "Pode pular", hint: "Sem problema se não rolar" },
  { key: "like", label: "Quero", hint: "Gostaria, se couber" },
  { key: "must", label: "Não abro mão", hint: "Até 3 na viagem toda" },
];

/** Default Réveillon options until the planner sets the held ones in Mesa do Pedro. */
const DEFAULT_NY: { base: string; title: string; line: string }[] = [
  { base: "kanazawa", title: "Kanazawa", line: "Neve, caranguejo e o jardim aberto a noite toda. Hospital a 10 min." },
  { base: "kyoto", title: "Kyoto", line: "Templos e o sino da virada. Casa com cozinha para os dias fechados. Hospital a 15 min." },
  { base: "fukuoka", title: "Fukuoka", line: "Mais quente, barraquinhas de comida, onsen por perto. Volta de avião. Hospital a 10 min." },
];

type Step = "intro" | "facts" | "deck" | "ny" | "done";

/** Desejos: five quick facts, 36 cards, one forced choice, a stamp. Private until everyone finishes. */
export function DesejosView() {
  const { trip, me, demo } = useStore();
  const catalog = useMemo(() => loadCatalog(), []);
  const deck = useMemo(() => deckCards(catalog), [catalog]);
  const { rows: wishes } = useTable("wishes");
  const { rows: profiles } = useTable("wish_profiles");
  const [nyOptions] = useSetting<{ base: string; title: string; line: string }[]>("ny_options", DEFAULT_NY);
  const myId = me?.travellerId ?? "";
  const mine = useMemo(() => new Map(wishes.filter((w) => w.traveller_id === myId).map((w) => [w.card_id, w.answer])), [wishes, myId]);
  const profile = profiles.find((p) => p.id === myId);
  const facts: WishFacts = profile?.facts ?? {};
  const finished = !!profile?.finished_at;
  const answered = deck.filter((c) => mine.has(c.id)).length;
  const musts = deck.filter((c) => mine.get(c.id) === "must");
  const factsDone = !!(facts.walk_km && facts.midday_rest && facts.stairs !== undefined && facts.early !== undefined);

  const [step, setStep] = useState<Step | null>(null);
  const [index, setIndex] = useState(() => 0);
  const current: Step = step ?? (finished ? "done" : !factsDone ? "intro" : answered < deck.length ? "deck" : !facts.ny_choice ? "ny" : "done");

  async function saveFacts(patch: Partial<WishFacts>) {
    if (!myId) return;
    await upsertRow("wish_profiles", { id: myId, facts: { ...facts, ...patch }, finished_at: profile?.finished_at ?? null, updated_at: new Date().toISOString() });
  }
  async function answer(card: ExperienceCard, a: WishAnswer) {
    if (!myId) return;
    await upsertRow("wishes", { id: wishId(myId, card.id), traveller_id: myId, card_id: card.id, answer: a, updated_at: new Date().toISOString() });
  }
  async function finish() {
    if (!myId) return;
    await upsertRow("wish_profiles", { id: myId, facts: { ...facts, with_help: me?.actingFor ? true : facts.with_help }, finished_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    setStep("done");
  }

  if (!me) return null;
  if (!deck.length)
    return (
      <main className="mx-auto grid max-w-md gap-6 px-5 pb-12">
        <PageHeader eyebrow="Desejos" title="Em preparo" hand="as cartas chegam em breve" />
        <p className="text-muted">O baralho de experiências ainda está sendo montado a partir da pesquisa.</p>
      </main>
    );

  if (current === "intro")
    return (
      <main className="mx-auto grid max-w-md gap-6 px-5 pb-12">
        <PageHeader eyebrow="Primeiro, você" title="O que você quer viver no Japão?" hand="cinco perguntas e 36 cartas">
          Ninguém vê suas respostas até todo mundo terminar, nem o Pedro. Leva uns dez minutos. Dá para parar e voltar.
        </PageHeader>
        <ul className="grid gap-2 text-[1.02rem]">
          <li className="flex gap-3">
            <span className="font-display text-2xl text-vermilion">1</span> Cinco perguntas rápidas sobre o seu ritmo.
          </li>
          <li className="flex gap-3">
            <span className="font-display text-2xl text-vermilion">2</span> 36 cartas: para cada uma, <b>Pode pular</b>, <b>Quero</b> ou <b>Não abro mão</b>.
          </li>
          <li className="flex gap-3">
            <span className="font-display text-2xl text-vermilion">3</span> Uma escolha: onde passar o Réveillon.
          </li>
        </ul>
        <button className="btn btn-primary text-base" onClick={() => setStep("facts")}>
          Começar
        </button>
      </main>
    );

  if (current === "facts") return <Facts facts={facts} onSave={saveFacts} onDone={() => setStep("deck")} />;

  if (current === "deck") {
    const i = Math.min(index, deck.length - 1);
    const card = deck[i];
    const group = GROUPS.find((g) => g.key === card.deck_group)!;
    const showDivider = i === 0 || deck[i - 1].deck_group !== card.deck_group;
    return (
      <main className="mx-auto grid max-w-md gap-4 px-5 pb-12">
        <Progress deck={deck} index={i} />
        {showDivider ? (
          <p className="hand text-lg text-muted">{group.line}</p>
        ) : null}
        <Card card={card} group={group} />
        <AnswerRow
          value={mine.get(card.id)}
          mustLeft={MAX_MUST - musts.length}
          musts={musts}
          onAnswer={async (a) => {
            await answer(card, a);
            if (i + 1 < deck.length) setIndex(i + 1);
            else setStep(facts.ny_choice ? "done" : "ny");
          }}
          onSwap={async (swapOut, a) => {
            await answer(swapOut, "like");
            await answer(card, a);
            if (i + 1 < deck.length) setIndex(i + 1);
            else setStep(facts.ny_choice ? "done" : "ny");
          }}
        />
        <div className="flex justify-between text-sm">
          <button type="button" className="underline disabled:opacity-40" disabled={i === 0} onClick={() => setIndex(i - 1)}>
            ← Voltar uma
          </button>
          <span className="text-muted">
            {answered} de {deck.length}
          </span>
        </div>
      </main>
    );
  }

  if (current === "ny")
    return (
      <main className="mx-auto grid max-w-md gap-5 px-5 pb-12">
        <PageHeader eyebrow="Uma escolha" title="Onde passar o Réveillon?" hand="a virada fixa metade da rota">
          De 29 de dezembro a 3 de janeiro quase tudo fecha no Japão. A família fica parada num lugar bom, perto de um hospital. Qual você prefere?
        </PageHeader>
        <ul className="grid gap-3">
          {nyOptions.map((o) => (
            <li key={o.base}>
              <button
                type="button"
                className="card grid w-full gap-1 p-4 text-left aria-pressed:border-ink aria-pressed:bg-paper-2"
                aria-pressed={facts.ny_choice === o.base}
                onClick={() => saveFacts({ ny_choice: o.base })}
              >
                <span className="font-display text-[1.6rem] leading-tight">{o.title}</span>
                <span className="text-sm text-ink-2">{o.line}</span>
              </button>
            </li>
          ))}
        </ul>
        <button className="btn btn-primary text-base" disabled={!facts.ny_choice} onClick={finish}>
          Entregar meus desejos
        </button>
      </main>
    );

  const others = trip.travellers.filter((t) => t.id !== myId && !profiles.find((p) => p.id === t.id)?.finished_at);
  return (
    <main className="mx-auto grid max-w-md gap-6 px-5 pb-12">
      <div className="grid justify-items-center gap-3 text-center">
        <EkiStamp motif="brush" ink="var(--vermilion)" top="Desejos" bottom="entregues" size={128} rotate={-7} animate label="Desejos entregues" />
        <h1 className="text-[2.2rem] leading-tight">Obrigado, {firstName(me.name)}.</h1>
      </div>
      {musts.length ? (
        <section className="card grid gap-2 p-4">
          <p className="eyebrow">Você não abre mão de</p>
          <ul className="grid gap-1 text-[1.05rem]">
            {musts.map((c) => (
              <li key={c.id}>★ {c.name_pt}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="text-ink-2">
        {others.length
          ? `${others.map((t) => firstName(t.name)).join(", ")} ainda ${others.length === 1 ? "não terminou" : "não terminaram"}. Quando todos entregarem, aparece o retrato da família.`
          : "Todo mundo entregou. O retrato da família está pronto."}
      </p>
      <MissingBox value={facts.missing ?? ""} onSave={(v) => saveFacts({ missing: v })} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={() => { setIndex(0); setStep("deck"); }}>
          Mudar algo
        </button>
        {!others.length ? (
          <Link href="/retrato" className="btn btn-primary no-underline">
            Ver o retrato da família
          </Link>
        ) : null}
      </div>
      {demo ? <p className="text-xs text-muted">Modo demonstração: as respostas ficam só neste aparelho.</p> : null}
    </main>
  );
}

function Progress({ deck, index }: { deck: ExperienceCard[]; index: number }) {
  const group = deck[index].deck_group;
  return (
    <ol className="flex gap-1" aria-label="Progresso">
      {GROUPS.map((g) => {
        const cards = deck.filter((c) => c.deck_group === g.key);
        const first = deck.indexOf(cards[0]);
        const done = index >= first + cards.length;
        const on = g.key === group;
        return (
          <li key={g.key} className="flex-1" title={g.title}>
            <span className={`block h-1.5 rounded-full ${done ? "bg-pine" : on ? "bg-vermilion" : "bg-rule"}`} />
          </li>
        );
      })}
    </ol>
  );
}

function Card({ card, group }: { card: ExperienceCard; group: (typeof GROUPS)[number] }) {
  const walk = card.effort <= 2 ? "pouca" : card.effort === 3 ? "média" : "muita";
  const cost = card.cost_pp_jpy == null ? "—" : card.cost_pp_jpy === 0 ? "grátis" : card.cost_pp_jpy < 3000 ? "¥" : card.cost_pp_jpy < 10000 ? "¥¥" : "¥¥¥";
  return (
    <article className="card grid gap-3 overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">{group.title}</p>
          <h2 className="text-[2rem] leading-[1.05]">{card.name_pt}</h2>
          <p className="font-mono text-xs tracking-wider text-muted uppercase">{card.name_en}</p>
        </div>
        <EkiStamp motif={group.motif} ink={group.ink} size={72} rotate={6} seed={card.id.length} label="" />
      </div>
      <p className="text-[1.08rem] leading-relaxed">{card.promise_pt}</p>
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
        <div>
          <dt className="inline">Caminhada: </dt>
          <dd className="inline font-bold text-ink">{walk}</dd>
        </div>
        <div>
          <dt className="inline">Frio: </dt>
          <dd className="inline font-bold text-ink">{card.indoor === "in" ? "coberto" : card.indoor === "mixed" ? "parte ao ar livre" : "ao ar livre"}</dd>
        </div>
        <div>
          <dt className="inline">Custo: </dt>
          <dd className="inline font-bold text-ink">{cost}</dd>
        </div>
      </dl>
    </article>
  );
}

function AnswerRow({
  value,
  mustLeft,
  musts,
  onAnswer,
  onSwap,
}: {
  value?: WishAnswer;
  mustLeft: number;
  musts: ExperienceCard[];
  onAnswer: (a: WishAnswer) => Promise<void>;
  onSwap: (swapOut: ExperienceCard, a: WishAnswer) => Promise<void>;
}) {
  const [swap, setSwap] = useState(false);
  const [busy, setBusy] = useState(false);
  async function pick(a: WishAnswer) {
    if (a === "must" && mustLeft <= 0 && value !== "must") return setSwap(true);
    setBusy(true);
    await onAnswer(a);
    setBusy(false);
  }
  return (
    <>
      <div className="grid gap-2">
        {ANSWERS.map((a) => (
          <button
            key={a.key}
            type="button"
            disabled={busy}
            aria-pressed={value === a.key}
            onClick={() => pick(a.key)}
            className={`grid min-h-14 rounded-2xl border px-4 py-2 text-left transition-colors aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper ${a.key === "like" ? "border-ink-2 bg-card" : "border-rule bg-card"}`}
          >
            <span className={`font-bold ${a.key === "like" ? "text-[1.15rem]" : "text-[1.05rem]"}`}>
              {a.key === "must" ? "★ " : ""}
              {a.label}
            </span>
            <span className="text-xs opacity-80">{a.key === "must" ? `${a.hint} · faltam ${Math.max(mustLeft, 0)}` : a.hint}</span>
          </button>
        ))}
      </div>
      <Dialog.Root open={swap} onOpenChange={setSwap}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
          <Dialog.Content className="card fixed inset-x-4 top-24 z-50 mx-auto grid max-w-sm gap-4 p-5">
            <Dialog.Title className="text-2xl">Você já tem 3. Troca por qual?</Dialog.Title>
            <Dialog.Description className="text-sm text-muted">O que sair vira “Quero”.</Dialog.Description>
            <ul className="grid gap-2">
              {musts.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    className="btn w-full justify-start"
                    onClick={async () => {
                      setSwap(false);
                      setBusy(true);
                      await onSwap(m, "must");
                      setBusy(false);
                    }}
                  >
                    ★ {m.name_pt}
                  </button>
                </li>
              ))}
            </ul>
            <Dialog.Close className="btn btn-sm justify-self-end">Deixar como está</Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

/** Five one-question screens with picture-sized answers. Everyone answers, so nobody is singled out. */
function Facts({ facts, onSave, onDone }: { facts: WishFacts; onSave: (p: Partial<WishFacts>) => Promise<void>; onDone: () => void }) {
  const [i, setI] = useState(0);
  const { trip, me } = useStore();
  const idx = trip.travellers.findIndex((t) => t.id === me?.travellerId);
  const screens: { q: string; options: { label: string; hint?: string; patch: Partial<WishFacts>; on: boolean }[] }[] = [
    {
      q: "Quanto você gosta de andar num dia de passeio?",
      options: [
        { label: "Passeio no bairro", hint: "até 4 km", patch: { walk_km: "bairro" }, on: facts.walk_km === "bairro" },
        { label: "Dia de cidade", hint: "6 a 9 km", patch: { walk_km: "cidade" }, on: facts.walk_km === "cidade" },
        { label: "Dia de trilha", hint: "10 km ou mais", patch: { walk_km: "trilha" }, on: facts.walk_km === "trilha" },
      ],
    },
    {
      q: "Subir muitas escadas (templos no alto, estações antigas)?",
      options: [
        { label: "Tranquilo", patch: { stairs: true }, on: facts.stairs === true },
        { label: "Prefiro não", patch: { stairs: false }, on: facts.stairs === false },
      ],
    },
    {
      q: "Uma pausa no meio do dia?",
      options: [
        { label: "Preciso", hint: "voltar para o quarto depois do almoço", patch: { midday_rest: "need" }, on: facts.midday_rest === "need" },
        { label: "Às vezes", patch: { midday_rest: "sometimes" }, on: facts.midday_rest === "sometimes" },
        { label: "Não preciso", patch: { midday_rest: "no" }, on: facts.midday_rest === "no" },
      ],
    },
    {
      q: "Você é mais de…",
      options: [
        { label: "Madrugar", hint: "mercado às 6h, templo vazio", patch: { early: true }, on: facts.early === true },
        { label: "Noite", hint: "jantar longo, bar, luzes", patch: { early: false }, on: facts.early === false },
      ],
    },
  ];
  const foods = ["Peixe cru", "Carne mal passada", "Álcool", "Frutos do mar", "Comida muito apimentada"];
  const last = i === screens.length;
  return (
    <main className="mx-auto grid max-w-md gap-5 px-5 pb-12">
      <div className="flex items-center gap-3">
        {me ? <Avatar name={me.name} index={idx} size={36} /> : null}
        <p className="eyebrow">
          Pergunta {i + 1} de {screens.length + 1}
        </p>
      </div>
      {!last ? (
        <>
          <h1 className="text-[2rem] leading-tight">{screens[i].q}</h1>
          <div className="grid gap-2">
            {screens[i].options.map((o) => (
              <button
                key={o.label}
                type="button"
                aria-pressed={o.on}
                className="grid min-h-14 rounded-2xl border border-rule bg-card px-4 py-2 text-left aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
                onClick={async () => {
                  await onSave(o.patch);
                  setI(i + 1);
                }}
              >
                <span className="text-[1.1rem] font-bold">{o.label}</span>
                {o.hint ? <span className="text-xs opacity-80">{o.hint}</span> : null}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h1 className="text-[2rem] leading-tight">Tem algo que você não come ou não bebe?</h1>
          <div className="flex flex-wrap gap-2">
            {foods.map((f) => {
              const on = (facts.food_limits ?? []).includes(f);
              return (
                <button key={f} type="button" className="chip" aria-pressed={on} onClick={() => onSave({ food_limits: on ? (facts.food_limits ?? []).filter((x) => x !== f) : [...(facts.food_limits ?? []), f] })}>
                  {f}
                </button>
              );
            })}
          </div>
          <button className="btn btn-primary text-base" onClick={onDone}>
            {facts.food_limits?.length ? "Pronto, vamos às cartas" : "Como tudo. Vamos às cartas"}
          </button>
        </>
      )}
      {i > 0 ? (
        <button type="button" className="justify-self-start text-sm underline" onClick={() => setI(i - 1)}>
          ← Voltar
        </button>
      ) : null}
    </main>
  );
}

function MissingBox({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [text, setText] = useState(value);
  return (
    <label className="grid gap-1 text-sm text-muted">
      Faltou alguma coisa? (opcional)
      <textarea className="input min-h-20 resize-none font-hand text-lg" value={text} onChange={(e) => setText(e.target.value)} onBlur={() => text !== value && onSave(text)} placeholder="Um lugar, um prato, uma vontade…" />
    </label>
  );
}
