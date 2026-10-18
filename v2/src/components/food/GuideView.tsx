import Link from "next/link";
import foodGuide from "../../../data/food-guide.json";
import { slug } from "@/lib/food";
import type { DeepTopic } from "@/lib/foodDeep";
import { ListCard, OurList } from "../Food";
import { FernandaMark } from "./Marks";

const GUIDE = foodGuide as unknown as {
  how_we_eat: { title: string; text: string }[];
  for_her: { summary: string; fine: string[]; careful: string[]; avoid: string[]; sources: { label: string; url: string }[] };
  ryokan_meals: { text: string; ask_for: string[] };
};

/** The how-to guides that are not a deep topic file. */
export const EXTRA_GUIDES: Record<string, string> = { how: "How we eat", fernanda: "For Fernanda", ryokan: "Ryokan meals", ours: "Our own list" };

function Shell({ title, ja, intro, children }: { title: string; ja?: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="mx-auto grid max-w-2xl gap-5 px-4 pt-3 pb-8">
      <header className="grid gap-1">
        <Link href="/food" className="text-sm text-muted no-underline">
          ← Food
        </Link>
        <h1 className="display flex flex-wrap items-baseline gap-x-3 text-[2.1rem] leading-[1.05]">
          {title} {ja ? <span className="jp text-[1.2rem] text-ink-2">{ja}</span> : null}
        </h1>
        {intro ? <div className="grid gap-2 text-ink-2">{intro}</div> : null}
      </header>
      {children}
    </main>
  );
}

const JA: Record<string, string> = { depachika: "デパ地下", ekiben: "駅弁", konbini: "コンビニ", etiquette: "作法" };

/** A deep topic (depachika, station food, konbini, manners, the food calendar) as short cards with a jump row. */
export function TopicGuide({ topic, skipFirst = false }: { topic: DeepTopic; skipFirst?: boolean }) {
  const sections = skipFirst ? topic.sections.slice(1) : topic.sections;
  const title = topic.slug === "calendar" ? "Day by day" : topic.title;
  return (
    <Shell
      title={title}
      ja={JA[topic.slug]}
      intro={
        <>
          {topic.intro?.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {skipFirst ? (
            <p className="text-sm">
              The dates to book by are on <Link href="/food/book">Book by…</Link>
            </p>
          ) : null}
        </>
      }
    >
      {sections.length > 2 ? (
        <nav aria-label="Sections" className="no-scrollbar sticky top-0 z-10 -mx-4 flex gap-1.5 overflow-x-auto bg-bg px-4 py-2">
          {sections.map((s) => (
            <a key={s.title} href={`#${slug(s.title)}`} className="chip shrink-0 min-h-9 no-underline">
              {s.title.split(/[:(]/)[0].trim()}
            </a>
          ))}
        </nav>
      ) : null}
      {sections.map((s) => (
        <section key={s.title} id={slug(s.title)} className="grid scroll-mt-14 gap-2">
          <h2 className="text-[1.35rem]">{s.title}</h2>
          {s.body ? <p className="max-w-prose text-ink-2">{s.body}</p> : null}
          {s.items?.length ? (
            <ul className="card divide-y divide-rule">
              {s.items.map((it) => (
                <li key={it.name} className="grid gap-1 px-3 py-3 text-sm">
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <b className="font-display text-[1.05rem]">{it.name}</b> {it.name_ja ? <span className="jp text-ink-2">{it.name_ja}</span> : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs">
                      {it.pregnancy ? <FernandaMark level={it.pregnancy} /> : null}
                      {it.must ? (
                        <span aria-label="Must" className="jp grid size-[22px] -rotate-6 place-items-center rounded-full border-[1.5px] border-accent text-[11px] text-accent">
                          必
                        </span>
                      ) : null}
                    </span>
                  </span>
                  {it.what ? <span className="text-ink-2">{it.what}</span> : null}
                  {it.where || it.price ? <span className="text-xs text-muted">{[it.where, it.price].filter(Boolean).join(" · ")}</span> : null}
                  {it.tip ? <span className="rounded-lg bg-bg-2 px-2.5 py-1.5 text-[0.82rem]">{it.tip}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
      {topic.sources?.length ? (
        <details className="text-sm text-muted">
          <summary className="cursor-pointer">Sources ({topic.sources.length})</summary>
          <ul className="mt-2 grid gap-1 break-words">
            {topic.sources.map((s) => (
              <li key={s}>{/^https?:\/\//.test(s) ? <a href={s}>{s}</a> : s}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </Shell>
  );
}

export function ExtraGuide({ id }: { id: string }) {
  if (id === "how")
    return (
      <Shell title="How we eat" intro={<p>Three weeks, seven of us, one pregnant. What shapes every meal.</p>}>
        <ol className="grid gap-3">
          {GUIDE.how_we_eat.map((h, i) => (
            <li key={h.title} className="card grid grid-cols-[2rem_1fr] gap-x-2 p-4">
              <span className="display row-span-2 text-[1.6rem] leading-none text-accent">{i + 1}</span>
              <b>{h.title}</b>
              <span className="text-sm text-ink-2">{h.text}</span>
            </li>
          ))}
        </ol>
      </Shell>
    );
  if (id === "fernanda")
    return (
      <Shell title="For Fernanda" intro={<p>{GUIDE.for_her.summary}</p>}>
        <div className="grid gap-3 sm:grid-cols-3">
          <ListCard title="● Fine" tone="ok" items={GUIDE.for_her.fine} />
          <ListCard title="◆ Ask, or with care" tone="warn" items={GUIDE.for_her.careful} />
          <ListCard title="⊘ Not this trip" tone="danger" items={GUIDE.for_her.avoid} />
        </div>
        <Link href="/food/staff" className="card grid gap-1 p-4 no-underline">
          <span className="eyebrow">Show staff</span>
          <span className="jp text-[1.4rem] font-bold">妊娠中です。生もの抜きでお願いします。</span>
          <span className="text-sm text-ink-2">I’m pregnant. Nothing raw, please. Tap to show it full screen.</span>
        </Link>
        <p className="text-sm text-muted">
          Sources:{" "}
          {GUIDE.for_her.sources.map((s, i) => (
            <span key={s.url}>
              {i ? " · " : ""}
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            </span>
          ))}
        </p>
      </Shell>
    );
  if (id === "ryokan")
    return (
      <Shell title="Ryokan meals" intro={<p>{GUIDE.ryokan_meals.text}</p>}>
        <div className="card grid gap-2 p-4 text-sm">
          <p className="eyebrow">Ask for, when booking</p>
          <ul className="grid gap-1">
            {GUIDE.ryokan_meals.ask_for.map((a) => (
              <li key={a} className="flex gap-2">
                <span aria-hidden="true" className="text-accent">
                  ●
                </span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      </Shell>
    );
  return (
    <Shell title="Our own list">
      <OurList />
    </Shell>
  );
}
