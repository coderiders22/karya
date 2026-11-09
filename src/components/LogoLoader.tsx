/**
 * Ruvano's loading indicator: the logo, animated on a loop.
 * The four cards land one at a time and make a tick, the teal one last, then they lift away and
 * it starts again: Plan, Track, Build, Deliver, over and over.
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
        <g className="fill-white dark:fill-slate-900">
          <rect x="4.7" y="12.2" width="5.6" height="5.6" rx="1.6" className="ll-c1" />
          <rect x="10.7" y="18.2" width="5.6" height="5.6" rx="1.6" className="ll-c2" />
          <rect x="16.7" y="12.2" width="5.6" height="5.6" rx="1.6" className="ll-c3" />
        </g>
        <rect x="22.7" y="6.2" width="5.6" height="5.6" rx="1.6" fill="#17a383" className="ll-c4" />
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
