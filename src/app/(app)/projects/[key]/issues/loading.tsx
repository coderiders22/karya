import { Busy, FilterBarSkeleton, TableSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return <Busy label="Loading issues"><div className="space-y-4 p-4 sm:p-6"><FilterBarSkeleton /><TableSkeleton /></div></Busy>;
}
