"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StatusCategory } from "@prisma/client";
import { addStatus, deleteStatus, moveStatus, updateStatus } from "@/app/actions/projects";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { confirmDialog } from "./Dialog";

const CATS: { value: StatusCategory; label: string }[] = [
  { value: "TODO", label: "To do" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "DONE", label: "Done" },
];

export function StatusEditor({ projectId, statuses }: { projectId: string; statuses: { id: string; name: string; category: StatusCategory; count: number; wipLimit: number | null }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); });
  return (
    <div className="space-y-2">
      {statuses.map((s, i) => (
        <form key={s.id} action={(f) => run(() => updateStatus(s.id, f))} className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-2 sm:flex-nowrap sm:border-0 sm:pb-0 dark:border-slate-800">
          <div className="flex flex-col">
            <button type="button" className="text-xs text-muted disabled:opacity-30" disabled={i === 0 || pending} onClick={() => run(() => moveStatus(s.id, -1))} aria-label="Move left"><ChevronUp size={14} /></button>
            <button type="button" className="text-xs text-muted disabled:opacity-30" disabled={i === statuses.length - 1 || pending} onClick={() => run(() => moveStatus(s.id, 1))} aria-label="Move right"><ChevronDown size={14} /></button>
          </div>
          <input name="name" defaultValue={s.name} className="input min-w-0 flex-1" onBlur={(e) => e.target.form?.requestSubmit()} />
          <select name="category" defaultValue={s.category} className="select !w-32 sm:!w-36" onChange={(e) => e.target.form?.requestSubmit()}>
            {CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <input name="wipLimit" type="number" min={0} defaultValue={s.wipLimit ?? ""} placeholder="No limit" title="Work-in-progress limit"
            className="input !w-24" onBlur={(e) => e.target.form?.requestSubmit()} />
          <span className="w-16 text-right text-xs text-muted">{s.count} issues</span>
          <button
            type="button"
            className="btn-danger"
            disabled={statuses.length <= 1 || pending}
            onClick={async () => (await confirmDialog({ title: `Delete the "${s.name}" column?`, message: `Its ${s.count} issue${s.count === 1 ? "" : "s"} move to "${statuses.find((x) => x.id !== s.id)?.name}".`, danger: true, confirmLabel: "Delete column" })) && run(() => deleteStatus(s.id))}
          >
            <Trash2 size={14} />
          </button>
        </form>
      ))}
      <form action={(f) => run(() => addStatus(projectId, f))} className="flex flex-wrap items-center gap-2 pt-2 sm:flex-nowrap" key={statuses.length}>
        <span className="w-4" />
        <input name="name" placeholder="New column, e.g. QA" className="input min-w-0 flex-1" required />
        <select name="category" defaultValue="IN_PROGRESS" className="select w-36">
          {CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <button className="btn" disabled={pending}>Add</button>
      </form>
    </div>
  );
}
