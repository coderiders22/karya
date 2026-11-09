"use client";

import { startTransition, useActionState, useState } from "react";
import { ArrowRight, BriefcaseBusiness, GraduationCap, Loader2 } from "lucide-react";
import clsx from "clsx";
import { signUp } from "@/app/actions/auth";

const MODES = [
  { id: "PROFESSIONAL", icon: BriefcaseBusiness, title: "A team at work", hint: "Boards, sprints, standups, GitHub, roles" },
  { id: "STUDENT", icon: GraduationCap, title: "I'm a student", hint: "Major and minor projects, hackathons, group work" },
] as const;

/** Sign-up: choosing how you'll use Karya decides which home screen and tools you get. */
export function SignupForm({ join, teamName, student }: { join?: string; teamName?: string; student?: boolean }) {
  const [state, action, pending] = useActionState(signUp, undefined);
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>(join || student ? "STUDENT" : "PROFESSIONAL");
  return (
    <form className="space-y-4" onSubmit={(e) => {
      // Handled here so that a mistake (an email already in use, say) doesn't clear everything typed.
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      startTransition(() => action(form));
    }}>
      {join ? (
        <>
          <input type="hidden" name="mode" value="STUDENT" />
          <input type="hidden" name="join" value={join} />
          {teamName && <p className="rounded-lg border border-brand bg-brand/5 px-3 py-2.5 text-[13px]">You'll join <b>{teamName}</b> as soon as your account is ready.</p>}
        </>
      ) : (
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium text-slate-700 dark:text-slate-300">How will you use Karya?</legend>
          <div className="space-y-1.5">
            {MODES.map(({ id, icon: I, title, hint }) => (
              <label key={id} className={clsx("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                mode === id ? "border-brand bg-brand/5 ring-1 ring-brand" : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600")}>
                <input type="radio" name="mode" value={id} checked={mode === id} onChange={() => setMode(id)} className="sr-only" />
                <span className={clsx("grid size-8 shrink-0 place-items-center rounded-md", mode === id ? "bg-brand text-brand-fg" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")}><I size={16} /></span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-medium">{title}</span>
                  <span className="block truncate text-xs text-muted">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {mode === "PROFESSIONAL" && <Field name="workspace" label="Team or company name" placeholder="Acme Engineering" />}
      <Field name="name" label="Your name" autoComplete="name" />
      <Field name="email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" />
      <Field name="password" label="Password (min 8 characters)" type="password" autoComplete="new-password" />

      {state?.error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">{state.error}</p>
      )}
      <button className="btn-primary group !h-10 w-full text-[14px]" disabled={pending}>
        {pending ? <><Loader2 size={15} className="animate-spin" />Creating…</> : <>Create free account<ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /></>}
      </button>
    </form>
  );
}

function Field({ name, label, type = "text", autoComplete, placeholder }: { name: string; label: string; type?: string; autoComplete?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input name={name} type={type} autoComplete={autoComplete} placeholder={placeholder} required className="input mt-1.5 !h-10" />
    </label>
  );
}
