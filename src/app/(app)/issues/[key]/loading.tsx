import { Busy } from "@/components/Skeletons";

export default function Loading() {
  return (
    <Busy label="Loading issue">
      <div className="flex h-12 items-center gap-2 border-b border-slate-200 px-4 sm:px-6 dark:border-slate-800">
        <div className="skeleton size-4" /><div className="skeleton h-3 w-32" />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="mx-auto w-full max-w-[920px] space-y-4 px-4 py-6 sm:px-6 xl:px-10">
          <div className="skeleton h-7 w-3/4" />
          <div className="space-y-2 pt-2">{[92, 85, 60].map((w, i) => <div key={i} className="skeleton h-3.5" style={{ width: `${w}%` }} />)}</div>
          <div className="skeleton mt-6 h-24 w-full" />
        </div>
        <div className="space-y-3 border-t border-slate-200 p-4 xl:border-l xl:border-t-0 dark:border-slate-800">
          <div className="skeleton h-8 w-full" />
          <div className="card space-y-3 p-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="grid grid-cols-[84px_1fr] gap-2"><div className="skeleton h-3" /><div className="skeleton h-3" /></div>)}</div>
        </div>
      </div>
    </Busy>
  );
}
