"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProject, updateProject } from "@/app/actions/projects";
import { PROJECT_COLORS } from "@/lib/constants";
import { promptDialog } from "./Dialog";

export function ProjectDetailsForm({
  project, users, isAdmin,
}: { project: { id: string; name: string; description: string; leadId: string | null; color: string; staleDays: number; gitAutomation: boolean }; users: { id: string; name: string }[]; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  return (
    <form action={(f) => start(async () => { await updateProject(project.id, f); setSaved(true); router.refresh(); })} className="space-y-3">
      <label className="block"><span className="label">Name</span><input name="name" defaultValue={project.name} className="input mt-1" /></label>
      <label className="block"><span className="label">Description</span><textarea name="description" defaultValue={project.description} rows={3} className="input mt-1" /></label>
      <label className="block">
        <span className="label">Project lead</span>
        <select name="leadId" defaultValue={project.leadId ?? ""} className="select mt-1">
          <option value="">None</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="label">Flag work as stuck after</span>
        <span className="mt-1 flex items-center gap-2 text-sm">
          <input name="staleDays" type="number" min={1} max={60} defaultValue={project.staleDays} className="input !w-20" /> days in an in-progress column
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="gitAutomation" defaultChecked={project.gitAutomation} className="mt-0.5" />
        <span>Move issues automatically from GitHub activity <span className="block text-xs text-muted">Opening a pull request moves the issue to review; merging moves it to done.</span></span>
      </label>
      <fieldset>
        <span className="label">Color</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {PROJECT_COLORS.map((c) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="color" value={c} defaultChecked={c === project.color} className="peer sr-only" />
              <span className="block size-7 rounded-md ring-offset-2 peer-checked:ring-2 peer-checked:ring-slate-900 dark:ring-offset-slate-900 dark:peer-checked:ring-white" style={{ background: c }} />
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>Save</button>
        {saved && <span className="text-xs text-green-600">Saved</span>}
        <div className="flex-1" />
        {isAdmin && (
          <button type="button" className="btn-danger"
            onClick={async () => (await promptDialog({ title: `Delete ${project.name}?`, message: <>This permanently deletes the project and <b>all its issues, sprints and comments</b>. Type <b>{project.name}</b> to confirm.</>, mustMatch: project.name, placeholder: project.name, danger: true, confirmLabel: "Delete project" })) !== null && start(() => deleteProject(project.id))}>
            Delete project
          </button>
        )}
      </div>
    </form>
  );
}
