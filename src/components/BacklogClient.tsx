"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateIssueField } from "@/app/actions/issues";
import { createSprint } from "@/app/actions/sprints";
import { Plus } from "lucide-react";

export function MoveToSprint({ issueId, current, sprints }: { issueId: string; current: string | null; sprints: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Move to sprint"
      value={current ?? ""}
      disabled={pending}
      onChange={(e) => start(async () => { await updateIssueField(issueId, "sprintId", e.target.value); router.refresh(); })}
      className="rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-muted hover:border-slate-300 dark:hover:border-slate-700"
    >
      <option value="">Backlog</option>
      {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  );
}

export function CreateSprintButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button className="btn" disabled={pending} onClick={() => start(async () => { await createSprint(projectId); router.refresh(); })}>
      <Plus size={14} />New sprint
    </button>
  );
}
