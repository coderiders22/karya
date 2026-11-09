import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, Check, Coffee, Gauge, GitPullRequest, GraduationCap, Hourglass, Keyboard, ArrowLeftRight, Minus, TextCursorInput } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { HeroSwitch } from "@/components/HeroSwitch";

const FEATURES = [
  { icon: GitPullRequest, title: "GitHub moves the work", body: "New GitHub issues become cards. Open a pull request that mentions WR-12 and the card moves to review. Merge it and it's done. Commits and branches show up on the issue." },
  { icon: Coffee, title: "Standup, already written", body: "Each person's finished, in-progress, blocked and next work, pulled from the tracker. Run it with a timer, one person at a time." },
  { icon: Gauge, title: "Sprint forecast", body: "Compares time used with work done and tells you mid-sprint how much won't land, while there's still time to cut scope." },
  { icon: Hourglass, title: "Stuck work surfaces", body: "Cards show how long they've sat in a column. Anything past your threshold, blocked or over a WIP limit is flagged on the board and your home page." },
  { icon: TextCursorInput, title: "Write it in one line", body: "Type “Checkout fails on Safari bug @sam !high #payments due:fri 3pts” and the fields fill themselves in." },
  { icon: Keyboard, title: "Keyboard first", body: "⌘K to jump anywhere, C to create, M to assign to yourself, G then B for the board. Press ? to see them all." },
];

const COMPARE: [string, boolean | string, boolean | string][] = [
  ["Cost", "Free, unlimited users", "Per-seat subscription"],
  ["Where your data lives", "Hosted here, or your own server", "Vendor cloud"],
  ["Pull request → status automation", true, "Usually an add-on"],
  ["Auto-written standup", true, false],
  ["Mid-sprint forecast", true, false],
  ["Time-in-status and stuck work flags", true, "Partly, on higher tiers"],
  ["Import from / export to Jira", true, "—"],
];

const MODES: { icon: typeof BriefcaseBusiness; title: string; items: string[]; link?: { href: string; label: string } }[] = [
  { icon: BriefcaseBusiness, title: "Teams at work", items: ["Boards, sprints and forecasts", "GitHub moves issues on its own", "Roles for everyone from viewer to admin", "Move to or from Jira any time"] },
  { icon: GraduationCap, title: "Student teams", items: ["Major project, minor project and hackathon templates", "A live countdown to every deadline", "Teammates join with one link, even from other colleges", "See who's doing what before the viva"], link: { href: "/?for=students", label: "See it for students" } },
];

export default async function Landing({ searchParams }: { searchParams: Promise<{ for?: string }> }) {
  if (await getCurrentUser()) redirect("/your-work");
  const cta = { href: "/signup", label: "Create a free account" };
  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="dark relative bg-ink text-white [html.dark_&]:bg-[#0c0c0b]">
      <header className="relative border-b border-white/[0.06]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1 text-[13px]">
            <a href="#modes" className="btn-ghost hidden sm:inline-flex">Who it's for</a>
            <a href="#features" className="btn-ghost hidden sm:inline-flex">Features</a>
            <a href="#compare" className="btn-ghost hidden sm:inline-flex">Compare</a>
            <Link href="/login" className="btn-ghost">Log in</Link>
            <Link href="/signup" className="btn-primary">Get started</Link>
          </nav>
        </div>
      </header>

      <HeroSwitch initial={(await searchParams).for === "students" ? "students" : "teams"} />
      </div>

      <section id="modes" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="max-w-xl text-2xl font-semibold tracking-tight">For teams at work, and student teams too</h2>
        <p className="mt-2 max-w-xl text-[14px] text-muted">Pick what fits when you sign up. Your home screen and tools follow.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {MODES.map(({ icon: I, title, items, link }) => (
            <div key={title} className="card p-5">
              <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand ring-1 ring-brand-100 dark:bg-brand-950 dark:ring-brand-900"><I size={18} strokeWidth={1.75} /></span>
              <h3 className="mt-3 text-[15px] font-semibold">{title}</h3>
              <ul className="mt-2 space-y-1.5 text-[13px] text-muted">
                {items.map((x) => <li key={x} className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-brand" />{x}</li>)}
              </ul>
              {link && <Link href={link.href} className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:underline">{link.label}<ArrowRight size={13} /></Link>}
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="border-t border-slate-200 bg-slate-50 py-20 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="max-w-xl text-2xl font-semibold tracking-tight">Less updating the tracker. More shipping.</h2>
          <p className="mt-2 max-w-xl text-[14px] text-muted">Boards, backlogs, sprints, epics, roadmaps and reports are all here. These are the parts you won&apos;t find elsewhere.</p>
          <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3 dark:border-slate-800 dark:bg-slate-800">
            {FEATURES.map(({ icon: I, title, body }) => (
              <div key={title} className="group bg-white p-6 transition-colors duration-200 hover:bg-brand-50/50 dark:bg-slate-950 dark:hover:bg-slate-900">
                <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand ring-1 ring-brand-100 transition-transform duration-300 ease-spring group-hover:-translate-y-0.5 group-hover:scale-105 dark:bg-brand-950 dark:ring-brand-900">
                  <I size={18} strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 text-[14px] font-semibold">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="compare" className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="text-2xl font-semibold tracking-tight">How it compares</h2>
        <p className="mt-2 text-[14px] text-muted">Against a typical hosted tracker plan.</p>
        <div className="mt-8 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[36rem] text-[13px]">
            <thead className="bg-slate-50 text-left dark:bg-slate-900">
              <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:font-medium sm:[&>th]:px-4">
                <th></th><th className="w-40 sm:w-48"><span className="inline-flex items-center gap-2"><Logo /></span></th><th className="w-40 text-muted sm:w-48">Typical hosted tracker</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {COMPARE.map(([row, a, b]) => (
                <tr key={row} className="[&>td]:px-3 [&>td]:py-2.5 sm:[&>td]:px-4">
                  <td className="text-slate-700 dark:text-slate-300">{row}</td>
                  <td><Cell v={a} strong /></td>
                  <td className="text-muted"><Cell v={b} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex items-center gap-2 text-[13px] text-muted">
          <ArrowLeftRight size={14} /> Not locked in: export any project as a Jira-ready CSV whenever you want.
        </div>
      </section>

      <footer className="border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-muted sm:h-14 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0">
          <span>Ruvano: Ru for rhythm, Va for value, No for what&apos;s next. One platform. Every step forward.</span>
          <Link href={cta.href} className="hover:text-slate-900 dark:hover:text-white">{cta.label} →</Link>
        </div>
      </footer>
    </div>
  );
}

function Cell({ v, strong }: { v: boolean | string; strong?: boolean }) {
  if (v === true) return <Check size={16} className="text-brand" />;
  if (v === false) return <Minus size={16} className="text-slate-300 dark:text-slate-600" />;
  return <span className={strong ? "font-medium" : ""}>{v}</span>;
}
