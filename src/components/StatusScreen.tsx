/** Shared layout for 404 / error states: a small board illustration, message, actions. */
export function StatusScreen({ code, title, children, actions, tone = "neutral" }: {
  code: string; title: string; children: React.ReactNode; actions: React.ReactNode; tone?: "neutral" | "error";
}) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-6 py-16">
      <div className="flex max-w-md animate-enter flex-col items-center text-center">
        <EmptySlot tone={tone} />
        <p className="mt-8 font-mono text-xs font-medium tracking-wide text-slate-400">{code}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
        <div className="mt-2 text-[14px] leading-relaxed text-muted">{children}</div>
        <div className="mt-7 flex flex-wrap justify-center gap-2">{actions}</div>
      </div>
    </div>
  );
}

/** A board column with one dashed, empty slot where the card should be. */
function EmptySlot({ tone }: { tone: "neutral" | "error" }) {
  return (
    <svg width="168" height="112" viewBox="0 0 168 112" aria-hidden className="text-slate-300 dark:text-slate-700">
      {[0, 1, 2].map((c) => (
        <g key={c} transform={`translate(${c * 56} 0)`}>
          <rect x="2" y="2" width="52" height="108" rx="8" className="fill-slate-100 dark:fill-slate-900" />
          <rect x="10" y="12" width="20" height="4" rx="2" className="fill-slate-300 dark:fill-slate-700" />
        </g>
      ))}
      <rect x="10" y="26" width="36" height="24" rx="5" className="fill-white stroke-slate-200 dark:fill-slate-800 dark:stroke-slate-700" />
      <rect x="10" y="56" width="36" height="24" rx="5" className="fill-white stroke-slate-200 dark:fill-slate-800 dark:stroke-slate-700" />
      <rect x="122" y="26" width="36" height="24" rx="5" className="fill-white stroke-slate-200 dark:fill-slate-800 dark:stroke-slate-700" />
      <rect x="66" y="26" width="36" height="24" rx="5" fill="none" strokeWidth="1.5" strokeDasharray="4 3"
        className={tone === "error" ? "stroke-rose-400" : "stroke-brand-500"}>
        <animate attributeName="stroke-dashoffset" from="0" to="14" dur="1.2s" repeatCount="indefinite" />
      </rect>
      <text x="84" y="42" textAnchor="middle" fontSize="13" fontWeight="600" className={tone === "error" ? "fill-rose-400" : "fill-brand-500"}>{tone === "error" ? "!" : "?"}</text>
    </svg>
  );
}
