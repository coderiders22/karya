"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Copy, Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { joinProject, leaveProject, removeTeammate, resetTeamLink, startProject } from "@/app/actions/teams";
import { TEMPLATES, templateById } from "@/lib/templates";
import { confirmDialog } from "./Dialog";

export function StartProject({ initial }: { initial?: string }) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(templateById(initial)?.id ?? "major");
  const [due, setDue] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const template = templateById(templateId)!;
  const firstSteps = template.tasks.slice(0, 3);
  return (
    <form className="card space-y-3 p-5" onSubmit={(e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      // Sent as an exact moment, so "11:59 PM" means 11:59 PM where the person is.
      if (due) form.set("dueAt", new Date(due).toISOString());
      start(async () => {
        const r = await startProject(form);
        setError(r.error);
        if (r.key) { router.push(`/projects/${r.key}/${r.solo ? "board" : "team"}`); router.refresh(); }
      });
    }}>
      <h2 className="section-title">Start a project</h2>
      <label className="block">
        <span className="label">What is it?</span>
        <select name="template" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="select mt-1 w-full">
          {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <span className="mt-1 block text-xs text-muted">{template.hint}</span>
      </label>
      <label className="block">
        <span className="label">Name</span>
        <input name="name" required maxLength={80} placeholder={template.placeholder} className="input mt-1" />
      </label>
      <label className="block">
        <span className="label">{template.deadlineLabel} <span className="font-normal">(optional)</span></span>
        <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="input mt-1" />
      </label>
      <div className="rounded-md bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/60">
        <p className="font-medium">{template.columns.map(([name]) => name).join(" → ")}</p>
        {firstSteps.length > 0 ? (
          <ul className="mt-1.5 space-y-1 text-muted">
            {firstSteps.map((task) => <li key={task.title} className="truncate">{task.title}</li>)}
            {template.tasks.length > 3 && <li>and {template.tasks.length - 3} more{due ? ", dated back from your deadline" : ""}</li>}
          </ul>
        ) : <p className="mt-1 text-muted">Starts empty. Press C to add tasks.</p>}
      </div>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Creating…" : "Create board"}</button>
    </form>
  );
}

/** What the team lead shares in the group chat. */
export function TeamLink({ projectId, projectName, link, canReset }: { projectId: string; projectName: string; link: string; canReset: boolean }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const message = `Join our team for ${projectName} on Ruvano: ${link}`;
  return (
    <section className="card p-4">
      <h2 className="section-title">Add teammates</h2>
      <p className="mt-0.5 text-[13px] text-muted">Share this link in your group. Anyone who opens it can join this project, and only this project.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 basis-full select-all truncate rounded-md bg-slate-100 px-3 py-2 text-[13px] sm:basis-64 dark:bg-slate-800">{link}</code>
        <button className="btn" onClick={async () => {
          await navigator.clipboard.writeText(link).catch(() => toast.error("Couldn't copy. Select the link by hand."));
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}>{copied ? <Check size={14} /> : <Copy size={14} />}Copy link</button>
        <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer noopener"><MessageCircle size={14} />WhatsApp</a>
        {canReset && (
          <button className="btn-ghost" disabled={pending} onClick={async () => {
            const ok = await confirmDialog({ title: "Replace this link?", message: "The current link stops working. People already on the team stay on it.", confirmLabel: "Replace" });
            if (ok) start(async () => { await resetTeamLink(projectId); router.refresh(); });
          }}><RefreshCw size={14} />New link</button>
        )}
      </div>
    </section>
  );
}

export function RemoveTeammate({ projectId, userId, name }: { projectId: string; userId: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button className="btn-ghost text-xs" disabled={pending} onClick={async () => {
      const ok = await confirmDialog({ title: `Remove ${name} from the team?`, message: "They lose access to this board. Tasks they finished keep their name, and unfinished tasks become unassigned.", danger: true, confirmLabel: "Remove" });
      if (!ok) return;
      start(async () => {
        const r = await removeTeammate(projectId, userId);
        if (r.error) toast.error(r.error);
        router.refresh();
      });
    }}>Remove</button>
  );
}

export function LeaveProject({ projectId, name }: { projectId: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn-danger" disabled={pending} onClick={async () => {
      const ok = await confirmDialog({ title: `Leave ${name}?`, message: "You lose access to this board. Tasks you finished keep your name, and unfinished tasks become unassigned.", danger: true, confirmLabel: "Leave project" });
      if (!ok) return;
      start(async () => {
        const r = await leaveProject(projectId);
        if (r.error) toast.error(r.error);
      });
    }}>Leave project</button>
  );
}

export function JoinTeamButton({ code }: { code: string }) {
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <button className="btn-primary group !h-10 w-full text-[14px]" disabled={pending} onClick={() => start(async () => {
        const r = await joinProject(code);
        setError(r.error);
      })}>
        {pending ? <><Loader2 size={15} className="animate-spin" />Joining…</> : <>Join the team<ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /></>}
      </button>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
