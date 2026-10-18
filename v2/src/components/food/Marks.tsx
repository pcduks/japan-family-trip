import type { Pregnancy, Seven } from "@/lib/foodDeep";
import { critic, PREG_MARK, SEVEN_MARK, type Open } from "@/lib/foodView";

/** The Tabelog score as a tile: filled from 4.00, outlined 3.70–3.99, ink 3.50–3.69, quiet below. */
export function TabelogTile({ score, awards, size = 44 }: { score: number | null | undefined; awards?: string; size?: number }) {
  if (score == null) return <span className="inline-grid shrink-0 place-items-center rounded-xl border border-dashed border-rule text-[0.6rem] text-muted" style={{ width: size, height: size }} aria-label="No Tabelog score">—</span>;
  const tone = score >= 4 ? "bg-accent text-accent-ink border-accent" : score >= 3.7 ? "border-accent text-accent" : score >= 3.5 ? "border-ink text-ink" : "border-rule text-muted";
  const hyaku = !!awards && /百名店/.test(awards);
  const award = !!awards && /Award/i.test(awards);
  return (
    <span className={`relative inline-flex shrink-0 flex-col items-center justify-center rounded-xl border-[1.5px] leading-none ${tone}`} style={{ width: size, height: size }} aria-label={`Tabelog ${score.toFixed(2)}${award ? ", Tabelog Award" : ""}${hyaku ? ", one of the top 100" : ""}`} title={awards || undefined}>
      <span className="font-display font-semibold" style={{ fontSize: size * 0.36 }}>
        {score.toFixed(2)}
      </span>
      <span className="mt-0.5 tracking-wide" style={{ fontSize: Math.max(7, size * 0.16) }}>
        TABELOG
      </span>
      {award || hyaku ? (
        <span aria-hidden="true" className="jp absolute -top-1.5 -right-1.5 grid size-[18px] place-items-center rounded-full border border-accent bg-card text-[10px] font-bold text-accent">
          {hyaku ? "百" : "賞"}
        </span>
      ) : null}
    </span>
  );
}

export function FernandaMark({ level, long = false }: { level?: Pregnancy; long?: boolean }) {
  const m = PREG_MARK[level ?? "unknown"];
  return (
    <span className={`font-semibold whitespace-nowrap ${m.cls}`} aria-label={`For Fernanda: ${m.label}`}>
      {m.glyph} {long ? `Fernanda: ${m.label.toLowerCase()}` : m.label}
    </span>
  );
}

export function SevenMark({ seven }: { seven?: Seven }) {
  if (!seven) return <span className="whitespace-nowrap text-muted">⑦ ?</span>;
  const m = SEVEN_MARK[seven];
  return (
    <span className={`whitespace-nowrap ${m.fits ? "" : "text-muted"}`} aria-label={m.long}>
      {m.short}
    </span>
  );
}

export function OpenMark({ open, day }: { open: Open; day: string }) {
  if (open === "open")
    return (
      <span className="whitespace-nowrap text-ok" aria-label={`Open ${day}`}>
        ✓ {day}
      </span>
    );
  if (open === "closed")
    return (
      <span className="whitespace-nowrap text-muted line-through" aria-label={`Closed ${day}`}>
        {day}
      </span>
    );
  return (
    <span className="whitespace-nowrap text-muted" aria-label={`Check ${day}`}>
      {day}?
    </span>
  );
}

const MONO_COLORS = ["#2a3f6f", "#8a5a2b", "#2b6f5e", "#6f2a4f", "#4f5b2a"];

export function Monograms({ critics }: { critics?: { who: string }[] }) {
  if (!critics?.length) return null;
  const seen = new Set<string>();
  const list = critics.map((c) => critic(c.who)).filter((c) => (seen.has(c.name) ? false : (seen.add(c.name), true)));
  return (
    <span className="flex -space-x-1.5" aria-label={`Critics: ${list.map((c) => c.name).join(", ")}`}>
      {list.slice(0, 3).map((c, i) => (
        <span key={c.name} title={c.name} className="grid size-[22px] place-items-center rounded-full border-2 border-card text-[9px] font-bold text-white" style={{ background: MONO_COLORS[i % MONO_COLORS.length] }}>
          {c.initials}
        </span>
      ))}
    </span>
  );
}
