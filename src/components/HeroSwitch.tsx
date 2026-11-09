"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import clsx from "clsx";
import { HeroWalkthrough } from "./HeroWalkthrough";

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
    <section className="relative mx-auto flow-root w-full max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16 lg:pt-20">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-6xl lg:text-7xl">
          <span className="block sm:inline">Plan. Track. </span><span className="block whitespace-nowrap text-brand-300 sm:inline">Build. Deliver.</span>
        </h1>
        <p className="mt-4 text-xl font-medium tracking-tight text-slate-200 sm:mt-5 sm:text-2xl">One platform. Every step forward.</p>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-400 sm:text-base">{a.text}</p>
        <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link href={a.cta.href} className="btn-primary !h-11 !px-5 text-[14px]">{a.cta.label}<ArrowRight size={15} /></Link>
          <a href="#features" className="btn !h-11 !px-5 text-[14px]">See what it does</a>
        </div>
        <p className="mt-3 text-[13px] text-slate-400">{a.note}</p>
        <div role="tablist" aria-label="Who is this for?" className="mt-8 inline-flex rounded-lg border border-white/10 bg-white/[0.04] p-0.5 sm:mt-10">
          {(Object.keys(AUDIENCES) as Audience[]).map((id) => (
            <button key={id} role="tab" type="button" aria-selected={who === id} onClick={() => pick(id)}
              className={clsx("rounded-md px-4 py-1.5 text-[13px] font-medium transition-colors", who === id ? "bg-white text-slate-900" : "text-slate-300 hover:text-white")}>
              {AUDIENCES[id].tab}
            </button>
          ))}
        </div>
      </div>
      {/* Runs past the bottom of the dark hero, so the product sits across both sections. */}
      <div className="relative z-10 mx-auto mt-5 -mb-20 max-w-5xl min-w-0 sm:-mb-36 lg:-mb-52">
        {/* A new element for each video, so switching starts the other one from the beginning. */}
        <HeroWalkthrough key={a.video} video={a.video} />
      </div>
    </section>
  );
}
