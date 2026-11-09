/**
 * Ruvano: Ru for rhythm, Va for value, No for what's next.
 * The mark is an R whose leg sets a task card down: work moving forward, step by step.
 */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect width="32" height="32" rx="8" className="fill-slate-900 dark:fill-slate-100" />
      <rect x="7.5" y="7" width="4" height="18" rx="2" className="fill-white dark:fill-slate-900" />
      <path d="M9.5 9h6a3.5 3.5 0 0 1 0 7h-4M13.5 16.5 16 23" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" className="stroke-white dark:stroke-slate-900" />
      <rect x="19" y="19" width="6" height="6" rx="1.7" fill="#17a383" />
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
