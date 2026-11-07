import { Busy } from "@/components/Skeletons";

export default function Loading() {
  return (
    <Busy label="Loading roadmap">
      <div className="space-y-4 p-4 sm:p-6">
        <div className="skeleton h-3 w-80" />
        <div className="card">
          {[60, 35, 50].map((w, i) => (
            <div key={i} className="grid grid-cols-[200px_1fr] items-center border-b border-slate-100 py-4 last:border-0 sm:grid-cols-[280px_1fr] dark:border-slate-800">
              <div className="space-y-1.5 px-4"><div className="skeleton h-3.5 w-40" /><div className="skeleton h-2.5 w-20" /></div>
              <div className="px-2"><div className="skeleton h-7" style={{ width: `${w}%`, marginLeft: `${i * 12}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </Busy>
  );
}
