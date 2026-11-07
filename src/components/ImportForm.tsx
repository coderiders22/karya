"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { importFromJira } from "@/app/actions/import";
import { LogoLoader } from "./LogoLoader";

/** `maxBytes`: set on hosts that cap request size (Vercel: about 4.5 MB), so a big file fails here, clearly, instead of mid-upload. */
export function ImportForm({ projects, maxBytes }: { projects: { id: string; key: string; name: string }[]; maxBytes?: number }) {
  const [state, action, pending] = useActionState(importFromJira, undefined);
  const [target, setTarget] = useState("new");
  const [tooBig, setTooBig] = useState<string>();
  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="label">Jira CSV file</span>
        <input
          name="file" type="file" accept=".csv,text/csv" required className="input mt-1"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setTooBig(maxBytes && f && f.size > maxBytes
              ? `This file is ${(f.size / 1024 / 1024).toFixed(1)} MB; the limit here is ${(maxBytes / 1024 / 1024).toFixed(0)} MB. In Jira, export one project or a date range at a time.`
              : undefined);
          }}
        />
      </label>
      <label className="block">
        <span className="label">Import into</span>
        <select name="target" value={target} onChange={(e) => setTarget(e.target.value)} className="select mt-1">
          <option value="new">A new project</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.key})</option>)}
        </select>
      </label>
      {target === "new" && (
        <div className="grid grid-cols-[1fr_140px] gap-3">
          <label><span className="label">Project name</span><input name="name" className="input mt-1" placeholder="Mobile App" /></label>
          <label><span className="label">Key</span><input name="key" className="input mt-1 font-mono uppercase" placeholder="MOB" maxLength={10} /></label>
        </div>
      )}
      {tooBig && <p className="text-sm text-red-600">{tooBig}</p>}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.result && (
        <div className="space-y-1 rounded-md bg-green-50 p-3 text-sm dark:bg-green-950">
          <p className="font-medium text-green-800 dark:text-green-200">
            Imported {state.result.created} issues.{" "}
            <Link href={`/projects/${state.result.projectKey}/board`} className="underline">Open the project →</Link>
          </p>
          {state.result.statusesAdded.length > 0 && <p>Added columns: {state.result.statusesAdded.join(", ")}</p>}
          {state.result.sprintsAdded > 0 && <p>Created {state.result.sprintsAdded} sprints.</p>}
          {state.result.unmatchedPeople.length > 0 && (
            <p className="text-amber-700 dark:text-amber-300">
              No account for: {state.result.unmatchedPeople.slice(0, 8).join(", ")}{state.result.unmatchedPeople.length > 8 && "…"}. Those issues are unassigned. Invite these people and reassign.
            </p>
          )}
          {state.result.warnings.map((w) => <p key={w} className="text-amber-700 dark:text-amber-300">{w}</p>)}
        </div>
      )}
      {pending && (
        <div className="flex items-center gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
          <LogoLoader size={28} label="Importing" />
          <div className="text-[13px]"><div className="font-medium">Importing your Jira issues…</div><div className="text-xs text-muted">Large files can take a minute. Keep this tab open.</div></div>
        </div>
      )}
      <button className="btn-primary" disabled={pending || !!tooBig}>{pending ? "Importing…" : "Import"}</button>
    </form>
  );
}
