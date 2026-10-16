"use client";

import { myPref, type Pref, PREF_LABEL, prefValue, tally, tallyText, withPref } from "@/lib/prefs";
import { useStore } from "./providers";

/** Three taps per place: Must, Nice, Skip. Saved under the person's name; the tally shows what the family thinks. */
export function PlacePrefs({ placeId, compact = false }: { placeId: string; compact?: boolean }) {
  const { snapshot, me, setVote } = useStore();
  const mine = myPref(snapshot.votes, me?.travellerId, placeId);
  const t = tally(snapshot.votes, placeId);
  const text = tallyText(t);
  const tone: Record<Pref, string> = { must: "bg-accent text-accent-ink border-accent", nice: "bg-ok/15 border-ok text-ok", skip: "bg-bg-2 border-line text-muted" };
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {me ? (
        <span className="seg" role="group" aria-label={`Must, nice or skip`}>
          {(["must", "nice", "skip"] as Pref[]).map((p) => (
            <button
              key={p}
              aria-pressed={mine === p}
              className={`!min-h-7 !px-2.5 !py-0.5 !text-xs ${mine === p ? tone[p] : ""}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setVote("mustdo", withPref(prefValue(snapshot.votes, me.travellerId), placeId, mine === p ? null : p));
              }}
            >
              {PREF_LABEL[p]}
            </button>
          ))}
        </span>
      ) : null}
      {text && !compact ? <span className="text-xs text-muted">{text}</span> : null}
    </span>
  );
}

/** Just the family's tally, for lists. */
export function PrefTally({ placeId }: { placeId: string }) {
  const { snapshot } = useStore();
  const text = tallyText(tally(snapshot.votes, placeId));
  return text ? <span className="text-xs text-accent">{text}</span> : null;
}
