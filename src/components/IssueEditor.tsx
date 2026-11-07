"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addComment, deleteComment, deleteIssue, updateIssueField } from "@/app/actions/issues";
import { MentionTextarea } from "./IssueExtras";
import { Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "./Dialog";

type Field = Parameters<typeof updateIssueField>[1];

function useSave(issueId: string) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const save = (field: Field, value: string) =>
    start(async () => {
      await updateIssueField(issueId, field, value);
      router.refresh();
    });
  return { save, pending };
}

export function EditableTitle({ issueId, title }: { issueId: string; title: string }) {
  const { save } = useSave(issueId);
  const [value, setValue] = useState(title);
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => value.trim() && value !== title ? save("title", value) : setValue(title)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") { setValue(title); (e.target as HTMLInputElement).blur(); }
      }}
      className="-mx-1.5 w-full rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[22px] font-semibold tracking-tight outline-none hover:border-slate-300 focus:border-brand dark:hover:border-slate-700"
    />
  );
}

export function DescriptionEditor({ issueId, description, users, children }: { issueId: string; description: string; users: { id: string; name: string }[]; children: React.ReactNode }) {
  const { save, pending } = useSave(issueId);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    const onEdit = () => { setValue(description); setEditing(true); };
    window.addEventListener("trackr:edit-description", onEdit);
    return () => window.removeEventListener("trackr:edit-description", onEdit);
  }, [description]);
  const [value, setValue] = useState(description);
  if (!editing) {
    return (
      <div onClick={() => { setValue(description); setEditing(true); }} className="-mx-2 min-h-16 cursor-text rounded-md p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
        {description ? children : <p className="text-[13.5px] text-slate-400">Add a description… <span className="kbd ml-1">E</span></p>}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <MentionTextarea
        users={users}
        autoFocus
        value={value}
        onChange={setValue}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { save("description", value); setEditing(false); }
          if (e.key === "Escape") setEditing(false);
        }}
        rows={Math.max(6, value.split("\n").length + 1)}
        className="input font-mono text-[13px]"
        placeholder="Markdown supported: **bold**, - lists, `code`, [links](https://…), - [ ] checklists"
      />
      <div className="flex items-center gap-2">
        <button className="btn-primary" disabled={pending} onClick={() => { save("description", value); setEditing(false); }}>Save</button>
        <button className="btn" onClick={() => setEditing(false)}>Cancel</button>
        <span className="text-xs text-muted">⌘↵ to save</span>
      </div>
    </div>
  );
}

export function FieldSelect({
  issueId, field, value, options,
}: { issueId: string; field: Field; value: string; options: { value: string; label: string }[] }) {
  const { save, pending } = useSave(issueId);
  return (
    <select value={value} disabled={pending} onChange={(e) => save(field, e.target.value)} className="prop-field" data-field={field}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function FieldInput({
  issueId, field, value, type = "text", placeholder,
}: { issueId: string; field: Field; value: string; type?: string; placeholder?: string }) {
  const { save } = useSave(issueId);
  const [v, setV] = useState(value);
  return (
    <input
      type={type}
      value={v}
      placeholder={placeholder}
      onChange={(e) => { setV(e.target.value); if (type === "date") save(field, e.target.value); }}
      onBlur={() => type !== "date" && v !== value && save(field, v)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="prop-field cursor-text"
    />
  );
}

export function CommentBox({ issueId, users }: { issueId: string; users: { id: string; name: string }[] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const submit = () =>
    body.trim() &&
    start(async () => {
      await addComment(issueId, body);
      setBody("");
      router.refresh();
    });
  return (
    <div className="space-y-2">
      <MentionTextarea
        users={users}
        value={body}
        onChange={setBody}
        onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && submit()}
        rows={3}
        className="input"
        placeholder="Add a comment… Type @ to mention someone. Markdown supported, ⌘↵ to send."
      />
      {body.trim() && <button className="btn-primary" disabled={pending} onClick={submit}>Comment</button>}
    </div>
  );
}

export function DeleteCommentButton({ commentId }: { commentId: string }) {
  const router = useRouter();
  const [, start] = useTransition();
  return (
    <button className="text-xs text-muted hover:text-red-600" onClick={async () => (await confirmDialog({ title: "Delete this comment?", message: "This can't be undone.", danger: true })) && start(async () => { await deleteComment(commentId); router.refresh(); })}>
      Delete
    </button>
  );
}

export function DeleteIssueButton({ issueId, issueKey, projectKey }: { issueId: string; issueKey: string; projectKey: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="btn-danger"
      disabled={pending}
      onClick={async () => (await confirmDialog({ title: `Delete ${issueKey}?`, message: "Its comments, attachments and history are deleted too. This can't be undone.", danger: true, confirmLabel: "Delete issue" })) && start(async () => { await deleteIssue(issueId); router.push(`/projects/${projectKey}/board`); })}
    >
      <Trash2 size={14} />Delete issue
    </button>
  );
}

export function CopyLink({ issueKey }: { issueKey: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button className="btn-icon" title="Copy link" aria-label={`Copy link to ${issueKey}`}
      onClick={() => { navigator.clipboard.writeText(location.href); setCopied(!copied); toast.success(`Link to ${issueKey} copied`); }}>
      <Link2 size={15} />
    </button>
  );
}

/** Issue-page shortcuts: M assign to me, E edit description, W watch. */
export function IssueHotkeys({ issueId, meId }: { issueId: string; meId: string }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input,textarea,select,[contenteditable=true]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "m") { e.preventDefault(); await updateIssueField(issueId, "assigneeId", meId); toast.success("Assigned to you"); router.refresh(); }
      if (k === "e") { e.preventDefault(); window.dispatchEvent(new Event("trackr:edit-description")); }
      if (k === "w") { e.preventDefault(); (document.querySelector("[data-watch]") as HTMLButtonElement | null)?.click(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [issueId, meId, router]);
  return null;
}
