import { VERDICT_LABEL, type Verdict } from "@/lib/areas";

/** Colour and shape per verdict, so the label never relies on colour alone. */
export const VERDICT_STYLE: Record<Verdict["state"], { color: string }> = {
  route: { color: "var(--accent)" },
  daytrip: { color: "var(--indigo)" },
  swap: { color: "var(--warn)" },
  later: { color: "var(--muted)" },
};

/** A filled dot (on our route), a dashed ring (day trip), a half-filled dot (could swap in) or an empty ring (another time). */
export function VerdictMark({ state, size = 10 }: { state: Verdict["state"]; size?: number }) {
  const c = VERDICT_STYLE[state].color;
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 10 10" className="shrink-0">
      {state === "route" ? <circle cx="5" cy="5" r="4.5" fill={c} /> : null}
      {state === "daytrip" ? <circle cx="5" cy="5" r="3.8" fill="none" stroke={c} strokeWidth="1.6" strokeDasharray="2 1.4" /> : null}
      {state === "swap" ? (
        <>
          <circle cx="5" cy="5" r="3.9" fill="none" stroke={c} strokeWidth="1.4" />
          <path d="M5 1.1a3.9 3.9 0 0 1 0 7.8Z" fill={c} />
        </>
      ) : null}
      {state === "later" ? <circle cx="5" cy="5" r="3.9" fill="none" stroke={c} strokeWidth="1.4" /> : null}
    </svg>
  );
}

/** Is it for us this trip, as a pill: On our route, Day trip, Could swap in, Another time. */
export function VerdictPill({ state, small }: { state: Verdict["state"]; small?: boolean }) {
  const st = VERDICT_STYLE[state];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border font-semibold whitespace-nowrap ${small ? "px-2 py-0.5 text-[0.7rem]" : "px-2.5 py-1 text-xs"}`} style={{ borderColor: st.color, color: st.color }}>
      <VerdictMark state={state} size={small ? 9 : 10} />
      {VERDICT_LABEL[state]}
    </span>
  );
}
