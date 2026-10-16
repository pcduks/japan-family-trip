import Link from "next/link";
import type { ReactNode } from "react";
import { personColor, regionColor } from "@/lib/colors";
import type { Finding } from "@/lib/rules";
import type { Severity, Traveller } from "@/lib/types";

export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <main className={`mx-auto grid gap-6 px-4 pt-3 pb-8 ${wide ? "max-w-5xl" : "max-w-2xl"}`}>{children}</main>;
}

export function PageHeader({ eyebrow, title, children, action }: { eyebrow?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <header className="grid gap-1.5">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <div className="flex items-start justify-between gap-3">
        <h1 className="display text-[2.1rem] leading-[1.05]">{title}</h1>
        {action}
      </div>
      {children ? <div className="text-ink-2">{children}</div> : null}
    </header>
  );
}

export function Section({ title, aside, children, id }: { title: ReactNode; aside?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section className="grid gap-3" aria-labelledby={id}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-[1.35rem]">
          {title}
        </h2>
        {aside ? <div className="text-sm text-muted">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function RegionDot({ id, size = 10 }: { id: string; size?: number }) {
  return <span aria-hidden="true" className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: regionColor(id) }} />;
}

export function Avatar({ traveller, travellers, size = 28 }: { traveller: Traveller | string; travellers: Traveller[]; size?: number }) {
  const t = typeof traveller === "string" ? travellers.find((x) => x.id === traveller) : traveller;
  const idx = t ? travellers.findIndex((x) => x.id === t.id) : 0;
  const name = t?.name ?? (typeof traveller === "string" ? traveller : "?");
  return (
    <span
      title={name}
      className="inline-grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: personColor(Math.max(0, idx)), fontSize: size * 0.42 }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

const SEV: Record<Severity, { label: string; cls: string }> = {
  error: { label: "Error", cls: "text-danger" },
  warn: { label: "Warning", cls: "text-warn" },
  info: { label: "Note", cls: "text-info" },
};

export function SeverityIcon({ severity }: { severity: Severity }) {
  const glyph = severity === "error" ? "✕" : severity === "warn" ? "!" : "i";
  return (
    <span aria-label={SEV[severity].label} className={`inline-grid size-5 shrink-0 place-items-center rounded-full border text-[0.7rem] font-bold ${SEV[severity].cls}`} style={{ borderColor: "currentColor" }}>
      {glyph}
    </span>
  );
}

export function FindingList({ findings, compact = false }: { findings: Finding[]; compact?: boolean }) {
  if (!findings.length) return <p className="text-sm text-ok">✓ No rule problems.</p>;
  const order: Severity[] = ["error", "warn", "info"];
  const sorted = [...findings].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
  return (
    <ul className={`grid ${compact ? "gap-1" : "gap-2"}`}>
      {sorted.map((f, i) => (
        <li key={i} className={`flex items-start gap-2 ${compact ? "text-sm" : ""}`}>
          <SeverityIcon severity={f.severity} />
          <span>
            {f.message}
            {f.source ? (
              <>
                {" "}
                <a href={f.source} target="_blank" rel="noreferrer" className="text-muted">
                  source
                </a>
              </>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function RuleBadges({ findings }: { findings: Finding[] }) {
  const n = { error: 0, warn: 0, info: 0 };
  findings.forEach((f) => n[f.severity]++);
  if (!findings.length) return <span className="chip text-ok">✓ nothing to flag</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {n.error ? <span className="chip text-danger">{n.error} error{n.error > 1 ? "s" : ""}</span> : null}
      {n.warn ? <span className="chip text-warn">{n.warn} warning{n.warn > 1 ? "s" : ""}</span> : null}
      {n.info ? <span className="chip text-info">{n.info} note{n.info > 1 ? "s" : ""}</span> : null}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-rule px-4 py-6 text-center text-muted">{children}</p>;
}

export function Back({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm text-muted no-underline">
      ← {children}
    </Link>
  );
}

export function Checked({ checkedAt, verified, updatedBy }: { checkedAt?: string | null; verified?: boolean | null; updatedBy?: string | null }) {
  if (!checkedAt && verified == null) return null;
  const d = checkedAt ? new Date(checkedAt + "T00:00:00Z") : null;
  const when = d ? `${d.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]}` : null;
  return (
    <span className="text-xs text-muted">
      {when ? `checked ${when}` : null}
      {updatedBy ? ` by ${updatedBy}` : null}
      {verified === false ? " · unverified" : verified ? " · verified" : null}
    </span>
  );
}
