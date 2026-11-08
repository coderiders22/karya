"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import type { FormState } from "@/app/actions/auth";
import { Logo } from "./Logo";
import { TypingDemo } from "./TypingDemo";

type Field = { name: string; label: string; type?: string; defaultValue?: string; autoComplete?: string; placeholder?: string; hint?: React.ReactNode };

export function AuthForm({
  action, fields, submit, hidden, after,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  fields: Field[];
  submit: string;
  hidden?: Record<string, string>;
  after?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-4">
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {fields.map((f) => <FieldInput key={f.name} f={f} />)}
      {state?.error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {state.error}
        </p>
      )}
      <button className="btn-primary group !h-10 w-full text-[14px]" disabled={pending}>
        {pending ? <><Loader2 size={15} className="animate-spin" />Checking…</> : <>{submit}<ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /></>}
      </button>
      {after}
    </form>
  );
}

function FieldInput({ f }: { f: Field }) {
  const [show, setShow] = useState(false);
  const isPassword = f.type === "password";
  // Controlled so a failed attempt keeps what was typed (React resets uncontrolled forms after an action).
  const [value, setValue] = useState(f.defaultValue ?? "");
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{f.label}</span>
        {f.hint}
      </span>
      <span className="relative mt-1.5 block">
        <input
          name={f.name}
          type={isPassword && show ? "text" : f.type ?? "text"}
          {...(isPassword ? {} : { value, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value) })}
          autoComplete={f.autoComplete}
          placeholder={f.placeholder}
          required
          className={`input !h-10 ${isPassword ? "pr-10" : ""}`}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </span>
    </label>
  );
}

export function AuthCard({ title, subtitle, children, footer, host }: {
  title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode; host?: string;
}) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Brand side: always ink, explains one real feature instead of decorating. */}
      <aside className="dark relative hidden overflow-hidden border-r border-white/[0.06] bg-[#121211] text-white lg:flex lg:flex-col">
        <div className="relative px-10 pt-9"><a href="/" className="inline-block"><Logo /></a></div>
        <div className="relative flex flex-1 flex-col items-center justify-center px-10">
          <div className="w-full max-w-[420px]">
            <p className="text-[13px] font-medium text-brand-300">One line, every field</p>
            <h2 className="mt-2 text-[22px] font-semibold leading-snug tracking-tight">
              Write issues the way you&apos;d say them out loud.
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-slate-400">
              Karya picks out the person, priority, labels and due date while you type. No forms to click through.
            </p>
            <div className="mt-7"><TypingDemo /></div>
          </div>
        </div>
        <div className="relative flex items-center justify-between px-10 pb-8 text-xs text-slate-500">
          <span>Karya means “work” in Sanskrit.</span>
          <span>Tickets that move themselves.</span>
        </div>
      </aside>

      <section className="flex flex-col bg-white dark:bg-slate-900">
        <div className="flex h-16 items-center px-6 lg:hidden"><a href="/"><Logo /></a></div>
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-[380px] animate-enter">
            <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1.5 text-[14px] text-muted">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 border-t border-slate-200 pt-5 text-[13px] text-muted dark:border-slate-800">{footer}</div>}
          </div>
        </div>
        {host && (
          <div className="px-6 pb-6 text-center text-[11.5px] text-slate-400 lg:text-right">
            Signing in to <span className="font-mono text-slate-500 dark:text-slate-400">{host}</span>
          </div>
        )}
      </section>
    </main>
  );
}
