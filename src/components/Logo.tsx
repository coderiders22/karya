/**
 * Ruvano: Ru for rhythm, Va for value, No for what's next.
 * The mark is four task cards, one each for Plan, Track, Build and Deliver. Together they make a
 * tick, and the last card is teal: work moving forward, step by step, until it's done.
 */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect width="32" height="32" rx="8" className="fill-slate-900 dark:fill-slate-100" />
      <g className="fill-white dark:fill-slate-900">
        <rect x="4.7" y="12.2" width="5.6" height="5.6" rx="1.6" />
        <rect x="10.7" y="18.2" width="5.6" height="5.6" rx="1.6" />
        <rect x="16.7" y="12.2" width="5.6" height="5.6" rx="1.6" />
      </g>
      <rect x="22.7" y="6.2" width="5.6" height="5.6" rx="1.6" fill="#17a383" />
    </svg>
  );
}

export function Logo({ className = "", size = 22 }: { className?: string; size?: number }) {
  return (
    <span className={`flex items-center gap-2 text-[15px] font-semibold tracking-tight ${className}`}>
      <LogoMark size={size} />
      Ruvano
    </span>
  );
}
