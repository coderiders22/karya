"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import clsx from "clsx";
import { HeroWalkthrough } from "./HeroWalkthrough";
import { Logo } from "./Logo";

const AUDIENCES = {
  teams: {
    tab: "For teams",
    text: "Ruvano moves tickets when pull requests merge, turns GitHub issues into cards, writes your standup, and warns you when a sprint is slipping.",
    cta: { href: "/signup", label: "Create a free account" },
    note: "Moving from Jira? Import its CSV export in one step.",
    video: "walkthrough",
  },
  students: {
    tab: "For students",
    text: "Major projects, minor projects and hackathons. Get a board with the steps already laid out, a countdown to your deadline, and one link to bring your whole team in.",
    cta: { href: "/signup?as=student", label: "Start your project, free" },
    note: "See who's doing what, well before the viva.",
    video: "student-walkthrough",
  },
} as const;

export type Audience = keyof typeof AUDIENCES;

/** The hero speaks to whoever is reading it. /?for=students opens on the student version, so it can be shared. */
export function HeroSwitch({ initial }: { initial: Audience }) {
  const [who, setWho] = useState<Audience>(initial);
  const a = AUDIENCES[who];
  const pick = (next: Audience) => {
    setWho(next);
    history.replaceState(null, "", next === "students" ? "/?for=students" : "/");
  };
  return (
    <section className="relative mx-auto grid w-full max-w-6xl items-center gap-8 overflow-x-clip px-4 pb-14 pt-8 sm:px-6 sm:pb-20 sm:pt-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.2fr)] lg:gap-14 lg:pt-20">
      <div className="min-w-0 max-w-xl">
        <p className="mb-4 flex items-center gap-2.5 sm:mb-5">
          <span className="hidden sm:inline-flex"><Logo size={30} className="!text-[20px]" /></span>
          <span className="text-[12px] text-slate-400">Free · Unlimited users</span>
        </p>
        <div role="tablist" aria-label="Who is this for?" className="mb-5 inline-flex rounded-lg border border-white/10 bg-white/[0.04] p-0.5">
          {(Object.keys(AUDIENCES) as Audience[]).map((id) => (
            <button key={id} role="tab" type="button" aria-selected={who === id} onClick={() => pick(id)}
              className={clsx("rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors", who === id ? "bg-white text-slate-900" : "text-slate-300 hover:text-white")}>
              {AUDIENCES[id].tab}
            </button>
          ))}
        </div>
        <h1 className="text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[2.75rem] sm:leading-[1.06] xl:text-5xl">
          Plan. Track.<br /><span className="whitespace-nowrap text-brand-300">Build. Deliver.</span>
        </h1>
        <p className="mt-3 text-[17px] font-medium tracking-tight text-slate-200 sm:mt-4 sm:text-[19px]">One platform. Every step forward.</p>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-slate-400 sm:mt-5">{a.text}</p>
        <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link href={a.cta.href} className="btn-primary !h-10 !px-4 text-[14px] sm:w-auto">{a.cta.label}<ArrowRight size={15} /></Link>
          <span className="text-[13px] text-slate-400">{a.note}</span>
        </div>
      </div>
      <div className="min-w-0">
        {/* A new element for each video, so switching starts the other one from the beginning. */}
        <HeroWalkthrough key={a.video} video={a.video} />
      </div>
    </section>
  );
}
