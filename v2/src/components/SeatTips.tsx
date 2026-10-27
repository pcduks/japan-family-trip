import { SEAT_RULE, seatTipsFor, type SeatTipOnLeg } from "@/lib/seats";

/** The seat letter in a ring, or a short word when the tip is not one letter ("Front seats"). */
function SeatMark({ t, small }: { t: SeatTipOnLeg; small?: boolean }) {
  const letter = t.tip.badge.match(/^Seat ([A-E])$/)?.[1];
  const size = small ? "size-6 text-[0.8rem]" : "size-10 text-[1.35rem]";
  if (t.tip.kind === "note")
    return (
      <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full border-2 border-indigo/40 font-bold text-indigo ${size}`}>
        !
      </span>
    );
  return (
    <span aria-hidden="true" className={`display grid shrink-0 place-items-center rounded-full bg-indigo leading-none text-card ${size}`}>
      {letter ?? "↑"}
    </span>
  );
}

/**
 * Where to sit on a move, shown on the travel day: the main seat tip large,
 * the rest under it. Nothing when the move has no tip.
 */
export function SeatTips({ from, to }: { from: string; to: string }) {
  const tips = seatTipsFor(from, to);
  if (!tips.length) return null;
  const [main, ...rest] = tips;
  // One train: its name heads the box. A change of trains: each tip names its own.
  const oneLine = tips.every((t) => t.tip.line === main.tip.line);
  return (
    <section className="grid gap-2.5 rounded-xl border-l-4 border-l-indigo bg-indigo/10 p-3 text-sm" aria-label="Where to sit">
      <p className="eyebrow text-indigo">Where to sit{oneLine ? ` · ${main.tip.line}` : ""}</p>
      <TipRow t={main} big showLine={!oneLine} />
      {rest.map((t) => (
        <TipRow key={t.tip.id} t={t} showLine={!oneLine} />
      ))}
      {tips.some((t) => /shinkansen/i.test(t.tip.line) && t.tip.kind === "seat") ? <p className="text-xs text-muted">{SEAT_RULE}</p> : null}
      <p className="text-xs text-muted">
        Sources:{" "}
        {uniqueSources(tips).map((s, k) => (
          <span key={s.url}>
            {k ? " · " : ""}
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.label}
            </a>
          </span>
        ))}
      </p>
    </section>
  );
}

function TipRow({ t, big, showLine }: { t: SeatTipOnLeg; big?: boolean; showLine?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <SeatMark t={t} small={!big} />
      <div className="grid min-w-0 gap-0.5">
        {showLine ? <span className="text-xs font-semibold text-muted">{t.tip.line}</span> : null}
        <b className={big ? "text-[1.02rem] leading-snug text-ink" : "text-ink"}>{t.tip.headline}</b>
        {t.when ? <span className="font-semibold text-indigo">Look out {t.when}.</span> : null}
        <span className="text-ink-2">{t.tip.where}</span>
        {t.tip.detail ? <span className="text-ink-2">{t.tip.detail}</span> : null}
      </div>
    </div>
  );
}

function uniqueSources(tips: SeatTipOnLeg[]) {
  const seen = new Set<string>();
  return tips.flatMap((t) => t.tip.sources).filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)));
}

/** One line under a move, between two stops: "Seat E · Mt Fuji about 40–45 min after Tokyo". */
export function SeatTipLine({ from, to, className = "" }: { from: string; to: string; className?: string }) {
  const main = seatTipsFor(from, to).find((t) => t.tip.kind === "seat");
  if (!main) return null;
  return (
    <span className={`flex items-center gap-1.5 font-semibold text-indigo ${className}`}>
      <SeatMark t={main} small />
      <span>
        {main.tip.headline}
        {main.when ? `, ${main.when}` : ""}
      </span>
    </span>
  );
}
