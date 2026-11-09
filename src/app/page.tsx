import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, Check, Coffee, Gauge, GitPullRequest, GraduationCap, Hourglass, ArrowLeftRight, ScanSearch, TextCursorInput } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { HeroSwitch } from "@/components/HeroSwitch";

const FEATURES = [
  { icon: GitPullRequest, title: "GitHub moves the work", body: "New GitHub issues become cards. Open a pull request that mentions WR-12 and the card moves to review. Merge it and it's done. Commits and branches show up on the issue." },
  { icon: Coffee, title: "Standup, already written", body: "Each person's finished, in-progress, blocked and next work, pulled from the tracker. Add notes as people talk, then copy a ready summary for chat or email." },
  { icon: Gauge, title: "Sprint forecast", body: "Compares time used with work done and tells you mid-sprint how much won't land, while there's still time to cut scope." },
  { icon: Hourglass, title: "Stuck work surfaces", body: "Cards show how long they've sat in a column. Anything past your threshold, blocked or over a WIP limit is flagged on the board and your home page." },
  { icon: TextCursorInput, title: "Write it in one line", body: "Type “Checkout fails on Safari bug @sam !high #payments due:fri 3pts” and the fields fill themselves in." },
  { icon: ScanSearch, title: "Reality check", body: "Checks the board against your code: cards marked done with open pull requests, work in progress with no commits, and merged work nobody tracked." },
];

const COMPARE: [string, true | string, string][] = [
  ["Cost", "Free, no user limit", "Per-seat subscription"],
  ["Where your data lives", "Hosted here, or your own server", "Vendor cloud"],
  ["Pull request moves the card", true, "Set up with rules or add-ons"],
  ["Standup written from the tracker", true, "Usually an add-on"],
  ["Board checked against your code", true, "Not usually offered"],
  ["Mid-sprint forecast", true, "Varies by tool and plan"],
  ["Time-in-status and stuck work flags", true, "Varies by tool and plan"],
  ["Student mode: templates, deadlines, join links", true, "Not usually offered"],
  ["Import from and export to Jira", true, "Varies by tool"],
];

const FACTS = [
  ["No limit on users", "Add the whole team, viewers included."],
  ["One-click GitHub", "Pull requests move the cards."],
  ["Two modes", "For teams at work and student teams."],
  ["No lock-in", "Import from and export to Jira."],
];

const FOOTER_LINKS: [string, [string, string][]][] = [
  ["Product", [["Who it's for", "#modes"], ["Features", "#features"], ["Compare", "#compare"]]],
  ["Get started", [["Create a team", "/signup"], ["Start a student project", "/signup?as=student"], ["Log in", "/login"], ["Forgot password", "/forgot"]]],
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
      <header className="dark sticky top-0 z-40 border-b border-white/[0.06] bg-ink/95 text-white backdrop-blur [html.dark_&]:bg-[#0c0c0b]/95">
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

      <div className="dark relative flow-root bg-ink text-white [html.dark_&]:bg-[#0c0c0b]">
        <HeroSwitch initial={(await searchParams).for === "students" ? "students" : "teams"} />
      </div>

      <section aria-label="At a glance" className="mx-auto max-w-5xl px-4 pb-4 pt-28 sm:px-6 sm:pt-48 lg:pt-64">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
          {FACTS.map(([title, body]) => (
            <div key={title}>
              <dt className="text-[15px] font-semibold tracking-tight">{title}</dt>
              <dd className="mt-1 text-[13px] leading-relaxed text-muted">{body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="modes" className="mx-auto max-w-6xl scroll-mt-14 px-4 py-16 sm:px-6 sm:py-20">
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

      <section id="features" className="scroll-mt-14 border-t border-slate-200 bg-slate-50 py-20 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="max-w-xl text-2xl font-semibold tracking-tight">Less updating the tracker. More shipping.</h2>
          <p className="mt-2 max-w-xl text-[14px] text-muted">Boards, backlogs, sprints, epics, roadmaps and reports are all here. These are the parts that save the most time.</p>
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

      <section id="compare" className="mx-auto scroll-mt-14 max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="text-2xl font-semibold tracking-tight">How it compares</h2>
        <p className="mt-2 text-[14px] text-muted">Against a typical hosted tracker plan.</p>
        <div className="mt-8 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-[12px] sm:text-[13px]">
            <thead className="bg-slate-50 text-left dark:bg-slate-900">
              <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:font-medium sm:[&>th]:px-4">
                <th></th><th className="w-[30%] sm:w-48"><span className="inline-flex items-center gap-2"><Logo /></span></th><th className="w-[30%] text-muted sm:w-48">Typical hosted tracker</th>
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

      <footer className="dark bg-ink text-white [html.dark_&]:bg-[#0c0c0b]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-6 border-b border-white/10 py-12 sm:py-14 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Bring your next sprint or project to Ruvano.</h2>
              <p className="mt-2 text-[15px] text-slate-400">Free to start. Set up in minutes.</p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link href={cta.href} className="btn-primary !h-11 !px-5 text-[14px]">{cta.label}<ArrowRight size={15} /></Link>
              <Link href="/signup?as=student" className="btn !h-11 !px-5 text-[14px]">I&apos;m a student</Link>
            </div>
          </div>
          <div className="grid gap-10 py-10 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-16">
            <div>
              <Logo />
              <p className="mt-3 text-[13px] font-medium text-brand-300">Plan. Track. Build. Deliver.</p>
              <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-slate-400">One platform. Every step forward. Ru for rhythm, Va for value, No for what&apos;s next.</p>
            </div>
            {FOOTER_LINKS.map(([title, links]) => (
              <nav key={title} aria-label={title}>
                <h3 className="text-[13px] font-semibold">{title}</h3>
                <ul className="mt-3 space-y-2 text-[13px] text-slate-400">
                  {links.map(([label, href]) => <li key={label}><Link href={href} className="transition-colors hover:text-white">{label}</Link></li>)}
                </ul>
              </nav>
            ))}
          </div>
          <div className="border-t border-white/10 py-5 text-xs text-slate-500">© {new Date().getFullYear()} Ruvano</div>
        </div>
      </footer>
    </div>
  );
}

function Cell({ v, strong }: { v: true | string; strong?: boolean }) {
  if (v === true) return <Check size={16} className="text-brand" />;
  return <span className={strong ? "font-medium" : ""}>{v}</span>;
}
