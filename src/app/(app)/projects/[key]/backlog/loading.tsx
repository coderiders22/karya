import { Busy, RowsSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <Busy label="Loading backlog">
      <div className="max-w-5xl space-y-4 p-4 sm:p-6">
        {[3, 5].map((n, i) => (
          <div key={i} className="space-y-0">
            <div className="card flex items-center gap-3 rounded-b-none border-b-0 px-4 py-3"><div className="skeleton h-4 w-32" /><div className="flex-1" /><div className="skeleton h-8 w-24" /></div>
            <RowsSkeleton rows={n} />
          </div>
        ))}
      </div>
    </Busy>
  );
}
