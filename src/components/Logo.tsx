/**
 * Karya (Sanskrit: "work, task"). The mark is a K whose lower arm sets a task card down:
 * work moving to done.
 */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect width="32" height="32" rx="8" className="fill-slate-900 dark:fill-slate-100" />
      <g className="fill-white stroke-white dark:fill-slate-900 dark:stroke-slate-900">
        <rect x="8" y="7" width="4" height="18" rx="2" stroke="none" />
        <path d="M14 15.5 21.5 8" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M14 16.5 18 20.5" strokeWidth="4" strokeLinecap="round" fill="none" />
      </g>
      <rect x="18.2" y="18.7" width="6.6" height="6.6" rx="1.8" fill="#17a383" strokeWidth="1.6" className="stroke-slate-900 dark:stroke-slate-100" />
    </svg>
  );
}

export function Logo({ className = "", size = 22 }: { className?: string; size?: number }) {
  return (
    <span className={`flex items-center gap-2 text-[15px] font-semibold tracking-tight ${className}`}>
      <LogoMark size={size} />
      Karya
    </span>
  );
}
