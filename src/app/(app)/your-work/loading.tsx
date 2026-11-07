import { Busy, HeaderSkeleton, RowsSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <Busy label="Loading your work">
      <HeaderSkeleton actions={2} />
      <div className="grid max-w-[1680px] gap-8 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-7">
          {[2, 3, 3].map((n, i) => <div key={i} className="space-y-2"><div className="skeleton h-3.5 w-32" /><RowsSkeleton rows={n} /></div>)}
        </div>
        <div className="space-y-3">
          <div className="skeleton h-3.5 w-20" />
          <div className="card space-y-3 p-3">{[0, 1, 2].map((i) => <div key={i} className="flex items-center gap-3"><div className="skeleton size-5" /><div className="skeleton h-3 flex-1" /></div>)}</div>
        </div>
      </div>
    </Busy>
  );
}
