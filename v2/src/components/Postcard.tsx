/** A small winter postcard: Fuji, a low sun and snow, in the app's own colours. Decorative. */
export function Postcard({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 180" className={className} aria-hidden="true" role="img">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--indigo)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" rx="16" fill="url(#sky)" />
      <circle cx="238" cy="70" r="26" fill="var(--accent)" />
      <path d="M0 150 L92 72 L130 96 L160 60 L205 118 L250 92 L320 150 L320 180 L0 180 Z" fill="var(--bg)" opacity="0.92" />
      <path d="M118 86 L160 60 L198 108 L178 104 L166 96 L150 102 L136 94 Z" fill="var(--card)" />
      <path d="M0 150 L92 72 L130 96 L160 60 L205 118 L250 92 L320 150" fill="none" stroke="var(--ink)" strokeOpacity="0.25" strokeWidth="1.5" />
      <g fill="var(--card)" opacity="0.9">
        <circle cx="40" cy="40" r="1.6" />
        <circle cx="72" cy="22" r="1.2" />
        <circle cx="140" cy="30" r="1.4" />
        <circle cx="190" cy="18" r="1.1" />
        <circle cx="285" cy="36" r="1.5" />
        <circle cx="300" cy="90" r="1.2" />
      </g>
    </svg>
  );
}
