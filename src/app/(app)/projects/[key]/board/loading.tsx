import { Busy } from "@/components/Skeletons";

export default function Loading() {
  return (
    <Busy label="Loading board">
      <div className="flex h-[57px] items-center gap-4 border-b border-slate-200 px-4 sm:px-6 dark:border-slate-800">
        <div className="skeleton h-4 w-32" /><div className="skeleton h-1.5 w-40" /><div className="flex-1" /><div className="skeleton h-8 w-32" />
      </div>
      <div className="flex gap-3 overflow-hidden p-4 pt-3 sm:p-6 sm:pt-4">
        {[3, 2, 1, 2].map((n, c) => (
          <div key={c} className="w-[85vw] max-w-[300px] shrink-0 space-y-1.5 rounded-lg bg-slate-100/80 p-1.5 sm:w-[280px] dark:bg-slate-900/60">
            <div className="flex items-center gap-2 p-2"><div className="skeleton size-2 !rounded-full" /><div className="skeleton h-3.5 w-20" /></div>
            {Array.from({ length: n }).map((_, i) => (
              <div key={i} className="card space-y-2.5 p-3">
                <div className="flex gap-1.5"><div className="skeleton size-4" /><div className="skeleton h-3 w-12" /></div>
                <div className="skeleton h-3.5 w-11/12" /><div className="skeleton h-3.5 w-2/3" />
                <div className="flex justify-between"><div className="skeleton h-3 w-10" /><div className="skeleton size-5 !rounded-full" /></div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Busy>
  );
}
