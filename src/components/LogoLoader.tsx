/**
 * Ruvano's loading indicator: the logo, animated on a loop.
 * The bowl and leg of the R draw in, the teal task card drops into its slot, holds,
 * then everything lifts away and it starts again: work being set down, over and over.
 *
 * Works on any background (tile follows the theme), honours reduced motion
 * (shows the finished logo with a gentle pulse instead), and announces itself to
 * screen readers.
 */
export function LogoLoader({ size = 40, label = "Loading", className = "" }: { size?: number; label?: string; className?: string }) {
  return (
    <span role="status" aria-label={label} className={`inline-block ${className}`}>
      <svg width={size} height={size} viewBox="0 0 32 32" className="logo-loader block" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-slate-900 dark:fill-slate-100" />
        <rect x="7.5" y="7" width="4" height="18" rx="2" className="fill-white dark:fill-slate-900" />
        <path d="M9.5 9h6a3.5 3.5 0 0 1 0 7h-4" pathLength={1} className="ll-arm-1 stroke-white dark:stroke-slate-900" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M13.5 16.5 16 23" pathLength={1} className="ll-arm-2 stroke-white dark:stroke-slate-900" strokeWidth="4" strokeLinecap="round" fill="none" />
        <rect x="19" y="19" width="6" height="6" rx="1.7" fill="#17a383" className="ll-card" />
      </svg>
    </span>
  );
}

/** Full-area centred loader with an optional line of text underneath. */
export function LoaderBlock({ label = "Loading", hint, size = 44, className = "min-h-[50vh]" }: { label?: string; hint?: string; size?: number; className?: string }) {
  return (
    <div className={`grid place-items-center ${className}`}>
      <div className="flex flex-col items-center gap-3">
        <LogoLoader size={size} label={label} />
        {hint && <p className="text-[13px] text-muted">{hint}</p>}
      </div>
    </div>
  );
}
