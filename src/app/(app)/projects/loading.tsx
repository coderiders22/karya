import { Busy, CardGridSkeleton, HeaderSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <Busy label="Loading projects">
      <HeaderSkeleton />
      <div className="grid max-w-[1680px] gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_300px]">
        <CardGridSkeleton count={4} cols="sm:grid-cols-2 2xl:grid-cols-3" />
        <div className="card h-72 p-5"><div className="skeleton h-4 w-28" /></div>
      </div>
    </Busy>
  );
}
