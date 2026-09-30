import Link from "next/link";
import type { ReactNode } from "react";
import { personInk } from "@/lib/colors";
import { EkiStamp, type Motif } from "./EkiStamp";

/** Page title block: small mono line, big serif title, optional handwritten aside. */
export function PageHeader({ eyebrow, title, hand, children }: { eyebrow?: ReactNode; title: ReactNode; hand?: ReactNode; children?: ReactNode }) {
  return (
    <header className="grid gap-2 pt-2">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 className="text-[2.6rem] leading-[1.02] sm:text-5xl">{title}</h1>
      {hand ? <p className="hand -mt-1 origin-left -rotate-1 text-xl">{hand}</p> : null}
      {children ? <div className="text-[1.02rem] text-ink-2">{children}</div> : null}
    </header>
  );
}

export function Section({ title, aside, children, id }: { title: ReactNode; aside?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="grid gap-3" aria-labelledby={id}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-[1.75rem]">
          {title}
        </h2>
        {aside ? <div className="text-sm text-muted">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** Hub card: a small stamp, a title and one line of state. */
export function StampCard({
  href,
  motif,
  ink,
  title,
  status,
  wide = false,
}: {
  href: string;
  motif: Motif;
  ink: string;
  title: string;
  status: ReactNode;
  wide?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`card group flex gap-3 p-4 no-underline transition-transform hover:-translate-y-0.5 ${wide ? "col-span-2 items-center" : "flex-col"}`}
    >
      <EkiStamp motif={motif} ink={ink} size={wide ? 64 : 56} rotate={-8} seed={title.length} label="" />
      <span className="grid min-w-0 gap-0.5">
        <span className="font-display text-[1.5rem] leading-tight">{title}</span>
        <span className="text-sm text-muted">{status}</span>
      </span>
      {wide ? (
        <span aria-hidden="true" className="ml-auto text-xl text-muted transition-transform group-hover:translate-x-0.5">
          →
        </span>
      ) : null}
    </Link>
  );
}

export function Avatar({ name, index, size = 36, dim = false }: { name: string; index: number; size?: number; dim?: boolean }) {
  const ink = personInk(index);
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-display leading-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        color: dim ? "var(--ink-2)" : "var(--paper)",
        background: dim ? "transparent" : ink,
        border: dim ? `1.5px solid color-mix(in srgb, ${ink} 55%, var(--rule))` : `1.5px solid ${ink}`,
      }}
      aria-hidden="true"
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0];
}

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "ok" | "warn" | "accent" }) {
  const color = { muted: "var(--muted)", ok: "var(--pine)", warn: "var(--amber)", accent: "var(--vermilion)" }[tone];
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold" style={{ color, borderColor: `color-mix(in srgb, ${color} 45%, transparent)` }}>
      {children}
    </span>
  );
}
