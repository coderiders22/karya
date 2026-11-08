"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { createInvite, createResetLink, removeUser, renameWorkspace, revokeInvite, setRole } from "@/app/actions/members";
import { ROLE_LABEL } from "@/lib/permissions";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "./Dialog";

const ROLES: Role[] = ["VIEWER", "MEMBER", "MANAGER", "ADMIN"];

export function InviteForm() {
  const router = useRouter();
  const [link, setLink] = useState<string>();
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const el = e.currentTarget;
          const f = new FormData(el);
          start(async () => {
            const r = await createInvite(f);
            setError(r.error); setLink(r.link); setCopied(false);
            if (r.link) el.reset();
            router.refresh();
          });
        }}
        className="flex flex-wrap gap-2"
      >
        <input name="email" type="email" placeholder="Email (optional, locks invite to it)" className="input min-w-0 flex-1 basis-full sm:basis-64" />
        <select name="role" aria-label="Role" defaultValue="MEMBER" className="select w-32">
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <button className="btn-primary" disabled={pending}>Create invite link</button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {link && (
        <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm dark:bg-green-950">
          <code className="flex-1 truncate">{link}</code>
          <button className="btn" onClick={() => { navigator.clipboard.writeText(link); setCopied(true); }}>{copied ? "Copied!" : "Copy"}</button>
        </div>
      )}
      <p className="text-xs text-muted">Send the link yourself (Slack, WhatsApp, email…). It works once and expires in 7 days.</p>
    </div>
  );
}

export function MemberActions({ userId, role, isSelf }: { userId: string; role: Role; isSelf: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) => start(async () => { try { setError(undefined); await fn(); router.refresh(); } catch (e) { setError((e as Error).message); } });
  if (isSelf) return <span className="text-xs text-muted">{ROLE_LABEL[role]} (you)</span>;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {error && <span className="max-w-xs text-xs text-red-600">{error}</span>}
      <select aria-label="Role" value={role} disabled={pending} onChange={(e) => run(() => setRole(userId, e.target.value as Role))} className="select w-28">
        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
      </select>
      <button className="btn-ghost" disabled={pending} data-tip="Single-use link, valid 24 hours"
        onClick={() => start(async () => {
          try {
            const r = await createResetLink(userId);
            const copied = await navigator.clipboard.writeText(r.link).then(() => true, () => false);
            toast.success(copied ? `Reset link for ${r.name} copied` : `Reset link for ${r.name}`, {
              description: copied ? "Send it to them directly. It works once and expires in 24 hours." : r.link,
              duration: 10000,
            });
          } catch {
            toast.error("Couldn't create a reset link. Please try again.");
          }
        })}>
        <KeyRound size={14} />Reset password
      </button>
      <button className="btn-danger" disabled={pending} onClick={async () => (await confirmDialog({ title: "Remove this person?", message: "They lose access to Karya straight away. Their issues and comments stay.", danger: true, confirmLabel: "Remove" })) && run(() => removeUser(userId))}>Remove</button>
    </div>
  );
}

export function RevokeInvite({ id }: { id: string }) {
  const router = useRouter();
  const [, start] = useTransition();
  return <button className="btn-danger text-xs" onClick={() => start(async () => { await revokeInvite(id); router.refresh(); })}>Revoke</button>;
}

export function WorkspaceName({ name }: { name: string }) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [pending, start] = useTransition();
  return (
    <form className="flex flex-wrap items-end gap-2" action={(f) => start(async () => { await renameWorkspace(f); toast.success("Workspace renamed"); router.refresh(); })}>
      <label className="min-w-0 flex-1 basis-56"><span className="label">Workspace name</span><input name="name" value={value} onChange={(e) => setValue(e.target.value)} required maxLength={80} className="input mt-1" /></label>
      <button className="btn" disabled={pending || !value.trim() || value.trim() === name}>Rename</button>
    </form>
  );
}
