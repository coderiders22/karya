import { Busy, HeaderSkeleton, RowsSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return <Busy label="Loading"><HeaderSkeleton /><div className="p-4 sm:p-6"><RowsSkeleton rows={8} /></div></Busy>;
}
