"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useState } from "react";
import { mapsSearchUrl } from "@/lib/links";
import { placeMap } from "@/lib/trip";
import { useStore } from "./providers";
import { PageHeader, Section } from "./ui";
import { usePlans } from "./usePlans";

const PHRASES: [string, string, string][] = [
  ["妊婦です", "ninpu desu", "Ela está grávida"],
  ["救急車を呼んでください", "kyūkyūsha o yonde kudasai", "Chame uma ambulância, por favor"],
  ["病院に連れて行ってください", "byōin ni tsurete itte kudasai", "Leve-nos a um hospital, por favor"],
  ["お腹が痛いです", "onaka ga itai desu", "Estou com dor na barriga"],
  ["英語を話せる医者はいますか", "eigo o hanaseru isha wa imasu ka", "Tem médico que fale inglês?"],
];

/** Emergency page: practical, calm, one tap to call. */
export function SocorroView() {
  const { trip } = useStore();
  const { chosen, routeFor } = usePlans();
  const P = useMemo(() => placeMap(trip), [trip]);
  const [show, setShow] = useState<[string, string, string] | null>(null);
  const bases = chosen ? routeFor(chosen).stays.map((s) => P.get(s.place)).filter(Boolean) : [];

  return (
    <main className="mx-auto grid max-w-3xl gap-8 px-5 pb-12">
      <PageHeader eyebrow="Guarde esta página" title="Socorro" hand="com calma, dá tudo certo">
        Números, hospitais com maternidade perto de cada base e as frases que ajudam. Funciona sem internet depois da primeira visita.
      </PageHeader>

      <div className="grid grid-cols-2 gap-3">
        <a href="tel:119" className="card grid gap-1 p-4 no-underline" style={{ borderColor: "var(--danger)" }}>
          <span className="font-display text-5xl text-danger">119</span>
          <span className="text-sm">Ambulância e bombeiros</span>
          <span className="inline-flex items-center gap-1.5 justify-self-start rounded-full px-3 py-1 text-sm font-bold" style={{ background: "var(--danger)", color: "var(--accent-ink)" }}>
            <Phone /> Ligar
          </span>
        </a>
        <a href="tel:110" className="card grid gap-1 p-4 no-underline">
          <span className="font-display text-5xl">110</span>
          <span className="text-sm">Polícia</span>
          <span className="inline-flex items-center gap-1.5 justify-self-start rounded-full px-3 py-1 text-sm font-bold" style={{ background: "var(--vermilion)", color: "var(--accent-ink)" }}>
            <Phone /> Ligar
          </span>
        </a>
        <a href="tel:+815038162787" className="card col-span-2 grid gap-1 p-4 no-underline">
          <span className="font-display text-3xl">050-3816-2787</span>
          <span className="text-sm">Japan Visitor Hotline: atendimento em inglês, 24 horas</span>
          <span className="inline-flex items-center gap-1.5 justify-self-start rounded-full px-3 py-1 text-sm font-bold" style={{ background: "var(--vermilion)", color: "var(--accent-ink)" }}>
            <Phone /> Ligar
          </span>
        </a>
      </div>

      <Section title="Para ela" id="ela">
        <ul className="card grid list-disc gap-2 py-4 pr-4 pl-9 text-[1.02rem] marker:text-plum">
          <li>Levar sempre o cartão do pré-natal e o atestado de voo (fit-to-fly) no celular.</li>
          <li>Sinais para procurar ajuda já: sangramento, dor forte ou contínua, perda de líquido, bebê mexendo bem menos, febre.</li>
          <li>Ao chamar ajuda, diga <b lang="ja">妊婦です</b> (<i>ninpu desu</i>), &ldquo;ela está grávida&rdquo;, e as semanas, por exemplo <b lang="ja">31 週</b> (31 semanas).</li>
          <li>Hospitais grandes têm atendimento de emergência 24 h; clínicas pequenas fecham no Ano-Novo (29 dez – 3 jan).</li>
        </ul>
      </Section>

      <Section title="Maternidade perto de cada base" id="hosp">
        {bases.length ? (
          <ul className="grid gap-2">
            {bases.map((p) => (
              <li key={p!.slug}>
                <a
                  href={mapsSearchUrl({ query: `産婦人科 病院 ${p!.name}`, googlePlaceId: null })}
                  target="_blank"
                  rel="noreferrer"
                  className="card flex items-center justify-between gap-3 p-4 no-underline"
                >
                  <span>
                    <span className="block font-display text-2xl">{p!.name}</span>
                    <span className="text-sm text-muted">Hospitais com obstetrícia no Google Maps</span>
                  </span>
                  <span aria-hidden="true">→</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Quando a rota estiver escolhida, a lista aparece aqui, base por base.</p>
        )}
      </Section>

      <Section title="Frases que ajudam" id="frases" aside="toque para mostrar">
        <ul className="grid gap-2">
          {PHRASES.map((ph) => (
            <li key={ph[0]}>
              <button type="button" onClick={() => setShow(ph)} className="card grid w-full gap-0.5 p-4 text-left">
                <span className="text-2xl" lang="ja">
                  {ph[0]}
                </span>
                <span className="font-mono text-sm text-muted">{ph[1]}</span>
                <span>{ph[2]}</span>
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Dialog.Root open={!!show} onOpenChange={(o) => !o && setShow(null)}>
        <Dialog.Portal>
          <Dialog.Content className="fixed inset-0 z-50 grid content-center gap-6 bg-[#fffdf7] p-6 text-[#111]">
            <Dialog.Title className="text-[3.2rem] leading-tight font-bold" lang="ja">
              {show?.[0]}
            </Dialog.Title>
            <Dialog.Description className="grid gap-1 text-xl">
              <span className="font-mono">{show?.[1]}</span>
              <span>{show?.[2]}</span>
            </Dialog.Description>
            <Dialog.Close className="btn btn-primary justify-self-start text-lg">Fechar</Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}

function Phone() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2" />
    </svg>
  );
}
