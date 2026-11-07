"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Search, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteLabel, renameLabel } from "@/app/actions/labels";
import { LabelChip, LabelSwatches } from "./LabelColors";
import { confirmDialog } from "./Dialog";
import { EmptyState } from "./IssueBits";

type Row = { name: string; count: number; open: number };

export function LabelsManager({ labels, isAdmin }: { labels: Row[]; isAdmin: boolean }) {
  const [q, setQ] = useState("");
  const shown = labels.filter((l) => l.name.toLowerCase().includes(q.trim().toLowerCase()));
  if (!labels.length) {
    return (
      <div className="card">
        <EmptyState icon={Tag} title="No labels yet">
          Add one while creating an issue: type <span className="kbd">#</span> and a name in the title.
        </EmptyState>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a label" className="input !w-60 pl-8" />
        </label>
        <span className="text-[13px] text-muted">{labels.length} label{labels.length === 1 ? "" : "s"}</span>
      </div>
      <ul className="card divide-y divide-slate-100 dark:divide-slate-800">
        {shown.map((l) => <LabelRow key={l.name} row={l} isAdmin={isAdmin} />)}
        {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">No label matches “{q}”.</li>}
      </ul>
      {!isAdmin && <p className="text-xs text-muted">Anyone can change colors. Ask an admin to rename or delete a label.</p>}
    </div>
  );
}

function LabelRow({ row, isAdmin }: { row: Row; isAdmin: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.name);
  useEffect(() => setName(row.name), [row.name]);
  const [pending, start] = useTransition();

  const save = () => start(async () => {
    const r = await renameLabel(row.name, name);
    if (r.error) return void toast.error(r.error);
    setEditing(false);
    toast.success(`Renamed to ${name.trim().replace(/[,\s]+/g, "-")}`);
    router.refresh();
  });

  return (
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
      <div className="min-w-0 sm:w-56">
        {editing ? (
          <form onSubmit={(e) => { e.preventDefault(); save(); }} className="flex items-center gap-1.5">
            <input autoFocus onFocus={(e) => e.currentTarget.select()} value={name} onChange={(e) => setName(e.target.value)} disabled={pending}
              onKeyDown={(e) => { if (e.key === "Escape") { setEditing(false); setName(row.name); } }}
              className="input !h-7 !py-0 text-[13px]" aria-label={`New name for ${row.name}`} />
            <button className="btn-primary !h-7 !px-2 text-xs" disabled={pending}>Save</button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <LabelChip name={row.name} className="!text-[12.5px]" />
          </div>
        )}
        <Link href={`/filters?label=${encodeURIComponent(row.name)}&done=1`} className="mt-1 block text-xs text-muted hover:text-slate-900 hover:underline dark:hover:text-white">
          {row.count} issue{row.count === 1 ? "" : "s"}{row.open !== row.count && ` · ${row.open} open`}
        </Link>
      </div>
      <div className="flex-1"><LabelSwatches name={row.name} size="sm" /></div>
      {isAdmin && !editing && (
        <div className="flex gap-1 sm:ml-2">
          <button className="btn-icon" data-tip="Rename" aria-label={`Rename ${row.name}`} onClick={() => setEditing(true)}><Pencil size={14} /></button>
          <button className="btn-icon hover:!text-red-600" data-tip="Delete" aria-label={`Delete ${row.name}`}
            onClick={async () => {
              const ok = await confirmDialog({
                title: `Delete the “${row.name}” label?`,
                message: `It's removed from ${row.count} issue${row.count === 1 ? "" : "s"}. The issues themselves stay.`,
                danger: true, confirmLabel: "Delete label",
              });
              if (ok) start(async () => { await deleteLabel(row.name); toast.success(`Deleted ${row.name}`); router.refresh(); });
            }}>
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </li>
  );
}
