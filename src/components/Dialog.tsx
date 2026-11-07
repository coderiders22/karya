"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

/**
 * Karya's own confirm / prompt dialogs, replacing the browser's `confirm()` and `prompt()`,
 * which look like a different app, can't be styled, and block the whole tab.
 *
 *   if (!(await confirmDialog({ title: "Delete AS-4?", danger: true }))) return;
 *   const label = await promptDialog({ title: "Add label" });
 *
 * <DialogHost /> is mounted once in the root layout.
 */

type Base = { title: string; message?: React.ReactNode; confirmLabel?: string; cancelLabel?: string; danger?: boolean };
type ConfirmOpts = Base;
type PromptOpts = Base & { label?: string; placeholder?: string; defaultValue?: string; /** confirm stays disabled until the input equals this */ mustMatch?: string };

type Request = { id: number } & (
  | { kind: "confirm"; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { kind: "prompt"; opts: PromptOpts; resolve: (v: string | null) => void });

let seq = 0;
let current: Request | null = null;
const listeners = new Set<() => void>();
const set = (r: Request | null) => { current = r; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

function settle(value: boolean | string | null) {
  const r = current;
  if (!r) return;
  set(null);
  if (r.kind === "confirm") r.resolve(value === true || typeof value === "string");
  else r.resolve(typeof value === "string" ? value : null);
}

/** True while a Karya dialog is on screen; page-level shortcuts should stand aside. */
export const isDialogOpen = () => current !== null;

export function confirmDialog(opts: ConfirmOpts): Promise<boolean> {
  settle(null); // only one dialog at a time; a new one cancels the old
  return new Promise((resolve) => set({ id: ++seq, kind: "confirm", opts, resolve }));
}

export function promptDialog(opts: PromptOpts): Promise<string | null> {
  settle(null);
  return new Promise((resolve) => set({ id: ++seq, kind: "prompt", opts, resolve }));
}

export function DialogHost() {
  const req = useSyncExternalStore(subscribe, () => current, () => null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !req) return null;
  return createPortal(<DialogView key={req.id} req={req} />, document.body);
}

function DialogView({ req }: { req: Request }) {
  const { opts } = req;
  const prompt = req.kind === "prompt" ? (req.opts as PromptOpts) : null;
  const [value, setValue] = useState(prompt?.defaultValue ?? "");
  const input = useRef<HTMLInputElement>(null);
  const confirmBtn = useRef<HTMLButtonElement>(null);
  const cancelBtn = useRef<HTMLButtonElement>(null);
  const blocked = prompt ? (prompt.mustMatch ? value.trim() !== prompt.mustMatch : !value.trim()) : false;

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    // Destructive confirms start on Cancel, so a stray Enter can't delete anything.
    (prompt ? input.current : opts.danger ? cancelBtn.current : confirmBtn.current)?.focus();
    // Capture phase, and stop the event there: while the dialog is open, Esc and other keys must not
    // also reach page shortcuts (closing the side panel, J/K, C for new issue...). Typing, Tab and
    // Enter-to-submit still work because their default actions are untouched.
    const onKey = (e: KeyboardEvent) => {
      e.stopImmediatePropagation();
      if (e.key === "Escape") { e.preventDefault(); settle(null); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => { window.removeEventListener("keydown", onKey, true); prevFocus?.focus?.(); };
  }, [opts.danger, prompt]);

  const submit = () => { if (!blocked) settle(prompt ? value.trim() : true); };

  return (
    <div className="fixed inset-0 z-[90] flex animate-fade items-start justify-center bg-slate-950/45 p-4 pt-[18vh] backdrop-blur-[3px]" onMouseDown={() => settle(null)}>
      <form
        role="alertdialog" aria-modal="true" aria-labelledby="karya-dialog-title"
        className="card w-full max-w-[26rem] animate-pop overflow-hidden !shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); submit(); }}
      >
        <div className="flex gap-3.5 p-5">
          {opts.danger && (
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400">
              <AlertTriangle size={17} strokeWidth={2} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 id="karya-dialog-title" className="text-[15px] font-semibold leading-6 text-slate-900 dark:text-slate-100">{opts.title}</h2>
            {opts.message && <div className="mt-1 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-400">{opts.message}</div>}
            {prompt && (
              <label className="mt-3 block">
                {prompt.label && <span className="label">{prompt.label}</span>}
                <input
                  ref={input} value={value} onChange={(e) => setValue(e.target.value)}
                  placeholder={prompt.placeholder} className="input mt-1" autoComplete="off" spellCheck={false}
                />
              </label>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/60">
          <button ref={cancelBtn} type="button" className="btn" onClick={() => settle(null)}>{opts.cancelLabel ?? "Cancel"}</button>
          <button
            ref={confirmBtn} type="submit" disabled={blocked}
            className={opts.danger
              ? "inline-flex h-8 cursor-pointer select-none items-center justify-center rounded-md bg-red-600 px-3 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-red-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              : "btn-primary"}
          >
            {opts.confirmLabel ?? (opts.danger ? "Delete" : "OK")}
          </button>
        </div>
      </form>
    </div>
  );
}
