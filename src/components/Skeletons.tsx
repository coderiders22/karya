/** Loading placeholders shaped like the real pages, so nothing jumps when data arrives. */
const S = ({ className = "", style }: { className?: string; style?: React.CSSProperties }) => <div className={`skeleton ${className}`} style={style} />;

const widths = [62, 48, 71, 55, 66, 43, 58, 51];

export function Busy({ label, children }: { label: string; children: React.ReactNode }) {
  return <div role="status" aria-busy="true" aria-label={label}>{children}<span className="sr-only">{label}</span></div>;
}

export function HeaderSkeleton({ actions = 0 }: { actions?: number }) {
  return (
    <div className="flex items-end gap-3 border-b border-slate-200 px-4 pb-4 pt-5 sm:px-6 dark:border-slate-800">
      <div className="flex-1 space-y-2"><S className="h-5 w-40" /><S className="h-3 w-64" /></div>
      {Array.from({ length: actions }).map((_, i) => <S key={i} className="h-8 w-24" />)}
    </div>
  );
}

export function RowsSkeleton({ rows = 6, chips = true }: { rows?: number; chips?: boolean }) {
  return (
    <div className="card divide-y divide-slate-100 dark:divide-slate-800">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex h-11 items-center gap-3 px-3">
          <S className="size-4 !rounded" />
          <S className="hidden h-3 w-14 sm:block" />
          <S className="h-3.5" style={{ width: `${widths[i % widths.length]}%` }} />
          <div className="flex-1" />
          {chips && <S className="hidden h-5 w-20 !rounded sm:block" />}
          <S className="size-5 !rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex h-9 items-center gap-6 border-b border-slate-200 bg-slate-50/60 px-3 dark:border-slate-800 dark:bg-slate-900">
        {[40, 120, 60, 50, 70].map((w, i) => <S key={i} className="h-2.5" style={{ width: w }} />)}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex h-10 items-center gap-4 border-b border-slate-100 px-3 last:border-0 dark:border-slate-800">
          <S className="size-4 !rounded" /><S className="h-3 w-14" />
          <S className="h-3.5" style={{ width: `${widths[i % widths.length] * 0.6}%` }} />
          <div className="flex-1" /><S className="h-5 w-20 !rounded" /><S className="size-5 !rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function FilterBarSkeleton() {
  return <div className="flex flex-wrap gap-2">{[220, 110, 110, 100, 110].map((w, i) => <S key={i} className="h-8" style={{ width: w }} />)}</div>;
}

export function CardGridSkeleton({ count = 4, height = 150, cols = "sm:grid-cols-2" }: { count?: number; height?: number; cols?: string }) {
  return (
    <div className={`grid gap-4 ${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-3 p-4" style={{ height }}>
          <div className="flex items-center gap-3"><S className="size-8 !rounded-lg" /><div className="flex-1 space-y-1.5"><S className="h-3.5 w-1/2" /><S className="h-2.5 w-1/4" /></div></div>
          <S className="h-3 w-5/6" /><S className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function ChartCardSkeleton() {
  return (
    <div className="card p-4">
      <S className="h-3.5 w-32" /><S className="mt-2 h-2.5 w-48" />
      <div className="mt-5 flex h-40 items-end gap-2">
        {[38, 52, 45, 63, 58, 72, 66, 80, 74, 88].map((h, i) => <S key={i} className="flex-1 !rounded-sm" style={{ height: `${h}%` }} />)}
      </div>
    </div>
  );
}
