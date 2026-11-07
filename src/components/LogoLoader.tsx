/**
 * Karya's loading indicator: the logo, animated on a loop.
 * The two arms of the K draw in, the teal task card drops into its slot, holds,
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
        <rect x="8" y="7" width="4" height="18" rx="2" className="fill-white dark:fill-slate-900" />
        <path d="M14 15.5 21.5 8" pathLength={1} className="ll-arm-1 stroke-white dark:stroke-slate-900" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M14 16.5 18 20.5" pathLength={1} className="ll-arm-2 stroke-white dark:stroke-slate-900" strokeWidth="4" strokeLinecap="round" fill="none" />
        <rect x="18.2" y="18.7" width="6.6" height="6.6" rx="1.8" fill="#17a383" strokeWidth="1.6" className="ll-card stroke-slate-900 dark:stroke-slate-100" />
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
