"use client";

import type { FoodCityMeta, FoodTopicMeta } from "@/lib/foodGuide/types";
import { PageHeader, StampCard } from "./ui";
import type { Motif } from "./EkiStamp";
import { usePlans } from "./usePlans";

const TOPIC_STAMP: Record<string, { motif: Motif; ink: string; status: string }> = {
  calendario: { motif: "bell", ink: "var(--vermilion)", status: "Datas-limite de reserva e o que muda de 20/12 a 9/1" },
  depachika: { motif: "bowl", ink: "var(--amber)", status: "Andares de comida das lojas de departamento" },
  ekiben: { motif: "train", ink: "var(--indigo)", status: "Estações, ekiben e o que comer no trem" },
  konbini: { motif: "coin", ink: "var(--pine)", status: "7-Eleven, FamilyMart, Lawson" },
  etiquette: { motif: "brush", ink: "var(--plum)", status: "Como pedir, pagar e reservar; frases" },
};

/** Bases carry fine-grained regions; the hub groups them like the chapters. */
const REGION_GROUP: [RegExp, string][] = [
  [/Kanto|Kanagawa|Tochigi|Gunma|Izu|Fuji/, "Tokyo, Fuji e arredores"],
  [/Nagano|Gifu|Toyama|Ishikawa|Fukui|Niigata/, "Alpes e Hokuriku"],
  [/Kansai|Hyogo|Wakayama/, "Kansai"],
  [/Chugoku|Hiroshima|Setouchi|Kagawa|Ehime/, "Mar Interior"],
  [/Kyushu/, "Kyushu"],
  [/Tōhoku/, "Tōhoku"],
];
const groupOf = (region: string) => REGION_GROUP.find(([re]) => re.test(region))?.[1] ?? "Outros";

const topicRank = (slug: string) => {
  const i = Object.keys(TOPIC_STAMP).indexOf(slug);
  return i < 0 ? 99 : i;
};

function cityStatus(c: FoodCityMeta) {
  const bits = [c.counts.meibutsu && `${c.counts.meibutsu} pratos`, c.counts.places && `${c.counts.places} restaurantes`].filter(Boolean);
  return bits.join(" · ") || c.tagline_pt;
}

/** The food guide's front page: our route's cities first, then the how-to topics, then every other base. */
export function FoodGuideHub({ cities, topics }: { cities: FoodCityMeta[]; topics: FoodTopicMeta[] }) {
  const { chosen } = usePlans();
  const onRoute = new Set(chosen?.stays.flatMap((s) => [s.place, ...s.daytrips]) ?? []);
  const ours = cities.filter((c) => onRoute.has(c.slug));
  const rest = cities.filter((c) => !onRoute.has(c.slug));
  const regions = [...new Set(rest.map((c) => groupOf(c.region)))];

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-5 pb-12">
      <PageHeader eyebrow="Para o Pedro guiar a família" title="Guia de comida" hand="o que provar, onde e por quê">
        O que cada lugar tem de famoso e a história por trás, mercados e bairros, como comer bem na depachika, no trem e na konbini, e os restaurantes
        validados no Tabelog e pelos críticos que você segue.
      </PageHeader>

      {ours.length ? (
        <Group title="Na nossa rota">
          {ours.map((c) => (
            <StampCard key={c.slug} wide href={`/comida/${c.slug}`} motif="bowl" ink="var(--vermilion)" title={c.name} status={cityStatus(c)} />
          ))}
        </Group>
      ) : null}

      {topics.length ? (
        <Group title="Como comer bem">
          {[...topics].sort((a, b) => topicRank(a.slug) - topicRank(b.slug)).map((t) => {
            const s = TOPIC_STAMP[t.slug] ?? { motif: "bowl" as Motif, ink: "var(--ink)", status: `${t.items} dicas` };
            return <StampCard key={t.slug} href={`/comida/${t.slug}`} motif={s.motif} ink={s.ink} title={t.title_pt} status={s.status} />;
          })}
        </Group>
      ) : null}

      {regions.map((r) => (
        <Group key={r} title={ours.length ? `${r} (fora da rota)` : r}>
          {rest
            .filter((c) => groupOf(c.region) === r)
            .map((c) => (
              <StampCard key={c.slug} href={`/comida/${c.slug}`} motif="bowl" ink="var(--amber)" title={c.name} status={cityStatus(c)} />
            ))}
        </Group>
      ))}

      {!cities.length && !topics.length ? <p className="text-muted">O guia ainda está sendo escrito.</p> : null}
    </main>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <h2 className="eyebrow">{title}</h2>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </section>
  );
}
