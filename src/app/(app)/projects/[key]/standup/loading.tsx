import { Busy, CardGridSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <Busy label="Loading standup">
      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex items-center gap-6"><div className="space-y-2"><div className="skeleton h-4 w-32" /><div className="skeleton h-3 w-64" /></div><div className="skeleton h-6 w-16" /><div className="skeleton h-6 w-16" /></div>
        <CardGridSkeleton count={4} height={240} cols="md:grid-cols-2 2xl:grid-cols-3" />
      </div>
    </Busy>
  );
}
