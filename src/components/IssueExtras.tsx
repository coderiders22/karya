"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { IssueType, StatusCategory } from "@prisma/client";
import { upload as uploadToBlob } from "@vercel/blob/client";
import { deleteAttachment, registerAttachments, uploadAttachments } from "@/app/actions/attachments";
import { addLink, removeLink } from "@/app/actions/links";
import { toggleWatch } from "@/app/actions/issues";
import { LINK_RELATIONS } from "@/lib/links";
import { Eye, EyeOff, Link2, Paperclip, Plus, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { IssueKey, StatusPill, TypeIcon } from "./IssueBits";

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

type Att = { id: string; filename: string; mimeType: string; size: number; uploader: string; canDelete: boolean };

const MAX_BYTES = 25 * 1024 * 1024;
/** Blob path for an upload: keeps the extension readable, drops anything odd. */
const blobPath = (name: string) => `attachments/${name.normalize("NFKD").replace(/[^\w.-]+/g, "-").slice(-120) || "file"}`;

/**
 * `direct`: files go from the browser straight to Vercel Blob (on Vercel).
 * Otherwise they are sent through the server and saved on its disk.
 */
export function Attachments({ issueId, items, direct = false }: { issueId: string; items: Att[]; direct?: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    const tooBig = list.find((f) => f.size > MAX_BYTES);
    if (tooBig) { setError(`${tooBig.name} is larger than 25 MB`); return; }
    start(async () => {
      let r: { error?: string };
      try {
        if (direct) {
          const uploaded = await Promise.all(list.map(async (f) => {
            const blob = await uploadToBlob(blobPath(f.name), f, {
              access: "public", handleUploadUrl: "/api/attachments/upload", clientPayload: issueId,
              contentType: f.type || undefined, multipart: f.size > 8 * 1024 * 1024,
            });
            return { url: blob.url, filename: f.name };
          }));
          r = await registerAttachments(issueId, uploaded);
        } else {
          const form = new FormData();
          for (const f of list) form.append("files", f);
          r = await uploadAttachments(issueId, form);
        }
      } catch (e) {
        r = { error: e instanceof Error ? e.message : "Upload failed. Try again." };
      }
      setError(r.error);
      if (!r.error) toast.success(`Attached ${files.length} file${files.length === 1 ? "" : "s"}`);
      router.refresh();
    });
  };

  return (
    <section
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
    >
      <div className="mb-2 flex items-center gap-3">
        <h3 className="section-title">Attachments <span className="font-normal text-muted">{items.length || ""}</span></h3>
        <div className="flex-1" />
        <button className="btn-ghost text-sm" onClick={() => input.current?.click()} disabled={pending}>
          <Paperclip size={14} />{pending ? "Uploading…" : "Attach"}
        </button>
        <input ref={input} type="file" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      </div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      {items.length === 0 ? (
        <div className={`rounded-lg border-2 border-dashed p-5 text-center text-sm text-muted ${drag ? "border-brand bg-brand/5" : "border-slate-200 dark:border-slate-800"}`}>
          Drop files here, or use Attach. Up to 25 MB each.
        </div>
      ) : (
        <div className={`grid grid-cols-2 gap-3 rounded-lg sm:grid-cols-3 ${drag ? "ring-2 ring-brand" : ""}`}>
          {items.map((a) => (
            <div key={a.id} className="card group overflow-hidden">
              <a href={`/api/attachments/${a.id}`} target="_blank" rel="noreferrer" className="block">
                {a.mimeType.startsWith("image/") && a.mimeType !== "image/svg+xml" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/attachments/${a.id}`} alt={a.filename} className="h-24 w-full object-cover" />
                ) : (
                  <div className="grid h-24 place-items-center bg-slate-50 text-slate-400 dark:bg-slate-800/60">
                    <span className="flex flex-col items-center gap-1"><FileText size={22} strokeWidth={1.5} /><span className="text-[10px] font-medium uppercase">{a.filename.split(".").pop()?.slice(0, 5) || "file"}</span></span>
                  </div>
                )}
              </a>
              <div className="flex items-center gap-1 p-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium" title={a.filename}>{a.filename}</div>
                  <div className="text-[11px] text-muted">{fmtSize(a.size)} · {a.uploader}</div>
                </div>
                {a.canDelete && (
                  <button className="text-xs text-muted opacity-0 hover:text-red-600 group-hover:opacity-100 touch:opacity-100"
                    onClick={() => confirm(`Delete ${a.filename}?`) && start(async () => { await deleteAttachment(a.id); router.refresh(); })}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

type L = { id: string; relation: string; issue: { key: string; title: string; type: IssueType; status: { name: string; category: StatusCategory } } };

export function LinkedIssues({ issueId, links }: { issueId: string; links: L[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const groups = links.reduce<Record<string, L[]>>((g, l) => ((g[l.relation] ??= []).push(l), g), {});
  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <h3 className="section-title">Linked issues</h3>
        <div className="flex-1" />
        {!adding && <button className="btn-ghost text-sm" onClick={() => setAdding(true)}><Link2 size={14} />Link issue</button>}
      </div>
      {adding && (
        <form
          className="mb-3 flex flex-wrap gap-2"
          action={(f) => start(async () => {
            const r = await addLink(issueId, String(f.get("relation")), String(f.get("key")));
            setError(r.error);
            if (!r.error) { setAdding(false); router.refresh(); }
          })}
        >
          <select name="relation" className="select w-40">
            {Object.keys(LINK_RELATIONS).map((r) => <option key={r}>{r}</option>)}
          </select>
          <input name="key" required placeholder="Issue key, e.g. WR-12" className="input min-w-0 flex-1 font-mono uppercase sm:!w-44 sm:flex-none" autoFocus />
          <button className="btn-primary" disabled={pending}>Link</button>
          <button type="button" className="btn" onClick={() => { setAdding(false); setError(undefined); }}>Cancel</button>
          {error && <p className="w-full text-sm text-red-600">{error}</p>}
        </form>
      )}
      {links.length === 0 && !adding && <p className="text-sm text-muted">No linked issues.</p>}
      <div className="space-y-3">
        {Object.entries(groups).map(([rel, ls]) => (
          <div key={rel}>
            <div className="mb-1 text-xs font-medium text-muted">{rel}</div>
            <ul className="card divide-y divide-slate-100 dark:divide-slate-800">
              {ls.map((l) => (
                <li key={l.id} className="group flex items-center gap-3 px-3 py-2 text-sm">
                  <TypeIcon type={l.issue.type} />
                  <Link href={`/issues/${l.issue.key}`} className={l.issue.status.category === "DONE" ? "line-through" : ""}><IssueKey k={l.issue.key} /></Link>
                  <Link href={`/issues/${l.issue.key}`} className="flex-1 truncate hover:underline">{l.issue.title}</Link>
                  <StatusPill name={l.issue.status.name} category={l.issue.status.category} />
                  <button className="text-xs text-muted opacity-0 hover:text-red-600 group-hover:opacity-100 touch:opacity-100" aria-label="Remove link"
                    onClick={() => start(async () => { await removeLink(l.id); router.refresh(); })}><X size={14} /></button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function WatchButton({ issueId, watching, count }: { issueId: string; watching: boolean; count: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button data-watch className="btn flex-1" disabled={pending}
      onClick={() => start(async () => { await toggleWatch(issueId); router.refresh(); })}>
      {watching ? <EyeOff size={15} /> : <Eye size={15} />}{watching ? "Stop watching" : "Watch"} <span className="text-muted">{count}</span>
    </button>
  );
}

/** Textarea with @mention autocomplete. */
export function MentionTextarea({
  users, value, onChange, ...props
}: { users: { id: string; name: string }[]; value: string; onChange: (v: string) => void } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const matches = query === null ? [] : users.filter((u) => u.name.toLowerCase().startsWith(query.toLowerCase()) || u.name.toLowerCase().includes(` ${query.toLowerCase()}`)).slice(0, 6);

  const detect = (text: string, caret: number) => {
    const m = text.slice(0, caret).match(/(?:^|\s)@([\w.-]{0,20})$/);
    setQuery(m ? m[1] : null);
    setActive(0);
  };
  const pick = (name: string) => {
    const el = ref.current!;
    const caret = el.selectionStart;
    const before = value.slice(0, caret).replace(/@([\w.-]{0,20})$/, `@${name} `);
    const next = before + value.slice(caret);
    onChange(next);
    setQuery(null);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(before.length, before.length); });
  };

  return (
    <div className="relative">
      <textarea
        ref={ref}
        {...props}
        value={value}
        onChange={(e) => { onChange(e.target.value); detect(e.target.value, e.target.selectionStart); }}
        onKeyDown={(e) => {
          if (matches.length) {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % matches.length); return; }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + matches.length) % matches.length); return; }
            if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(matches[active].name); return; }
            if (e.key === "Escape") { setQuery(null); return; }
          }
          props.onKeyDown?.(e);
        }}
      />
      {matches.length > 0 && (
        <ul className="card absolute left-2 top-full z-20 mt-1 w-56 overflow-hidden py-1">
          {matches.map((u, i) => (
            <li key={u.id}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); pick(u.name); }}
                className={`w-full px-3 py-1.5 text-left text-sm ${i === active ? "bg-brand/10" : ""}`}>
                {u.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
