import { Busy, ChartCardSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <Busy label="Loading insights">
      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="card space-y-3 p-4"><div className="skeleton h-3 w-24" /><div className="skeleton h-7 w-16" /></div>)}
        </div>
        <div className="grid gap-6 xl:grid-cols-2 3xl:grid-cols-3">{[0, 1, 2, 3].map((i) => <ChartCardSkeleton key={i} />)}</div>
      </div>
    </Busy>
  );
}
