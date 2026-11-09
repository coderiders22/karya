"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeSprint, deleteSprint, startSprint, updateSprint } from "@/app/actions/sprints";
import { Modal } from "./CreateIssueDialog";
import { confirmDialog } from "./Dialog";

export function CompleteSprintButton({
  sprintId, name, openCount, futureSprints,
}: { sprintId: string; name: string; openCount: number; futureSprints: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <button className="btn" onClick={() => setOpen(true)}>Complete sprint</button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h2 className="text-base font-semibold">Complete {name}</h2>
          <p className="mt-2 text-sm text-muted">
            {openCount === 0 ? "Every issue in this sprint is done." : `${openCount} issue${openCount === 1 ? " is" : "s are"} not done. Move them to:`}
          </p>
          {openCount > 0 && (
            <select value={target} onChange={(e) => setTarget(e.target.value)} className="select mt-3">
              <option value="">Backlog</option>
              {futureSprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={pending}
              onClick={() => start(async () => { await completeSprint(sprintId, target || null); setOpen(false); router.refresh(); })}
            >
              Complete sprint
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function SprintHeaderActions({
  sprint, canStart, issueCount,
}: { sprint: { id: string; name: string; goal: string; state: string; endDate: string | null }; canStart: boolean; issueCount: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      try { setError(undefined); await fn(); router.refresh(); } catch (e) { setError((e as Error).message); }
    });
  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      {sprint.state === "FUTURE" && (
        <button className="btn" disabled={pending || !canStart || issueCount === 0}
          title={!canStart ? "Another sprint is already active" : issueCount === 0 ? "Add issues first" : ""}
          onClick={() => run(() => startSprint(sprint.id))}>
          Start sprint
        </button>
      )}
      <button className="btn-ghost text-xs" onClick={() => setEditing(true)}>Edit</button>
      {sprint.state === "FUTURE" && (
        <button className="btn-danger text-xs" onClick={async () => (await confirmDialog({ title: `Delete ${sprint.name}?`, message: "Its issues move back to the backlog. Nothing else is lost.", danger: true, confirmLabel: "Delete sprint" })) && run(() => deleteSprint(sprint.id))}>
          Delete
        </button>
      )}
      {editing && (
        <Modal onClose={() => setEditing(false)}>
          <h2 className="mb-4 text-base font-semibold">Edit sprint</h2>
          <form onSubmit={(e) => {
            // Not a form action: this form closes itself when saving ends, and React waits for a form
            // action's own pending state, which left the page showing old data for up to 20 seconds.
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(async () => { await updateSprint(sprint.id, f); setEditing(false); });
          }} className="space-y-3">
            <label className="block"><span className="label">Name</span><input name="name" defaultValue={sprint.name} className="input mt-1" /></label>
            <label className="block"><span className="label">Goal</span><textarea name="goal" defaultValue={sprint.goal} rows={2} className="input mt-1" /></label>
            <label className="block"><span className="label">End date</span><input name="endDate" type="date" defaultValue={sprint.endDate?.slice(0, 10)} className="input mt-1" /></label>
            <div className="flex justify-end gap-2"><button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button><button className="btn-primary">Save</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
