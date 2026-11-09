"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Mail } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { createLinkForRequest, dismissRequest, requestPasswordReset } from "@/app/actions/passwordRequests";
import { Avatar } from "./IssueBits";

/** The form on /forgot. What it says doesn't reveal whether the email has an account. */
export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  if (state?.sentTo) {
    return (
      <div className="space-y-4">
        <div role="status" className="rounded-lg border border-brand bg-brand/5 px-4 py-3 text-[14px]">
          <p className="font-medium">Request received</p>
          <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-300">
            If {state.sentTo} has a Ruvano account, we&apos;ll send a reset link to it within 24 to 48 hours. Check your spam folder too.
          </p>
        </div>
        <Link href="/login" className="btn !h-10 w-full text-[14px]">Back to log in</Link>
      </div>
    );
  }
  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      startTransition(() => action(form));
    }}>
      <label className="block">
        <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Email</span>
        <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="input mt-1.5 !h-10" />
      </label>
      {state?.error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">{state.error}</p>}
      <button className="btn-primary !h-10 w-full text-[14px]" disabled={pending}>{pending ? <><Loader2 size={15} className="animate-spin" />Sending…</> : "Request a reset link"}</button>
    </form>
  );
}

export type PasswordRequestRow = { id: string; name: string; email: string; account: string; waited: string; hours: number };

function gmailLink(row: PasswordRequestRow, link: string) {
  const body = `Hi ${row.name.split(" ")[0]},\n\nYou asked to reset your Ruvano password. Open this link to choose a new one:\n\n${link}\n\nIt works once and expires in 48 hours. If you didn't ask for this, you can ignore this email.\n\nRuvano`;
  const params = new URLSearchParams({ view: "cm", fs: "1", to: row.email, su: "Reset your Ruvano password", body });
  return `https://mail.google.com/mail/?${params}`;
}

/** One person waiting. Once a link exists it stays here until the owner says it's been sent. */
export function PasswordRequestItem({ row, sent }: { row: PasswordRequestRow; sent?: boolean }) {
  const router = useRouter();
  const [link, setLink] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const late = row.hours >= 48, soon = row.hours >= 24;
  return (
    <li className="p-3 text-[13px]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Avatar name={row.name} size={8} />
        <div className="min-w-0 flex-1 basis-44">
          <div className="truncate font-medium">{row.name}</div>
          <div className="truncate text-xs text-muted">{row.email} · {row.account}</div>
        </div>
        <span className={clsx("chip whitespace-nowrap", sent ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          : late ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
          : soon ? "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>{row.waited}</span>
        {!link && (
          <div className="flex items-center gap-1">
            <button className={sent ? "btn" : "btn-primary"} disabled={pending} onClick={() => start(async () => {
              try { setLink((await createLinkForRequest(row.id)).link); } catch { toast.error("Couldn't create the link. Try again."); }
            })}>{pending ? "Creating…" : sent ? "New link" : "Create link"}</button>
            <button className="btn-ghost" disabled={pending} onClick={() => start(() => dismissRequest(row.id))}>Dismiss</button>
          </div>
        )}
      </div>
      {link && (
        <div className="mt-3 space-y-2 rounded-md bg-slate-50 p-3 dark:bg-slate-800/60">
          <code className="block select-all break-all text-xs">{link}</code>
          <div className="flex flex-wrap items-center gap-2">
            <a className="btn-primary" href={gmailLink(row, link)} target="_blank" rel="noreferrer noopener"><Mail size={14} />Write in Gmail</a>
            <button className="btn" onClick={async () => {
              const ok = await navigator.clipboard.writeText(link).then(() => true, () => false);
              if (!ok) { toast.error("Couldn't copy. Select the link by hand."); return; }
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}>{copied ? <Check size={14} /> : <Copy size={14} />}Copy link</button>
            <button className="btn-ghost" onClick={() => { setLink(undefined); router.refresh(); }}>Done</button>
          </div>
          <p className="text-xs text-muted">Send it to {row.email}. It works once and expires in 48 hours.</p>
        </div>
      )}
    </li>
  );
}
