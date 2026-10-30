"use client";

import { LAYER_HEX, LAYER_INK, LAYER_LABEL, LAYER_ON_INK, type Layer, type Pin } from "@/lib/city";
import { CAT_LABEL } from "@/lib/tokyo";
import { CatIcon } from "../tokyo/CatIcon";
import { photoSrc } from "./usePins";

/* Small pieces the city page shares: chips, the layer dot, and the pin tile. */

export function Chip({ children, pressed, onClick, disabled, title, tone }: { children: React.ReactNode; pressed?: boolean; onClick: () => void; disabled?: boolean; title?: string; tone?: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      title={title}
      onClick={onClick}
      style={pressed && tone ? { background: tone, borderColor: tone, color: "#fff" } : undefined}
      className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold whitespace-nowrap transition-colors disabled:opacity-50 ${pressed ? "border-ink bg-ink text-bg" : "border-rule bg-card text-ink"}`}
    >
      {children}
    </button>
  );
}

export function MapChip({ children, pressed, onClick, className = "", label }: { children: React.ReactNode; pressed?: boolean; onClick: () => void; className?: string; label?: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      onClick={onClick}
      className={`pointer-events-auto inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold shadow-sm ${pressed ? "border-ink bg-ink text-bg" : "border-rule bg-card/95 text-ink"} ${className}`}
    >
      {children}
    </button>
  );
}

export function LayerDot({ layer, size = 10 }: { layer: Layer; size?: number }) {
  return <span aria-hidden="true" className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: LAYER_INK[layer] }} />;
}

export function layerHex(layer: Layer, theme: "light" | "dark"): string {
  return LAYER_HEX[theme][layer];
}

/** A layer toggle for the map's corner: its dot and name, filled when on, hollow when off. */
export function LayerToggle({ layer, on, onClick, theme }: { layer: Layer; on: boolean; onClick: () => void; theme: "light" | "dark" }) {
  const ink = LAYER_HEX[theme][layer];
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      title={on ? `Hide ${LAYER_LABEL[layer]}` : `Show ${LAYER_LABEL[layer]}`}
      className="pointer-events-auto inline-flex h-9 items-center gap-1 rounded-full border px-2 text-[0.72rem] font-bold whitespace-nowrap shadow-sm transition-colors"
      style={on ? { background: ink, borderColor: ink, color: LAYER_ON_INK[theme] } : { background: "color-mix(in srgb, var(--card) 92%, transparent)", borderColor: ink, color: "var(--ink)" }}
    >
      <span aria-hidden="true" className="inline-block size-2.5 rounded-full" style={on ? { background: LAYER_ON_INK[theme] } : { border: `2px solid ${ink}` }} />
      {SHORT_LABEL[layer]}
    </button>
  );
}
const SHORT_LABEL: Record<Layer, string> = { plan: "Plan", walk: "Walks", guide: "Food", ours: "Family" };

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="grid auto-cols-fr grid-flow-col rounded-full bg-bg-2 p-1">
      {options.map((o) => (
        <button key={o.id} role="tab" type="button" aria-selected={value === o.id} onClick={() => onChange(o.id)} className={`min-h-9 rounded-full text-sm font-semibold transition-colors ${value === o.id ? "bg-card text-ink shadow-sm" : "text-muted"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A pin as a square tile: its photo when Google has one, else its colour and glyph. */
export function PinTile({ pin, photo, saved, onOpen, line, size = "md" }: { pin: Pin; photo: string | null | undefined; saved: number; onOpen: () => void; line?: string | null; size?: "sm" | "md" }) {
  const text = line === undefined ? pin.area ?? CAT_LABEL[pin.cat] : line;
  return (
    <button type="button" onClick={onOpen} className="group relative block aspect-square w-full overflow-hidden rounded-2xl bg-bg-2 text-left shadow-sm transition-transform active:scale-[0.98]" aria-label={`${pin.name}, ${LAYER_LABEL[pin.layer]}`}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- redirects to Google's photo host
        <img src={photoSrc(photo, size === "sm" ? 300 : 500)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105" />
      ) : (
        <span className="absolute inset-0 grid place-items-center" style={{ background: `color-mix(in srgb, ${LAYER_INK[pin.layer]} 16%, var(--bg-2))`, color: LAYER_INK[pin.layer] }}>
          <CatIcon cat={pin.cat} size={size === "sm" ? 26 : 34} />
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-2 pt-8 pb-2 text-white">
        <span className={`block leading-tight font-semibold ${size === "sm" ? "text-[0.82rem]" : "text-[0.95rem]"} line-clamp-2`}>{pin.name}</span>
        {text ? <span className={`mt-0.5 block truncate ${size === "sm" ? "text-[0.7rem]" : "text-[0.76rem]"} opacity-85`}>{text}</span> : null}
      </span>
      <span className="absolute top-1.5 left-1.5 grid size-6 place-items-center rounded-full border-2 border-white/90 text-white shadow" style={{ background: LAYER_INK[pin.layer] }} aria-hidden="true">
        <CatIcon cat={pin.cat} size={12} />
      </span>
      {saved ? (
        <span className="absolute top-1.5 right-1.5 rounded-full bg-white/95 px-1.5 text-[0.68rem] font-bold text-accent shadow" aria-label={`${saved} saved`}>
          ♥{saved > 1 ? saved : ""}
        </span>
      ) : null}
    </button>
  );
}

/** A pin as a row: glyph, name, a line, something trailing. */
export function PinRow({ pin, onOpen, saved, trailing, line }: { pin: Pin; onOpen: () => void; saved: number; trailing?: React.ReactNode; line?: string | null }) {
  return (
    <button type="button" className="flex w-full items-center gap-3 text-left" onClick={onOpen}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 bg-card" style={{ borderColor: LAYER_INK[pin.layer], color: LAYER_INK[pin.layer] }}>
        <CatIcon cat={pin.cat} size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">
          {pin.name}
          {saved ? <span className="ml-1.5 text-[0.7rem] font-bold text-accent">♥{saved}</span> : null}
        </span>
        <span className="block truncate text-xs text-muted">{line === undefined ? [CAT_LABEL[pin.cat], pin.line].filter(Boolean).join(" · ") : line}</span>
      </span>
      {trailing ? <span className="shrink-0 text-xs text-muted">{trailing}</span> : null}
    </button>
  );
}

export function fmtKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
