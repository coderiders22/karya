"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Map, PlayCircle, Search, X } from "lucide-react";
import type { GuideSection, GuideTopic } from "@/lib/guide";
import { startTour } from "./Tour";

/** **bold** and `code` in guide text. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") ? <b key={i} className="font-semibold text-slate-900 dark:text-white">{p.slice(2, -2)}</b>
        : p.startsWith("`") ? <code key={i} className="rounded bg-slate-100 px-1 py-px font-mono text-[12.5px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">{p.slice(1, -1)}</code>
        : <Fragment key={i}>{p}</Fragment>,
      )}
    </>
  );
}

const haystack = (t: GuideTopic) => [t.title, t.summary, t.result, t.keywords, ...t.steps].join(" ").toLowerCase();

export function GuideClient({ sections, shortcuts }: { sections: GuideSection[]; shortcuts: [string, [string[], string][]][] }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(sections[0]?.id);
  const query = q.trim().toLowerCase();

  const shown = useMemo(() => {
    if (!query) return sections;
    const words = query.split(/\s+/);
    return sections
      .map((s) => ({ ...s, topics: s.topics.filter((t) => words.every((w) => haystack(t).includes(w))) }))
      .filter((s) => s.topics.length);
  }, [sections, query]);

  // Highlight the section being read in the contents list.
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>("[data-guide-section]")];
    const io = new IntersectionObserver((entries) => {
      const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (top) setActive(top.target.id);
    }, { rootMargin: "-10% 0px -70% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [shown]);

  // Deep links like /guide#invite open straight on that topic.
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: "start" }), 50);
  }, []);

  const count = shown.reduce((n, s) => n + s.topics.length, 0);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
      <nav className="hidden lg:block" aria-label="Guide contents">
        <div className="sticky top-6 space-y-px text-[13px]">
          <div className="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted">Contents</div>
          {[...sections, { id: "shortcuts", title: "Keyboard shortcuts" }].map((s) => (
            <a key={s.id} href={`#${s.id}`}
              className={`block rounded-md px-2 py-1.5 transition-colors ${active === s.id ? "bg-slate-100 font-medium text-slate-900 dark:bg-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}>
              {s.title}
            </a>
          ))}
        </div>
      </nav>

      <div className="min-w-0">
        {!query && <Walkthrough />}
        <div className="relative max-w-xl">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the guide: sprint, invite, GitHub…"
            className="input !h-10 !pl-9 !pr-9 text-[14px]" aria-label="Search the guide"
          />
          {q && <button className="btn-icon absolute right-1 top-1/2 !size-8 -translate-y-1/2" onClick={() => setQ("")} aria-label="Clear search"><X size={15} /></button>}
        </div>
        {query && <p className="mt-2 text-[13px] text-muted">{count ? `${count} topic${count === 1 ? "" : "s"} match “${q.trim()}”` : null}</p>}

        {count === 0 && (
          <div className="mt-10 max-w-md text-[14px] text-slate-600 dark:text-slate-400">
            Nothing in the guide matches “{q.trim()}”. Try a shorter word, like <button className="text-brand hover:underline" onClick={() => setQ("sprint")}>sprint</button> or <button className="text-brand hover:underline" onClick={() => setQ("board")}>board</button>.
          </div>
        )}

        {shown.map((s) => (
          <section key={s.id} id={s.id} data-guide-section className="scroll-mt-6 pt-8 first:pt-6">
            <h2 className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-brand">{s.title}</h2>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {s.topics.map((t) => <Topic key={t.id} t={t} />)}
            </div>
          </section>
        ))}

        {!query && (
          <section id="shortcuts" data-guide-section className="scroll-mt-6 pt-10">
            <h2 className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-brand">Keyboard shortcuts</h2>
            <p className="mb-4 text-[14px] text-slate-600 dark:text-slate-400">Press <span className="kbd">?</span> anywhere in Karya to see these.</p>
            <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
              {shortcuts.map(([group, rows]) => (
                <div key={group}>
                  <h3 className="mb-2 text-[13px] font-semibold">{group}</h3>
                  <dl className="space-y-1.5">
                    {rows.map(([keys, label]) => (
                      <div key={label + keys.join()} className="flex items-center justify-between gap-3 text-[13px]">
                        <dt className="text-slate-600 dark:text-slate-400">{label}</dt>
                        <dd className="flex gap-1">{keys.map((k) => <span key={k} className="kbd">{k}</span>)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </section>
        )}
        <div className="h-24" />
      </div>
    </div>
  );
}

/** The full walkthrough: one project set up from scratch, every main feature, with a voice-over. */
function Walkthrough() {
  const [playing, setPlaying] = useState(false);
  return (
    <section className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60" aria-labelledby="walkthrough-title">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex items-center bg-slate-950">
          {playing ? (
            <video controls autoPlay playsInline preload="auto" poster="/guide/videos/walkthrough.jpg" className="block aspect-[16/10] w-full" aria-label="Video: Karya, the full walkthrough">
              <source src="/guide/videos/walkthrough.mp4" type="video/mp4" />
              <track kind="captions" src="/guide/videos/walkthrough.vtt" srcLang="en" label="English" />
            </video>
          ) : (
            <button className="group relative block aspect-[16/10] w-full" onClick={() => setPlaying(true)} aria-label="Play the full walkthrough">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/guide/videos/walkthrough.jpg" alt="" className="size-full object-cover object-top opacity-95 transition-opacity group-hover:opacity-100" />
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid size-16 place-items-center rounded-full bg-brand text-white shadow-xl ring-8 ring-white/20 transition-transform group-hover:scale-105">
                  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg>
                </span>
              </span>
            </button>
          )}
        </div>
        <div className="flex flex-col justify-center p-5 sm:p-6">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-brand">Start here · 3 min, with voice</div>
          <h2 id="walkthrough-title" className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Karya, from first project to daily standup</h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-400">
            Watch a project set up from scratch: issues, quick add, a sprint, the board, comments with @mentions, standup, roadmap, insights, bulk edits, settings and inviting the team.
          </p>
          <ol className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px] text-slate-600 lg:hidden 2xl:grid dark:text-slate-400">
            {["Create a project", "Add issues fast", "Plan a sprint", "Work the board", "Comment & mention", "Standup & insights"].map((x, i) => (
              <li key={x} className="flex items-center gap-1.5"><span className="font-mono text-[11px] text-slate-400">{String(i + 1).padStart(2, "0")}</span>{x}</li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Topic({ t }: { t: GuideTopic }) {
  return (
    <article id={t.id} className="scroll-mt-6 py-7">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-white">{t.title}</h3>
        {t.admin && <span className="rounded border border-slate-200 px-1.5 text-[11px] font-medium text-muted dark:border-slate-700">Admins</span>}
      </div>
      <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">{t.summary}</p>

      <div className={t.video ? "mt-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:items-start" : "mt-4"}>
        <div className="min-w-0">
          <ol className="space-y-2.5">
            {t.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">
                <span className="mt-[3px] grid size-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-semibold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">{i + 1}</span>
                <span className="min-w-0"><Rich text={step} /></span>
              </li>
            ))}
          </ol>
          {t.result && (
            <p className="mt-4 border-l-2 border-brand pl-3 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-400"><Rich text={t.result} /></p>
          )}
          {t.action && (
            <div className="mt-4">
              {t.action.tour ? (
                <button className="btn" onClick={() => startTour(t.action!.tour!)}><Map size={14} />{t.action.label}</button>
              ) : t.action.href ? (
                <Link className="btn" href={t.action.href}>{t.action.label}<ArrowRight size={14} /></Link>
              ) : null}
            </div>
          )}
        </div>
        {t.video && <Video name={t.video} title={t.title} />}
      </div>
    </article>
  );
}

function Video({ name, title }: { name: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const src = `/guide/videos/${name}.webm`;
  const poster = `/guide/videos/${name}.jpg`;
  return (
    <figure className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {playing ? (
        <video src={src} poster={poster} controls autoPlay playsInline className="block aspect-[16/10] w-full bg-black" aria-label={`Video: ${title}`} />
      ) : (
        <button className="group relative block aspect-[16/10] w-full" onClick={() => setPlaying(true)} aria-label={`Play video: ${title}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster} alt="" loading="lazy" className="size-full object-cover object-top" />
          <span className="absolute inset-0 bg-slate-950/0 transition-colors group-hover:bg-slate-950/10" />
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-slate-950/80 py-1 pl-1.5 pr-3 text-[12.5px] font-medium text-white shadow-lg backdrop-blur-sm transition-transform group-hover:scale-[1.03]">
            <PlayCircle size={18} strokeWidth={1.75} />Watch how
          </span>
        </button>
      )}
    </figure>
  );
}
